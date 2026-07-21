#!/usr/bin/env node
/** 개인화 경계 테스트 (ADR-0004 §6)
 *
 *  ADR 에 "개인화는 순서에 개입하지 않는다 / 데이터에 없는 말은 기억하지 않는다"고 써 두기만 하면
 *  다음 사람이 조용히 되돌린다. 실제로 `CAT_BONUS=60` 이 근거 없이 배포돼 있었다 —
 *  값이 아니라 축(카드 클릭 = 선택)이 허수였는데 아무도 못 잡았다. 원칙을 코드로 고정한다.
 *
 *  실행: node scripts/test-personalization.mjs
 */
import fs from "node:fs";
import { extractFoods, verifyFoods, dataHits, stripFabricatedMemory } from "../api/_lib/memory.js";

let fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) fail++;
};

const DATA = {
  restaurants: [
    { id: "R1", name: "성대한김밥", category: "분식", tags: ["혼밥"] },
    { id: "R2", name: "백미향마라탕 명륜점", category: "중식", tags: [] },
  ],
  menus: [
    { restaurant_id: "R1", name: "돈까스", price: 4000, isSide: false },
    { restaurant_id: "R1", name: "돈까스백반", price: 7000, isSide: false },
    { restaurant_id: "R2", name: "마라탕", price: 9000, isSide: false },
  ],
};

// ── ① 순서 개인화는 존재하지 않는다 (ADR-0004 §1·§2)
const rec = fs.readFileSync(new URL("../api/recommend.js", import.meta.url), "utf8");
check("추천 API 가 프로필을 받지 않는다", !/profile/.test(rec.split("export default")[1] ?? ""),
  (rec.split("export default")[1] ?? "").match(/profile/)?.[0] ?? "없음");
check("분류 가점(CAT_BONUS)이 남아 있지 않다", !/CAT_BONUS\s*=/.test(rec));
check("정렬식이 명시 조건만 쓴다",
  /score = \(p\) => p\.tags\.filter/.test(rec) && !/aff\.|affinity/.test(rec));

const app = fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
check("클라이언트가 추천 요청에 프로필을 안 싣는다", !/profile: loadProfile/.test(app));
check("반응 없는 클릭(.card.liked)이 없다", !/card\.liked|noteCategory/.test(app));

// ── ② 기억은 데이터가 판정한다 (ADR-0004 §3)
check("데이터에 있는 말은 기억한다", extractFoods("돈까스 싸게 먹을 데 있어?", DATA).includes("돈까스"));
check("조사가 붙어도 기억한다", extractFoods("돈까스는 어디가 싸?", DATA).includes("돈까스"));
check("데이터에 없는 말은 기억하지 않는다",
  extractFoods("마라탕버거 파는 데 있어?", DATA).length === 0,
  JSON.stringify(extractFoods("마라탕버거 파는 데 있어?", DATA)));
check("가게 이름도 기억한다", extractFoods("성대한김밥 메뉴 뭐야", DATA).includes("성대한김밥"));
check("흔한 말은 기억하지 않는다", !extractFoods("오늘 저녁 추천해줘", DATA).some((w) => ["오늘", "저녁", "추천"].includes(w)));
check("한 턴에서 3개를 넘지 않는다", extractFoods("돈까스 마라탕 성대한김밥 분식 중식", DATA).length <= 3);

// 부분일치 함정 — 사용자가 말한 낱말 그대로가 데이터에 있어야 한다(이슈 ⑧ 과 같은 자리)
check("합성어에서 조각을 건져내지 않는다", !extractFoods("마라탕버거", DATA).includes("마라탕"));

// 재검증 — 기억이 데이터보다 오래 살면 안 된다
check("저장된 기억도 현재 데이터로 다시 거른다",
  JSON.stringify(verifyFoods(["돈까스", "탕수육"], DATA)) === JSON.stringify(["돈까스"]),
  JSON.stringify(verifyFoods(["돈까스", "탕수육"], DATA)));
check("메뉴가 사라지면 그 기억은 말하지 않는다",
  verifyFoods(["돈까스"], { restaurants: [], menus: [] }).length === 0);
check("중복은 한 번만", verifyFoods(["돈까스", "돈까스"], DATA).length === 1);
check("dataHits 는 부분문자열을 센다", dataHits("돈까스", DATA) === 2, `${dataHits("돈까스", DATA)}건`);

// ── ③ 없는 기억은 말하지 않는다 (ADR-0004 §4③)
//     실측: <지난방문> 이 없는데도 "지난번엔 일식 찾으셨는데…" 를 지어냈다. 프롬프트로 강하게
//     시킨 규칙일수록 조건이 없을 때도 발동한다 — 그래서 코드로 막는다.
check("기억이 없으면 '지난번' 문장을 지운다",
  stripFabricatedMemory("지난번엔 일식 찾으셨는데, 오늘도 그쪽으로 볼까요? 무제스시가 있어요.", []) === "무제스시가 있어요.",
  stripFabricatedMemory("지난번엔 일식 찾으셨는데, 오늘도 그쪽으로 볼까요? 무제스시가 있어요.", []));
check("검증된 관심어를 담은 문장은 남긴다",
  stripFabricatedMemory("지난번엔 돈까스 찾으셨죠. 성대한김밥이 있어요.", ["돈까스"]).startsWith("지난번엔 돈까스"));
check("기억이 있어도 다른 것을 지어내면 지운다",
  !stripFabricatedMemory("지난번엔 일식 찾으셨는데요. 성대한김밥이 있어요.", ["돈까스"]).includes("일식"));
check("기억 얘기가 없는 답은 그대로 둔다",
  stripFabricatedMemory("무제스시와 기꾸스시가 있어요.", ["돈까스"]) === "무제스시와 기꾸스시가 있어요.");

// ── ④ 서버 무상태 (ADR-0004 §4)
const chat = fs.readFileSync(new URL("../api/chat.js", import.meta.url), "utf8");
check("서버가 기억을 저장하지 않는다 (받아서 쓰고 버린다)",
  /const \{ message[^}]*memory = \[\]/.test(chat) && !/localStorage|writeFile|appendRows\(.?"기억/.test(chat));

if (fail) { console.error(`\n${fail} 실패 — ADR-0004 의 경계를 넘었다. 바꾸려면 ADR 을 먼저 고쳐라.`); process.exit(1); }
console.log("\n개인화 경계 PASS (ADR-0004)");
