/** POST /api/parse-query — 자연어 검색 질의 → {budget, walkMax, tags} 구조화.
 *  1차 Solar(solar-pro2, json_schema 구조화 출력) → 실패/타임아웃(기본 2초) 시 정규식 폴백.
 *  (머리말이 `solar-mini` 로 남아 있었으나 실제 호출은 pro2 다 — 아래 model 줄의 주석 참고.)
 *  폴백 정규식은 hanipmap app.js 의 parseBudget/parseWalkMax 이식 — 데모 중 외부 장애에도 검색 불사.
 *  (TRD §5.10. 키는 서버 전용 UPSTAGE_API_KEY — 키 부재 시에도 폴백으로 200.)
 *  요청: { query: "8천원 이하 도보 5분 혼밥" }
 *  응답: 200 { budget, walkMax, tags, reason, source: "solar"|"regex-fallback" } | 4xx { error, code }
 */
const CHAT_URL = "https://api.upstage.ai/v1/chat/completions";

// ⚠ Upstage json_schema 는 nullable union(type: ["number","null"]) 을 지원하지 않는다(500, 실측 2026-07-17).
//   "없음" 은 -1 sentinel 로 받고 핸들러에서 null 로 변환한다.
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "query_struct",
    strict: true,
    schema: {
      type: "object",
      properties: {
        budget: { type: "number" },
        walkMax: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        reason: { type: "string" },
      },
      required: ["budget", "walkMax", "tags", "reason"],
    },
  },
};

const SYSTEM_PROMPT =
  "성균관대 명륜캠퍼스 주변 식당 검색 질의를 구조화한다. 규칙: budget=1인 예산 상한(원). 질의에 금액이 없으면 반드시 -1 (추측 금지). '2만원으로 둘이'처럼 인원이 있으면 1인분으로 나눈다. walkMax=도보 상한(분), 없으면 -1. 거리(m)는 80m=1분 환산. tags 는 다음 중에서만 고른다: 혼밥,단체,회식,격식,해장,야식,24시,가성비,양많음,데이트,시험기간 (격식=교수님·과선배·어른과 식사). reason 은 해석 근거 한 문장. JSON 만 출력.";

// ── hanipmap app.js 이식 (정규식 폴백) ──
import { extractConditions, parseAmount } from "./chat.js";

function parseBudget(text) {
  let match = text.match(/(\d+)\s*천\s*원/);
  if (match) return Number(match[1]) * 1000;
  match = text.match(/(\d+)\s*만\s*원/);
  if (match) return Number(match[1]) * 10000;
  match = text.match(/(\d+)\s*원/);
  if (match) return Number(match[1]);
  return null;
}
function parseWalkMax(text) {
  let match = text.match(/도보\s*(\d+)\s*분/);
  if (match) return Number(match[1]);
  match = text.match(/(\d+)\s*m\s*이내/);
  if (match) return Math.ceil(Number(match[1]) / 80);
  return null;
}
function regexFallback(query) {
  // 태그 해석은 Solar 몫 — 폴백은 데모 데이터에 있는 대표 키워드만 직매칭
  const tags = ["혼밥", "단체", "해장", "야식", "24시", "가성비"].filter((t) => query.includes(t));
  // 금액·거리는 /api/chat 과 같은 추출기를 쓴다. 여기만 옛 parseBudget 을 두면 "오천원"·"만 오천원"
  // 같은 표기에서 두 엔드포인트가 서로 다른 답을 낸다.
  const c = extractConditions(query);
  return { budget: c.budget ?? parseBudget(query), walkMax: c.walkMax ?? parseWalkMax(query), tags, reason: "정규식 폴백 해석", source: "regex-fallback" };
}

async function readJsonBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only", code: "method_not_allowed" });
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "invalid JSON body", code: "bad_json" });
  }
  const query = body?.query;
  if (!query || typeof query !== "string" || query.length > 500) {
    return res.status(400).json({ error: "query (string, ≤500자) required", code: "no_query" });
  }

  const apiKey = process.env.UPSTAGE_API_KEY;
  // TRD 초안은 2초였으나 solar-pro2 구조화 출력 실측 0.7~1.3s(솔로 3.8s 관측) — 여유 포함 2.5s 로 확정
  const timeoutMs = Number(process.env.SOLAR_TIMEOUT_MS || 2500);

  if (apiKey) {
    try {
      const up = await fetch(CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: "solar-pro2", // mini 는 인원 나눗셈 실패·예산 환각 관측 — pro2 가 0.7~1.3s 로 충분히 빠름
          temperature: 0,
          max_tokens: 300,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query },
          ],
          response_format: RESPONSE_FORMAT,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (up.ok) {
        const json = await up.json();
        const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "");
        // 금액은 코드 추출을 우선한다 — 모델은 문형이 조금만 달라져도 흘리거나(만원 이하로…)
        // 숫자가 없는 오타에 그럴듯한 값을 지어낸다(2026-07-21 검증). /api/chat 과 같은 규칙을 쓴다.
        // 이 엔드포인트는 /api/chat 이 죽었을 때의 폴백 경로이자 verify/test 페이지가 직접 부르는 곳이라,
        // 여기만 옛 로직으로 두면 같은 결함이 그대로 살아 있게 된다.
        const code = extractConditions(query);
        const modelBudget = typeof parsed.budget === "number" && parsed.budget > 0 ? Math.round(parsed.budget) : null;
        const budget = code.budget ?? (parseAmount(query) !== null ? modelBudget : null);
        const walkMax = code.walkMax ?? (typeof parsed.walkMax === "number" && parsed.walkMax > 0 ? Math.round(parsed.walkMax) : null);
        const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string").slice(0, 8) : [];
        return res.status(200).json({ budget, walkMax, tags, reason: String(parsed.reason ?? ""), source: "solar" });
      }
      // 업스트림 4xx/5xx → 폴백 (에러 원문 비노출)
    } catch {
      // 타임아웃·네트워크·JSON 파싱 실패 → 폴백
    }
  }
  return res.status(200).json(regexFallback(query));
}
