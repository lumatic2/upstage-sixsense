# ROADMAP

> 마지막 업데이트: 2026-07-21
> 상태: demoday-run horizon
> 북극성: 정해진 예산 안에서 오늘 뭘 먹을지 — 학식과 주변 식당을 한 판에 놓고 정해주는 서비스
> line budget: <=150

## Current Horizon

<!-- harness:goal id="demoday-run" -->
목표: 7/18 "각자 서비스" 전환 이후 남은 전부를 닫는다 — 실데이터 파이프라인 가동, 개인 버전 웹서비스 완성, **내 버전을 미팅 제출 후보로 완결하고 팀에 공유**. (상세 plan → `plans/horizons/demoday-run.md`)

일정 제약: **팀 합의 미팅 2026-07-23(목) 21:00 = 실질 마감** · 빌드업 마감 7/24 · 데모데이 7/25.
본선 조립본(hanipmap 이식) 전제는 폐기 — `docs/adr/0003-no-assembly-build.md`.

## Active Milestones

<!-- harness:milestone id="DR1" status="completed" priority="P0" evidence="plans/2026-07-19-dr1-data-pipeline.md" -->
### DR1 — 실데이터 파이프라인 가동 (사진→파싱→시트, 지오코딩, 학식→시트→DB)
- DoD: 실사진 유래 식당 ≥5곳 + 좌표 + 학식 실식단이 시트·Supabase 에 있고, 스테이징 검색 E2E 에서 실데이터 관측
- Evidence: plans/2026-07-19-dr1-data-pipeline.md
- Gap: 파이프라인 35점 구간이 아직 fixture — 실데이터가 흘러야 실점수
- Scale: changesets>=3; surfaces: 스크립트 실행 로그·시트·스테이징 URL; capability: 실데이터가 수집→구조화→서비스까지 흐른다
- Status: [x]

- Completed at: 2026-07-19
- Summary: 실데이터 파이프라인 가동 — 식당5·메뉴76·학식4·좌표5/5, 스테이징 E2E 실측
<!-- harness:milestone id="DR2" status="completed" priority="P0" evidence="plans/2026-07-19-dr2-personal-service.md" -->
### DR2 — 개인 버전 웹서비스 빌드 (Upstage 심화 + 인터랙티브 데모)
- DoD: 배포 URL 심사 시연 시나리오(예산→실데이터 추천+이유+Groundedness 배지) Playwright smoke PASS + `verification/matrix.md` 가시화
- Evidence: plans/2026-07-19-dr2-personal-service.md
- Gap: "각자 서비스" 전환 후 개인 버전 미착수 — 루브릭 20점(Upstage)·차별화 축 실현체
- Scale: changesets>=4; surfaces: 배포 URL·Playwright·verification/; capability: 심사 가능한 완결 데모 서비스
- Status: [x]

- Completed at: 2026-07-20
- Summary: 개인 버전 웹서비스 완성 — 배포 URL 시연 시나리오 smoke 11/11, 근거 검증 배지 실동작(판정 5% 실패 수정)
<!-- harness:milestone id="DR4" status="completed" priority="P0" evidence="plans/2026-07-20-dr4-contribute-review-loop.md" -->
### DR4 — 제보→검수→승인 루프 (사진 제보 페이지 + 운영진 검수 화면 + 승인 게이트)
- DoD: 배포 URL 에서 새 메뉴판 사진 1장이 제보 → Document Parse → 시트 `대기` → `/review.html` 검수 → 서비스 추천 노출까지 한 번의 E2E 로 관측되고, 미검수 데이터가 노출되지 않는 것이 역방향 확인
- Evidence: `plans/2026-07-20-dr4-contribute-review-loop.md` + `verification/matrix.md`
- Gap: Document Parse(대회 하드 요건 제품)가 실서비스 화면 어디에도 노출되지 않고, `loadSheetData` 가 시트 검수 값을 필터링하지 않아 미검수 행이 그대로 추천에 나감(실측: [메뉴] 189행 중 대기 189·확인 1)
- Scale: changesets>=4; surfaces: 배포 URL·구글 시트·verification/; capability: 데이터 생산과 품질 게이트가 제품 안에서 닫힌다
- Status: [x]

- Completed at: 2026-07-20
<!-- harness:milestone id="DR5" status="completed" priority="P0" evidence="plans/2026-07-20-dr5-site-completion.md" -->
### DR5 — 페이지 구조 완성 + 재방문 개인화
- DoD: 배포 URL 에서 `docs/SITEMAP.md` 공개 5페이지가 전부 살아 있고 nav·푸터에 죽은 링크 0, 재방문 시 추천이 실제로 달라지는 것 관측 + smoke PASS
- Evidence: `plans/2026-07-20-dr5-site-completion.md` + `verification/matrix.md`
- Gap: nav 의 `about.html#upstage` 가 깨진 링크(앵커 부재)이고 `/app.html` 만 랜딩 디자인과 톤이 어긋나며, 재방문자 개인화가 없다
- Scale: changesets>=4; surfaces: 배포 URL·Playwright·verification/; capability: 사용자 여정 5페이지가 일관되게 완결된다
- Status: [x]

