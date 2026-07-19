#!/usr/bin/env node
/**
 * 시트 [메뉴] 탭 검수 정리 (DR2 dogfood 후속 — 파싱 노이즈가 랜딩에 노출된 문제의 근본 수정)
 *
 * 사용법:
 *   node scripts/clean-menu-sheet.mjs           # 드라이런 — 무엇을 고칠지 표만 출력
 *   node scripts/clean-menu-sheet.mjs --apply   # 실제 반영
 *
 * 규칙 (보수적 — 애매하면 건드리지 않고 목록으로만 보고):
 *  A. 이름 정규화: 모든 토큰이 1글자면 붙인다 ("쫄 면"→"쫄면"). menu 열만, 원본은 note 에 보존.
 *  B. 노이즈 행 표시: 간판 문구·옵션·비메뉴 행은 review 열을 "제외" 로 바꾼다 (행 삭제는 하지 않는다 — 팀 데이터라 파괴 금지).
 *     판정: 이름에 !|?|추가|Since 포함, 또는 가격이 100원 미만/100원 단위 아님.
 */
import { gwsSheets, SPREADSHEET_ID } from "./_lib/gws.mjs";

const APPLY = process.argv.includes("--apply");
const TAB = "메뉴";

const res = gwsSheets({ spreadsheetId: SPREADSHEET_ID, range: `${TAB}!A1:H200` }, null, "spreadsheets values get");
const rows = res.values ?? [];
const header = rows[0] ?? [];
const col = (name) => header.indexOf(name);
const iMenu = col("메뉴명"), iPrice = col("가격(원)"), iReview = col("검수"), iNote = col("비고");
if (iMenu < 0 || iPrice < 0 || iReview < 0) {
  console.error("헤더를 찾지 못했습니다:", header.join(", "));
  process.exit(1);
}

const oneCharJoin = (name) => {
  const t = String(name ?? "").trim().split(/\s+/);
  return t.length > 1 && t.every((x) => [...x].length === 1) ? t.join("") : null;
};
const isNoise = (name, price) => {
  if (/[!?]|추가|Since/i.test(String(name ?? ""))) return true;
  const p = Number(String(price ?? "").replace(/[^\d]/g, ""));
  return p > 0 && (p < 100 || p % 100 !== 0);
};

const updates = [];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const name = row[iMenu], price = row[iPrice], review = row[iReview] ?? "";
  if (!name) continue;
  const rowNo = r + 1;

  const joined = oneCharJoin(name);
  if (joined) {
    updates.push({ range: `${TAB}!${String.fromCharCode(65 + iMenu)}${rowNo}`, values: [[joined]], why: `이름 정규화 "${name}"→"${joined}"` });
    if (iNote >= 0) updates.push({ range: `${TAB}!${String.fromCharCode(65 + iNote)}${rowNo}`, values: [[`원문:${name}`]], why: "원문 보존" });
  }
  if (isNoise(name, price) && review !== "제외") {
    updates.push({ range: `${TAB}!${String.fromCharCode(65 + iReview)}${rowNo}`, values: [["제외"]], why: `노이즈 행 제외 표시 "${name}" (${price})` });
  }
}

console.log(`대상 ${updates.length}건:`);
for (const u of updates) console.log(`  ${u.range}  ${u.why}`);
if (!updates.length) { console.log("고칠 것 없음"); process.exit(0); }
if (!APPLY) { console.log("\n드라이런 — 반영하려면 --apply"); process.exit(0); }

const r = gwsSheets(
  { spreadsheetId: SPREADSHEET_ID },
  { valueInputOption: "RAW", data: updates.map(({ range, values }) => ({ range, values })) },
  "spreadsheets values batchUpdate",
);
console.log(`\n반영 완료: ${r.totalUpdatedCells ?? "?"} 셀`);
