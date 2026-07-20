# HORIZON — 데모데이 완주 (demoday-run)

> 생성: 2026-07-19 · ROADMAP marker: `harness:goal id="demoday-run"` · 상태: active(제안 — 승인 대기)
> 위계: Objective(`OBJECTIVE.md`) → **Horizon**(이 문서) → Milestone(`plans/<date>-<id>-<slug>.md`) → Step.
> 진행 상태의 정본은 `ROADMAP.md` marker — 이 문서의 milestone 체크박스는 milestone boundary 에서만 동기화.

## 목표
- 7/18 "각자 서비스" 전환 이후 남은 전부를 데모데이(2026-07-25)까지 닫는다: 실데이터 파이프라인 가동 → 개인 버전 웹서비스 완성 → **내 버전을 미팅 제출 후보로 완결하고 팀에 공유**.
- **2026-07-20 방향 정정 (ADR-0003)**: "본선 조립본(hanipmap 이식) 보장" 전제가 폐기됐다. 팀은 각자 버전을 만들어 **2026-07-23(목) 21:00 미팅에서 비교·합의**해 제출물을 정한다. 따라서 실질 마감은 데모데이가 아니라 **미팅**이고, DR3(이식)은 DR6(내 버전 완결)·DR7(팀 공유)로 대체됐다.
- 플레이북 정합: 개인 슬롯의 Phase 4(킥오프 계약) → Phase 5(구현·검증 루프) → Phase 6(dogfood) 구간. (`docs/playbook/AI_공모전_플레이북.md`)

## 왜 지금 (이전 horizon 이 드러낸 갭)
- product-horizon(M1~M4)은 파이프라인 3종을 **fixture 데이터**로 E2E까지만 증명했다(`research/2026-07-17-m3-e2e.md`). 심사 배점 35점(파이프라인 20+깊이 15)은 **실데이터가 흐르는 실물**이 있어야 실점수가 된다.
- 7/18 미팅에서 방법론이 "각자 서비스"로 전환됐고(`docs/team/2026-07-18-decisions.md` §6), 개인 버전과 대표 조립본이 각각 미착수 상태다.

## 담을 milestone (설계 번들 인덱스)

| ID | 제목 | plan doc | 승인 상태 | 소비 리서치 |
|---|---|---|---|---|
| DR1 | 실데이터 파이프라인 가동 (사진→파싱→시트, 지오코딩, 학식→시트) | `plans/2026-07-19-dr1-data-pipeline.md` | 제안 | `research/2026-07-19-demoday-run-data-pipeline.md` |
| DR2 | 개인 버전 웹서비스 빌드 (Upstage 심화 + 인터랙티브 데모) | `plans/2026-07-19-dr2-personal-service.md` | 제안 | `research/2026-07-19-demoday-run-upstage-depth.md` · `research/2026-07-19-demoday-run-market-differentiation.md` |
| ~~DR3~~ | ~~본선 조립 (hanipmap 이식·API 계약 문서·팀 온보딩)~~ | ~~`plans/2026-07-19-dr3-assembly.md`~~ | **폐기 2026-07-20 (ADR-0003)** | — |
| DR4 | 제보→검수→승인 루프 | `plans/2026-07-20-dr4-contribute-review-loop.md` | 완료 | — |
| DR5 | 페이지 구조 완성 + 재방문 개인화 | `plans/2026-07-20-dr5-site-completion.md` | 완료 | — |
| DR6 | 내 버전 완결 (미팅 제출 후보 확정판) | `plans/2026-07-20-dr6-my-version-final.md` | 승인 대기 | `docs/OPEN-ISSUES.md`(DR4·DR5 실측 이슈) |
| DR7 | 팀 공유 패키지 (GitHub 레포 + 웹사이트 링크) | `plans/2026-07-20-dr7-team-share.md` | 승인 대기 | 조사 불요 — 공유 형식이 사용자 확정으로 고정 |

- [x] **DR1** — ≥2 독립 changeset(지오코딩 스크립트 / 학식→시트 경로 / 시트→서비스 read 경로) + 통합검증(실데이터 1건이 시트→API→화면까지 흐름)
- [x] **DR2** — ≥2 독립 changeset(Upstage 심화 기능 / UI 빌드 / 검증 가시화) + 통합검증(배포 URL에서 심사 시연 시나리오 smoke)
- [x] **DR4** · [x] **DR5** — horizon 진행 중 승격된 milestone (제보·검수 루프 / 페이지 구조 완성)
- [ ] **DR6** — ≥2 독립 changeset(데이터 품질 게이트 / SSOT 단일화 / 폴리싱 / 발표 정합) + 통합검증(배포 URL smoke + 발표 자료 실물 대조)
- [ ] **DR7** — ≥2 독립 changeset(README / 인계 문서) + 통합검증(시크릿 창에서 링크 2개만으로 파악 가능)

## 무감독 분량
- 승인 후 최소 **3 무감독 세션** (DR1·DR2·DR3 각 1+ 세션 — DR2 는 2세션 이상 예상).

## 닫는 기준 (선언 → close 시 실측 대조)
1. **실데이터**: 구글 시트 [식당]·[메뉴] 탭에 실사진 유래 식당 ≥5곳 + 좌표 자동 채움 — 관측: 시트 행 수 + 지오코딩 스크립트 실행 로그.
2. **개인 서비스**: 배포 URL에서 "예산 입력→추천 결과" 시연 시나리오가 실데이터로 통과 — 관측: Playwright smoke PASS + 스크린샷.
3. ~~**조립본**: hanipmap 배포 URL 실브라우저 E2E~~ → **교체 (2026-07-20, ADR-0003)** — **팀 공유 도달성**: 시크릿 창에서 공개 레포 URL(github.com/lumatic2/upstage-sixsense)과 사이트 URL 을 열어 README→HANDOFF 만으로 파이프라인 구조와 재사용 지점이 파악되고 깨진 링크 0 — 관측: 실브라우저 확인 1회 + 링크 대조.
4. **검증 가시화**: `verification/matrix.md`(command/expected/observed/evidence)가 존재하고 발표 자료가 참조 — 관측: 파일 존재 + docs/presentation 링크.

