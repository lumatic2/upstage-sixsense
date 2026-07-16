# 데모데이 시연 시나리오 (M4 step-2)

> 리허설: 2026-07-17 스테이징 URL 실브라우저 전 단계 재현 (`docs/research/2026-07-17-m3-e2e.md` — 스크린샷 보존).
> 본 시연은 hanipmap 통합본으로 교체 예정 — 통합 전이라도 아래 스테이징 경로로 전체 흐름 시연 가능.

## 시나리오 (약 4분)

| # | 단계 | URL·입력 | 기대 출력 | 실패 시 폴백 |
|---|---|---|---|---|
| 1 | 데모 지도 열기 | hanipmap.vercel.app | 명륜캠 지도 + 식당 96곳 | 사전 캡처 화면 |
| 2 | 자연어 검색 | 스테이징 `/test.html` §② — "과선배가 사는 날인데 2만원으로 둘이" | `{budget:10000, tags:["격식"], source:"solar"}` — 인원 나눗셈 강조 | **폴백이 기능이다**: Solar 죽어도 정규식 경로로 검색 동작 — `source:"regex-fallback"` 을 그대로 보여주며 설계 설명 |
| 3 | 메뉴판 사진 제보 | §① — `experiments/parse-poc/photos/mujesushi.jpg` 업로드 | 후보 12개 프리필 (100% 사진) | Upstage 장애 시: 사전 저장된 `*.menu.json` + E2E 스크린샷으로 대체 |
| 4 | 검수 흐름 | 항목 1개 일부러 수정 → 제출 | pending insert 페이로드 (수정 반영) | — (로컬 로직, 외부 의존 없음) |
| 5 | 어려운 사진 | `baekban-whiteboard.jpg` (손글씨) 업로드 | 일부만 추출 → **"그래서 검수가 있다"** 로 연결 | 사전 캡처 |
| 6 | 학식 통합 | §③ | 패컬티 중식 9,000원 (크롤러 실산출) | fixture 는 정적 파일 — 장애 지점 없음 |

## 리스크 대응 원칙 (멘토링 질문 6번 자답)

- 외부 API(Upstage) 의존 단계(2·3)마다 **폴백을 시연의 일부로 설계** — 장애가 나도 "폴백 설계" 서사로 전환.
- 전체 라이브 불능 대비: E2E 전 과정 스크린샷·응답 JSON 이 레포에 박제돼 있음 (`docs/research/2026-07-17-m3-e2e.md`, `experiments/parse-poc/`).
- 발표 직전 점검 커맨드 (30초):
  ```bash
  curl -s https://upstage-sixsense-staging.vercel.app/test.html -o /dev/null -w "%{http_code}\n"
  node -e "fetch('https://upstage-sixsense-staging.vercel.app/api/parse-query',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'8천원 이하 혼밥'})}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))"
  ```
  ⚠ **Windows curl 로 한글 body 를 보내지 말 것** — cp949 로 전송돼 Solar 가 빈 질의로 해석한다(2026-07-17 리허설에서 실제 오경보 발생). 점검은 위처럼 Node fetch 나 브라우저로.
