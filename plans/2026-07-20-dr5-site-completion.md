# Plan — DR5 페이지 구조 완성 + 재방문 개인화

> Milestone: `ROADMAP.md` DR5 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon(`plans/horizons/demoday-run.md`) → **Milestone**(이 문서) → Step
> 근거: `docs/SITEMAP.md` §2·§5·§8 · `docs/PRD.md` · `DESIGN.md`(디자인 SSOT)
> 작성: 2026-07-20 · DR2 dogfood 에서 승격된 페이지 구조 설계의 2/2 (선행: DR4)

Status: approved
- Approved: 2026-07-20 사용자 — 위임 범위 A(DR4→DR5 horizon 연쇄), "전체 진행. 일정은 신경쓰지 마"
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 커밋 단위 revert. `test.html` 은 rename 이 아니라 **복사 후 신설**하고 원본은 남긴다(승격 실패 시 원복 경로 — DR2 plan 의 기존 약속 유지).

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 페이지 구조 = `docs/SITEMAP.md`. 디자인 토큰 = `DESIGN.md` → `public/theme.css`. 제품 정의 = `docs/PRD.md`.
- 검증: 실브라우저 구동(5페이지 nav 일관 + 개인화 재방문 시나리오) + `curl` 배포본 실측 + 콘솔 red 0 + 기존 Playwright smoke 재실행.
- 배포/운영: Vercel `upstage-sixsense-staging` → `sixsense.askewly.com` (Windows 머신 CLI 수동 배포).

**자기선언 도메인**
- 화면: `/app.html` 톤 정합 · `/about.html` `#upstage` 섹션 신설 · `/verify.html` 신설 · `/` 제보 CTA. 신규 디자인 토큰 발명 금지 — `theme.css` 기존 변수만.
- 서버: `/api/recommend` 에 `profile` 입력 추가(rerank). 신규 엔드포인트 없음.
- 데이터: 클라이언트 `localStorage: hanip.profile`. **서버는 사용자 데이터를 저장하지 않는다(무상태)** — 구현 편의이자 발표 서사.
- 외부연동: 없음(신규).
- 크레덴셜: 없음(신규).
- 검토 후 제외: 회원 인증(배점 0·anti-scope — 개인화 목적은 localStorage 로 달성) · 서버측 사용자 프로필 저장(프라이버시 서사 훼손 + 저장소 비용) · 협업 필터링(데이터량 미달·데모데이 이후) · A/B 계측(데모 규모 과설계).

## 범위와 중단점
- 이번 milestone 이 닫는 것: `docs/SITEMAP.md` §1 의 5페이지 공개 구조가 실제로 존재하고 톤이 일관되며, 재방문자에게 추천이 실제로 달라지는 것이 관측된다.
- 범위 밖: 제보·검수 루프(DR4) · 회원 인증 · 자연캠 확장.
- 중단점: DR4 step-3 미완이면 nav 의 제보 링크가 죽으므로 step-1 은 DR4 이후 · 3-strike · 새 사용자 소유 결정.

## Step 트리

- [ ] step-1 `about#upstage` 섹션 + 깨진 링크 해소 + 랜딩 제보 CTA
  - Artifact: Upstage 제품별 적용 지점 표(Document Parse / Solar solar-pro2 / solar-mini 판정자)와 "왜 여기에 이걸 썼는가" 섹션 + 랜딩 §5 제보 유도 1블록
  - Files: `public/about.html` (수정) · `public/index.html` (수정)
  - Dependencies: 없음
  - Verify: nav·푸터의 `Upstage AI` 링크가 실제 `#upstage` 섹션으로 스크롤되는 것을 실브라우저에서 확인
  - Failure probe: 다른 페이지(`/`·`/app.html`)에서 `about.html#upstage` 로 진입해도 앵커가 먹는지 확인(페이지 간 이동 + 해시)
  - Commit: `feat(DR5): about#upstage 섹션 신설·깨진 앵커 해소` 1커밋
- [ ] step-2 `/app.html` 톤 정합 + 빈 상태·배지 정리
  - Artifact: 랜딩과 같은 디자인 언어 적용 + 결과 0건 빈 상태 UI + Groundedness 배지 시각 정리 + 제보 유도
  - Files: `public/app.html` (수정) · `public/theme.css` (필요 시 최소 추가)
  - Dependencies: step-1
  - Verify: 실브라우저에서 검색 1회 구동 후 랜딩과 나란히 스크린샷 대조 + 콘솔 red 0
  - Failure probe: 예산을 극단값(1000원)으로 넣어 결과 0건일 때 빈 화면이 아니라 안내 + 대안 제시가 렌더되는지
  - Commit: `feat(DR5): 메뉴 찾기 화면 톤 정합·빈 상태 처리` 1커밋
