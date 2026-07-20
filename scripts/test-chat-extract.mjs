#!/usr/bin/env node
/** 대화 조건 추출 테스트 (DR9)
 *
 *  왜 이 테스트가 있나: 예산 추출을 프롬프트에 맡겼더니 예시로 준 문장에서만 동작하고
 *  "만원 이하로 추천해줘" 같은 흔한 문형에서 6/6 실패했다(2026-07-21 독립 검증).
 *  확정적으로 뽑히는 값은 코드가 뽑고 여기서 문형을 고정한다 — 모델은 사람 말로 답하는 일만 한다.
 *
 *  실행: node scripts/test-chat-extract.mjs
 */
import { extractConditions } from "../api/chat.js";

const CASES = [
  // [입력, 기대 budget, 기대 walkMax, 기대 tags]
  ["8천원 이하 혼밥 추천해줘", 8000, null, ["혼밥"]],
  ["만원 이하로 추천해줘", 10000, null, []],
  ["1만원 이하로 추천해줘", 10000, null, []],
  ["만원이하 추천", 10000, null, []],
  ["5천원 이하 추천해줘", 5000, null, []],
  ["12000원으로", 12000, null, []],
  ["3만원", 30000, null, []],
  ["둘이서 2만원", 10000, null, []],          // 인원 나눗셈
  ["2명이서 3만원", 15000, null, []],
  ["도보 5분 가성비", null, 5, ["가성비"]],
  ["8천원 이하 도보 5분 혼밥", 8000, 5, ["혼밥"]],
  ["안녕", null, null, []],
  ["오늘 뭐 먹지", null, null, []],
  // 3차 독립 검증(2026-07-21)에서 나온 표기들 — 한글 숫자·공백·쉼표
  ["오천원 이하로 뭐 먹지", 5000, null, []],
  ["만 원 정도로 밥 먹고 싶어", 10000, null, []],
  ["둘이서 만 오천원어치 시킬까", 7500, null, []],
  ["8,000원 안에서 해결하고 싶어", 8000, null, []],
  ["10,000원 이하로 알려줘", 10000, null, []],
  ["1인당 8천원 예산이야", 8000, null, []],
  // 숫자도 금액어도 없는 입력에 금액을 지어내지 않는다 (모델 폴백을 없앤 이유)
  ["만넌 이하로 부탁해요", null, null, []],
  ["망원 이하로 찾아줘", null, null, []],
  ["저녁에 뭐 먹을지 고민이에요", null, null, []],
];

let fail = 0;
for (const [input, budget, walkMax, tags] of CASES) {
  const c = extractConditions(input);
  const ok = c.budget === budget && c.walkMax === walkMax
    && JSON.stringify(c.tags) === JSON.stringify(tags);
  if (!ok) {
    console.error(`FAIL  ${input}`);
    console.error(`      기대 budget=${budget} walk=${walkMax} tags=${JSON.stringify(tags)}`);
    console.error(`      실제 budget=${c.budget} walk=${c.walkMax} tags=${JSON.stringify(c.tags)}`);
    fail++;
  }
}

if (fail) { console.error(`\n${fail}/${CASES.length} 실패`); process.exit(1); }
console.log(`조건 추출 ${CASES.length}/${CASES.length} PASS`);
