# 20260721-tag-word-boundary

- Target: `docs/OPEN-ISSUES.md` 이슈 ⑧ — 태그 부분일치가 합성어 뒤꼬리를 검색 의도로 만든다.
- Scope: `api/chat.js` `extractConditions` 의 태그 필터, `scripts/test-chat-extract.mjs` 케이스 6건.
- 문제 정의:
  - 태그를 `s.includes(t)` 로 잡으니 `교촌치킨`→`치킨`, `동해생선카레`→`생선` 이 잡혔다.
    브랜드명은 모델이 `unknownPlace` 를 채워 걸러줬지만(2026-07-21 4차 검증에서 넣은 방어),
    **실재하지 않으면서 음식처럼 읽히는 조합**은 모델이 가게로 안 봐서 그 방어를 통과했다.
  - 결과는 "사용자가 말한 적 없는 검색 의도를 서비스가 지어내는 것" 이다 — 개인화 정직성과 같은 종류의 결함.
- Contract:
  - 태그는 **어절 앞머리**에서만 잡는다. 앞 글자가 한글이면 낱말 속에 묻힌 것으로 보고 버린다.
  - 뒤는 보지 않는다 — "치킨 먹고싶어"·"생선구이" 처럼 뒤에 한글이 붙는 정상 입력을 죽이면 안 된다.
  - 모델의 `unknownPlace` 필터는 그대로 둔다. 두 방어는 서로 다른 입력을 막는다.
- 남는 한계(의도적):
  - 띄어쓰기를 안 한 정상 입력("저녁혼밥")은 태그를 놓친다. 지어낸 조건으로 검색하는 것보다
    조건을 못 잡는 편이 낫다는 판단(같은 근거로 예산 모델 폴백도 없앴다).
- Verification:
  - [x] `node scripts/test-chat-extract.mjs` 35/35 PASS (신규 6건: 동해생선카레·교촌치킨·명동칼국수 → 태그 0, 생선구이·치킨·혼밥+초밥 → 정상 유지)
  - [x] `node scripts/test-side-menu.mjs` 41/41 PASS
  - [x] `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` 14/14 PASS (배포 후)
- Status: done (2026-07-21) — 배포됨.
