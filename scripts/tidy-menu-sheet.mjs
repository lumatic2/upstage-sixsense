#!/usr/bin/env node
/**
 * 시트 [메뉴] 탭 2차 정리 (사용자 지시 2026-07-20):
 *  1. 노이즈 행은 표시가 아니라 **삭제** — 검수 열은 드롭다운(대기/확인)이라 "제외" 값은 검증 에러.
 *  2. 식당ID → 가격 순으로 정렬해 식당 블록이 모이게.
 *  3. 식당 블록마다 교차 배경색(흰/연회색)으로 구분감 — 데이터는 그대로, 보기만 정리.
 *
 * 사용법: node scripts/tidy-menu-sheet.mjs [--apply]
 */
import { gwsSheets, SPREADSHEET_ID } from "./_lib/gws.mjs";

const APPLY = process.argv.includes("--apply");
const SHEET_ID = 10; // [메뉴]
const TAB = "메뉴";

const res = gwsSheets({ spreadsheetId: SPREADSHEET_ID, range: `${TAB}!A1:G200` }, null, "spreadsheets values get");
const rows = res.values ?? [];
const header = rows[0];
const iMenu = header.indexOf("메뉴명"), iPrice = header.indexOf("가격(원)"), iReview = header.indexOf("검수");

// 1) 삭제 대상: 이전에 "제외" 표시했거나 노이즈 판정인 행
const isNoise = (name, price, review) => {
  if (review === "제외") return true;
  if (/[!?]|추가|Since/i.test(String(name ?? ""))) return true;
  const p = Number(String(price ?? "").replace(/[^\d]/g, ""));
  return p > 0 && (p < 100 || p % 100 !== 0);
};
const del = [];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row[iMenu]) continue;
  if (isNoise(row[iMenu], row[iPrice], row[iReview])) del.push({ rowNo: r + 1, name: row[iMenu], price: row[iPrice] });
}
console.log(`삭제 대상 ${del.length}행:`);
del.forEach((d) => console.log(`  행${d.rowNo}  "${d.name}" (${d.price})`));

// 남는 데이터로 정렬·밴딩 계산 (예시행 R000 은 맨 위 유지)
const keep = rows.slice(1).filter((row, i) => row[iMenu] && !del.some((d) => d.rowNo === i + 2));
const example = keep.filter((r) => (r[0] ?? "").trim() === "R000");
const real = keep.filter((r) => (r[0] ?? "").trim() !== "R000");
real.sort((a, b) => {
  const ka = (a[0] ?? "").trim(), kb = (b[0] ?? "").trim();
  if (ka !== kb) return ka < kb ? -1 : 1;
  return (Number(String(a[iPrice]).replace(/[^\d]/g, "")) || 0) - (Number(String(b[iPrice]).replace(/[^\d]/g, "")) || 0);
});
const sorted = [...example, ...real];
console.log(`정렬 후 ${sorted.length}행 (예시 ${example.length} + 실데이터 ${real.length})`);

if (!APPLY) { console.log("\n드라이런 — 반영하려면 --apply"); process.exit(0); }

// 2) 반영: 값 전체 재기록(정렬 반영) → 남는 아래 행 삭제 → 밴딩
const width = Math.max(header.length, 7);
const pad = (r) => { const c = [...r]; while (c.length < width) c.push(""); return c.slice(0, width); };
gwsSheets(
  { spreadsheetId: SPREADSHEET_ID },
  { valueInputOption: "RAW", data: [{ range: `${TAB}!A2`, values: sorted.map(pad) }] },
  "spreadsheets values batchUpdate",
);
// 옛 데이터가 더 길었으면 아래 남는 행 값 비우기
const oldLen = rows.length - 1;
if (oldLen > sorted.length) {
  gwsSheets(
    { spreadsheetId: SPREADSHEET_ID, range: `${TAB}!A${2 + sorted.length}:G${1 + oldLen}` },
    {},
    "spreadsheets values clear",
  );
}

// 3) 식당 블록 교차 배경 (흰 / 연회색) — 기존 서식 요청은 덮어씀
const requests = [];
// 데이터 영역 배경 초기화
requests.push({
  repeatCell: {
    range: { sheetId: SHEET_ID, startRowIndex: 1, endRowIndex: 1 + sorted.length, startColumnIndex: 0, endColumnIndex: width },
    cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
    fields: "userEnteredFormat.backgroundColor",
  },
});
let band = false, prev = null;
let blockStart = 1; // 0-based row index (헤더 다음)
const flush = (endIdx) => {
  if (band) requests.push({
    repeatCell: {
      range: { sheetId: SHEET_ID, startRowIndex: blockStart, endRowIndex: endIdx, startColumnIndex: 0, endColumnIndex: width },
      cell: { userEnteredFormat: { backgroundColor: { red: 0.955, green: 0.96, blue: 0.97 } } },
      fields: "userEnteredFormat.backgroundColor",
    },
  });
};
sorted.forEach((r, i) => {
  const id = (r[0] ?? "").trim();
  if (id !== prev) {
    if (prev !== null) { flush(1 + i); band = !band; blockStart = 1 + i; }
    prev = id;
  }
});
flush(1 + sorted.length);
gwsSheets({ spreadsheetId: SPREADSHEET_ID }, { requests }, "spreadsheets batchUpdate");
console.log(`반영 완료: 정렬 ${sorted.length}행 · 삭제 ${del.length}행 · 밴딩 ${requests.length - 1}블록`);
