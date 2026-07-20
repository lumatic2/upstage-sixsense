# Plan — DR10 품질 마감 (자동화·데모 카드·전수 감사 결함)

> Milestone: `ROADMAP.md` DR10 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon → **Milestone**(이 문서) → Step
> 근거: 사용자 지시 2026-07-21 (자동화·데모 카드 개선·"최고 품질"·이슈 해결·전 페이지 점검) + 전수 QA 감사 결과
> 작성: 2026-07-21

Status: approved
- Approved: 2026-07-21 사용자 — "진행" (step-1~6 연속, 시간 제약 없음)
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 커밋 단위 revert. cron 은 `vercel.json` 한 줄이라 제거로 원복. custom-skills 수정은 별도 레포 커밋으로 분리해 따로 되돌릴 수 있게 한다.

## 왜 이 milestone 인가

사용자가 **시간 제약을 풀고 "최고의 품질"을 지시**했다. 그래서 이번엔 요청 기능만 넣지 않고
전 페이지를 감사해 결함을 목록화했고, 거기서 **내가 직전 라운드에 만든 BLOCKER 를 하나 찾았다**:
`search=false` 턴에서 어긋난 문장을 걸러내는 필터가, **문장을 전부 걸러내면 원문으로 되돌아간다**.
그래서 조건을 못 읽은 입력에 "8,000원 이하 소반·홍순두부를 추천해요" 라고 답하면서
화면에는 전혀 다른 가게 카드가 떠 있다 — 이 서비스가 내세우는 "환각을 구조적으로 막는다"를
정면으로 깨는 상태다.

함께: 학식 데이터가 사람이 크롤러를 돌려야만 갱신되고(시트 마지막 적재가 5일 밀린 적 있음),
랜딩 데모 카드의 회색 점은 지도 위 요소로 읽히지 않으며, 데모 카드 입력창은 아무 응답도 없다.

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 학식 정본 = 학교 페이지(크롤러) → 시트. 디자인 토큰 = `theme.css`. 조건 추출 = `api/_lib` 공용.
- 검증: 실브라우저 1280·390 + `demo-smoke`(14) + `test-chat-extract`(29) + cron 수동 트리거 실행 관측 + 콘솔 red 0.
- 배포/운영: Vercel `upstage-sixsense-staging` → `sixsense.askewly.com`. **Cron 은 Hobby 플랜이라 하루 1회 제한**(사용자 확정: Vercel Cron).

**자기선언 도메인**
- 서버: `api/cron/crawl-cafeteria.js` 신설(Vercel Cron 대상) + `vercel.json` 에 `crons` 등록. 크롤러 본체는 `scripts/crawl-cafeteria.mjs` 로직을 `api/_lib/` 로 옮겨 공유(스크립트와 서버가 같은 코드를 쓰게).
- 보안: cron 엔드포인트는 `CRON_SECRET` 로 보호(Vercel 이 자동 주입하는 헤더 검증). 외부에서 임의 호출 금지.
- 화면: `public/index.html` 데모 카드(마커·사이드바 CTA) · 전 페이지 nav 통일 · 헤드라인 금액 간격.
- 데이터: 시트 [메뉴] `비고` 에 칵테일류 `사이드` 표기(이슈 ⑦).
- 레포 밖: `~/projects/custom-skills` 의 `/harness` 훅 문구를 정본 경로로(이슈 ⑥, 사용자 확정) + `setup.sh` 배포.
- 검토 후 제외: GitHub Actions 이중화(시크릿이 사는 곳을 늘리지 않는다 — 사용자 확정 Vercel Cron 단일) · `/test.html` 은 **삭제 대신 배포 제외**(원복 경로 보존 규약 유지) · 랜딩 수집 현황 날짜 재작성(팀원 데이터라 임의 수정 금지, 발표 Q&A 로 대응).

## 범위와 중단점
- 이번 milestone 이 닫는 것: 학식이 사람 손 없이 갱신되고, 랜딩 데모 카드가 지도답게 보이며 입력에 반응하고, 감사에서 나온 결함이 정리되고, 열린 이슈 ⑥⑦ 이 닫힌다.
- 범위 밖: 신규 데이터 수집 · 로그인 · 자연캠 · 발표 자료 재작성.
- 중단점: cron 이 Hobby 제한·권한으로 막히면(blocked) 사용자에게 대안 제시 · 3-strike · 새 사용자 결정.

