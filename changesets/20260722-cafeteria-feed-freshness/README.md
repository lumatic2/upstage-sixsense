# 20260722-cafeteria-feed-freshness

- Target: OPEN-ISSUES ⑩ — "휴무" 가 "크롤 실패" 를 가리던 문제.
- Scope: `api/data.js` · `public/index.html` · `public/app.html` · `public/verify.html` · `docs/SITEMAP.md`(§2 app 블록3 · §5-6 신설).

## 문제

`todayBoard` 는 오늘자 학식 행이 0이면 **원인과 무관하게** 4곳을 `open:false` 로 내렸다. 화면은 그걸 전부 "휴무"로 그렸다 — **정상 휴무(주말·방학)와 크롤러 정지가 구분되지 않았다.** 2026-07-21 에 적재가 5일 밀린 채 "4곳 전부 휴무"가 실제로 떴다(`api/cron/crawl-cafeteria.js:4`). 파이프라인이 죽어도 서비스는 정상으로 보인다 — 파이프라인 20점을 주장하는 서비스에서 가장 나쁜 실패 모드다.

## 고친 것

`/api/data` 가 `cafeteriaFeed { lastDate, fresh }` 를 함께 내려준다. 신선도는 **이미 시트에 있는 값**이라 새 수집이 없다.

**판정 기준이 핵심이다**: "오늘 행이 있나"가 아니라 **"적재가 오늘까지 닿았나"**(`lastDate >= today`).
첫 구현은 `lastDate === today` 였는데 배포 직후 실측에서 **정상인데 지연으로 오판**했다 — 크롤러가 며칠치를 앞서 넣기 때문(`today=2026-07-22` 인데 `lastDate=2026-07-24`). 등호 비교였으면 오늘 당장 랜딩이 "정보 없음"이라 거짓말할 뻔했다.

| 화면 | fresh | stale |
|---|---|---|
| 랜딩 카운터 | `휴무` / `오늘의 학식` | `정보 없음` / `학식 정보 (적재 …까지)` |
| app 학식 카드 | `휴무` | `정보 없음` + 날짜줄에 지연 표기 |
| verify(운영) | `학식 적재 최신` | `학식 적재 지연(…까지)` + `stat bad` 상태색 |

## Verification — 배포 URL, 응답을 가로채 세 상태를 전부 관측

| 상태 | 랜딩 | app | verify |
|---|---|---|---|
| **적재 지연**(0곳·lastDate=07-17) | `정보 없음` / `학식 정보 (적재 2026-07-17까지)` | 카드 4장 `정보 없음` · 날짜줄 `오늘 정보 없음 (적재 2026-07-17까지)` | `학식 적재 지연(2026-07-17까지)` · class=`stat bad` |
| **진짜 휴무**(0곳·fresh) | `휴무` / `오늘의 학식` | 카드 `휴무` · 날짜줄 평소대로 | – |
| **실응답**(무개입, 회귀) | `1` / `오늘 문 연 학식당` | `패컬티식당/9,000원` + 나머지 `휴무` | – |

- [x] 세 상태 전수 (Playwright route intercept — 시트를 건드리지 않고 실패를 재현)
- [x] 콘솔 red 0
- [x] `demo-smoke` 14/14 · `test-side-menu` 41/41 · `test-chat-extract` 35/35
- [x] 라이브 `/api/data` 에 `cafeteriaFeed` 존재 (`lastDate=2026-07-24, fresh=true`)

**미적용**: `public/test.html` — `/verify.html` 승격 실패 시 원복용 개발 원본이고 배포에서 제외된다.

- Status: done (2026-07-22)
