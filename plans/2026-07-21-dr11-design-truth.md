# DR11 — 설계도와 화면을 사실로 되돌린다

> 생성: 2026-07-22 · Horizon: `plans/horizons/demoday-run.md` · Objective: `OBJECTIVE.md`
> 소비 리서치: `research/2026-07-21-dr11-design-doc-audit.md` (감사 근거 A~F)
> Supersedes: 없음 (신규)

Status: approved (2026-07-22 사용자 승인)

- execution mode: continuous
- 롤백/정리: step 마다 1 커밋이라 `git revert <sha>` 로 단독 원복. 배포는 `deploy-staging.mjs` 가 매번
  전체 파일을 올리므로 revert 후 재배포로 되돌아간다. 시트·외부 상태 변경이 없어 데이터 정합 문제 없음.

## 문제

코드를 6번 크게 고치는 동안(개인화 재정의·칩·학식 정본화·마커 카드·TRD 개정) **설계 문서를 한 번도
안 고쳤다.** 결과는 세 겹이다:

1. **라이브 화면이 삭제된 기능을 광고한다** — `about.html:157-159` 가 ADR-0004 로 폐기된 순서
   개인화를 설명 중이고, `PRD.md:17` 도 같다.
2. **설계도가 구현을 설명하지 못한다** — `SITEMAP.md` 가 6곳에서 어긋나고 자기 안에서 모순된다.
3. **화면 문구·라벨에 규약이 없다** — 그래서 "학식 9"(= 전 날짜 누적 행 수) 같은 라벨이 근거 없이
   남고, cron 이 도는 동안 그 숫자가 계속 불어난다.

7/23(목) 21:00 팀 미팅에서 다른 버전과 나란히 놓고 비교한다. 심사위원이 `/about.html` 을 읽고
`/app.html` 을 보면 즉시 어긋나는 상태로 갈 수 없다.

## Objective 연결

- **심사 가능한 완성도** 축: 5페이지가 서로 모순 없이 같은 사실을 말한다.
- **처리 깊이·검증 가시성** 축: 설계도가 살아 있어야 발표 준비 때 그걸 읽고 말할 수 있다
  (사용자 요구: "나중에 발표 준비할 때 그 설계도 문서 보면 더 편하다").

## 범위

**담는다**: 공개 5페이지의 문구·라벨·상태 처리 · `SITEMAP.md`/`PRD.md`/`ARCHITECTURE.md` 현행화 ·
랜딩 데모와 앱 지도의 마커 카드 잘림 · `contribute` 폴백.

**Non-goals**:
- `docs/presentation/` — 사용자 요청 전까지 건드리지 않는다 (2026-07-21 확정).
- 신규 기능·신규 페이지·로그인/Firebase.
- 신규 디자인 토큰 발명 — `public/theme.css` 기존 변수만.
- `docs/TRD.md` — 2026-07-21 전면 개정 완료, 현행.

**중단점**: `blocked`·`decision_required`·`risk_gate` 중 하나가 실제로 나타날 때만 멈춘다. 구체적으로는
① 결정 로그 밖의 새 사용자 소유 결정 ② 배포 실패·시트 쓰기 자격 문제 ③ 같은 검증이 두 번 연속
실패해 원인이 코드가 아니라 환경으로 의심될 때(2026-07-21 실사례: 죽은 로컬 서버가 포트를 물고 있어
수정 3회가 전부 옛 코드로 측정됨) ④ 사용자가 말로 멈출 때. step 완료 경계·커밋·푸시에서는 멈추지 않는다.

## 스캐폴딩 결정

- source-of-truth: 화면 설계 = `docs/SITEMAP.md` · 제품 정의 = `docs/PRD.md` · 결정 = `docs/adr/` ·
  기술 스택 = `docs/TRD.md` · 데이터 = 구글 시트. **개인화 정의의 정본은 ADR-0004** 이고 PRD·about 은
  그것을 인용하는 쪽이다 — 역방향 금지(이번 사고의 재발 경로).
