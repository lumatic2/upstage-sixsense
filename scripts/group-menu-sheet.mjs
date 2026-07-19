#!/usr/bin/env node
/** 시트 [메뉴] 식당별 행 그룹 (사용자 선택 2026-07-20 — "식당별 행 그룹 접기")
 *  각 식당 블록의 첫 행만 남기고 나머지를 그룹으로 묶어 기본 접힘.
 *  좌측 +/- 로 펼쳐 본다. 데이터는 불변 — 보기 구조만.
 *  사용법: node scripts/group-menu-sheet.mjs [--expand]  (--expand = 전부 펼친 상태로)
 */
import { gwsSheets, SPREADSHEET_ID } from "./_lib/gws.mjs";

const SHEET_ID = 10;
const COLLAPSED = !process.argv.includes("--expand");

const res = gwsSheets({ spreadsheetId: SPREADSHEET_ID, range: "메뉴!A1:A200" }, null, "spreadsheets values get");
const ids = (res.values ?? []).map((r) => (r[0] ?? "").trim());

// 기존 그룹 전부 제거 후 재생성 (idempotent)
const requests = [{ deleteDimensionGroup: { range: { sheetId: SHEET_ID, dimension: "ROWS", startIndex: 1, endIndex: ids.length } } }];
let blockStart = null, prev = null;
const flush = (endIdx) => {
  // 블록 첫 행은 남기고 2번째 행부터 그룹
  if (blockStart !== null && endIdx - blockStart > 1) {
    requests.push({ addDimensionGroup: { range: { sheetId: SHEET_ID, dimension: "ROWS", startIndex: blockStart + 1, endIndex: endIdx } } });
    if (COLLAPSED) requests.push({
      updateDimensionGroup: {
        dimensionGroup: { range: { sheetId: SHEET_ID, dimension: "ROWS", startIndex: blockStart + 1, endIndex: endIdx }, depth: 1, collapsed: true },
        fields: "collapsed",
      },
    });
  }
};
for (let i = 1; i < ids.length; i++) {
  if (!ids[i]) continue;
  if (ids[i] !== prev) { flush(i); blockStart = i; prev = ids[i]; }
}
flush(ids.length);

try {
  gwsSheets({ spreadsheetId: SPREADSHEET_ID }, { requests }, "spreadsheets batchUpdate");
} catch (e) {
  // 기존 그룹이 없으면 delete 가 실패한다 — delete 없이 재시도
  if (!String(e.message).includes("No dimension group")) throw e;
  gwsSheets({ spreadsheetId: SPREADSHEET_ID }, { requests: requests.slice(1) }, "spreadsheets batchUpdate");
}
console.log(`행 그룹 ${requests.filter((r) => r.addDimensionGroup).length}개 생성 (기본 ${COLLAPSED ? "접힘" : "펼침"})`);
