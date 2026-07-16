# 20260717-parse-query-api

- Target: M3 step-2 (`docs/plans/2026-07-17-m3-pipeline.md`)
- Scope: `api/parse-query.js`(신규) — Solar 질의 구조화 + 정규식 폴백(hanipmap app.js parseBudget/parseWalkMax 이식). 효과: "과선배가 사는 날 2만원 둘이" → `{budget:10000, tags:["격식"]}` 수준의 상황 해석, 외부 장애에도 검색 불사.
- Contract: 키 UPSTAGE_API_KEY 서버 전용·키 부재/업스트림 에러/타임아웃 전부 폴백 200. 응답 `source` 필드로 경로 표기.
- 실측 확정 사항 (TRD 스펙 조정 2건 — 이식 시 TRD 에 반영할 것):
  1. **모델 = solar-pro2** (초안 미정 → mini 는 인원 나눗셈 실패·예산 환각("해장"→1만원 날조) 관측, pro2 는 0.7~1.3s 로 전량 정답)
  2. **타임아웃 기본 2.5s** (TRD 초안 2s → 구조화 출력 실측 여유 반영, env SOLAR_TIMEOUT_MS 로 조정 가능)
  3. ⚠ Upstage json_schema 는 nullable union 미지원(500) — `-1` sentinel 로 우회 (재발 방지 주석)
- Verification:
  - [x] targeted test: 실질의 3종 → source:"solar", budget/walkMax/tags 전부 의도값 (777/792/741ms)
  - [x] failure probes: SOLAR_TIMEOUT_MS=1 강제 → regex-fallback 200 + budget 8000 / query 누락 400
  - [x] dirty-tree: 변경 파일 Scope 일치
- Status: done (2026-07-17)
