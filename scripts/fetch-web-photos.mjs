#!/usr/bin/env node
/** 웹 수집 메뉴판 사진 다운로드 + 웹 전용 manifest 생성 (2026-07-20 데이터 확충)
 *  입력: 리서치 결과 JSON (경로 인자) — [{name,category,address,imageUrl,postUrl,postDate,accessDate}]
 *  산출: experiments/parse-poc/photos/web/<slug>.jpg + scripts/photo-manifest-web.json
 *  시트에는 아무것도 쓰지 않는다 (파싱 결과 승인 후 별도 적재).
 */
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) { console.error("사용법: node scripts/fetch-web-photos.mjs <result.json>"); process.exit(1); }
const items = JSON.parse(fs.readFileSync(src, "utf8"));
const dir = "experiments/parse-poc/photos/web";
fs.mkdirSync(dir, { recursive: true });

const slug = (name, i) => `web-${String(i + 1).padStart(2, "0")}-${name.replace(/[\s()]/g, "").slice(0, 12)}`;
const photos = [];
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  const file = path.join(dir, `${slug(it.name, i)}.jpg`);
  const res = await fetch(it.imageUrl, { headers: { referer: "https://blog.naver.com/", "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image")) {
    console.log(`실패: ${it.name} HTTP ${res.status} ${res.headers.get("content-type")}`);
    continue;
  }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`저장: ${file} (${kb}KB)`);
  photos.push({
    file: file.replace(/\\/g, "/"),
    name: it.name,
    category: it.category,
    address: it.address,
    tags: "",
    shotDate: it.postDate,          // 촬영일 대신 게시일 (웹수집)
    collector: "전유성(웹수집)",
    sourcePost: it.postUrl,          // 정직성: 원 게시물
    accessDate: it.accessDate,
  });
}
fs.writeFileSync("scripts/photo-manifest-web.json", JSON.stringify({
  comment: "웹수집 사진 manifest — 출처는 sourcePost. 시트 적재는 사용자 승인 후.",
  collector: "전유성(웹수집)",
  photos,
}, null, 2));
console.log(`\nmanifest: scripts/photo-manifest-web.json (${photos.length}건)`);
