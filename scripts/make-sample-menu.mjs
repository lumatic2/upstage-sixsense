#!/usr/bin/env node
/** 제보 페이지의 **예시 메뉴판 이미지**를 만든다 (2026-07-22).
 *
 *  왜 그리는가: `experiments/parse-poc/photos/` 는 남의 네이버 블로그에서 모은 것이고
 *  `photos/sources.md` 에 "실측 실험 전용(레포 내 보존, 재배포 아님)" 이라고 적어 두었다.
 *  공개 사이트에 올리면 그 기록과 어긋나고 남의 저작물을 재배포하는 것이 된다.
 *  그래서 **가상 식당**의 메뉴판을 직접 그린다 — 저작권 문제가 없고, 결과 이미지를 실제
 *  Document Parse 에 통과시켜 "이 예시가 실제로 읽힌다"를 검증할 수 있다.
 *
 *  가격대는 명륜동 실제 시세를 참고한 그럴듯한 값이고, 상호는 실재하지 않는 이름이다.
 *  화면에서도 "예시"라고 밝힌다 — 실제 가게로 오해하게 두지 않는다.
 *
 *  사용법: node scripts/make-sample-menu.mjs   → public/img/samples/*.png
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "public/img/samples";
fs.mkdirSync(OUT, { recursive: true });

/** 인쇄 메뉴판 — 벽에 붙은 아크릴 판을 정면에서 찍은 느낌 */
const printed = {
  // 뷰포트는 판(820px)+여백보다 넉넉해야 한다 — 딱 맞추면 테두리·그림자 때문에 가격 열이 잘린다.
  file: "sample-menu-printed.png",
  w: 1020, h: 1180,
  html: `
<div class="board">
  <div class="head">
    <div class="brand">명륜손칼국수</div>
    <div class="sub">MYEONGNYUN NOODLE · SINCE 1998</div>
  </div>
  <div class="sect">면 요리</div>
  <table>
    <tr><td>손칼국수</td><td class="p">7,000</td></tr>
    <tr><td>바지락칼국수</td><td class="p">8,500</td></tr>
    <tr><td>들깨칼국수</td><td class="p">9,000</td></tr>
    <tr><td>콩국수</td><td class="p">9,500</td></tr>
    <tr><td>비빔국수</td><td class="p">7,500</td></tr>
  </table>
  <div class="sect">밥 · 만두</div>
  <table>
    <tr><td>김치볶음밥</td><td class="p">7,000</td></tr>
    <tr><td>제육덮밥</td><td class="p">8,000</td></tr>
    <tr><td>손만두 (10개)</td><td class="p">6,000</td></tr>
    <tr><td>만두국</td><td class="p">8,000</td></tr>
  </table>
  <div class="sect">곁들임</div>
  <table>
    <tr><td>공기밥</td><td class="p">1,000</td></tr>
    <tr><td>계란후라이</td><td class="p">1,500</td></tr>
  </table>
  <div class="foot">포장 가능 · 카드 결제 가능</div>
</div>`,
  css: `
body{margin:0;background:#6b6f76;display:grid;place-items:center;padding:40px;
  font-family:"Malgun Gothic","맑은 고딕",sans-serif}
.board{width:820px;background:#fdfcf7;padding:48px 56px 40px;
  box-shadow:0 18px 50px rgba(0,0,0,.45);border:1px solid #e4e0d4}
.head{text-align:center;border-bottom:3px solid #1e2430;padding-bottom:18px;margin-bottom:26px}
.brand{font-size:52px;font-weight:800;letter-spacing:-1px;color:#1e2430}
.sub{font-size:15px;letter-spacing:3px;color:#8a8578;margin-top:8px}
.sect{font-size:26px;font-weight:800;color:#b4442a;margin:26px 0 10px;
  border-left:7px solid #b4442a;padding-left:12px}
table{width:100%;border-collapse:collapse}
td{font-size:27px;padding:11px 2px;border-bottom:1px dotted #cfcabc;color:#20252e}
td.p{text-align:right;font-weight:700;white-space:nowrap}
.foot{margin-top:30px;text-align:center;font-size:17px;color:#8a8578;
  border-top:1px solid #e0dccf;padding-top:16px}`,
};

/** 손글씨 화이트보드 — 오늘의 메뉴 (파싱 난이도가 다른 두 번째 예시) */
const board = {
  file: "sample-menu-board.png",
  w: 1020, h: 780,
  html: `
<div class="wb">
  <div class="ttl">오늘의 백반</div>
  <ul>
    <li><span>제육볶음 백반</span><b>8,000</b></li>
    <li><span>고등어구이 백반</span><b>9,000</b></li>
    <li><span>된장찌개 백반</span><b>7,000</b></li>
    <li><span>순두부찌개</span><b>7,500</b></li>
    <li><span>계란말이 추가</span><b>3,000</b></li>
  </ul>
  <div class="memo">＊ 11:30 ~ 14:00 학생 500원 할인</div>
</div>`,
  css: `
body{margin:0;background:#4a4f57;display:grid;place-items:center;padding:40px;
  font-family:"Malgun Gothic","맑은 고딕",sans-serif}
.wb{width:800px;background:#f7f9f8;border:14px solid #8d7350;border-radius:6px;
  padding:38px 46px;box-shadow:0 16px 44px rgba(0,0,0,.45)}
.ttl{font-size:46px;font-weight:800;color:#1d4ed8;text-align:center;
  padding-bottom:16px;border-bottom:4px double #1d4ed8;margin-bottom:22px}
ul{list-style:none;margin:0;padding:0}
li{display:flex;justify-content:space-between;gap:24px;font-size:31px;
  padding:13px 4px;color:#111827;border-bottom:1px solid #dfe3e6}
li b{color:#b91c1c}
.memo{margin-top:26px;font-size:20px;color:#4b5563;text-align:center}`,
};

const browser = await chromium.launch();
for (const s of [printed, board]) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${s.css}</style>${s.html}`);
  await page.waitForTimeout(300);   // 웹폰트 대신 시스템 폰트라 짧게면 충분
  const out = path.join(OUT, s.file);
  await page.screenshot({ path: out });
  console.log(`${out}  (${(fs.statSync(out).size / 1024).toFixed(0)}KB)`);
  await page.close();
}
await browser.close();
