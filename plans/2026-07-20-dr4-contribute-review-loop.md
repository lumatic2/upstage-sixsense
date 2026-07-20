# Plan — DR4 제보→검수→승인 루프

> Milestone: `ROADMAP.md` DR4 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon(`plans/horizons/demoday-run.md`) → **Milestone**(이 문서) → Step
> 근거: `docs/SITEMAP.md` §7 · `docs/PRD.md` 핵심기능 2 · ADR-0001 · M2 정확도 실측(`experiments/parse-poc/accuracy.md`)
> 작성: 2026-07-20 · DR2 dogfood 에서 승격된 페이지 구조 설계의 1/2

Status: approved
- Approved: 2026-07-20 사용자 — 위임 범위 A(DR4→DR5 horizon 연쇄), "전체 진행. 일정은 신경쓰지 마"
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required · external_authority_required
- Rollback/cleanup: 커밋 단위 revert. 시트는 파괴 조작 금지(행 삭제 X, `검수` 열 값만 변경). Apps Script 웹앱은 배포 해제로 원복. 승인 게이트(step-4)는 한 줄 필터라 즉시 되돌릴 수 있다.

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 데이터 정본 = 구글 시트 `1r_G6Z...` 의 `[식당]`·`[메뉴]` 탭(검수 상태 포함). 제품 정의 = `docs/PRD.md`. 페이지 구조 = `docs/SITEMAP.md`.
- 검증: 실브라우저 E2E(제보 사진 1장 업로드 → 시트에 `대기` 행 관측 → `/review.html` 에서 확인 → 서비스 노출) + `curl` 로 배포본 실측 + 콘솔 red 0.
- 배포/운영: Vercel `upstage-sixsense-staging` → `sixsense.askewly.com`. git 연동 없음 — Windows 머신 Vercel CLI 수동 배포(기존 경로 유지).

**자기선언 도메인**
- 화면: `/contribute.html`(공개) · `/review.html`(비공개, nav 미노출). 디자인은 `DESIGN.md` SSOT 파생 `theme.css` 재사용 — 신규 토큰 발명 금지.
- 서버: `/api/contribute`(제보 append) · `/api/review`(대기 목록 read + 검수 값 update). 기존 `/api/parse-menu` 재사용.
- 데이터: 시트 `[메뉴]` `검수` 열(대기/확인/제외) 이 승인 상태 정본. 신규 스키마 없음 — 기존 열 재사용.
- 외부연동: Google Apps Script standalone 웹앱(사용자 드라이브 소유, `SpreadsheetApp.openById()` 로 팀 시트 접근, 실행 주체=배포자). Upstage Document Parse(기존).
- 크레덴셜: `SHEET_WEBHOOK_URL` · `SHEET_WEBHOOK_TOKEN` (Vercel env, 서버 함수 전용). 값 출력·커밋·로그 노출 금지.
- 접근통제: `/review.html` 은 어디에도 링크하지 않고, 쓰기 요청은 `SHEET_WEBHOOK_TOKEN` 파생 검수 토큰을 요구한다. 인증 아님 — 데모 규모 최소 방어임을 `about` 에 숨기지 않는다.
- 검토 후 제외: 회원 인증(배점 0·anti-scope, DR5 개인화가 로그인 없이 해결) · Supabase(무료 쿼터 부족, 사용자 확정 2026-07-20) · 레이트리밋(데모 규모 과설계) · 별도 `[제보]` 탭(승인 비용이 셀 1개에서 수작업 복사로 늘어남) · 관측 도구화(콘솔 육안으로 갈음).

## 범위와 중단점
- 이번 milestone 이 닫는 것: **사진 제보 → Document Parse → 시트 `대기` → 사람 검수 → 서비스 노출**이 전부 제품 안에서 관측되는 루프. 루브릭 파이프라인 20 + 깊이 15 + Upstage 20 의 인터랙티브 실체.
- 범위 밖: 페이지 톤 정합·`about#upstage`·`verify.html` 승격·재방문 개인화 → **DR5**. 회원 인증·영수증 파싱·자연캠.
- 중단점: step-1 Apps Script 배포·env 등록은 사용자 소유(secret_required 정지) · step-4 는 사용자의 189행 검수 완료 관측 후에만(external_authority_required 정지) · 3-strike.

## Step 트리

- [ ] step-1 시트 쓰기 경로 개설 (Apps Script 웹앱 + 서버 프록시)
  - Artifact: standalone Apps Script `doPost`(append/update 두 액션) 소스 + `api/_lib/sheet-write.js` + Vercel env 2개
  - Files: `scripts/apps-script/sheet-webhook.gs` (신규 — 사용자가 콘솔에 붙여넣을 소스 보존) · `api/_lib/sheet-write.js` (신규) · `docs/SITEMAP.md` (§7-3 실배포 값 반영)
  - Dependencies: 없음
  - Verify: 서버에서 테스트 행 1건 append → 시트에서 육안 확인 → 같은 행 `검수` 값 update → 반영 확인 → 테스트 행 정리
  - Failure probe: 토큰 없는 요청이 401 로 거부되는지 1회 실측(누구나 시트에 쓸 수 있으면 안 됨)
  - Commit: `feat(DR4): 시트 쓰기 경로(Apps Script 웹앱+서버 프록시)` 1커밋
