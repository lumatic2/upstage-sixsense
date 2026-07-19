# 데모데이 실전 데이터 파이프라인 리서치 — 식당·메뉴 소싱과 검증

> 2026-07-19 조사. 대상: 지오코딩(네이버/카카오), 성대 학식 페이지 구조, 파싱 검증 UX·이상치 탐지·신선도 관리, 구글 시트 연동 패턴.
> 사전 맥락: `docs/PRD.md`(사진 제보 파이프라인이 차별화 축), `docs/ARCHITECTURE.md`(Supabase + Vercel functions, 학식은 `welfare_11.do` HTML 크롤링 예정), `experiments/parse-poc/accuracy.md`(Document Parse 실측 정확도 76.4%, 프리필+사용자수정 3단 구조 필수로 실증됨 — 가격 오독 사례 7.0→17.0원 확보).

---

## 1. 지오코딩: 네이버 클라우드 vs 카카오 로컬 API

### 1-1. 네이버 클라우드 플랫폼 Maps Geocoding API

- **엔드포인트**: `GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode`
- **인증**: 헤더 `x-ncp-apigw-api-key-id`, `x-ncp-apigw-api-key` (NCP 콘솔에서 애플리케이션 등록 후 발급). `Accept: application/json` 필수.
- **요청 파라미터**: `query`(필수, 검색 주소), `coordinate`(선택, 중심좌표 우선순위), `filter`(행정동/법정동 코드), `language`(kor/eng), `page`/`count`.
- **응답**: `status`, `meta.totalCount`, `addresses[]` — 각 원소에 `roadAddress`, `jibunAddress`, `x`(경도)/`y`(위도), `distance`, `addressElements`.
- **무료 쿼터**: 공식 문서에 구체적 무료 건수가 게시되어 있지 않음(콘솔에서 계정별 이용 한도를 직접 설정하는 방식). NCP FAQ #2828은 "대표 계정에 한해 무료 이용량 제공"이라고만 언급하고 수치는 확인 불가 — **정확한 값은 콘솔 로그인 후 직접 확인 필요**.
  - 출처: https://guide.ncloud-docs.com/docs/maps-geocoding-api (접근 2026-07-19)
  - 출처: https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding-geocode (접근 2026-07-19)
  - 출처: https://www.ncloud.com/support/faq/prod/2828 (접근 2026-07-19, 상세 수치 미확인)

### 1-2. 카카오 로컬 API (주소 검색)

- **엔드포인트**: `GET https://dapi.kakao.com/v2/local/search/address.json`
- **인증**: 헤더 `Authorization: KakaoAK {REST_API_KEY}` — REST API 키 하나로 간단히 인증.
- **요청 파라미터**: `query`(필수), `analyze_type`(similar 기본값/exact), `page`(1~45), `size`(1~30, 기본 10).
- **응답**: `meta.total_count`/`pageable_count`/`is_end`, `documents[]` — 각 원소에 `address_name`, `address_type`, `x`/`y`(문자열), `address{}`(지번 상세), `road_address{}`(도로명 상세).
- **무료 쿼터**: 주소→좌표 변환 포함 로컬 API 전 기능이 **일일 100,000건** 무료(가입만 하면 별도 결제 없이 즉시 사용, 앱 등록 후 REST API 키 발급).
  - 출처: https://developers.kakao.com/docs/ko/local/dev-guide (접근 2026-07-19)
  - 출처: https://developers.kakao.com/docs/ko/getting-started/quota (접근 2026-07-19)

### 1-3. 이 규모(식당 수십 곳)에 대한 판단

