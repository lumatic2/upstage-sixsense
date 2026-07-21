# BACKLOG

> 완료·보류·아카이브된 milestone 의 압축 이력. `ROADMAP.md` 는 current horizon 만 담고 150줄 이하로 유지한다.

## Completed

- (아직 없음)

## Deferred

- (아직 없음)

## Notes

- 완료 milestone 은 3~5줄로 압축한다: 완료일, 결과, evidence, 남은 gap.
- active/pending milestone 은 자동 아카이브하지 않는다.
- 이 파일과 ROADMAP.md 의 쓰기 소유자는 `/harness` 이다. `session-end` 는 ROADMAP 을 read-only 로 확인한다.

### 2026-07
- DR1 - DR1 — 실데이터 파이프라인 가동 (사진→파싱→시트, 지오코딩, 학식→시트→DB)
  - Completed: 2026-07-21
  - Result: 실데이터 파이프라인 가동 — 식당5·메뉴76·학식4·좌표5/5, 스테이징 E2E 실측
  - Evidence: plans/2026-07-19-dr1-data-pipeline.md

### 2026-07
- DR2 - DR2 — 개인 버전 웹서비스 빌드 (Upstage 심화 + 인터랙티브 데모)
  - Completed: 2026-07-21
  - Result: 개인 버전 웹서비스 완성 — 배포 URL 시연 시나리오 smoke 11/11, 근거 검증 배지 실동작(판정 5% 실패 수정)
  - Evidence: plans/2026-07-19-dr2-personal-service.md

### 2026-07
- DR4 - DR4 — 제보→검수→승인 루프 (사진 제보 페이지 + 운영진 검수 화면 + 승인 게이트)
  - Completed: 2026-07-22
  - Result: 배포 URL 에서 새 메뉴판 사진 1장이 제보 → Document Parse → 시트 `대기` → `/review.html` 검수 → 서비스 추천 노출까지 한 번의 E2E 로 관측되고, 미검수 데이터가 노출되지 않는 것이 역방향 확인
  - Evidence: `plans/2026-07-20-dr4-contribute-review-loop.md` + `verification/matrix.md`
