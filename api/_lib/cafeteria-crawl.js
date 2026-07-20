/** 학식 크롤 코어 (DR10 step-2)
 *
 *  `scripts/crawl-cafeteria.mjs`(수동 실행)와 `api/cron/crawl-cafeteria.js`(자동 실행)가
 *  **같은 코드**를 쓰게 하려고 뽑아냈다. 둘이 따로 파싱하면 언젠가 서로 다른 답을 낸다 —
 *  이 프로젝트에서 이미 세 번 겪은 실패다(곁들임 판정·학식 명칭·조건 추출).
 *
 *  학식에 Document Parse 를 쓰지 않는 이유는 ADR-0001 — 이미 구조화된 HTML 이다.
 *  "메뉴 보기" 팝업은 GET 폼이라 쿼리 파라미터로 직접 조회된다:
 *    welfare_11.do?mode=info&conspaceCd=<식당>&srResId=<n>&srShowTime=<W|D>&srCategory=<B|L|D|S>&srDt=<YYYY-MM-DD>
 */
import { CAFETERIAS as OFFICIAL } from "./cafeterias.js";

const BASE = "https://www.skku.edu/skku/campus/support/welfare_11.do";
// welfare_11.do 목록 페이지의 a.cafeteriaBtn data-* (식당명은 응답 h6 에서 파싱)
const SOURCES = [
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
  const wraps = String(html).split(/class="weeListWrap"/).slice(1);
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

/** 학교 페이지를 훑어 레코드를 모은다. 한 요청이 실패해도 나머지는 계속한다 —
 *  식당 하나가 죽었다고 그날 학식 전체를 못 받으면 안 된다. */
export async function crawlCafeteria(dateISO, { base = BASE, timeoutMs = 15000 } = {}) {
  const year = dateISO.slice(0, 4);
  const all = [];
  const errors = [];
  for (const caf of SOURCES) {
    for (const meal of MEALS) {
      const url = `${base}?mode=info&conspaceCd=${caf.conspaceCd}&srResId=${caf.srResId}&srShowTime=${caf.srShowTime}&srCategory=${meal}&srDt=${dateISO}`;
      try {
        const res = await fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (hanipmap crawler)" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) { errors.push(`${caf.conspaceCd}/${meal} HTTP ${res.status}`); continue; }
        all.push(...parseMenus(await res.text(), { year, meal }));
      } catch (e) {
        errors.push(`${caf.conspaceCd}/${meal} ${e.name}`);
      }
    }
  }
  // 주간 뷰가 같은 행을 여러 응답에 실을 수 있어 한 번 걸러낸다
  const seen = new Set();
  const records = all.filter((r) => {
    const k = `${r.cafeteria}|${r.menu_date}|${r.meal}|${r.corner}|${r.items[0]}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    status: records.length ? "ok" : (errors.length === SOURCES.length * MEALS.length ? "error" : "empty"),
    sourceDate: dateISO,
    records,
    errors,
    known: OFFICIAL.map((c) => c.name),
  };
}

/** 시트 [학식] 탭 행 형식으로 — 헤더: 날짜 | 식당 | 코너 | 메뉴 | 가격(원) */
export function toSheetRows(records) {
  return records.map((r) => [r.menu_date, r.cafeteria, r.corner ?? "", r.items.join(", "), r.price ?? ""]);
}

/** 시트가 돌려주는 날짜를 `YYYY-MM-DD` 로 맞춘다.
 *  Apps Script 는 날짜 셀을 `2026-07-12T15:00:00.000Z`(KST 자정의 UTC 표기)로 준다.
 *  이걸 그대로 크롤 값("2026-07-13")과 비교하면 **영원히 안 맞아 매일 중복이 쌓인다**
 *  — 실제로 cron 첫 실행에서 같은 5행이 두 번 들어갔다(2026-07-21). */
export function normDate(v) {
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return s;
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 로 되돌린다
}

/** 이미 있는 행과 겹치는 것을 버린다(멱등) — cron 이 매일 돌아도 같은 행이 쌓이지 않게. */
export function dedupeAgainst(existingRows, newRows) {
  const key = (r) => [normDate(r[0]), String(r[1] ?? "").trim(), String(r[2] ?? "").trim(), String(r[3] ?? "").trim()].join("|");
  const seen = new Set((existingRows ?? []).map(key));
  return newRows.filter((r) => !seen.has(key(r)));
}

/** KST 기준 오늘 (서버는 UTC 라 그대로 쓰면 하루 밀린다) */
export function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
