/** POST /api/parse-menu — 메뉴판 사진(base64) → Upstage Document Parse → {name, price}[] 후보.
 *  자동 저장하지 않는다: 후보 반환만 — 클라이언트가 제보 폼에 프리필하고 사용자가 수정 후 제출.
 *  (TRD §5.9 · M2 실측 76.4% — 사용자 수정 전제. 키는 서버 전용 UPSTAGE_API_KEY.)
 *  요청: { image: "<base64 | dataURL>", filename?: "menu.jpg" }  (jpeg/png/webp, ≤8MB)
 *  응답: 200 { items: [{name, price}], elements } | 4xx/5xx { error, code }
 */
import { extractMenu } from "./_lib/extract-menu.js";

const API_URL = "https://api.upstage.ai/v1/document-digitization";
const MAX_BYTES = 8 * 1024 * 1024;
const MAGIC = [
  [0xff, 0xd8, 0xff],             // jpeg
  [0x89, 0x50, 0x4e, 0x47],       // png
  [0x52, 0x49, 0x46, 0x46],       // webp (riff)
];

async function readJsonBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only", code: "method_not_allowed" });
  }
  const apiKey = process.env.UPSTAGE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "server misconfigured", code: "no_api_key" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "invalid JSON body", code: "bad_json" });
  }
  if (!body?.image || typeof body.image !== "string") {
    return res.status(400).json({ error: "image (base64) required", code: "no_image" });
  }

  let buf;
  try {
    buf = Buffer.from(body.image.replace(/^data:[^;]+;base64,/, ""), "base64");
  } catch {
    buf = null;
  }
  if (!buf || buf.length === 0) {
    return res.status(400).json({ error: "image is not valid base64", code: "bad_base64" });
  }
  if (buf.length > MAX_BYTES) {
    return res.status(400).json({ error: "image too large (max 8MB)", code: "too_large" });
  }
  if (!MAGIC.some((sig) => sig.every((b, i) => buf[i] === b))) {
    return res.status(400).json({ error: "unsupported file type (jpeg/png/webp)", code: "bad_type" });
  }

  const form = new FormData();
  form.append("model", "document-parse");
  form.append("ocr", "force");            // 사진 원본 — OCR 강제 (스캔 아님)
  form.append("coordinates", "true");     // 요소 좌표 보존 — 메뉴명·가격 짝짓기 검증 근거
  form.append("output_formats", '["html"]');
  form.append("document", new Blob([buf]), body.filename || "menu.jpg");

  let up;
  try {
    up = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    const code = e?.name === "TimeoutError" ? "upstream_timeout" : "upstream_unreachable";
    return res.status(504).json({ error: "document parse unavailable", code });
  }
  if (!up.ok) {
    // 업스트림 에러 원문(키 힌트 포함 가능)은 노출하지 않는다 — 상태코드만 전달
    return res.status(502).json({ error: "document parse failed", code: `upstream_${up.status}` });
  }

  const json = await up.json();
  const items = extractMenu(json.content?.html ?? "");
  return res.status(200).json({ items, elements: json.elements?.length ?? 0 });
}
