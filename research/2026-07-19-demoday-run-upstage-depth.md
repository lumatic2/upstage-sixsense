# Upstage 활용 심화 패턴 리서치 — 2026-07-19

> 목적: 심사 배점 "Effective Use of Upstage"(목적 적합 적용 10 + 기여도 10 = 20점)와 "Solution Depth"(정보 처리의 깊이·정교성, 15점)를 끌어올릴 Upstage 제품 조합을 조사한다.
> 맥락 근거: `docs/CHALLENGE.md`(루브릭·멘토링 규칙), `docs/PRD.md`(핵심 기능), `docs/adr/0001-problem-and-solution-shape.md`(Document Parse=메뉴판 사진, Solar=질의 구조화+추천 이유, 학식은 크롤링 — Document Parse 금지 확정).
> 규칙: 모든 외부 사실에 출처 URL + 접근일(2026-07-19). 출처 못 찾은 내용은 제외(추정 표기 금지).

---

## 1. Document Parse — 메뉴판 사진 파싱 (이미 채택된 축)

### 1.1 핵심 파라미터
- **`ocr`**: `"auto"`(PDF 텍스트 추출) 또는 `"force"`(이미지에 OCR 강제 적용). 사진 업로드(JPEG/PNG)는 텍스트 레이어가 없으므로 **`force`가 정답 값** — auto로 두면 사진에서는 텍스트가 안 뽑힐 수 있음.
  출처: [aiskill.market/skills/upstage-document-parse](https://aiskill.market/skills/upstage-document-parse) (접근 2026-07-19), [python.langchain.com UpstageDocumentParseParser](https://python.langchain.com/api_reference/upstage/document_parse_parsers/langchain_upstage.document_parse_parsers.UpstageDocumentParseParser.html) (접근 2026-07-19)
- **`coordinates`**(boolean, 기본 true): 각 요소의 bounding box 좌표 `{"x":0.06,"y":0.05}` 형태로 반환.
  출처: 위와 동일 + WebSearch 요약(Document Parse API 문서 발췌, 접근 2026-07-19)
- **`base64_encoding`**: 카테고리 리스트(table, figure, chart, heading1, header, footer, caption, paragraph, equation, list, index, footnote)를 지정하면 해당 요소를 잘라낸 이미지를 base64로 함께 반환.
  출처: [aiskill.market/skills/upstage-document-parse](https://aiskill.market/skills/upstage-document-parse) (접근 2026-07-19)
- **출력 포맷**: text / html / markdown 3종 동시 제공, 요소 단위 category·page·content(html/markdown/text)·coordinates 포함.
  출처: [console.upstage.ai/docs/apis/document-ocr 발췌](https://developers.upstage.ai/docs/apis/document-ocr) (접근 2026-07-19)
- **모드**: `standard`(텍스트+단순 표) / `enhanced`(복잡한 표·시각 요소) / `auto`(자동 분류). 표준 문서는 ~3초 처리, 비동기 API는 최대 1000페이지(10페이지 배치).
  출처: [aiskill.market/skills/upstage-document-parse](https://aiskill.market/skills/upstage-document-parse) (접근 2026-07-19)

### 1.2 이 프로젝트 적용 지점
- **자연스러움**: 이미 ADR-0001에서 채택. `ocr: "force"` + `coordinates: true` + `base64_encoding: ["table"]`(메뉴판이 표 형태인 경우 원본 표 이미지를 검수 UI에 같이 보여주면 검수자가 파싱 오류를 빠르게 확인 가능 — "검수" 단계가 PRD MVP 기능 2에 이미 있음).
- **깊이 서사 강화 포인트**: 단순히 "사진→텍스트"가 아니라 "OCR force 모드로 저해상도/기울어진 폰 사진 대응 + coordinates로 표 구조 보존 + base64로 검수 UI에 원본 크롭 이미지 병치"까지 가면 "정보 처리의 깊이·정교성"(15점) 서사가 생긴다.
- **위험**: 메뉴판이 표가 아니라 자유 텍스트 나열(분식집 손글씨 메뉴 등)일 경우 `enhanced` 모드나 category 분류가 불안정할 수 있음 — PoC로 실측 필요(PRD 성공 지표에 이미 명시됨, ≥90% 항목 단위 정확도).

---

## 2. Universal Information Extraction — 메뉴판 구조화의 대안/보완 축

- **정의**: 스키마(JSON Schema, `response_format` 필드)만 정의하면 추가 학습 없이 임의 문서에서 원하는 필드를 뽑아낸다. OpenAI Chat Completion API 규약을 따르며, 파일은 URL 또는 base64로 messages에 전달.
  출처: [console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction](https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction) (접근 2026-07-19, r.jina.ai 프록시 경유)
- **지원 포맷**: JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX, HWP, HWPX — 최대 50MB, 100페이지. 한글/가나 지원, 한자는 베타.
  출처: 동일
- **Document Parse와의 차이**: Document Parse는 "문서를 구조 그대로(레이아웃 보존) 구조화 텍스트로 변환"이 목적이고, Universal IE는 "내가 정의한 스키마의 필드값만 바로 뽑아낸다"가 목적. Universal IE는 암묵적 정보도 추론 가능("schema-agnostic, can infer implied information").
  출처: 동일

### 2.1 이 프로젝트 적용 지점
- **자연스러운 지점**: 메뉴판 사진에서 최종적으로 필요한 건 "메뉴명 + 가격"의 **정형 필드**다. 현재 설계는 Document Parse(레이아웃 파싱) → (팀이 직접 후처리 로직으로 메뉴/가격 분리) 흐름으로 보인다. Universal IE를 붙이면 `{"menu_items":[{"name":str,"price":int}]}` 스키마를 직접 정의해 Document Parse의 markdown/html 출력을 후처리 코드로 파싱하는 대신 **한 번에 정형 JSON**을 받을 수 있다.
- **파이프라인 설계 서사(20점) 강화 포인트**: "Document Parse로 레이아웃 보존 텍스트 확보 → Universal IE로 스키마 기반 필드 추출 → 검수 → DB" 라는 2단계 파이프라인은 "단순 OCR 한 번"보다 처리 깊이가 명백히 드러난다. 단, **두 제품을 동시에 쓰는 게 억지가 아니려면 서사가 필요**: Document Parse만으로 표 구조가 이미 깨끗하면 Universal IE는 중복이다. 메뉴판이 표가 아니라 자유 텍스트/이미지 나열(사진에 흔함)일 때만 자연스럽다 — PoC 결과에 따라 "Document Parse 단독" vs "Document Parse + Universal IE" 분기 판단 필요.
- **대안**: Document Parse 없이 Universal IE **단독**으로 메뉴판 사진 → `{name, price}` 스키마를 바로 뽑는 것도 가능(Universal IE도 이미지 입력을 받음). 이 경우 파이프라인은 단순해지지만 "정보 처리 깊이"서사는 약해진다. **파이프라인 단계 수와 실제 정확도 기여를 실측 후 선택**할 것.

---

## 3. Prebuilt Information Extraction (영수증 등) — 참고용, 이번 스코프 아님

- **정의**: invoice·영수증·신분증 등 표준 서식에 대해 사전학습된 추출기. 예: `receipt-extraction-3.2.0` 모델은 line item(수량/품명/단가), 매장명·주소, subtotal/tax/tip/total을 필드별 confidence score와 함께 반환.
  출처: [console.upstage.ai/docs/capabilities/extract/prebuilt-extraction](https://console.upstage.ai/docs/capabilities/extract/prebuilt-extraction) (접근 2026-07-19, r.jina.ai 경유)
- **이 프로젝트 적용 여부**: PRD에서 영수증 파싱·잔여예산 관리는 **MVP 제외(Next Candidate)로 명시 확정**. 따라서 이번 데모에는 적용하지 않는다 — 언급만 해두는 이유는, 다음 사이클(영수증 기반 잔여예산 축)에서 자연스러운 확장 지점이라는 근거를 남기기 위함.

---

## 4. Solar — 구조화 질의 + 추천 이유 (이미 채택), 심화 옵션

### 4.1 Structured Output / JSON Mode
- `response_format: {"type":"json_object"}` = JSON mode(스키마 없이 JSON 강제, 프롬프트에 "JSON" 단어 명시 필요). `response_format: {"type":"json_schema","json_schema":{...}}` = 스키마 강제 구조화 출력. **solar-pro-2 모델에서만 지원.**
  출처: WebSearch 요약(Upstage Chat API 문서 발췌, [console.upstage.ai/api/chat](https://console.upstage.ai/api/chat)) (접근 2026-07-19)
- **적용**: PRD 기능 1("8천원 이하, 도보 5분, 혼밥" → Solar가 구조화)에 JSON Schema를 명시(`{"budget_krw":int,"distance_min":int,"tags":[str]}`)하면 정규식 대비 강건성이 실측 가능한 형태로 서사화된다 — "스키마 강제이므로 파싱 실패율 0%" 같은 지표를 발표에 쓸 수 있음.

### 4.2 Function Calling / Tool Use
- 도구(tool) 스키마(type/function name/description/parameters)를 정의해 모델이 필요 시 함수 호출을 생성. `solar-pro3`는 parallel function calling(한 응답에 여러 tool call 동시 생성) 지원.
  출처: [console.upstage.ai/docs/capabilities/function-calling](https://console.upstage.ai/docs/capabilities/function-calling) 계열 페이지 발췌(WebSearch, 접근 2026-07-19)
- **적용 판단**: 이 프로젝트의 "예산 조합 계산"은 이미 결정적 로직(코드)으로 하기로 확정돼 있다(PRD 기능4 "데모 기존 로직"). function calling은 Solar가 직접 DB 쿼리·계산기를 호출하는 에이전트 패턴에 쓰는데, **지금 스코프에서는 억지**에 가깝다 — 결정적 계산은 코드가 더 빠르고 검증 가능하다. 채택 비권장.

### 4.3 Solar Embedding
- `solar-embedding-1-large-query` / `-passage` 듀얼 모델, 동일 벡터 공간. 영어 MTEB +4.91점, 한국어 Ko-miracl +7.84점(OpenAI text-embedding-3-large 대비).
  출처: [upstage.ai/blog/en/solar-embedding-1-large](https://www.upstage.ai/blog/en/solar-embedding-1-large) (접근 2026-07-19)
- **적용 판단**: 자연어 질의("혼밥하기 좋은 조용한 곳")처럼 태그·카테고리로 환원 안 되는 "분위기/상황" 검색에 임베딩 유사도 검색을 얹으면 Solar의 구조화 파싱(예산·거리 = 정형 필터)과 상호보완된다. 다만 **식당 수가 적을 초기 데이터셋(명륜동 한정)에서는 임베딩 검색의 이득이 작다** — 데이터가 수십~백 단위면 태그 필터로 충분히 커버되고, 벡터 검색 인프라(pgvector 등) 추가는 "억지 적용" 리스크가 있다. 데이터 규모가 커지는 시나리오(확장성 서사, Service Impact 5점 "확장성")에서 "다음 단계로 임베딩 기반 시맨틱 검색 확장 가능"이라고 **로드맵에 언급만** 하는 정도가 적정.

### 4.4 Groundedness Check
- `context`+`answer` 쌍을 입력하면 grounded/not-grounded 판정(confidence 포함)을 반환. RAG 파이프라인에서 LLM 생성 답변이 검색된 소스에 실제로 근거하는지 검증하는 용도. LangChain 통합(`UpstageGroundednessCheck`) 존재.
  출처: [console.upstage.ai/docs/capabilities/groundedness-checking](https://console.upstage.ai/docs/capabilities/groundedness-checking) (접근 2026-07-19, r.jina.ai 경유), [marktechpost.com — Build a Groundedness Verification Tool Using Upstage API and LangChain](https://www.marktechpost.com/2025/06/24/build-a-groundedness-verification-tool-using-upstage-api-and-langchain/) (접근 2026-07-19)
- **적용 판단 — 강력 추천**: 이 프로젝트의 핵심 차별화 서사가 "ChatGPT는 오늘 학식·실제 가격을 몰라서 환각한다, 우리는 1차 소스(크롤링+파싱 검증된 메뉴판)만 답에 쓴다"(PRD §범용 챗봇과의 차별점)이다. **Groundedness Check는 이 주장을 코드로 증명하는 장치**다: Solar가 생성한 "추천 이유" 텍스트를 실제 DB 레코드(context)와 대조해 grounded 판정이 나오지 않으면 그 답변을 폐기/재생성하는 게이트로 쓰면, "우리는 환각을 구조적으로 차단한다"는 주장이 데모에서 라이브로 검증 가능해진다. 구현 비용도 낮다(context-answer 쌍 API 호출 1회 추가).

---

## 5. 실전 사례 조사 결과

- Upstage 자체 쿡북(GitHub `UpstageAI/cookbook`)에는 Document Parse + LangChain/LlamaIndex 결합 예제(`recipes/upstage.ipynb`), 재무제표 10-K 분석(Layout Analysis + LangChain + Chroma, `recipes/financial_analysis.ipynb`), AWS SageMaker 배포 예제가 있다. 이번 대회(성균관대 AI Document Builders Challenge)의 과거 수상작·데모 사례는 **공개 검색으로 찾지 못했다** — 대학 단위 소규모 챌린지라 공개 자료가 없는 것으로 보이며, 추정 없이 이 항목은 제외한다.
  출처: [github.com/UpstageAI/cookbook](https://github.com/UpstageAI/cookbook) (접근 2026-07-19)
- 일반 활용 사례 하나: Solar-Pro3 + Document Parse를 결합해 PDF 형태 과제 명세서(표·그림 포함)를 파싱 후 Solar의 reasoning으로 자동 채점하는 개인 프로젝트 — "단순 텍스트 추출은 레이아웃 정보를 잃어 LLM이 문맥을 이해하기 어려워서 Document Parse를 도입했다"는 동기가 이 프로젝트의 "학식은 크롤링(이미 구조화) vs 메뉴판은 Document Parse(비구조화 사진)" 구분 논리와 같은 패턴이다.
  출처: [velog.io/@wjm9765 — Solar-Pro3을 이용한 자동 과제 채점 프로그램](https://velog.io/@wjm9765/Solar-Pro3-%EC%9D%84-%EC%9D%B4%EC%9A%A9%ED%95%9C-%EC%9E%90%EB%8F%99-%EA%B3%BC%EC%A0%9C-%EC%B1%84%EC%A0%90-%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8) (접근 2026-07-19)

---

## 6. 이 프로젝트에 추천하는 적용 조합 Top 3

**#1. Document Parse(force OCR + coordinates + base64_encoding) → 후처리 스키마 파싱 → 검수 UI (현행 유지 + 파라미터 명시화)**
- 근거: 이미 ADR-0001·PRD 확정 사항. `ocr:"force"`, `coordinates:true`, `base64_encoding:["table"]` 파라미터를 명시적으로 쓰고, 검수 UI에서 원본 크롭 이미지(base64)와 파싱 결과를 나란히 보여주면 "정보 처리 깊이"(15점) 서사가 코드 레벨에서 증명된다. 억지 적용 리스크 없음 — PRD가 이미 이 지점을 위해 설계됨.

**#2. Solar Groundedness Check를 추천 이유 생성 파이프라인의 검증 게이트로 추가**
- 근거: 이 프로젝트의 정면 차별화 주장("ChatGPT는 환각한다, 우리는 1차 소스만 쓴다")을 라이브 데모에서 기계적으로 증명할 수 있는 유일한 후보. 구현 비용 낮음(API 호출 1개 추가), 억지스럽지 않음 — context(DB 레코드)-answer(Solar 생성 추천 이유) 쌍이 파이프라인에 이미 존재. **"Effective Use of Upstage" 기여도(10점)에서 Document Parse+Solar 2종에 그치지 않고 3번째 제품을 목적에 맞게 얹었다는 서사**로 배점을 추가로 노릴 수 있음.

**#3. Universal Information Extraction을 메뉴판 파싱 2단계로 조건부 도입 (Document Parse 출력이 표 구조가 아닐 때)**
- 근거: PoC 결과 메뉴판 사진이 깨끗한 표 형태로 안 나오는 케이스(분식집 손글씨, 자유배치 메뉴)가 실측되면, Document Parse의 레이아웃 텍스트를 Universal IE 스키마(`{"menu_items":[{name,price}]}`)로 한 번 더 정형화하는 2단계 파이프라인을 추가한다. **조건부 채택**인 이유: PoC에서 Document Parse 출력만으로 후처리 정규식/로직이 안정적으로 필드 분리가 되면 Universal IE는 중복이라 억지 적용 감점 리스크가 크다. 파이프라인 설계(20점) 서사를 위해 "왜 2단계가 필요했는지" 실측 근거를 반드시 문서화(ADR)할 것.

**기각(비권장)**: function calling(결정적 계산 로직과 충돌, 이미 코드로 확정), Solar Embedding(데이터 규모가 작아 이번 데모 스코프에선 이득 대비 인프라 비용 과다 — 로드맵 언급만 권장), Prebuilt 영수증 추출(PRD가 이미 스코프 제외 확정).
