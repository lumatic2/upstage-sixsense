# 한입지도 TRD (Technical Requirements Document)

> 2026-07-21 전면 개정. **이전 판(2026-07-15)은 팀원 원본 데모 `hanipmap` 의 문서였다** —
> Naver Maps · Supabase · `api/search.js` · 영업시간 판별처럼 이 레포에 없는 것을 설명하고 있었고,
> 정작 Upstage 적용은 한 줄도 없었다. 스택이 바뀔 때마다 ADR·ARCHITECTURE 만 갱신되고 이 문서는
> 7/15 에 멈춰 있었다. 이 판부터는 **이 레포가 실제로 돌리는 것**만 적는다.
>
> 결정 근거는 `docs/adr/` 가 정본이고, 이 문서는 그 결정들이 코드에서 어떤 모습인지를 적는다.

## 1. 개요

**한입지도**는 성균관대 명륜캠 학생이 예산·상황을 문장으로 말하면, **오늘의 학식과 주변 식당을
한 판에 놓고** 지금 갈 수 있는 곳을 추천하는 웹 서비스다.

- 타깃: 성균관대 명륜캠 학생 (자연캠은 범위 밖 — `docs/PRD.md`)
- 배포: `https://sixsense.askewly.com` (Vercel · 프로젝트 `upstage-sixsense-staging`)
- 저장소: `https://github.com/lumatic2/upstage-sixsense`
- 차별점: 가격·메뉴를 **1차 소스**로만 답한다 — 학식은 학교 페이지 크롤링, 식당은 메뉴판 사진을
  Document Parse 로 구조화한 뒤 **사람이 사진과 대조해 검수한 것만** 노출한다.

## 2. 시스템 아키텍처

```
[브라우저] public/*.html (Vanilla JS, 빌드 도구 없음)
  ├─ Kakao Maps JS SDK — 지도·마커 (키는 /api/config 로 주입, ADR-0002)
  ├─ localStorage — 대화 기억(관심어·직전 조건). 서버로 저장되지 않는다 (ADR-0004)
  └─ fetch → /api/*

[Vercel Functions] api/*.js — Upstage 키·시트 쓰기 토큰은 전부 여기서만 읽는다
  ├─ data        시트 3탭 로드 + 오늘 학식 보드
  ├─ chat        Solar 대화 (조건 추출·제안 칩·기억 주입)
  ├─ recommend   조건 → Top3 + Solar 이유 + 근거 검증 배지
  ├─ parse-query chat 이 죽었을 때의 구조화 폴백
  ├─ parse-menu  메뉴판 사진 → Document Parse → 메뉴·가격 후보
  ├─ contribute  제보 → 시트 [메뉴] 검수=대기 로 append
  ├─ review      검수 화면 전용 (REVIEW_TOKEN)
  ├─ config      Kakao JS 키 주입 + ready 플래그
  └─ cron/crawl-cafeteria  매일 06:10 KST 학식 자동 수집 (멱등)

[데이터 정본] 구글 시트 [식당]·[메뉴]·[학식]  ← 팀 공용, 유일한 정본 (ADR/ARCHITECTURE)
  ├─ 읽기: gviz CSV export (공개 링크, 60초 캐시)
  └─ 쓰기: Apps Script 웹훅 (SHEET_WEBHOOK_URL + TOKEN)

[외부] Upstage Document Parse · Solar (solar-pro2 / solar-mini) · Kakao Maps · 성대 학식 페이지
```

**설계 원칙**: 별도 백엔드 서버 없음. 정적 호스팅 + 서버리스 함수 + 시트(정본). **비밀이 필요한
호출은 전부 서버 함수를 거친다** — Upstage 키가 클라이언트에 나가면 대회 요건 이전에 사고다.

## 3. 기술 스택

| 영역 | 기술 | 비고 |
|---|---|---|
| 프론트엔드 | HTML5 · CSS3 · Vanilla JS (ES2022, 빌드 없음) | 팀원 데모 구조 유지 — Next.js 전환 안 함(ADR-0001) |
| 지도 | **Kakao Maps JS SDK** | Naver 에서 교체 (ADR-0002). JS 키는 도메인 제한 클라이언트 키 |
| 데이터 정본 | **구글 시트** [식당]·[메뉴]·[학식] | Supabase 는 2026-07-20 서비스 경로에서 제거 (검수 게이트 부재) |
| 시트 읽기 | gviz `out:csv` + 60초 메모리 캐시 (`api/_lib/sheet-data.js`) | 공개 링크라 시크릿 불필요 |
| 시트 쓰기 | Apps Script 웹훅 (`api/_lib/sheet-write.js`) | 행 삭제 불가 — 열 값 변경만 |
| 문서 AI | **Upstage Document Parse** (`/v1/document-digitization`) | 메뉴판 사진 → 메뉴·가격. 학식엔 쓰지 않는다(이미 HTML — ADR-0001) |
| 언어 모델 | **Upstage Solar** — `solar-pro2`(대화·이유 생성), `solar-mini`(근거 판정) | 생성과 검증에 **다른 모델**을 쓴다 (§5.4) |
| 배포 | Vercel (정적 + 함수 + Cron) | REST API 로 배포 (`scripts/deploy-staging.mjs`) |
| 클라이언트 저장 | `localStorage` — 관심어·직전 조건 | 계정 없음·서버 무상태 (ADR-0004) |

