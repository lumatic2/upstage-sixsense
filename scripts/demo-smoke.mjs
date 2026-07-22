#!/usr/bin/env node
/**
 * 심사 시연 시나리오 smoke (DR2 step-4) — 리허설 스크립트 겸용 (플레이북 Phase 5-5)
 *
 * 사용법: node scripts/demo-smoke.mjs [--url https://sixsense.askewly.com]
 * 시나리오 = 심사 시연 그대로:
 *   1. 앱 로드 → 헤더·검색 렌더, 콘솔 red error 0
 *   2. 실데이터 로드 → 식당 ≥5, 학식 ≥1
 *   3. "8천원 이하 혼밥" 검색 → 조건 파싱 표시 + 오늘의 추천 ≥1 + 이유 문구 + Groundedness 배지·판정
 *   4. 예산 칩(6천원) → 목록이 예산 내로 필터
 *   5. 스크린샷 저장 (verification/screenshots/smoke-*.png)
 * 종료 코드: 전부 PASS=0, 하나라도 FAIL=1 (CI 없이 로컬 실행 계약)
 */
import { chromium } from "playwright";
import fs from "node:fs";

const URL_ = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "https://upstage-sixsense-staging.vercel.app";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

// 1. 로드
await page.goto(URL_ + "/app.html", { waitUntil: "networkidle" });
check("앱 로드: 제목", (await page.title()).includes("한입지도"));
check("헤더·검색 렌더", await page.locator("#searchForm").isVisible());

// 2. 실데이터 — DR9 에서 하단 전체 목록을 없앴다. 이제 "뭐가 있나"는 지도 마커가 보여주므로
//    마커 수로 센다. (구 `#restaurantBlock .card` 는 존재하지 않는 셀렉터라 그대로 두면 늘 0이다.)
await page.waitForFunction(() => document.querySelectorAll('#map img[src*="transparent.gif"]').length > 0, null, { timeout: 15000 }).catch(() => {});
const restCount = await page.locator('#map img[src*="transparent.gif"]').count();
check("실데이터 식당 마커 ≥5", restCount >= 5, `${restCount}곳`);
// 학식은 정식 명칭 보드로 바뀌었다 — 4곳이 다 뜨고 그중 하나 이상이 실제 이름이어야 한다.
// 셀렉터가 사라지면 예외로 죽지 말고 FAIL 로 보고한다 — 죽으면 어느 항목이 깨졌는지 안 남는다.
const cafText = (await page.locator("#cafeteriaBlock").textContent({ timeout: 8000 }).catch(() => null)) ?? "";
const cafNames = ["패컬티식당", "은행골식당", "법고을식당", "금잔디식당"].filter((n) => cafText.includes(n));
check("학식 4곳 정식 명칭 표시", cafNames.length === 4, `${cafNames.length}/4`);
// 구 버전은 "카드 텍스트에 날짜 문자열이 없으면 통과"였는데, 카드에는 원래 날짜를 안 넣는다 —
// 즉 무슨 짓을 해도 통과하는 허수였다(2026-07-21 감사 적발). 실제로 검증할 것 두 가지로 바꾼다:
// ① 보드에 4곳이 다 있는가 ② 화면이 말하는 날짜가 오늘(KST)인가.
const cafCards = await page.locator("#cafeteriaBlock .card").count();
check("학식 카드 4장", cafCards === 4, `${cafCards}장`);
const shownDate = ((await page.locator("#cafDate").textContent().catch(() => "")) ?? "").trim();
const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
check("학식 날짜 = 오늘(KST)", shownDate === todayKST, `화면 ${shownDate || "(없음)"} / 오늘 ${todayKST}`);

// 3. 자연어 검색 → 추천+이유
await page.fill("#q", "8천원 이하 혼밥");
await page.click("#goBtn");
await page.waitForFunction(() => {
  const b = document.querySelector("#picksBlock");
  return b && b.querySelectorAll(".card").length > 0;
}, null, { timeout: 20000 }).catch(() => {});
const picks = await page.locator("#picksBlock .card").count();
check("오늘의 추천 ≥1", picks >= 1, `${picks}건`);
const reasonText = await page.locator("#picksBlock .reason").first().textContent().catch(() => "");
check("추천 이유 문구", (reasonText ?? "").trim().length > 5, (reasonText ?? "").slice(0, 40));
const parsedText = await page.locator("#parsed").textContent();
check("조건 파싱 표시", (parsedText ?? "").includes("8,000"));

