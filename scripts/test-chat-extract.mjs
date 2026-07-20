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