## 4. 데이터 모델 (시트 3탭)

| 탭 | 주요 열 | 규칙 |
|---|---|---|
| 식당 | `id · name · category · address · lat · lng · tags · collector · shot_date · status` | `tags` 는 고정 어휘 10종(혼밥·가성비·데이트·회식·단체·초밥·김밥·쌀국수·치킨·생선) |
| 메뉴 | `restaurant_id · name · price · source · 검수 · 비고` | **`검수=확인` 인 행만 노출** (`sheet-data.js` 에서 필터). `비고=사이드`/`한끼` 로 곁들임 판정을 사람이 뒤집는다 |
| 학식 | `menu_date · cafeteria · corner · items · price` | 크론이 append. 날짜는 KST 자정의 UTC 표기로 돌아오므로 `normDate` 필수 |

**곁들임(`isSide`) 판정은 코드가 한다** (`api/_lib/side-menu.js`) — 공기밥·음료가 "예산 안에 드는
한 끼"로 둔갑하던 문제. 사람이 시트 `비고` 열(`사이드`/`한끼`)로 규칙을 이길 수 있다.

## 5. 기능 상세

### 5.1 자연어 대화 (`api/chat.js`)
`solar-pro2` 구조화 출력으로 **답변 문장·조건·제안 칩**을 한 번의 왕복으로 받는다(대기 시간 절반).
프롬프트에 실제 보유 데이터 요약을 넣고 "여기 없는 건 모른다고 답하라"로 고정한다.

**결정론적 값은 코드가 뽑는다** — 예산·거리·태그(`extractConditions`). 프롬프트로 시켰더니
"만원 이하로 추천해줘"에서 6/6 실패했다. 모델은 사람 말로 답하는 일만 한다.
태그는 **어절 앞머리**에서만 잡는다(합성어 뒤꼬리가 검색 의도로 둔갑하는 것을 막는다).

### 5.2 제안 칩 (`api/_lib/chips.js`)
Solar 가 다음 질문 후보를 5개까지 내면 **서버가 실데이터로 돌려보고 살아남은 3개만** 내려보낸다.
예산은 그 금액에 본메뉴가 있는지, 도보는 상한 안에 실제로 있는지, 태그는 데이터 어휘인지를 센다.
라벨과 조건이 어긋나거나(“한식만 보기”+생선 태그) 예산을 몰래 올리는 칩은 버린다.

### 5.3 추천 (`api/recommend.js`)
검수 통과분만 후보로 삼고 `태그 일치 > 예산 내 본메뉴 수 > 도보 시간` 으로 정렬한다.
도보 상한에 아무것도 없으면 상한을 버리고 가까운 순으로 완화하되 `walkRelaxed` 로 화면에 밝힌다.
**개인화는 순서에 개입하지 않는다** — 프로필을 받지도 읽지도 않는다 (ADR-0004).

### 5.4 근거 검증 (환각 차단 게이트)
추천 이유는 `solar-pro2` 가 쓰고, **분리된 판정자 `solar-mini`** 가 그 문장이 전달된 실데이터에만
근거하는지 판정한다. `notGrounded` 면 데이터 템플릿 문장으로 **교체**하고 배지에 그 사실을 적는다.
판정 실패는 추천을 막지 않는다(배지만 생략).

### 5.5 학식 자동 수집 (`api/cron/crawl-cafeteria.js`)
매일 **21:10 UTC = 06:10 KST** 1회(Vercel Hobby 한도). 주간 뷰가 5일치를 주므로 1회로 충분하다.
`CRON_SECRET` 검증 · GET 만 허용 · 기존 행과 대조해 **멱등**(중복 append 0). 실패해도 500 을 내지
않는다 — 알림보다 "무슨 일이 있었는지"가 남는 게 낫다.

### 5.6 제보 → 검수 파이프라인
사진 → `parse-menu`(Document Parse) → 후보 프리필 → 사용자 수정 → `contribute` → 시트 `검수=대기`
→ `/review.html` 에서 **운영진이 사진과 대조** → `확인` → 서비스 노출.
M2 실측 정확도 76.4% 로, 자동 저장하지 않고 사람 검수를 전제로 설계했다.

