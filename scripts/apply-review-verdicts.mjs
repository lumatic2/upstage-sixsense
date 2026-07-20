#!/usr/bin/env node
/**
 * 대조 검수 판정 일괄 적용 (DR4 step-4 준비)
 *
 * 입력: 판정 JSON 파일 여러 개 (에이전트가 사진↔행 대조로 만든 것)
 *   { restaurantId, photoReadable, verdicts: [{row, action: 확인|제외|수정|보류, newMenu?, newPrice?, why}] }
 *
 * 적용 규칙:
 *   확인 → 검수="확인"
 *   제외 → 검수="제외"
 *   수정 → 메뉴명/가격을 고치고 검수="확인" (고친 값이 사진 근거이므로 확인까지 간다)
 *   보류 → 건드리지 않는다 (대기로 남겨 사람이 본다)
 *
 * photoReadable=false 인 식당은 통째로 건너뛴다 — 사진을 못 읽었으면 근거가 없다.
 *
 * 사용: node scripts/apply-review-verdicts.mjs <판정.json ...> [--apply]
 *   --apply 없으면 dry-run (무엇이 바뀔지 출력만)
 */
import fs from "node:fs";
import { updateCells } from "../api/_lib/sheet-write.js";

const COL_MENU = 3, COL_PRICE = 4, COL_REVIEW = 6;
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
if (!files.length) { console.error("사용: node scripts/apply-review-verdicts.mjs <판정.json ...> [--apply]"); process.exit(1); }

const updates = [];
const stat = { 확인: 0, 제외: 0, 수정: 0, 보류: 0, skipped: 0 };
const skippedRestaurants = [];

for (const f of files) {
  const v = JSON.parse(fs.readFileSync(f, "utf8"));
  if (v.photoReadable === false) {
    skippedRestaurants.push(v.restaurantId);
    stat.skipped += (v.verdicts ?? []).length;
    continue;
  }
  for (const d of v.verdicts ?? []) {
    if (d.action === "보류") { stat.보류++; continue; }
    if (d.action === "확인") { updates.push({ row: d.row, col: COL_REVIEW, value: "확인" }); stat.확인++; }
    else if (d.action === "제외") { updates.push({ row: d.row, col: COL_REVIEW, value: "제외" }); stat.제외++; }
    else if (d.action === "수정") {
      if (d.newMenu) updates.push({ row: d.row, col: COL_MENU, value: String(d.newMenu).trim().slice(0, 60) });
      if (Number.isFinite(Number(d.newPrice)) && Number(d.newPrice) > 0) {
        updates.push({ row: d.row, col: COL_PRICE, value: Number(d.newPrice) });
      }
      updates.push({ row: d.row, col: COL_REVIEW, value: "확인" });
      stat.수정++;
      console.log(`  수정 행${d.row}: ${d.menu} → ${d.newMenu ?? "(이름유지)"} / ${d.price} → ${d.newPrice ?? "(가격유지)"}  — ${d.why}`);
    }
  }
}

console.log(`\n판정 집계: 확인 ${stat.확인} · 수정 ${stat.수정} · 제외 ${stat.제외} · 보류(대기 유지) ${stat.보류}`);
if (skippedRestaurants.length) console.log(`사진 판독 실패로 건너뜀: ${skippedRestaurants.join(", ")} (${stat.skipped}행)`);
console.log(`셀 변경 ${updates.length}건`);

if (!APPLY) { console.log("\n(dry-run — 실제 적용하려면 --apply)"); process.exit(0); }

// 수정(메뉴명·가격)을 검수 값보다 먼저 보낸다 — 순서가 뒤집히면 고치기 전 내용이 확인된 것처럼 남는다.
updates.sort((a, b) => (a.col === COL_REVIEW ? 1 : 0) - (b.col === COL_REVIEW ? 1 : 0));
const CHUNK = 60;
let done = 0;
for (let i = 0; i < updates.length; i += CHUNK) {
  done += await updateCells("메뉴", updates.slice(i, i + CHUNK));
  console.log(`  적용 ${done}/${updates.length}`);
}
console.log(`완료: ${done}건`);
