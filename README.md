# 한입지도 — 예산 안에서 오늘 뭘 먹지

**라이브: https://sixsense.askewly.com** (로그인 없이 전부 열립니다)

성균관대 명륜캠 주변에서 **예산을 넣으면 학식과 식당을 한 판에 놓고 골라주는** 서비스입니다.
AI Document Builders Challenge (Upstage × 대학혁신과공유센터) 출품작.

---

## 이게 왜 필요한가

"만원으로 뭐 먹지"에 답하려면 **주변 식당의 실제 메뉴와 가격**이 필요합니다. 그런데 그 데이터가 세상에 없습니다.

- 네이버 지역검색 API — 가격 필드 자체가 없음
- 착한가격업소 공공데이터 — 극소수 지정 업소만
- **가격은 메뉴판 사진 안에 갇혀 있습니다.**

그래서 이 서비스의 출발점은 검색이 아니라 **사진 수집**입니다.
ChatGPT에 물어보면 오늘 학식도 모르고, 식당 가격은 지어냅니다. 우리는 1차 소스만 씁니다.

## 파이프라인

```
[비정형] 메뉴판 사진 ─→ Document Parse ─→ 메뉴·가격 후보
                                            ↓
                                     시트에 검수=대기로 적재
                                            ↓
                          사람이 원본 사진과 대조 (/review.html)
                                            ↓
                                    검수=확인 ─→ 서비스 노출
[정형]   성대 학식 HTML ─→ 크롤러 ─→ 시트 [학식]
[질의]   "8천원 이하 혼밥" ─→ Solar 구조화 ─→ {예산·도보·태그} ─→ 필터·랭킹
                                                                    ↓
                                        Solar 추천 이유 생성 ─→ 다른 모델이 근거 판정
```

핵심은 두 개의 게이트입니다.

1. **사람 검수 게이트** — 파싱 결과를 바로 쓰지 않습니다. `검수="확인"`이 아닌 행은 API 응답에서 빠집니다. 읽기 경로를 시트 하나로 단일화해 게이트를 우회할 경로 자체를 없앴습니다.
2. **근거 판정 게이트** — 추천 이유를 쓴 모델이 스스로 채점하면 검증이 아닙니다. **생성(solar-pro2)과 판정(solar-mini)을 다른 모델이 맡아** 이유 문장을 실데이터와 대조하고, 근거가 없으면 그 문장을 버립니다. 화면의 "근거 검증됨" 배지가 그 결과입니다.

파이프라인을 직접 돌려보는 페이지가 서비스 안에 있습니다 → **[/verify.html](https://sixsense.askewly.com/verify.html)**

## Upstage 어디에 썼나

| 제품 | 쓴 자리 | 왜 |
|---|---|---|
| Document Parse | 메뉴판 사진 → 메뉴명·가격 (`ocr=force`, `coordinates=true`) | 가격이 사진 안에만 있음. 좌표를 살려야 이름과 가격을 같은 줄로 짝지음 |
| Solar `solar-pro2` | 자연어 질의 구조화 + 추천 이유 생성 | "둘이서 2만원" 인원 나눗셈을 mini는 틀림 |
| Solar `solar-mini` | 추천 이유의 근거 판정 | 생성 모델이 자기 답을 채점하면 검증이 아님 |
| — (안 씀) | 학식 | 이미 표로 정리된 HTML. 사진 파싱을 쓰면 비용만 늘고 정확도는 떨어짐 |

파싱 정확도는 실측했습니다 — 명륜동 실제 메뉴판 5장 / 72항목 기준 **76.4%** (인쇄 책자 100%, 손글씨 57%, 저해상 웹이미지 20%).
그 실패 모드가 "전량 자동 반영은 불가능하다 → 검수 UX가 필수"라는 설계 경계를 만들었습니다. → `experiments/parse-poc/accuracy.md`

## 현재 데이터

식당 24곳 · 메뉴 342행(전량 검수 통과) · 학식 4일치. 정본은 팀 구글 시트입니다.

## 로컬에서 돌리기

```bash
git clone https://github.com/lumatic2/upstage-sixsense.git
cd upstage-sixsense
npm install

# .env 에 키 (커밋 금지)
#   UPSTAGE_API_KEY=...        # Document Parse · Solar
#   KAKAO_REST_API_KEY=...     # 주소 → 좌표
#   KAKAO_JS_KEY=...           # 지도 표시

node scripts/test-side-menu.mjs                              # 단위 테스트
node scripts/demo-smoke.mjs --url https://sixsense.askewly.com   # 배포본 E2E (11항목)
node scripts/test-api-local.mjs parse-query "8천원 이하 혼밥"     # 서버 함수 단독 실행
```

데이터 읽기(`/api/data`)는 공개 시트를 gviz로 읽으므로 **키 없이도 동작**합니다.

## 코드 지도

| 경로 | 무엇 |
|---|---|
| `api/parse-menu.js` | Document Parse 프록시 (사진 → 메뉴 후보) |
| `api/parse-query.js` | Solar 질의 구조화 + 정규식 폴백 |
| `api/recommend.js` | 추천 랭킹 + 이유 생성 + 근거 판정 |
| `api/data.js` · `api/_lib/sheet-data.js` | 시트 읽기 + **검수 게이트** |
| `api/_lib/side-menu.js` | 곁들임(공기밥·음료·토핑) 판정 — 한 곳에서만 내린다 |
| `api/contribute.js` · `api/review.js` | 제보 접수 / 운영진 검수 |
| `scripts/crawl-cafeteria.mjs` | 학식 크롤러 |
| `scripts/batch-parse-to-sheet.mjs` | 사진 배치 파싱 → 시트 적재 |
| `public/` | 화면 5종 (바닐라 JS, 빌드 없음) |

## 문서

- **[docs/HANDOFF.md](docs/HANDOFF.md)** — 가져다 쓰려는 팀원용. 어디서 막혔고 어떻게 풀었는지
- [docs/PRD.md](docs/PRD.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 무엇을·어떻게
- [docs/adr/](docs/adr/) — 되돌리기 어려운 결정과 그 근거
- [docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md) — 지금 열려 있는 것
- [verification/matrix.md](verification/matrix.md) — 주장별로 어떤 커맨드가 무엇을 관측했는지

## 스택

바닐라 JS + Kakao Maps + Vercel serverless functions + 구글 시트(Apps Script 쓰기).
프레임워크 없음 — 남은 기간을 파이프라인에 쓰기로 한 결정입니다([ADR-0001](docs/adr/0001-problem-and-solution-shape.md)).
