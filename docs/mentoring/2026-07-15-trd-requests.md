# TRD 보완 요청 — 한입지도

> 2026-07-15. TRD 잘 읽었습니다 — RLS 설계랑 §9 한계 정리가 특히 좋았어요.
> 아래는 대회 루브릭(파이프라인 20점 + 처리 깊이 15점 + Upstage 활용 20점) 기준으로 TRD에 추가·보완이 필요한 부분입니다.
> **①번(Upstage 섹션)은 초안을 아래 그대로 써놨으니 검토 후 TRD에 붙여넣기만 하면 됩니다.** 나머지는 데이터/운영 정보를 갖고 있는 사람만 채울 수 있는 부분이에요.

---

## ① Upstage 통합 섹션 — 초안 완성본 (검토 후 TRD에 삽입)

⚠ 대회 규정상 **Upstage 제품 최소 1종 사용은 필수(미사용 = 실격)**인데 현재 TRD에 Upstage가 없습니다. 아래 초안을 §5 뒤에 5.9/5.10으로, 표는 §6·§8에 병합해주세요.

### 5.9 메뉴판 사진 제보 — Upstage Document Parse (신규)

기존 제보 폼의 "메뉴명:가격 줄바꿈 타이핑"을 사진 업로드로 대체한다.

1. 사용자가 제보 폼에서 메뉴판 사진(JPEG/PNG)을 업로드
2. 클라이언트 → `POST /api/parse-menu` (Vercel 서버리스 함수, 신규)
3. 함수가 Upstage Document Parse API 호출 (`https://api.upstage.ai/v1/document-digitization`, `model: document-parse`) → 표/텍스트 구조 추출
4. 추출 결과에서 메뉴명·가격 후보를 `{name, price}[]`로 정리해 응답
5. **자동 저장하지 않는다** — 제보 폼에 파싱 결과를 미리 채워서 보여주고, 사용자가 틀린 항목을 수정한 뒤 제출 (기존과 동일하게 `status='pending'` insert)
6. 원본 사진은 Supabase Storage에 보관 (검수자가 승인 시 원본 대조용)

- 왜 이 방식: 메뉴·가격 데이터는 어떤 공개 API도 제공하지 않고(§9 첫 항목 그대로), 실제 가격은 메뉴판 사진 안에만 존재. 파싱→사람 확인→승인 3단 구조라 오염을 막으면서 제보 비용을 "수 분 타이핑"→"사진 1장"으로 낮춤.
- 비용: Document Parse $0.01/페이지, 가입 시 $10 무료 크레딧 (≈1,000장 — 대회 기간 충분)

### 5.10 자연어 조건 파싱 고도화 — Upstage Solar (기존 5.1 확장)

기존 정규식(`parseBudget`/`parseWalkMax`)을 1차 파서로 유지하고, Solar를 그 위에 얹는다.

1. 검색어 입력 → `POST /api/parse-query` (신규 서버리스 함수)
2. Solar chat API에 검색어를 보내 JSON으로 구조화: `{budget: 8000, walkMax: 5, tags: ["formal"], mood: "..."}` — "과선배가 사는 날", "해장 필요" 같은 정규식이 못 잡는 상황 표현을 태그로 매핑
3. **Solar 실패/타임아웃(2초) 시 기존 정규식으로 폴백** — 데모 중 외부 API 장애에도 검색은 항상 동작
4. 추천 이유 문장(`reasonFor`)도 Solar로 생성 (조합 계산 결과 + 상황을 넣어 자연스러운 한 문장)

### §6 API 표에 추가할 행

| API | 용도 | 키 종류 | 호출 위치 | 비고 |
|---|---|---|---|---|
| Upstage Document Parse | 메뉴판 사진 → 메뉴·가격 구조화 | **API Key (Secret)** | 서버리스 함수(`api/parse-menu.js`)만 | 키는 Vercel 환경변수 `UPSTAGE_API_KEY` |
| Upstage Solar | 자연어 조건 → JSON 구조화, 추천 이유 생성 | 동일 키 | 서버리스 함수(`api/parse-query.js`)만 | 실패 시 정규식 폴백 |

### §8 환경변수 표에 추가

| 변수명 | 용도 |
|---|---|
| `UPSTAGE_API_KEY` | Document Parse + Solar 인증 (서버리스 함수 전용) |

### 학식 데이터 (5.11 또는 별도 섹션 — 방식은 ③에서 결정 필요)

성균관대 학식 식단 페이지(skku.edu welfare_11.do — HTML 표, 가격 텍스트 포함 확인됨)를 크롤링해 학식도 추천 풀에 포함한다. **학식에는 Document Parse를 쓰지 않는다** — 이미 구조화된 HTML이라 파싱기가 불필요하고, 억지로 쓰면 심사에서 "목적에 안 맞는 제품 적용"으로 감점 위험. "사진(비정형)은 Document Parse, HTML(정형)은 크롤러"라는 구분 자체가 심사 어필 포인트.

---

## ② 수집 데이터 실태표 (숫자만 채우면 됨) ★발표 슬라이드 재료

§9에 "96곳 중 대다수는 메뉴 정보가 비어 있음"이라고 썼는데, 이걸 정확한 숫자로 만들어주세요. Supabase SQL Editor에서:

```sql
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE jsonb_array_length(menu) > 0) AS has_menu,
  count(*) FILTER (WHERE typical_price IS NOT NULL) AS has_price,
  count(*) FILTER (WHERE hours != '{}'::jsonb) AS has_hours,
  count(*) FILTER (WHERE array_length(tags, 1) > 0) AS has_tags,
  count(*) FILTER (WHERE status = 'approved') AS approved
FROM restaurants;
```

이 숫자가 "파싱 파이프라인 도입 전 N% → 도입 후 M%"라는 데모데이 발표의 핵심 before/after가 됩니다.

## ③ 학식 데이터 모델 결정 (택 1)

- (a) `restaurants`에 `kind` 컬럼 추가 (`'restaurant' | 'cafeteria'`) — 기존 검색·지도 로직 그대로 재사용, 간단
- (b) 별도 `cafeteria_menus` 테이블 — 날짜별 식단이라는 학식 특성(매일 바뀜)에 더 맞음

추천은 (b) — 학식은 "식당"이 아니라 "날짜별 식단"이라 hours/menu 구조가 안 맞아요. 다만 결정은 스키마 주인인 당신이.

## ④ 운영 접근 권한 정리 (§7 또는 §8에 추가)

- Supabase 프로젝트: 누가 접근 가능? 승인(approved 전환)은 누가?
- Vercel: 환경변수 추가 권한 누구? → **`UPSTAGE_API_KEY`를 곧 넣어야 해서 실무적으로 바로 필요**
- 팀원 초대 가능하면 초대 (Supabase·Vercel 둘 다 무료 플랜에서 멤버 초대 가능)

## ⑤ Kakao 수집 스크립트 레포 포함

"1회성 로컬 스크립트, 배포 코드 미포함"이라고 했는데, 심사 항목이 "정보 처리 파이프라인 설계 및 **관리**"(20점)라 **수집 단계가 레포에 없으면 파이프라인 앞단이 심사에 안 보입니다.** 배포에는 안 넣더라도 `scripts/collect-places.js`로 커밋해주세요 (키는 빼고 `.env` 참조로).

---

정리하면: ①은 붙여넣기 검토, ②는 SQL 한 번, ③은 택1, ④는 권한 공유, ⑤는 파일 커밋. 급한 순서는 ④(키 넣어야 함) → ① → ⑤ → ② → ③.
