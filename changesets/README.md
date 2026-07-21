# changesets/

스킬·스크립트·런타임 유지보수 작업의 status machine. 1 changeset = 1 작업 단위.

각 changeset 은 `<YYYYMMDD>-<slug>/README.md` 형식이며, 템플릿은 [CHANGESET_TEMPLATE.md](CHANGESET_TEMPLATE.md).

## 인덱스

| # | Changeset | 날짜 | Scope | Verification | Status |
|---|-----------|------|-------|--------------|--------|
| 8 | 20260721-tag-word-boundary | 2026-07-21 | 태그를 어절 앞머리에서만 잡는다 (이슈 ⑧ — 합성어 뒤꼬리가 검색 의도로 둔갑) | 3/3 | done |
| 7 | 20260721-personalization-in-chat | 2026-07-21 | 개인화 해명·관리를 에이전트 대화로 · 섹션 노트 중복 제거 · "전부 잊기" 거짓 보고 수정 | 8/8 | done |
| 6 | 20260721-revisit-chip-static-qm | 2026-07-21 | 랜딩 물음표 정적화 · 재방문 조건을 대화 칩으로 · 기록 지우기 이전 | 9/9 | done |
| 5 | 20260721-repo-share-readiness | 2026-07-21 | README·HANDOFF §2·CLAUDE/AGENTS 배너·GitHub 메타 (코드 무변경) | 6/6 | done |
| 4 | 20260717-staging-e2e | 2026-07-17 | test.html·vercel.json·deploy-staging.mjs·E2E 증거 | 3/3 | done |
| 3 | 20260717-cafeteria-crawler | 2026-07-17 | crawl-cafeteria.mjs·db/schema.sql·fixture | 3/3 | done |
| 2 | 20260717-parse-query-api | 2026-07-17 | api/parse-query.js (Solar+폴백) | 3/3 | done |
| 1 | 20260717-parse-menu-api | 2026-07-17 | api/parse-menu.js·_lib/extract-menu.js·test-api-local.mjs | 3/3 (deploy는 step-4) | done |

## 운영 원칙

- 영향 파일과 배포 경로를 먼저 적고 변경한다.
- SKILL.md 변경은 sync 전후 차이를 확인한다.
- 완료 보고 전 targeted test, smoke, sync/deploy evidence 중 해당되는 항목을 기록한다.
- 배포본이 있는 tooling 은 source 파일만 보고 완료 처리하지 않는다.
