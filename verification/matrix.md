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

## 제보 검수 루프 (DR4)

| # | command | expected | observed (2026-07-20) | evidence |
|---|---|---|---|---|
| 11 | Apps Script 웹훅 append/update/list | 시트에 반영 | append 1행 생성(행192)→update 반영→삭제 정리 확인 | node 모듈 실측 |
| 12 | 웹훅에 토큰 없이/틀린 토큰 POST | unauthorized, 시트 미기록 | `{"error":"unauthorized"}` + R998 행 미생성 | curl 실측 |
| 13 | `GET /api/review` 토큰 없이·틀린 토큰 | 401 | 401 / 401 | curl 실측 |
| 14 | `/review.html` 실브라우저 검수 | 대기 행 + 사진 대조 렌더 | 대기 188건·식당 13곳·의심표시 21건, 드라이브 사진 preview 로드 | 실브라우저 |
| 15 | 검수 화면에서 수정+확인 후 저장 | 시트 메뉴명·가격·검수 반영 | 행171/172/180 → 마라탕·마라샹궈·마라반 복원, 가격 number 유지, 검수=확인 | 실브라우저 → 시트 실측 |
| 16 | 편집 불가 열(출처)·임의 검수값·가격 범위밖 | 400 거부, 시트 불변 | `col not editable` / `review value` / `price range` 3건 모두 400, 행171 불변 | curl 실측 |

- 실물 대조로 드러난 것: `100g/` 파편 3건은 쓰레기가 아니라 **마라탕(100g/2,000)·마라반(100g/2,300)·마라샹궈(100g/3,300)의 이름이 날아간 것**이었다. 확인/제외만으로는 정보가 사라지므로 검수 화면에 수정 기능을 추가했다(설계 결함 시정).

## 제보 페이지 (DR4 step-3)

| # | command | expected | observed (2026-07-20) | evidence |
|---|---|---|---|---|
| 17 | `/contribute.html` 에 실사진 업로드 | Document Parse 결과가 읽기 전용으로 렌더 | 둘리분식 사진 → 26건 파싱·표 렌더 | 실브라우저 |
| 18 | 식당명 입력 후 접수 | 시트에 `검수=대기`·`출처=제보` append | [식당] R014 생성 + [메뉴] 26행 전부 대기/제보 | 실브라우저 → 시트 실측 |
| 19 | 접수분을 검수 화면에서 제외 | 대기에서 사라지고 제외로 | 26건 제외, 대기 잔여 0 | API 실측 |

- 발견·수정한 결함: 파싱이 끝나도 "복원하는 중" 스피너가 남았다. `display:flex` 가 `[hidden]` 을 덮는 문제로, DR2 의 `.map-empty[hidden]` 과 같은 유형. `public/` 전 페이지 전수 점검했고 다른 사례 없음.
- 발견한 노이즈 사례: 간판 문구 "Since 1989" 가 `1,989원` 메뉴로 파싱됨 → 검수 화면의 "가격 자릿수 오탐 의심" 규칙에 걸린다(설계대로).
- **미해결(secret_required)**: `KAKAO_REST_API_KEY` 가 Vercel·로컬·m4·windows 어디에도 없어 제보 시 좌표 자동 채움이 동작하지 않는다. 설계상 best-effort라 제보 자체는 정상 접수되지만, 좌표가 없으면 그 식당은 지도에 안 뜨고 도보 시간이 안 나온다. 키를 받으면 env 등록만으로 해소된다.

## 승인 게이트 (DR4 step-4)

| # | command | expected | observed (2026-07-20) | evidence |
|---|---|---|---|---|
| 20 | 189행 사진 대조 검수 (식당 13곳 전부) | 각 행이 사진 근거로 판정됨 | 확인 142 · 수정 37 · 제외 2 · 보류 4 | 사진 원본 ↔ 행 대조 |
| 21 | `loadSheetData` 게이트 ON | `검수=확인` 행만 통과 | 182행/13곳 통과, 대기·제외 누수 0 | 로컬 + 배포 `/api/data` 실측 |
| 22 | 배포본에 파편 잔존 여부 | `100g/`·`인기준`·`보고기도함)` 0건 | 0건, 수정본(마라탕·현대고량주 등) 노출 확인 | curl 실측 |
| 23 | 검수 통과 0건 상황 (예산 1원) | 크래시 없이 빈 결과 200 | 200 · picks 0 · 크래시 없음 | 로컬 핸들러 실측 |
| 24 | 게이트 적용 후 전체 smoke | 전 항목 PASS | 11/11 PASS | `node scripts/demo-smoke.mjs` |

