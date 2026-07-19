#!/usr/bin/env node
/** Vercel 스테이징 배포 (M3 step-4) — REST API 경로 (CLI 는 한글 사용자명 이슈, deploy.md 관례).
 *
 *  사용법:
 *    node scripts/deploy-staging.mjs                # 배포 (VERCEL_TOKEN env 필요)
 *    node scripts/deploy-staging.mjs --set-env      # UPSTAGE_API_KEY(.env)를 프로젝트 env 로 등록 후 배포
 *  토큰·키는 절대 출력하지 않는다.
 */
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
  console.error("VERCEL_TOKEN 이 필요합니다 (Windows User env)");
  process.exit(1);
}
const PROJECT = "upstage-sixsense-staging";
const API = "https://api.vercel.com";
const headers = { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

async function api(method, url, body) {
  const res = await fetch(API + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, body: j };
}

// 1) 프로젝트 확보
let proj = await api("GET", `/v9/projects/${PROJECT}`);
if (proj.status === 404) {
  proj = await api("POST", "/v10/projects", { name: PROJECT, framework: null });
  console.log("프로젝트 생성:", proj.status);
}
if (proj.status >= 400) {
  console.error("프로젝트 확보 실패:", proj.status, proj.body?.error?.code);
  process.exit(1);
}

// 2) env 등록 (--set-env) — .env 의 등록 대상 키를 전부 upsert (값 비출력)
if (process.argv.includes("--set-env")) {
  const dotenv = fs.readFileSync(".env", "utf8");
  const KEYS = ["UPSTAGE_API_KEY", "KAKAO_JS_KEY"];
  for (const key of KEYS) {
    const val = dotenv.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();
    if (!val) { console.log(`env 스킵: ${key} (.env 에 없음)`); continue; }
    const r = await api("POST", `/v10/projects/${PROJECT}/env?upsert=true`, {
      key, value: val, type: "encrypted", target: ["production", "preview"],
    });
    console.log(`env 등록 ${key}:`, r.status, r.body?.error?.code ?? "ok");
  }
}

// 3) 파일 인라인 배포
const FILES = [
  "package.json",
  "vercel.json",
  "api/parse-menu.js",
  "api/parse-query.js",
  "api/data.js",
  "api/config.js",
  "api/recommend.js",
  "api/_lib/extract-menu.js",
  "api/_lib/sheet-data.js",
  "public/test.html",
  "public/index.html",
  "public/app.html",
  "public/about.html",
  "public/theme.css",
  "public/img/hero.jpg",
  "public/img/app-shot.png",
  "public/img/about-1.jpg",
  "public/img/about-2.jpg",
];
const files = FILES.map((f) => ({ file: f, data: fs.readFileSync(f, "base64"), encoding: "base64" }));
// 학식 fixture 를 정적으로 동봉 (Supabase 권한 전 대체 경로 — M3 결정 로그)
files.push({ file: "public/cafeteria-sample.json", data: fs.readFileSync("db/fixtures/cafeteria-sample.json", "base64"), encoding: "base64" });

const dep = await api("POST", `/v13/deployments`, {
  name: PROJECT,
  project: PROJECT,
  target: "production",
  files,
  projectSettings: { framework: null, outputDirectory: "public" },
});
if (dep.status >= 400) {
  console.error("배포 실패:", dep.status, JSON.stringify(dep.body?.error ?? {}).slice(0, 300));
  process.exit(1);
}
const id = dep.body.id;
console.log("배포 시작:", dep.body.url);

// 4) READY 폴링
for (let i = 0; i < 40; i++) {
  await new Promise((ok) => setTimeout(ok, 3000));
  const st = await api("GET", `/v13/deployments/${id}`);
  const state = st.body.readyState ?? st.body.state;
  if (state === "READY") {
    console.log(`READY: https://${st.body.url ?? dep.body.url}`);
    process.exit(0);
  }
  if (state === "ERROR" || state === "CANCELED") {
    console.error("배포 상태:", state);
    process.exit(1);
  }
  if (i % 5 === 4) console.log("  대기 중…", state);
}
console.error("READY 대기 타임아웃");
process.exit(1);
