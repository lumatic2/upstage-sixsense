/** 구글 시트(팀 데이터 정본) 읽기 — gviz 공개 CSV export (DR1 step-4).
 *  시트는 링크 공유(anyone)라 시크릿 없이 서버에서 읽힌다.
 *  Supabase env 가 있으면 Supabase 를 우선하고, 없거나 실패하면 이 경로가 fallback. */

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

const isRealId = (v) => {
  const s = (v ?? "").trim();
  return /^R\d{3}$/.test(s) && s !== "R000"; // R000 = 시트 예시행
};

/** [식당]·[메뉴]·[학식] → 서비스 도메인 객체 (예시행·미완성행 제외) */
export async function loadSheetData() {
  const [rest, menu, caf] = await Promise.all([fetchSheet("식당"), fetchSheet("메뉴"), fetchSheet("학식")]);
  const restaurants = rest.slice(1).filter((r) => isRealId(r[0])).map((r) => ({
    id: r[0].trim(), name: (r[1] ?? "").trim(), category: (r[2] ?? "").trim(), address: (r[3] ?? "").trim(),
    lat: r[4] ? Number(r[4]) : null, lng: r[5] ? Number(r[5]) : null,
    tags: (r[6] ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    collector: (r[8] ?? "").trim(), shot_date: (r[9] ?? "").trim(), status: (r[10] ?? "").trim(),
  }));
  const menus = menu.slice(1).filter((r) => isRealId(r[0])).map((r) => ({
    restaurant_id: r[0].trim(), restaurant_name: (r[1] ?? "").trim(), name: (r[2] ?? "").trim(),
    price: r[3] ? Number(String(r[3]).replace(/[^\d]/g, "")) : null,
    source: (r[4] ?? "").trim(), review: (r[5] ?? "").trim(), note: (r[6] ?? "").trim(),
  })).filter((m) => m.name && m.price && m.review !== "제외"); // 검수 "제외" = 간판 문구·옵션 등 비메뉴 행
  const cafeteria = caf.slice(1).filter((r) => (r[0] ?? "").match(/^\d{4}-\d{2}-\d{2}/)).map((r) => ({
    menu_date: r[0].trim(), cafeteria: (r[1] ?? "").trim(), corner: (r[2] ?? "").trim() || null,
    items: (r[3] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    price: r[4] ? Number(String(r[4]).replace(/[^\d]/g, "")) : null,
  }));
  return { restaurants, menus, cafeteria };
}