- 필요 요청량은 식당 수십 건 × 1회(주소 확정 후 재호출 거의 없음) — 실질적으로 **양쪽 다 용량은 문제되지 않는다.**
- 결정적 차이는 (a) **인증 단순성**: 카카오는 REST API 키 1개 헤더만 넣으면 끝, 네이버는 키 ID+키 두 개에 애플리케이션 등록 시 "Maps" 서비스 활성화 여부까지 확인해야 함(비활성 시 429). (b) **쿼터 투명성**: 카카오는 공식 문서에 100,000건/일이 명시돼 즉시 확인 가능하지만, 네이버는 콘솔 로그인 전까지 수치를 알 수 없음.
- 팀은 이미 **Naver Maps JS + Local Search API**를 지도/장소검색에 쓰고 있으므로(ARCHITECTURE.md), 네이버 클라우드 계정·앱 등록이 이미 돼 있을 가능성이 높다 — 그렇다면 Geocoding도 같은 NCP 앱에 서비스만 추가하면 되어 신규 계정 생성 비용이 없다. 반대로 신규로 지오코딩만 붙이는 거라면 **카카오 로컬 API가 온보딩이 더 빠르고 쿼터가 명시적**이라 추천.
- **결론(권고)**: 이미 NCP 계정이 있다면 **네이버 Geocoding을 그대로 사용**(같은 콘솔, 같은 청구 주체, 지도 좌표계 일치성 보장). 계정이 새로 필요하거나 5분 안에 검증부터 끝내야 하면 **카카오 로컬 API**로 선회 — 키 발급이 즉시고 쿼터가 문서에 명시돼 있어 데모 직전 불확실성이 적다.

---

## 2. 성균관대 명륜캠(인문사회과학캠퍼스) 학식 페이지 구조

- **공식 URL**: `https://www.skku.edu/skku/campus/support/welfare_11.do` (인문사회과학캠퍼스=명륜캠). 자연캠은 `welfare_11_1.do`, 모바일은 `welfare_11_m.do`.
  - 출처: https://www.skku.edu/skku/campus/support/welfare_11.do (접근 2026-07-19)
- **페이지 구성**: 탭으로 인문사회과학캠퍼스/자연과학캠퍼스 구분. 명륜캠 학생식당 4곳이 썸네일 카드로 나열:
  1. 패컬티식당 (600주년기념관 6층)
  2. 은행골식당 (600주년기념관 지하1층, 중식 11:00~13:30)
  3. 법고을식당 (법학관 지하2층)
  4. 금잔디식당 (경영관 지하2층)
  각 카드에 "메뉴 보기" 링크 + 캠퍼스맵 연동 아이콘(`campusMap.do?category=sisulList&campusCd=1&kind=0201&buildNo=`).
- **주간 식단 형식**: 정적 HTML 최초 로드분에는 요일별 식단표 데이터가 **직접 포함돼 있지 않음** — "메뉴 보기" 클릭 시 별도 페이지/모달로 로드되는 구조로 추정된다. 정적 GET만으로는 이번 조사에서 실제 식단표 데이터를 확보하지 못했다(카드 정보까지만 확인). ARCHITECTURE.md 는 팀이 이미 이 페이지에서 "HTML 표"를 스크린샷으로 확보했다고 기록(`docs/research/assets/skku_faculty_menu.png` 등)하고 있어, 실제로는 팝업/서브페이지 안에 표가 있을 가능성이 높다 — **크롤러 구현 전 브라우저로 "메뉴 보기" 클릭 후의 실제 요청(Network 탭)을 1회 확인해 대상 URL을 특정하는 단계가 필요**하다(ARCHITECTURE.md의 "쿼리 파라미터 direct GET 먼저 시도, 안 되면 Playwright" 전략과 일치).
- **결론**: 크롤링 가능성 자체는 열려 있으나(이미 팀이 표 스크린샷 확보), **엔드포인트가 메인 페이지 GET 하나로 끝나지 않고 최소 1단계 서브 요청(메뉴 보기 클릭 후 로드)을 거친다** — Playwright 경로를 기본으로 잡는 편이 안전.

---

## 3. 메뉴판 사진 → 구조화 데이터 파이프라인의 품질 검증

### 3-1. 검수 UX 패턴: 프리필 + 사람 수정 (Human-in-the-loop)

- 업계 표준 패턴은 **OCR/파서가 1차 추출한 결과를 편집 가능한 폼에 프리필하고, 사람이 이미지 옆에서 대조하며 수정한 뒤 승인**하는 구조다. 오류가 의심되는 필드는 하이라이트하거나 대안 인식 결과를 함께 제시하는 방식이 일반적이다.
  - 출처: https://thefromdata.com/ai-data-services/data-labeling/ocr-digitization/ (접근 2026-07-19)
