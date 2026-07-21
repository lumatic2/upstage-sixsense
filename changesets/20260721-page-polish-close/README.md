# 20260721-page-polish-close

- Target: DR11 step-6 — 메뉴 찾기·Upstage 절 문구 정리 + 5페이지 통합 검증.
- Scope: `public/about.html` · `public/app.html` · `verification/matrix.md` · `docs/OPEN-ISSUES.md`.

## 고친 문구 (둘 다 사실 오류)

1. **`about.html` — Upstage 키 사용처 목록이 낡았다.** "호출은 전부 서버 함수
   (`/api/parse-menu`·`/api/parse-query`·`/api/recommend`)에서" 라고 적혀 있었는데, **현재 주 Solar
   호출부인 `/api/chat` 이 빠져 있었다.** 대화 기능을 DR9 에서 넣으면서 이 목록을 안 고쳤다.
   `solar-pro2` 의 역할도 "자연어 질의 구조화 + 이유 생성" → "대화 응답 + 조건 구조화 + 이유 생성"
   으로 정정하고, 한 번의 왕복으로 답과 조건을 함께 받는다는 사실을 덧붙였다.
2. **`app.html` — "이 목록에 올라갑니다".** 가리키던 전체 식당 목록은 2026-07-21 에 제거됐다.
   "지도와 추천에 올라갑니다"로 바꾸고 검수 전 미노출을 명시했다.

## 통합 검증 (배포 URL)

| 검사 | 결과 |
|---|---|
| `demo-smoke` | **14/14 PASS** |
| `test-chat-extract` | 35/35 |
| `test-side-menu` | 41/41 |
| `test-personalization` | PASS (ADR-0004 경계) |
| `test-chips` | 18/18 |
| 5페이지 HTTP | 전부 200 · nav 5개 동일 |
| 죽은 링크 | **0** (상대 링크 + 앵커까지 전수) |
| 순서-개인화 주장 | **0건** (잔여 3문장은 전부 부정문·과거형 — 문장 단위로 확인) |
| 콘솔 red | 0 (1440×900 · 390×844) |
| 390px 가로 오버플로 | 0 (랜딩·app·contribute) |

**Failure probe — 배포 반영 확인**: 이번 milestone 이 넣은 문자열 9개(`오늘 문 연 학식당`,
`fitDemoCard`, `flipIfNoRoomAbove`, `collectManual`, `76.4%`, `기억은 하되…` 등)를 배포 URL 에서
직접 조회 — **전부 실려 있음**. 로컬만 통과하고 배포에 빠진 파일 0.

## Verification

- [x] 위 표 전항
- [x] `verification/matrix.md` #133~151 기록
- [x] `docs/OPEN-ISSUES.md` 갱신

- Status: done (2026-07-22)
