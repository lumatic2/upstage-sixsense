#!/usr/bin/env node
/**
 * 레퍼런스 페이지 섹션 캡처 (DR2 step-5 디자인 교체 작업용)
 *
 * 사용법: node scripts/capture-reference.mjs <url> <slug>
 * 산출:  verification/reference/<slug>/full.png, NN-<tag>.png, sections.json
 *
 * 섹션 분할: main(또는 body) 하위에서 높이 240px 이상인 최상위 블록을 섹션으로 보고 각각 캡처.
 * 캡처물은 디자인 참고용 사내 기록 — 배포물에 포함하지 않는다.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2];
const slug = process.argv[3] ?? "ref";
if (!url) { console.error("사용법: node scripts/capture-reference.mjs <url> <slug>"); process.exit(1); }

const outDir = path.join("verification", "reference", slug);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });

// lazy-load 유발: 끝까지 스크롤 후 복귀
await page.evaluate(async () => {
  await new Promise((done) => {
    let y = 0;
    const t = setInterval(() => {
      window.scrollTo(0, y);
      y += 600;
      if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); done(); }
    }, 60);
  });
});
await page.waitForTimeout(2500);

await page.screenshot({ path: path.join(outDir, "full.png"), fullPage: true });

// 헤더(고정 네비) 별도
const header = page.locator("header").first();
if (await header.count()) {
  await header.screenshot({ path: path.join(outDir, "00-header.png") }).catch(() => {});
}

const sections = await page.evaluate(() => {
  const root = document.querySelector("main") ?? document.body;
  const out = [];
  for (const el of root.children) {
    const r = el.getBoundingClientRect();
    if (r.height < 240 || r.width < 400) continue;
    el.setAttribute("data-capture-idx", String(out.length));
    out.push({
      idx: out.length,
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 60),
      height: Math.round(r.height),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
    });
  }
  return out;
});

for (const s of sections) {
  const el = page.locator(`[data-capture-idx="${s.idx}"]`);
  const name = `${String(s.idx + 1).padStart(2, "0")}-${s.tag}.png`;
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await el.screenshot({ path: path.join(outDir, name) }).catch((e) => console.log(`  스킵 ${name}: ${e.message.slice(0, 60)}`));
  s.file = name;
  console.log(`${name}  h=${s.height}  ${s.text.slice(0, 60)}`);
}

fs.writeFileSync(path.join(outDir, "sections.json"), JSON.stringify({ url, capturedAt: null, sections }, null, 2));
await browser.close();
console.log(`\n캡처 ${sections.length}섹션 → ${outDir}`);
