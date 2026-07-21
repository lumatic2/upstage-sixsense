/** 대화 칩 검증 — 모델이 낸 다음 질문 후보를 실데이터로 돌려보고 살아남은 것만 내보낸다.
 *
 *  왜 검증이 필요한가: 칩을 Solar 에 자유롭게 맡기면 "24시 하는 곳"·"배달되는 곳" 처럼
 *  그럴듯하지만 **우리 데이터에 없는** 제안이 나온다. 누르면 그 조건과 무관한 결과가 나오고,
 *  그건 이 서비스가 가장 피해 온 결함(말과 화면이 다르다)이다. 제안조차 데이터로 검증한다.
 *
 *  왜 규칙 생성이 아닌가: 조건 슬롯만 보고 코드가 고르면 "대화 맥락에 맞는 제안"이 아니라
 *  빈칸 채우기가 된다 — 에이전트인 척하는 if/else 로 되돌아간다(DR9 에서 걷어낸 것).
 *  문장은 모델이 쓰고, 진실 여부는 데이터가 정한다.
 */
import { walkMin } from "./geo.js";

export const MAX_CHIPS = 3;
const MAX_LABEL = 14;

/** 예산 안에 **본메뉴**가 있는 식당 수. 곁들임(공기밥·음료)만 남는 집은 한 끼가 안 된다(DR6 규칙). */
export function affordableCount(data, budget) {
  if (!budget) return data.restaurants.length;
  const ok = new Set();
  for (const m of data.menus) {
    if (m.isSide || m.price > budget) continue;
    ok.add(m.restaurant_id);
  }
  return data.restaurants.filter((r) => ok.has(r.id)).length;
}

/** 도보 상한 안에 실제로 있는 식당 수. /api/recommend 는 전부 걸러지면 상한을 완화하므로,
 *  검증 없이 "도보 3분 안" 칩을 내면 눌렀을 때 도보 12분 집이 나올 수 있다. */
export function withinWalkCount(data, walkMax) {
  if (!walkMax) return data.restaurants.length;
  return data.restaurants.filter((r) => {
    const w = walkMin(r.lat, r.lng);
    return w !== null && w <= walkMax;
  }).length;
}

/** 데이터에 실제로 붙어 있는 태그 어휘. 모델이 만든 태그는 여기 없으면 버린다. */
export function tagVocab(data) {
  const v = new Set();
  for (const r of data.restaurants) for (const t of r.tags ?? []) v.add(t);
  return v;
}

function sameConditions(a, b) {
  const ta = [...(a.tags ?? [])].sort().join("|"), tb = [...(b.tags ?? [])].sort().join("|");
  return (a.budget ?? null) === (b.budget ?? null) && (a.walkMax ?? null) === (b.walkMax ?? null) && ta === tb;
}

/** 모델이 낸 후보를 검증해 최대 3개로 줄인다.
 *  @param data   loadSheetData() 결과
 *  @param raw    모델이 낸 칩 배열(신뢰하지 않는다)
 *  @param state  지금 걸려 있는 조건 — 같은 조건을 또 권하지 않기 위해 필요하다
 *  @param opts   { cafeteriaOpen } 오늘 학식이 한 곳이라도 열려 있는가
 */
export function pickChips(data, raw, state = {}, opts = {}) {
  if (!Array.isArray(raw) || !data?.restaurants?.length) return [];
  const vocab = tagVocab(data);
  const out = [], seen = new Set();

  for (const c of raw) {
    if (out.length >= MAX_CHIPS) break;
    const label = String(c?.label ?? "").trim().replace(/\s+/g, " ");
    if (!label || label.length > MAX_LABEL) continue;
    if (seen.has(label)) continue;

    const budget = Number.isFinite(c?.budget) && c.budget > 0 ? Math.round(c.budget) : null;
    const walkMax = Number.isFinite(c?.walkMax) && c.walkMax > 0 ? Math.round(c.walkMax) : null;
    const tags = Array.isArray(c?.tags) ? c.tags.filter((t) => typeof t === "string" && vocab.has(t)) : [];
    // 모델이 태그를 하나라도 냈는데 전부 어휘 밖이면 그 칩은 통째로 버린다 —
    // 태그만 떼고 살려두면 라벨("혼밥하기 좋은 곳")과 실제 동작(조건 없음)이 어긋난다.
    if (Array.isArray(c?.tags) && c.tags.length && !tags.length) continue;

    // 조건이 하나도 없는 칩은 학식 안내만 허용한다. 그 외에는 눌러도 화면이 안 바뀌고,
    // 검증할 근거도 없다(모델이 무엇을 약속한 건지 데이터로 확인할 수 없다).
    const isCafeteria = !budget && !walkMax && !tags.length;
    if (isCafeteria && !(opts.cafeteriaOpen && label.includes("학식"))) continue;

    // 라벨과 조건이 같은 말을 해야 한다. 실측에서 `"한식만 보기"` 에 `생선` 태그를 붙여 왔다
    // (2026-07-21) — 누르면 라벨이 약속한 것과 다른 게 나온다. 태그는 라벨에 드러나야 한다.
    if (tags.some((t) => !label.includes(t))) continue;

    // 칩이 사용자 예산을 **몰래 올리는** 것을 막는다. "학식 보기" 에 budget 9000 을 실어
    // 8천원 조건을 슬쩍 늘린 응답이 실측됐다. 금액을 바꾸려면 라벨에 숫자가 보여야 한다.
    if (budget && state.budget && budget > state.budget && !/\d/.test(label)) continue;

    // 여기서부터가 실검증 — 후보를 실제로 돌려본다.
    if (budget && affordableCount(data, budget) < 1) continue;
    if (walkMax && withinWalkCount(data, walkMax) < 1) continue;
    if (tags.length && !data.restaurants.some((r) => tags.every((t) => (r.tags ?? []).includes(t)))) continue;

    // 지금 조건과 같으면 버린다 — 이미 답한 질문을 다시 권하는 꼴이다(예산 칩을 없앤 것과 같은 이유).
    // 학식 칩은 예외다: 조건을 안 바꾸는 게 그 칩의 일이다(예산은 그대로 두고 학식만 묻는다).
    const merged = mergeConditions(state, { budget, walkMax, tags });
    if (!isCafeteria && sameConditions(merged, state)) continue;

    seen.add(label);
    out.push({ label, budget, walkMax, tags });
  }
  return out;
}

/** 칩은 **덧붙이는 조건**이다 — "도보 5분 안으로" 를 눌렀다고 예산이 풀리면 안 된다.
 *  태그는 누적하고(혼밥 + 가성비), 금액·거리는 새 값이 있으면 덮어쓴다. */
export function mergeConditions(state = {}, chip = {}) {
  return {
    budget: chip.budget ?? state.budget ?? null,
    walkMax: chip.walkMax ?? state.walkMax ?? null,
    tags: [...new Set([...(state.tags ?? []), ...(chip.tags ?? [])])],
  };
}
