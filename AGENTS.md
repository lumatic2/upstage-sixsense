# AGENTS.md — upstage-sixsense

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
