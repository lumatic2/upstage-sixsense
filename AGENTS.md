# AGENTS.md — upstage-sixsense

> **이 레포에서 개발할 때의 내부 작업 규약이다.**
> 이 레포를 *참고하러* 왔다면(팀원이 자기 버전에 코드를 옮기려는 경우 등) 이 파일은 해당 없다.
> → [`README.md`](README.md) 로 가고, 이식은 [`docs/HANDOFF.md`](docs/HANDOFF.md) 를 봐라.

> Codex 프로젝트 스코프 규칙. 생성: init-ai-readiness.sh

## 공통 원칙

공통 원칙은 홈 스코프 AGENTS.md 에서 이미 로드됐다고 가정한다. 여기서는 중복하지 않는다.

## Peer agent adapter

이 프로젝트는 Claude 와 Codex 를 동등한 peer agent 로 운용한다. 어느 쪽도 영구 orchestrator 가 아니며, 현재 task 를 잡은 session owner 가 계획·수정·검증·커밋·handoff 를 소유한다.

`CLAUDE.md` 는 파일명과 무관하게 프로젝트 공유 brief 이고, 이 파일은 Codex 가 그 공유 brief 를 자기 런타임에서 안전하게 실행하기 위한 adapter 이다. 세션 시작 시 반드시 `./CLAUDE.md`, `./ROADMAP.md`(있으면), `./CLAUDE.local.md`(있으면)를 읽고 시작한다.

- `CLAUDE.md`: 프로젝트 공유 brief — 기술 스택, 구조, 개발 명령어, 보호 파일 / 금지 사항, 기타 이 프로젝트 고유의 작업 방식
- `AGENTS.md`: Codex runtime adapter — Claude-only 표면을 Codex-safe 실행 방식으로 번역
- `ROADMAP.md`: 현재 horizon·active milestone·다음 할 일. milestone 완료·compact 는 `/harness` 소유
- `docs/BACKLOG.md`: 완료·보류·아카이브된 milestone 압축 이력. `/harness` 의 ROADMAP.md 150줄 budget 유지용
- `session-end`: ROADMAP 을 수정하지 않고 read-only 로 확인한 뒤 `CLAUDE.local.md` handoff 에만 반영
- **완료 계약**: 작업 단위 산출물 기본 = changeset (`changesets/<YYYYMMDD>-<slug>/README.md` + 인덱스 행 + **1 changeset = 1 commit** — 커밋까지가 완료)

`CLAUDE.md`의 내용 중 Claude 전용 도구 호출 규칙은 Codex 환경에 맞게 해석하되, 프로젝트 구조·규칙은 그대로 따른다.

## Context landmarks

이 파일은 root landmark다. repo가 커져 root 설명만으로 부족해지면 하위 디렉터리에도 scoped `AGENTS.md`를 둔다.

추가 후보 기준:
- 하위 디렉터리가 별도 stack/config/test/deploy 규칙을 가진다.
- 파일 수·깊이·symbol/reference 중심성이 높아 수정 전 반드시 읽어야 한다.
- agent가 반복해서 잘못된 파일을 고르거나 local convention을 놓친다.

## Role lanes

큰 작업의 planning/review에서는 역할을 이름 붙여 분리한다.

- explorer: 관련 파일·규칙·선례를 찾는다.
- planner: 결정·의존성·작업 순서를 검토한다.
- reviewer: diff 품질·scope drift·maintainability를 반박한다.
- qa: 실행 증거·failure mode·smoke를 확인한다.
- gate: 완료 주장과 evidence를 최종 대조한다.

role lane은 자동 subagent/team 실행을 뜻하지 않는다. 도구가 가능하고 위험도가 맞을 때만 위임하고, 기본은 같은 세션에서 lane별로 분리 검토한다.

## 문서 동기화 — 결정을 뒤집으면 설명도 같이 고친다 (2026-07-22 DR11 실측)

코드에서 기능을 빼거나 ADR 로 결정을 뒤집었으면, **그 기능을 설명하던 문서와 화면 문구를 같은
changeset 안에서** 고친다. 나중으로 미루면 안 한다 — 실제로 ADR-0004 가 순서 개인화를 폐기한
다음날에도 라이브 `/about.html` 이 그 기능을 광고하고 있었고, 같은 문장이 로그인 다이얼로그를 통해
4개 페이지에 복제돼 있었다. 감사 기록 → `research/2026-07-21-dr11-design-doc-audit.md`.

- 같은 커밋에서 확인할 곳: `docs/SITEMAP.md` · `docs/PRD.md` · `docs/ARCHITECTURE.md` ·
  그 기능을 설명하던 `public/*.html`.
- **정의는 한 곳에만.** 나머지는 포인터를 쓴다(개인화 정본 = `docs/adr/0004-personalization.md`).
- **공통 조각(헤더·푸터·로그인 다이얼로그)은 페이지마다 복제돼 있다** — 문구 수정 시 `grep -rn` 으로 전수 확인.
- 화면 문구·라벨 규약 정본 = `docs/SITEMAP.md` §5.
- **요약 문서도 같은 대상** (2026-07-22 ADR-0005): 스택·정본이 바뀌면 `CLAUDE.md` §기술 스택 줄과
  `ROADMAP.md` Next Candidates 를 같은 changeset 에서 확인한다. 이 규약을 처음 세울 때 규약을 담은
  파일 자신이 빠져 있어, `CLAUDE.md` 가 폐기된 스택(Naver·Supabase)을 계속 가르치고 있었다.

## milestone 완료 처리 — 셋 다 건드려야 끝난다 (2026-07-21 실측)

`ledger`(evidence) · `ROADMAP.md`(상태판) · `.harness/work.json`(step 실시간 상태) **세 곳**을
모두 갱신해야 완료다. 한 곳을 빠뜨리면 장부가 "미착수" 로 남아 다음 세션이 이미 끝난 일을
다시 시작한다 — DR7 에서 실제로 Stop hook 이 "3/3 미착수" 로 잡았다.

- `.harness/work.json` 은 **checkout-local(gitignore)** 이다. git 으로 추적하면 기기 사이를
  오가며 서로의 상태를 덮어쓴다(DR4 가 머신 로컬 장부와 정본으로 갈라진 원인).
  영속 이력은 `.harness/execution-ledger.jsonl` 과 `ROADMAP.md` 에 남는다.
- step 은 끝낼 때마다 `work.json` 에 반영한다. 마지막에 몰아서 하면 위 사고가 재발한다.
