/** /api/review — 제보 검수 (DR4 step-2). 운영진 전용.
 *  GET  ?status=대기        → 검수 대상 행 + 식당별 메뉴판 사진 링크
 *  POST { updates: [...] }  → 검수 열 값 변경 (확인/제외)
 *
 *  인증: `x-review-token` 헤더를 `REVIEW_TOKEN` env 와 대조. 정식 인증이 아니라 데모 규모 최소 방어다
 *  (`docs/SITEMAP.md` §7 — 이 사실을 about 에서 숨기지 않는다). 시트 쓰기 토큰은 브라우저에 내려주지
 *  않고 이 함수 안에만 둔다 — 검수 토큰이 새도 시트 쓰기 권한 자체는 넘어가지 않는다.
 */
import { listRows, updateCells, sheetWriteReady } from "./_lib/sheet-write.js";
import { isSideMenu } from "./_lib/side-menu.js";

const MENU_SHEET = "메뉴";
const REST_SHEET = "식당";
const ALLOWED = new Set(["확인", "제외", "대기"]);
// 비고 = 곁들임 판정의 사람 override. "사이드"→강제 곁들임, "한끼"→강제 본메뉴, ""→규칙에 맡김.
// 규칙(side-menu.js)이 어느 가게에나 통하는 것만 담으므로, 한 가게 사정은 이 열로 뒤집는다.
const NOTE_ALLOWED = new Set(["", "사이드", "한끼"]);
// [메뉴] 탭 열 순서: 1 식당ID · 2 식당이름 · 3 메뉴명 · 4 가격(원) · 5 출처 · 6 검수 · 7 비고
const COL_MENU = 3, COL_PRICE = 4, COL_REVIEW = 6, COL_NOTE = 7;
const MAX_PRICE = 200_000;

/** 검수는 확인/제외만으로 끝나지 않는다 — 파싱 파편이 정답을 담고 있을 때가 있다.
 *  실측(2026-07-20): 백미향마라탕의 `100g/` 3건은 쓰레기가 아니라 마라탕·마라반·마라샹궈의
 *  이름이 날아간 것이었다. 제외만 가능하면 그 식당의 핵심 메뉴가 통째로 사라진다.
 *  그래서 메뉴명·가격 수정을 허용하되, 정본에 아무 값이나 박히지 않도록 열별로 검증한다. */
function invalid(u) {
  if (!Number.isInteger(u.row) || u.row < 2) return "row";
  if (u.col === COL_REVIEW) return ALLOWED.has(u.value) ? null : "review value";
  if (u.col === COL_MENU) {
    const s = String(u.value ?? "").trim();
    return s.length >= 1 && s.length <= 60 ? null : "menu name length";
  }
  if (u.col === COL_PRICE) {
    const n = Number(u.value);
    return Number.isInteger(n) && n >= 0 && n <= MAX_PRICE ? null : "price range";
  }
  if (u.col === COL_NOTE) return NOTE_ALLOWED.has(String(u.value ?? "").trim()) ? null : "note value";
  return "col not editable";
}

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
      const iMenu = h.indexOf("메뉴명"), iNote = h.indexOf("비고");
      const items = menu.items.map((r) => {
        const name = r.values[iMenu];
        return {
          row: r.row,
          restaurantId: String(r.values[0] ?? "").trim(),
          restaurant: r.values[1],
          menu: name,
          price: r.values[h.indexOf("가격(원)")],
          source: r.values[h.indexOf("출처")],
          review: r.values[h.indexOf("검수")],
          note: String(r.values[iNote] ?? "").trim(),          // 사람 override 현재값
          autoSide: isSideMenu({ name, note: "" }),            // 규칙만으로 본 판정(override 무시)
        };
      });
      return res.status(200).json({ reviewCol: h.indexOf("검수") + 1, noteCol: iNote + 1, items, photos });
    }

    if (req.method === "POST") {
      const { updates } = req.body ?? {};
      if (!Array.isArray(updates) || !updates.length) {
        return res.status(400).json({ error: "updates required", code: "bad_request" });
      }
      // 화면 버그나 조작으로 임의 값이 정본에 박히는 걸 막는다 — 편집 가능한 열만, 열별 규칙으로.
      for (const u of updates) {
        const why = invalid(u);
        if (why) return res.status(400).json({ error: `invalid update (${why}): ${JSON.stringify(u)}`, code: "bad_value" });
      }
      // 가격은 숫자로 넣어야 시트가 문자열로 굳지 않는다(서비스 read 가 숫자 파싱에 의존).
      const norm = updates.map((u) => (u.col === COL_PRICE ? { ...u, value: Number(u.value) } : u));
      const n = await updateCells(MENU_SHEET, norm);
      return res.status(200).json({ updated: n });
    }

    return res.status(405).json({ error: "GET or POST", code: "method_not_allowed" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message ?? e), code: "sheet_error" });
  }
}
