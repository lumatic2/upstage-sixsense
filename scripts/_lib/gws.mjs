/** gws CLI 래퍼 — 구글 시트 읽기/쓰기 (로컬 OAuth, 서비스 계정 불요).
 *  JSON body 는 임시파일 경유로 넘겨 셸 인용 문제를 피한다. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function gwsSheets(paramsObj, bodyObj, resourcePath) {
  const tmp = path.join(os.tmpdir(), `gws-body-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmp, JSON.stringify(bodyObj ?? {}));
  const params = JSON.stringify(paramsObj).replace(/'/g, "'\\''");
  const cmd = bodyObj
    ? `gws sheets ${resourcePath} --params '${params}' --json "$(cat '${tmp.replace(/\\/g, "/")}')" --format json`
    : `gws sheets ${resourcePath} --params '${params}' --format json`;
  const r = spawnSync("bash", ["-lc", cmd], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  fs.rmSync(tmp, { force: true });
  if (r.status !== 0) throw new Error(`gws 실패: ${r.stderr || r.stdout}`);
  const jsonStart = r.stdout.indexOf("{");
  return jsonStart >= 0 ? JSON.parse(r.stdout.slice(jsonStart)) : {};
}

export const SPREADSHEET_ID = "1r_G6Z6FhlCQ_svQifrvQAWjlCyicOeB6UB4PPbboGTQ";
