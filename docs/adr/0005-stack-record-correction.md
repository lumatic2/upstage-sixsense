# ADR-0005 — 스택 정본 정정: Supabase 은퇴 확정, 낡은 주장 폐기

- 상태: 채택 (2026-07-22)
- 정정 대상: ADR-0001 §스택(2026-07-15) · ADR-0004:132 — **본문은 고치지 않는다**(ADR 동결 원칙, `docs/adr/README.md`). 이 ADR 이 그 두 줄을 대체한다.
- 관련: ADR-0002(지도는 Kakao) · `docs/ARCHITECTURE.md` §데이터 정본 · DR11 문서 동기화 규약

## 맥락

2026-07-22 사용자가 물었다 — **"supabase는 안 쓰는데 왜 언급이 되는거지?"** 맞는 지적이었고,
그 물음이 아직 남아 있던 낡은 주장 두 곳을 드러냈다.

**실사(코드 전수)**: 이 레포에 Supabase 런타임 경로는 **없다.**

| 경로 | 실제 구현 |
|---|---|
| 읽기 | 구글 시트 gviz CSV — `api/_lib/sheet-data.js` ("읽기 경로는 이 하나뿐") |
| 쓰기(제보·검수) | Apps Script 웹훅 — `api/_lib/sheet-write.js` (`SHEET_WEBHOOK_URL`/`_TOKEN`) |
| Supabase | 호출부 0건. `api/*.js` 전 8개 어디에도 없다 |

남은 것은 **실행되지 않는 잔재 3종**뿐이다 — `scripts/sync-sheet-to-db.mjs`(DR1 step-4 유물,
`SUPABASE_SERVICE_KEY` 없으면 즉시 BLOCKED 종료) · `db/` 스키마 · `public/test.html` 주석.

살아 있던 낡은 주장은 둘이었다:

1. **`CLAUDE.md:41`** — "바닐라 JS + **Naver Maps + Supabase** + Vercel". 두 항목 다 사실이 아니다.
   지도는 2026-07-17 ADR-0002 로 Kakao 가 됐고, Supabase 는 2026-07-20 서비스 경로에서 빠졌다.
   **에이전트가 매 세션 처음 읽는 파일이 스택을 두 개 틀리게 알려주고 있었다** — 다른 어떤 낡은
   문서보다 해롭다.
2. **`ROADMAP.md:135`** — Next Candidate "Supabase RLS 점검 (pending insert 만 익명 허용)".
   쓰지 않는 저장소의 권한을 점검하겠다는 항목이다. 어제 내가 사용자에게 남은 일로 보고한
   목록에 이게 들어갔던 것이 이 ADR 을 쓰게 된 계기다.

`docs/ARCHITECTURE.md`·`TRD.md`·`SITEMAP.md`·`README.md`·`HANDOFF.md` 는 이미 "미사용"으로
정확히 적혀 있었다 — 문제는 **결정을 기록한 문서가 아니라 결정을 요약해 둔 문서**였다.

## 결정

**1. Supabase 는 이 레포의 스택이 아니다.** 데이터 정본은 구글 시트 단일이고, 읽기는 gviz,
쓰기는 Apps Script 웹훅이다. 이후 어떤 문서·계획·후보도 Supabase 를 이 서비스의 구성요소로
적지 않는다. Supabase 관련 작업 항목(RLS 점검 등)은 **존재하지 않는 일**이므로 만들지 않는다.

**2. 잔재 파일은 지우지 않고 표시만 한다.** `scripts/sync-sheet-to-db.mjs`·`db/` 는 팀원이 자기
버전에서 Supabase 를 쓸 수 있고(각자 서비스 — ADR-0003), README 가 이미 "무시해도 됨"으로
안내한다. 자격증명 없이는 실행 자체가 막히므로 오작동 위험이 없다. 삭제는 공유 가치를 줄이는
쪽이라 하지 않는다.

**3. ADR-0004:132 의 TRD 서술을 폐기한다.** 그 줄은 *"`docs/TRD.md` 는 팀원 원본 데모의
문서다(Naver·Supabase·영업시간 판별)"* 라고 적혀 있는데, **하루 뒤인 2026-07-21 에 TRD 가 전면
개정**되어 지금은 이 레포가 실제로 돌리는 것만 적는다. ADR-0004 의 §5.7 개인화 대체 판단은
그대로 유효하고, **TRD 의 지위 서술만** 이 ADR 로 대체된다.

**4. 요약 문서도 결정 문서와 같은 동기화 대상이다.** DR11 이 세운 문서 동기화 규약(`CLAUDE.md`)에
`CLAUDE.md`·`ROADMAP.md` 자신이 빠져 있었다 — 규약을 담은 파일이 규약의 적용 대상에서 빠져
있었던 셈이다. 스택·정본이 바뀌면 **`CLAUDE.md` 기술 스택 줄과 `ROADMAP.md` Next Candidates**
도 같은 changeset 에서 확인한다.

## 결과

- `CLAUDE.md:41` 기술 스택 줄 → Kakao Maps + 구글 시트로 정정, ADR-0002·0005 포인터 부착.
- `ROADMAP.md` Next Candidates 에서 "Supabase RLS 점검" 삭제.
- `CLAUDE.md`·`AGENTS.md` 문서 동기화 규약에 요약 문서 2종 추가.
- 실행 코드 변경 **0줄** — 이 ADR 은 코드가 아니라 코드에 대한 *진술*을 고친다.

## 검토 후 채택하지 않은 대안

- **잔재 파일 삭제**: 위 결정 2. 팀 공유 가치가 있고 실행 위험이 0 이다.
- **ADR-0001·0004 본문을 직접 수정**: ADR 은 "그때 왜 그렇게 판단했나"의 기록이라 뒤늦게 고치면
  당시 판단 근거가 사라진다. supersede 만 허용한다(`docs/adr/README.md`).
- **Supabase 를 다시 도입해 RLS 를 제대로 건다**: 시트가 이미 검수 게이트(`검수="확인"`)를 쥐고
  있고, 저장소를 하나 더 두면 정본이 둘이 된다 — 2026-07-20 에 그 이중 경로가 검수 없는 노출을
  만들었던 바로 그 문제다(`docs/HANDOFF.md:95`).