## Step 트리

- [ ] step-1 BLOCKER — 대화 필터가 원문으로 되돌아가는 구멍
  - Artifact: `api/chat.js` 의 `search=false` 문장 필터에서 **전부 걸러진 경우의 안전 기본값**. 걸러낸 결과가 비면 원문 복귀가 아니라 조건을 못 읽었다는 정직한 문장으로 대체.
  - Files: `api/chat.js` · `scripts/test-chat-extract.mjs`(케이스 추가)
  - Dependencies: 없음
  - Verify: `asdkjqwoie 12903890 !@#$ 없는 조건` 등 조건 없는 입력 5종 × 2회 → 응답에 금액 주장·카드 안내 0건, 화면 카드와 모순 0
  - Failure probe: 모델이 전 문장을 금액·카드로 채운 응답을 강제로 만들어(프롬프트 무시 상황 모사) 필터가 빈 결과를 낼 때 안전 문장이 나오는지
  - Commit: `fix(DR10): 대화 필터가 전부 걸러지면 원문으로 되돌아가던 구멍`
- [ ] step-2 학식 크롤링 자동화 (Vercel Cron)
  - Artifact: 크롤러 로직을 `api/_lib/cafeteria-crawl.js` 로 공유화 → `api/cron/crawl-cafeteria.js`(GET, `CRON_SECRET` 검증) → `vercel.json` `crons` 매일 1회(21:10 UTC = 06:10 KST). 중복 적재 방지는 기존 키(날짜|식당|코너|메뉴) 유지. `scripts/crawl-cafeteria.mjs` 는 같은 모듈을 쓰도록 정리.
  - Files: `api/_lib/cafeteria-crawl.js`(신설) · `api/cron/crawl-cafeteria.js`(신설) · `vercel.json` · `scripts/crawl-cafeteria.mjs`
  - Dependencies: 없음
  - Verify: 배포 후 cron 엔드포인트를 **시크릿 없이** 호출 → 401, 시크릿과 함께 호출 → 200 + 적재 결과 JSON. 시트 행 수 증가 관측
  - Failure probe: 학교 페이지가 죽은 상황(잘못된 URL 주입)에서 500 이 아니라 `status:"error"` + 시트 미변경으로 끝나는지
  - Commit: `feat(DR10): 학식 크롤링 Vercel Cron 자동화`
- [ ] step-3 랜딩 데모 카드 — 지도 마커 + 사이드바 CTA
  - Artifact: ① 회색 점(`.dot`) → **실제 지도 마커 모양**으로 교체하되 **시뮬레이션에 참여하는 식당(깨끗한 메뉴가 있는 곳)만** 표시 ② 사이드바 입력창에 사용자가 문장을 넣으면 대본 재생을 멈추고 "여기는 소개용 데모예요 — 실제로 찾아보시려면" 안내 + **`/app.html` 로 가는 버튼**(입력한 문장을 쿼리로 넘김)
  - Files: `public/index.html`
  - Dependencies: 없음
  - Verify: 랜딩에서 마커 개수 = 시뮬레이션 대상 수와 일치, 나머지 식당은 미표시. 입력 후 안내 문구 + 버튼 노출, 버튼 클릭 시 `/app.html?q=…` 로 이동해 그 조건으로 검색됨(데스크톱·모바일)
  - Failure probe: 데이터가 0건이거나 좌표 없는 식당만 있을 때 마커·대본이 깨지지 않는지
  - Commit: `feat(DR10): 랜딩 데모 카드 — 지도 마커 + 입력 시 실서비스 유도`
- [ ] step-4 감사 결함 정리 (MAJOR·MINOR)
  - Artifact: ① 모바일 nav 에서 `Upstage AI` 가 잘리는 문제 해결(가로 스크롤이 실제로 되게 하거나 항목 재배치) ② `contribute.html` nav 에 빠진 `Upstage AI` 링크 추가(전 페이지 동일) ③ `/test.html` 배포 제외(파일은 남김) ④ 헤드라인 금액과 `으로` 사이 빈칸 제거 ⑤ `review.html` 토큰 입력을 `<form>` 으로 감싸 콘솔 경고 해소
  - Files: `public/index.html` · `public/contribute.html` · `public/review.html` · `public/theme.css` · `scripts/deploy-staging.mjs`
  - Dependencies: 없음
  - Verify: 390px 에서 nav 마지막 항목까지 도달 가능, 6페이지 헤더 항목 동일, `/test.html` 404, 헤드라인 간격 정상, 콘솔 red/warning 0
  - Failure probe: nav 항목이 더 늘어난 상황(가짜 항목 1개 주입)에서도 잘리지 않고 접근 가능한지
  - Commit: `fix(DR10): 전수 감사 결함 — nav 일관성·모바일 잘림·배포 범위`
