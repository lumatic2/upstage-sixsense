/** POST /api/chat — Solar 대화 (DR9 step-1)
 *
 *  DR8 까지 대화창은 Solar 로 조건만 뽑고 화면 문장은 코드에 박힌 템플릿이었다.
 *  "에이전트와 대화한다"고 말하면서 실제로는 if/else 가 답하고 있었다 — 이 엔드포인트가 그걸 뒤집는다.
 *
 *  요청: { message: string, history?: [{role:"user"|"assistant", text}], }
 *  응답: 200 {
 *    reply: string,                                  // 화면에 그대로 띄울 한국어 문장(1~2문장)
 *    conditions: { budget, walkMax, tags } | null,   // 검색을 걸어야 하면 채워짐
 *    search: boolean,                                // true 면 클라이언트가 /api/recommend 로 이어간다
 *    source: "solar" | "fallback"
 *  }
 *
 *  설계 결정 — 왕복 1회:
 *    "대화 응답"과 "조건 추출"을 따로 부르면 사용자가 기다리는 시간이 두 배가 된다.
 *    구조화 출력으로 둘을 한 번에 받는다.
 *
 *  설계 결정 — 데이터에 매인 대화(사용자 확정 2026-07-21):
 *    모델이 아는 일반 지식으로 답하기 시작하면 이 서비스의 주장("환각을 구조적으로 막는다")이 무너진다.
 *    그래서 컨텍스트로 실제 보유 데이터 요약을 넣고, 거기 없는 건 모른다고 답하도록 프롬프트로 고정한다.
 *
 *  실패해도 대화는 끊기지 않는다 — 키가 없거나 타임아웃이면 정규식 폴백으로 조건만 뽑아 돌려준다.
 */
import { loadSheetData } from "./_lib/sheet-data.js";

const CHAT_URL = "https://api.upstage.ai/v1/chat/completions";
const TIMEOUT_MS = Number(process.env.SOLAR_CHAT_TIMEOUT_MS || 6000);
const MAX_HISTORY = 6; // 직전 3턴 — 길게 넣으면 토큰만 늘고 답이 산만해진다

/** 모델에 넘길 데이터 요약. 전체를 넣을 수 없으니(메뉴 342행) 답하는 데 필요한 만큼만 압축한다. */
function buildContext(data, todayISO) {
  const byRest = new Map();
  for (const m of data.menus) {
    if (m.isSide) continue; // 곁들임은 한 끼 후보가 아니다 — 대화에서도 같은 규칙(DR6)
    if (!byRest.has(m.restaurant_id)) byRest.set(m.restaurant_id, []);
    byRest.get(m.restaurant_id).push(m);
  }
  const restaurants = data.restaurants.map((r) => {
    const ms = (byRest.get(r.id) ?? []).slice().sort((a, b) => a.price - b.price);
    return {
      이름: r.name, 분류: r.category,
      최저가: ms[0]?.price ?? null,
      대표메뉴: ms.slice(0, 4).map((m) => `${m.name} ${m.price}원`),
    };
  });
  const caf = data.cafeteria.filter((c) => c.menu_date === todayISO)
    .map((c) => ({ 식당: c.cafeteria, 가격: c.price, 메뉴: c.items.slice(0, 6) }));
  return { 오늘: todayISO, 식당수: restaurants.length, 식당: restaurants, 오늘의학식: caf };
}

/** Solar 가 죽어도 대화가 멈추지 않게 — 숫자만이라도 건져 검색은 걸리게 한다. */
function regexFallback(message) {
  const s = String(message ?? "");
  let budget = null, m;
  if ((m = s.match(/(\d+(?:\.\d+)?)\s*만/))) budget = Math.round(Number(m[1]) * 10000);
  else if ((m = s.match(/(\d+)\s*천/))) budget = Number(m[1]) * 1000;
  else if ((m = s.match(/(\d{4,6})\s*원?/))) budget = Number(m[1]);
  const walk = (m = s.match(/도보\s*(\d+)\s*분/)) ? Number(m[1]) : null;
  const tags = ["혼밥", "가성비", "격식", "빠름"].filter((t) => s.includes(t));
  return {
    reply: budget
      ? `${budget.toLocaleString()}원 기준으로 찾아볼게요.`
      : "조건을 정확히 읽지 못했어요. 가진 데이터 안에서 찾아볼게요.",
    conditions: { budget, walkMax: walk, tags },
    search: Boolean(budget || walk || tags.length),
    source: "fallback",
  };
}