// 3-2. Groundedness 판정 — DoD 가 시연 시나리오에 포함하므로 실제로 검사한다.
//   구조 검사만 하면 판정기(solar-mini)가 죽어 폴백으로 떨어져도 PASS 가 난다(2026-07-20 독립검증 지적).
//   2026-07-22: 통과 배지를 화면에서 뺐으므로(정상은 기본값이라 장식으로 읽힘) 검사 대상을
//   보이는 텍스트에서 카드의 `data-grounded` 로 옮겼다. 배지를 지웠다고 판정이 사라지지
//   않았음을 이 검사가 계속 지킨다 — 판정이 죽으면 값이 "none" 으로 떨어져 FAIL 한다.
const verdict = (await page.locator("#picksBlock .card.pick").first().getAttribute("data-grounded").catch(() => null)) ?? "";
check("Groundedness 판정 기록", verdict.length > 0, `data-grounded="${verdict}"`);
check(
  "Groundedness 판정 실행",
  verdict === "grounded" || verdict === "replaced",
  verdict === "grounded" || verdict === "replaced" ? "판정 결과 반영됨" : `판정 미실행 — 폴백("${verdict}")`,
);
// 통과 카드에는 배지가 없어야 한다 (사용자 지시 2026-07-22 — 화면에서 뺀 게 실제로 빠졌는지)
const okBadges = await page.locator('#picksBlock .card.pick[data-grounded="grounded"] .badge').count();
check("통과 카드 배지 없음", okBadges === 0, `${okBadges}건`);

// 4. 예산 필터 (6천원) — 표시된 전 메뉴 가격이 상한 이내인지
//    검사 대상을 추천 카드로 옮겼다. 구 셀렉터(#restaurantBlock)는 DR9 에서 사라져 요소가 0개였고,
//    그러면 "초과 0건"으로 **그냥 통과**한다 — 아무것도 검사하지 않으면서 PASS 를 찍는 허수였다.
//    입력으로 거는 이유: 고정 예산 칩 줄은 2026-07-21 에 없어졌고, 지금 칩은 매 턴 모델이
//    만들고 서버가 검증해 내려주므로 **라벨이 고정이 아니다** — 셀렉터로 붙잡으면 곧 깨진다.
await page.fill("#q", "6천원 이하");
await page.click("#goBtn");
// 고정 대기는 안 된다 — 추천은 Solar 이유 생성 + 근거 판정까지 도느라 5~9초가 걸린다.
// 짧게 재면 "검사할 가격 0개"가 되어 필터 검사가 허수로 통과한다.
// "가격이 하나라도 있으면 통과"도 안 된다 — **앞 검색(8천원)의 카드가 아직 그대로**라 조건이
// 즉시 참이 되고, 8천원짜리 메뉴를 6천원 필터의 결과로 세게 된다(2026-07-21 실측 FAIL).
// 화면이 새 조건으로 바뀐 것(#parsed)과 카드가 다시 그려진 것을 함께 기다린다.
await page.waitForFunction(
  () => (document.querySelector("#parsed")?.textContent ?? "").includes("6,000")
    && !document.querySelector("#picksBlock .skeleton")
    && document.querySelectorAll("#picksBlock .menus .price").length > 0,
  null, { timeout: 25000 },
).catch(() => {});
const priced = await page.evaluate(() =>
  [...document.querySelectorAll("#picksBlock .menus .price")]
    .map((e) => Number((e.textContent || "").replace(/[^\d]/g, "")))
    .filter((n) => n > 0));
check("예산 6천원: 검사할 가격이 실제로 있음", priced.length > 0, `${priced.length}개`);
const over = priced.filter((p) => p > 6000).length;
check("예산 필터: 6천원 초과 노출 0", over === 0, `초과 ${over}건 / 검사 ${priced.length}개`);

// 5. 콘솔·스크린샷
check("콘솔 red error 0", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));
fs.mkdirSync("verification/screenshots", { recursive: true });
await page.screenshot({ path: "verification/screenshots/smoke-final.png", fullPage: true });

await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${fails === 0 ? "SMOKE PASS" : "SMOKE FAIL"} (${results.length - fails}/${results.length})`);
process.exit(fails === 0 ? 0 : 1);
