/** GET /api/data — 서비스 데이터 소스 (DR1 step-4)
 *  우선순위: Supabase(env 有) → 구글 시트 gviz(팀 정본, fallback)
 *  실패 시 500 크래시 대신 빈 배열 + source:"none" (graceful).
 */
import { loadSheetData } from "./_lib/sheet-data.js";

async function loadSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const get = async (table) => {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`supabase ${table} HTTP ${res.status}`);
    return res.json();
  };
  const [restaurants, menus, cafeteria] = await Promise.all([
    get("restaurants"), get("menus"), get("cafeteria_menus"),
  ]);
  return { restaurants, menus, cafeteria };
}

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  try {
    let data = null, source = "none";
    try {
      data = await loadSupabase();
      if (data) source = "supabase";
    } catch { data = null; }
    if (!data) {
      data = await loadSheetData();
      source = "sheet";
    }
    res.status(200).json({ source, ...data });
  } catch (e) {
    res.status(200).json({ source: "none", restaurants: [], menus: [], cafeteria: [], error: "data unavailable" });
  }
}
