/** GET /api/cron/crawl-cafeteria — 학식 자동 갱신 (DR10 step-2)
 *
 *  왜 필요한가: 학식은 매일 바뀌는데 사람이 크롤러를 돌려야만 시트가 채워졌다.
 *  실제로 마지막 적재가 5일 밀려 화면에 "4곳 전부 휴무" 가 뜬 적이 있다(2026-07-21).
 *  "오늘 뭐 먹지" 서비스에서 오늘 학식이 비면 서비스의 절반이 없는 것과 같다.
 *
 *  스케줄: `vercel.json` 의 crons — 매일 21:10 UTC = 06:10 KST.
 *  (Vercel Hobby 는 하루 1회 제한. 학식 주간 뷰가 한 번에 5일치를 주므로 1회로 충분하다.)
 *
 *  보호: Vercel Cron 은 `authorization: Bearer $CRON_SECRET` 을 붙여 호출한다.
 *  시크릿이 설정돼 있으면 반드시 검증한다 — 공개 URL 이라 아무나 호출해 시트에 쓰면 안 된다.
 *
 *  응답: 200 { status, sourceDate, crawled, appended, skipped, errors }
 *  실패해도 500 을 내지 않는다 — cron 실패 알림보다 "무슨 일이 있었는지" 가 남는 게 낫다.
 */
import { crawlCafeteria, toSheetRows, dedupeAgainst, todayKST } from "../_lib/cafeteria-crawl.js";
import { listRows, appendRows, sheetWriteReady } from "../_lib/sheet-write.js";

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers?.authorization ?? "";
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "unauthorized", code: "bad_cron_secret" });
    }
  }
  if (!sheetWriteReady()) {
    return res.status(200).json({ status: "skipped", reason: "sheet webhook not configured" });
  }

  const date = String(req.query?.date ?? "").match(/^\d{4}-\d{2}-\d{2}$/) ? req.query.date : todayKST();

  let crawl;
  try {
    crawl = await crawlCafeteria(date);
  } catch (e) {
    return res.status(200).json({ status: "error", sourceDate: date, reason: "crawl failed", errors: [e.name] });
  }
  if (crawl.status === "error") {
    // 학교 페이지가 통째로 죽은 경우 — 시트는 건드리지 않는다
    return res.status(200).json({ status: "error", sourceDate: date, crawled: 0, appended: 0, errors: crawl.errors.slice(0, 6) });
  }
  if (!crawl.records.length) {
    return res.status(200).json({ status: "empty", sourceDate: date, crawled: 0, appended: 0, errors: crawl.errors.slice(0, 6) });
  }

  try {
    // listRows 는 { header, items:[{row, values}] } 를 준다 (빈 시트면 []).
    const listed = await listRows("학식");
    const existing = Array.isArray(listed) ? [] : (listed?.items ?? []).map((i) => i.values);
    const fresh = dedupeAgainst(existing, toSheetRows(crawl.records));
    const appended = fresh.length ? await appendRows("학식", fresh) : 0;
    return res.status(200).json({
      status: "ok",
      sourceDate: date,
      crawled: crawl.records.length,
      appended: fresh.length,
      skipped: crawl.records.length - fresh.length,
      errors: crawl.errors.slice(0, 6),
      appendedAck: appended,
    });
  } catch (e) {
    return res.status(200).json({ status: "error", sourceDate: date, crawled: crawl.records.length, appended: 0, reason: "sheet write failed", errors: [e.name] });
  }
}
