#!/usr/bin/env node
/** 레퍼런스 보조 캡처: 페이지를 고정 높이 스트립으로 잘라 읽기 좋은 조각으로 저장.
 *  사용법: node scripts/capture-reference-strips.mjs <url> <slug> [stripHeight]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [url, slug, hRaw] = process.argv.slice(2);
const H = Number(hRaw ?? 1100);
const outDir = path.join("verification", "reference", slug, "strips");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.evaluate(async () => {
  await new Promise((done) => { let y = 0; const t = setInterval(() => { window.scrollTo(0, y); y += 600; if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); done(); } }, 60); });
});
await page.waitForTimeout(2500);
const total = await page.evaluate(() => document.body.scrollHeight);
const n = Math.ceil(total / H);
for (let i = 0; i < n; i++) {
  const name = `s${String(i + 1).padStart(2, "0")}.png`;
  await page.screenshot({ path: path.join(outDir, name), clip: { x: 0, y: i * H, width: 1440, height: Math.min(H, total - i * H) }, fullPage: true });
  console.log(name);
}
await browser.close();
console.log(`총 ${n}장 (page height ${total}) → ${outDir}`);
