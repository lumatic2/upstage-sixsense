# changesets/

스킬·스크립트·런타임 유지보수 작업의 status machine. 1 changeset = 1 작업 단위.

각 changeset 은 `<YYYYMMDD>-<slug>/README.md` 형식이며, 템플릿은 [CHANGESET_TEMPLATE.md](CHANGESET_TEMPLATE.md).

## 인덱스

| # | Changeset | 날짜 | Scope | Verification | Status |
|---|-----------|------|-------|--------------|--------|
| 2 | 20260717-parse-query-api | 2026-07-17 | api/parse-query.js (Solar+폴백) | 3/3 | done |
| 1 | 20260717-parse-menu-api | 2026-07-17 | api/parse-menu.js·_lib/extract-menu.js·test-api-local.mjs | 3/3 (deploy는 step-4) | done |

## 운영 원칙

- 영향 파일과 배포 경로를 먼저 적고 변경한다.
- SKILL.md 변경은 sync 전후 차이를 확인한다.
- 완료 보고 전 targeted test, smoke, sync/deploy evidence 중 해당되는 항목을 기록한다.
- 배포본이 있는 tooling 은 source 파일만 보고 완료 처리하지 않는다.
