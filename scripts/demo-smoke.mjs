#!/usr/bin/env node
/**
 * 심사 시연 시나리오 smoke (DR2 step-4) — 리허설 스크립트 겸용 (플레이북 Phase 5-5)
 *
 * 사용법: node scripts/demo-smoke.mjs [--url https://upstage-sixsense-staging.vercel.app]
 * 시나리오 = 심사 시연 그대로:
 *   1. 앱 로드 → 헤더·검색 렌더, 콘솔 red error 0
 *   2. 실데이터 로드 → 식당 ≥5, 학식 ≥1
 *   3. "8천원 이하 혼밥" 검색 → 조건 파싱 표시 + 오늘의 추천 ≥1 + 이유 문구 존재
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
await page.goto(URL_, { waitUntil: "networkidle" });
check("앱 로드: 제목", (await page.title()).includes("한입지도"));
check("헤더·검색 렌더", await page.locator("#searchForm").isVisible());

// 2. 실데이터
await page.waitForFunction(() => document.querySelectorAll("#restaurantBlock .card").length > 0, null, { timeout: 15000 }).catch(() => {});
const restCount = await page.locator("#restaurantBlock .card").count();
check("실데이터 식당 ≥5", restCount >= 5, `${restCount}곳`);
const cafText = await page.locator("#cafeteriaBlock").textContent();
check("학식 표시", (cafText ?? "").includes("학식"));

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

// 4. 예산 칩 필터 (6천원) — 표시된 전 메뉴 가격이 상한 이내인지
await page.click('button[data-budget="6000"]');
await page.waitForTimeout(800);
const over = await page.evaluate(() => {
  const prices = [...document.querySelectorAll("#restaurantBlock .menus .price")]
    .map((e) => Number((e.textContent || "").replace(/[^\d]/g, "")))
    .filter((n) => n > 0);
  return prices.filter((p) => p > 6000).length;
});
check("예산 칩 필터: 6천원 초과 노출 0", over === 0, `초과 ${over}건`);

// 5. 콘솔·스크린샷
check("콘솔 red error 0", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));
fs.mkdirSync("verification/screenshots", { recursive: true });
await page.screenshot({ path: "verification/screenshots/smoke-final.png", fullPage: true });

await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${fails === 0 ? "SMOKE PASS" : "SMOKE FAIL"} (${results.length - fails}/${results.length})`);
process.exit(fails === 0 ? 0 : 1);