- [ ] step-2 `/review.html` 검수 화면 (운영진 전용)
  - Artifact: `검수=대기` 행 목록 + 원본 사진 대조 뷰 + 행별 확인/제외 + 일괄 저장
  - Files: `public/review.html` (신규) · `api/review.js` (신규) · `public/theme.css` (필요 시 최소 추가)
  - Dependencies: step-1
  - Verify: 실브라우저에서 대기 행이 뜨고, 확인/제외를 누른 뒤 시트 값이 실제로 바뀌는 것 관측
  - Failure probe: 토큰 없이 접근 시 목록·저장이 모두 막히는지 확인
  - Commit: `feat(DR4): 제보 검수 화면 /review.html` 1커밋
- [ ] step-3 `/contribute.html` 제보 페이지
  - Artifact: 사진 업로드 + 식당명·위치 입력 → Document Parse → **읽기 전용** 결과 표시 → 접수(`검수="대기"`, `출처="제보"`)
  - Files: `public/contribute.html` (신규) · `api/contribute.js` (신규) · `public/index.html`·`about.html`·`app.html` (nav 4번째 항목 추가)
  - Dependencies: step-1
  - Verify: 실브라우저에서 실제 메뉴판 사진 1장 업로드 → 파싱 결과 렌더 → 접수 → 시트에 `대기` 행 관측
  - Failure probe: Parse 실패·0행 추출 시 파싱 결과를 날리지 않고 안내가 뜨는지(빈 화면·크래시 금지)
  - Commit: `feat(DR4): 사진 제보 페이지 /contribute.html` 1커밋
- [ ] step-4 승인 게이트 ON (`검수="확인"` 행만 서비스 노출)
  - Artifact: `loadSheetData()` 검수 필터 + 게이트 도입 전후 노출 행 수 대조 기록
  - Files: `api/_lib/sheet-data.js` (수정) · `verification/matrix.md` (관측 기록)
  - Dependencies: step-2 · **사용자의 189행 검수 완료** (external_authority_required — 미완이면 여기서 정지)
  - Verify: 게이트 ON 후 서비스 추천에 `대기` 행이 하나도 나오지 않음 + 확인 처리한 행은 정상 노출
  - Failure probe: 검수 통과 행이 0건인 상황에서 앱이 빈 상태 UI 를 렌더하는지(크래시·빈 화면 금지)
  - Commit: `feat(DR4): 미검수 데이터 서비스 노출 차단` 1커밋
- [ ] step-5 루프 통합 검증
  - Artifact: 제보→검수→노출 E2E 1회 실행 기록 + `verification/matrix.md` 행 추가 + 스크린샷
  - Files: `verification/matrix.md` · `verification/screenshots/`
  - Dependencies: step-3 · step-4
  - Verify: 새 사진 1장이 제보→대기→확인→서비스 노출까지 도달하는 것을 한 번에 관측 (= milestone DoD)
  - Failure probe: 검수에서 `제외` 처리한 행이 서비스에 절대 안 나오는지 역방향 확인
  - Commit: `test(DR4): 제보·검수 루프 E2E 검증` 1커밋

## 검증/DoD
- DoD: 배포 URL 에서 **새 메뉴판 사진 1장이 제보 → Document Parse → 시트 `대기` → `/review.html` 검수 → 서비스 추천 노출**까지 도달하는 것이 한 번의 E2E 로 관측되고, 미검수 데이터가 서비스에 노출되지 않는 것이 역방향으로 확인된다. 관측 기록은 `verification/matrix.md`.

## 결정 로그
- status: resolved
- 예상 결정: 아래가 전부 — 실행 중 새 사용자 소유 결정 없음
- 저장소: Supabase 미사용 · 구글 시트 정본 유지 (2026-07-20 사용자 — 무료 쿼터 부족).
- 검수 주체: **운영진 전용**. 제보자는 파싱 결과를 보기만 하고 수정하지 않는다 (2026-07-20 사용자).
- 검수 장소: (b) `/review.html` 신설 — 시트 손 검수(a) 기각 (2026-07-20 사용자). 근거: 검수 단계가 제품 안에서 관측돼야 파이프라인 20점의 증거가 된다.
- 기존 189행 일괄 `확인` 처리: **기각** (2026-07-20 사용자 지적). 사람이 안 본 것을 확인으로 찍는 것은 검수 단계를 만들면서 무력화하는 자기모순. 실제로 검수한다.
- 시트 소유권: 사용자는 편집 권한만 보유(소유자는 팀원). standalone Apps Script + 실행주체=배포자 로 소유권 없이 성립 — 팀 시트에 스크립트를 심지 않는다.
- 파싱 결과 노출: 제보자가 수정은 못 해도 **보기는 한다**. Document Parse 결과가 심사위원 눈에 보이는 유일한 순간이라 감추면 하드 요건 제품이 화면에서 사라진다.

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-20 plan 작성 (승인 대기). 설계 근거는 `docs/SITEMAP.md` §7.
- 2026-07-20 시트 실측: `[메뉴]` 189행 중 `대기` 189 · `확인` 1 → step-4 게이트는 사용자 검수 완료 후에만 ON.
- 2026-07-20 step-1~3 완료. 실측 기록은 `verification/matrix.md` #11~19.
- 2026-07-20 finding(설계 시정): 검수 화면에 **수정** 기능 추가. 실물 메뉴판 대조에서 `100g/` 파편 3건이 마라탕·마라반·마라샹궈의 이름이 날아간 것으로 드러남 — 확인/제외만으로는 정답을 담은 파편을 버리게 된다.
- 2026-07-20 blocked(부분): `KAKAO_REST_API_KEY` 부재로 제보 시 좌표 자동 채움 미동작. 제보 접수 자체는 정상(best-effort 설계). 키 확보 시 env 등록으로 해소.
