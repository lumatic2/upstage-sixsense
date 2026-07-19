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

const BASE = "https://www.skku.edu/skku/campus/support/welfare_11.do";
// welfare_11.do 목록 페이지의 a.cafeteriaBtn data-* 를 그대로 옮김 (식당명은 응답 h6 에서 파싱)
const CAFETERIAS = [
  { conspaceCd: "10201030", srResId: "1", srShowTime: "W" },
  { conspaceCd: "10201031", srResId: "2", srShowTime: "D" },
  { conspaceCd: "10201034", srResId: "4", srShowTime: "W" },
  { conspaceCd: "10201033", srResId: "6", srShowTime: "D" },
];
const MEALS = ["B", "L", "D"]; // 조식/중식/석식 (간식 S·예약 R 제외)

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

/** weekly/daily 공용: .weeListWrap 블록에서 날짜·식당·코너·메뉴·가격을 뽑는다 */
export function parseMenus(html, { year, meal }) {
  const records = [];
  const wraps = html.split(/class="weeListWrap"/).slice(1);
  for (const wrap of wraps) {
    const dateM = wrap.match(/\((\d{2})\.(\d{2})\)/);
    if (!dateM) continue;
    const date = `${year}-${dateM[1]}-${dateM[2]}`;
    for (const cont of wrap.split(/class="weeListCont"/).slice(1)) {
      const h6 = cont.match(/<h6>\s*([^<]+?)\s*(?:<span>([^<]*)<\/span>)?\s*<\/h6>/s);
      const pre = cont.match(/<pre>([\s\S]*?)<\/pre>/);
      if (!h6 || !pre) continue;
      const items = decode(pre[1]).split("\n").map((l) => l.trim()).filter(Boolean);
      if (items.length === 0) continue;
      // 가격: <pre> 다음 <li> 들 중 첫 숫자 텍스트
      const after = cont.slice(cont.indexOf("</pre>"));
      const priceM = after.match(/<li>\s*([\d,]{3,7})\s*<\/li>|<li>\s*\n?\s*([\d,]{3,7})\s*\n?\s*<\/li>|>\s*([\d,]{4,7})\s*</);
      const price = priceM ? Number((priceM[1] ?? priceM[2] ?? priceM[3]).replace(/,/g, "")) : null;
      records.push({
        campus: "인사",
        cafeteria: decode(h6[1]).trim(),
        corner: h6[2] ? decode(h6[2]).trim() || null : null,
        menu_date: date,
        meal,
        items,
        price: price && price >= 500 && price <= 50000 ? price : null,
      });
    }
  }
  return records;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const args = process.argv.slice(2);
  const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : new Date().toISOString().slice(0, 10);
  const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
  const year = dateArg.slice(0, 4);

  const all = [];
  for (const caf of CAFETERIAS) {
    for (const meal of MEALS) {
      const url = `${BASE}?mode=info&conspaceCd=${caf.conspaceCd}&srResId=${caf.srResId}&srShowTime=${caf.srShowTime}&srCategory=${meal}&srDt=${dateArg}`;
      let html;
      try {
        const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (hanipmap crawler)" }, signal: AbortSignal.timeout(15_000) });
        if (!res.ok) {
          console.error(`  skip ${caf.conspaceCd}/${meal}: HTTP ${res.status}`);
          continue;
        }
        html = await res.text();
      } catch (e) {
        console.error(`  skip ${caf.conspaceCd}/${meal}: ${e.name}`);
        continue;
      }
      const recs = parseMenus(html, { year, meal });
      all.push(...recs);
      console.error(`  ${caf.conspaceCd} ${meal}: ${recs.length} records`);
    }
  }
  // 중복 제거 (weekly 뷰가 식당 여러 곳을 한 응답에 실을 수 있음)
  const seen = new Set();
  const records = all.filter((r) => {
    const k = `${r.cafeteria}|${r.menu_date}|${r.meal}|${r.corner}|${r.items[0]}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const out = { status: records.length ? "ok" : "empty", crawledAt: new Date().toISOString(), sourceDate: dateArg, records };
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
