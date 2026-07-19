# Upstage 심화 적용 메모 (DR2 step-3 — 발표 재료)

> 2026-07-19. 배점 매핑: Effective Use of Upstage 20점 + Solution Depth 15점 보강.

## 적용 3층
1. **Document Parse** (`api/parse-menu.js`·배치 스크립트) — `ocr:"force"`(사진 원본) + `coordinates:true`(메뉴명·가격 짝짓기 검증 근거) 파라미터를 목적 명시적으로 사용. "왜 이 옵션인가"를 말할 수 있는 상태.
2. **Solar 이중 사용 — 생성과 검증 분리** (`api/recommend.js`):
   - 생성: solar-pro2 가 추천 이유를 쓰되, 프롬프트로 **전달된 실데이터(메뉴·가격·도보 분) 밖 사실 언급을 금지**.
   - 검증: **독립 판정자 solar-mini** 가 context(실데이터)-answer(이유) 쌍을 grounded/notGrounded/notSure 로 판정. notGrounded 면 이유를 데이터 팩트 템플릿으로 **자동 교체** — "환각을 구조적으로 차단한다"가 주장이 아니라 제품 동작.
3. **폴백 계층**: Solar 장애·타임아웃(2.5s/2s)에도 추천 루프는 데이터 템플릿으로 불사 — 데모 안정성.

## 정직성 각주 (Q&A 대비)
- 전용 Groundedness Check 모델은 2026-07 현재 계정 모델 목록에서 제공 종료(`/v1/models` 실측) — 같은 계약(context-answer 판정)을 **생성 모델과 분리된 solar-mini 판정자**로 구현했다. "제품 3종" 이 아니라 "Solar 를 생성·검증 역할 분리로 목적 적합하게 2중 활용"이 정확한 서사다.
- 판정 배지는 UI 에 노출(`— Solar 생성 · 근거 검증됨` / `근거 미달 판정으로 데이터 팩트로 교체됨`) — 심사 시연에서 라이브로 보인다.
