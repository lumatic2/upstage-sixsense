/** /api/review — 제보 검수 (DR4 step-2). 운영진 전용.
 *  GET  ?status=대기        → 검수 대상 행 + 식당별 메뉴판 사진 링크
 *  POST { updates: [...] }  → 검수 열 값 변경 (확인/제외)
 *
 *  인증: `x-review-token` 헤더를 `REVIEW_TOKEN` env 와 대조. 정식 인증이 아니라 데모 규모 최소 방어다
 *  (`docs/SITEMAP.md` §7 — 이 사실을 about 에서 숨기지 않는다). 시트 쓰기 토큰은 브라우저에 내려주지
 *  않고 이 함수 안에만 둔다 — 검수 토큰이 새도 시트 쓰기 권한 자체는 넘어가지 않는다.
 */
import { listRows, updateCells, sheetWriteReady } from "./_lib/sheet-write.js";

const MENU_SHEET = "메뉴";
const REST_SHEET = "식당";
const ALLOWED = new Set(["확인", "제외", "대기"]);

function authed(req) {
  const expected = process.env.REVIEW_TOKEN;
  return Boolean(expected) && req.headers["x-review-token"] === expected;
}

/** 시트의 드라이브 링크 셀에서 파일 id 만 뽑는다 — 셀에 여러 링크·원출처 메모가 섞여 있다. */
function driveIds(cell) {
  return [...String(cell ?? "").matchAll(/\/file\/d\/([A-Za-z0-9_-]{20,})/g)].map((m) => m[1]);
}

export default async function handler(req, res) {
  if (!sheetWriteReady()) {
    return res.status(503).json({ error: "sheet webhook not configured", code: "not_configured" });
  }
  if (!authed(req)) {
    return res.status(401).json({ error: "unauthorized", code: "bad_token" });
  }

  try {
    if (req.method === "GET") {
      const status = req.query?.status || "대기";
      const [menu, rest] = await Promise.all([listRows(MENU_SHEET, status), listRows(REST_SHEET, null)]);

      const iName = rest.header.indexOf("식당이름");
      const iPhoto = rest.header.indexOf("메뉴판 사진 링크");
      const photos = {};
      for (const r of rest.items) {
        const id = String(r.values[0] ?? "").trim();
        if (id) photos[id] = { name: r.values[iName], driveIds: driveIds(r.values[iPhoto]) };
      }

      const h = menu.header;
      const items = menu.items.map((r) => ({
        row: r.row,
        restaurantId: String(r.values[0] ?? "").trim(),
        restaurant: r.values[1],
        menu: r.values[h.indexOf("메뉴명")],
        price: r.values[h.indexOf("가격(원)")],
        source: r.values[h.indexOf("출처")],
        review: r.values[h.indexOf("검수")],
      }));
      return res.status(200).json({ reviewCol: h.indexOf("검수") + 1, items, photos });
    }

    if (req.method === "POST") {
      const { updates } = req.body ?? {};
      if (!Array.isArray(updates) || !updates.length) {
        return res.status(400).json({ error: "updates required", code: "bad_request" });
      }
      // 허용된 검수 값만 통과 — 검수 화면 버그나 조작으로 임의 문자열이 정본에 박히는 걸 막는다.
      const bad = updates.find((u) => !ALLOWED.has(u.value) || !Number.isInteger(u.row) || u.row < 2);
      if (bad) return res.status(400).json({ error: `invalid update: ${JSON.stringify(bad)}`, code: "bad_value" });

      const n = await updateCells(MENU_SHEET, updates);
      return res.status(200).json({ updated: n });
    }

    return res.status(405).json({ error: "GET or POST", code: "method_not_allowed" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message ?? e), code: "sheet_error" });
  }
}
