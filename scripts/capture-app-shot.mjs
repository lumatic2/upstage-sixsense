#!/usr/bin/env node
/** 랜딩 히어로용 서비스 화면 캡처 — 실제 배포 화면의 검색·지도·추천 영역만 잘라 public/img/app-shot.png 로 저장.
 *  사용법: node scripts/capture-app-shot.mjs [--url https://sixsense.askewly.com]
 */
import { chromium } from "playwright";

const URL_ = process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : "https://sixsense.askewly.com";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto(URL_ + "/app.html", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll("#restaurantBlock .card").length > 0, null, { timeout: 20000 }).catch(() => {});
await page.fill("#q", "8천원 이하 혼밥");
await page.click("#goBtn");
await page.waitForFunction(() => document.querySelectorAll("#picksBlock .card").length > 0, null, { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1500);
// 헤더 아래 본문만 (랜딩 안에서 헤더가 이중으로 보이지 않게)
await page.screenshot({ path: "public/img/app-shot.png", clip: { x: 0, y: 78, width: 1280, height: 760 } });
await browser.close();
console.log("→ public/img/app-shot.png");
