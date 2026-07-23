/** 구글 시트(팀 데이터 정본) 읽기 — gviz 공개 CSV export (DR1 step-4).
 *  시트는 링크 공유(anyone)라 시크릿 없이 서버에서 읽힌다.
 *  읽기 경로는 이 하나뿐이다 — Supabase 분기는 2026-07-20 제거(docs/ARCHITECTURE.md §데이터 정본). */

const SPREADSHEET_ID = "1r_G6Z6FhlCQ_svQifrvQAWjlCyicOeB6UB4PPbboGTQ";
const TTL_MS = 60_000;
const cache = new Map(); // sheet name → { at, rows }

/** gviz out:csv 파서 — 모든 필드가 "..." 로 감싸이고 내부 " 는 "" 로 이스케이프됨 */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  return rows;
}

async function fetchSheet(sheetName) {
  const hit = cache.get(sheetName);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows;
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`sheet ${sheetName} HTTP ${res.status}`);
  const rows = parseCsv(await res.text());
  cache.set(sheetName, { at: Date.now(), rows });
  return rows;
}

import { isSideMenu } from "./side-menu.js";

const isRealId = (v) => {
  const s = (v ?? "").trim();
  return /^R\d{3}$/.test(s) && s !== "R000"; // R000 = 시트 예시행
};

/** [식당]·[메뉴]·[학식] → 서비스 도메인 객체 (예시행·미완성행 제외) */
export async function loadSheetData() {
  const [rest, menu, caf] = await Promise.all([fetchSheet("식당"), fetchSheet("메뉴"), fetchSheet("학식")]);
  const allRestaurants = rest.slice(1).filter((r) => isRealId(r[0])).map((r) => ({
    id: r[0].trim(), name: (r[1] ?? "").trim(), category: (r[2] ?? "").trim(), address: (r[3] ?? "").trim(),
    lat: r[4] ? Number(r[4]) : null, lng: r[5] ? Number(r[5]) : null,
    tags: (r[6] ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    collector: (r[8] ?? "").trim(), shot_date: (r[9] ?? "").trim(), status: (r[10] ?? "").trim(),
  }));
  const menus = menu.slice(1).filter((r) => isRealId(r[0])).map((r) => ({
    restaurant_id: r[0].trim(), restaurant_name: (r[1] ?? "").trim(), name: (r[2] ?? "").trim(),
    price: r[3] ? Number(String(r[3]).replace(/[^\d]/g, "")) : null,
    source: (r[4] ?? "").trim(), review: (r[5] ?? "").trim(), note: (r[6] ?? "").trim(),
    // 승인 게이트 (DR4 step-4): 사람이 사진과 대조해 "확인" 을 찍은 행만 서비스에 나간다.
    // 이게 없으면 제보 페이지로 들어온 미검수 데이터가 즉시 추천에 노출된다 — 파이프라인의
    // "사람 검수" 단계가 주장으로만 남고 실제로는 무력해진다(docs/SITEMAP.md §7-4).
  })).filter((m) => m.name && m.price && m.review === "확인")
    // 곁들임 표시는 여기서 한 번만 붙인다 — 화면(app.html)과 추천(recommend.js)이 같은
    // 판정을 봐야 "추천엔 안 나오는데 목록엔 한 끼처럼 뜨는" 어긋남이 생기지 않는다.
    .map((m) => ({ ...m, isSide: isSideMenu(m) }));
  // 게이트는 식당에도 걸린다 — 메뉴가 한 줄도 승인되지 않은 가게는 아직 서비스할 데이터가 아니다.
  // 제보가 들어오면 [식당] 행이 먼저 생기므로, 이게 없으면 미검수 가게가 목록·지도에 먼저 뜬다.
  const served = new Set(menus.map((m) => m.restaurant_id));
  const restaurants = allRestaurants.filter((r) => served.has(r.id));

  /* 파이프라인 집계 — `/about.html` 이 화면에 적는 숫자의 출처다 (2026-07-24).
     예전에는 이 수치들을 사람이 재서 HTML 에 박아 넣었고, 그래서 팀이 계속 수집하는 동안
     문서만 그 자리에 남아 후보 386 vs 실제 579 처럼 두 배 가까이 벌어졌다. 세는 자리를
     데이터를 읽는 곳으로 옮긴다 — 시트가 바뀌면 화면도 바뀐다.
     검수 3상태는 `/api/review`(운영자 토큰)로만 볼 수 있었지만, 여기서 세는 것은 **개수뿐**
     이라 행 내용이 나가지 않는다. 예시·테스트 행(R000·TEST)은 빼고 센다. */
  const realMenuRows = menu.slice(1).filter((r) => isRealId(r[0]) && (r[2] ?? "").trim());
  const tally = (col) => realMenuRows.reduce((a, r) => {
    const v = (r[col] ?? "").trim() || "(미기재)";
    a[v] = (a[v] || 0) + 1;
    return a;
  }, {});
  const review = tally(5);
  const stats = {
    restaurants: restaurants.length,          // 화면에 나가는 식당
    restaurantsCollected: allRestaurants.length, // 시트에 수집된 식당
    candidates: realMenuRows.length,          // 파싱이 만든 메뉴 후보(검수 전 전체)
    confirmed: review["확인"] ?? 0,
    excluded: review["제외"] ?? 0,
    pending: (review["대기"] ?? 0) + (review["(미기재)"] ?? 0),
    served: menus.length,                     // 검수를 통과해 화면에 나가는 메뉴
    main: menus.filter((m) => !m.isSide).length,
    side: menus.filter((m) => m.isSide).length,
    bySource: tally(4),                       // 사진파싱 · 제보 · 직접입력
  };
  // 시트는 사람과 cron 이 함께 쓰는 공유 문서라 같은 행이 두 번 들어갈 수 있다(실제로 발생).
  // 중복이 남으면 학식 카드의 메뉴가 두 배로 늘어나므로 읽는 쪽에서도 한 번 걸러낸다 —
  // 쓰는 쪽만 고치면 이미 들어간 중복은 그대로 화면에 남는다.
  const cafSeen = new Set();
  const cafeteria = caf.slice(1).filter((r) => (r[0] ?? "").match(/^\d{4}-\d{2}-\d{2}/)).map((r) => ({
    menu_date: r[0].trim(), cafeteria: (r[1] ?? "").trim(), corner: (r[2] ?? "").trim() || null,
    items: (r[3] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    price: r[4] ? Number(String(r[4]).replace(/[^\d]/g, "")) : null,
  })).filter((c) => {
    const k = `${c.menu_date}|${c.cafeteria}|${c.corner ?? ""}|${c.items.join(",")}`;
    if (cafSeen.has(k)) return false;
    cafSeen.add(k);
    return true;
  });
  return { restaurants, menus, cafeteria, stats };
}
