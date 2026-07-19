#!/usr/bin/env node
/** 레퍼런스 보조 캡처: 상단 네비(뷰포트 상단 120px) + 지정 섹션의 하위 블록 분할.
 *  사용법: node scripts/capture-reference-nav.mjs <url> <slug> [splitIdx]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [url, slug, splitIdxRaw] = process.argv.slice(2);
const splitIdx = splitIdxRaw ? Number(splitIdxRaw) : null;
const outDir = path.join("verification", "reference", slug);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);

// 1) 상단 네비 = 뷰포트 최상단 클립
await page.screenshot({ path: path.join(outDir, "nav-top.png"), clip: { x: 0, y: 0, width: 1440, height: 96 } });
// 2) 스크롤 후 sticky 네비 상태
await page.evaluate(() => window.scrollTo(0, 1200));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, "nav-sticky.png"), clip: { x: 0, y: 0, width: 1440, height: 96 } });
await page.evaluate(() => window.scrollTo(0, 0));

// 3) 긴 섹션 분할
if (splitIdx !== null) {
  await page.evaluate(async () => {
    await new Promise((done) => { let y = 0; const t = setInterval(() => { window.scrollTo(0, y); y += 600; if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); done(); } }, 60); });
  });
  await page.waitForTimeout(2000);
  const kids = await page.evaluate((i) => {
    const root = document.querySelector("main") ?? document.body;
    const target = root.children[i];
    const out = [];
    for (const el of target.children) {
      const r = el.getBoundingClientRect();
      if (r.height < 200) continue;
      el.setAttribute("data-sub-idx", String(out.length));
      out.push({ idx: out.length, height: Math.round(r.height), text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100) });
    }
    return out;
  }, splitIdx);
  for (const k of kids) {
    const name = `${String(splitIdx + 1).padStart(2, "0")}-${String.fromCharCode(97 + k.idx)}.png`;
    const el = page.locator(`[data-sub-idx="${k.idx}"]`);
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    await el.screenshot({ path: path.join(outDir, name) }).catch((e) => console.log(`  스킵 ${name}`));
    console.log(`${name}  h=${k.height}  ${k.text.slice(0, 60)}`);
  }
}
await browser.close();
console.log(`→ ${outDir}`);
