# upstage-sixsense

> AI Document Builders Challenge (Upstage × 대학혁신과공유센터) 출품작 — 예산 안에서 학식·주변 식당을 추천하는 서비스. (갈래: product / web)
> 대회 요강·일정·루브릭: `docs/CHALLENGE.md` · 제품 정의: `docs/PRD.md`

## 대회 제약 (하드 요건)
- **Upstage 제품(Document AI, Solar 등) 최소 1종 사용은 실격 요건**이다. 스택 결정이 이걸 깨면 안 된다.
- 데모데이 **2026-07-25(토)**. 빌드업 마감 7/24. 남은 일정은 `ROADMAP.md`.

### 심사 루브릭 (총 100점 — 모든 구현 우선순위의 기준)

| 심사항목 | 심사기준 | 배점 |
|---|---|---|
| Service Differentiation | 범용 LLM 대비 서비스 차별성 | 5 |
| | 문제 정의의 구체성 및 타깃 명확성 | 5 |
| **Data Architecture & Process** | **정보 처리 파이프라인 설계 및 관리** | **20** |
| **Solution Depth** | **정보 처리의 깊이 및 정교성** | **15** |
| Service Impact | 실용성 및 활용 가능성 | 10 |
| | 서비스 논리의 타당성 | 5 |
| | 서비스 임팩트 및 확장성 | 5 |
| Effective Use of Upstage | 목적에 적합한 제품 적용 | 10 |
| | 기술 적용 결과의 기여도 | 10 |
| Presentation & Documentation | 발표 전달력 및 태도 | 5 |
| | 발표 자료의 논리 및 완성도 | 10 |

- 해석: **파이프라인 20 + 깊이 15 = 35점**이 데이터 처리, Upstage 활용 20점이 그다음. **UI 완성도는 직접 배점 0** — Service Impact·발표로만 간접 반영. 구현 우선순위를 여기에 맞춘다.
- 승부처: "그냥 ChatGPT에 물어보면 되지 않나?"에 답할 수 있는가 (원문·멘토링 규칙: `docs/CHALLENGE.md`).

## 기술 스택
- 팀원 데모 **한입지도**(github.com/ljb0138/hanipmap) 기반: 바닐라 JS + Naver Maps + Supabase + Vercel serverless functions — 2026-07-15 확정 (Next.js 전환 안 함, ADR-0001·ARCHITECTURE.md)
- Upstage: Document Parse(메뉴판 사진), Solar(질의 구조화·추천 이유). **학식은 크롤링 — Document Parse 금지** (이미 HTML, 억지 적용은 감점 사유)
- Upstage API 키는 **서버 함수에서만** 사용. 클라이언트 노출 금지.

## 프로젝트 구조
<!-- TODO: 코드 생기면 채운다 -->

## 개발 명령어
```bash
# TODO: 앱 스캐폴딩 후 dev/test/build/lint 채운다
```

## Gotchas
- 필수 env var: `UPSTAGE_API_KEY` (커밋·로그 노출 금지)

## 작업 방식
- 신규 기능 → 항상 계획 먼저, 구현 나중
- 굵직한 결정은 `docs/adr/` 에 ADR 로 보존
- **대회 주제·아이디어는 운영진에게 물을 수 없다** (공지 명시). 주제 판단은 팀이 내리고 근거는 ADR로 남긴다.

## ROADMAP 운영
- `ROADMAP.md` 는 current horizon / active milestone 장부이며 150줄 이하로 유지한다.
- `docs/BACKLOG.md` 는 완료·보류·아카이브된 milestone 압축 이력이다.
- ROADMAP/BACKLOG 쓰기 소유자는 `/harness` 이다. milestone 완료·compact·horizon-check 는 `/harness` 가 처리한다.
- `session-end` 는 ROADMAP 을 수정하지 않는다. read-only 로 확인하고 `CLAUDE.local.md` handoff 에만 반영한다.

## 컨텍스트 갱신 규칙
- 사용자가 같은 교정을 2회 이상 반복하거나 "항상 ~해줘"·"다시는 ~하지 마" 식으로 말하면, 메모리에 넣지 말고 그 자리에서 이 파일(그리고 이 레포 `AGENTS.md`)에 추가를 제안한다.
- 이 레포에만 해당하는 사실은 여기에, 모든 레포에 해당하면 글로벌(`~/.claude/CLAUDE.md`/`~/.codex/AGENTS.md`)에 제안한다 — 헷갈리면 물어본다.
- Claude 와 Codex 둘 다 지켜야 할 규칙이면 이 `CLAUDE.md` 와 `AGENTS.md` 양쪽에 추가한다(문구는 달라도 되나 내용은 일치).
- 정기적으로(주 1회 또는 감이 안 잡힐 때) `context-manager` 를 "전체 점검"으로 돌려 배치 오류·drift 를 확인한다.

## ⚠ Judge 규약
> 코드 변경 후 lint·테스트 통과 없이는 "완료" 보고 금지. 자동 도구가 통과하면 진실로 간주.

## 의사결정 이력
"왜 X 안 함?" 같은 *의도적으로 안 한 선택*은 `docs/adr/` 에 ADR 로 보존.
