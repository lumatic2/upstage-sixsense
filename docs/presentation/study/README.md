# 발표 공부용 자료 (팀 내부용)

데모데이(2026-07-25) 발표 대비 공부·리허설 자료. 아래 두 PDF만 읽으면 서비스 전체와
적대적 심사 질문까지 커버된다. HTML은 PDF의 소스(수정 시 여기서 고쳐 재렌더).

| 파일 | 무엇 | 누구에게 |
|---|---|---|
| `식스센스_서비스_마스터가이드.pdf` | 서비스 전체 + 숫자 + 화면·API 플로우 지도 + 루브릭 100점 + **적대적 Q&A 방어** | 발표자·질의응답 대비 전원 |
| `식스센스_발표스크립트.pdf` | 14장 장별 멘트(김민서 1~6 / 전유성 7~14) + 시연 대본 + 클로징 암기 + 배점 지도 | 발표자·리허설 |

- 내용 정본: [`../../SERVICE-SPEC.md`](../../SERVICE-SPEC.md) · 멘트 [`../slides-script.md`](../slides-script.md) · 루브릭 [`../rubric.md`](../rubric.md) · 시연 [`../demo-walkthrough.md`](../demo-walkthrough.md) · 당일 [`../demoday-strategy.md`](../demoday-strategy.md)
- 숫자는 항상 SERVICE-SPEC §8 기준. 후보 수(719)는 라이브에서 늘 수 있음 — 확인 580·대기 0이 고정 앵커.

> ⚠ **팀 내부용.** 적대적 Q&A의 함정·금지와 심사 전략(현직자 대비·동료평가)이 담겨 있어
> 심사위원·타팀·SNS 등 **외부 공개는 금지.** 실 토큰·API 키는 포함돼 있지 않다.

## 재렌더 방법 (HTML 수정 후)

```bash
msedge --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="식스센스_서비스_마스터가이드.pdf" guide.html
```
