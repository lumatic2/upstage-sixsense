---
name: "Minimal"
version: "0.1.0"

tokens:
  color:
    primitive:
      gray:
        "50":  { value: "oklch(99% 0 0)", type: color }
        "100": { value: "oklch(97% 0 0)", type: color }
        "300": { value: "oklch(85% 0 0)", type: color }
        "500": { value: "oklch(55% 0 0)", type: color }
        "700": { value: "oklch(30% 0 0)", type: color }
        "900": { value: "oklch(12% 0 0)", type: color }
      accent:
        "500": { value: "oklch(50% 0 0)", type: color }
    semantic:
      surface:
        base:  { value: "{color.primitive.gray.50}", type: color }
        muted: { value: "{color.primitive.gray.100}", type: color }
      text:
        default: { value: "{color.primitive.gray.900}", type: color }
        muted:   { value: "{color.primitive.gray.700}", type: color }
      action:
        primary: { value: "{color.primitive.gray.900}", type: color }
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
      sm: { value: "2px", type: dimension }
      md: { value: "4px", type: dimension }

  typography:
    font:
      sans: { value: "Inter Variable, system-ui, sans-serif", type: fontFamily }
    scale:
      sm:   { value: "14px", type: dimension }
      base: { value: "16px", type: dimension }
      lg:   { value: "20px", type: dimension }
      xl:   { value: "28px", type: dimension }
      "2xl": { value: "40px", type: dimension }
    weight:
      regular: { value: 400, type: fontWeight }
      medium:  { value: 500, type: fontWeight }

themes:
  default: { base: true }
  dark:
    color.semantic.surface.base:   { value: "{color.primitive.gray.900}", type: color }
    color.semantic.surface.muted:  { value: "{color.primitive.gray.700}", type: color }
    color.semantic.text.default:   { value: "{color.primitive.gray.50}",  type: color }
    color.semantic.text.muted:     { value: "{color.primitive.gray.300}", type: color }
    color.semantic.action.primary: { value: "{color.primitive.gray.50}",  type: color }
    color.semantic.border.default: { value: "{color.primitive.gray.700}", type: color }
---

# Minimal — Swiss / Functional

## 1. Personality
무채색 단일 컬러 + 1 accent. 큰 여백, 작은 컴포넌트. "그릇이 사라지고 콘텐츠만 남는다."

## 2. Color
무채색만. 색은 정보 위계로만 사용. action.primary = 검정. 호버 = 80% 검정.

## 3. Typography
Inter Variable 하나. weight 400/500 만. 본문 16/28, 헤딩 letter-spacing -2%.

## 4. Spacing & Layout
큰 여백 (`space.12`, `space.16` 적극). container max 960px. 1-column 우선.

## 5. Radius & Borders
거의 직각 (`radius.sm` = 2px). border 1px solid `border.default`.

## 6. Elevation & Motion
**그림자 절대 금지**. 위계는 보더와 여백으로만. transition 150ms ease-out.

## 7. Components
### Button
- height 40, padding-x 24. radius `sm`.
- primary: 검정 배경 / 흰 텍스트. hover opacity 0.85.
- secondary: 투명 / 1px 보더.

### Input
- 보더 없음, bottom-border 1px. focus 시 2px.

### Card
- 보더만. 패딩 32. 그림자 없음.

## 8. Anti-patterns
- 그림자 / gradient / 둥근 모서리(>4px) / 컬러 액센트 2개 이상

## 9. Changelog
## 2026-05-14
- 초안.