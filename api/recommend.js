/** POST /api/recommend — 조건 → 실데이터 추천 Top3 + Solar 이유 생성 (DR2 step-2)
 *  요청: { budget: number|null, walkMax: number|null, tags: string[] }
 *  응답: 200 { picks: [{ kind, name, category, walkMin, menus, reason, reasonSource }], cafeteria: {...}|null }
 *  이유 생성: solar-pro2, 타임아웃 5s(SOLAR_TIMEOUT_MS) — 실패 시 데이터 기반 템플릿 이유로 폴백(추천 루프는 불사).
 *  이유는 반드시 전달된 실데이터(메뉴·가격·거리)에만 근거하도록 프롬프트 고정 — step-3 Groundedness 가 이를 검증한다.
 */
import { loadSheetData } from "./_lib/sheet-data.js";

const CHAT_URL = "https://api.upstage.ai/v1/chat/completions";
// 이유 생성·근거 판정 타임아웃 — 2026-07-20 상향(구 2500/2000).
// 실측 18회에서 grounded=null(생성 또는 판정 타임아웃) 이 약 5% 발생했다. 폴백이 있어 추천 루프는
// 죽지 않지만, 그 5% 에서는 Upstage 심화 적용(근거 검증)이 화면에 안 보인다 — 심사 시연에서 잃는 게 크다.
// 실측 왕복이 2.3~3.5s(콜드 포함) 이므로 상한을 늘려도 최악 합계가 Vercel 함수 한도 안에 들어온다.
const REASON_TIMEOUT_MS = Number(process.env.SOLAR_TIMEOUT_MS || 5000);
const JUDGE_TIMEOUT_MS = Number(process.env.SOLAR_JUDGE_TIMEOUT_MS || 3500);
const CAMPUS = { lat: 37.5877, lng: 126.9938 }; // 명륜캠 정문 부근 (parse-query 80m=1분 환산과 동일 기준)