- 이 프로젝트의 실측(`experiments/parse-poc/accuracy.md`)이 정확히 이 패턴의 필요성을 증명한다: 전체 정확도 76.4%, 가격 오독 실사례(7.0→17.0원) 확보 — **자동 DB 반영 금지, "파싱 결과 프리필 → 사용자 수정 → 승인" 3단 구조가 필수**라고 이미 결론 내림. 리서치 결과는 이 결론이 업계 일반 패턴과 일치함을 뒷받침한다.

### 3-2. 가격 이상치 탐지

- 공통 접근은 (a) **하드 규칙**: 0원·음수·비현실적 상한(예: 10만원 초과 단품 메뉴) 같은 명백한 오류를 룰 기반으로 즉시 차단, (b) **통계적 이상치**: 같은 카테고리/같은 식당 내 가격 분포에서 IQR(사분위범위) 기반 Tukey fence, 또는 "같은 카테고리 대비 2배 이상" 같은 상대 임계값으로 하이라이트만 하고 자동 거부는 하지 않는 것.
  - 출처: 크라우드소싱 식품 가격 데이터에서 Tukey 방법(IQR fence) + 전문가 지식 결합 사례 — https://www.nature.com/articles/s41597-023-02211-1 (접근 2026-07-19)
  - 출처: 임계값 기반 이상 탐지(정적/동적/적응형 임계값 + 비즈니스 룰 결합) 개념 정리 — https://popcorngtm.com/blog/how-restaurant-data-intelligence-platforms-use-ai-for-anomaly-detection (접근 2026-07-19)
- `accuracy.md`가 이미 "같은 카테고리 대비 2배↑" 후보를 잔여 실패 모드 대응책으로 적어뒀다 — 이 규모(수십 곳, 항목당 수백 건)에서는 통계적 이상치 탐지보다 **하드 룰(0원/10만원 초과) + 사용자 프리필 화면에서의 시각적 하이라이트**만으로 충분하다. 표본이 적어 카테고리별 분포 기반 임계값은 과설계.

### 3-3. 데이터 신선도(Staleness) 관리

- 실무 패턴은 단순하다: 레코드에 **`collected_at`(수집일시) 컬럼**을 두고, 조회 시 "N일 이상 경과 시 신선도 배지(예: '3일 전 정보')"를 노출하거나 정렬 우선순위를 낮추는 방식. 학식처럼 매일 바뀌는 데이터는 `date` 컬럼으로 당일자만 노출하고 지난 날짜는 자동 숨김(만료) 처리하는 것이 일반적 — TTL 개념을 애플리케이션 레벨에서 구현.
- 이 프로젝트 맥락: `cafeteria_menus`는 날짜 컬럼 기준 당일 것만 노출(자연 만료), `restaurants`(메뉴판 사진 제보)는 `collected_at` + "최종 확인일" 배지로 충분 — 실시간 갱신 인프라(webhook 등)는 대회 규모에서 불필요.

---

## 4. 구글 시트를 데이터 창고로 쓸 때의 Vercel serverless 연동 패턴

| 방식 | 인증 | 장점 | 단점 |
|---|---|---|---|
| **공개 CSV export (gviz)** | 없음(시트 "링크가 있는 모든 사용자" 공개 필요) | 서버 코드 0줄, `fetch(url)`만 하면 끝 | 쓰기 불가(읽기 전용), 시트가 완전 공개돼야 함 |
| **Google Sheets API + 서비스 계정** | 서비스 계정 JSON(`client_email`+`private_key`를 env var로) | 읽기/쓰기 모두 가능, 비공개 시트 유지 가능 | Vercel env var에 개행 포함 private key 넣을 때 `\n` 이스케이프 이슈 실무적으로 자주 발생. Edge Runtime에서는 `googleapis` 패키지 대신 REST fetch 직접 호출 필요(Node runtime이면 무관) |

