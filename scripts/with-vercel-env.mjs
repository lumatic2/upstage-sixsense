#!/usr/bin/env node
/** 배포 env 를 빌려 로컬 스크립트를 실행한다 (DR6 step-1)
 *
 *  시트 쓰기 자격(`SHEET_WEBHOOK_*`)은 Vercel 프로젝트 env 에만 있고 로컬 `.env` 에는 없다.
 *  같은 값을 로컬 파일로 복제하면 시크릿 사본이 하나 더 생기므로, 실행 시점에만 빌려
 *  자식 프로세스 환경으로 넘긴다 — 디스크에 남기지 않고 출력하지도 않는다.
 *
 *  사용: node scripts/with-vercel-env.mjs <스크립트> [인자...]
 *  필요: VERCEL_TOKEN (Windows User env)
 */
import { spawnSync } from "node:child_process";

const PROJECT_ID = "prj_CZmUOYtFscEeKCBcAdm8VA2tnCX9"; // upstage-sixsense-staging
const token = process.env.VERCEL_TOKEN;
if (!token) { console.error("VERCEL_TOKEN 이 필요합니다 (Windows User env)"); process.exit(1); }

const argv = process.argv.slice(2);
if (!argv.length) { console.error("사용: node scripts/with-vercel-env.mjs <스크립트> [인자...]"); process.exit(1); }

const api = async (path) => {
  const r = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Vercel API ${path} HTTP ${r.status}`);
  return r.json();
};

// 목록 API 는 `decrypt=true` 를 줘도 encrypted 타입 값을 암호문으로 돌려준다.
// 평문은 개별 env 조회로만 온다.
const { envs = [] } = await api("/env");
const env = { ...process.env };
const loaded = [];
for (const e of envs) {
  const one = await api(`/env/${e.id}`);
  const value = one?.value;
  // 암호문이 그대로 오면 그걸 환경변수로 넘기지 않는다 — 하위 스크립트가
  // 암호문을 URL 로 쓰려다 죽는 실패(2026-07-20)를 여기서 막는다.
  if (typeof value !== "string" || !value || value.startsWith("eyJ2Ijoi")) continue;
  env[e.key] = value;
  loaded.push(e.key);
}
if (!loaded.length) { console.error("복호화된 env 를 하나도 못 읽었습니다 — 토큰 권한 확인"); process.exit(1); }
console.log(`배포 env ${loaded.length}개 로드 (${loaded.join(", ")}) — 값은 출력하지 않음`);

const r = spawnSync(process.execPath, argv, { stdio: "inherit", env });
process.exit(r.status ?? 1);