## 미리 쓰는 실패 회고(프리모템) — 예방 장치 역주입
- **시나리오 1 — 실사진이 안 모여 fixture 데모로 전락**: 수집 구역 배분(§6 ☐)이 미확정인 채 D-3까지 오면 파이프라인이 빈다. → 예방: DR1 은 팀 수집을 기다리지 않고 **사용자 보유 사진 + 직접 수집분으로 먼저 가동**(시트 채움을 팀 의존에서 분리), 수집 현황을 매 세션 보고.
- **시나리오 2 — Upstage 활용이 파싱 1종에 그쳐 20점 절반 상실**: Document Parse 하나만 쓰면 "목적 적합 적용"은 되나 "기여도" 서사가 얇다. → 예방: DR2 에 리서치 기반 Upstage 심화 적용(예: Information Extraction·Groundedness 등 리서치 결과 반영) step 을 명시하고, 억지 적용 여부를 결정 로그에서 판정.
- **시나리오 3 — 조립·발표가 마지막 날로 밀림**: 개인 빌드에 몰입하다 DR3 가 7/24 에 몰리면 배포 사고 여지가 없다. → 예방: DR3 이식은 push=자동배포라 소규모 — **DR1 직후 선행**하고, 발표 자료 갱신은 DR2 완료 경계에 배치.

## 닫는 기준 — 선언 대 실측 (2026-07-21 close)

| # | 선언 | 실측 | 판정 |
|---|---|---|---|
| 1 | 실사진 유래 식당 ≥5곳 + 좌표 자동 채움 | 식당 **24곳** · 메뉴 342행(검수 통과) · 학식 4일치. 지오코딩 배선 완료(`/api/config` `ready.geocode=true`) | PASS (선언의 4.8배) |
| 2 | 배포 URL 시연 시나리오가 실데이터로 통과 | `demo-smoke.mjs` **11/11 PASS**, 근거 검증 배지 실동작 | PASS |
| 3 | (교체) 팀 공유 도달성 — 링크 2개로 파악 가능 | 공개 레포 + 사이트 200, README 상대 링크 9/9, 팀원 역할 독립 검증 통과 | PASS |
| 4 | `verification/matrix.md` 존재 + 발표 자료 참조 | 72행까지 누적, `rubric-map.md`·`deck.md` 가 참조 | PASS |

## 프리모템 대조 (선언한 실패 시나리오가 실제로 왔는가)

- **시나리오 1(실사진이 안 모여 fixture 데모로 전락)** — 오지 않음. 팀 수집이 실제로 돌아 191→374행으로 늘었다.
- **시나리오 2(Upstage 활용이 파싱 1종에 그침)** — 예방됨. Document Parse + solar-pro2 + solar-mini(근거 판정) 3종, 안 쓴 자리(학식)도 명시.
- **시나리오 3(조립·발표가 마지막 날로 밀림)** — **형태를 바꿔 실현됐다.** 조립 자체가 폐기(ADR-0003)돼 배포 사고 위험은 사라졌지만, 발표 자료는 실제로 D-3까지 낡은 채 방치돼 있었고 그 사이 만든 핵심 기능 2종(근거 검증·검수 루프)이 덱에 아예 없었다. 예방 장치("발표 자료 갱신은 DR2 완료 경계에 배치")가 지켜지지 않았다.
  → 다음 horizon 교훈: **발표·설명 산출물은 milestone 완료 hook 안에 넣어야 한다.** 별도 step 으로 두면 항상 뒤로 밀린다.

## 크기 회고

- **디플레 대조**: 선언 `무감독 분량 최소 3 무감독 세션` → 실제 5개 milestone(DR1·DR2·DR4·DR5·DR6·DR7)을 4+ 세션에 걸쳐 소화. 미달 아님.
- **인플레 대조**: DR6 = 독립 changeset 6건, DR7 = 3건. 둘 다 ≥2 + 통합 검증 → milestone-grade 적정.

## Objective 임팩트 (close 시 기록)

- **데이터 실물화 축**: fixture → 실데이터 24곳/342행이 수집→파싱→검수→서비스까지 흐름. 축이 크게 이동.
- **처리 깊이·검증 가시성 축**: 파싱 1종 → 3종 + 모델 분리 근거 판정 + `/verify.html` + `verification/matrix.md` 72행. 축이 크게 이동.
- **심사 가능한 완성도 축**: 검증 페이지 → 공개 5페이지 완결 서비스 + smoke 11/11. 축이 크게 이동.
- 세 축 모두 이동했으므로 방향 재검토 신호 없음. **다만 Objective 의 성공 모습은 아직 상시 참이 아니다** — "데모데이에서 라이브로 통과"가 7/25에 남아 있어 북극성 교체 시점이 아니다.
- **남은 것은 이 레포 밖이다**: 7/23(목) 21:00 팀 미팅에서 제출물 합의, 그리고 7/25 데모데이 발표.

## 링크
- 위(Objective): `OBJECTIVE.md`
- 배경 결정: `docs/team/2026-07-18-decisions.md` §6 · `docs/adr/0001-problem-and-solution-shape.md`
- 아래(Milestone PLANs): 위 번들 인덱스
