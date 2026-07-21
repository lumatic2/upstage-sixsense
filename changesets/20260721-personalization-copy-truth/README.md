# 20260721-personalization-copy-truth

- Target: DR11 step-1 — ADR-0004 로 폐기된 **순서 개인화**를 여전히 설명하던 화면·문서를 사실로 되돌린다.
- Scope: `public/about.html`(§s5 재서술 + 로그인 안내) · `public/app.html`·`public/index.html`·`public/verify.html`(로그인 안내 복제본) · `docs/PRD.md` 핵심 기능 5.

## 무엇이 거짓이었나

어제(2026-07-21) 코드에서 순서 가점 축을 걷어냈는데(ADR-0004), **그것을 설명하던 화면을 안 고쳤다.**
라이브 `/about.html` 이 이렇게 말하고 있었다:

> 두 번째 방문부터는 **추천 순서가 조금 달라집니다.** 이전에 눌러본 가게의 분류를 기억해 같은
> 계열을 위로 올립니다… 서버는 그 값을 받아 **순서만 바꾸고**

실제 `public/app.html:687` 은 `/api/recommend` 에 `{budget, walkMax, tags}` 만 보낸다. 프로필은 가지도
않고 서버가 읽지도 않는다. `docs/PRD.md:17` 도 "개인화 = **순서** + 대화 연속성"으로 같은 주장을 했다.

## 검증이 감사보다 하나 더 잡았다

계획 단계 감사는 `about.html:157-159` 와 `PRD.md:17` 두 곳을 지목했다. step-1 의 Verify
(`grep -n "순서" …`)를 돌리자 **세 번째**가 나왔다 — 로그인 다이얼로그의
"재방문 시 **순서를 바꾸는** 이력은…" 문장이 `about`·`app`·`index`·`verify` **4개 페이지에 복제**돼 있었다.
감사가 페이지별 본문만 훑고 공통 다이얼로그를 안 본 탓이다. 4곳 모두 교체했다.

## 결정 — 지우지 않고 재서술했다

폐기된 축을 삭제만 하면 그 판단의 흔적도 사라진다. ADR-0004 의 "일어나지 않은 선택을 근거로
순서를 바꾸고 있었다"는 자기적발은 **파이프라인 정직성의 증거**라, 없앨 게 아니라 보여줄 것이다.
그래서 §s5 에 "한때는 순서도 바꿨습니다 → 걷어냈습니다 → 왜" 를 남기고 ADR-0004 로 링크했다.

## Verification

- [x] `grep -n "순서" public/about.html docs/PRD.md` — 순서-개인화 **주장** 0건
      (남은 3건은 전부 "순서는 바꾸지 않는다"는 부정문)
- [x] `grep -rn "재방문 시 순서를 바꾸는" public/` — 잔여 0
- [x] Failure probe: `public/app.html:687` 요청 바디에 프로필 부재 재확인 —
      `{ budget, walkMax, tags }` 뿐. 문구만 고치고 코드가 다른 상태가 아님을 확인
- [x] `node scripts/test-personalization.mjs` — 개인화 경계 PASS (ADR-0004)

- Status: done (2026-07-22)
