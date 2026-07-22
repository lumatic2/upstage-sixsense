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

  /* 여백 자동 절단 — 생성 모델은 그림을 캔버스 가운데에 놓지 않는다(1차 생성물은 아래쪽
     15% 가 통째로 비어 있어 본문에서 캡션과 벌어져 보였다). 뽑을 때마다 여백 위치가
     달라지므로 눈으로 자르지 않고 배경색과 다른 픽셀의 경계를 재서 자른다. */
  const probe = document.createElement("canvas");
  probe.width = img.width; probe.height = img.height;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  pctx.drawImage(img, 0, 0);
  const px = pctx.getImageData(0, 0, img.width, img.height).data;
  const at = (x, y) => (y * img.width + x) * 4;
  const bg = [px[0], px[1], px[2]];                       // 좌상단 픽셀을 배경으로 본다
  const differs = (x, y) => {
    const i = at(x, y);
    return Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) > 24;
  };
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!differs(x, y)) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = img.width - 1; y1 = img.height - 1; }
  const pad = Math.round(Math.max(img.width, img.height) * 0.02);   // 선이 가장자리에 붙지 않게
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(img.width - 1, x1 + pad); y1 = Math.min(img.height - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  const s = Math.min(1, max / Math.max(cw, ch));
  const c = document.createElement("canvas");
  c.width = Math.round(cw * s);
  c.height = Math.round(ch * s);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  // JPEG 는 투명을 못 담는다 — 배경색으로 먼저 칠해야 잘린 여백이 검게 나오지 않는다.
  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, x0, y0, cw, ch, 0, 0, c.width, c.height);
  return { url: jpeg ? c.toDataURL("image/jpeg", 0.92) : c.toDataURL("image/png"), crop: `${img.width}×${img.height} → ${cw}×${ch}` };
}, { dataUrl, max: maxEdge, jpeg });

fs.writeFileSync(out, Buffer.from(png.url.split(",")[1], "base64"));
console.log(`${out}  ${(fs.statSync(src).size / 1024).toFixed(0)}KB → ${(fs.statSync(out).size / 1024).toFixed(0)}KB  (여백 절단 ${png.crop})`);
await browser.close();
