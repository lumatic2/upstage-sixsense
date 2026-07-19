/** GET /api/config — 클라이언트 런타임 설정 (DR2 step-1)
 *  카카오맵 JS 키는 커밋 금지 관례에 따라 env 로만 보관하고 여기서 주입한다.
 *  (JS 키는 도메인 제한이 걸린 클라이언트 키 — 노출 자체는 설계상 허용) */
export default function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.status(200).json({ kakaoJsKey: process.env.KAKAO_JS_KEY ?? null });
}