const SYSTEM = `너는 성균관대 명륜캠 주변 식사를 돕는 도우미다. 아래 규칙을 어기지 마라.

1) 오직 <데이터>에 있는 사실만 말한다. 식당 이름·메뉴·가격·학식은 <데이터>에서만 가져온다.
2) <데이터>에 없는 것은 지어내지 말고 모른다고 답한다. 맛·평점·분위기·영업시간·날씨·일반 상식은 <데이터>에 없으므로 모른다고 답한다.
3) reply 는 한국어 **최대 2문장, 80자 이내**. 식당 이름은 **많아야 2개**만 예로 든다.
   나열 금지 — 상세는 화면 아래 카드가 보여준다. 카드를 보라고 안내하는 편이 낫다.
4) 사용자가 예산·거리·상황을 말했으면 conditions 를 채우고 search=true 로 둔다.
   예산이 "둘이서 2만원" 처럼 인원이 섞이면 1인 기준으로 나눠서 넣는다.
4-1) tags 는 아래 목록에 있는 말만 쓴다. 해당 없으면 빈 배열로 둔다. 음식 분류(한식·중식 등)는 tags 가 아니다.
   허용 tags: 혼밥, 가성비, 데이트, 회식, 단체, 초밥, 김밥, 쌀국수, 치킨, 생선
5) 조건이 없는 인사·잡담이면 conditions 는 비우고 search=false 로 두되, 무엇을 물으면 되는지 한 문장으로 안내한다.
6) 데이터에 없는 걸 물으면 모른다고 말하고 search=false 로 둔다.`;

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only", code: "method_not_allowed" });

  const { message = "", history = [] } = req.body ?? {};
  if (!String(message).trim()) return res.status(400).json({ error: "message required", code: "bad_request" });

  const key = process.env.UPSTAGE_API_KEY;
  if (!key) return res.status(200).json(regexFallback(message));

  let context = null;
  try {
    const data = await loadSheetData();
    // 서버 시각이 UTC 라 그대로 쓰면 한국 날짜가 하루 밀린다
    const todayISO = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    context = buildContext(data, todayISO);
  } catch {
    return res.status(200).json(regexFallback(message));
  }

  const msgs = [
    { role: "system", content: SYSTEM },
    { role: "system", content: `<데이터>\n${JSON.stringify(context)}\n</데이터>` },
    ...history.slice(-MAX_HISTORY).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: String(h.text ?? "").slice(0, 500),
    })),
    { role: "user", content: String(message).slice(0, 500) },
  ];

  try {
    const r = await fetch(CHAT_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: "solar-pro2",
        messages: msgs,
        // 대화는 온도를 준다 — 같은 질문에 매번 토씨까지 같은 답이 오면 사람은 그걸 템플릿으로 읽는다.
        // (조건 추출은 같은 응답의 구조화 필드라 온도의 영향이 거의 없고, 근거 판정은 별도 호출이라 무관.)
        temperature: 0.7,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "chat_turn", strict: true,
            schema: {
              type: "object",
              properties: {
                reply: { type: "string" },
                search: { type: "boolean" },
                budget: { type: ["integer", "null"] },
                walkMax: { type: ["integer", "null"] },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["reply", "search", "budget", "walkMax", "tags"],
            },
          },
        },
      }),
    });
    if (!r.ok) throw new Error(`solar HTTP ${r.status}`);
    const j = await r.json();
    const p = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    return res.status(200).json({
      reply: String(p.reply ?? "").trim() || "다시 한 번 말씀해 주시겠어요?",
      conditions: p.search ? { budget: p.budget ?? null, walkMax: p.walkMax ?? null, tags: p.tags ?? [] } : null,
      search: Boolean(p.search),
      source: "solar",
    });
  } catch {
    return res.status(200).json(regexFallback(message));
  }
}