- [ ] step-3 `/verify.html` 승격 (`test.html` 테마 적용)
  - Artifact: 기존 4블록 그대로 + `theme.css` 적용 + 푸터 링크 갱신. **기능 추가 없음**(개발용 성격이 오히려 정직한 증거)
  - Files: `public/verify.html` (신규 — `test.html` 복사 기반) · `public/index.html`·`about.html`·`app.html`·`contribute.html` (푸터 링크)
  - Dependencies: 없음
  - Verify: `/verify.html` 4블록이 실제로 API 를 때려 결과를 렌더하는 것 실브라우저 확인
  - Failure probe: API 하나가 실패해도 나머지 블록이 계속 동작하는지(한 블록 실패가 페이지 전체를 죽이지 않음)
  - Commit: `feat(DR5): 파이프라인 검증 페이지 승격 /verify.html` 1커밋
- [ ] step-4 재방문 개인화 (localStorage 프로필 + rerank)
  - Artifact: `hanip.profile` 저장·갱신 + `/api/recommend` rerank + 재방문 UI 노출("지난번 조건으로 다시 볼까요?"·"전에 고른 곳과 비슷해요") + 초기화 버튼
  - Files: `public/app.html` (수정) · `api/recommend.js` (수정) · `public/about.html` (한계 명시)
  - Dependencies: step-2
  - Verify: 실브라우저에서 검색·선택 후 새로고침 재방문 시 추천 순서가 실제로 달라지는 것 관측
  - Failure probe: **빈 프로필(첫 방문)·손상된 JSON 프로필에서 추천이 정상 동작하는지** — 프로필은 가점 신호일 뿐 필터가 아니므로 결과가 0건이 되면 안 됨
  - Commit: `feat(DR5): 재방문 개인화(localStorage 프로필 기반 rerank)` 1커밋
- [ ] step-5 사이트 통합 검증
  - Artifact: 5페이지 nav·푸터 일관성 확인 + 기존 Playwright smoke 재실행 + `verification/matrix.md` 갱신 + 스크린샷 baseline
  - Files: `verification/matrix.md` · `verification/screenshots/` · `scripts/demo-smoke.mjs` (필요 시 확장)
  - Dependencies: step-1~4
  - Verify: 배포 URL 에서 5페이지 전부 진입 가능 + 모든 nav/푸터 링크가 죽지 않음 + smoke PASS (= milestone DoD)
  - Failure probe: 의도적 결함 주입(존재하지 않는 링크 1개) 시 검증이 실제로 red 가 되는지 1회 확인(허수 테스트 방지)
  - Commit: `test(DR5): 사이트 구조 통합 검증` 1커밋

## 검증/DoD
- DoD: 배포 URL 에서 `docs/SITEMAP.md` §1 의 공개 5페이지가 전부 살아 있고 nav·푸터에 죽은 링크가 없으며, 재방문 시 추천이 실제로 달라지는 것이 관측된다. Playwright smoke PASS + `verification/matrix.md` 갱신.

## 결정 로그
- status: resolved
- 예상 결정: 아래가 전부 — 실행 중 새 사용자 소유 결정 없음
- 로그인: **구현하지 않는다** (2026-07-20 사용자 — "로그인 필요 없는 방법이 있다면 그걸로"). 목적이 인증이 아니라 재방문 개인화이므로 localStorage 로 달성.
- 개인화 저장 위치: 클라이언트 전용. 서버 무상태 유지 — 개인화하면서 개인정보를 서버에 안 쌓는다는 발표 서사로도 쓴다.
- 개인화 한계 고지: 기기·브라우저 변경 시 소멸·시크릿 모드 미동작을 `about` 에 명시한다(정직성 규칙).
- 헤더 로그인 버튼: 유지하되 문안을 "이력은 이 브라우저에만 저장됩니다"로 교체(제거 대신 유지 — 개인화가 로그인 없이 도는 이유를 설명하는 자리).
- `test.html`: rename 하지 않고 `/verify.html` 로 **복사 승격**, 원본 유지(DR2 plan 의 원복 경로 약속 보존).
- A~E 전부 이번 horizon 포함 (2026-07-20 사용자 확정).

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-20 plan 작성 (승인 대기). 설계 근거는 `docs/SITEMAP.md` §2·§5·§8.
