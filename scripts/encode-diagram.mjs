#!/usr/bin/env node
/** Codex 이미지 생성으로 뽑은 **다이어그램 PNG** 를 웹용으로 줄인다 (2026-07-23).
 *
 *  생성물은 1792×896 안팎 PNG 라 그대로 올리면 한 장에 700KB 가 넘는다.
 *  **PNG 로 다시 저장하면 오히려 커진다**(실측: 765KB → 1043KB). 원본은 색이 몇 개뿐인
 *  팔레트 이미지인데 캔버스가 리샘플링하며 안티에일리어싱 계조를 잔뜩 만들기 때문이다.
 *  그래서 출력 확장자가 `.jpg` 면 JPEG 로 저장한다 — 다이어그램은 얇은 선과 글자가 내용의
 *  전부라 품질을 높게(q92) 잡되, 표시 크기가 원본의 절반이라 링잉은 보이지 않는다.
 *
 *  생성 프롬프트는 `public/img/README.md` 에 보존한다 — 다시 만들려면 그걸 쓴다.
 *
 *  사용법: node scripts/encode-diagram.mjs <원본.png> <출력.png|.jpg> [긴변px=1600]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const [src, out] = process.argv.slice(2);
const maxEdge = Number(process.argv[4] ?? 1600);
if (!src || !out) {
  console.error("사용법: node scripts/encode-diagram.mjs <원본.png> <출력.png> [긴변px]");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const dataUrl = `data:image/png;base64,${fs.readFileSync(src).toString("base64")}`;
const jpeg = out.toLowerCase().endsWith(".jpg");
const png = await page.evaluate(async ({ dataUrl, max, jpeg }) => {
  const img = await new Promise((ok, no) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = dataUrl;
  });
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return jpeg ? c.toDataURL("image/jpeg", 0.92) : c.toDataURL("image/png");
}, { dataUrl, max: maxEdge, jpeg });

fs.writeFileSync(out, Buffer.from(png.split(",")[1], "base64"));
console.log(`${out}  ${(fs.statSync(src).size / 1024).toFixed(0)}KB → ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
await browser.close();
