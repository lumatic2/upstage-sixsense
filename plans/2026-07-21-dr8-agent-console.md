# Plan — DR8 메뉴 찾기 화면을 에이전트 콘솔로 + 히어로 카드 안정화

> Milestone: `ROADMAP.md` DR8 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon → **Milestone**(이 문서) → Step
> 근거: 사용자 지시 2026-07-21 (모바일 히어로 카드 깨짐 실측 + app.html 품질 격차)
> 작성: 2026-07-21 · demoday-run horizon 재개통(DR7 close 이후 사용자 신규 지시)

Status: approved
- Approved: 2026-07-21 사용자 — "진행" (step-1~4 연속)
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 커밋 단위 revert. `app.html` 은 재구성 전 상태를 커밋으로 남겨 되돌릴 수 있게 한다. 배포는 `node scripts/deploy-staging.mjs` 재실행으로 앞 커밋 복원.

## 왜 이 milestone 인가

**2026-07-23(목) 21:00 미팅이 실질 마감이고, 그 자리에서 열어 보여줄 화면은 `/app.html` 이다.**
그런데 지금 app.html 의 품질이 랜딩(`index.html`)의 데모 카드보다 낮다 — 정작 서비스를 보여주는 곳이
소개 페이지의 목업보다 못한 상태다.

또 모바일 랜딩 히어로가 깨져 있다. 실측(390px)으로 원인이 하나로 좁혀졌다:
**`@media (max-width:860px)` 블록이 `.demo-stage`·`.demo-chat` 기본 규칙보다 위에 있어서** 같은 명시도에
밀린다 → `.demo-stage` 가 `height:100%`(부모 auto) 로 **0px** 이 되어 카카오맵이 사라지고,
`.demo-chat` 이 `flex:1` 로 돌아가 **말풍선이 늘 때마다 카드가 세로로 자란다.**

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 디자인 토큰 = `DESIGN.md` → `public/theme.css`. 데이터 = 구글 시트(`/api/data`). 곁들임 판정 = `api/_lib/side-menu.js`.
- 검증: 실브라우저 데스크톱(1280) + 모바일(390) 구동 · `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` · 콘솔 red 0 · 레이아웃 수치는 `getBoundingClientRect`/`scrollHeight` 로 실측(눈대중 금지).
- 배포/운영: Vercel `upstage-sixsense-staging` → `sixsense.askewly.com`, `node scripts/deploy-staging.mjs`(파일 자동 수집).

**자기선언 도메인**
- 화면: `public/index.html`(헤더 CTA·통계 라벨·히어로 카드 CSS) · `public/app.html`(전면 재구성) · `public/about.html`·`public/contribute.html`(헤더 CTA 제거만).
- 레이아웃(사용자 확정 2026-07-21): app.html 상단에 **[좌 지도 / 우 에이전트 대화창]** 한 덩어리, 그 아래 대화 결과로 나온 추천 카드 → 전체 선택지. 랜딩 데모와 같은 구조.
- 서버: **신규 엔드포인트 없음.** 대화창은 기존 `/api/parse-query`(Solar 구조화) → `/api/recommend`(추천+이유+근거 판정)를 그대로 부른다.
- 상태: 대화 이력은 화면 세션 안에서만 유지(새로고침 시 초기화). 기존 `localStorage: hanip.profile` 개인화는 건드리지 않는다.
- 디자인: 신규 토큰 발명 금지 — `theme.css` 기존 변수만. 대화 말풍선은 랜딩의 `.cb` 계열 스타일 계약을 따른다.
- 크레덴셜: 없음(신규). `KAKAO_JS_KEY`·`UPSTAGE_API_KEY` 기등록.
- 검토 후 제외: 대화 이력 서버 저장(무상태 서사 훼손 — DR5 결정 승계) · 스트리밍 응답(SSE 신규 배선은 D-2 에 과함, 타이핑 연출로 대체) · 음성 입력 · 다중 턴 문맥 추론(한 턴 = 한 질의로 고정, 범위 폭발 방지).

**검토 후 제외(표준 도메인)**: 데이터 스키마 변경 없음 · 인증 없음 · 관측/계측 없음(데모 규모) · 외부 신규 연동 없음.

## 범위와 중단점
- 이번 milestone 이 닫는 것: 미팅에서 `/app.html` 을 열었을 때 **랜딩 데모와 같은 품질로 서비스가 실제로 동작하는 것**을 보여줄 수 있다. 모바일에서도 히어로·서비스 둘 다 안 깨진다.
- 범위 밖: 신규 API · 로그인 · 데이터 추가 · 자연캠 확장 · 발표 자료 재작성(DR6 에서 정합 완료).
- 중단점: 3-strike · 새 사용자 소유 결정 · Solar 응답이 구조적으로 불안정해 대화 UX 가 성립하지 않는 경우(그때 로컬 폴백 범위를 사용자와 재합의).

## Step 트리

