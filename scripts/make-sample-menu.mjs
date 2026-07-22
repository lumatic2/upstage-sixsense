#!/usr/bin/env node
/** 제보 페이지의 **예시 메뉴판 이미지**를 웹용으로 재인코딩한다 (2026-07-22).
 *
 *  원본은 Codex 내장 이미지 생성으로 만든 실사풍 메뉴판 사진이다(생성 프롬프트는
 *  `public/img/samples/README.md` 에 보존 — 다시 만들려면 그걸 쓴다).
 *  생성물이 1536×1024 PNG 약 2.3MB 라 그대로 올리면 썸네일 두 장에 4.6MB 가 나간다.
 *  여기서는 **긴 변 1400px JPEG** 로 줄이기만 한다.
 *
 *  왜 직접 그리지 않는가: `experiments/parse-poc/photos/` 는 남의 네이버 블로그 수집본이고
 *  `photos/sources.md` 에 "실측 실험 전용(레포 내 보존, 재배포 아님)" 이라고 적어 두었다.
 *  공개 사이트에 올리면 그 기록과 어긋난다 — 그래서 **가상 식당** 메뉴판을 만들어 쓴다.
 *
 *  ⚠ **상호는 지어내기 전에 실재 여부를 반드시 확인한다.** 처음 쓴 "명륜손칼국수" 는 지어낸
 *  이름이었는데 종로구 혜화로에 실재하는 가게였다(Kakao 검색으로 발각). 그대로 뒀으면 실제
 *  가게 이름에 우리가 만든 가격표를 붙여 공개하는 셈이 된다. 현재 "한입국수당" 은 Kakao 전국
 *  검색 0건으로 확인했다(2026-07-22). 이름을 바꾸려면 같은 검사를 다시 하라:
 *    https://dapi.kakao.com/v2/local/search/keyword.json?query=<상호>   → documents 가 비어야 한다
 *
 *  사용법: node scripts/make-sample-menu.mjs <원본디렉터리>
 *          (원본디렉터리에 gen-printed.png · gen-board.png 가 있어야 한다)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = process.argv[2];
if (!SRC_DIR) {
  console.error("사용법: node scripts/make-sample-menu.mjs <gen-*.png 가 있는 디렉터리>");
  process.exit(1);
}
const OUT = "public/img/samples";
const MAX_EDGE = 1400;
const JOBS = [
  { src: "gen-pasta.jpg", out: "sample-menu-pasta.jpg" },      // 사용자 제공본
  { src: "gen-printed.png", out: "sample-menu-printed.jpg" },
  { src: "gen-board.png", out: "sample-menu-board.jpg" },
];
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

for (const j of JOBS) {
  const srcPath = path.join(SRC_DIR, j.src);
  if (!fs.existsSync(srcPath)) { console.error(`없음: ${srcPath}`); process.exitCode = 1; continue; }
  const mime = MIME[path.extname(srcPath).toLowerCase()] ?? "image/png";
  const dataUrl = `data:${mime};base64,${fs.readFileSync(srcPath).toString("base64")}`;
  const jpeg = await page.evaluate(async ({ dataUrl, max }) => {
    const img = await new Promise((ok, no) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  }, { dataUrl, max: MAX_EDGE });

  const outPath = path.join(OUT, j.out);
  fs.writeFileSync(outPath, Buffer.from(jpeg.split(",")[1], "base64"));
  const before = (fs.statSync(srcPath).size / 1024).toFixed(0);
  const after = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`${outPath}  ${before}KB → ${after}KB`);
}
await browser.close();
