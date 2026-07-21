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
import { todayBoard } from "./_lib/cafeterias.js";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  try {
    const data = await loadSheetData();
    // 학식은 "오늘 뭐 먹지" 서비스라 지난 날짜가 섞이면 안 된다. 서버가 UTC 라 KST(+9h)로 계산한다.
    // 4곳 전부를 같은 순서로 내려주고, 데이터가 없는 곳은 open:false(휴무) 다 — 방학엔 대부분 닫는다.
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const cafeteriaBoard = todayBoard(data.cafeteria.filter((c) => c.menu_date === today));
    // 오늘 행이 0이어도 그게 휴무인지 크롤 정지인지 화면은 알 수 없었다(OPEN-ISSUES ⑩).
    // 실제로 2026-07-21 에 적재가 5일 밀린 채 "4곳 전부 휴무" 가 떴다 — 파이프라인이 죽었는데
    // 서비스는 정상으로 보였다. 마지막 적재 날짜를 함께 내려 화면이 둘을 구분해 말하게 한다.
    // 판정은 "오늘 행이 있나"가 아니라 **"적재가 오늘까지 닿았나"** 다. 크롤러는 며칠치를 앞서
    // 넣으므로(실측 2026-07-22 에 lastDate=2026-07-24) 같음 비교는 정상 상태를 지연으로 오판한다.
    // lastDate >= today 면 오늘까지 훑은 것이니 0곳은 진짜 휴무고, 뒤처졌으면 우리가 모르는 것이다.
    const lastDate = data.cafeteria.reduce((m, c) => (c.menu_date > m ? c.menu_date : m), "");
    const cafeteriaFeed = { lastDate: lastDate || null, fresh: Boolean(lastDate) && lastDate >= today };
    res.status(200).json({ source: "sheet", today, cafeteriaBoard, cafeteriaFeed, ...data });
  } catch {
    res.status(200).json({ source: "none", restaurants: [], menus: [], cafeteria: [], error: "data unavailable" });
  }
}
