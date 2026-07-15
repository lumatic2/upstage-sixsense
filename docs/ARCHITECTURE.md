# 아키텍처

> 2026-07-15 1차 스캐폴딩. 팀원 데모(hanipmap: 바닐라 JS + Naver Maps + Supabase + Vercel functions)를 기반으로 Upstage 파이프라인을 얹는다.

## 데이터 흐름

```
[제보] 메뉴판 사진 → /api/parse-menu (Document Parse) → 메뉴·가격 후보 → 사용자 확인/수정 → Supabase(status=pending) → 승인 → approved
[학식] 성대 학식 페이지(welfare_11.do, HTML 표) → 크롤러(스케줄) → 구조화 → Supabase
[검색] 자연어 질의 → /api/parse-query (Solar → JSON: 예산·도보·태그) → 클라이언트 필터 + 예산 조합 계산 → 추천 + Solar 추천 이유
```

## 구성

- **프론트**: hanipmap 데모 유지 (바닐라 JS + Naver Maps). Next.js 전환은 하지 않는다 — 데모가 이미 동작하고, 남은 9일은 파이프라인(35점 구간)에 쓴다.
- **서버**: Vercel serverless functions (`api/`). 기존 `api/search.js`(네이버 지역검색 프록시) 패턴을 따라 `api/parse-menu.js`, `api/parse-query.js` 추가.
- **DB**: Supabase `restaurants` (기존). 학식용 `cafeteria_menus` 추가 예정.
- **크롤러**: 학식 페이지가 JS 팝업/쿼리 기반이라 단순 GET 불충분할 수 있음 — 쿼리 파라미터 direct GET 먼저 시도, 안 되면 Playwright (실사 리서치 4/4 참조).

## 외부 의존성

- Upstage Document Parse ($0.01/p, $10 무료 크레딧) / Solar — 선택 근거 ADR-0001
- Naver Maps JS + Local Search API (기존 데모)
- Supabase (기존 데모 — 팀 결정, dev-stack 기본과 다르지만 데모 유지가 우선)

## 보안 주의 (데모에서 관측된 것)

- Upstage API 키는 **반드시 서버 함수에서만** (기존 네이버 키 패턴과 동일). 클라이언트 노출 금지.
- Supabase publishable key가 클라이언트에 있음(정상 패턴이나) — `restaurants` insert가 익명 허용이므로 **RLS로 pending만 insert 가능하게** 확인 필요. 승인(approved 전환)은 서비스 키 경로로만.
