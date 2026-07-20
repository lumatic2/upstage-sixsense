/** 시트 쓰기 프록시 (DR4 step-1) — Apps Script 웹훅 호출을 한 곳에 모은다.
 *  읽기는 공개 gviz CSV(`sheet-data.js`)로 충분하지만, 쓰기는 권한이 필요해 이 경로를 쓴다.
 *  토큰은 서버 함수에서만 읽는다 — 클라이언트에 절대 내보내지 않는다.
 *  배포 절차는 `scripts/apps-script/sheet-webhook.gs` 헤더 주석 참조.
 */

// Apps Script 는 warm 일 때 실측 3.2~3.7s 인데 cold start 에서 10s 를 넘겨 한 번 끊겼다(2026-07-20).
// 검수 화면은 운영진 전용이라 지연에 관대하므로, 재시도로 복잡도를 올리지 않고 상한만 넉넉히 둔다.
const TIMEOUT_MS = 20_000;

function config() {
  const url = process.env.SHEET_WEBHOOK_URL;
  const token = process.env.SHEET_WEBHOOK_TOKEN;
  if (!url || !token) throw new Error("sheet webhook not configured");
  return { url, token };
}

/** 웹훅이 설정돼 있는지 — 호출부가 500 대신 정직한 안내를 띄우도록 판별용. */
export function sheetWriteReady() {
  return Boolean(process.env.SHEET_WEBHOOK_URL && process.env.SHEET_WEBHOOK_TOKEN);
}

async function call(payload) {
  const { url, token } = config();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Apps Script /exec 는 302 로 googleusercontent 로 넘긴다 — fetch 기본 follow 로 처리됨
    body: JSON.stringify({ ...payload, token }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`sheet webhook HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`sheet webhook: ${data.error}`);
  return data;
}

/** 검수 상태로 걸러 행을 읽는다. 행 번호는 시트가 직접 준 값이라 update 에 그대로 쓸 수 있다. */
export async function listRows(sheet, status = null) {
  const { rows } = await call({ action: "list", sheet, status });
  return rows; // { header: string[], items: [{ row, values }] }
}

export async function appendRows(sheet, rows) {
  const { appended } = await call({ action: "append", sheet, rows });
  return appended;
}

/** 제보 사진을 드라이브에 저장하고 파일 id 를 돌려준다.
 *  dataUrl 은 `data:image/jpeg;base64,...` 형식(브라우저에서 축소한 사본). */
export async function savePhoto(dataUrl, name) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(dataUrl ?? ""));
  if (!m) throw new Error("bad photo data url");
  const { fileId } = await call({ action: "photo", name, mimeType: m[1], dataBase64: m[2] });
  return fileId;
}

/** updates: [{ row, col, value }] — 1-based. 행 삭제 경로는 없다(팀 데이터 파괴 금지). */
export async function updateCells(sheet, updates) {
  const { updated } = await call({ action: "update", sheet, updates });
  return updated;
}