- Completed at: 2026-07-20
<!-- harness:milestone id="DR3" status="archived" priority="P1" evidence="docs/adr/0003-no-assembly-build.md" -->
### DR3 — 본선 조립 (hanipmap 이식·API 계약·온보딩) — **폐기 2026-07-20**
- 폐기 사유: 대표 조립본 전제가 사라짐. 팀은 각자 버전을 7/23(목) 21:00 미팅에서 비교·합의해 제출물을 정한다 → 이식 대상이 존재하지 않는다.
- Evidence: `docs/adr/0003-no-assembly-build.md`
- 대체: DR6(내 버전 완결) · DR7(팀 공유). 구 step-3(발표 자료 실물 정합)은 DR6 step-5 로 승계.
- Status: [-]
<!-- harness:milestone id="DR6" status="completed" priority="P0" evidence="verification/matrix.md #58-72" -->
### DR6 — 내 버전 완결 (미팅 제출 후보 확정판)
- DoD: 배포 URL 에서 ① 저예산 검색에 사이드 단독 pick 0건 ② `/api/data` 가 시트 단일 경로로 검수 통과분만 반환 ③ 5페이지 톤 일관·콘솔 red 0 ④ 발표 자료 수치·URL 이 실물과 불일치 0 + `demo-smoke` PASS
- Evidence: verification/matrix.md #58-72
- Gap: 7/23 미팅이 실질 마감인데 사이드 메뉴가 한 끼로 추천되고(OPEN-ISSUES ③) 검수 게이트 없는 코드 경로가 남아 있으며(④) 제보 좌표가 미배선(⑤)
- Scale: changesets>=4; surfaces: 배포 URL·Playwright·docs/presentation; capability: 미팅에서 그대로 열어 보여줄 수 있는 완결 서비스
- Status: [x]
- Completed at: 2026-07-21
- Summary: 내 버전 완결 — 곁들임 오추천을 5개 노출면 전부에서 제거, 시트 SSOT 단일화, 모바일 붕괴·발표 수치 정합 (smoke 11/11, 독립 검증 3차 confirmed)
<!-- harness:milestone id="DR7" status="completed" priority="P0" evidence="https://github.com/lumatic2/upstage-sixsense + docs/HANDOFF.md" -->
### DR7 — 팀 공유 패키지 (GitHub 레포 + 웹사이트 링크)
- DoD: 시크릿 창에서 공개 레포 URL·사이트 URL 을 열어 README→HANDOFF 만으로 파이프라인 구조·재사용 지점이 파악되고 깨진 링크 0 + 시크릿 스캔 클린 + origin 동기
- Evidence: https://github.com/lumatic2/upstage-sixsense + docs/HANDOFF.md
- Gap: 공유 형식이 레포·사이트 링크로 확정됐는데 루트 `README.md` 가 아예 없다 — 팀원이 GitHub 링크로 들어오면 첫 화면이 비어 있음
- Scale: changesets>=2; surfaces: 공개 레포 렌더 화면·배포 URL; capability: 링크 두 개만으로 팀원이 가져다 쓸 수 있다
- Status: [x]

- Completed at: 2026-07-21
- Summary: 팀 공유 패키지 — README·HANDOFF 신설 후 공개 레포 푸시, 링크 9/9 정상·시크릿 스캔 클린·origin 동기
<!-- harness:milestone id="DR8" status="completed" priority="P0" evidence="verification/matrix.md #73-89" -->
### DR8 — 메뉴 찾기 화면을 에이전트 콘솔로 + 히어로 카드 안정화
- DoD: 배포 URL 에서 ① 헤더 `한입지도 열기` 0건·통계 라벨 3개 정정 ② 390px 히어로 카드에서 지도 렌더·카드 높이 불변·스크롤바 0 ③ `/app.html` 대화 입력 → 실 API 왕복 → 추천 카드+근거 배지가 데스크톱·모바일 각 1회 관측 ④ `demo-smoke` PASS·콘솔 red 0
- Evidence: verification/matrix.md #73-89
- Gap: 미팅에서 열어 보여줄 `/app.html` 이 랜딩 데모 카드보다 품질이 낮고, 모바일 히어로는 미디어쿼리 소스 순서 탓에 지도가 0px 로 사라지고 대화가 늘 때마다 카드가 팽창한다
- Scale: changesets>=3; surfaces: 배포 URL(데스크톱·모바일)·Playwright·verification/; capability: 서비스 화면이 소개 페이지 목업과 같은 품질로 실제 동작한다
- Status: [x]