- [ ] step-1 헤더 CTA 제거 + 통계 라벨 문구
  - Artifact: 전 페이지 헤더에서 `한입지도 열기` 버튼 제거 · 랜딩 통계 라벨 `수집한 식당`→`식당`, `파싱한 메뉴·가격`→`메뉴`, `오늘의 학식`→`학식`
  - Files: `public/index.html` · `public/about.html` · `public/contribute.html` (수정)
  - Dependencies: 없음
  - Verify: 배포본 5페이지 헤더에 `한입지도 열기` 문자열 0건(`curl | grep -c`), 랜딩 통계 3개 라벨이 새 문구로 렌더
  - Failure probe: 헤더 CTA 제거 후에도 nav 그리드가 무너지지 않는지 1280·390 양쪽에서 확인(`nav-side` 에 로그인 버튼만 남는다)
  - Commit: `style(DR8): 헤더 CTA 제거 + 통계 라벨 간결화`
- [ ] step-2 히어로 데모 카드 모바일 복구
  - Artifact: `@media (max-width:860px)` 블록을 `.demo-*` 기본 규칙 **아래로** 이동. 모바일에서 지도 영역이 실제 높이를 갖고, 대화창은 **고정 높이 안에서** 글이 채워지며 **스크롤바가 생기지 않는다**(넘치는 옛 말풍선은 위로 밀려 사라짐).
  - Files: `public/index.html` (수정)
  - Dependencies: 없음
  - Verify: 390px 실브라우저에서 `.demo-stage` 높이 > 0 이고 `#demoMap` 에 카카오 타일이 렌더 · 대화가 끝까지 재생되는 동안 `.demo` 높이가 **변하지 않음**(재생 전후 `getBoundingClientRect().height` 동일) · `demoChat.scrollHeight <= clientHeight`(스크롤바 없음)
  - Failure probe: 가장 긴 시나리오(추천 3건 + 제외 목록)를 강제 재생해도 카드가 안 자라고 스크롤바가 안 생기는지 확인
  - Commit: `fix(DR8): 모바일 히어로 데모 카드 — 지도 소실·카드 세로 팽창 수정`
- [ ] step-3 `/app.html` 에이전트 콘솔 재구성
  - Artifact: 상단 [좌 지도 / 우 대화창] 한 덩어리 + 하단 결과 영역. 대화창 입력 → `/api/parse-query` 구조화 → `/api/recommend` 호출 → 대화창에 진행 상황과 요약을 말풍선으로, **아래 결과 영역에 추천 카드(메뉴·가격·도보·이유·근거 검증 배지) + 전체 선택지**. 기존 자연어 입력칸은 대화창으로 흡수하고 예산 칩은 대화창 안 빠른 버튼으로 남긴다.
  - Files: `public/app.html` (재구성)
  - Dependencies: step-2 (같은 카드 레이아웃 계약을 재사용)
  - Verify: 배포본 실브라우저에서 "8천원 이하 혼밥" 입력 → 구조화 결과가 대화에 표시되고 아래 추천 카드 3장 + 근거 검증 배지가 렌더되는 전체 왕복 1회 관측(데스크톱·모바일 각 1회)
  - Failure probe: ① Solar 지연/실패 시 대화가 멈추지 않고 폴백 문구로 진행되는지 ② 결과 0건 조건(1,000원)에서 빈 상태가 뜨고 카드 영역이 깨지지 않는지
  - Commit: `feat(DR8): 메뉴 찾기 화면을 에이전트 콘솔로 재구성`
- [ ] step-4 통합 검증 + 회귀
  - Artifact: `verification/matrix.md` DR8 절 · 스크린샷(데스크톱·모바일 각 2장) · smoke 재실행
  - Files: `verification/matrix.md` · `verification/screenshots/dr8-*.png`
  - Dependencies: step-1~3
  - Verify: `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` PASS + 5페이지 콘솔 red 0 + 곁들임 규칙 회귀(1,000원 → 전 화면 0건) 재확인
  - Failure probe: smoke 가 app.html 구조 변경으로 셀렉터를 잃고 조용히 통과하지 않는지 — 셀렉터 1개를 일부러 깨뜨려 FAIL 하는 것을 확인
  - Commit: `test(DR8): 에이전트 콘솔 통합 검증`

## 검증/DoD
- DoD: 배포 URL 에서 ① 헤더에 `한입지도 열기` 0건·통계 라벨 3개 정정 ② 390px 히어로 카드에서 지도 렌더·카드 높이 불변·스크롤바 0 ③ `/app.html` 대화 입력 → 실 API 왕복 → 추천 카드+근거 배지 렌더가 데스크톱·모바일 각 1회 관측 ④ `demo-smoke` PASS, 콘솔 red 0.
- Evidence: `verification/matrix.md` DR8 절 + 스크린샷.

## 결정 로그
- status: resolved
- app.html 레이아웃: **랜딩 데모와 같은 구조** — 상단 [좌 지도 / 우 대화창], 아래 상세 카드. (2026-07-21 사용자 확정)
- 대화창 동작: **실제 API** — `/api/parse-query` + `/api/recommend`. 지연은 타이핑 연출로 덮는다. (2026-07-21 사용자 확정)
- 기존 검색 UI: **대화창으로 흡수, 예산 칩만 남긴다.** (2026-07-21 사용자 확정)
- 히어로 카드 규격: 여유 공간이 이미 있는 고정 높이 안에 글이 채워지고 **스크롤바 금지**. (2026-07-21 사용자 지시)
- 그 외: 없음.

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-21 plan 작성 (승인 대기) — 모바일 히어로 깨짐 원인은 실측으로 확정(미디어쿼리 소스 순서)
