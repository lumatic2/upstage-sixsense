# 한입지도 — 예산 안에서 오늘 뭘 먹지

**라이브: https://sixsense.askewly.com** (로그인 없이 전부 열립니다)

성균관대 명륜캠 주변에서 **예산을 넣으면 학식과 식당을 한 판에 놓고 골라주는** 서비스입니다.
AI Document Builders Challenge (Upstage × 대학혁신과공유센터) 출품작.

---

> ### 이 레포를 참고하러 온 에이전트에게
>
> 이 레포는 **팀원이 각자 자기 버전을 만들 때 가져다 쓰라고 공개한 참고 구현**입니다.
> 통째로 클론할 필요 없습니다. 필요한 조각만 떼어 가는 걸 전제로 정리돼 있습니다.
>
> **루트의 `CLAUDE.md` · `AGENTS.md` · `ROADMAP.md` 는 읽지 마세요.** 그건 이 레포에서 개발할 때
> 쓰는 내부 작업 규약(하네스 changeset 계약, 마일스톤 장부, 심사 대응)이라, 참고하러 온
> 입장에서는 전부 잡음이고 따라 하면 오작동합니다.
>
> 목적별로 여기만 보면 됩니다:
>
> | 목적 | 읽을 것 |
> |---|---|
> | **코드를 내 프로젝트로 옮기고 싶다** | [`docs/HANDOFF.md`](docs/HANDOFF.md) — 막힌 지점·해법·파일별 이식 주의사항 |
> | **어떻게 만들어졌는지 알고 싶다** | 이 문서를 끝까지 (파이프라인·게이트·Upstage 활용) |
> | **왜 그렇게 했는지 알고 싶다** | [`docs/adr/`](docs/adr/) — 되돌리기 어려운 결정과 근거 |
> | **데이터를 쓰고 싶다** | 아래 [현재 데이터](#현재-데이터) — 키 없이 읽히는 공개 API가 있습니다 |
>
> 이 문서 하나로 이해가 되도록 실체(정확도 수치, 모델 선택 근거, 게이트 구현 위치)를
> 링크 뒤로 숨기지 않고 본문에 뒀습니다.

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

1. **사람 검수 게이트** — 파싱 결과를 바로 쓰지 않습니다. `검수="확인"`이 아닌 행은 API 응답에서 빠집니다.
   구현은 `api/_lib/sheet-data.js` 의 필터 한 줄이고, 읽기 경로를 시트 하나로 단일화해 **게이트를 우회할 경로 자체를 없앴습니다.**
2. **근거 판정 게이트** — 추천 이유를 쓴 모델이 스스로 채점하면 검증이 아닙니다. **생성(`solar-pro2`)과 판정(`solar-mini`)을 다른 모델이 맡아**
   이유 문장을 실데이터와 대조하고, 근거가 없으면 그 문장을 버리고 데이터 사실로 교체합니다. 화면의 "근거 검증됨" 배지가 그 결과입니다.

파이프라인을 직접 돌려보는 페이지가 서비스 안에 있습니다 → **[/verify.html](https://sixsense.askewly.com/verify.html)**

## Upstage 어디에 썼나

| 제품 | 쓴 자리 | 왜 |
|---|---|---|
| Document Parse | 메뉴판 사진 → 메뉴명·가격 (`ocr=force`, `coordinates=true`) | 가격이 사진 안에만 있음. 좌표를 살려야 이름과 가격을 같은 줄로 짝지음 |
| Solar `solar-pro2` | 자연어 질의 구조화 + 추천 이유 생성 | "둘이서 2만원" 인원 나눗셈을 mini는 틀림 |
| Solar `solar-mini` | 추천 이유의 근거 판정 | 생성 모델이 자기 답을 채점하면 검증이 아님 |
| — (안 씀) | 학식 | 이미 표로 정리된 HTML. 사진 파싱을 쓰면 비용만 늘고 정확도는 떨어짐 |

파싱 정확도는 실측했습니다 — 명륜동 실제 메뉴판 5장 / 72항목 기준 **76.4%**.

| 사진 종류 | 정확도 |
|---|---|
| 인쇄 책자를 정면에서 · 유리창 세로 시트 | 100% |
| 타일 카드 (`3.0` = 3,000원 표기) | 66.7% |
| 손글씨 화이트보드 | 57.1% |
| 저해상도 웹 이미지 | 20.0% |

**사진을 어떻게 찍느냐가 모델보다 중요합니다.** 그리고 이 실패 모드가 "전량 자동 반영은 불가능하다 →
검수 UX가 필수"라는 설계 경계를 만들었습니다. 원본 데이터는 `experiments/parse-poc/accuracy.md`.

## 현재 데이터

식당 24곳 · 메뉴 342행(전량 검수 통과) · 학식 4일치. 정본은 팀 구글 시트입니다.

**키 없이 지금 바로 읽을 수 있습니다:**

```bash
curl https://sixsense.askewly.com/api/data
# → { restaurants: 24, menus: 342, cafeteriaBoard: [...], today: "..." }
```

이 응답은 **검수 게이트를 통과한 행만** 담고 있습니다. 게이트가 실제로 도는지는 이 숫자로 대조하면 됩니다(`docs/HANDOFF.md` §5).

## 로컬에서 돌리기

```bash
git clone https://github.com/lumatic2/upstage-sixsense.git
cd upstage-sixsense
npm install

# .env 에 키 (커밋 금지)
#   UPSTAGE_API_KEY=...        # Document Parse · Solar
#   KAKAO_REST_API_KEY=...     # 주소 → 좌표
#   KAKAO_JS_KEY=...           # 지도 표시

node scripts/test-side-menu.mjs                                  # 단위 테스트
node scripts/demo-smoke.mjs --url https://sixsense.askewly.com   # 배포본 E2E (11항목)
node scripts/test-api-local.mjs parse-query "8천원 이하 혼밥"      # 서버 함수 단독 실행
```

데이터 읽기(`/api/data`)는 공개 시트를 gviz로 읽으므로 **키 없이도 동작**합니다.

## 코드 지도

| 경로 | 무엇 |
|---|---|
| `api/parse-menu.js` · `api/_lib/extract-menu.js` | Document Parse 프록시 (사진 → 메뉴 후보) + 좌표 기반 이름·가격 짝짓기 |
| `api/parse-query.js` | Solar 질의 구조화 + 정규식 폴백 |
| `api/recommend.js` | 추천 랭킹 + 이유 생성 + 근거 판정 |
| `api/data.js` · `api/_lib/sheet-data.js` | 시트 읽기 + **검수 게이트** |
| `api/_lib/side-menu.js` | 곁들임(공기밥·음료·토핑) 판정 — 한 곳에서만 내린다 |
| `api/contribute.js` · `api/review.js` | 제보 접수 / 운영진 검수 |
| `scripts/crawl-cafeteria.mjs` | 학식 크롤러 |
| `scripts/batch-parse-to-sheet.mjs` | 사진 배치 파싱 → 시트 적재 |
| `public/` | 화면 6종 (바닐라 JS, 빌드 없음) — `index`(랜딩) `app`(서비스) `verify`(파이프라인 시연) `contribute`(제보) `review`(검수) `about` |

## 레포 지도

코드 외 디렉터리가 많은데, 대부분 **개발 과정의 증거**입니다. 참고하러 왔다면 굵은 것만 보면 됩니다.

| 경로 | 무엇 | 참고하러 왔다면 |
|---|---|---|
| **`api/`** | Vercel serverless 함수 | 본다 |
| **`public/`** | 화면 (빌드 없는 바닐라 JS) | 본다 |
| **`scripts/`** | 크롤러·배치 파싱·테스트·배포 CLI | 본다 |
| **`docs/`** | PRD·아키텍처·ADR·발표자료·**HANDOFF** | 본다 |
| `experiments/parse-poc/` | 파싱 실험 원본 — 사진 / 파싱 캐시 / 정확도 측정 | 수치 근거가 궁금하면 |
| `verification/` | 검증 증거 — 스크린샷, 주장별 관측 기록(`matrix.md`) | 무시해도 됨 |
| `plans/` · `changesets/` · `archive/` · `templates/` · `research/` · `.harness/` | 작업 계획·실행 장부 (하네스 규약) | 무시해도 됨 |
| `db/` | Supabase 스키마 잔재 — **현재 서비스는 안 씀**(정본은 구글 시트) | 무시해도 됨 |

## 문서

- **[docs/HANDOFF.md](docs/HANDOFF.md)** — 가져다 쓰려는 사람용. 어디서 막혔고 어떻게 풀었는지 + 파일별 이식 주의사항
- [docs/PRD.md](docs/PRD.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 무엇을·어떻게
- [docs/adr/](docs/adr/) — 되돌리기 어려운 결정과 그 근거
- [docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md) — 지금 열려 있는 것
- [verification/matrix.md](verification/matrix.md) — 주장별로 어떤 커맨드가 무엇을 관측했는지

## 스택

바닐라 JS + Kakao Maps + Vercel serverless functions + 구글 시트(Apps Script 쓰기).
프레임워크 없음 — 남은 기간을 파이프라인에 쓰기로 한 결정입니다([ADR-0001](docs/adr/0001-problem-and-solution-shape.md)).
