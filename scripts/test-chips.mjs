#!/usr/bin/env node
/** 대화 칩 검증 테스트
 *
 *  왜 이 테스트가 있나: 칩 문장은 Solar 가 쓴다. 즉 **틀린 제안이 나오는 것은 정상**이고,
 *  그걸 화면 앞에서 걸러내는 게 서버의 일이다. 여기서 걸러야 할 것들을 고정한다.
 *  실측(2026-07-21)에서 실제로 나온 불량: 라벨-조건 불일치("한식만 보기"+생선 태그),
 *  예산 몰래 올리기("학식 보기"+9000), 데이터에 없는 태그.
 *
 *  실행: node scripts/test-chips.mjs
 */
import { pickChips, mergeConditions, affordableCount, withinWalkCount } from "../api/_lib/chips.js";

// 최소 데이터 — 명륜캠 좌표 기준 도보 1분/약 12분 두 곳
const DATA = {
  restaurants: [
    { id: "R1", name: "가까운집", category: "한식", lat: 37.5877, lng: 126.9940, tags: ["혼밥", "가성비"] },
    { id: "R2", name: "먼집", category: "중식", lat: 37.5800, lng: 127.0010, tags: ["단체"] },
  ],
  menus: [
    { restaurant_id: "R1", name: "국수", price: 6000, isSide: false },
    { restaurant_id: "R1", name: "공기밥", price: 1000, isSide: true },
    { restaurant_id: "R2", name: "짜장", price: 9000, isSide: false },
  ],
};

let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { console.error(`FAIL  ${name}\n      기대 ${JSON.stringify(want)}\n      실제 ${JSON.stringify(got)}`); fail++; }
};
const labels = (raw, state = {}, opts = {}) => pickChips(DATA, raw, state, opts).map((c) => c.label);

// 셈 helper
eq("예산 안 본메뉴 있는 집 수(6000)", affordableCount(DATA, 6000), 1);
eq("곁들임만 남는 예산은 0곳(1000)", affordableCount(DATA, 1000), 0);
eq("도보 3분 안 식당 수", withinWalkCount(DATA, 3), 1);

// 통과해야 하는 것
eq("정상 칩", labels([{ label: "더 싼 곳으로", budget: 6000, walkMax: null, tags: [] }], { budget: 8000 }), ["더 싼 곳으로"]);
eq("태그가 라벨에 드러나면 통과", labels([{ label: "혼밥 가능한 곳", budget: null, walkMax: null, tags: ["혼밥"] }]), ["혼밥 가능한 곳"]);
eq("학식 칩(조건 없음)은 오늘 열렸을 때만", labels([{ label: "오늘 학식은?", budget: null, walkMax: null, tags: [] }], {}, { cafeteriaOpen: true }), ["오늘 학식은?"]);

// 걸러야 하는 것
eq("학식 닫힌 날 조건 없는 칩", labels([{ label: "오늘 학식은?", budget: null, walkMax: null, tags: [] }], {}, { cafeteriaOpen: false }), []);
eq("데이터에 없는 태그", labels([{ label: "24시 하는 곳", budget: null, walkMax: null, tags: ["24시"] }]), []);
eq("라벨-조건 불일치(한식만 보기+생선)", labels([{ label: "한식만 보기", budget: null, walkMax: null, tags: ["단체"] }]), []);
eq("예산 몰래 올리기", labels([{ label: "학식 보기", budget: 9000, walkMax: null, tags: [] }], { budget: 8000 }), []);
eq("예산 올리기도 라벨에 숫자가 있으면 통과", labels([{ label: "1만원까지 올리기", budget: 10000, walkMax: null, tags: [] }], { budget: 8000 }), ["1만원까지 올리기"]);
eq("결과 0곳인 예산", labels([{ label: "천원 이하로", budget: 1000, walkMax: null, tags: [] }]), []);
eq("지금 조건과 같은 칩", labels([{ label: "8천원 이하", budget: 8000, walkMax: null, tags: [] }], { budget: 8000 }), []);
eq("라벨 너무 김", labels([{ label: "여기서 아주 멀리 떨어진 곳도 한번 보여주세요", budget: 6000, walkMax: null, tags: [] }]), []);
eq("중복 라벨은 하나만", labels([
  { label: "더 싼 곳으로", budget: 6000, walkMax: null, tags: [] },
  { label: "더 싼 곳으로", budget: 6000, walkMax: null, tags: [] },
], { budget: 8000 }), ["더 싼 곳으로"]);
eq("최대 3개", labels([
  { label: "가성비 좋은 곳", budget: null, walkMax: null, tags: ["가성비"] },
  { label: "혼밥 되는 곳", budget: null, walkMax: null, tags: ["혼밥"] },
  { label: "단체로 갈 곳", budget: null, walkMax: null, tags: ["단체"] },
  { label: "더 싼 곳으로", budget: 6000, walkMax: null, tags: [] },
], { budget: 8000 }).length, 3);
eq("모델이 배열이 아닌 걸 주면 빈 배열", pickChips(DATA, null, {}), []);

// 조건 합치기 — 칩은 덧붙이는 것이지 갈아엎는 게 아니다
eq("칩은 기존 예산을 유지한다", mergeConditions({ budget: 8000, walkMax: null, tags: [] }, { walkMax: 5, tags: ["혼밥"] }),
  { budget: 8000, walkMax: 5, tags: ["혼밥"] });
eq("태그는 누적된다", mergeConditions({ budget: null, walkMax: null, tags: ["혼밥"] }, { tags: ["가성비"] }),
  { budget: null, walkMax: null, tags: ["혼밥", "가성비"] });

if (fail) { console.error(`\n${fail} 실패`); process.exit(1); }
console.log("칩 검증 18/18 PASS");
