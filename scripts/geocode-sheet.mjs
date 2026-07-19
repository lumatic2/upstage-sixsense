#!/usr/bin/env node
/**
 * 시트 [식당]탭 지오코딩 자동 채움 (DR1 step-2) — 카카오 Local API
 *
 * 사용법: node scripts/geocode-sheet.mjs [--dry-run]
 * 필요: .env 의 KAKAO_REST_API_KEY (커밋·로그 노출 금지)
 *
 * 동작 (좌표 없는 행만):
 *   - 주소가 있으면 주소 검색(/v2/local/search/address.json)
 *   - 주소가 없으면 키워드 검색(/v2/local/search/keyword.json, "<식당이름> 혜화")
 *     → 첫 결과의 도로명 주소 + 좌표를 채운다 (성균관대 명륜캠 반경 밖 결과는 실패 처리)
 *   - 실패한 행은 건드리지 않고 실패 목록으로 보고 (잘못된 좌표 기입 금지)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const SPREADSHEET_ID = "1r_G6Z6FhlCQ_svQifrvQAWjlCyicOeB6UB4PPbboGTQ";
const ROOT = path.join(import.meta.dirname, "..");
const DRY = process.argv.includes("--dry-run");
// 성균관대 명륜캠 정문 부근 — 이 반경(2.5km) 밖 키워드 매칭은 오매칭으로 간주
const CAMPUS = { lat: 37.5877, lng: 126.9938, maxKm: 2.5 };

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadEnv();
const KEY = process.env.KAKAO_REST_API_KEY;
if (!KEY) {
  console.error("BLOCKED: KAKAO_REST_API_KEY 미설정 (.env) — step-2 는 키 발급 후 재실행");
  process.exit(2);
}

function gws(paramsObj, bodyObj, resourcePath) {
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

function distKm(aLat, aLng, bLat, bLng) {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function kakao(pathname, query) {
  const url = `https://dapi.kakao.com${pathname}?${new URLSearchParams(query)}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
  if (!res.ok) throw new Error(`kakao HTTP ${res.status}`);
  return res.json();
}

async function locate(name, address) {
  if (address) {
    const d = await kakao("/v2/local/search/address.json", { query: address });
    const doc = d.documents?.[0];
    if (doc) return { lat: Number(doc.y), lng: Number(doc.x), address, method: "주소" };
  }
  const d = await kakao("/v2/local/search/keyword.json", {
    query: `${name}`, x: String(CAMPUS.lng), y: String(CAMPUS.lat), radius: "2500", sort: "distance",
  });
  const doc = d.documents?.[0];
  if (!doc) return null;
  const lat = Number(doc.y), lng = Number(doc.x);
  if (distKm(CAMPUS.lat, CAMPUS.lng, lat, lng) > CAMPUS.maxKm) return null;
  return { lat, lng, address: doc.road_address_name || doc.address_name, method: "키워드", matched: doc.place_name };
}

const sheet = gws({ spreadsheetId: SPREADSHEET_ID, range: "식당!A2:K500" }, null, "spreadsheets values get");
const rows = sheet.values ?? [];
const updates = [];
const failed = [];

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const [id, name, , address, lat, lng] = [r[0], r[1], r[2], r[3], r[4], r[5]];
  if (!id || !/^R\d{3}$/.test(id.trim())) continue; // 예시행·빈행 스킵
  if (lat && lng) continue; // 이미 좌표 있음
  try {
    const loc = await locate(name.trim(), (address ?? "").trim());
    if (!loc) { failed.push({ id, name, reason: "매칭 없음/반경 밖" }); continue; }
    updates.push({ rowIndex: i + 2, id, name, ...loc });
  } catch (e) {
    failed.push({ id, name, reason: String(e.message ?? e) });
  }
}

console.log(`대상: 좌표 없는 식당 ${updates.length + failed.length}곳 → 채움 ${updates.length} · 실패 ${failed.length}`);
for (const u of updates) console.log(`  ${u.id} ${u.name} → (${u.lat.toFixed(6)}, ${u.lng.toFixed(6)}) [${u.method}${u.matched ? ": " + u.matched : ""}] ${u.address}`);
if (failed.length) console.log("실패:", JSON.stringify(failed));

if (!DRY && updates.length) {
  gws(
    { spreadsheetId: SPREADSHEET_ID },
    {
      valueInputOption: "USER_ENTERED",
      data: updates.map((u) => ({ range: `식당!D${u.rowIndex}:F${u.rowIndex}`, values: [[u.address, u.lat, u.lng]] })),
    },
    "spreadsheets values batchUpdate"
  );
  console.log(`시트 반영 완료: ${updates.length}행 (D주소·E위도·F경도)`);
}