- 검증: `node scripts/demo-smoke.mjs --url <배포>` · `test-chat-extract` · `test-side-menu` ·
  `test-personalization` · `test-chips` · 실브라우저 5페이지(Playwright MCP, 1440×900 + 390px).
- 배포/운영: `node scripts/deploy-staging.mjs`(FILES 자동수집) → https://sixsense.askewly.com.
- 화면: 손대는 표면 = `public/index.html`·`app.html`·`about.html`·`contribute.html`.
  `verify.html` 은 감사에서 이상 없음이라 열지 않는다.
- 문구 규약: 숫자 라벨은 **무엇을 세는지 라벨 자신이 밝힌다.** 세는 대상이 바뀌면 라벨도 같은
  커밋에서 바꾼다. 이 규약을 SITEMAP 에 신설해 다음 사고를 막는다.
- 데이터: 신규 시트 열·신규 API 없음. 학식 카운터는 이미 내려오는 `cafeteriaBoard` 를 쓴다.
- 디자인: 기존 `theme.css` 토큰만. 새 색·spacing 도입 금지.
- 문서 동기화 규약: ADR 로 결정을 뒤집으면 그것을 설명하던 문서·화면을 **같은 changeset 안에서**
  고친다. `CLAUDE.md`·`AGENTS.md` 양쪽에 넣는다.
- 검토 후 제외: 서버(API 로직 변경 없음 — 카운터는 이미 있는 필드를 클라이언트가 골라 쓰는 문제다) ·
  관측(신규 계측 불요 — 검증이 smoke + 실브라우저로 닫힌다) · 외부연동·크레덴셜(신규 없음, 기존 env 그대로).

## 결정 로그

- status: resolved

| # | 결정 | 결말 |
|---|---|---|
| 1 | 랜딩 학식 카운터를 무엇으로 바꿀까 | 사용자 지시 2026-07-21 — **학식당 개수** |
| 2 | 폐기된 순서 개인화를 about·PRD 에서 삭제할까, 재서술할까 | **재서술.** ADR-0004 의 "일어나지 않은 선택으로 순서를 바꾸고 있었다"는 판단 자체가 파이프라인 정직성의 증거다. 지우면 그 증거도 함께 사라진다 |
| 3 | 지도 카드 잘림을 사전 배치로 재설계할까 | **아니다 — 랜딩에 기존 사후보정을 이식한다.** 미팅 이틀 전 지도 레이아웃 재설계는 리스크가 크고, app 쪽 보정은 라이브 실측으로 동작이 확인됐다 |
| 4 | contribute 에 정확도 76.4% 숫자를 노출할까 | **노출한다.** SITEMAP `:94` 가 "파싱 정확도를 100%인 척하지 않는다"를 이미 설계로 못박았고 M2 실측치가 있다 |
| 5 | 랜딩 아랫부분·메뉴 찾기·Upstage 절의 손질 범위 | **감사 결과에 근거한 구체안으로 진행**하고, 승인 턴에 사용자 지적이 있으면 그것을 우선한다. 새 블록 신설이나 구조 변경은 하지 않고 문구·라벨 층에서만 손댄다 |

## Step 트리

- [ ] **step-1 — 폐기된 개인화 축의 잔재를 걷어낸다**
  - Artifact: `changesets/20260721-personalization-copy-truth/`
  - Files: (w) `public/about.html` · `docs/PRD.md` · (r) `docs/adr/0004-personalization.md`
  - Dependencies: 없음
  - 내용: about `#s5` 를 ADR-0004 사실로 재서술한다 — 순서는 바꾸지 않는다 / 기억은 데이터 검증을
    통과한 관심어만 / 브라우저에만 남는다 / 지우는 법. `PRD.md` 핵심 기능 5 의 ① 순서 축을 삭제하고
    ADR-0004 를 정본으로 인용한다.
  - Verify: `grep -n "순서" public/about.html docs/PRD.md` 에서 순서-개인화 주장 0건 ·
    `node scripts/test-personalization.mjs` 전항 PASS
  - Failure probe: 문구를 고친 뒤 `/api/recommend` 요청 바디에 프로필이 실제로 없는지 재확인한다 —
    문구만 고치고 코드가 다르면 방향만 뒤집힌 같은 거짓말이 된다
  - Commit: `fix(copy): 폐기된 순서 개인화 설명을 about·PRD 에서 걷어낸다 (ADR-0004 정합)`