function walkMin(lat, lng) {
  if (!lat || !lng) return null;
  const R = 6371000, dLat = ((lat - CAMPUS.lat) * Math.PI) / 180, dLng = ((lng - CAMPUS.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((CAMPUS.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round((2 * R * Math.asin(Math.sqrt(s))) / 80));
}

function templateReason(p, budget) {
  const bits = [];
  if (budget) bits.push(`예산 ${budget.toLocaleString()}원 안에 메뉴 ${p.menus.length}개`);
  if (p.menus[0]) bits.push(`최저 ${p.menus[0].name} ${p.menus[0].price.toLocaleString()}원`);
  if (p.walkMin) bits.push(`도보 약 ${p.walkMin}분`);
  return bits.join(", ") + ".";
}

async function solarReasons(picks, conditions, key) {
  const facts = picks.map((p) => ({
    name: p.name, category: p.category, walkMin: p.walkMin,
    menus: p.menus.slice(0, 5).map((m) => `${m.name} ${m.price}원`),
  }));
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(REASON_TIMEOUT_MS),
    body: JSON.stringify({
      model: "solar-pro2",
      messages: [
        { role: "system", content: "추천 이유를 쓴다. 반드시 아래 데이터에 있는 사실(메뉴명·가격·도보 분)만 사용하고, 데이터에 없는 맛·평판·분위기 언급 금지. 각 식당당 한국어 한 문장. JSON 만 출력." },
        { role: "user", content: JSON.stringify({ 조건: conditions, 후보: facts }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "reasons", strict: true,
          schema: {
            type: "object",
            properties: { reasons: { type: "array", items: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] } } },
            required: ["reasons"],
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`solar HTTP ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  return new Map((parsed.reasons ?? []).map((r) => [r.name, r.reason]));
}

/** 브라우저가 보낸 취향 프로필을 읽는다 — 서버는 이걸 저장하지 않는다(무상태).
 *  프로필은 순서를 바꾸는 가점 신호일 뿐 필터가 아니다. 그래서 값이 깨져 있어도
 *  "가점 없음"으로 떨어지기만 하고 후보를 지우지 않는다 — 손상된 프로필이 추천을
 *  0건으로 만드는 게 가장 나쁜 실패다. */
function readProfile(profile) {
  const cat = new Map();
  const cats = profile && typeof profile === "object" ? profile.cats : null;
  if (cats && typeof cats === "object") {
    for (const [k, v] of Object.entries(cats)) {
      const n = Number(v);
      if (typeof k === "string" && k && Number.isFinite(n) && n > 0) cat.set(k, Math.min(n, 5));
    }
  }
  return { cat, used: cat.size > 0 };
}

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only", code: "method_not_allowed" });
  const { budget = null, walkMax = null, tags = [], profile = null } = req.body ?? {};
  const aff = readProfile(profile);
  let data;
  try { data = await loadSheetData(); }
  catch { return res.status(200).json({ picks: [], cafeteria: null, error: "data unavailable" }); }

  const candidates = data.restaurants.map((r) => {
    const menus = data.menus
      .filter((m) => m.restaurant_id === r.id && (!budget || m.price <= budget))
      .sort((a, b) => a.price - b.price);
    return { kind: "restaurant", name: r.name, category: r.category, address: r.address, walkMin: walkMin(r.lat, r.lng), menus, tags: r.tags };
  }).filter((p) => p.menus.length > 0);

  // 도보 상한: 전부 걸러지면 상한을 버리고 가까운 순으로 완화 (relaxed 플래그로 정직하게 표시)
  let walkRelaxed = false;
  if (walkMax) {
    const within = candidates.filter((p) => !p.walkMin || p.walkMin <= walkMax);
    if (within.length) candidates.splice(0, candidates.length, ...within);
    else { walkRelaxed = true; candidates.sort((a, b) => (a.walkMin ?? 99) - (b.walkMin ?? 99)); }
  }

  // 랭킹: 태그 일치 > 예산 내 메뉴 수 > 도보 시간, 그 위에 재방문 취향 가점.
  // 점수식으로 바꾼 이유: 취향을 기존 우선순위 사이에 "끼워넣을" 자리가 필요한데
  // 사전식 비교로는 가중치를 조절할 수 없다. 계수는 기존 순서를 보존하도록 잡았다
  // (메뉴 수 1개 = 10점, 도보 1분 = 1점 → 도보(최대 99)가 메뉴 수를 못 뒤집는다).
  const tagSet = new Set(tags);
  const CAT_BONUS = 60; // 메뉴 수 6개어치 — 취향이 순서를 바꾸되 지배하지는 않는 크기
  const base = (p) => p.tags.filter((t) => tagSet.has(t)).length * 1000 + Math.min(p.menus.length, 30) * 10 - (p.walkMin ?? 99);
  const score = (p) => base(p) + (aff.cat.get(p.category) ?? 0) * CAT_BONUS;
  const baseline = candidates.slice().sort((a, b) => base(b) - base(a));
  candidates.sort((a, b) => score(b) - score(a));
  const picks = candidates.slice(0, 3);
  // 취향 때문에 순서가 실제로 바뀐 경우에만 개인화됐다고 말한다 — 안 바뀌었는데
  // "개인화됨"이라고 붙이면 그것도 거짓말이다.
  const personalized = aff.used && picks.some((p, i) => p.name !== baseline[i]?.name);
  for (const p of picks) p.affinity = (aff.cat.get(p.category) ?? 0) > 0;

  // 학식: 최신 날짜 1건 (예산 내면)
  const caf = data.cafeteria.slice().sort((a, b) => a.menu_date < b.menu_date ? 1 : -1)
    .find((c) => !budget || !c.price || c.price <= budget) ?? null;

  const conditions = { budget, walkMax, tags };
  let reasonSource = "template";
  let reasonMap = new Map();
  const key = process.env.UPSTAGE_API_KEY;
  if (key && picks.length) {
    try { reasonMap = await solarReasons(picks, conditions, key); reasonSource = "solar"; }
    catch { reasonSource = "template"; }
  }
  for (const p of picks) {
    p.reason = reasonMap.get(p.name) || templateReason(p, budget);
    p.reasonSource = reasonMap.has(p.name) ? reasonSource : "template";
    p.menus = p.menus.slice(0, 5);
    delete p.tags;
  }

  // 근거 검증 게이트 (step-3): 생성(solar-pro2)과 분리된 판정자(solar-mini)가
  // 추천 이유가 실데이터(context)에만 근거하는지 판정 — notGrounded 면 데이터 템플릿으로 교체해
  // "환각을 구조적으로 차단"을 제품 동작으로 증명한다.
  // ※ 전용 Groundedness Check 모델은 2026-07 현재 이 계정 모델 목록에 없음(retired) —
  //   같은 계약(context-answer 판정)을 solar-mini 독립 판정자로 구현 (생성·검증 모델 분리).
  // 검증 장애는 추천 루프에 영향 없음 (grounded=null, 배지만 생략).
  if (key) {
    await Promise.all(picks.filter((p) => p.reasonSource === "solar").map(async (p) => {
      try {
        const ctx = JSON.stringify({ 식당: p.name, 분류: p.category, 도보분: p.walkMin, 메뉴: p.menus.map((m) => `${m.name} ${m.price}원`), 조건: conditions });
        const r = await fetch(CHAT_URL, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS),
          body: JSON.stringify({
            model: "solar-mini",
            messages: [
              { role: "system", content: "판정자. answer 문장이 context 데이터에 있는 사실(메뉴명·가격·도보 분·분류)만 담으면 grounded, 데이터에 없는 사실(맛·평판·분위기·없는 메뉴·틀린 가격)을 담으면 notGrounded, 판단 불가면 notSure. JSON 만." },
              { role: "user", content: JSON.stringify({ context: ctx, answer: p.reason }) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "verdict", strict: true, schema: { type: "object", properties: { verdict: { type: "string", enum: ["grounded", "notGrounded", "notSure"] } }, required: ["verdict"] } },
            },
          }),
        });
        if (!r.ok) throw new Error(`grounded-judge HTTP ${r.status}`);
        const verdict = JSON.parse((await r.json()).choices?.[0]?.message?.content ?? "{}").verdict ?? null;
        if (verdict === "notGrounded") {
          p.reason = templateReason(p, budget);
          p.reasonSource = "template";
          p.grounded = "replaced"; // 환각 판정 → 데이터 팩트로 교체됨
        } else {
          p.grounded = verdict; // "grounded" | "notSure"
        }
      } catch { p.grounded = null; }
    }));
  }

  res.status(200).json({ picks, cafeteria: caf, conditions, walkRelaxed, personalized });
}
