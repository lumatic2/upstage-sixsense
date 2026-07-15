#!/usr/bin/env node
/**
 * 메뉴판 사진 → Upstage Document Parse → 메뉴·가격 후보 추출 PoC (M2)
 *
 * 사용법:
 *   UPSTAGE_API_KEY=up_xxx node scripts/parse-menu-poc.mjs photo1.jpg [photo2.jpg ...]
 *   (PowerShell: $env:UPSTAGE_API_KEY="up_xxx"; node scripts/parse-menu-poc.mjs photo1.jpg)
 *
 * 출력:
 *   experiments/parse-poc/<사진이름>.raw.json   — API 원본 응답 (증거 보존)
 *   experiments/parse-poc/<사진이름>.menu.json  — 추출된 {name, price}[] 후보
 *   콘솔에 추출 결과 표 + 요약
 *
 * 정확도 측정: 사진 속 실제 메뉴와 .menu.json을 눈으로 대조해
 * experiments/parse-poc/accuracy.md 에 (전체 항목 수 / 정확 추출 수)를 기록한다.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API_URL = "https://api.upstage.ai/v1/document-digitization";
const OUT_DIR = path.join(import.meta.dirname, "..", "experiments", "parse-poc");

/** HTML 응답에서 메뉴명·가격 후보를 뽑는다.
 *  전략: 태그 제거 후 줄 단위로 훑으며 "텍스트 ... 가격패턴" 라인을 후보로.
 *  가격 패턴: 8,000 / 8000원 / 8,000원 / 8.0(천원 단위 표기) 등 흔한 한국 메뉴판 표기. */
export function extractMenu(html) {
  const lines = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " ")   // 같은 행의 셀(메뉴명|가격)은 한 줄로 유지
    .replace(/<\/(tr|p|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const items = [];
  const priceRe = /(\d{1,3}(?:,\d{3})+|\d{4,6})\s*원?\s*$/;
  for (const line of lines) {
    const m = line.match(priceRe);
    if (!m) continue;
    if (m.index > 0 && /[-\d:~]/.test(line[m.index - 1])) continue; // 전화번호·시각·범위의 일부 제외
    const price = Number(m[1].replace(/,/g, ""));
    if (price < 500 || price > 200000) continue; // 메뉴 가격으로 비현실적인 값 제외
    const name = line.slice(0, m.index).trim().replace(/[·.…\-_]+$/g, "").trim();
    if (!name || /^\d+$/.test(name)) continue;
    items.push({ name, price });
  }
  return items;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const apiKey = process.env.UPSTAGE_API_KEY;
  const files = process.argv.slice(2);
  if (!apiKey) {
    console.error("UPSTAGE_API_KEY 환경변수가 필요합니다.");
    process.exit(1);
  }
  if (files.length === 0) {
    console.error("사용법: node scripts/parse-menu-poc.mjs <메뉴판사진.jpg> [...]");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const file of files) {
  const base = path.basename(file, path.extname(file));
  console.log(`\n=== ${file} ===`);

  const form = new FormData();
  form.append("model", "document-parse");
  form.append("ocr", "force");
  form.append("output_formats", '["html"]');
  form.append("document", new Blob([fs.readFileSync(file)]), path.basename(file));

  const started = Date.now();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (!res.ok) {
    console.error(`  실패 (HTTP ${res.status}): ${await res.text()}`);
    continue;
  }
  const json = await res.json();
  fs.writeFileSync(path.join(OUT_DIR, `${base}.raw.json`), JSON.stringify(json, null, 2));

  const html = json.content?.html ?? "";
  const menu = extractMenu(html);
  fs.writeFileSync(path.join(OUT_DIR, `${base}.menu.json`), JSON.stringify(menu, null, 2));

  console.log(`  응답 ${elapsed}s · elements ${json.elements?.length ?? 0}개 · 메뉴 후보 ${menu.length}개`);
  for (const { name, price } of menu) {
    console.log(`  ${String(price).padStart(7)}원  ${name}`);
  }
    console.log(`  저장: experiments/parse-poc/${base}.raw.json / ${base}.menu.json`);
  }

  console.log("\n다음 단계: 사진 원본과 대조해 experiments/parse-poc/accuracy.md 에 정확도를 기록하세요.");
}
