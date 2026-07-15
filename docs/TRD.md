# 한입지도 TRD (Technical Requirements Document)

## 1. 개요

**한입지도**는 성균관대학교 명륜캠퍼스 주변 맛집을, 사용자가 처한 "상황"(예산, 거리, 시험기간, 해장, 격식 있는 자리 등)에 맞춰 자연어 조건으로 추천해주는 웹 서비스다.

- **타겟 사용자**: 성균관대 명륜캠퍼스 학생
- **핵심 가치 제안**: 단순 위치 기반 지도가 아니라, "지금 내 상황(예산·시간·목적)에 맞는 한 끼"를 구체적인 메뉴 조합으로 추천
- **배포 도메인**: `https://hanipmap.vercel.app` (Vercel, `main` 브랜치 자동 배포)

## 2. 시스템 아키텍처

```
[브라우저]
  ├─ index.html / style.css / app.js (정적 파일, 프레임워크 없는 Vanilla JS)
  ├─ Naver Maps JS SDK (지도 렌더링, 클라이언트 직접 로드)
  └─ Supabase JS client (DB 읽기/쓰기, RLS로 접근 제어)

[Vercel]
  ├─ 정적 파일 호스팅 (index.html, style.css, app.js)
  └─ 서버리스 함수 /api/search.js (네이버 지역 검색 API 프록시, Secret 보관)

[Supabase]
  └─ Postgres `restaurants` 테이블 + RLS 정책 (PostgREST로 REST API 자동 노출)

[외부 API]
  ├─ Naver Maps (지도 타일/마커)
  ├─ Naver 지역 검색 API (서버리스 경유, 실제 상호명/주소/좌표 조회)
  └─ Kakao 로컬 API (1회성 로컬 스크립트로 대량 수집, 배포 코드에는 미포함)
```

**설계 원칙**: 백엔드 서버를 별도로 두지 않고, 정적 호스팅(Vercel) + 서버리스 함수 + BaaS(Supabase)만으로 운영한다. Secret이 필요한 API 호출만 서버리스 함수를 거치고, 나머지는 클라이언트에서 직접 호출한다.

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | HTML5, CSS3, Vanilla JavaScript (ES2017+, 빌드 도구 없음) |
| 지도 | Naver Maps JS SDK v3 (`ncpKeyId` 방식) |
| 장소 검색 (실시간) | 네이버 지역 검색 API (`openapi.naver.com/v1/search/local.json`) |
| 장소 대량 수집 (1회성) | 카카오 로컬 카테고리 검색 API (`dapi.kakao.com/v2/local/search/category.json`) |
| 데이터베이스 | Supabase (Postgres + PostgREST + Row Level Security) |
| 배포/호스팅 | Vercel (정적 파일 + 서버리스 함수) |
| 클라이언트 상태 저장 | `localStorage` (최근 검색어, 기본 조건) |

## 4. 데이터 모델

### `public.restaurants`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint (identity) | PK |
| `name` | text, not null | 상호명 |
| `address` | text | 도로명주소 |
| `lat` / `lng` | double precision, not null | 좌표 (WGS84) |
| `walk_minutes` | integer | 캠퍼스 기준 도보 시간(분). 직선거리 ÷ 80m/분으로 추정 |
| `typical_price` | integer | 대표 가격(원), 목록 카드 표시용 |
| `tags` | text[] | 상황별 태그: `lonely`(혼밥) / `budget10k`(1만원 이하) / `walk5`(도보5분) / `exam247`(시험기간 24시) / `hangover`(해장) / `formal`(격식) / `splurge`(비싼날) |
| `menu` | jsonb | `{name, price}[]` — 예산 맞춤 메뉴 조합 계산에 사용 |
| `hours` | jsonb | `{open, close, breakStart?, breakEnd?, is24h?}` |
| `base_reason` | text | 예산 미지정 시 노출되는 기본 추천 문구 |
| `status` | text, check (`pending`\|`approved`) | 승인 상태 |
| `submitted_by` | text | 제보자 정보(선택) |
| `created_at` | timestamptz | 생성 시각 |

### RLS 정책

- **읽기(SELECT)**: `status = 'approved'` 인 행만 익명 사용자에게 공개
- **쓰기(INSERT)**: 익명 사용자도 새 행을 추가할 수 있으나, `WITH CHECK (status = 'pending')`로 강제되어 항상 대기중 상태로만 생성 가능
- **승인(UPDATE)**: 익명 역할에 UPDATE 정책을 부여하지 않음 → 승인은 프로젝트 소유자가 Supabase Table Editor 또는 SQL Editor에서 직접 수행 (전용 어드민 UI 없음)

## 5. 핵심 기능 명세

### 5.1 자연어 조건 파싱
- `parseBudget(text)`: "8천원 이하" → 8000, "1만원" → 10000 등 정규식 기반 파싱
- `parseWalkMax(text)`: "도보 5분", "300m 이내"(→ 도보 시간으로 환산, 80m/분 가정) 파싱

### 5.2 상황별 태그 필터링
7개 태그 칩 클릭 시 단일 선택(재클릭 시 해제)으로 `activeTag` state를 설정하고, 검색어 텍스트도 함께 채워 필터링에 반영

### 5.3 예산 맞춤 메뉴 추천 (`bestCombo`)
메뉴 항목 부분집합(브루트포스, 항목 수가 적어 O(2ⁿ)으로 충분)을 순회하며 예산 이하에서 총액이 최대인 조합을 계산, 자연어 문장으로 조립 (예: "'순대국밥 특'에 '공기밥' 추가하면 8,000원으로 예산에 딱 맞아요")

