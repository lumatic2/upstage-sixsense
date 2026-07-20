# Plan — DR7 팀 공유 패키지 (GitHub 레포 + 웹사이트 링크)

> Milestone: `ROADMAP.md` DR7 · Horizon: `harness:goal id="demoday-run"` (`plans/horizons/demoday-run.md`)
> 위계: Objective(`OBJECTIVE.md`) → Horizon(`plans/horizons/demoday-run.md`) → **Milestone**(이 문서) → Step
> 근거: `docs/adr/0003-no-assembly-build.md` · `docs/team/2026-07-18-decisions.md` §6
> Supersedes: `plans/2026-07-19-dr3-assembly.md` step-2(hanipmap 계약·온보딩) — 이식이 아닌 공유로 대체
> 작성: 2026-07-20 · 팀 구조 전환(ADR-0003)에 따른 재계획 2/2

Status: approved
- Approved: 2026-07-20 사용자 — 위임 범위 A(DR6→DR7 horizon 연쇄), "끝까지 진행"
- Execution mode: continuous
- Stop only on: blocked · decision_required · risk_gate · secret_required
- Rollback/cleanup: 문서 추가·수정만이라 커밋 단위 revert. **공개 레포 push 전 시크릿 스캔 필수**(레포가 public — 되돌릴 수 없는 노출).

## 왜 이 milestone 인가

팀원 각자가 자기 버전을 만들고 **2026-07-23(목) 21:00 미팅**에서 비교·합의한다(ADR-0003). 이 상황에서 공유의 목적은 두 가지다:

1. **팀원이 자기 버전에 반영할 수 있게 한다** — 내가 뚫어놓은 것(메뉴판 파싱, 학식 크롤링, 검수 게이트, Groundedness 검증)을 팀원이 자기 코드에 가져다 쓸 수 있어야 한다. 이식(PR)이 아니라 **읽고 따라할 수 있는 형태**로.
2. **미팅에서 내 버전이 판단 재료가 되게 한다** — 팀원이 링크를 미리 열어보고 오면 비교 논의가 훨씬 구체적이다.

공유 형식은 **GitHub 레포 + 웹사이트 링크** 두 가지로 확정됐다(2026-07-20 사용자). 그런데 현재 레포에는 **`README.md` 가 없다** — 팀원이 GitHub 링크로 들어왔을 때 첫 화면이 비어 있는 상태다.

## 스캐폴딩 결정

**범용 코어 3**
- source-of-truth: 공유 진입점 = 루트 `README.md`(신설). 파이프라인 설명 = `docs/ARCHITECTURE.md`(기존, 링크). 데이터 = 팀 구글 시트(기존).
- 검증: 팀원 관점 실행 — 로그아웃/시크릿 창에서 GitHub 레포 URL 과 사이트 URL 을 열어 **막히는 지점 없이 읽히는지** 실측. 문서에 적은 커맨드는 실제로 1회 실행해 대조.
- 배포/운영: GitHub `github.com/lumatic2/upstage-sixsense`(public) push · 사이트는 기존 배포 유지.

**자기선언 도메인**
- 문서: 루트 `README.md`(신설) · `docs/HANDOFF.md`(신설 — 팀원용 인계 문서). 기존 문서는 링크로 재사용하고 내용을 복제하지 않는다.
- 크레덴셜: 없음(신규). 단 **공개 레포이므로 push 전 시크릿 스캔이 게이트**.
- 외부연동: 없음(신규).
- 검토 후 제외: 팀원 레포 PR(ADR-0003 — 이식 안 함) · GitHub collaborator 초대(내 레포는 public 이라 읽기에 초대 불필요) · 별도 슬라이드 제작(미팅은 사이트를 직접 열어 보여준다 — 발표 자료는 DR6 step-5 소관) · 시트 편집 권한 변경(팀 소유 — 내 결정 아님).

## 범위와 중단점
- 이번 milestone 이 닫는 것: 팀원이 **링크 두 개만 받고도** 내가 만든 것을 이해하고 자기 버전에 가져다 쓸 수 있다.
- 범위 밖: 이식·PR · 제출물 결정(미팅 소관) · 팀원 코드 리뷰.
- 중단점: 시크릿 스캔에서 노출 의심 발견 시 즉시 정지(risk_gate) · 3-strike.

## Step 트리