- [ ] step-5 열린 이슈 정리 (⑥⑦)
  - Artifact: ⑦ 시트 [메뉴] `비고` 에 칵테일·주류 고유명 `사이드` 표기 → 곁들임 규칙의 사람-우선 경로 실사용. ⑥ `~/projects/custom-skills` 의 `/harness` 훅 문구를 정본 `.harness/work.json` 경로로 수정 + `setup.sh` 배포 + 이 레포 `AGENTS.md`·`CLAUDE.md` 에 "완료는 ledger·ROADMAP·work.json 셋" 규칙 명문화
  - Files: 구글 시트(열 값) · `~/projects/custom-skills`(별도 레포) · `AGENTS.md` · `CLAUDE.md` · `docs/OPEN-ISSUES.md`
  - Dependencies: 없음
  - Verify: 표기 후 `/api/data` 에서 해당 메뉴 `isSide=true` · 훅 수정 후 배포본에서 문구 확인 · OPEN-ISSUES 에서 ⑥⑦ 닫힘
  - Failure probe: `비고` 에 `한끼` 를 넣으면 규칙을 이겨 본메뉴로 돌아오는지(양방향 override 동작 확인)
  - Commit: `chore(DR10): 열린 이슈 ⑥⑦ 정리` (custom-skills 는 그 레포에 별도 커밋)
- [ ] step-6 통합 검증
  - Artifact: `verification/matrix.md` DR10 절 · 스크린샷 · smoke·단위 재실행 · 독립 검증
  - Files: `verification/matrix.md` · `verification/screenshots/dr10-*.png`
  - Dependencies: step-1~5
  - Verify: `demo-smoke` PASS · `test-chat-extract` PASS · 6페이지 콘솔 red 0 · 곁들임/학식 회귀 · cron 1회 실제 실행 결과 관측
  - Failure probe: smoke 셀렉터 1개를 깨뜨려 FAIL 하는 것을 재확인(구조를 또 바꿨으므로)
  - Commit: `test(DR10): 품질 마감 통합 검증`

## 검증/DoD
- DoD: ① 조건 없는 입력에 화면과 어긋나는 문장 0건 ② cron 이 실제로 돌아 학식이 사람 손 없이 갱신됨(1회 실행 관측 + 스케줄 등록 확인) ③ 랜딩 데모 카드가 마커로 보이고 입력에 실서비스 유도로 반응 ④ 6페이지 nav 동일·모바일 잘림 0·`/test.html` 비공개 ⑤ 이슈 ⑥⑦ 닫힘 ⑥ smoke·단위 전부 PASS, 콘솔 red 0.
- Evidence: `verification/matrix.md` DR10 절 + 스크린샷 + cron 실행 로그.

## 결정 로그
- status: resolved
- 학식 자동화 수단: **Vercel Cron** — 시크릿이 사는 곳을 늘리지 않는다. Hobby 하루 1회 제한은 학식 주간 뷰(한 번에 5일치)로 감당. (2026-07-21 사용자 확정)
- 하네스 훅 수정: **고친다** — custom-skills 원본 수정 후 setup.sh 배포. (2026-07-21 사용자 확정)
- `/test.html`: 삭제하지 않고 **배포에서만 제외** — "승격 실패 시 원복 경로" 규약을 깨지 않으면서 판정단 노출은 막는다.
- 랜딩 수집 현황 2024년 날짜: 팀원 기존 데이터라 임의 수정 금지. 발표 Q&A 로 설명.
- 시간 제약: **없음** — 미팅 일자를 이유로 품질을 깎지 않는다. (2026-07-21 사용자 지시)
- 그 외: 없음.

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-21 plan 작성 (승인 대기) — 전수 QA 감사 선행, BLOCKER 1·MAJOR 3·MINOR 4 확보
