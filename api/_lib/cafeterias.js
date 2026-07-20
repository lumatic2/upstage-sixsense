/** 성균관대 인문사회과학캠퍼스(명륜) 학생식당 정본 (DR9 step-4)
 *
 *  시트에는 크롤러가 넣은 축약 이름("패컬티")과 빈 코너값("코너")이 그대로 들어 있어
 *  화면에 `패컬티 · 코너` 라는 실재하지 않는 이름이 떴다. 정식 명칭은 여기서 단일 관리한다.
 *
 *  출처: https://www.skku.edu/skku/campus/support/welfare_11.do (접근 2026-07-21)
 *  conspaceCd 는 그 페이지의 a.cafeteriaBtn data-con 값이며 `scripts/crawl-cafeteria.mjs` 와 같은 키다.
 */
export const CAFETERIAS = [
  { conspaceCd: "10201030", name: "패컬티식당", place: "600주년기념관 6층" },
  { conspaceCd: "10201031", name: "은행골식당", place: "600주년기념관 지하1층" },
  { conspaceCd: "10201034", name: "법고을식당", place: "법학관 지하2층" },
  { conspaceCd: "10201033", name: "금잔디식당", place: "경영관 지하2층" },
];

/** 시트의 축약 이름 → 정식 명칭. 크롤러가 h6 에서 뽑은 값이라 표기가 흔들린다. */
export function officialName(raw) {
  const s = String(raw ?? "").replace(/\s+/g, "");
  if (!s) return null;
  const hit = CAFETERIAS.find((c) => c.name.replace(/\s+/g, "") === s || c.name.startsWith(s) || s.startsWith(c.name.replace("식당", "")));
  return hit ? hit.name : raw;
}

/** 오늘 열린 곳/휴무를 한 번에 만든다 — 화면은 4곳을 항상 같은 순서로 보여준다.
 *  rows = 그 날짜의 학식 행들 (`loadSheetData().cafeteria` 를 날짜로 거른 것). */
export function todayBoard(rows) {
  return CAFETERIAS.map((c) => {
    const mine = rows.filter((r) => officialName(r.cafeteria) === c.name);
    return {
      name: c.name,
      place: c.place,
      open: mine.length > 0,
      // 같은 식당에 코너가 여럿이면 합친다. 빈 코너명("코너")은 이름이 아니므로 버린다.
      items: mine.flatMap((r) => r.items),
      price: mine.find((r) => r.price)?.price ?? null,
    };
  });
}