### 검수에서 드러난 파싱 오류 유형 (발표 재료)
1. **설명 카피 병합** — 메뉴명 아래 한 줄 설명이 메뉴명에 붙는다. 유캔하이 하이볼 6/6, 노말키친 2건, 해피니스 다수.
2. **강조 라벨·단위 파편만 남고 메뉴명 소실** — `100g/`(→마라탕·마라반·마라샹궈), `소[125ml]`(→현대고량주 소), `인기준`(→점심특선 SET), `보고기도함)`(→마라탕(고기포함)), `초 테라`(→테라).
3. **섹션 헤더가 메뉴명에 병합** — `볶음밥 김치햄볶음밥`(→김치햄볶음밥).
4. **간판·부제 문구를 메뉴로 오인식** — "Since 1989"→1,989원, "200g 생고기 기준"→삼겹살 3,000원.
- 즉 M2 정확도 76.4%의 실패분은 **무작위가 아니라 유형화된다.** 사람 검수 단계가 왜 파이프라인의 일부인지에 대한 실증이며, 동시에 후속 파서 개선의 지도다.

## DR4 step-5 — 제보→검수→노출 E2E (2026-07-20, 배포본 실측)

E2E 대상: `experiments/parse-poc/photos/web/web-10-파스타마켓혜화본점.jpg`
(시트에 없던 13곳 외 식당 — 테스트용 가짜 데이터가 아니라 실제 신규 제보)

| # | 관측 | 결과 |
|---|---|---|
| 25 | `/contribute.html` 업로드 → Document Parse 응답 | 1건 추출 (`스파이시 로제 링귀니 / 1,500원`) |
| 26 | 사진 원본 대조 (정답) | `스파이시 로제 링귀니 1.5인분 22,000` · `게살 관자 로제 스파게티 19,000` · `매운 토마토 스파게티 13,900` |
| 27 | 파싱 실패 유형 | "1.5인분"의 **1.5를 가격 1,500으로 오인** + 나머지 2건 누락 (태블릿 주문화면 = 카드 레이아웃, 표 아님) |
| 28 | 접수 → 시트 | `[메뉴]` 218행 · R014 · 출처=제보 · **검수=대기** |
| 29 | 게이트 (대기 상태) | `/api/data` 메뉴 182 유지 · R014 메뉴 노출 **0건** — 미검수 데이터 안 나감 |
| 30 | `/review.html` 대기 목록 | 6건 중 R014 표시됨 |
| 31 | **결함 발견 ①** | 제보 사진이 어디에도 저장되지 않아 검수 화면이 "등록된 메뉴판 사진 링크가 없습니다 — 건너뛰세요" 표시. **제보 경로 데이터는 대조 근거가 없어 승인 불가** |
| 32 | **결함 발견 ②** | 마지막 식당 카드의 행이 sticky `th` 뒤에 깔려 확인/제외 버튼이 클릭 불가(더 스크롤할 여백 없음) |
| 33 | **결함 발견 ③** | 승인 게이트가 `[메뉴]`에만 걸려 있어, 승인 0건인 제보 식당이 `[식당]` 목록에 노출됨 (식당 13 → 14) |

### 조치
- ① `sheet-webhook.gs` 에 `photo` 액션(드라이브 저장) + `api/contribute.js` 가 사진링크를 `[식당]`에 기록. **드라이브 스코프 승인 대기 중 — 사용자 1클릭 필요**
- ② `public/review.html` `th` sticky 제거 (실측 재현 후 수정)
- ③ `api/_lib/sheet-data.js` — 승인 메뉴가 1건도 없는 식당은 서비스에서 제외. 로컬 실측 식당 14 → 13, R014 미노출

### 파싱 실패 유형에 추가 (발표 재료)
⑤ **주문 태블릿 화면** — 메뉴가 표가 아니라 카드 그리드라 항목 대부분 누락되고, 용량 표기("1.5인분")가 가격으로 오인식된다. 지금까지의 ①~④(인쇄 메뉴판)와 다른 레이아웃 계열.
