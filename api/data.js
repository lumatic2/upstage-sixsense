/** GET /api/data — 서비스 데이터 소스 (DR1 step-4 · DR6 step-2 로 단일화)
 *  소스는 구글 시트 하나다(팀 정본). 실패 시 500 크래시 대신 빈 배열 + source:"none" (graceful).
 *
 *  Supabase 분기 제거 (2026-07-20, OPEN-ISSUES ④): env 가 있으면 Supabase 를 우선하는
 *  경로가 있었는데, 거기엔 검수 게이트가 없었다. `menus` 테이블에 `review` 열 자체가 없어
 *  필터를 걸 수도 없고, `scripts/sync-sheet-to-db.mjs` 의 upsert 는 삭제를 안 해서 DR4 이전에
 *  올라간 미검수 행이 영구 잔존한다. 즉 env 하나가 켜지는 순간 "사람이 확인한 것만 노출한다"는
 *  파이프라인의 핵심 주장이 조용히 깨지는 구조였다. 시트를 유일한 정본으로 확정해 그 경로를 없앤다.
 *  (`scripts/sync-sheet-to-db.mjs` 와 `db/` 는 지우지 않았다 — 미사용 상태로 남는다.)
 */
import { loadSheetData } from "./_lib/sheet-data.js";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  try {
    const data = await loadSheetData();
    res.status(200).json({ source: "sheet", ...data });
  } catch {
    res.status(200).json({ source: "none", restaurants: [], menus: [], cafeteria: [], error: "data unavailable" });
  }
}
