#!/usr/bin/env node
/**
 * 구글 시트(팀 정본) → Supabase upsert 동기화 (DR1 step-4)
 *
 * 사용법: node scripts/sync-sheet-to-db.mjs [--dry-run]
 * 필요: .env 의 SUPABASE_URL + SUPABASE_SERVICE_KEY (팀 프로젝트 값 — 커밋·로그 노출 금지)
 * env 미설정이면 BLOCKED 로 종료(exit 2) — 서비스는 그동안 /api/data 의 시트 fallback 으로 동작.
 */
import fs from "node:fs";
import path from "node:path";
import { loadSheetData } from "../api/_lib/sheet-data.js";

const ROOT = path.join(import.meta.dirname, "..");
const DRY = process.argv.includes("--dry-run");

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadEnv();
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) {
  console.error("BLOCKED: SUPABASE_URL / SUPABASE_SERVICE_KEY 미설정 (.env) — env 도착 후 재실행");
  process.exit(2);
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey: KEY, authorization: `Bearer ${KEY}`,
      "content-type": "application/json", prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`supabase ${table} HTTP ${res.status}: ${await res.text()}`);
}

const { restaurants, menus, cafeteria } = await loadSheetData();
console.log(`시트 읽기: 식당 ${restaurants.length} · 메뉴 ${menus.length} · 학식 ${cafeteria.length}`);
if (DRY) process.exit(0);

await upsert("restaurants", restaurants.map((r) => ({
  id: r.id, name: r.name, category: r.category, address: r.address || null,
  lat: r.lat, lng: r.lng, tags: r.tags, status: r.status || null,
})), "id");
await upsert("menus", menus.map((m) => ({
  restaurant_id: m.restaurant_id, name: m.name, price: m.price, source: m.source || null,
})), "restaurant_id,name");
await upsert("cafeteria_menus", cafeteria.map((c) => ({
  cafeteria: c.cafeteria, corner: c.corner, menu_date: c.menu_date, items: c.items, price: c.price,
})), "cafeteria,menu_date,corner");
console.log("Supabase upsert 완료");
