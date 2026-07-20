# OPEN ISSUES — 열린 이슈 / 사용자 결정 대기

> 2026-07-20 DR6 완료 시점 기준. **팀 합의 미팅 2026-07-23(목) 21:00 = 실질 마감** · 데모데이 7/25.
> 닫힌 이슈는 여기서 지우고 `verification/matrix.md` 또는 ADR 로 옮긴다.

## 열려 있는 것

### ⑥ 하네스 장부 이원화 — 이 레포 밖 문제

`.harness/work.json`(SKILL.md 가 지정한 **정본**) vs `.harness/machines/<host>/work.json`(훅 메시지가 지시).
그래서 DR4 는 머신 로컬에만, DR5 등록은 정본에만 들어갔다. **DR4 가 정본에 없는 상태는 그대로**다.
고칠 자리는 `~/projects/custom-skills` 의 `/harness` 원본(훅 문구를 정본 경로로) — 배포본 직접 편집 금지.

### ⑦ 곁들임 규칙이 못 잡는 잔여 — 사람 손이 이김

칵테일 고유명(`블루 애플 크러쉬`·`트리플 첼로` 등)은 이름만으로 판정이 안 된다.
시트 [메뉴] `비고` 열에 `사이드` 를 적으면 규칙을 이긴다(반대로 `한끼` 는 본메뉴로 고정).
데모 밀도에 영향은 작다 — 해당 가게들은 예산대가 높아 저예산 검색에 안 걸린다.

## 2026-07-20 닫힌 것

| 구 번호 | 이슈 | 결말 |
|---|---|---|
| ① | 미검수 식당 5곳·메뉴 74행 | **팀이 검수 완료** — 세션 사이 시트가 191→348행으로 갱신되며 R015~R019 전부 `확인`. 신규 5곳(R020~R024)도 추가. 노출 식당 14 → **24곳** |
| ② | 보류 4건 판정 | 파싱 캐시 대조 후 확인 3 · 제외 1(`R013 인기준` = OCR 잔여물). [메뉴] 대기 = 예시행만 |
| ③ | 사이드 메뉴가 한 끼처럼 추천됨 | `api/_lib/side-menu.js` 판정 + `loadSheetData` 가 `isSide` 부착 → 추천·목록·지도 전부 적용 |
| ④ | `api/data.js` Supabase 게이트 없음 | 분기 삭제, 시트 SSOT 단일화 (역방향 확인 완료) |
| ⑤ | `KAKAO_REST_API_KEY` 없음 | Vercel env 등록 → `/api/config` 의 `ready.geocode = true` |
| — | 본선 조립본(hanipmap 이식) | **폐기** — `docs/adr/0003-no-assembly-build.md`. 팀은 각자 버전을 미팅에서 비교·합의 |

## 작업 시 주의 (DR4~DR6 실측)

- 시트 **행 삭제 금지**. `검수` 열 값 변경만 (Apps Script 에 delete action 자체가 없다).
- 사진 대조 없이 `확인` 찍기 금지 — 파이프라인의 유일한 진실성 담보.
- **시트에 테스트 제보를 남기지 마라** — 지울 수 없어 영구 잔존한다. 배선 확인은 `/api/config` 의 `ready` 플래그로.
- `public/test.html` 삭제 금지 (`/verify.html` 승격 실패 시 원복 경로).
- 신규 디자인 토큰 발명 금지 — `public/theme.css` 기존 변수만.
- `scrollIntoView({behavior:"auto"})` 금지 — CSS `scroll-behavior:smooth` 를 물려받아 씹힌다. `"instant"` 로 고정.
- **배포는 "적힌 파일이 전부"다** — 구 `deploy-staging.mjs` 는 `FILES` 를 손으로 관리해서, 목록에 없던
  `contribute/review/verify.html` 이 다음 배포 한 번이면 라이브에서 사라질 상태였다. 2026-07-20 자동
  수집으로 교체했으니 **다시 하드코딩 목록으로 되돌리지 마라**.
- 로컬에 시트 쓰기 자격이 없다 — `node scripts/with-vercel-env.mjs <스크립트>` 로 배포 env 를 빌려 쓴다(`VERCEL_TOKEN` 필요).
- 이 레포의 git `origin` 은 GitHub 가 아니라 **m4 로컬 경로**일 수 있다. GitHub 는
  `https://github.com/lumatic2/upstage-sixsense.git`.
