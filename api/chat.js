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

/** 금액·거리·태그를 코드로 뽑는다.
 *
 *  왜 모델에 안 맡기나: 프롬프트로 "금액이 있으면 반드시 넣어라"를 지시했더니 예시로 준 문장
 *  ("8천원 이하 혼밥 추천해줘")에서만 동작하고 "만원 이하로 추천해줘" 에서는 6/6 실패했다
 *  (2026-07-21 독립 검증). 지시를 더 붙이는 건 다음 문형에서 또 샌다 — 확정적으로 뽑히는 값은
 *  코드가 뽑고, 모델은 사람 말로 답하는 일만 한다. */
const KNUM = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };

/** 받침을 보고 은/는을 고른다. "맥도날드은(는)" 처럼 표기 그대로 내보내면 사람 글이 아니다. */
export function withParticle(word) {
  const w = String(word ?? "").trim();
  const last = w.slice(-1);
  const code = last.charCodeAt(0);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return `${w}는`; // 한글이 아니면 기본형
  return (code - 0xac00) % 28 === 0 ? `${w}는` : `${w}은`;
}

/** "오천원"·"만 오천원"·"8,000원" 처럼 사람이 실제로 쓰는 표기를 금액으로 읽는다.
 *  한글 숫자를 아라비아로 바꾼 뒤 같은 규칙을 태운다 — 표기마다 정규식을 늘리면 곧 샌다.
 *  숫자도 금액어도 없으면 null 이다("망원 이하로" 같은 오타에 금액을 지어내지 않는다). */
export function parseAmount(raw) {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .replace(/(\d)\s+(?=\d)/g, "$1")                 // "8 000 원" → "8000원"
    .replace(/[일이삼사오육칠팔구]/g, (c) => KNUM[c])
    .replace(/(\d)?백/g, (_, d) => String((d ? Number(d) : 1) * 100))
    .replace(/(\d)?십/g, (_, d) => String((d ? Number(d) : 1) * 10)); // "2십만" → "20만"
  let m;
  if ((m = s.match(/(\d+)?\s*만\s*(\d+)\s*천/))) return (m[1] ? Number(m[1]) : 1) * 10000 + Number(m[2]) * 1000;
  if ((m = s.match(/(\d+(?:\.\d+)?)\s*만/))) return Math.round(Number(m[1]) * 10000);
  if (/(^|[^\d가-힣])만\s*원/.test(s)) return 10000;
  if ((m = s.match(/(\d+)\s*천/))) return Number(m[1]) * 1000;
  if ((m = s.match(/(\d{4,6})\s*원/))) return Number(m[1]);
  return null;
}

export function extractConditions(message) {
  const s = String(message ?? "");
  let budget = parseAmount(s), m;
  // "둘이서 2만원" 처럼 인원이 섞이면 1인 기준으로 나눈다
  const people = (m = s.match(/(\d+)\s*명|둘이|2인/)) ? (m[1] ? Number(m[1]) : 2) : 1;
  if (budget && people > 1) budget = Math.round(budget / people);
  const walkMax = (m = s.match(/도보\s*(\d+)\s*분/)) ? Number(m[1]) : null;
  // 태그는 **어절 앞머리**에서만 잡는다. 부분일치로 두면 합성어 뒤꼬리가 태그가 된다 —
  // "교촌치킨"→`치킨` 은 모델의 unknownPlace 가 걸러주지만, 실재하지 않으면서 음식처럼
  // 읽히는 조합("동해생선카레")은 모델이 가게로 안 봐서 `생선` 이 살아남았다(이슈 ⑧).
  // 앞 글자가 한글이면 낱말 속에 묻힌 것으로 보고 버린다("생선구이"는 앞머리라 잡힌다).
  const tags = ["혼밥", "가성비", "데이트", "회식", "단체", "초밥", "김밥", "쌀국수", "치킨", "생선"]
    .filter((t) => {
      let i = s.indexOf(t);
      while (i !== -1) {
        const prev = i > 0 ? s.charCodeAt(i - 1) : 0;
        if (!(prev >= 0xac00 && prev <= 0xd7a3)) return true;
        i = s.indexOf(t, i + 1);
      }
      return false;
    });
  return { budget, walkMax, tags };
}

