# 아키텍처

> 2026-07-15 1차 스캐폴딩. 팀원 데모(hanipmap: 바닐라 JS + Vercel functions)를 기반으로 Upstage 파이프라인을 얹는다.
> **2026-07-20 갱신(DR6 step-2)**: 데이터 정본이 Supabase → **구글 시트 단일**로 확정됐다(아래 §데이터 정본).
> 지도 제공자는 Kakao 다(ADR-0002) — 아래 본문의 Naver 표기는 7/15 시점 기록.

## 데이터 흐름

```
[제보] 메뉴판 사진 → /api/parse-menu (Document Parse) → 메뉴·가격 후보 → 시트 [메뉴](검수=대기)
                  → /review.html 사람 대조 → 검수=확인 → 서비스 노출
[학식] 성대 학식 페이지(welfare_11.do, HTML 표) → 크롤러(스케줄) → 구조화 → 시트 [학식]
[검색] 자연어 질의 → /api/parse-query (Solar → JSON: 예산·도보·태그) → /api/recommend
                  → 검수 통과분만 필터 + 곁들임 제외 → 추천 + Solar 이유 + 근거 검증 배지
```

## 데이터 정본 (2026-07-20 확정)

**구글 시트가 유일한 정본이다.** 서비스 읽기 경로는 `api/_lib/sheet-data.js`(gviz CSV) 하나뿐이고,
쓰기는 Apps Script 웹훅(`api/_lib/sheet-write.js`)을 거친다.

`api/data.js` 에 있던 Supabase 우선 경로는 제거했다 — 그 경로엔 검수 게이트가 없었고, `menus`
테이블에 `review` 열 자체가 없어 필터를 걸 수도 없었다. env 하나가 켜지면 "사람이 확인한 것만
노출한다"는 주장이 조용히 깨지는 구조였다. `scripts/sync-sheet-to-db.mjs` 와 `db/` 는 남아 있으나
**현재 서비스 경로에서 쓰이지 않는다**.

## 구성

- **프론트**: hanipmap 데모 유지 (바닐라 JS + Naver Maps). Next.js 전환은 하지 않는다 — 데모가 이미 동작하고, 남은 9일은 파이프라인(35점 구간)에 쓴다.
- **서버**: Vercel serverless functions (`api/`). 기존 `api/search.js`(네이버 지역검색 프록시) 패턴을 따라 `api/parse-menu.js`, `api/parse-query.js` 추가.
- **데이터**: 구글 시트 [식당]·[메뉴]·[학식] 탭 (위 §데이터 정본). Supabase 는 미사용.
- **크롤러**: 학식 페이지가 JS 팝업/쿼리 기반이라 단순 GET 불충분할 수 있음 — 쿼리 파라미터 direct GET 먼저 시도, 안 되면 Playwright (실사 리서치 4/4 참조).

## 외부 의존성

- Upstage Document Parse ($0.01/p, $10 무료 크레딧) / Solar — 선택 근거 ADR-0001
- Naver Maps JS + Local Search API (기존 데모)
- 구글 시트 + Apps Script 웹훅 (팀 정본 — Supabase 는 2026-07-20 서비스 경로에서 제외)

## 보안 주의 (데모에서 관측된 것)

- Upstage API 키는 **반드시 서버 함수에서만** (기존 네이버 키 패턴과 동일). 클라이언트 노출 금지.
- 시트 쓰기 토큰(`SHEET_WEBHOOK_TOKEN`)·검수 토큰(`REVIEW_TOKEN`)은 서버 함수에서만 읽는다. 검수 화면(`/review.html`)은 운영진 전용.
- (구 Supabase RLS 주의 항목은 서비스 경로 제외로 해당 없음 — 2026-07-20)
