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
- 2026-07-19 지도 활성: 카카오 콘솔 JS SDK 도메인 등록(sixsense.askewly.com·staging.vercel.app) — 브라우저 실측 kakao.maps 로드·타일 26·마커 렌더. 발견 결함: .map-empty[hidden] 이 display:flex 에 밀려 로딩 문구 잔존 → CSS 수정 + setBounds 로 결과 전체 뷰. 재배포 후 SMOKE 9/9 PASS.
- 2026-07-19 3페이지 전환: 랜딩(/) · 설명(/about.html) · 서비스(/app.html), theme.css 토큰 SSOT. sixsense.askewly.com 라이브. 실측: 랜딩 카운터(5·76·4) 실데이터, 서비스 지도 마커 5·추천 3·근거 배지 3/3, about 라이트·다크 성립. SMOKE 9/9 PASS.
- 2026-07-20 독립검증 지적 반영 (허수 검증 제거): smoke 에 Groundedness 배지·판정 assert 2건 추가. 이전 9/9 는 배지를 **전혀 검사하지 않아** 판정기가 죽어도 PASS 가 났다. 결함 주입(판정 문자열을 존재하지 않는 값으로 치환)에서 해당 항목 실제 FAIL(10/11) 확인 후 원복.
- 2026-07-20 프로덕션 결함 발견·수정: 배포 API 18회 실측 분포 `solar/grounded 14 · template/replaced 3 · template/None 1` — grounded=null 약 5%(생성 또는 판정 타임아웃). 원인은 상한 2.5s/2s 가 실측 왕복 2.3~3.5s 대비 빠듯. `SOLAR_TIMEOUT_MS 5000` · `SOLAR_JUDGE_TIMEOUT_MS 3500` 으로 상향 후 재측정 **20/20 에서 null 0건**(`solar/grounded 10 · template/replaced 10`). smoke 3연속 11/11 PASS.
  - 주: `template/replaced` 는 장애가 아니라 판정기가 notGrounded 를 내고 데이터 팩트로 교체한 **설계대로의 동작**이다. 배지가 "근거 미달 판정 → 데이터 팩트로 교체"로 뜨는 것이 정상 경로.
