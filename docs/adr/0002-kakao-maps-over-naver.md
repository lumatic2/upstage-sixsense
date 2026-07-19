# ADR-0002 — 개인 버전 지도는 카카오맵 JS (Naver Maps 대체)

- 날짜: 2026-07-19 · 상태: 확정 (사용자)
- 맥락: ADR-0001·CLAUDE.md 스택은 hanipmap 기반 Naver Maps 를 전제했으나, 실측 결과 Naver Maps 클라이언트 ID 가 어느 레포에도 발급·보관돼 있지 않다. 지오코딩(DR1)은 이미 카카오 Local API 로 확정돼 카카오 developers 앱이 살아 있다.
- 결정: 개인 버전(DR2)의 지도는 **카카오맵 JS SDK** 로 한다. 같은 카카오 앱의 JavaScript 키를 재사용하고, 키는 커밋하지 않고 `KAKAO_JS_KEY` env → `/api/config` 런타임 주입. 스테이징 도메인은 카카오 콘솔 Web 플랫폼에 사용자가 등록한다.
- 대안 기각: Leaflet+OSM(키 불요) — 국내 POI·도로 표기 품질과 지오코딩과의 공급자 일관성에서 카카오가 우세, 사용자 선택. Naver 신규 발급 — 발급 대기 비용.
- 영향: hanipmap 대표 버전(DR3)은 이 결정과 무관 — 한입지도 기존 구조 유지.
