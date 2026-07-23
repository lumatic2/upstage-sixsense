/** POST /api/identify — 메뉴판에서 읽은 텍스트로 **가게를 특정**한다 (2026-07-22).
 *  요청: { text?: string, name?: string }
 *  응답: 200 { name, address, category, placeName, nameSource, placeFound }
 *
 *  왜 두 단계인가:
 *   ① 상호는 메뉴판에 안 찍혀 있는 경우가 많다(실측 4장 중 3장). 있으면 Solar 가 골라내고,
 *      없으면 빈 문자열을 준다 — **지어내지 않는다**. 사용자가 직접 적으면 그 이름으로 ②만 돈다.
 *   ② 이름이 정해지면 Kakao 키워드 검색으로 주소·분류를 채운다(경영관 반경 1.5km).
 *      실측 6곳 중 4곳 적중 — 못 찾으면 빈칸으로 두고 사용자가 적는다.
 *  두 값 모두 화면에서 수정 가능한 **제안**이다. 서버가 확정하지 않는다.
 */
import { lookupPlace } from "./_lib/place.js";

const CHAT_URL = "https://api.upstage.ai/v1/chat/completions";
const NAME_TIMEOUT_MS = 4000;

/** 메뉴판 OCR 텍스트에서 상호만 뽑는다. 없으면 빈 문자열 — 메뉴명을 상호로 둔갑시키지 않는다. */
async function guessName(text, key) {
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(NAME_TIMEOUT_MS),
    body: JSON.stringify({
      model: "solar-pro2",
      messages: [
        {
          role: "system",
          content:
            "메뉴판에서 읽은 텍스트가 주어진다. 그 안에 **가게 상호**가 있으면 그것만 뽑아라. " +
            "메뉴 이름·가격·분류(면 요리, 밥 등)·안내 문구는 상호가 아니다. " +
            "간판에 함께 적힌 영문 병기·슬로건·창업연도(SINCE 1998)는 상호가 아니므로 빼고 " +
            "**한국어 상호만** 남긴다. 지점명(명륜점 등)은 상호의 일부이므로 남긴다. " +
            "상호로 보이는 것이 없으면 반드시 빈 문자열을 반환한다. 추측해서 지어내지 말 것. JSON 만 출력.",
        },
        { role: "user", content: String(text).slice(0, 2000) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "store", strict: true,
          schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`solar ${res.status}`);
  const raw = (await res.json()).choices?.[0]?.message?.content ?? "{}";
  return String(JSON.parse(raw).name ?? "").trim().slice(0, 60);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only", code: "method_not_allowed" });

  const { text = "", name = "" } = req.body ?? {};
  let resolved = String(name).trim().slice(0, 60);
  let nameSource = resolved ? "user" : "none";

  // ① 이름이 안 왔으면 메뉴판 텍스트에서 찾아본다. 실패해도 흐름을 막지 않는다.
  const upstageKey = process.env.UPSTAGE_API_KEY;
  if (!resolved && text && upstageKey) {
    try {
      resolved = await guessName(text, upstageKey);
      if (resolved) nameSource = "solar";
    } catch { /* 못 찾으면 빈칸 — 사용자가 적는다 */ }
  }

  // ② 이름이 있으면 주소·분류를 찾아본다.
  let place = null;
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (resolved && kakaoKey) {
    try { place = await lookupPlace(resolved, kakaoKey); } catch { /* 못 찾으면 빈칸 */ }
  }

  return res.status(200).json({
    name: resolved,
    nameSource,
    placeFound: Boolean(place),
    placeName: place?.placeName ?? "",
    address: place?.address ?? "",
    category: place?.category ?? "",
  });
}
