#!/usr/bin/env node
/**
 * 사진 배치 파싱 → 구글 시트 [식당]·[메뉴] 탭 적재 (DR1 step-1)
 *
 * 사용법:
 *   node scripts/batch-parse-to-sheet.mjs [--manifest scripts/photo-manifest.json] [--dry-run] [--no-cache]
 *
 * 동작:
 *   1. manifest 의 사진마다 메뉴 {name,price}[] 확보
 *      - experiments/parse-poc/<사진>.menu.json 캐시가 있으면 재사용 (--no-cache 면 무시)
 *      - 없으면 Upstage Document Parse 호출 (UPSTAGE_API_KEY 필요) 후 extractMenu
 *   2. 시트 [식당] 탭을 읽어 기존 식당이름과 대조 — 이미 있으면 스킵(멱등)
 *   3. 신규 식당은 R### ID 를 이어 붙여 [식당] 행 + [메뉴] 행들을 append
 *      - [식당] 상태 = "검수대기", [메뉴] 출처 = "사진파싱", 검수 = "대기"
 *      - 가격 하드 룰: 0원 이하 · 100,000원 초과는 비고에 "가격확인필요" 표시
 *   4. 파싱 실패 사진은 파이프를 죽이지 않고 failed 목록으로 스킵, 종료 코드 0
 *
 * 시트 쓰기는 gws CLI(로컬 OAuth)를 bash 경유로 호출한다 — 서비스 계정 불요.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { extractMenu } from "./parse-menu-poc.mjs";

const SPREADSHEET_ID = "1r_G6Z6FhlCQ_svQifrvQAWjlCyicOeB6UB4PPbboGTQ";
const API_URL = "https://api.upstage.ai/v1/document-digitization";
const ROOT = path.join(import.meta.dirname, "..");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const NO_CACHE = args.includes("--no-cache");
const manifestPath =
  args[args.indexOf("--manifest") + 1] && args.includes("--manifest")
    ? args[args.indexOf("--manifest") + 1]
    : path.join(ROOT, "scripts", "photo-manifest.json");

function gws(paramsObj, bodyObj, resourcePath) {
  // JSON 을 임시파일로 넘겨 셸 인용 문제를 피한다 (Windows cmd/bash 혼용 안전).
  const tmp = path.join(os.tmpdir(), `gws-body-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmp, JSON.stringify(bodyObj ?? {}));
  const params = JSON.stringify(paramsObj).replace(/'/g, "'\\''");
  const cmd = bodyObj
    ? `gws sheets ${resourcePath} --params '${params}' --json "$(cat '${tmp.replace(/\\/g, "/")}')" --format json`
    : `gws sheets ${resourcePath} --params '${params}' --format json`;
  const r = spawnSync("bash", ["-lc", cmd], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  fs.rmSync(tmp, { force: true });
  if (r.status !== 0) throw new Error(`gws 실패: ${r.stderr || r.stdout}`);
  const jsonStart = r.stdout.indexOf("{");
  return jsonStart >= 0 ? JSON.parse(r.stdout.slice(jsonStart)) : {};
}

async function parsePhoto(file) {
  const base = path.basename(file).replace(/\.(jpg|jpeg|png)$/i, "");
  const cache = path.join(ROOT, "experiments", "parse-poc", `${base}.menu.json`);
  if (!NO_CACHE && fs.existsSync(cache)) {
    return { items: JSON.parse(fs.readFileSync(cache, "utf8")), source: "cache" };
  }
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) throw new Error("UPSTAGE_API_KEY 미설정 (캐시도 없음)");
  const form = new FormData();
  form.append("document", new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append("ocr", "force");
  form.append("coordinates", "true");
  form.append("output_formats", JSON.stringify(["html"]));
  form.append("model", "document-parse");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Document Parse HTTP ${res.status}`);
  const data = await res.json();
  const html = data?.content?.html ?? "";
  return { items: extractMenu(html), source: "api" };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// 1) 식당 단위로 사진 그룹핑
const byName = new Map();
for (const p of manifest.photos) {
  if (!byName.has(p.name)) byName.set(p.name, { meta: p, files: [] });
  byName.get(p.name).files.push(p.file);
}

// 2) 기존 시트 상태 (멱등 대조 + 다음 R### 산출)
const existing = gws({ spreadsheetId: SPREADSHEET_ID, range: "식당!A2:B500" }, null, "spreadsheets values get");
const rows = existing.values ?? [];
const existingNames = new Set(rows.map((r) => (r[1] ?? "").trim()).filter(Boolean));
let maxId = 0;
for (const r of rows) {
  const m = /^R(\d{3})$/.exec((r[0] ?? "").trim());
  if (m) maxId = Math.max(maxId, Number(m[1]));
}

const failed = [];
const restaurantRows = [];
const menuRows = [];
let nextId = maxId;

for (const [name, group] of byName) {
  if (existingNames.has(name)) {
    console.log(`skip (이미 시트에 있음): ${name}`);
    continue;
  }
  const merged = [];
  let ok = false;
  for (const file of group.files) {
    try {
      const { items, source } = await parsePhoto(path.join(ROOT, file));
      console.log(`parsed ${path.basename(file)} (${source}): ${items.length}개 항목`);
      merged.push(...items);
      ok = true;
    } catch (e) {
      failed.push({ file, error: String(e.message ?? e) });
      console.error(`FAIL ${file}: ${e.message}`);
    }
  }
  if (!ok) continue; // 이 식당의 모든 사진이 실패 — 식당 행도 만들지 않음
  nextId += 1;
  const rid = `R${String(nextId).padStart(3, "0")}`;
  const m = group.meta;
  restaurantRows.push([
    rid, name, m.category, m.address ?? "", "", "", m.tags ?? "", "", manifest.collector, m.shotDate ?? "", "검수대기",
  ]);
  const seen = new Set();
  for (const it of merged) {
    const dedupKey = `${it.name}|${it.price}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const suspicious = !(it.price > 0 && it.price <= 100000);
    menuRows.push([rid, name, it.name, it.price, "사진파싱", "대기", suspicious ? "가격확인필요" : ""]);
  }
}

console.log(`\n적재 예정: 식당 ${restaurantRows.length}곳 · 메뉴 ${menuRows.length}행 · 실패 ${failed.length}건`);
if (DRY) {
  console.table(restaurantRows);
  console.table(menuRows.slice(0, 10));
  process.exit(0);
}

if (restaurantRows.length) {
  gws(
    { spreadsheetId: SPREADSHEET_ID, range: "식당!A:K", valueInputOption: "USER_ENTERED" },
    { values: restaurantRows },
    "spreadsheets values append"
  );
  gws(
    { spreadsheetId: SPREADSHEET_ID, range: "메뉴!A:G", valueInputOption: "USER_ENTERED" },
    { values: menuRows },
    "spreadsheets values append"
  );
}
console.log(`완료: 사진 ${manifest.photos.length}장 → 식당 ${restaurantRows.length}행 + 메뉴 ${menuRows.length}행 적재`);
if (failed.length) console.log("실패 목록:", JSON.stringify(failed, null, 2));
