# Plan — DR9 진짜 Solar 대화 + 지도 마커 카드 + 학식 정본화

> Milestone: `ROADMAP.md` DR9 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon → **Milestone**(이 문서) → Step
> 근거: 사용자 dogfood 지시 2026-07-21 (DR8 배포본 육안 확인 중 발견)
> 작성: 2026-07-21

Status: approved
- Approved: 2026-07-21 사용자 — "진행" (step-1~5 연속)
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 커밋 단위 revert. `/api/chat` 은 신규 파일이라 삭제만으로 원복되고, 대화창은 실패 시 기존 `parse-query` 경로로 떨어지도록 폴백을 남긴다.

## 왜 이 milestone 인가

DR8 에서 만든 콘솔을 사용자가 직접 열어보고 **"AI 에이전트랑 대화 가능한 거 맞음? 그냥 결정론적으로 보인다"** 고 지적했다. 맞는 지적이다 —
지금 대화창은 Solar 로 **조건만 추출**하고, 화면에 뜨는 문장은 전부 코드에 박힌 템플릿이다.
"에이전트와 대화한다"고 말하면서 실제로는 `if/else` 가 답하고 있었다.

대회 배점상 Upstage 활용은 20점이고, 심사위원이 가장 먼저 만질 표면이 이 대화창이다.
여기가 가짜면 나머지 주장도 같이 의심받는다.

함께 드러난 것들: 지도 마커가 눌러지지 않아 "뭐가 있나" 를 볼 방법이 목록뿐이고,
학식이 `패컬티 · 코너` 라는 실재하지 않는 이름으로 나오며 지난 날짜까지 섞여 나온다.

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 학식당 정본 명칭 = 학교 공식 페이지(아래 확정 표). 메뉴 데이터 = 구글 시트. 디자인 토큰 = `theme.css`.
- 검증: 실브라우저 1280·390 구동 + 대화 왕복 실측(네트워크 호출 확인) + `demo-smoke` + 콘솔 red 0.
- 배포/운영: Vercel `upstage-sixsense-staging` → `sixsense.askewly.com`.

**자기선언 도메인**
- 서버: **신규 엔드포인트 `/api/chat` 1개.** 대화 이력 + 데이터 요약을 받아 `solar-pro2` 구조화 출력으로 `{reply, conditions}` 를 한 번에 낸다(왕복 1회 — 대화용·조건용을 따로 부르면 지연이 두 배).
- 데이터: `api/_lib/cafeterias.js` 신설 — 인문사회과학캠퍼스 학식당 4곳의 정본 명칭·위치. 시트 스키마 변경 없음.
- 화면: `public/app.html` — 상단 문구 축소, 사이드 헤더 문구 교체, 첫 인사 교체, 마커 클릭 카드, 학식 당일 필터, 하단 전체 목록 제거, `dataNote` 제거.
- 크레덴셜: 없음(신규). `UPSTAGE_API_KEY` 기등록.
- 검토 후 제외: 대화 이력 서버 저장(무상태 유지) · 스트리밍 · 다중 턴 장기 기억(직전 N턴만 전달) · 자유 잡담(데이터 밖 질문은 "모른다"로 — 사용자 확정).

