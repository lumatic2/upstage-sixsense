/** GET /api/config — 클라이언트 런타임 설정 (DR2 step-1)
 *  카카오맵 JS 키는 커밋 금지 관례에 따라 env 로만 보관하고 여기서 주입한다.
 *  (JS 키는 도메인 제한이 걸린 클라이언트 키 — 노출 자체는 설계상 허용) */
export default function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.status(200).json({
    kakaoJsKey: process.env.KAKAO_JS_KEY ?? null,
    // 배선 확인용 — 값이 아니라 유무만 낸다. 제보 좌표 자동 채움이 살아 있는지를
    // 시트에 테스트 행을 남기지 않고 밖에서 확인할 방법이 필요했다(DR6 step-3).
    ready: {
      geocode: Boolean(process.env.KAKAO_REST_API_KEY),
      parse: Boolean(process.env.UPSTAGE_API_KEY),
      sheetWrite: Boolean(process.env.SHEET_WEBHOOK_URL && process.env.SHEET_WEBHOOK_TOKEN),
    },
  });
}
