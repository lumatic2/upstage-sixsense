# upstage-sixsense

> **이 레포에서 개발할 때의 내부 작업 규약이다.**
> 이 레포를 *참고하러* 왔다면(팀원이 자기 버전에 코드를 옮기려는 경우 등) 이 파일은 해당 없다.
> → [`README.md`](README.md) 로 가고, 이식은 [`docs/HANDOFF.md`](docs/HANDOFF.md) 를 봐라.

> AI Document Builders Challenge (Upstage × 대학혁신과공유센터) 출품작 — 예산 안에서 학식·주변 식당을 추천하는 서비스. (갈래: product / web)
> 대회 요강·일정·루브릭: `docs/CHALLENGE.md` · 제품 정의: `docs/PRD.md`

## 대회 제약 (하드 요건)
- **Upstage 제품(Document AI, Solar 등) 최소 1종 사용은 실격 요건**이다. 스택 결정이 이걸 깨면 안 된다.
- 데모데이 **2026-07-25(토)**. 빌드업 마감 7/24. 남은 일정은 `ROADMAP.md`.

### 팀 구조 (2026-07-20 사용자 확정 — 이전 "본선 조립본" 전제 폐기)
- **대표 조립본(hanipmap 이식)은 더 이상 존재하지 않는다.** 팀원 각자가 자기 버전을 만들고, 미팅에서 비교·합의해 제출물을 정한다.
- **팀 합의 미팅: 2026-07-23(목) 21:00** — 빌드업 마감 7/24 직전이므로 **이 미팅이 실질 마감**이다. 이 레포의 모든 일정은 여기에 맞춘다.
- 이 레포의 역할은 둘: ① 내 버전을 미팅에서 선택될 만한 최고 완성도로 닫는다 ② 데이터·코드·개발 지식을 팀원이 자기 버전에 쓸 수 있게 공유한다.
- **공유 형식 = GitHub 레포(github.com/lumatic2/upstage-sixsense) + 웹사이트 링크(sixsense.askewly.com)** 두 가지. 팀원 레포에 PR 을 넣는 이식 작업은 하지 않는다.
- 따라서 UI·완성도는 배점 0점이어도 후순위가 아니다 — 미팅에서 나란히 놓고 고를 때의 설득력이다.

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

## milestone 완료 처리 — 셋 다 건드려야 끝난다 (2026-07-21 실측)

`ledger`(evidence) · `ROADMAP.md`(상태판) · `.harness/work.json`(step 실시간 상태) **세 곳**을
모두 갱신해야 완료다. 한 곳을 빠뜨리면 장부가 "미착수" 로 남아 다음 세션이 이미 끝난 일을
다시 시작한다 — DR7 에서 실제로 Stop hook 이 "3/3 미착수" 로 잡았다.

- `.harness/work.json` 은 **checkout-local(gitignore)** 이다. git 으로 추적하면 기기 사이를
  오가며 서로의 상태를 덮어쓴다(DR4 가 머신 로컬 장부와 정본으로 갈라진 원인).
  영속 이력은 `.harness/execution-ledger.jsonl` 과 `ROADMAP.md` 에 남는다.
- step 은 끝낼 때마다 `work.json` 에 반영한다. 마지막에 몰아서 하면 위 사고가 재발한다.

## 문서 동기화 규약 (2026-07-22 DR11 — 실사고 기반)

**결정을 뒤집으면, 그 결정을 설명하던 문서와 화면 문구를 같은 changeset 안에서 고친다.**

2026-07-19~21 에 코드를 여섯 번 크게 고치는 동안 설계 문서를 한 번도 안 고쳤다. 그 결과
ADR-0004 가 순서 개인화를 폐기한 다음날에도 **라이브 `/about.html` 이 그 기능을 광고**하고 있었고,
같은 주장이 로그인 다이얼로그를 통해 4개 페이지에 복제돼 있었다. `docs/SITEMAP.md` 는 6곳에서
구현과 어긋나고 자기 안에서 모순됐다. 전수 감사 → `research/2026-07-21-dr11-design-doc-audit.md`.

- ADR 을 새로 쓰거나 기능을 제거하면 **같은 커밋에서** 확인한다: `docs/SITEMAP.md`(화면 구조) ·
  `docs/PRD.md`(제품 정의) · `docs/ARCHITECTURE.md` · **그 기능을 설명하던 `public/*.html` 문구**.
- 정의는 **한 곳에만** 둔다. 다른 문서는 포인터를 쓴다(예: 개인화 정본 = ADR-0004, PRD·about 은 인용).
  두 곳에 쓰면 반드시 갈라진다.
- 화면 문구·라벨 규약은 `docs/SITEMAP.md` §5 가 정본 — 숫자 라벨은 무엇을 세는지 라벨이 밝히고,
  세는 대상이 바뀌면 라벨도 같은 커밋에서 바꾼다.
- **헤더·푸터·로그인 다이얼로그는 페이지마다 복제돼 있다.** 공통 문구를 고칠 땐 `grep -rn` 으로
  전 페이지를 확인한다.

## ⚠ Judge 규약
> 코드 변경 후 lint·테스트 통과 없이는 "완료" 보고 금지. 자동 도구가 통과하면 진실로 간주.

## 의사결정 이력
"왜 X 안 함?" 같은 *의도적으로 안 한 선택*은 `docs/adr/` 에 ADR 로 보존.
