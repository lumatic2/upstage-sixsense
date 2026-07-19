#!/usr/bin/env node
/** 메뉴판 사진 → 팀 드라이브 폴더 업로드 (시트 안내 탭 규칙: "수집자이름-식당이름.jpg").
 *  이미 같은 이름이 폴더에 있으면 스킵 (idempotent). 업로드한 파일의 드라이브 링크를 출력.
 *  사용법: node scripts/upload-photos-drive.mjs [--manifest scripts/photo-manifest.json]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FOLDER = "1iIl1bHbkBpqC1J-ks9yp98qjpvYroLZE"; // 시트 [안내] 탭의 공식 폴더
const mi = process.argv.indexOf("--manifest");
const manifestPath = mi >= 0 ? process.argv[mi + 1] : "scripts/photo-manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const gws = (args) => {
  const r = spawnSync("bash", ["-lc", args], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  const i = r.stdout.indexOf("{");
  return i >= 0 ? JSON.parse(r.stdout.slice(i)) : {};
};

const existing = gws(`gws drive files list --params '{"q":"\\"${FOLDER}\\" in parents and trashed=false","fields":"files(name)"}' --format json`);
const have = new Set((existing.files ?? []).map((f) => f.name));

// 같은 식당 여러 장 → -1, -2 접미
const counts = {};
let up = 0, skip = 0;
for (const ph of manifest.photos) {
  const collector = ph.collector ?? manifest.collector ?? "팀";
  counts[ph.name] = (counts[ph.name] ?? 0) + 1;
  const suffix = manifest.photos.filter((p) => p.name === ph.name).length > 1 ? `-${counts[ph.name]}` : "";
  const ext = path.extname(ph.file) || ".jpg";
  const drvName = `${collector}-${ph.name}${suffix}${ext}`;
  if (have.has(drvName)) { skip++; continue; }
  if (!fs.existsSync(ph.file)) { console.log(`없음: ${ph.file}`); continue; }
  const body = JSON.stringify({ name: drvName, parents: [FOLDER] }).replace(/'/g, "'\\''");
  const posix = ph.file.replace(/\\/g, "/");
  const created = gws(`gws drive files create --params '{"uploadType":"multipart","fields":"id"}' --json '${body}' --upload '${posix}'`);
  const link = created.id ? `https://drive.google.com/file/d/${created.id}/view` : "";
  console.log(`업로드: ${drvName}  ${link}`);
  ph.driveLink = link;
  up++;
}
console.log(`완료 — 업로드 ${up} · 스킵(기존) ${skip}`);
if (up > 0) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2)); // driveLink 를 manifest 에 기록
