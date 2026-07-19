# Plan — DR1 실데이터 파이프라인 가동

> Milestone: `ROADMAP.md` DR1 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 근거: `research/2026-07-19-demoday-run-data-pipeline.md` · `research/2026-07-17-m3-e2e.md` · `docs/team/2026-07-18-decisions.md` §6
> 작성: 2026-07-19 · demoday-run horizon 일괄 계획 1/3

Status: approved
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 시트 적재는 pending 행 추가 방식 — 오염 시 해당 행 삭제로 원복. 스크립트는 커밋 revert. 시크릿은 env 만(커밋·로그 노출 금지).

## 스캐폴딩 결정
- source-of-truth: 팀 데이터 정본 = 구글 시트 "한입지도 식당 데이터" 4탭(7/18 확정) · 사진 원본 = 공유 드라이브 · 서비스 read 정본 = Supabase(팀 프로젝트) · 코드 = 이 레포 `scripts/`·`api/`
- 검증: 각 스크립트 실행 로그 + 시트·Supabase 행 실측 + 통합검증(실데이터 1건이 시트→DB→스테이징 URL 검색 결과까지)
- 배포/운영: 스크립트는 로컬 실행, 서비스 read 경로는 스테이징 Vercel 재배포(`scripts/deploy-staging.mjs`)로 반영
- 데이터: 파싱 결과는 pending→검수 승인 후 확정 행. 가격 이상치는 하드 룰(0원·10만원 초과 하이라이트) + `collected_at` 신선도 기록(리서치 추천 — IQR 통계 탐지는 이 규모에 과설계)
- 외부연동: Upstage Document Parse(기존) · 카카오 Local 지오코딩(신규) · 구글 시트 gviz CSV(읽기) · Supabase(쓰기·read)
- 크레덴셜: `UPSTAGE_API_KEY`(등록됨) · `KAKAO_REST_API_KEY`(사용자 발급 대기) · Supabase env(팀 프로젝트 값)
- 검토 후 제외: 화면·디자인(DR2 소관) · 관측(1회성 스크립트 실행 로그로 충분)

## 범위와 중단점
- 이번 milestone 이 닫는 것: 시트 4탭이 실데이터로 채워지고 서비스가 Supabase 경유로 그걸 읽는 경로까지. 팀 수집을 기다리지 않는다 — 사용자 보유·직접 수집 사진으로 먼저 가동, 팀 유입분은 같은 파이프에 흡수.
- 범위 밖: UI(DR2) · hanipmap 반영(DR3) · 자연캠 학식.
- 중단점: `KAKAO_REST_API_KEY` 미발급(step-2 만 blocked, 타 step 진행) · 시트/Supabase 권한 오류(blocked) · 같은 문제 3회 실패(3-strike).

## Step 트리

- [ ] step-1 사진 배치 파싱→시트 적재
  - Artifact: `scripts/batch-parse-to-sheet.mjs` + [식당]·[메뉴] 탭 pending 행
  - Files: `scripts/batch-parse-to-sheet.mjs` (신규) · `api/_lib/` (read) · 시트 API 호출
  - Dependencies: 없음 (UPSTAGE_API_KEY 등록됨)
  - Verify: 실행 로그 "사진 N장→행 M개 적재" + 시트에서 행 실측 확인
  - Failure probe: 파싱 실패 사진 1장이 파이프를 죽이지 않고 failed 목록으로 스킵되는지
  - Commit: `feat(DR1): 사진 배치 파싱→시트 적재 스크립트` 1커밋
- [ ] step-2 지오코딩 자동 채움 ([식당]탭 주소→좌표, 카카오 Local)
  - Artifact: `scripts/geocode-sheet.mjs`
  - Files: `scripts/geocode-sheet.mjs` (신규) · 시트 [식당]탭
  - Dependencies: `KAKAO_REST_API_KEY` 발급 (미발급 시 이 step 만 blocked)
  - Verify: 주소 있는 전 행 좌표 채움 + 1곳 스팟체크(지도 좌표 실측 대조)
  - Failure probe: 매칭 실패 주소가 빈 값 + 실패 목록으로 남는지(잘못된 좌표 기입 금지)
  - Commit: `feat(DR1): 시트 지오코딩 자동 채움` 1커밋
- [ ] step-3 학식 크롤러→[학식]탭 적재
  - Artifact: `scripts/crawl-cafeteria.mjs` 시트 적재 확장. ⚠ 첫 작업 = Playwright 로 실제 식단 데이터 URL 확인(리서치 실측: 정적 HTML 아님 — 클릭 후 서브 요청 로드 추정)
  - Files: `scripts/crawl-cafeteria.mjs` (수정)
  - Dependencies: 없음
  - Verify: 이번 주 식단 행이 [학식]탭에 실재 + 요일·가격 스팟체크
  - Failure probe: 방학·휴무로 식단이 비었을 때 크래시 없이 "0건" 정상 종료
  - Commit: `feat(DR1): 학식 크롤러 시트 적재` 1커밋
- [ ] step-4 시트→Supabase 동기화 + 서비스 read 전환
  - Artifact: `scripts/sync-sheet-to-db.mjs`(gviz CSV 읽기→Supabase upsert) + `api/` 가 fixture 대신 Supabase 를 읽는 경로
  - Files: `scripts/sync-sheet-to-db.mjs` (신규) · `api/` (수정) · `public/test.html` (검증용)
  - Dependencies: step-1~3 데이터 · Supabase env
  - Verify: 스테이징 URL 검색에서 실데이터 식당 1곳 노출 (통합검증 = milestone DoD)
  - Failure probe: Supabase 응답 실패 시 빈 데이터 graceful 처리(500 크래시 금지)
  - Commit: `feat(DR1): 시트→DB 동기화·서비스 read 전환` 1커밋

## 검증/DoD
- DoD: 실사진 유래 식당 ≥5곳 + 좌표 + 학식 실식단이 시트·Supabase 에 있고, 스테이징 URL 검색 E2E 에서 그 실데이터가 관측된다.

## 결정 로그
- status: resolved
- 지오코딩 제공자: 카카오 Local API 확정 (2026-07-19 사용자 확정 — REST 키 1개·무료 10만건/일, 리서치 추천). 키는 사용자 발급 → env `KAKAO_REST_API_KEY`, BLOCKED until 발급(step-2 한정).
- 시트 read 방식: 공개 CSV export(gviz) 읽기 + Supabase upsert 동기화 확정 (2026-07-19 사용자 승인 흐름 — 서비스 계정 불요, 앱은 팀 구조와 동일하게 Supabase 읽음).
- 그 외: 없음 (시트 구조·탭 7/18 팀 확정, 크롤러·파싱 API 는 기존 자산).

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-19 plan 작성 (승인 대기)
