# ROADMAP

> 마지막 업데이트: 2026-07-15
> 상태: product horizon
> 북극성: 정해진 예산 안에서 오늘 뭘 먹을지 — 학식과 주변 식당을 한 판에 놓고 정해주는 서비스
> line budget: <=150

## Current Horizon

<!-- harness:goal id="product-horizon" -->
목표: 2026-07-25 데모데이에 루브릭 100점 기준으로 심사 가능한 출품작을 낸다 — 배점이 몰린 데이터 파이프라인(20)·처리 깊이(15)·Upstage 활용(20)을 실물로 증명한다.

일정 제약 (`docs/CHALLENGE.md`): 멘토링 사전자료 **7/15 23:59** · 멘토링 7/16~17 · 빌드업 마감 7/24 · 데모데이 7/25.

## Active Milestones

<!-- harness:milestone id="M1" status="completed" priority="P0" evidence="docs/mentoring/2026-07-15-presubmit.md" -->
### M1 — 멘토링 사전자료 제출 (마감 2026-07-15 23:59, 팀 직접 작성)
- DoD: 자문 질문 목록 + 중간 산출물(한입지도 데모 + 방향)을 builderwillow@gmail.com 으로 발송
- Evidence: docs/mentoring/2026-07-15-presubmit.md
- Gap: 멘토는 아이디어 피드백을 하지 않음 — 산출물·개발 질문 필수
- Status: [x]

- Completed at: 2026-07-17
- Summary: 멘토링 사전자료 7/15 발송 확인 — 발송본 레포 보존
<!-- harness:milestone id="M2" status="pending" priority="P0" -->
### M2 — 메뉴판 파싱 PoC ★차별화 축 검증 (ADR-0001)
- DoD: 실제 명륜동 메뉴판 사진 ≥3장 → Document Parse → 메뉴·가격 JSON 추출, 항목 단위 정확도 측정
- Evidence: 입력 사진 + 출력 JSON + 정확도 기록 (`experiments/` 또는 `docs/research/`)
- Gap: 이 가설("사진 속 가격을 파싱으로 해방")이 프로젝트 전체의 승부수인데 아직 미검증
- Status: [ ]

<!-- harness:milestone id="M3" status="pending" priority="P0" -->
### M3 — 파이프라인 3종 통합 (루브릭 35점 구간)
- DoD: ① 사진 제보→파싱→검수→DB ② 학식 크롤러→DB ③ Solar 질의 구조화, 배포 URL에서 E2E 동작
- Evidence: 배포 URL + 재현 명령 + 시연 시나리오
- Gap: "어떤 정보를 어디서 왜 가져와 어떻게 가공하는가" 스토리의 실체
- Status: [ ]

<!-- harness:milestone id="M4" status="pending" priority="P1" -->
### M4 — 데모데이 발표자료 (7/25)
- DoD: 루브릭 6개 항목에 각각 대응하는 슬라이드 + "범용 챗봇 대비 왜 이 서비스인가" 답변 확정
- Evidence: 발표자료 파일
- Gap: Presentation & Documentation 15점
- Status: [ ]

## Next Candidates
- 영수증 파싱·잔여 예산 상태 관리 (리서치 C2 축 — ADR-0001에서 범위 제외로 보류)
- 자연캠(율전) 확장 · 자연캠 학식 페이지 실사 마무리
- Supabase RLS 점검 (pending insert 만 익명 허용)

## Archive Pointer
완료 이력은 `docs/BACKLOG.md` 참조. ROADMAP.md 는 150줄 이하 current horizon 만 유지한다. milestone 완료·compact 는 `/harness` 가 처리한다.

## 의사결정 이력
"왜 X 안 함?", "왜 Y를 미룸?" 같은 의도적 제외는 `docs/adr/` 에 ADR 로.