- [ ] **step-2 — 설계도를 현행화하고 문구 규약을 신설한다**
  - Artifact: `changesets/20260721-sitemap-current/`
  - Files: (w) `docs/SITEMAP.md` · `docs/ARCHITECTURE.md` · `CLAUDE.md` · `AGENTS.md` ·
    (r) `research/2026-07-21-dr11-design-doc-audit.md`
  - Dependencies: step-1
  - 내용: 감사 B1~B6 을 반영한다(nav 5개 · `#upstage` 해소됨 · app 전체 그리드 제거 · about 6섹션 ·
    contribute 읽기 전용 · §9 결정 3건 종결 기록). §8 재방문 개인화를 ADR-0004 포인터로 교체하고,
    **화면 문구·라벨 규약** 절을 신설한다. ARCHITECTURE 본문의 Naver 잔재를 정리한다.
    `CLAUDE.md`·`AGENTS.md` 에 문서 동기화 규약을 한 절 추가한다.
  - Verify: SITEMAP 의 각 주장을 코드로 1:1 대조한 표를 changeset 에 남기고 불일치 0
  - Failure probe: SITEMAP 을 고친 직후 감사 문서 B 표를 역방향으로 다시 훑어 남은 항목이 없는지 확인
  - Commit: `docs(sitemap): 설계도를 실구현으로 현행화 + 문구·라벨 규약 신설`

- [ ] **step-3 — 랜딩 카운터를 정직하게, 아랫부분 문구를 손본다**
  - Artifact: `changesets/20260721-landing-copy/`
  - Files: (w) `public/index.html` · (r) `api/data.js` · `api/_lib/cafeterias.js`
  - Dependencies: step-2
  - 내용: `nCaf` 를 `cafeteriaBoard` 기반 **학식당 개수**로 교체하고 라벨이 세는 대상을 드러내게
    바꾼다. 나머지 카운터 2개도 규약에 맞춰 점검한다. 아랫부분(마키·band-warm·band-ink·CTA·클로징)
    문구를 현재 사실에 맞게 손질한다.
  - Verify: 배포 URL 카운터 값이 `/api/data` 의 `cafeteriaBoard` 실측과 일치 · `demo-smoke` PASS
  - Failure probe: 학식 데이터가 0건인 날(방학·주말) 카운터가 무엇을 보여주는지 확인한다 —
    `cafeteriaBoard` 는 항상 4곳을 내려주고 `open:false` 가 붙으므로 "0곳"과 "휴무"를 구분해 표시한다
  - Commit: `fix(landing): 학식 카운터를 학식당 개수로 + 아랫부분 문구 정리`

- [ ] **step-4 — 지도 마커 카드가 잘리지 않게 한다**
  - Artifact: `changesets/20260721-map-card-clip/`
  - Files: (w) `public/index.html` · (r) `public/app.html`
  - Dependencies: step-3
  - 내용: `app.html:469-480` 의 `fitCardIntoView()` 보정을 랜딩 데모(`.demo-body`)에 이식한다.
    카드 폭과 앵커가 다르므로(200px · `translate:-50% calc(-100% - 32px)`) 경계 계산을 랜딩 값으로 맞춘다.
  - Verify: 실브라우저 1440×900 에서 지도 네 모서리에 가장 가까운 마커를 각각 클릭해, 카드가
    `.demo-body` 경계 안에 완전히 들어오는지 `getBoundingClientRect` 로 측정한다
  - Failure probe: `prefers-reduced-motion` 환경(= `transitionend` 미발화 가능)에서 같은 케이스를
    재측정해 보정이 타이머에만 의존하다 실패하는지 확인한다
  - Commit: `fix(landing): 데모 지도 마커 카드가 가장자리에서 잘리지 않게 보정 이식`