- [ ] step-1 루트 `README.md` 신설 — 레포 첫 화면
  - Artifact: 팀원이 30초 안에 파악하는 첫 화면 — ① 무엇을 만든 서비스인가(1문단) ② **라이브 링크**(sixsense.askewly.com) ③ 파이프라인 한 장 요약(사진→Document Parse→시트→검수→API→추천→Groundedness) ④ Upstage 제품별 적용 지점 ⑤ 로컬 실행법 ⑥ 문서 지도(PRD·ARCHITECTURE·ADR·OPEN-ISSUES 링크)
  - Files: `README.md`(신설)
  - Dependencies: 없음
  - Verify: 시크릿 창에서 GitHub 레포 URL 을 열어 README 만 읽고 "무엇을·어떻게 만들었는지"가 파악되는지 확인. 적어놓은 로컬 실행 커맨드를 실제로 1회 실행해 문서와 결과 대조
  - Failure probe: README 의 모든 상대 링크·앵커를 GitHub 렌더 화면에서 클릭해 404 가 0 인지 확인(로컬에선 맞고 GitHub 에선 깨지는 경로 적발)
  - Commit: `docs(DR7): README 신설 — 공유 진입점`
- [ ] step-2 `docs/HANDOFF.md` — 팀원용 인계 문서
  - Artifact: "가져다 쓰는 법" 중심 문서 — ① 파이프라인 각 단계에서 **실제로 어려웠던 것과 해법**(Document Parse 정확도 76.4%·프리필 전제, Solar 타임아웃·폴백, 검수 게이트가 왜 필요한가, gviz 헤더 함정) ② 데이터 현황(시트 탭 구조·행 수·검수 상태) ③ 재사용 가능한 파일 지도(`api/`·`scripts/` 무엇이 무엇을 하는가) ④ **팀에 되묻는 항목**: 미검수 5곳(소반·홍순두부·작은마을생선구이·프라이팬·그 남자의 파스타)의 원 출처
  - Files: `docs/HANDOFF.md`(신설) · `README.md`(링크 추가)
  - Dependencies: step-1
  - Verify: 문서에 적은 스크립트 커맨드 중 1개를 실제 실행해 서술과 일치 확인 + 파일 지도의 경로가 전부 실존하는지 대조
  - Failure probe: 문서가 참조하는 경로 중 gitignored·미추적 파일이 섞여 있지 않은지 확인(팀원이 clone 하면 없는 파일)
  - Commit: `docs(DR7): 팀원 인계 문서 — 파이프라인 재사용 가이드`
- [ ] step-3 공개 상태 점검 + 공유 링크 확정
  - Artifact: 시크릿 스캔 클린 확인 → 미푸시 커밋 전량 push → 팀에 보낼 **공유 메시지 초안**(링크 2개 + 한 줄씩 안내 + 되묻는 항목)
  - Files: 없음(운영 작업) · 공유 메시지는 대화로 제시
  - Dependencies: step-1·2 및 DR6 완료분
  - Verify: `git log origin/master..HEAD` 가 비어 있고, 시크릿 창에서 GitHub URL·사이트 URL 둘 다 열려 정상 동작
  - Failure probe: 추적 파일 전체에서 API 키 패턴 스캔 — `UPSTAGE_API_KEY`·`KAKAO_REST_API_KEY`·`SUPABASE_*` 실값이 히스토리에 없는지 확인(공개 레포이므로 노출은 되돌릴 수 없음)
  - Commit: `chore(DR7): 공유 준비 — 공개 상태 점검`

## 검증/DoD
- DoD: 시크릿 창에서 GitHub 레포 URL 과 `sixsense.askewly.com` 을 열었을 때, README→HANDOFF 만 읽고 파이프라인 구조와 재사용 지점이 파악되며 깨진 링크가 0 이다. 시크릿 스캔 클린 + origin 과 로컬이 동기.
- Evidence: 실브라우저 확인 기록 + 스캔 출력 + `git log origin/master..HEAD` 빈 출력.

## 결정 로그
- status: resolved
- 공유 형식: **GitHub 레포 + 웹사이트 링크** 두 가지. 팀원 레포 이식·PR 없음. (2026-07-20 사용자 확정 · ADR-0003)
- 공유 시점: **미팅(7/23 21:00) 전 완성** — 팀원이 미리 보고 오면 비교 논의가 구체적이 된다. (2026-07-20 사용자 확정)
- 미검수 5곳: 내가 판정하지 않고 **팀에 출처를 되묻는 항목**으로 step-2 에 포함. (2026-07-20 사용자 확정)
- 그 외: 없음.

## finding 큐
- (비어 있음)

## 진행 로그 (append-only)
- 2026-07-20 plan 작성 (승인 대기) — ADR-0003 팀 구조 전환에 따른 DR3 step-2 대체
