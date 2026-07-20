# 루브릭 ↔ 슬라이드 매핑 (M4 step-1 Verify 산출물)

| 루브릭 상위 항목 (배점) | 대응 슬라이드 | 근거 evidence |
|---|---|---|
| Service Differentiation (10) | #2 문제·타깃 / #3 vs 범용챗봇·거지맵 | PRD 확정 문구, source-feasibility |
| Data Architecture & Process (20) | #4 파이프라인 3종 + 오염 방지 3단 | m3-e2e.md, changesets 4건 |
| Solution Depth (15) | #5 정확도 실측·개선 서사·경계 설계 | accuracy.md (76.4%, 표 전체) |
| Effective Use of Upstage (20) | #6 적재적소 적용 + 실측 기여도 | parse-query changeset (모델·타임아웃 실측), ADR-0001 |
| Service Impact (20) | #7 배포·96곳·확장 | hanipmap 데모, 스테이징 E2E |
| Presentation & Documentation (15) | 덱 전체 + #8 시연 + demo-script.md | deck.html 렌더, 리허설 기록 |

빈 항목: 없음 (6/6). 전 수치 각주 출처 = 레포 내 evidence 파일.

## 검증 매트릭스 (DR2)

위 표의 "근거 evidence" 를 **실행 가능한 형태**로 재현하는 정본은 `verification/matrix.md` 다 — command / expected / observed / evidence 4열로, 각 주장이 어떤 커맨드로 관측됐는지를 남긴다. 발표에서 "이게 진짜 도나요" 질문이 오면 이 파일과 `/verify.html`(배포 검증 페이지)을 근거로 제시한다.

- 시연 시나리오 smoke: `node scripts/demo-smoke.mjs --url https://sixsense.askewly.com` (Groundedness 배지·판정 포함)
- 결함 주입 기록: 가격 필터 역전 시 smoke 가 실제로 FAIL 하는 것을 1회 확인 (허수 테스트 방지)
