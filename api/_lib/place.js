/** 가게 이름 → 주소·분류·좌표 (Kakao 키워드 검색)
 *
 *  `api/identify.js` 의 §② 였던 것을 2026-07-23 에 여기로 뺐다. `api/contribute.js` 가
 *  같은 조회를 서버에서 한 번 더 해야 했기 때문이다 — 클라이언트가 주소를 못 채운 채
 *  제출해도 시트에는 좌표가 들어가야 한다(빈 좌표는 지도에도 안 뜨고 도보 시간도 못 낸다).
 *
 *  경영관 반경 1.5km 로 좁히는 이유: 같은 상호가 전국에 있다. "소반" 을 반경 없이 찾으면
 *  다른 동네 가게의 주소가 조용히 들어간다.
 */
const CAMPUS = { lat: 37.58878, lng: 126.99260 };   // 경영관 — geo.js 와 같은 기준점
const TIMEOUT_MS = 3000;

/** 지점명을 뗀 이름. `파스타마켓 혜화본점` 은 Kakao 에 없고 `파스타마켓` 은 있다
 *  (2026-07-23 실측 — 시트의 R014 가 이래서 주소 없이 들어가 있었다).
 *  괄호 안(`쿄코코 (대학로점)`)과 끝에 오는 `…점` 토막을 뗀다. 뗀 이름은 **전체 이름으로
 *  못 찾았을 때만** 쓰므로, 지점이 여럿인 가게를 굳이 뭉갤 일은 없다. */
function trimBranch(name) {
  const bare = name.replace(/\([^)]*\)/g, " ").replace(/\s*\S*점\s*$/, "").trim();
  return bare && bare !== name.trim() ? bare : "";
}

/** 못 찾으면 null. 키가 없어도 null — 호출부는 빈칸으로 진행한다. */
export async function lookupPlace(name, key = process.env.KAKAO_REST_API_KEY) {
  if (!name || !key) return null;
  const hit = await search(name, key);
  if (hit) return hit;
  const bare = trimBranch(name);
  return bare ? await search(bare, key) : null;
}

async function search(name, key) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${new URLSearchParams({
    query: name, x: String(CAMPUS.lng), y: String(CAMPUS.lat), radius: "1500", size: "3", sort: "distance",
  })}`;
  const r = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) return null;
  const d = (await r.json()).documents?.[0];
  if (!d) return null;
  // "음식점 > 한식 > 두부전문점" → "한식" (시트의 분류 열이 쓰는 단위)
  const parts = String(d.category_name ?? "").split(">").map((s) => s.trim()).filter(Boolean);
  return {
    placeName: d.place_name ?? "",
    address: d.road_address_name || d.address_name || "",
    category: parts[1] ?? parts[0] ?? "",
    lat: Number(d.y),
    lng: Number(d.x),
  };
}