- **공개 CSV export URL 형식**: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}` — 쿼리(`tq=SELECT ...`)까지 붙이면 필터링도 서버 없이 가능.
  - 출처: https://github.com/rezzvy/tqsheet (접근 2026-07-19)
  - 출처: https://sites.google.com/view/metricrat-ai2/guides/use-gviz-to-get-and-query-google-sheet-data (접근 2026-07-19)
- **서비스 계정 방식의 Vercel 함정**: googleapis 패키지는 Node의 `https` 모듈을 쓰므로 Edge Function에서는 동작하지 않음 — REST API를 fetch로 직접 호출해야 함. env var에 넣은 private key의 개행 문자가 실제 `\n`(이스케이프 문자)로 남지 않게 처리 필요.
  - 출처: https://sdorra.dev/posts/2023-08-03-google-auth-on-the-edge (접근 2026-07-19)
  - 출처: https://github.com/vercel/next.js/discussions/38430 (접근 2026-07-19)

### 이 프로젝트에 대한 판단

- 팀은 이미 구글 시트를 "안내/식당/메뉴/학식" 4탭 데이터 창고로 쓰기로 확정했고(CLAUDE.local.md 핸드오프), DB 본체는 Supabase다. 시트는 **팀원이 수기로 채우는 원본**이고 앱이 읽는 대상은 Supabase이므로, 시트→Supabase로 **일회성/배치성 이관**만 되면 되고 실시간 API 연동은 불필요할 가능성이 높다.
- 만약 앱이 시트를 직접 읽어야 하는 요구가 생기면(예: 지오코딩 스크립트가 시트를 읽고 다시 쓰는 경우): **쓰기가 필요하므로 CSV export만으론 부족 — 서비스 계정 경로가 필수.** 반대로 읽기 전용(예: Vercel 함수가 시트 데이터를 그대로 노출하는 캐시성 API)이면 공개 CSV export가 코드 0줄로 가장 빠르다.

---

## 파이프라인 구성 추천안

**지오코딩**: 카카오 로컬 API(주소→좌표)를 1회성 배치 스크립트로 사용해 시트 [식당] 탭의 주소 컬럼 → 위도/경도 컬럼을 채운다.
- 근거: 이미 별도 인증 절차 없이 REST 키 하나로 즉시 시작 가능하고, 100,000건/일 쿼터가 문서에 명시돼 데모 직전 리스크가 없다. 식당 수십 건은 단발성 스크립트로 끝나므로 기존 Naver 지도 좌표계(WGS84)와의 정합성만 확인하면 된다(카카오도 WGS84 반환).

**학식**: `welfare_11.do`는 진입점일 뿐 실제 식단표는 서브 요청(메뉴 보기 클릭 후)에 있다 — Playwright로 "메뉴 보기" 클릭 후 로드되는 실제 URL을 1회 확인 → 가능하면 그 URL을 직접 GET, 안 되면 Playwright 스크래핑을 스케줄 크롤러로 유지. 결과는 [학식] 탭 대신 바로 `cafeteria_menus` 테이블에 `date` 컬럼과 함께 적재해 당일 것만 자연 노출시킨다.

**메뉴판 사진 검증**: 이미 확정된 "Document Parse → 프리필 폼 → 사용자 수정 → 승인" 3단 구조를 유지하되, 프리필 단계에 하드 룰(가격 0원 또는 100,000원 초과 시 빨간 하이라이트)만 추가한다. 표본이 적어 통계적 이상치 탐지는 과설계이므로 구현하지 않는다. `collected_at` 컬럼으로 신선도를 기록하고, 목록 UI에서 오래된 항목에 "N일 전 확인" 배지만 붙인다(추가 인프라 불필요).

**구글 시트**: 팀 원본 입력 창구로만 유지하고 앱은 Supabase만 읽는다. 지오코딩 스크립트가 시트를 직접 읽고 쓰는 로컬 1회성 작업이라면 서비스 계정(Node 환경, 로컬 실행이면 Edge 제약 없음)을 쓰고, Vercel 함수가 시트를 실시간으로 노출해야 하는 요구가 새로 생기지 않는 한 API 연동 코드를 앱에 추가하지 않는다 — 대회 남은 일정에서 불필요한 인증 배관을 늘리지 않는 것이 우선.
