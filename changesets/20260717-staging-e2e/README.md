# 20260717-staging-e2e

- Target: M3 step-4 (`docs/plans/2026-07-17-m3-pipeline.md`)
- Scope: `public/test.html`(무스타일 E2E 검증 페이지) + `vercel.json` + `scripts/deploy-staging.mjs`(REST 배포 스크립트) + E2E 증거 `docs/research/2026-07-17-m3-e2e.md`(+스크린샷). 효과: 파이프라인 3종이 배포 URL 에서 end-to-end 로 도는 것을 실브라우저로 증명.
- Contract: 스테이징 = upstage-sixsense-staging.vercel.app (사용자 Vercel). 본배포는 hanipmap 이식 후 그쪽 소유. 토큰/키 비출력·비커밋.
- Verification:
  - [x] deploy: REST 배포 2회(무 env → env) READY, 안정 alias 확보
  - [x] E2E 실브라우저: 사진→프리필 12개→수정→pending 페이로드 / 질의→solar 구조화 / 학식 fixture 노출 — 3종 PASS (스크린샷 보존)
  - [x] failure probe: 키 미설정 배포 → 500 no_api_key (노출·크래시 없음)
- Status: done (2026-07-17)
