# Plan — DR6 내 버전 완결 (미팅 제출 후보 확정판)

> Milestone: `ROADMAP.md` DR6 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon(`plans/horizons/demoday-run.md`) → **Milestone**(이 문서) → Step
> 근거: `docs/OPEN-ISSUES.md` ②③④⑤ · `docs/adr/0003-no-assembly-build.md` · `docs/CHALLENGE.md` 루브릭
> Supersedes: `plans/2026-07-19-dr3-assembly.md` step-1·step-2 폐기, step-3(발표 자료 실물 정합)은 이 문서 step-5 로 승계
> 작성: 2026-07-20 · 팀 구조 전환(ADR-0003)에 따른 재계획 1/2

Status: approved
- Approved: 2026-07-20 사용자 — 위임 범위 A(DR6→DR7 horizon 연쇄), "끝까지 진행"
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 커밋 단위 revert. 시트는 **행 삭제 없이 열 값 변경만**(Apps Script 에 delete action 없음 — DR4 실측). 배포는 `node scripts/deploy-staging.mjs` 재실행으로 앞 커밋 상태 복원 가능.

## 왜 이 milestone 인가

**2026-07-23(목) 21:00 팀 미팅이 실질 마감이다.** 제출물은 그 자리에서 각자 버전을 비교해 합의로 정해진다(ADR-0003). 따라서 이 레포의 서비스가 "지금 열어서 보여줬을 때 선택될 만한 상태"인지가 유일한 판정 기준이다. 배점표상 UI 는 0점이지만, 미팅에서는 나란히 놓고 고르는 설득력이 곧 완성도다.

DR5 까지 구조는 닫혔고, 남은 것은 **품질 결함 3건 + 미배선 secret 1건 + 세부 폴리싱 + 발표 정합**이다.

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 메뉴·식당 데이터 = 구글 시트([메뉴]·[식당] 탭). 제품 정의 = `docs/PRD.md`. 디자인 토큰 = `DESIGN.md` → `public/theme.css`. **이 milestone 에서 시트를 단일 SSOT 로 확정한다**(step-2).
- 검증: 실브라우저 구동(예산 검색 시나리오 + 제보 플로우) + `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` + 배포본 `curl` 실측 + 콘솔 red 0.
- 배포/운영: Vercel `upstage-sixsense-staging` → `sixsense.askewly.com`, `node scripts/deploy-staging.mjs`(FILES 목록에 신규 파일 수동 추가 필요).

**자기선언 도메인**
- 데이터: 시트 [메뉴] `비고` 열에 `사이드` 표시를 도입한다(신규 스키마 값). 행 삭제 없음.
- 서버: `api/recommend.js` 픽 로직에 사이드 제외 규칙 추가 · `api/data.js` 에서 Supabase 분기 제거.
- 화면: `public/app.html`·`public/about.html` 폴리싱(랜딩 수준 톤). 신규 디자인 토큰 발명 금지 — `theme.css` 기존 변수만.
- 크레덴셜: `KAKAO_REST_API_KEY` — **사용자가 Vercel env 에 등록**(2026-07-20 확정). 값은 코드·커밋·로그에 넣지 않는다.
- 외부연동: 카카오 Local API(좌표 조회) — 기존 `scripts/geocode-sheet.mjs` 와 동일 키.
- 검토 후 제외: 미검수 식당 5곳 검수(팀원 수집분 — 원 출처 확보 전 임의 승인 금지, DR7 에서 질문 항목으로 이관) · 로그인/Firebase(배점 0 + D-3 신규 스택 도입은 사고 위험) · Supabase `review` 열 추가(시트 SSOT 확정으로 불필요) · 자연캠 확장(범위 밖).

## 범위와 중단점
- 이번 milestone 이 닫는 것: 배포 사이트가 **미팅에서 그대로 열어 보여줄 수 있는 상태** — 추천 결과에 사이드 메뉴가 한 끼로 섞이지 않고, 검수 게이트가 코드 경로 하나로 단일하며, 새 제보가 지도에 찍히고, 5페이지 톤이 일관되며, 발표 자료 수치가 실물과 일치한다.
- 범위 밖: 미검수 5곳 개방 · 로그인 · hanipmap 이식(ADR-0003) · 신규 기능.
- 중단점: `KAKAO_REST_API_KEY` 미등록 시 step-3 만 `blocked` 로 두고 step-4 로 진행(전체 정지 아님) · 3-strike · 새 사용자 소유 결정.

## Step 트리

- [ ] step-1 사이드 메뉴 분리 + 보류 4건 판정 (OPEN-ISSUES ②③)
  - Artifact: 시트 [메뉴] `비고` 열 `사이드` 표시(공기밥·꼬치 등) + `api/recommend.js` 단독 pick 제외 규칙 + 보류 4건 검수 판정(`R013 페르시안궁전 "인기준" 12500` 은 파싱 쓰레기값 — 제외 처리)
  - Files: `api/recommend.js`(수정) · `scripts/apply-review-verdicts.mjs`(재사용) · 구글 시트 [메뉴] 탭(열 값만)
  - Dependencies: 없음
  - Verify: 배포본에 `{"budget":1000}` 검색 → 사이드 단독 pick 이 **0건**이고, 같은 메뉴가 식당 상세 목록에는 그대로 보임. `검수=대기` 행이 R000 예시행만 남음
  - Failure probe: 예산 1,000원처럼 사이드밖에 없는 조건에서 500·빈 화면이 아니라 "조건에 맞는 곳이 없다" 빈 상태가 뜨는지 확인(DR5 빈 상태 경로 회귀)
  - Commit: `fix(DR6): 사이드 메뉴 단독 추천 제외 + 보류 4건 판정`
