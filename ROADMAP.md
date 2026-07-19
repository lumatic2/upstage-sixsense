# ROADMAP

> 마지막 업데이트: 2026-07-19
> 상태: demoday-run horizon
> 북극성: 정해진 예산 안에서 오늘 뭘 먹을지 — 학식과 주변 식당을 한 판에 놓고 정해주는 서비스
> line budget: <=150

## Current Horizon

<!-- harness:goal id="demoday-run" -->
목표: 7/18 "각자 서비스" 전환 이후 남은 전부를 데모데이(7/25)까지 닫는다 — 실데이터 파이프라인 가동, 개인 버전 웹서비스 완성, 본선 조립본 보장. (상세 plan → `plans/horizons/demoday-run.md`)

일정 제약 (`docs/CHALLENGE.md`): 빌드업 마감 7/24 · 데모데이 7/25.

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
<!-- harness:milestone id="DR2" status="active" priority="P0" evidence="plans/2026-07-19-dr2-personal-service.md" -->
### DR2 — 개인 버전 웹서비스 빌드 (Upstage 심화 + 인터랙티브 데모)
- DoD: 배포 URL 심사 시연 시나리오(예산→실데이터 추천+이유+Groundedness 배지) Playwright smoke PASS + `verification/matrix.md` 가시화
- Evidence: `plans/2026-07-19-dr2-personal-service.md` + smoke 결과·스크린샷
- Gap: "각자 서비스" 전환 후 개인 버전 미착수 — 루브릭 20점(Upstage)·차별화 축 실현체
- Scale: changesets>=4; surfaces: 배포 URL·Playwright·verification/; capability: 심사 가능한 완결 데모 서비스
- Status: [ ]

<!-- harness:milestone id="DR3" status="pending" priority="P1" evidence="plans/2026-07-19-dr3-assembly.md" -->
### DR3 — 본선 조립 (hanipmap 이식·API 계약·온보딩)
- DoD: hanipmap 배포 URL 파싱·검색 E2E PASS + api-contract 실 URL 계약 + 발표 자료 실물 정합
- Evidence: `plans/2026-07-19-dr3-assembly.md` + hanipmap PR·E2E 관측
- Gap: 대표 조립본 보장 책임(7/18 §6) — 이식 4항목 미실행
- Scale: changesets>=2; surfaces: hanipmap 배포 URL·docs; capability: 팀이 그 위에서 작업 가능한 대표 버전
- Status: [ ]

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
