#!/usr/bin/env node
/**
 * 웹수집 파싱 캐시 폴리싱 (사용자 승인 2026-07-20 — "띄어쓰기·비메뉴·광고 문구·설명 정리해서 적재")
 *
 * 규칙 (experiments/parse-poc/web-*.menu.json 을 제자리 정제, git diff 로 추적 가능):
 *  이름: OCR 한글자 분리 결합 · ★/강력추천/할인 등 광고 문구 제거 · 한/영 병기 시 영문 제거
 *       · 설명문 절단(파스타/스테이크 등 요리어 뒤 설명) · 따옴표·괄호 잔해 정리
 *  행 제거: ~추가(옵션) · 1,000원 미만(토핑·옵션) · 이름이 깨진 행(\\, 문자 2자 미만)
 *          · 안내 문구(런치메뉴는…, Lunch Menu…)
 */
import fs from "node:fs";

const KOREAN = /[가-힣]/;
const DISH = /(파스타|스테이크|리조또|피자|샐러드|그라탕|덮밥|정식)/;

function cleanName(raw) {
  let n = String(raw).trim();
  n = n.replace(/^인분\s*\d+g\s*\/\s*2인부터\)\s*/, "");      // 앞 행에서 흘러온 분량 표기
  n = n.replace(/[★☆]/g, "");
  n = n.replace(/(주인장)?\s*강력\s*추천|할인\s*/g, "");
  n = n.replace(/\\/g, "");
  if (KOREAN.test(n)) {
    // 병기 영문 제거 — 토큰 단위: 숫자·한글이 든 토큰은 보존(250g, (3pc), 오!미자), 순수 영문 토큰만 제거
    n = n.split(/\s+/).filter((tok) => !(/^[A-Za-z.&/+'()!?-]+$/.test(tok))).join(" ");
    // 한글+영문 혼합 토큰의 꼬리 영문 대문자 블록 제거 ("우아한MIX"→"우아한")
    n = n.replace(/([가-힣])[A-Z]{2,}$/g, "$1").replace(/([가-힣])[A-Z]{2,}(\s)/g, "$1$2");
  }
  n = n.replace(/\s*[₩]\s*$/, ""); // 꼬리 통화기호 잔해
  // 요리어 + 뒤따르는 설명문 절단 ("~ 파스타 바지락, 가리비로 …" → "~ 파스타")
  const m = n.match(DISH);
  if (m && n.length > m.index + m[0].length + 4) n = n.slice(0, m.index + m[0].length);
  n = n.replace(/\(\s*\)/g, "").replace(/\(\s*$/, "");
  const t = n.trim().split(/\s+/);
  if (t.length > 1 && t.every((x) => [...x].length === 1)) n = t.join(""); // "소 주"→"소주"
  n = n.replace(/^['"'']+|['"'']+$/g, "").replace(/\s*'\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  return n;
}

const dropWhy = (name, price) => {
  if (!/[가-힣A-Za-z]/.test(name) || [...name].length < 2) return "이름 깨짐";
  if (/추가$/.test(name)) return "옵션(추가)";
  if (price < 1000) return "1,000원 미만(토핑·옵션)";
  if (/^(런치메뉴는|Lunch\s*Menu)/i.test(name)) return "안내 문구";
  return null;
};

let kept = 0, dropped = 0, renamed = 0;
for (const f of fs.readdirSync("experiments/parse-poc").filter((x) => x.startsWith("web-") && x.endsWith(".menu.json"))) {
  const p = `experiments/parse-poc/${f}`;
  const items = JSON.parse(fs.readFileSync(p, "utf8"));
  const out = [];
  for (const it of items) {
    const name = cleanName(it.name);
    const why = dropWhy(name, it.price);
    if (why) { dropped++; console.log(`  삭제 [${why}] ${String(it.name).slice(0, 36)} · ${it.price}`); continue; }
    if (name !== it.name) { renamed++; console.log(`  정제 "${String(it.name).slice(0, 34)}" → "${name}"`); }
    out.push({ ...it, name });
    kept++;
  }
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
}
console.log(`\n완료 — 유지 ${kept} · 정제 ${renamed} · 삭제 ${dropped}`);