- [ ] **step-5 — 사진 제보가 실패해도 사용자를 버리지 않는다**
  - Artifact: `changesets/20260721-contribute-fallback/`
  - Files: (w) `public/contribute.html` · (r) `docs/SITEMAP.md`
  - Dependencies: step-2
  - 내용: 0행 추출·파싱 실패 시 **수기 입력 폴백**(빈 행 1개 + 직접 입력)으로 흐름을 잇는다.
    "AI 가 채우고 사람이 고친다"를 정확도 실측치(M2)와 함께 화면에 명시한다.
  - Verify: 메뉴판이 아닌 임의 사진 1장을 실제로 올려 0행 경로를 타고 수기 입력으로 제출 직전까지
    도달하는 것을 실브라우저로 관측한다. **시트에는 제출하지 않는다**(테스트 제보 금지 규약)
  - Failure probe: 파일 크기·형식 거부 경로가 폴백 신설로 깨지지 않았는지 재확인한다
  - Commit: `feat(contribute): 파싱 0행·실패 시 수기 입력 폴백 + 정확도 정직 표기`

- [ ] **step-6 — 5페이지를 나란히 놓고 닫는다**
  - Artifact: `changesets/20260721-page-polish-close/` + `archive/reports/2026-07-22-dr11-design-truth.md`
  - Files: (w) `public/app.html` · `public/about.html` · `verification/matrix.md` · `docs/OPEN-ISSUES.md`
  - Dependencies: step-1 step-2 step-3 step-4 step-5
  - 내용: 메뉴 찾기(`app.html`)와 Upstage 절(`about.html#upstage`) 문구를 손본다. 5페이지를 연속으로
    열어 톤·nav·푸터·죽은 링크를 대조한다.
  - Verify: `demo-smoke` 전항 PASS · 단위 4종 전항 PASS · 실브라우저 5페이지(데스크톱 + 390px)
    콘솔 red 0 · 죽은 링크 0
  - Failure probe: **배포 후** 라이브 URL 로 같은 smoke 를 1회 더 돌려, 로컬만 통과하고 배포에 안 실린
    파일이 없는지 확인한다(`deploy-staging.mjs` 자동수집 신뢰 검증)
  - Commit: `fix(pages): 메뉴 찾기·Upstage 절 문구 정리 + DR11 통합 검증`

## DoD (통합)

- DoD: 공개 5페이지 어디에도 코드·ADR 과 어긋나는 주장이 없다 — 감사 문서 A·B·C·E 항목 전수 해소.
- DoD: `docs/SITEMAP.md` 의 모든 주장이 실구현과 1:1 대조돼 불일치 0, 문구·라벨 규약이 신설돼 있다.
- DoD: 랜딩 데모 지도에서 네 모서리 마커를 눌러도 카드가 잘리지 않는다.
- DoD: `contribute` 가 파싱 0행에서 사용자를 버리지 않고, 정확도를 숨기지 않는다.
- DoD: 배포 URL 에서 `demo-smoke` 와 단위 4종이 전항 PASS 이고 실브라우저 5페이지 콘솔 red 0.

## 수치 출처

DoD·검증에 쓰는 수치는 아래 커맨드의 실행 결과로만 확정한다. 기억·과거 로그의 숫자를 그대로 옮기지 않는다.

- 스모크: `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` (직전 실측 14/14)
- 단위: `node scripts/test-chat-extract.mjs` · `test-side-menu.mjs` · `test-personalization.mjs` · `test-chips.mjs`
- 학식당 수: `node -e "fetch('https://sixsense.askewly.com/api/data').then(r=>r.json()).then(d=>console.log(d.cafeteriaBoard))"`
- 파싱 정확도: `experiments/parse-poc/accuracy.md` (M2 실측 정본 — 화면에 쓸 숫자는 이 파일에서 읽는다)
- 카드 잘림: 실브라우저에서 `getBoundingClientRect()` 로 카드와 `.demo-body` 경계 비교