**학식당 정본 (출처: https://www.skku.edu/skku/campus/support/welfare_11.do · 접근 2026-07-21)**

| 정식 명칭 | 위치 | conspaceCd |
|---|---|---|
| 패컬티식당 | 600주년기념관 6층 | 10201030 |
| 은행골식당 | 600주년기념관 지하1층 | 10201031 |
| 법고을식당 | 법학관 지하2층 | 10201034 |
| 금잔디식당 | 경영관 지하2층 | 10201033 |

2026-07-21 실측: 패컬티식당만 중식 운영, 나머지 3곳 0건(방학 휴무).

## 범위와 중단점
- 이번 milestone 이 닫는 것: 대화창이 **실제로 Solar 가 답하고**, 지도에서 가게를 눌러 메뉴를 보고, 학식이 실재하는 이름으로 당일치만 나온다.
- 범위 밖: 신규 데이터 수집 · 로그인 · 발표 자료 · 자연캠.
- 중단점: Solar 대화 품질이 구조적으로 못 쓸 수준이면(환각·무응답 반복) 정지하고 폴백 범위를 재합의 · 3-strike · 새 사용자 결정.

## Step 트리

- [ ] step-1 `/api/chat` — 진짜 Solar 대화
  - Artifact: 신규 `api/chat.js`. 입력 `{message, history[], context}` → `solar-pro2` 구조화 출력 `{reply, conditions:{budget,walkMax,tags}, answerable}`. **전달한 데이터에만 근거**하도록 프롬프트 고정, 데이터 밖 질문은 모른다고 답하게 강제. 타임아웃 시 기존 `parse-query` 로 폴백.
  - Files: `api/chat.js`(신설) · `scripts/deploy-staging.mjs`(자동 수집이라 수정 불요)
  - Dependencies: 없음
  - Verify: `node scripts/test-api-local.mjs` 또는 직접 호출로 "8천원 이하 혼밥" · "여기 뭐 있어요?" · "파리 날씨 어때" 3종 질의에 각각 데이터 근거 응답 / 데이터 요약 응답 / 모른다 응답이 오는 것 확인
  - Failure probe: `UPSTAGE_API_KEY` 없는 상태에서 500 이 아니라 폴백 응답이 오는지 · 타임아웃 강제 시 대화가 끊기지 않는지
  - Commit: `feat(DR9): /api/chat — Solar 대화 엔드포인트`
- [ ] step-2 대화창을 `/api/chat` 에 연결 + 문구 교체
  - Artifact: `app.html` 대화가 `/api/chat` 을 부르고 **Solar 가 쓴 문장**을 말풍선에 띄운다. 사이드 헤더 `Upstage AI 에이전트`(랜딩 데모와 동일). 첫 인사 `오늘은 뭘 먹어 볼까요?` 계열. 상단 제목 블록은 가운데 `한입지도` 한 줄로 축소. `dataNote`(식당 24 · 메뉴 342 · 학식 4) 제거.
  - Files: `public/app.html`
  - Dependencies: step-1
  - Verify: 실브라우저에서 같은 질문을 두 번 물어 **문장이 달라지는 것**(템플릿이 아님)을 관측 + 네트워크 탭에 `/api/chat` 호출 확인
  - Failure probe: `/api/chat` 을 강제 차단해도 대화가 멈추지 않고 조건 검색은 계속되는지
  - Commit: `feat(DR9): 대화창을 실제 Solar 대화로 연결 + 문구 정리`
- [ ] step-3 지도 마커 클릭 카드
  - Artifact: 마커 클릭 → 그 식당 이름 + 메뉴·가격 카드가 지도 위에 뜨고, 다시 누르면 닫힌다. 열림/닫힘 애니메이션. 다른 마커를 누르면 이전 카드는 닫힌다.
  - Files: `public/app.html`
  - Dependencies: 없음
  - Verify: 실브라우저에서 마커 3개를 눌러 카드 등장 → 재클릭으로 소멸 → 다른 마커로 전환되는 것을 각각 관측(데스크톱·모바일)
  - Failure probe: 좌표가 없는 식당·메뉴가 0개인 식당에서 카드가 깨지지 않는지 · 카드가 지도 밖으로 잘리지 않는지
  - Commit: `feat(DR9): 지도 마커 클릭 시 메뉴 카드 토글`
- [ ] step-4 학식 정본화 + 하단 목록 제거
  - Artifact: `api/_lib/cafeterias.js` 신설(4곳 정본 명칭·위치). 학식 블록은 **검색 당일 것만**, 4곳을 전부 보여주되 데이터 없는 곳은 `휴무`. `패컬티 · 코너` 표기 소멸. 하단 `오늘의 선택지` 전체 목록 제거(지도 마커 카드로 대체 — 사용자 확정).
  - Files: `api/_lib/cafeterias.js`(신설) · `api/data.js` 또는 `api/_lib/sheet-data.js`(정본 명칭 매핑) · `public/app.html`
  - Dependencies: step-3(목록을 없애므로 마커 카드가 먼저 동작해야 함)
  - Verify: 배포본에서 학식 블록에 4곳이 정식 명칭으로 뜨고 오늘 날짜 외 행이 0건, 휴무 3곳 표시 확인
  - Failure probe: 오늘 데이터가 아예 없는 날(주말) 시뮬레이션에서 빈 화면이 아니라 "4곳 전부 휴무" 가 뜨는지
  - Commit: `feat(DR9): 학식 정본 명칭·당일 필터 + 하단 전체 목록 제거`
- [ ] step-5 통합 검증
  - Artifact: `verification/matrix.md` DR9 절 · 스크린샷 · smoke
  - Files: `verification/matrix.md` · `verification/screenshots/dr9-*.png`
  - Dependencies: step-1~4
  - Verify: `demo-smoke` PASS(하단 목록 제거로 셀렉터가 바뀌므로 **smoke 자체를 갱신**해야 할 수 있음 — 갱신하면 결함 주입으로 허수 아님을 재확인) + 7페이지 콘솔 red 0 + 곁들임 회귀
  - Failure probe: smoke 를 목록 제거에 맞춰 고친 뒤, 셀렉터 1개를 깨뜨려 FAIL 하는 것을 확인
  - Commit: `test(DR9): 통합 검증`

## 검증/DoD
- DoD: 배포 URL 에서 ① 같은 질문에 매번 다른 문장이 오고 `/api/chat` 호출이 관측된다 ② 마커 클릭으로 메뉴 카드가 열리고 닫힌다 ③ 학식이 정식 명칭 4곳·당일치만·휴무 표시로 나온다 ④ 하단 전체 목록이 없다 ⑤ smoke PASS·콘솔 red 0.
- Evidence: `verification/matrix.md` DR9 절 + 스크린샷.

## 결정 로그
- status: resolved
- 하단 전체 목록: **제거 — 지도 마커 카드로 대체.** (2026-07-21 사용자 확정)
- 대화 성격: **데이터에 매인 짧은 대화** — 데이터 밖 질문은 모른다고 답한다. (2026-07-21 사용자 확정)
- 학식당 명칭: 학교 공식 페이지에서 확인한 4곳 정본 사용, 미운영은 휴무 표시. (2026-07-21 사용자 지시 + 실측)
- 상단 제목: 가운데 `한입지도` 한 줄. (2026-07-21 사용자 지시)
- 사이드 헤더 문구: 랜딩 데모와 동일한 `Upstage AI 에이전트`. (2026-07-21 사용자 지시)
- 그 외: 없음.

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-21 plan 작성 (승인 대기) — 학식당 4곳 정본 명칭·오늘자 운영 여부 실측 완료
