# 심사 루브릭 + 우리 대응 (총 100점)

> **누구에게**: 발표자·팀원에게. 무엇이 몇 점이고, 우리 답이 발표자료(「식스센스 발표.pdf」) 어느 쪽에 있는지.
> **출처**: 대회 공식 심사기준(`docs/CHALLENGE.md`). 내용·수치의 정본은 [`../SERVICE-SPEC.md`](../SERVICE-SPEC.md), 발표 멘트는 [`slides-script.md`](slides-script.md).

| 심사항목 | 심사기준 | 배점 | 우리 답 (PDF쪽 / SPEC) | 실행 가능한 증거 |
|---|---|---:|---|---|
| **Service Differentiation** | 범용 LLM 대비 서비스 차별성 | 5 | 3쪽 vs표·8쪽 4겹 / SPEC §2·§7 — "가격은 웹에 없다, 우리가 만들었다" | 랜딩 듀오카드(챗봇 실답변 대비) |
| | 문제 정의의 구체성 및 타깃 명확성 | 5 | 2쪽 / SPEC §2 — 명륜캠 학생, 하루 두 번 | — |
| **Data Architecture & Process** | **정보 처리 파이프라인 설계 및 관리** | **20** | 5쪽 흐름도 + 6쪽 데이터 구조 / SPEC §4·§5 — 입력 3갈래 → 검수 한 문 → 서비스, 모든 행이 출처·검수·촬영일 보유 | `/about.html` 흐름도 + 시트 실물 |
| **Solution Depth** | **정보 처리의 깊이 및 정교성** | **15** | 8쪽 환각 4겹·9쪽 정확도 해석·10쪽 시행착오 / SPEC §7·§8·§9 | `verification/matrix.md`, smoke 결함주입 FAIL 확인 기록 |
| **Effective Use of Upstage** | 목적에 적합한 제품 적용 | 10 | 7쪽 4자리 표 + **"학식엔 안 씀"**(가려 쓴 판단) / SPEC §6 | `/about.html` Upstage 표·실행 블록 |
| | 기술 적용 결과의 기여도 | 10 | 7쪽·9쪽 — 모델 선택 실측(mini 환각→pro2)·응답 박제 재현성 | changeset 기록, 0%→62.5%→76.4% |
| **Service Impact** | 실용성 및 활용 가능성 | 10 | 11쪽 시연 / 라이브 URL·시연 영상 | sixsense.askewly.com 라이브 |
| | 서비스 논리의 타당성 | 5 | 2·3쪽 / SPEC §1·§7 | — |
| | 서비스 임팩트 및 확장성 | 5 | 13쪽 — 같은 파이프라인, 자연과학캠퍼스 | SPEC §12 |
| **Presentation & Documentation** | 발표 전달력 및 태도 | 5 | 발표자 + [`slides-script.md`](slides-script.md) 리허설 | — |
| | 발표 자료의 논리 및 완성도 | 10 | PDF 14장 전체 (문제→해법→파이프라인→검증→실측→시연→한계) | — |

## 어디에 힘을 싣나

- **데이터 처리 35점(파이프라인 20 + 깊이 15) + Upstage 20점 = 55점.** 발표 시간의 절반 이상(5·7·8·9·10쪽)을 여기 쓴다.
- **UI 완성도는 직접 배점 0점** — Service Impact·발표로만 간접 반영. 화면 예쁜 것보다 **파이프라인이 도는 증거**.
- 승부처 한 줄: **"그냥 ChatGPT에 물어보면 되지 않나?"** 에 실물(사진 유래 가격·당일 학식·근거 검증)로 답한다.

## "이게 진짜 도나요"가 나오면

정본은 `verification/matrix.md` — 주장마다 command / expected / observed / evidence 4열로 어떤 커맨드로 관측됐는지 남겼다.
`/about.html`의 실행 블록은 심사위원 눈앞에서 실제 API를 호출한다.
- 시연 smoke: `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` (16/16, Groundedness 판정 포함)
- 결함 주입 기록: 가격 필터를 일부러 역전시켜 smoke가 실제 FAIL 하는 것을 확인(허수 테스트 방지)

## 대회 기본 정보 (발표 조건)

- **발표 7분 이내**(시연 영상 포함) + **질의응답 5분** — 초과 시 종 치고 즉시 중단
- 데모데이: 2026-07-25(토) 12:00~18:00, 성균관대 자연과학캠퍼스 삼성학술정보관 48B108 — 식스센스는 **8번**(1부 끝자락, 예상 13:34~13:46)
- 제출: 2026-07-24(금) 18:00 — 발표자료 + Live URL + 시연 영상 → builderwillow@gmail.com, dishonge@skku.edu
- 당일 오전 10시까지만 발표자료 오탈자 수정 가능
