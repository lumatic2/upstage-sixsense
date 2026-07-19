# Plan — DR3 본선 조립 (hanipmap 이식·계약·온보딩)

> Milestone: `ROADMAP.md` DR3 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 근거: `research/2026-07-17-m3-e2e.md` "이식 시 남는 것" 4항목 · `docs/team/2026-07-18-decisions.md` §6
> 작성: 2026-07-19 · demoday-run horizon 일괄 계획 3/3

Status: pending-approval
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: hanipmap 변경은 전부 PR 경유(main 보호) — 머지 전 폐기로 원복. 이 레포 원본 불변.

## 스캐폴딩 결정
- source-of-truth: 대표 버전 코드 = github.com/lumatic2/hanipmap (main 보호, part-* 브랜치) · 파이프라인 원본 = 이 레포 `api/`·`db/`
- 검증: hanipmap 배포 URL(https://hanipmap-sandy.vercel.app) 실브라우저 E2E(사진 제보 프리필 + 자연어 검색) + 문서 curl 예시 실행 대조
- 배포/운영: hanipmap Vercel push=자동 배포(`UPSTAGE_API_KEY` env 기등록), PR 머지로 반영
- 문서: hanipmap `docs/api-contract.md`(공용 스테이징 API URL·계약) + 팀원용 Claude Code/Codex 시작 가이드(킥오프 §3 프롬프트 재활용)
- 외부연동: Upstage API(hanipmap env 기등록)
- 검토 후 제외: 디자인(대표 버전은 한입지도 기존 스타일 유지 — 화면 편입은 데모데이 직전 별도 판단) · 데이터(DR1 소관)

## 범위와 중단점
- 이번 milestone 이 닫는 것: 대표 조립본이 이 레포 파이프라인을 품고, 팀이 그 위에서 작업 가능한 상태(계약 문서·온보딩 포함).
- 범위 밖: hanipmap 신규 기능 개발(검증 안 된 코드가 대표 버전에 섞이는 것 차단 — 플레이북 Phase 7 원칙) · 팀원 화면 편입 판단.
- 중단점: hanipmap 권한·env 문제(blocked) · 3-strike. 팀원 GitHub 아이디 미수신은 정지 사유 아님(해당 항목만 보류 기록).

## Step 트리

- [ ] step-1 API·스키마 이식 (hanipmap PR)
  - Artifact: hanipmap PR 1건 — `api/parse-menu.js`·`api/parse-query.js`·`api/_lib/`·`db/schema.sql` 복사 + 제보 폼 연결(test.html §① 로직 레퍼런스) + 학식 검색 풀 병합 + TRD 반영(solar-pro2·타임아웃 2.5s)
  - Files: hanipmap `api/`·`db/`·제보 폼·검색 모듈 (이 레포는 read-only)
  - Dependencies: 없음 (env·권한 완비)
  - Verify: hanipmap 배포 URL에서 사진 업로드→프리필 + "8천원 이하" 검색 구조화 실동작 (통합검증 = milestone DoD)
  - Failure probe: env 키 없는 preview 배포에서 500 `no_api_key` graceful 응답(M3 계약 유지)
  - Commit: hanipmap PR `feat: upstage 파이프라인 이식` 1건
- [ ] step-2 계약·온보딩 문서
  - Artifact: hanipmap `docs/api-contract.md` 갱신(공용 스테이징 API 실 URL·요청/응답 계약) + 팀원용 툴 시작 가이드 + (아이디 수신 시) `gh api -X PUT repos/lumatic2/hanipmap/collaborators/<id>` 초대 실행
  - Files: hanipmap `docs/`
  - Dependencies: step-1 (실 URL 확정)
  - Verify: 문서의 curl 예시 1개 실제 실행 → 응답 일치
  - Failure probe: 팀원 관점 미인증 fetch 가 CORS·권한 문제없이 동작
  - Commit: hanipmap `docs: 공용 API 계약·온보딩` 1커밋
- [ ] step-3 발표 자료 실물 정합
  - Artifact: `docs/presentation/` 갱신 — 실데이터·조립본 URL·`verification/matrix.md` 참조 반영, 수치 drift 행 대조(플레이북 Phase 7-7)
  - Files: `docs/presentation/` (이 레포)
  - Dependencies: DR1·DR2 완료 데이터
  - Verify: 발표 자료 속 수치·URL 이 실물과 1:1 일치(크로스-아티팩트 정합 행 대조)
  - Failure probe: 발표 자료의 데모 URL 을 시크릿 창에서 열어 로그인 벽 없이 접근 확인
  - Commit: `docs(DR3): 발표 자료 실물 정합` 1커밋

## 검증/DoD
- DoD: hanipmap 배포 URL 파싱·검색 E2E PASS + api-contract 실 URL 계약 존재 + 발표 자료 실물 정합 확인.

## 결정 로그
- status: resolved
- 이식 범위: 기존 검증 자산의 복사·연결만, hanipmap 신규 기능 개발 금지 (플레이북 Phase 7 원칙 — 2026-07-19 plan 확정).
- 팀원 GitHub 초대: 결정 아님 — 아이디 3개 수신 대기(외부 입력). 미수신이어도 타 step 진행.
- 그 외: 없음 (저장소·배포·브랜치 전략 7/18 팀 확정, env 등록 완료).

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-19 plan 작성 (승인 대기)
