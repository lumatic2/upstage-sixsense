# 20260717-cafeteria-crawler

- Target: M3 step-3 (`docs/plans/2026-07-17-m3-pipeline.md`)
- Scope: `scripts/crawl-cafeteria.mjs`(신규) + `db/schema.sql`(cafeteria_menus, b안) + `db/fixtures/cafeteria-sample.json`(실구동 산출). 효과: 인사캠 학식 4곳 식단·가격 자동 수집 → 추천 풀 통합 준비.
- Contract: **direct GET 성공 — Playwright 불필요** (실사: "메뉴 보기"는 GET 폼 listForm → `mode=info&conspaceCd&srResId&srShowTime&srCategory&srDt` 쿼리 재현). 학식에 Document Parse 미사용(ADR-0001). 팀 Supabase 적용은 스키마 주인 승인 후 — schema.sql 은 준비본, RLS 는 읽기 공개 + anon insert 금지.
- Verification:
  - [x] targeted test: `node scripts/crawl-cafeteria.mjs --date 2026-07-17 --out db/fixtures/cafeteria-sample.json` → status ok, 4 records(패컬티 중식 주간, 가격 9000 전량), 필드 = schema 일치
  - [x] failure probe: `--date 2026-08-02`(방학 빈 날짜) → `status:"empty", records:[]` — 에러 아님 · 타 식당 0건은 파서 미스가 아니라 실제 미등록(방학 중 패컬티만 운영, 응답 원문 확인)
  - [x] dirty-tree: 변경 파일 Scope 일치
- 잔여: 학기 중 금잔디/법고을/은행골 데이터 형태 재확인(방학이라 미관측 — 기존 리서치 §5 잔여와 동일 성격), 자연캠(welfare_11_1.do)은 범위 밖.
- Status: done (2026-07-17)
