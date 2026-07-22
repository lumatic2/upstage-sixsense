/** Document Parse HTML 응답 → 메뉴명·가격 후보 추출.
 *  scripts/parse-menu-poc.mjs 의 extractMenu 이식본 (M2 PoC 2라운드 개선 반영, 정확도 76.4% 실측).
 *  PoC 스크립트 쪽은 실험 박제본으로 동결 — 서비스 변경은 이 파일에만 한다. */
export function extractMenu(html) {
  const altTexts = [...html.matchAll(/alt="([^"]*)"/g)].map((m) =>
    m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  );
  const body = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " ")   // 같은 행의 셀(메뉴명|가격)은 한 줄로 유지
    .replace(/<\/(tr|p|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
  const lines = [body, ...altTexts]
    .join("\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const items = [];
  // ① 1,000단위 구분(콤마/점/공백, OCR 공백 변형 허용) ② 맨자리 4~6자리 ③ 3자리+원 ④ 천원단위 소수(3.0 → 3000)
  const priceRe =
    /(\d{1,3}(?:\s?[,.]\s?\d{3}|\s\d{3})+)\s*원?|(\d{4,6})\s*원?|(\d{1,3})\s*원|(\d{1,2}\.\d)(?!\d)/g;
  for (const line of lines) {
    let last = 0;
    for (const m of line.matchAll(priceRe)) {
      let price;
      if (m[1] !== undefined) price = Number(m[1].replace(/[,.\s]/g, ""));
      else if (m[2] !== undefined) price = Number(m[2]);
      else if (m[3] !== undefined) price = Number(m[3]);
      else price = Math.round(Number(m[4]) * 1000);
      let name = line
        .slice(last, m.index)
        .trim()
        .replace(/^[·.…\-_+)(]+/, "")
        .replace(/[·.…\-_+]+$/g, "")
        .trim();
      name = name.replace(/^\d+\s*원\s*/, "");
      if (/[가-힣]/.test(name)) name = name.replace(/^[^가-힣]+/, "").trim();
      last = m.index + m[0].length;
      if (price < 500 || price > 200000) continue; // 메뉴 가격으로 비현실적인 값 제외
      if (m.index > 0 && /[-\d:~]/.test(line[m.index - 1])) continue; // 전화번호·시각·범위의 일부 제외
      if (!name || /^\d+$/.test(name) || /^\d[\d\s,.]*$/.test(name)) continue;
      /* Document Parse 가 메뉴 구역을 **차트로 오인**하면 `Chart Type: bar … item_01 12.5` 같은
         데이터 블록을 함께 뱉는다. 그 자리표시자 이름이 그대로 화면에 "item_01 12,500원" 으로
         나갔다(2026-07-22 예시 메뉴판 실측). 사람이 읽는 메뉴 이름이 아니므로 버린다. */
      if (/^item[_-]?\d+$/i.test(name)) continue;
      items.push({ name, price });
    }
  }
  return items;
}