/** Solar 가 죽어도 대화가 멈추지 않게 — 위 추출값으로 검색은 걸리게 한다. */
function regexFallback(message) {
  const c = extractConditions(message);
  return {
    reply: c.budget
      ? `${c.budget.toLocaleString()}원 기준으로 찾아볼게요.`
      : "조건을 정확히 읽지 못했어요. 가진 데이터 안에서 찾아볼게요.",
    conditions: c,
    search: Boolean(c.budget || c.walkMax || c.tags.length),
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
   **메시지 안에 금액이 있으면 반드시 budget 에 넣는다.** "8천원 이하 혼밥 추천해줘" 처럼
   부탁하는 말투가 붙어도 금액은 이미 주어진 것이다 — 예산을 다시 묻지 마라.
   8천원=8000, 1만원=10000, 5천=5000 으로 환산한다.
4-1) tags 는 아래 목록에 있는 말만 쓴다. 해당 없으면 빈 배열로 둔다. 음식 분류(한식·중식 등)는 tags 가 아니다.
   허용 tags: 혼밥, 가성비, 데이트, 회식, 단체, 초밥, 김밥, 쌀국수, 치킨, 생선
5) 조건이 없는 인사·잡담이면 conditions 는 비우고 search=false 로 두되, 무엇을 물으면 되는지 한 문장으로 안내한다.
6) 데이터에 없는 걸 물으면 모른다고 말하고 search=false 로 둔다.
   사용자가 <데이터> 식당 목록에 **없는 가게 이름**을 지목하면(맥도날드·버거킹·스타벅스 등)
   그 이름을 그대로 unknownPlace 에 넣는다. 목록에 있으면 unknownPlace 는 null 이다.
   딴 가게나 학식 이야기로 돌리지 마라 — 묻지 않은 걸 답하는 것도 틀린 답이다.
