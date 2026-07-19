# Verification Matrix — 검증 증거 가시화 (DR2 step-4)

> 갱신: 2026-07-19 · 규약: 플레이북 Phase 5-6 "검증 증거의 가시화" — 각 행 = command / expected / observed / evidence.
> 발표·README 는 이 파일을 참조한다. 원시 로그가 아니라 요약 표면이 정본.

## 데이터 파이프라인 (DR1)

| # | command | expected | observed (2026-07-19) | evidence |
|---|---|---|---|---|
| 1 | `node scripts/batch-parse-to-sheet.mjs` | 사진→[식당]·[메뉴] 행 적재, 실패 사진 스킵 | 사진 7장→식당 5곳·메뉴 76행, 실패 0 | 시트 실측 + `plans/2026-07-19-dr1-data-pipeline.md` 진행 로그 |
| 2 | 위 재실행 (`--dry-run`) | 멱등 — 기존 식당 전부 skip | skip 5곳, 신규 0 | 실행 로그 |
| 3 | `node scripts/geocode-sheet.mjs` | 좌표 없는 행만 채움, 오매칭 좌표 기입 금지 | 5/5 좌표 채움 (카카오 미등록 1곳은 주소 확보 후 재실행으로 해소) | 시트 D~F 열 + 블로그 지도 좌표 대조(계략가 오차 <0.001°) |
| 4 | `node scripts/crawl-cafeteria.mjs --date 2026-07-20 --to-sheet` | 빈 식단(주말·미게시)은 크래시 없이 0건 | status=empty, 신규 0행, exit 0 | 실행 로그 |
| 5 | `curl /api/data` (배포 URL) | source=sheet, 실데이터 반환, 실패 시 빈 배열 200 | 식당5·메뉴76·학식4·좌표5/5 | `verification/screenshots/` + 이 파일 |

## 추천·Upstage 게이트 (DR2)

| # | command | expected | observed (2026-07-19) | evidence |
|---|---|---|---|---|
| 6 | `POST /api/recommend {budget:8000,tags:[혼밥]}` | Top3 + 실데이터 근거 이유 | picks 3, 이유 3건 solar 생성 | curl 실측 |
| 7 | 위에서 근거 판정 | solar 이유마다 grounded 판정, notGrounded→템플릿 교체 | 3/3 grounded (판정자=solar-mini, 생성과 분리) | curl 실측 + `docs/presentation/upstage-depth-memo.md` |
| 8 | 키 없는 환경에서 `/api/recommend` | Solar 불가 시 템플릿 이유로 폴백 (500 금지) | HTTP 200, reasonSource=template | 로컬 핸들러 실측 |
| 9 | `POST /api/recommend {walkMax:5}` (전 후보 초과) | 빈 결과 대신 가까운 순 완화 + walkRelaxed 플래그 | walkRelaxed=true, 3건 반환 | curl 실측 |
| 10 | `node scripts/demo-smoke.mjs` | 심사 시연 시나리오 전 항목 PASS, 콘솔 red 0 | (실행 결과를 아래 "smoke 기록"에 append) | `verification/screenshots/smoke-final.png` |

## 허수 테스트 방지 (의도적 결함 주입 — 플레이북 Phase 5-1)

| # | 주입 | expected | observed | 
|---|---|---|---|
| F1 | 예산 필터 역전(`<=`→`>=`) 후 smoke | "예산 칩 필터" 항목이 실제 FAIL | (아래 기록) |

## smoke 기록 (append-only)
- 2026-07-19 1차: SMOKE PASS (9/9) — 배포 URL, 콘솔 red 0. F1 결함 주입(필터 역전): 해당 항목 실제 FAIL(초과 20건) 확인 → 원복 후 재실행 PASS (9/9). 허수 아님 검증.

## smoke 기록 (추가)
- 2026-07-19 도메인: sixsense.askewly.com Vercel 등록·verified. KAKAO_JS_KEY env 등록 완료 — 카카오 콘솔 Web 플랫폼 도메인 등록(sixsense.askewly.com) 후 지도 활성 예정(현재 ERR_BLOCKED_BY_ORB, graceful 폴백 동작).
