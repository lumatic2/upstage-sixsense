# CLAUDE.local.md — 세션 핸드오프 (gitignored)

## 이어서 할 일
> 2026-07-17 세션 종료 시 기록

- **모듈 분배안 재논의가 최우선.** 사용자가 `docs/team/2026-07-17-kickoff.md` 의 분배안이 이해가 안 간다고 함 — "최종 산출물이 뭔지부터, 무슨 기준으로 모듈을 구분했는지" 설명 요청. 다음 세션은 문서를 다시 들이밀지 말고 **대화로 풀 것**: ① 최종 아웃풋(= hanipmap.vercel.app 한 곳에서 사진제보·자연어검색·학식이 도는 상태 + PPT)을 그림/시나리오로 먼저 합의 ② 모듈 구분 기준(플레이북 §2-C-1: 역할이 아니라 "입출력 인터페이스가 고정돼 서로 안 기다리는 조각" — API 계약이 이미 동결돼 있어서 M-A/B/C 로 나뉜 것)을 예시로 설명 ③ 사용자가 납득한 뒤에 배정 논의. 문서는 합의 결과로 고쳐 쓰는 산출물이지 출발점이 아님.
- 킥오프 문서의 ☐ 미결 3개는 팀 미팅(7/18 예정) 소유: 결정권 규칙 / 발표자 지정 / 분배 수락 + GitHub write 초대·이슈 생성. 합의되면 hanipmap 레포에 이슈 7개(M-A~G) 생성 — 본문은 킥오프 문서에서 이관.
- hanipmap 소유자 = 이준범 확인됨(사용자 확정). 팀 4인: 김민서·이준범·정경화·전유성, 전유성 외 3인은 개발 입문(바이브코딩 학습 목적) — 조각마다 착수 프롬프트가 필요한 이유.
- 팀원 회신 추적 계속: ④ Vercel/Supabase 권한(M-C 선행) → ① TRD Upstage 섹션 삽입 → ⑤ Kakao 수집 스크립트 커밋 → ② before/after SQL → ③ 스키마 b안 승인(`db/schema.sql` 준비됨).
- 실촬영 메뉴판 사진 도착 시: `experiments/parse-poc/photos/` 에 추가 → `node scripts/parse-menu-poc.mjs <사진>` → `accuracy.md` 에 행 append 재측정 (M2 재오픈 아님).
- 스테이징 운영 메모: https://upstage-sixsense-staging.vercel.app/test.html (재배포 `node scripts/deploy-staging.mjs [--set-env]`, VERCEL_TOKEN=Windows User env). ⚠ Windows curl 로 한글 body 점검 금지 — cp949 모지바케로 Solar 오경보 (demo-script.md 에 Node fetch 점검 커맨드 있음).

### 계획 위치 (cascade)
- Horizon: product-horizon — 7/25 데모데이 출품작 (ROADMAP `harness:goal`, 별도 horizon doc 없음 — cascade 미도입 repo)
- Milestone(active): **0개 — M1~M4 전부 completed** (7/17 하루에 M2~M4 연쇄 완료, 승인 1회·무중단)
- 다음 차례: active=0. 남은 대회 작업은 "팀 통합"(hanipmap 이식 + 팀 오케스트레이션) — milestone 로 승격할지는 사용자와 §B0.5 논의. 단 지금 블로커는 로드맵이 아니라 **분배안 이해 합의**(위 1번).

### 현재 상태 / 주의점
- 커밋 상태: 로컬 전용(리모트 없음), HEAD `0b9458b`. 이번 세션 커밋 14개 — M1 완료(e1dc6b3) → plan 3건(c831eac) → M2(9202416·4f5caf8·9b33750) → M3(ee72798·7f9bc44·4321023·33e6dc9·f759b33) → M4(115b09a·b4dc179·305e6b1) → 팀 킥오프(0b9458b).
- 핵심 실측치: 파싱 정확도 **76.4%**(72항목, 70~90 밴드 = 사용자 수정 전제 진행) / Solar=solar-pro2·타임아웃 2.5s(TRD 초안 2s 에서 실측 조정) / 학식 크롤러 direct GET 성공(Playwright 불필요, 방학이라 패컬티만 4레코드) / Upstage json_schema nullable union 미지원(-1 sentinel 우회).
- `.env` 에 UPSTAGE_API_KEY 저장(gitignored·커밋 안 됨). Vercel `upstage-sixsense-staging` 프로젝트에 env 등록됨, ssoProtection 해제 상태(공개 접근).
- ROADMAP 주의: read-only 확인 — 62줄(budget 내), harness marker 4개 전부 completed, active 0. 다음 `/harness` 진입 시 §A1 이 active=0 으로 정지하고 §B0.5(새 milestone 논의)로 라우팅될 것 — 이는 정상이며, 위 "분배안 재논의"가 그 입력.
- CS3 dogfood 증거 확보됨: horizon 일괄 계획(plan 3건 게이트 PASS) → 승인 1회 → M2~M4 무중단 연쇄, 실행 중 decision_required 0건, ledger 3-event×4(M3 은 2축+near-miss 3건). harness-engineering CS3 판정에 이 레포 기록 사용 가능.