- [ ] step-2 Supabase 분기 제거 — 시트 SSOT 단일화 (OPEN-ISSUES ④)
  - Artifact: `api/data.js` 의 Supabase 우선 경로 삭제, 시트(gviz) 단일 경로로 확정. `scripts/sync-sheet-to-db.mjs` 와 `db/` 는 **삭제하지 않고** 미사용 표시 + 사유를 `docs/ARCHITECTURE.md` 에 한 줄 기록(전역 규칙: 죽은 코드 임의 삭제 금지 → 사용자 확정 받은 범위만 제거)
  - Files: `api/data.js`(수정) · `docs/ARCHITECTURE.md`(수정)
  - Dependencies: 없음
  - Verify: 배포본 `/api/data` 응답의 `source` 가 항상 시트 경로이고, 검수 게이트를 통과한 행만 포함되는 것을 응답 실측으로 확인
  - Failure probe: `SUPABASE_URL` 을 임의 값으로 넣은 로컬 실행에서도 Supabase 를 타지 않는 것 확인(분기가 실제로 죽었는지 역방향 검증)
  - Commit: `refactor(DR6): api/data Supabase 분기 제거 — 시트 SSOT 단일화`
- [ ] step-3 카카오 키 배선 + 제보 좌표 E2E (OPEN-ISSUES ⑤)
  - Artifact: Vercel env `KAKAO_REST_API_KEY` 등록(사용자) 후 제보→좌표 자동 채움 경로 실동작 확인. 키 없을 때의 graceful 경로 유지 확인
  - Files: 코드 변경 없음 예상 — 실패 시 `api/contribute.js`(수정)
  - Dependencies: 사용자의 키 등록. **미등록이면 이 step 만 `blocked`, 나머지 진행**
  - Verify: 배포 사이트에서 새 식당 1건 제보 → [식당] 탭에 좌표가 채워지고 지도에 마커가 찍히는 것을 실브라우저로 관측
  - Failure probe: 존재하지 않는 주소로 제보 시 500 이 아니라 좌표 null 로 저장되고 검수 화면에 남는지 확인
  - Commit: `feat(DR6): 제보 좌표 자동 채움 실배선`
- [ ] step-4 세부 페이지 폴리싱 (`app.html`·`about.html`)
  - Artifact: 랜딩(`index.html`) 수준의 여백·타이포·상태 표현을 두 페이지에 정합. 데이터 로딩/빈/에러 3상태가 모두 디자인된 상태로 존재
  - Files: `public/app.html`(수정) · `public/about.html`(수정) · 필요 시 `public/theme.css`(기존 변수 사용만)
  - Dependencies: step-1(빈 상태 문구가 사이드 제외 규칙과 맞물림)
  - Verify: 실브라우저에서 5페이지를 순회하며 데스크톱·모바일 폭 각 1회 스크린샷 — 톤 이탈·잘림·콘솔 red 0
  - Failure probe: 네트워크를 끊은 상태로 `/app.html` 진입 시 무한 스피너가 아니라 에러 상태가 뜨는지 확인
  - Commit: `style(DR6): app·about 페이지 톤 정합·상태 표현 완결`
- [ ] step-5 발표 자료 실물 정합 + 최종 통합 검증 (구 DR3 step-3 승계)
  - Artifact: `docs/presentation/` 의 수치·URL 을 실물과 1:1 대조해 갱신(식당 수·메뉴 행 수·정확도·배포 URL·검증 산출물 경로) + `verification/matrix.md` 갱신 + ADR-0003 을 발표 Q&A("왜 팀 레포에 합치지 않았나")에 반영
  - Files: `docs/presentation/`(수정) · `verification/matrix.md`(수정)
  - Dependencies: step-1~4
  - Verify: `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` PASS + 발표 자료 속 수치·URL 을 행 단위로 대조해 불일치 0
  - Failure probe: 발표 자료의 데모 URL 을 시크릿 창에서 열어 로그인 벽·깨진 링크 없이 접근되는지 확인
  - Commit: `docs(DR6): 발표 자료 실물 정합 + 검증 매트릭스 갱신`

## 검증/DoD
- DoD: 배포 URL 에서 ① 저예산 검색에 사이드 단독 pick 0건 ② `/api/data` 가 시트 단일 경로로 검수 통과분만 반환 ③ 5페이지 톤 일관·콘솔 red 0 ④ 발표 자료 수치·URL 이 실물과 불일치 0 — 그리고 `demo-smoke` PASS.
- Evidence: `verification/matrix.md` + smoke 출력 + 스크린샷.

## 결정 로그
- status: resolved
- 미검수 5곳(OPEN-ISSUES ①): **건드리지 않는다** — 팀원 수집분이고 원 출처가 없어 대조 불가. 임의 승인은 파이프라인 진실성 주장을 무너뜨린다. 출처 질문은 DR7 공유 패키지에 넣는다. (2026-07-20 사용자 확정)
- Supabase 분기(④): **삭제 — 시트가 SSOT**. (2026-07-20 사용자 확정)
- 카카오 키(⑤): **사용자가 Vercel env 에 등록**, 미등록 시 해당 step 만 blocked. (2026-07-20 사용자 확정)
- 로그인/Firebase: 이번 범위 밖 — D-3 에 신규 스택 도입은 위험 대비 실익 없음(배점 0). 미팅 후 재판단.
- 그 외: 없음.

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-20 plan 작성 (승인 대기) — ADR-0003 팀 구조 전환에 따른 DR3 대체
