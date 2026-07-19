# Plan — DR2 개인 버전 웹서비스 빌드

> Milestone: `ROADMAP.md` DR2 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 근거: `research/2026-07-19-demoday-run-upstage-depth.md` · `research/2026-07-19-demoday-run-market-differentiation.md` · `docs/PRD.md` · ADR-0001
> 플레이북 정합: 개인 슬롯 Phase 4(이 plan = 킥오프 계약)→Phase 5(구현·검증 루프)→Phase 6(dogfood) (`docs/playbook/AI_공모전_플레이북.md`)
> 작성: 2026-07-19 · demoday-run horizon 일괄 계획 2/3

Status: pending-approval
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 커밋 단위 revert. 기존 `public/test.html` 검증 페이지는 유지(승격 실패 시 원복 경로). 시크릿 env 만.

## 스캐폴딩 결정
- source-of-truth: 제품 정의 = `docs/PRD.md` · 데이터 = DR1 의 Supabase 경로 · 코드 = 이 레포(베이스 확정: 이 레포 확장)
- 검증: Playwright 심사 시연 시나리오 smoke 1개(critical-path = 시연 그대로) + 핵심 화면 스크린샷 baseline + `verification/matrix.md` 가시화 + devtools 콘솔 red 0 육안(플레이북 Phase 5-5)
- 배포/운영: Vercel `upstage-sixsense-staging` 프로젝트를 실서비스 UI 로 승격 재배포. `UPSTAGE_API_KEY` 서버 함수 전용(클라이언트 노출 금지)
- 화면: 지도 + 예산·조건 입력 + 추천 결과·이유 카드 + 제보 폼 (≤5 화면, PRD 준수)
- 서버: 기존 `api/parse-menu`·`api/parse-query` + 추천 로직(예산 필터+거리+이유 생성) + Groundedness Check 경로
- 디자인: askewly design system 확정 — 구현 시 /askewly-design 스킬 게이트(진입 프로토콜·스크린샷 증거) 준수
- 외부연동: Naver Maps JS · Upstage(Solar solar-pro2·Document Parse·Groundedness Check)
- 검토 후 제외: 데이터 스키마(DR1 소관) · 관측 도구화(데모 규모 — 콘솔 육안으로 갈음) · 인증/로그인(anti-scope)

## 범위와 중단점
- 이번 milestone 이 닫는 것: 배포 URL에서 심사 시연 시나리오(예산 입력→실데이터 추천+이유+근거 검증 배지)가 통과하는 개인 버전 완성. 핵심 1기능 = 예산 입력→학식·식당 통합 추천.
- 범위 밖(anti-scope): 회원가입·로그인 · 영수증 파싱·잔여 예산 관리(ADR-0001 보류 유지) · 자연캠 확장 · 리뷰·소셜.
- 중단점: DR1 step-4(실데이터 read) 미완이면 step-2 이후 fixture 로 선진행 후 스왑 · 3-strike · 새 사용자 소유 결정.

## Step 트리

- [ ] step-1 UI 스캐폴딩·핵심 화면 (askewly design system)
  - Artifact: `public/` 화면 3~5개(지도·예산 입력·추천 결과·제보) 골격 + 디자인 적용
  - Files: `public/` (신규/수정) · `api/` (read 연결)
  - Dependencies: 없음 (데이터는 fixture 로 시작 가능)
  - Verify: 로컬 dev 서버 렌더 + 콘솔 red error 0 + 디자인 게이트 스크린샷
  - Failure probe: 데이터 0건일 때 빈 상태 UI 렌더(빈 화면·크래시 금지)
  - Commit: `feat(DR2): 개인 버전 UI 스캐폴딩` 1커밋
- [ ] step-2 추천 루프 완결 (예산→구조화→통합 필터→추천+이유)
  - Artifact: 추천 로직 + Solar 이유 생성 경로
  - Files: `api/parse-query.js` (read) · 추천 모듈 (신규) · `public/` (수정)
  - Dependencies: step-1
  - Verify: "8천원 이하 도보 5분 혼밥" → 실데이터 추천 ≥1건 + 이유 문구 렌더
  - Failure probe: Solar 타임아웃(2.5s) 시 fallback 파서로 결과 유지(M3 실측 계약)
  - Commit: `feat(DR2): 예산 추천 루프 완결` 1커밋
- [ ] step-3 Upstage 심화 적용 (Groundedness Check + Parse 파라미터 명시화)
  - Artifact: 추천 이유가 실데이터에 근거하는지 응답 전 검증·배지 표시 + Document Parse `ocr:"force"`·`coordinates:true`·표 base64 파라미터 명시화 + 적용 서사 메모(발표 재료)
  - Files: `api/` (수정) · `docs/presentation/` (서사 반영)
  - Dependencies: step-2
  - Verify: Groundedness 실요청 1회 grounded/not-grounded 판정 관측 + 배점 기여 한 줄 매핑
  - Failure probe: Groundedness API 장애 시 핵심 추천 루프가 독립 동작(비의존 확인)
  - Commit: `feat(DR2): upstage 심화 적용` 1커밋
- [ ] step-4 검증 가시화 + 시연 smoke
  - Artifact: `verification/matrix.md`(command/expected/observed/evidence) + Playwright 시연 시나리오 smoke + 스크린샷 baseline
  - Files: `verification/` (신규) · `scripts/` (smoke)
  - Dependencies: step-2
  - Verify: 배포 URL 대상 smoke PASS (통합검증 = milestone DoD)
  - Failure probe: 의도적 결함 주입(가격 필터 역전) 1회에서 smoke 가 실제 red 확인(허수 테스트 방지 — 플레이북 Phase 5-1)
  - Commit: `test(DR2): 검증 가시화·시연 smoke` 1커밋
- [ ] step-5 dogfood·polish (사용자 전결)
  - Artifact: finding 목록 + fix/reject/defer 처리 기록
  - Files: 발견에 따름 (scope 확장 finding 은 기각·기록)
  - Dependencies: step-4
  - Verify: finding 전 건 분류 완료 + rerun smoke PASS
  - Failure probe: 빈 입력·연타·새로고침 즉흥 오사용에서 크래시 없음
  - Commit: `fix(DR2): dogfood 반영` 1커밋

## 검증/DoD
- DoD: 배포 URL에서 심사 시연 시나리오(예산→실데이터 추천+이유+Groundedness 배지)가 Playwright smoke 로 PASS 하고, `verification/matrix.md` 가 발표 자료에서 참조된다.

## 결정 로그
- status: resolved
- 베이스: 이 레포 확장 확정 (2026-07-19 사용자 확정 — 스테이징 API·배포·데이터 경로 완비, 이식 비용 0).
- Upstage 심화: Groundedness Check + Document Parse 파라미터 명시화 채택 (2026-07-19 사용자 확정 — 리서치 추천 1·2순위). Information Extraction 은 손글씨 메뉴판에서 Parse 깨짐 실측 시만 조건부, 지금 미채택.
- 디자인: askewly design system 확정 (2026-07-19 사용자 확정 — 플레이북 Phase 1-9 인터랙티브 데모 축).
- 그 외: 없음 (스택 바닐라 JS+Naver Maps+Vercel 은 ADR-0001 확정 유지).

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-19 plan 작성 (승인 대기)
