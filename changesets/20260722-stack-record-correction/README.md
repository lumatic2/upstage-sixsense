# 20260722-stack-record-correction

- Target: 사용자 지적 "supabase는 안 쓰는데 왜 언급이 되는거지?" — 낡은 스택 주장 폐기 + 새 ADR.
- Scope: `docs/adr/0005-stack-record-correction.md`(신규) · `docs/adr/README.md` · `CLAUDE.md` · `AGENTS.md` · `ROADMAP.md` · `docs/OPEN-ISSUES.md`. **실행 코드 0줄.**

## 실사 결과 — Supabase 런타임 경로 0건

| 경로 | 실제 |
|---|---|
| 읽기 | 구글 시트 gviz CSV (`api/_lib/sheet-data.js`) |
| 쓰기 | Apps Script 웹훅 (`api/_lib/sheet-write.js`) |
| Supabase | `api/*.js` 8개 전수 호출부 **0** |

잔재는 실행 안 되는 3종뿐: `scripts/sync-sheet-to-db.mjs`(자격증명 없으면 BLOCKED 즉시 종료) · `db/` · `public/test.html` 주석. **삭제하지 않는다** — 팀원이 자기 버전에서 쓸 수 있고(ADR-0003 각자 서비스) README 가 이미 "무시해도 됨"으로 안내한다.

## 고친 것

1. **`CLAUDE.md:41` 기술 스택 줄** — "바닐라 JS + **Naver Maps + Supabase** + Vercel". 둘 다 사실이 아니었다(지도는 2026-07-17 ADR-0002 로 Kakao, Supabase 는 2026-07-20 제거). **에이전트가 매 세션 처음 읽는 파일이 스택을 두 개 틀리게 가르치고 있었다.**
2. **`ROADMAP.md` Next Candidates** — "Supabase RLS 점검" 삭제(존재하지 않는 일).
3. **ADR-0004:132** — "TRD 는 팀원 원본 데모 문서다"는 하루 뒤 TRD 전면 개정으로 낡았다. ADR 본문은 동결이므로 ADR-0005 로 대체.
4. **문서 동기화 규약 자기적용** — 규약(`CLAUDE.md`·`AGENTS.md`)이 자기 자신과 ROADMAP 을 대상에서 빠뜨리고 있었다. 요약 문서 2종 추가.
5. **OPEN-ISSUES ⑩ 신설** — 아래.

## 새로 드러난 것 (⑩)

"휴무 표시 실측"이라는 기존 후보를 사용자가 되물어 재검토한 결과, **관측 대상이 아니라 설계 결함**이었다. `todayBoard` 는 오늘자 행이 0이면 원인과 무관하게 4곳을 `open:false` 로 내린다 — **정상 휴무와 크롤 정지가 화면에서 구분되지 않는다.** 2026-07-21 에 적재 5일 지연으로 "4곳 전부 휴무"가 실제로 떴다. ROADMAP 후보를 이 문장으로 교체.

## Verification

- [x] `grep -rni supabase api public scripts` → 런타임 호출부 0 (잔재 3종만)
- [x] 살아 있는 문서 전수 재검: `ARCHITECTURE`·`TRD`·`SITEMAP`·`README`·`HANDOFF` 는 이미 "미사용" 정확 — 틀린 곳은 요약 문서 2개뿐이었음
- [x] `ROADMAP.md` 143줄 (budget 150 이내)
- [x] ADR 인덱스에 0005 등재

- Status: done (2026-07-22)
