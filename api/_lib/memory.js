/** 대화 기억 — 지난 방문에 물었던 관심어를 데이터로 검증해 남긴다 (ADR-0004 §3).
 *
 *  왜 문장을 저장하지 않나: 발화 원문을 남기면 개인적인 문장이 브라우저에 남고, 모델이 그걸
 *  재해석해 없는 사실을 만든다. 모델 요약을 남기면 요약이 틀렸을 때 대조할 원본이 없다.
 *  그래서 **우리 데이터 안에 실제로 있는 말**만 남긴다 — 대화 칩과 같은 계약이다(모델이 쓰고
 *  데이터가 판정한다). "마라탕버거"는 기억하지 않는다. 다음 방문에 그 말을 꺼내면 헛말이 된다.
 *
 *  매칭 규칙: **사용자가 말한 낱말 그대로가 데이터 문자열 안에 나타나야 한다.**
 *  - 어절 단위로 자르고 조사를 떼어 본다("돈까스는" → "돈까스").
 *  - 그 낱말이 메뉴명·식당명·분류의 부분문자열이면 통과("돈까스" ⊂ "돈까스백반").
 *  - 반대 방향(데이터 낱말이 사용자 말 안에 있는 경우)은 잡지 않는다 — "마라탕버거"에서
 *    `마라탕` 을 건져내는 식이면 사용자가 말한 적 없는 걸 기억하게 된다(이슈 ⑧ 과 같은 함정).
 */

export const MAX_FOODS = 5;
export const TTL_DAYS = 30;

// 붙어 나오는 조사. 긴 것부터 떼야 "이랑"이 "이"로 잘리지 않는다.
const PARTICLES = ["이랑", "에서", "하고", "으로", "까지", "부터", "는", "은", "이", "가", "을", "를", "도", "만", "랑", "과", "와", "의", "에", "로"];
// 음식·가게 이름이 아닌데 데이터 문자열에 우연히 걸리는 말들. 기억해도 쓸 데가 없다.
const STOP = new Set(["오늘", "내일", "점심", "저녁", "아침", "야식", "지금", "추천", "근처", "메뉴", "가게", "식당", "학식", "예산", "가격", "가장", "제일", "정도", "이하", "이내", "어디", "뭐가", "뭔가", "괜찮", "먹을", "먹고", "있어", "없어", "알려", "찾아", "주변", "학교", "우리", "그냥", "다른", "이런", "저런"]);

const stripParticle = (w) => {
  for (const p of PARTICLES) {
    if (w.length > p.length + 1 && w.endsWith(p)) return w.slice(0, -p.length);
  }
  return w;
};

/** 데이터에서 매칭 대상 문자열을 모은다 — 메뉴명·식당명·분류. */
function haystack(data) {
  const out = [];
  for (const m of data?.menus ?? []) if (m?.name) out.push(String(m.name));
  for (const r of data?.restaurants ?? []) {
    if (r?.name) out.push(String(r.name));
    if (r?.category) out.push(String(r.category));
  }
  return out;
}

/** 그 낱말이 데이터에 몇 번 나타나는가. 0이면 우리가 해줄 수 있는 게 없는 말이다. */
export function dataHits(word, data) {
  const w = String(word ?? "").trim();
  if (w.length < 2) return 0;
  return haystack(data).filter((h) => h.includes(w)).length;
}

/** 사용자 문장에서 **데이터에 실제로 있는** 관심어만 뽑는다. */
export function extractFoods(message, data) {
  const words = String(message ?? "").split(/[\s,.!?~"'()\[\]]+/).filter(Boolean);
  const found = [];
  for (const raw of words) {
    if (found.length >= 3) break;                     // 한 턴에서 셋이면 충분하다
    const w = stripParticle(raw.replace(/[^가-힣]/g, ""));
    if (w.length < 2 || w.length > 12) continue;
    if (STOP.has(w)) continue;
    if (found.includes(w)) continue;
    if (dataHits(w, data) < 1) continue;              // ← 여기가 판정. 데이터가 없으면 안 남는다
    found.push(w);
  }
  return found;
}

/** 저장돼 있던 관심어를 **현재 데이터로 다시** 거른다.
 *  기억은 브라우저에 남지만 데이터는 바뀐다. 사라진 메뉴를 계속 말하면 그때부터 거짓말이다. */
export function verifyFoods(foods, data) {
  if (!Array.isArray(foods)) return [];
  const seen = new Set();
  return foods
    .map((f) => (typeof f === "string" ? f : f?.w))
    .filter((w) => typeof w === "string" && w.length >= 2 && w.length <= 12)
    .filter((w) => (seen.has(w) ? false : (seen.add(w), true)))
    .filter((w) => dataHits(w, data) >= 1)
    .slice(0, MAX_FOODS);
}

/** 없는 기억을 말하는 문장을 지운다.
 *
 *  실측(2026-07-21): <지난방문> 이 **없는데도** "지난번엔 일식 찾으셨는데…" 를 지어냈다.
 *  프롬프트로 강하게 시킨 규칙일수록 조건이 없을 때도 발동한다 — 프롬프트로 다시 막으면
 *  다음 문형에서 또 샌다(예산 문장에서 이미 겪은 실패). 기억을 말하는 문장은 반드시
 *  검증된 관심어를 담고 있어야 통과시킨다.
 */
const MEMORY_CLAIM = /지난번|지난 ?방문|저번에|전에 (물|찾)/;
export function stripFabricatedMemory(reply, pastFoods = []) {
  const text = String(reply ?? "");
  if (!MEMORY_CLAIM.test(text)) return text;
  const kept = text.split(/(?<=[.!?])\s+/)
    .filter((s) => !MEMORY_CLAIM.test(s) || pastFoods.some((f) => s.includes(f)));
  return kept.join(" ").trim();
}