### 5.7 대화 기억 (`api/_lib/memory.js`)
지난 방문에 물었던 관심어를 이어받아 답한다. **데이터 대조를 통과한 낱말만** 저장하고
(“마라탕버거”는 기억하지 않는다), 꺼낼 때마다 현재 데이터로 재검증한다.
없는 기억을 말하는 문장은 코드가 지운다(`stripFabricatedMemory`). 정의·경계는 **ADR-0004**.

### 5.8 길찾기
추천·마커 카드에서 카카오맵으로 좌표를 넘긴다(`map.kakao.com/link/to/이름,lat,lng`).
추가 데이터도 키도 필요 없다. **그 클릭은 기록하지 않는다** (ADR-0004 §2).

## 6. 외부 API

| API | 용도 | 키 | 호출 위치 |
|---|---|---|---|
| Upstage Document Parse | 메뉴판 사진 구조화 | `UPSTAGE_API_KEY` | 서버 함수만 |
| Upstage Solar | 대화·이유 생성·근거 판정 | `UPSTAGE_API_KEY` | 서버 함수만 |
| Kakao Maps JS SDK | 지도·마커 | `KAKAO_JS_KEY` (도메인 제한) | 클라이언트 (`/api/config` 주입) |
| Kakao 로컬 | [식당] 탭 지오코딩 (`scripts/geocode-sheet.mjs`, 배포 코드 미포함) | `KAKAO_REST_API_KEY` | 로컬 스크립트 |
| 구글 시트 gviz | 데이터 읽기 | 없음(공개 링크) | 서버 함수 |
| Apps Script 웹훅 | 데이터 쓰기 | `SHEET_WEBHOOK_TOKEN` | 서버 함수만 |
| 성대 학식 페이지 | 학식 크롤 | 없음 | 서버 함수(크론) |

## 7. 보안 설계

- **키 분리**: 노출돼도 되는 키(Kakao JS 키 — 도메인 제한)와 절대 안 되는 키(Upstage·시트 쓰기·검수·크론)를
  가른다. 후자는 Vercel env 로만 보관하고 서버 함수에서만 읽는다.
- **검수 게이트**: 익명 제보는 항상 `검수=대기` 로만 들어간다. 노출 승격은 `/review.html`(운영진 토큰)에서만.
- **크론 보호**: 공개 URL 이므로 `Bearer $CRON_SECRET` 검증 + GET 만 허용.
- **개인정보 없음**: 계정·식별자를 만들지 않는다. 대화 기억은 브라우저에만 있고 서버는 무상태다.
- `.env` 는 커밋 대상에서 제외. 토큰은 로그·출력에 남기지 않는다.

## 8. 배포

```bash
node scripts/deploy-staging.mjs        # VERCEL_TOKEN 필요. FILES 자동 수집(제외는 DEPLOY_EXCLUDE)
node scripts/with-vercel-env.mjs <스크립트>   # 시트 쓰기 자격이 필요한 로컬 스크립트
```

필요한 Vercel 환경변수: `UPSTAGE_API_KEY` · `KAKAO_JS_KEY` · `KAKAO_REST_API_KEY` ·
`SHEET_WEBHOOK_URL` · `SHEET_WEBHOOK_TOKEN` · `REVIEW_TOKEN` · `CRON_SECRET`.
env 변경 후에는 재배포해야 반영된다.

## 9. 검증

```bash
node scripts/test-chat-extract.mjs      # 조건 추출 문형 고정
node scripts/test-chips.mjs             # 제안 칩 검증 규칙
node scripts/test-personalization.mjs   # ADR-0004 경계 (순서 미개입·기억 판정)
node scripts/test-side-menu.mjs         # 곁들임 판정
node scripts/demo-smoke.mjs --url https://sixsense.askewly.com   # 시연 시나리오 E2E
```

## 10. 알려진 제약

- **메뉴·가격 데이터는 공개 API 가 없다.** 수동 큐레이션 + 사진 제보로만 채워진다 — 그래서
  "사진 한 장으로 제보 비용을 낮춘다"가 이 서비스의 승부수다.
- **도보 시간은 직선거리 추정**(÷80m/분)이라 실제 경로와 오차가 있다 (`api/_lib/geo.js`).
- **영업시간 데이터가 없다.** 그래서 "지금 열린 곳"·시간대 개인화를 하지 않는다 (ADR-0004 §5).
- **검수는 수동**이다. 제보량이 늘면 별도 관리 화면이 필요하다.
- Vercel Hobby 크론은 하루 1회 — 학식 주간 뷰라 지금은 충분하지만 일 단위 갱신원이 늘면 걸린다.
