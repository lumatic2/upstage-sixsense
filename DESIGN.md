---
name: "캠퍼스 팝"
version: "1.0.0"

tokens:
  color:
    primitive:
      gray:
        "50":  { value: "oklch(98.2% 0.004 250)", type: color }
        "100": { value: "oklch(100% 0 0)", type: color }
        "300": { value: "oklch(88% 0.006 250)", type: color }
        "500": { value: "oklch(55% 0.012 250)", type: color }
        "700": { value: "oklch(30% 0.014 250)", type: color }
        "900": { value: "oklch(18% 0.012 250)", type: color }
      ink:
        "900": { value: "oklch(20% 0.012 250)", type: color }
        "800": { value: "oklch(25% 0.012 250)", type: color }
      accent:
        "500": { value: "oklch(52% 0.126 44)", type: color }
        "400": { value: "oklch(66% 0.108 44)", type: color }
    semantic:
      surface:
        base:  { value: "{color.primitive.gray.50}", type: color }
        muted: { value: "{color.primitive.gray.100}", type: color }
      text:
        default: { value: "{color.primitive.gray.900}", type: color }
        muted:   { value: "{color.primitive.gray.700}", type: color }
      action:
        primary: { value: "{color.primitive.accent.500}", type: color }
      border:
        default: { value: "{color.primitive.gray.300}", type: color }

  dimension:
    space:
      "1": { value: "4px",  type: dimension }
      "2": { value: "8px",  type: dimension }
      "4": { value: "16px", type: dimension }
      "8": { value: "32px", type: dimension }
      "12": { value: "48px", type: dimension }
      "16": { value: "64px", type: dimension }
    radius:
      sm: { value: "4px", type: dimension }
      md: { value: "8px", type: dimension }

  typography:
    font:
      sans: { value: "Noto Sans KR, system-ui, sans-serif", type: fontFamily }
      display: { value: "Black Han Sans, sans-serif", type: fontFamily }
    scale:
      sm:   { value: "14px", type: dimension }
      base: { value: "16px", type: dimension }
      lg:   { value: "20px", type: dimension }
      xl:   { value: "30px", type: dimension }
      "2xl": { value: "46px", type: dimension }
    weight:
      regular: { value: 400, type: fontWeight }
      medium:  { value: 500, type: fontWeight }

themes:
  default: { base: true }
  dark:
    color.semantic.surface.base:   { value: "{color.primitive.ink.900}", type: color }
    color.semantic.surface.muted:  { value: "{color.primitive.ink.800}", type: color }
    color.semantic.text.default:   { value: "{color.primitive.gray.50}",  type: color }
    color.semantic.text.muted:     { value: "{color.primitive.gray.300}", type: color }
    color.semantic.action.primary: { value: "{color.primitive.accent.400}", type: color }
    color.semantic.border.default: { value: "{color.primitive.gray.700}", type: color }
---

# 캠퍼스 팝 — 한입지도

> 확정 2026-07-19, Brief Studio 선택(타일=캠퍼스 팝). 구 "Minimal(Swiss)"를 대체한다 — 무채색 미니멀에서 실사 이미지·굵은 헤딩·테라코타 액센트로 이동.
> 구현 토큰 정본은 `public/theme.css` (이 파일에서 파생).

## 1. Personality
쿨 그레이 지면 + 테라코타 액센트 + 굵은 한글 헤딩. 대학가의 에너지를 담되 지면은 정제되어 데이터가 신뢰를 준다.
대상: 성균관대 명륜캠 학생, "오늘 예산 안에서 뭘 먹을지"를 30초에 정한다.

## 2. Color
액센트(테라코타)는 **신호 전용** — 주 CTA, 선택된 칩, 근거 검증 배지. 면적 도포 금지.
지면 = 쿨 그레이, 카드 = 흰색 플랫(보더·그림자 없음, 명도 차로만 분리). 다크는 시스템 설정을 따른다.

## 3. Typography
헤딩 = Black Han Sans(단일 웨이트, letter-spacing -2%), 본문 = Noto Sans KR 400/500. 본문 line-height 1.75.
`word-break: keep-all`, 제목 `text-wrap: balance` 필수.

## 4. Spacing & Layout
밀도 "여유" — 섹션 간 64~96px. container max 1040px. 구성 = 히어로 → 카드 3 → 정보(hero-cards-info).
구현 매핑: hero=`landing-hero`, cards=`responsive-content-grid`, info=`article-documentation-layout` (바닐라 JS라 문서 재구현 경로).

## 5. Radius & Borders
radius 4px(미세). 카드는 보더 없이 표면 명도로 분리하고, 구분선이 필요한 곳만 1px `border.default`.

## 6. Elevation & Motion
그림자 없음 — 위계는 표면·간격으로. 모션 "표준": hover 부양 2px, 등장 페이드, 180ms ease-out. `prefers-reduced-motion` 존중. 커서 특수 인터랙션 없음.

## 7. Components
### Button
height 44, padding-x 22, radius sm. primary=테라코타 솔리드 / secondary=아웃라인(투명 + 1px 보더). hover 시 2px 부양.
### Input
surface 배경 + 1px 보더, focus 시 액센트 보더. height 52(검색), radius sm.
### Chip
height 36, 아웃라인. 선택 시 액센트 솔리드 + `aria-pressed`.
### Card
흰 배경, 보더·그림자 없음, padding 32. 사진 카드는 상단 이미지 180px + body 24.
### Icon
아웃라인 inline SVG, stroke-width 1.8, round join. **이모지 금지**.
### Imagery
실사 사진(음식·메뉴판). 히어로 배경(투명도 + 하단 그라디언트로 텍스트 대비 확보), 정보 페이지 figure.

## 8. Anti-patterns
좌측 컬러 라인 카드 / 이모지 아이콘 / 그라디언트 blob / 한글 단어 중간 잘림 / 그림자 남발 / 액센트 면적 도포 / 장식용 가짜 대시보드.

## 9. 접근성
WCAG AA(대비 4.5:1). 상태는 색 단독 금지 — 텍스트 라벨 병행. focus-visible 링 필수, 터치 타깃 44px 이상.

## 10. 결정 vs 추정
- **사용자 확정**(Brief Studio): 타일=캠퍼스 팝, 베이스=쿨 그레이, 액센트=테라코타, 타이포=Black Han Sans/Noto Sans KR, 이미지=실사, 구성=hero-cards-info, 헤드라인="오늘 만원으로 뭐 먹지", CTA=주+보조, 헤더=로고+링크+CTA, 푸터=한 줄, 카드=플랫+명도, 밀도=여유, radius=4px, 모션=표준, 커서=없음, 아이콘=아웃라인, 다크=시스템, 접근성=AA.
- **에이전트 각색(추정)**: 서브카피는 선택값("처음이라도 괜찮아요…")의 다정한 온보딩 톤을 유지하되 음식 추천 맥락에 맞게 문구를 조정했다 — 확정 문구는 사용자 확인 대상.

## 11. Changelog
### 2026-07-19
- 캠퍼스 팝으로 전면 개정 (Brief Studio 선택 반영, 3페이지 구조 도입).
### 2026-05-14
- Minimal(Swiss) 초안.
