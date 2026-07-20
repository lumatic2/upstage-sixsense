#!/usr/bin/env node
/** 성균관대 인사캠 학식 크롤러 (M3 step-3) — welfare_11.do direct GET (Playwright 불필요, 실사 2026-07-17).
 *
 *  "메뉴 보기" 팝업은 GET 폼(listForm)이라 쿼리 파라미터로 직접 조회된다:
 *    welfare_11.do?mode=info&conspaceCd=<식당>&srResId=<n>&srShowTime=<W|D>&srCategory=<B|L|D|S>&srDt=<YYYY-MM-DD>
 *  학식에 Document Parse 를 쓰지 않는 이유: 이미 구조화된 HTML (ADR-0001 — 억지 적용 금지).
 *
 *  사용법:
 *    node scripts/crawl-cafeteria.mjs [--date YYYY-MM-DD] [--out db/fixtures/cafeteria-sample.json] [--to-sheet]
 *  출력: { status: "ok"|"empty", crawledAt, records: [{campus, cafeteria, corner, date, meal, items, price}] }
 *  빈 식단(방학·주말)은 에러가 아니라 status:"empty" — 호출측이 구분한다.
 *  --to-sheet: 구글 시트 [학식]탭에 append (DR1 step-3). 기존 행(날짜|식당|코너|메뉴 키)과
 *  중복되는 레코드는 스킵(멱등), 0건이어도 크래시 없이 정상 종료.
 */
import fs from "node:fs";
import { gwsSheets, SPREADSHEET_ID } from "./_lib/gws.mjs";

// 크롤 로직은 서버(api/cron)와 공유한다 — 따로 두면 언젠가 서로 다른 답을 낸다(DR10).
import { parseMenus, crawlCafeteria, todayKST } from "../api/_lib/cafeteria-crawl.js";
export { parseMenus };

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const args = process.argv.slice(2);
  const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : new Date().toISOString().slice(0, 10);
  const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
  // 실제 크롤은 공유 모듈이 한다 — 여기서 다시 구현하면 서버와 갈라진다.
  const crawl = await crawlCafeteria(dateArg);
  const records = crawl.records;
  for (const e of crawl.errors) console.error(`  skip ${e}`);
  console.error(`  ${records.length} records (${crawl.status})`);

  const out = { status: crawl.status, crawledAt: new Date().toISOString(), sourceDate: dateArg, records };
  const json = JSON.stringify(out, null, 2);
  if (outArg) fs.writeFileSync(outArg, json);
  console.log(outArg ? `saved ${records.length} records -> ${outArg}` : json);

  if (args.includes("--to-sheet")) {
    // [학식] 헤더: 날짜 | 식당 | 코너 | 메뉴 | 가격(원)
    const existing = gwsSheets({ spreadsheetId: SPREADSHEET_ID, range: "학식!A2:E1000" }, null, "spreadsheets values get");
    const seenKeys = new Set((existing.values ?? []).map((r) => `${r[0]}|${r[1]}|${r[2] ?? ""}|${r[3] ?? ""}`));
    const rows = records
      .map((r) => [r.menu_date, r.cafeteria, r.corner ?? "", r.items.join(", "), r.price ?? ""])
      .filter((row) => !seenKeys.has(`${row[0]}|${row[1]}|${row[2]}|${row[3]}`));
    if (rows.length) {
      gwsSheets(
        { spreadsheetId: SPREADSHEET_ID, range: "학식!A:E", valueInputOption: "USER_ENTERED" },
        { values: rows },
        "spreadsheets values append"
      );
    }
    console.log(`[학식]탭 적재: 신규 ${rows.length}행 (중복 스킵 ${records.length - rows.length})`);
  }
}
