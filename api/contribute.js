/** POST /api/contribute — 제보 접수 (DR4 step-3).
 *  요청: { name, address, category?, items: [{name, price}] }
 *  응답: 200 { restaurantId, menus }
 *
 *  파싱은 `/api/parse-menu` 가 먼저 끝내고, 이 함수는 그 결과를 시트에 **검수 대기**로만 넣는다.
 *  제보자는 결과를 볼 뿐 고치지 않는다 — 검수 권한은 운영진에게만 있다(`docs/SITEMAP.md` §7-2).
 *  따라서 여기서 들어간 행은 `검수="대기"` 라 서비스에 노출되지 않는다(step-4 게이트).
 */
import { listRows, appendRows, updateCells, savePhoto, sheetWriteReady } from "./_lib/sheet-write.js";

const REST_SHEET = "식당";
const MENU_SHEET = "메뉴";
const MAX_ITEMS = 60;
const MAX_PRICE = 200_000;

/** 다음 R### — 시트가 정본이므로 서버가 카운터를 따로 들고 있지 않는다.
 *  동시 제보가 겹치면 같은 id 가 날 수 있으나, 데모 규모에서 실제로 겹칠 일이 없고
 *  겹쳐도 검수 단계에서 사람이 발견한다(락을 도입할 만큼의 위험이 아니다). */
function nextId(rows) {
  const max = rows.reduce((m, r) => {
    const s = String(r.values[0] ?? "").trim();
    return /^R\d{3}$/.test(s) ? Math.max(m, Number(s.slice(1))) : m;
  }, 0);
  return `R${String(max + 1).padStart(3, "0")}`;
}

/** 카카오 주소 검색 — 좌표가 없으면 지도에 안 뜨고 도보 시간도 못 낸다.
 *  키가 없거나 실패해도 제보 자체는 살린다(좌표는 나중에 배치 스크립트가 채운다). */
async function geocode(address) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key || !address) return { lat: "", lng: "" };
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?${new URLSearchParams({ query: address })}`;
    const r = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(3000) });
    if (!r.ok) return { lat: "", lng: "" };
    const doc = (await r.json()).documents?.[0];
    return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : { lat: "", lng: "" };
  } catch {
    return { lat: "", lng: "" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only", code: "method_not_allowed" });
  if (!sheetWriteReady()) return res.status(503).json({ error: "제보 접수가 일시적으로 불가합니다", code: "not_configured" });

  const { name, address = "", category = "", items, photo = null } = req.body ?? {};
  const restName = String(name ?? "").trim();
  if (!restName) return res.status(400).json({ error: "식당 이름을 입력해주세요", code: "no_name" });
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "메뉴가 하나도 없습니다", code: "no_items" });
  }
  if (items.length > MAX_ITEMS) return res.status(400).json({ error: "메뉴가 너무 많습니다", code: "too_many" });

  // 파싱 결과를 그대로 믿지 않는다 — 이름 없는 행·가격 범위 밖은 접수 단계에서 버린다.
  const clean = items
    .map((i) => ({ name: String(i?.name ?? "").trim().slice(0, 60), price: Number(i?.price) }))
    .filter((i) => i.name && Number.isFinite(i.price) && i.price >= 0 && i.price <= MAX_PRICE);
  if (!clean.length) return res.status(400).json({ error: "쓸 수 있는 메뉴가 없습니다", code: "no_valid_items" });

  try {
    /* 셋을 **동시에** 띄운다. 예전에는 시트 읽기 → 드라이브 업로드 → 지오코딩을 줄줄이 기다려서
       접수 버튼을 누른 뒤 다음 화면까지 눈에 띄게 걸렸다(사용자 지적 2026-07-22).
       서로 입력을 주고받지 않는 작업이라 순서가 필요 없다 — 가장 느린 하나(대개 드라이브
       업로드)만큼만 걸린다. 지오코딩은 신규 식당일 때만 쓰이지만 미리 띄워도 손해가 없다
       (주소가 없으면 즉시 빈 값으로 끝난다). */
    const restP = listRows(REST_SHEET, null);
    // 사진은 검수의 근거다 — 대조할 원본이 없으면 접수해도 승인할 수 없다.
    // 저장에 실패하면 접수 자체를 막는다(근거 없는 대기 행을 쌓지 않는다).
    const photoP = photo
      ? savePhoto(photo, `${restName}-제보.jpg`).then((id) => `https://drive.google.com/file/d/${id}/view`)
      : Promise.resolve("");
    const geoP = geocode(address);

    const [rest, photoLink] = await Promise.all([restP, photoP]);

    // 같은 이름이 이미 있으면 그 식당에 메뉴를 붙인다 — 공개 제보라 같은 가게가 여러 번 들어온다.
    const iPhoto = rest.header.indexOf("메뉴판 사진 링크");
    const existing = rest.items.find((r) => String(r.values[1] ?? "").trim() === restName);
    const id = existing ? String(existing.values[0]).trim() : nextId(rest.items);

    if (existing) {
      // 새 사진은 기존 링크에 덧붙인다(줄바꿈 구분) — 검수 화면이 여러 장을 탭으로 보여준다.
      if (photoLink && iPhoto >= 0) {
        const prev = String(existing.values[iPhoto] ?? "").trim();
        await updateCells(REST_SHEET, [{ row: existing.row, col: iPhoto + 1, value: prev ? `${prev}\n${photoLink}` : photoLink }]);
      }
    } else {
      const { lat, lng } = await geoP;
      const today = new Date().toISOString().slice(0, 10);
      // [식당] 열 순서: ID·이름·카테고리·주소·위도·경도·태그·사진링크·수집자·촬영일·상태
      await appendRows(REST_SHEET, [[id, restName, String(category).trim(), String(address).trim(),
        lat, lng, "", photoLink, "웹 제보", today, "입력완료"]]);
    }
    // [메뉴] 열 순서: 식당ID·식당이름·메뉴명·가격·출처·검수·비고
    await appendRows(MENU_SHEET, clean.map((m) => [id, restName, m.name, m.price, "제보", "대기", ""]));

    return res.status(200).json({ restaurantId: id, menus: clean.length, photoSaved: photoLink !== "" });
  } catch (e) {
    return res.status(502).json({ error: "접수 중 문제가 생겼습니다", code: "sheet_error", detail: String(e.message ?? e) });
  }
}
