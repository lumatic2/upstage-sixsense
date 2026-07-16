# 20260717-parse-menu-api

- Target: M3 step-1 (`docs/plans/2026-07-17-m3-pipeline.md`)
- Scope: `api/parse-menu.js`(신규) + `api/_lib/extract-menu.js`(PoC extractMenu 이식) + `scripts/test-api-local.mjs`(로컬 하니스) + `package.json`(ESM 선언). 효과: 메뉴판 사진 base64 → Document Parse → {name,price}[] 후보 반환(자동 저장 없음 — 프리필 전용).
- Contract: source of truth = 이 레포 `api/`. hanipmap 이식 시 그쪽이 배포 정본이 됨(범위 밖). PoC 스크립트의 extractMenu 는 실험 박제본으로 동결 — 서비스 변경은 `api/_lib/` 만. 키는 `UPSTAGE_API_KEY` env 전용, 업스트림 에러 원문 비노출.
- Verification:
  - [x] targeted test: `node scripts/test-api-local.mjs parse-menu experiments/parse-poc/photos/mujesushi.jpg` → 200 + items 12개 (1.3s)
  - [x] failure probes: no_api_key→500 / bad_type→400 / no_image→400 / GET→405 (`parse-menu-probes` 전항 PASS, exit 0)
  - [x] dirty-tree: 변경 파일이 Scope 목록과 일치 (`git status --short`)
  - [ ] deploy: 스테이징 배포는 M3 step-4 에서
- Status: done (2026-07-17)
