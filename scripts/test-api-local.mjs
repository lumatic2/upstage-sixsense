#!/usr/bin/env node
/** 로컬 API 하니스 — Vercel 함수(api/*.js)를 http 서버로 감싸 실제 요청을 쏜다 (M3 검증).
 *
 * 사용법:
 *   node scripts/test-api-local.mjs parse-menu <사진.jpg>     # 실사진 → 200 + items
 *   node scripts/test-api-local.mjs parse-menu-probes        # 실패 모드: no-key/비이미지/405
 *   node scripts/test-api-local.mjs parse-query "8천원 이하 혼밥"
 *   node scripts/test-api-local.mjs parse-query-probes       # 타임아웃 강제 → 정규식 폴백
 *
 * .env 의 UPSTAGE_API_KEY 를 읽는다 (커밋 금지 파일).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// .env 로드 (의존성 없이)
const envPath = path.join(import.meta.dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function shim(res) {
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (o) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(o));
  };
  return res;
}

async function startServer() {
  const routes = {};
  for (const name of ["parse-menu", "parse-query"]) {
    try {
      routes[`/api/${name}`] = (await import(`../api/${name}.js`)).default;
    } catch { /* 아직 없는 함수는 건너뜀 */ }
  }
  const server = http.createServer(async (req, res) => {
    const fn = routes[req.url.split("?")[0]];
    if (!fn) return shim(res).status(404).json({ error: "not found" });
    try {
      await fn(req, shim(res));
    } catch (e) {
      shim(res).status(500).json({ error: String(e) });
    }
  });
  await new Promise((ok) => server.listen(0, ok));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function post(base, route, payload, opts = {}) {
  const res = await fetch(base + route, {
    method: opts.method ?? "POST",
    headers: { "content-type": "application/json" },
    body: opts.method === "GET" ? undefined : JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const [mode, arg] = process.argv.slice(2);
const { server, base } = await startServer();
let failed = false;
const check = (label, cond, detail) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!cond) failed = true;
};

if (mode === "parse-menu") {
  const img = fs.readFileSync(arg).toString("base64");
  const t0 = Date.now();
  const { status, body } = await post(base, "/api/parse-menu", { image: img, filename: path.basename(arg) });
  check("HTTP 200", status === 200, `status=${status}`);
  check("items 배열 반환", Array.isArray(body.items), JSON.stringify(body).slice(0, 200));
  check("items > 0", (body.items ?? []).length > 0, `${body.items?.length}개, ${Date.now() - t0}ms`);
  console.log(JSON.stringify(body.items ?? body, null, 2));
} else if (mode === "parse-menu-probes") {
  const saved = process.env.UPSTAGE_API_KEY;
  delete process.env.UPSTAGE_API_KEY;
  const noKey = await post(base, "/api/parse-menu", { image: "aGVsbG8=" });
  check("키 없음 → 500 구조화 에러", noKey.status === 500 && noKey.body.code === "no_api_key", JSON.stringify(noKey.body));
  process.env.UPSTAGE_API_KEY = saved;
  const badType = await post(base, "/api/parse-menu", { image: Buffer.from("plain text not an image").toString("base64") });
  check("비이미지 → 400 bad_type", badType.status === 400 && badType.body.code === "bad_type", JSON.stringify(badType.body));
  const noImage = await post(base, "/api/parse-menu", {});
  check("image 누락 → 400", noImage.status === 400, JSON.stringify(noImage.body));
  const get = await post(base, "/api/parse-menu", null, { method: "GET" });
  check("GET → 405", get.status === 405, JSON.stringify(get.body));
} else if (mode === "parse-query") {
  const t0 = Date.now();
  const { status, body } = await post(base, "/api/parse-query", { query: arg });
  check("HTTP 200", status === 200, `status=${status}, ${Date.now() - t0}ms`);
  check("구조화 필드 존재", body && "budget" in body && "tags" in body, JSON.stringify(body));
  console.log(JSON.stringify(body, null, 2));
} else if (mode === "parse-query-probes") {
  process.env.SOLAR_TIMEOUT_MS = "1"; // 타임아웃 강제 → 폴백 경로
  const fb = await post(base, "/api/parse-query", { query: "8천원 이하 도보 5분 혼밥" });
  check("강제 타임아웃 → 200 (검색 불사)", fb.status === 200, `status=${fb.status}`);
  check("폴백 경로 표기", fb.body.source === "regex-fallback", JSON.stringify(fb.body));
  check("정규식이 예산 파싱", fb.body.budget === 8000, `budget=${fb.body.budget}`);
  delete process.env.SOLAR_TIMEOUT_MS;
  const noQ = await post(base, "/api/parse-query", {});
  check("query 누락 → 400", noQ.status === 400, JSON.stringify(noQ.body));
} else {
  console.error("사용법은 파일 상단 주석 참조");
  failed = true;
}

// Windows libuv: close 완료 전 exit 하면 async handle assertion 이 뜬다 — 콜백 대기 후 종료
process.exitCode = failed ? 1 : 0;
await new Promise((ok) => server.close(ok));
