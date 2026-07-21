# 20260721-repo-share-readiness

- Target: 7/23 팀 합의 미팅 대비 — GitHub 레포 링크를 팀원에게 주고 **팀원이 자기 에이전트에 붙여 설명을 듣는** 전달 방식을 성립시킨다 (`CLAUDE.md` §팀 구조, 공유 형식 = 레포 + 사이트 링크).
- Scope: `README.md`(에이전트 진입 재구성 + 레포 지도) · `docs/HANDOFF.md` §2(이식 주의사항 사실 교정) · `CLAUDE.md`/`AGENTS.md` 상단 배너 · stray `mobile-390.png` 삭제 · GitHub description·homepage·topics. **코드·디렉터리 구조 무변경.**
- Contract:
  - 하네스 규약 경로(`plans/` `changesets/` `archive/` `templates/` `research/` `verification/`)는 **옮기지 않는다.** 상류 스킬이 하드코딩하고 있고(`roadmap_sync.py` 의 `(?:archive/)?plans/…`), 7/17 커밋 `352896c` 의 동종 이동이 이 레포 백링크 18개를 끊은 선례가 있다. 네비게이션 문제는 README 지도로 푼다.
  - `.git` 히스토리 재작성 금지 — 이미 클론한 팀원 레포가 깨진다.
  - 레포는 public 유지(사용자 확정 2026-07-21). 커밋된 비밀값 없음을 스캔으로 확인.
- 발견된 결함 (이번에 고친 것):
  - HANDOFF §2 표가 **의존성을 틀리게 적고 있었다** — `parse-query.js` 는 `api/chat.js` 를 import 하는데 "의존: UPSTAGE_API_KEY" 로만, `crawl-cafeteria.mjs`·`geocode-sheet.mjs` 는 외부 `gws` CLI + 전이 의존 3개가 필요한데 "의존: 없음" 으로 적혀 있었다. **팀원이 표 그대로 복사하면 import 에러로 즉시 깨지는 상태였다.**
  - 참고하러 온 에이전트가 루트 `CLAUDE.md`/`AGENTS.md` 를 먼저 읽고 이 레포의 하네스 내부 규약(changeset 계약·ledger)을 자기 작업 규칙으로 오인할 경로가 열려 있었다.
- Verification:
  - [x] 이식 주의사항: 대상 6파일 코드 정독으로 사실 확인(내부 import·env·하드코딩 값·런타임 전제) — 추측 아님
  - [x] 링크·경로: README·HANDOFF 의 상대링크 및 본문 언급 경로 전수 존재 확인 (깨진 것 0)
  - [x] 수치: README 의 식당 24 / 메뉴 342 / 학식 4일치를 라이브 `GET /api/data` 응답과 대조 일치
  - [x] 비밀값 스캔: 추적 파일 전체 — 하드코딩 키 0 (전부 env 경유, Kakao JS 키는 도메인 제한형이라 노출 정상)
  - [x] `node scripts/test-side-menu.mjs` → 41/41 PASS (문서 변경이라 무영향 확인용)
  - [x] GitHub 메타데이터: API 재조회로 description·homepage·topics 8종 반영 확인
- Status: done (2026-07-21)