### 5.4 영업시간/브레이크타임 판별 (`hoursStatus`)
브라우저의 실제 현재 시각(`new Date()`) 기준으로 영업중/브레이크타임/영업종료/정보없음 상태를 계산. 영업중이 아닌 곳(닫힘/브레이크타임)은 검색 결과에서 자동 제외되나, "정보없음"은 제외하지 않음(데이터가 없을 뿐 실제로 닫혀있다고 단정할 수 없으므로)

### 5.5 지도 마커 인터랙션
- 목록 카드 hover → 해당 마커 확대 강조 (`hover-focus`, 선택 상태와 무관)
- 카드/마커 클릭 → 선택 상태(`active`) 전환 + 지도 `panTo`로 포커싱
- 마커는 Naver Maps의 HTML 콘텐츠 마커 기능으로 구현, 상태 변경 시 `setIcon`으로 재렌더

### 5.6 랜덤 추천 (셔플)
현재 필터링된 목록(`currentList`) 내에서 무작위 선택을 짧게 순환한 뒤 최종 선택으로 착지

### 5.7 개인화 (localStorage)
- 최근 검색어 최대 5개 저장/재사용
- "기본 조건 저장" 후 원클릭으로 재검색

### 5.8 제보(크라우드소싱)
1. 사용자가 상호명 입력 → "주소 찾기" 클릭 → `/api/search`(네이버 지역 검색)로 실제 주소·좌표 자동 조회
2. 메뉴(`메뉴명:가격` 줄바꿈 입력), 태그, 영업시간, 한줄평, 제보자 정보 입력
3. 제출 시 Supabase에 `status='pending'`으로 insert (anon key, RLS로 pending 강제)
4. 운영자가 Table Editor에서 `status`를 `approved`로 변경하면 즉시 서비스에 노출

## 6. 외부 API 연동 상세

| API | 용도 | 키 종류 | 호출 위치 | 비고 |
|---|---|---|---|---|
| Naver Maps JS SDK | 지도 렌더링 | Client ID (공개, 도메인 화이트리스트로 보호) | 클라이언트 직접 | NCP 콘솔에 서비스 도메인 등록 필요 |
| Naver 지역 검색 API | 실시간 상호명/주소/좌표 조회 | Client ID + **Secret** | 서버리스 함수(`api/search.js`)만 | Secret은 Vercel 환경변수로만 보관 |
| Supabase | 식당 데이터 CRUD | anon/publishable key (공개, RLS로 보호) | 클라이언트 직접 | `service_role` 키는 코드/리포에 존재하지 않음 |
| Kakao 로컬 API | 반경 기반 대량 장소 수집 (1회성) | REST API 키 | 로컬 1회성 스크립트 (배포 코드 미포함) | 카테고리당 최대 45건 제한 (페이지네이션 한계) |

## 7. 보안 설계

- **Secret 분리**: 브라우저에 노출돼도 되는 키(Naver Maps Client ID, Supabase anon key)와, 반드시 서버 측에만 있어야 하는 키(Naver 검색 Secret)를 명확히 구분
- **`.gitignore`**: `.env`, `.env.local`을 커밋 대상에서 제외
- **RLS를 이용한 최소 권한 원칙**: 익명 사용자는 승인된 데이터만 읽고, 신규 제보만 (항상 대기 상태로) 쓸 수 있음. 승인·삭제 권한은 부여하지 않음
- **카카오 REST 키**: 실시간 서비스에 포함되지 않고 1회성 수집에만 사용되었으므로 배포 환경변수에도 등록하지 않음

## 8. 배포 환경 (Vercel)

**필요 환경변수**
| 변수명 | 용도 |
|---|---|
| `NAVER_SEARCH_CLIENT_ID` | 네이버 지역 검색 API 인증 |
| `NAVER_SEARCH_CLIENT_SECRET` | 네이버 지역 검색 API 인증 (서버리스 함수 전용) |

환경변수 변경 후에는 반드시 재배포(Redeploy)해야 반영된다.

**외부 콘솔 설정**
- 네이버 클라우드 플랫폼 콘솔: Naver Maps Client ID의 "Web 서비스 URL"에 `https://hanipmap.vercel.app` 등록 필요 (Vercel의 브랜치별 임시 미리보기 URL은 등록 대상에서 제외하고, 고정된 프로덕션 도메인만 등록)

## 9. 알려진 제약사항 및 향후 과제

- **메뉴/가격 데이터의 구조적 한계**: 어떤 공개 API도 메뉴·정확한 가격 데이터를 제공하지 않음(배달앱들이 비공개로 보유). 현재는 (1) 소수 수동 큐레이션 + (2) 사용자 제보로만 채워지며, 자동 수집된 96곳 중 대다수는 메뉴 정보가 비어 있는 상태
- **도보 시간 추정치의 부정확성**: 실제 도보 경로가 아닌 직선거리 기반 추정(÷80m/분)이라 실제와 오차가 있을 수 있음
- **Kakao 로컬 API의 수집 한도**: 카테고리+반경 조합당 최대 45건까지만 조회 가능. 더 넓은 커버리지가 필요하면 반경을 여러 구역으로 나누어(subdivide) 추가 수집 필요
- **승인 프로세스 미자동화**: 현재 승인은 Supabase Table Editor에서 수동으로 처리. 제보량이 늘어나면 별도 관리자 화면이 필요할 수 있음
- **네이버 지역 검색 API의 정확도**: 키워드 매칭 기반이라, 검색어가 모호하면 의도한 것과 다른 업체가 매칭될 수 있음