- Completed at: 2026-07-21
- Summary: 에이전트 콘솔 재구성 + 모바일 히어로 복구 — 실 API 왕복·근거 배지 렌더, 카드 높이 고정, smoke 11/11(허수 아님 검증)
<!-- harness:milestone id="DR9" status="completed" priority="P0" evidence="verification/matrix.md #90-112" -->
### DR9 — 진짜 Solar 대화 + 지도 마커 카드 + 학식 정본화
- DoD: 배포 URL 에서 ① 같은 질문에 매번 다른 문장이 오고 `/api/chat` 호출 관측 ② 마커 클릭으로 메뉴 카드 열림·닫힘 ③ 학식이 정식 명칭 4곳·당일치만·휴무 표시 ④ 하단 전체 목록 없음 ⑤ smoke PASS·콘솔 red 0
- Evidence: verification/matrix.md #90-112
- Gap: 대화창이 Solar 로 조건만 뽑고 문장은 코드에 박힌 템플릿이라 "에이전트와 대화한다"는 주장이 실제와 다르다(사용자 dogfood 지적). 지도 마커는 눌러지지 않고, 학식은 `패컬티 · 코너` 라는 실재하지 않는 이름으로 지난 날짜까지 나온다
- Scale: changesets>=4; surfaces: 배포 URL(데스크톱·모바일)·Playwright·verification/; capability: 심사위원이 가장 먼저 만지는 표면이 실제로 AI 와 대화한다
- Status: [x]

- Completed at: 2026-07-21
- Summary: 진짜 Solar 대화(/api/chat)·지도 마커 카드·학식 정본화 — 독립 검증 5회(4회 반증 후 확인), smoke 14/14
## Completed (product-horizon)

<!-- harness:milestone id="M1" status="completed" priority="P0" evidence="docs/mentoring/2026-07-15-presubmit.md" -->
### M1 — 멘토링 사전자료 제출 (마감 2026-07-15 23:59, 팀 직접 작성)
- DoD: 자문 질문 목록 + 중간 산출물(한입지도 데모 + 방향)을 builderwillow@gmail.com 으로 발송
- Evidence: docs/mentoring/2026-07-15-presubmit.md
- Gap: 멘토는 아이디어 피드백을 하지 않음 — 산출물·개발 질문 필수
- Status: [x]

- Completed at: 2026-07-17
- Summary: 멘토링 사전자료 7/15 발송 확인 — 발송본 레포 보존
<!-- harness:milestone id="M2" status="completed" priority="P0" evidence="experiments/parse-poc/accuracy.md" -->
### M2 — 메뉴판 파싱 PoC ★차별화 축 검증 (ADR-0001)
- DoD: 실제 명륜동 메뉴판 사진 ≥3장 → Document Parse → 메뉴·가격 JSON 추출, 항목 단위 정확도 측정
- Evidence: experiments/parse-poc/accuracy.md
- Gap: 이 가설("사진 속 가격을 파싱으로 해방")이 프로젝트 전체의 승부수인데 아직 미검증
- Status: [x]

- Completed at: 2026-07-17
- Summary: 정확도 76.4% (70~90 밴드) — 프리필+사용자수정 전제로 M3 진행
<!-- harness:milestone id="M3" status="completed" priority="P0" evidence="research/2026-07-17-m3-e2e.md" -->
### M3 — 파이프라인 3종 통합 (루브릭 35점 구간)
- DoD: ① 사진 제보→파싱→검수→DB ② 학식 크롤러→DB ③ Solar 질의 구조화, 배포 URL에서 E2E 동작
- Evidence: research/2026-07-17-m3-e2e.md
- Gap: "어떤 정보를 어디서 왜 가져와 어떻게 가공하는가" 스토리의 실체
- Status: [x]

- Completed at: 2026-07-17
- Summary: 파이프라인 3종 스테이징 배포 URL E2E PASS (DB는 fixture — 팀 권한 대기)
<!-- harness:milestone id="M4" status="completed" priority="P1" evidence="docs/presentation/" -->
### M4 — 데모데이 발표자료 (7/25)
- DoD: 루브릭 6개 항목에 각각 대응하는 슬라이드 + "범용 챗봇 대비 왜 이 서비스인가" 답변 확정
- Evidence: docs/presentation/
- Gap: Presentation & Documentation 15점
- Status: [x]

- Completed at: 2026-07-17
- Summary: 루브릭 6/6 발표 원고 + 시연 시나리오·Q&A (리허설 완료)
## Next Candidates
- 영수증 파싱·잔여 예산 상태 관리 (리서치 C2 축 — ADR-0001에서 범위 제외로 보류)
- 자연캠(율전) 확장 · 자연캠 학식 페이지 실사 마무리
- Supabase RLS 점검 (pending insert 만 익명 허용)

## Archive Pointer
완료 이력은 `docs/BACKLOG.md` 참조. ROADMAP.md 는 150줄 이하 current horizon 만 유지한다. milestone 완료·compact 는 `/harness` 가 처리한다.

## 의사결정 이력
"왜 X 안 함?", "왜 Y를 미룸?" 같은 의도적 제외는 `docs/adr/` 에 ADR 로.