7) reply 에 "<데이터>" 같은 내부 표기를 쓰지 마라. 사용자는 그 태그를 모른다.
   "데이터에 없습니다" 대신 "제가 가진 정보에는 없어요" 처럼 사람 말로 답한다.`;

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

  // 조건은 코드가 먼저 뽑고 그 결과를 모델에 알려준다. 모델에게 따로 뽑게 두면
  // 화면(코드 값)과 말(모델 문장)이 어긋난다 — "망원 이하로" 처럼 금액이 없는 입력에
  // 검색은 안 걸리는데 말로는 "8천원 이하로는…" 을 읊었다(2026-07-21 4차 검증).
  const code0 = extractConditions(message);
  const known = code0.budget
    ? `예산 1인 ${code0.budget}원${code0.walkMax ? `, 도보 ${code0.walkMax}분` : ""}`
    : "예산 조건 없음(사용자가 금액을 말하지 않았다)";

  const msgs = [
    { role: "system", content: SYSTEM },
    { role: "system", content: `<데이터>\n${JSON.stringify(context)}\n</데이터>` },
    { role: "system", content: `<확정조건>${known}</확정조건>\n이 조건이 정본이다. 여기에 없는 금액을 지어내 말하지 마라.` },
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
        // 실측(온도 0/0.3/0.7 × 3회): 조건 추출 정확도는 셋 다 3/3 이고, 답변 문장은 온도 0 에서도
        // 3종으로 갈렸다 — 다양성 때문에 온도를 올릴 이유가 없었다. 구조화 출력의 안정성을 우선해 낮게 둔다.
        temperature: 0.4,
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
                // 사용자가 지목했는데 <데이터>에 없는 가게 이름. 없으면 null.
                // 문장으로만 지시했더니 5/6 이 딴 이야기(학식)로 새서, 필드로 받아 서버가 문장을 보장한다.
                unknownPlace: { type: ["string", "null"] },
              },
              required: ["reply", "search", "budget", "walkMax", "tags", "unknownPlace"],
            },
          },
        },
      }),
    });
    if (!r.ok) throw new Error(`solar HTTP ${r.status}`);
    const j = await r.json();
    const p = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    // 프롬프트로 막아도 가끔 새므로 한 번 더 지운다 — 내부 표기가 사용자 문장에 뜨면 그 자체가 결함이다.
    let reply = String(p.reply ?? "").replace(/<\/?데이터>/g, "").replace(/\s{2,}/g, " ").trim();

    // 없는 가게를 물었으면 그 사실을 먼저 말한다. 모델은 이걸 자주 건너뛰고 딴 이야기로 샜다.
    // 단 모델이 이미 그 가게를 짚어 답했으면 덧붙이지 않는다 — 같은 사실을 두 번 말하게 된다.
    const unknown = String(p.unknownPlace ?? "").trim();
    if (unknown && unknown !== "null" && !reply.includes(unknown)) {
      // 모델이 이름 없이 "제가 가진 정보에는 없어요" 식으로 같은 말을 또 하는 문장은 버린다 —
      // 앞에 우리 문장을 붙이면 같은 사실이 두 번 나온다.
      const rest = reply.split(/(?<=[.!?])\s+/)
        .filter((s) => !/(정보|데이터)에?\s*(는|은)?\s*없/.test(s))
        .join(" ").trim();
      reply = `${withParticle(unknown)} 아직 데이터에 없습니다. ${rest}`.trim();
    }

    // 브랜드명 안의 글자가 태그로 잡히면 안 된다 — "교촌치킨 배달돼요?" 가 `치킨` 태그를 만들어
    // "그 가게는 없습니다" 라고 답한 직후 추천 3곳을 내놓았다(2026-07-21 4차 검증).
    // 사용자가 말하지 않은 검색 의도를 지어낸 셈이다.
    if (unknown && unknown !== "null") {
      code0.tags = code0.tags.filter((t) => !unknown.includes(t));
    }

    // 조건은 **코드 추출만** 쓴다. 모델 값을 폴백으로 두었더니 숫자가 하나도 없는 오타 입력
    // ("망원 이하로 찾아줘")에 8,000원 같은 그럴듯한 금액을 지어냈다(2026-07-21 3차 검증).
    // 없는 조건은 없다고 두는 편이 지어낸 조건으로 검색하는 것보다 낫다.
    const { budget, walkMax, tags } = code0;
    const search = Boolean(budget || walkMax || tags.length);

    // 검색을 안 거는 턴에서는 말과 화면이 어긋날 수 있는 두 가지를 지운다:
    //  ① "N원 이하…" — 사용자가 금액을 말한 적 없는데 모델이 지어낸 예산 문장
    //  ② "카드를 확인하세요" — 카드가 안 뜨는데 카드를 가리키는 안내
    // (2026-07-21 4차 검증: "만넌 이하로 부탁해요" 가 8천원 추천 문장을 읊었다.)
    if (!search) {
      const kept = reply.split(/(?<=[.!?])\s+/).filter((s) =>
        !(!budget && /\d[\d,]*\s*원\s*(이하|이내|안|미만)/.test(s)) && !/카드/.test(s));
      // 전부 걸러졌다는 건 응답이 통째로 어긋났다는 뜻이다. 원문으로 되돌리면 필터를 안 건 것과 같다
      // — 실제로 그 구멍으로 "8,000원 이하 소반·홍순두부를 추천해요" 가 화면의 다른 가게 카드와 함께
      // 나갔다(2026-07-21 전수 감사 BLOCKER). 남는 게 없으면 지어내지 말고 못 알아들었다고 말한다.
      reply = kept.join(" ").trim() || "조건을 알아듣지 못했어요. 예산이나 상황을 알려주시면 찾아드릴게요.";
    }

    return res.status(200).json({
      reply: reply || "다시 한 번 말씀해 주시겠어요?",
      conditions: search ? { budget, walkMax, tags } : null,
      search,
      source: "solar",
    });
  } catch {
    return res.status(200).json(regexFallback(message));
  }
}
