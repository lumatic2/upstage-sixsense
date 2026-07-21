# 20260721-sitemap-current

- Target: DR11 step-2 — 설계도를 실구현으로 현행화하고, 같은 사고가 다시 나지 않게 규약을 신설한다.
- Scope: `docs/SITEMAP.md`(전면 개정) · `docs/ARCHITECTURE.md` · `CLAUDE.md` · `AGENTS.md`.

## 왜 필요했나

`docs/SITEMAP.md` 는 "무엇이 어느 화면에 들어가는가"의 SSOT 인데 2026-07-20 에 멈춰 있었다.
그 사이 화면이 여섯 번 바뀌었고, 문서는 **자기 안에서도 모순**됐다(블록3 "편집 가능한 행으로
프리필" vs §7-2 "제보자는 고치지 않는다"). 이미 끝난 결정 3건이 "사용자 결정 필요"로 남아 있었다.

## SITEMAP 주장 ↔ 코드 1:1 대조 (Verify)

| 감사 | 구 SITEMAP | 실측 | 개정 결과 |
|---|---|---|---|
| B1 | nav = 4개 | 5개 (`grep -c class="navlink"` → index/app/contribute/about/verify 각 5, review 0) | 5개로 정정 + 5번째가 페이지가 아닌 `#upstage` 앵커임을 명시 |
| B2 | `#upstage` 는 깨진 링크 | `grep -c 'id="upstage"' about.html` → 1 (존재) | "깨진 링크" 서술 삭제 |
| B3 | app 블록4 = 학식 + **전체 식당 그리드** | `app.html:221` 주석 — 목록 제거됨 | 그리드 제거 + **왜 두지 않는지** 근거 기록 |
| B4 | about = 5섹션 | `grep -c '<h2 id='` → 6 | 6섹션 전부 나열(`#s5` 포함) |
| B5 | contribute = 편집 가능한 행 | `contribute.html:233` — `<td>` 만, input 없음 | 읽기 전용으로 통일(내부 모순 해소) |
| B6 | §9 사용자 결정 3건 미결 | 셋 다 실행 완료 | §8 결정 이력으로 종결 기록 |
| — | API 9개 | `ls api/*.js` → 8 + cron 1 | ARCHITECTURE 에 "8개 + cron 1개"로 정정 |

불일치 **0**. (마지막 행은 이번 개정 중 내가 새로 만든 오류를 Verify 가 잡은 것이다.)

## 신설 — 화면 문구·라벨 규약 (SITEMAP §5)

랜딩 카운터 `학식 9` 사고에서 나왔다. 다섯 줄:
숫자 라벨은 세는 대상을 라벨이 밝힌다 / 세는 대상이 바뀌면 라벨도 같은 커밋에서 바꾼다 /
화면 수치는 정본 파일·API 필드에서 읽는다 / 기능을 지우면 그 문구도 같은 changeset 에서 지운다 /
정확도·한계·미구현을 감추지 않는다.

## 신설 — 문서 동기화 규약 (`CLAUDE.md`·`AGENTS.md`)

DR11 이 고친 것은 증상이고, 원인은 **결정과 설명이 다른 시점에 갱신되는 것**이었다. 규약 3줄:
① ADR·기능 제거 시 같은 커밋에서 SITEMAP·PRD·ARCHITECTURE·해당 화면 문구를 확인
② 정의는 한 곳에만 두고 나머지는 포인터(개인화 정본 = ADR-0004)
③ 헤더·푸터·로그인 다이얼로그는 페이지마다 복제 — `grep -rn` 전수 확인

## 개정 방침 — 구 §8 개인화 설계를 포인터로 바꿨다

구 §8 은 순서 가점(`picked` rerank·`dismissed` 강등·태그 선호) 설계를 담고 있었고, ADR-0004 가
그것을 폐기한 뒤에도 남아 있었다. 정의를 두 곳에 쓰면 갈라진다는 것이 이번 사고의 교훈이라,
§7 을 **ADR-0004 포인터 + 화면 요구사항**만 남기고 정의는 옮기지 않았다.

## Verification

- [x] 위 대조표 7행 전수 확인 — 불일치 0
- [x] Failure probe: 감사 문서(`research/2026-07-21-dr11-design-doc-audit.md`) B 표를 역방향으로
      다시 훑어 반영 안 된 항목 0 확인
- [x] `docs/SITEMAP.md` 내부 모순(구 블록3 ↔ §7-2) 해소 확인

- Status: done (2026-07-22)
