/** POST /api/recommend — 조건 → 실데이터 추천 Top3 + Solar 이유 생성 (DR2 step-2)
 *  요청: { budget: number|null, walkMax: number|null, tags: string[] }
 *  응답: 200 { picks: [{ kind, name, category, walkMin, menus, reason, reasonSource }], cafeteria: {...}|null }
 *  이유 생성: solar-pro2, 타임아웃 2.5s (TRD §5.10) — 실패 시 데이터 기반 템플릿 이유로 폴백(추천 루프는 불사).
 *  이유는 반드시 전달된 실데이터(메뉴·가격·거리)에만 근거하도록 프롬프트 고정 — step-3 Groundedness 가 이를 검증한다.
 */
import { loadSheetData } from "./_lib/sheet-data.js";

const CHAT_URL = "https://api.upstage.ai/v1/chat/completions";
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
    signal: AbortSignal.timeout(2500),
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

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only", code: "method_not_allowed" });
  const { budget = null, walkMax = null, tags = [] } = req.body ?? {};
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

  // 랭킹: 태그 일치 > 예산 내 메뉴 수 > 도보 시간
  const tagSet = new Set(tags);
  candidates.sort((a, b) => {
    const at = a.tags.filter((t) => tagSet.has(t)).length, bt = b.tags.filter((t) => tagSet.has(t)).length;
    if (at !== bt) return bt - at;
    if (a.menus.length !== b.menus.length) return b.menus.length - a.menus.length;
    return (a.walkMin ?? 99) - (b.walkMin ?? 99);
  });
  const picks = candidates.slice(0, 3);

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
  res.status(200).json({ picks, cafeteria: caf, conditions, walkRelaxed });
}
