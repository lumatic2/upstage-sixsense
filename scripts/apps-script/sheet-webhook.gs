/**
 * 시트 쓰기 웹훅 (DR4 step-1) — Vercel 서버 함수만 호출한다. 브라우저에서 직접 부르지 않는다.
 *
 * 왜 Apps Script 인가: 기존 시트 쓰기(scripts/*)는 gws CLI 로컬 OAuth 라 서버리스에서 못 쓴다.
 * 서비스 계정(GCP 콘솔+키 관리) 대신, standalone 스크립트를 "실행 주체: 나"로 배포하면
 * 배포자의 편집 권한으로 시트에 쓴다 — 시트 소유자가 아니어도 성립한다(소유자는 팀원).
 * 팀 시트에 컨테이너 바운드 스크립트를 심지 않으므로 소유자가 권한을 바꿔도 깨지지 않는다.
 *
 * 배포 절차 (사용자):
 *   1. script.google.com → 새 프로젝트 → 이 파일 내용 붙여넣기
 *   2. 프로젝트 설정 → 스크립트 속성 추가: SHEET_TOKEN = <임의의 긴 난수 문자열>
 *   3. 배포 → 새 배포 → 유형 "웹 앱" / 실행 주체 "나" / 액세스 "모든 사용자"
 *      ※ "모든 사용자"여야 Vercel 함수가 부를 수 있다. 방어는 SHEET_TOKEN 이 한다.
 *   4. 발급된 /exec URL 과 2번 토큰을 Vercel env 로 등록:
 *      SHEET_WEBHOOK_URL · SHEET_WEBHOOK_TOKEN
 *
 * 액션:
 *   list   { sheet, status? }        → 행 배열 (실제 시트 행 번호 포함)
 *   append { sheet, rows: [[...]] }  → 맨 아래에 추가
 *   update { sheet, updates: [{row, col, value}] } → 개별 셀 값 변경 (1-based)
 *   photo  { name, mimeType, dataBase64 } → 드라이브에 저장하고 fileId 반환 (sheet 불필요)
 */

var SPREADSHEET_ID = "1r_G6Z6FhlCQ_svQifrvQAWjlCyicOeB6UB4PPbboGTQ";
var PHOTO_FOLDER = "한입지도 제보 사진";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty("SHEET_TOKEN");
    if (!expected || body.token !== expected) return json({ error: "unauthorized" }, 401);

    // 사진 저장은 시트를 건드리지 않는다 — 시트 조회보다 먼저 처리한다.
    if (body.action === "photo") return json({ fileId: savePhoto(body.name, body.mimeType, body.dataBase64) });

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(body.sheet);
    if (!sheet) return json({ error: "no such sheet: " + body.sheet }, 400);

    if (body.action === "list") return json({ rows: list(sheet, body.status) });
    if (body.action === "append") return json({ appended: append(sheet, body.rows) });
    if (body.action === "update") return json({ updated: update(sheet, body.updates) });
    return json({ error: "unknown action: " + body.action }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

/** 헤더 + 데이터 행을 실제 시트 행 번호와 함께 돌려준다.
 *  행 번호를 서버가 계산하지 않고 시트가 직접 주는 이유: 공개 gviz CSV 는 빈 행을 흘려서
 *  인덱스로 행 번호를 역산하면 어긋난다. 검수 update 가 엉뚱한 행을 고치면 데이터가 깨진다. */
function list(sheet, status) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  var header = values[0];
  var iStatus = header.indexOf("검수");
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (status && iStatus >= 0 && String(values[i][iStatus]).trim() !== status) continue;
    out.push({ row: i + 1, values: values[i] });
  }
  return { header: header, items: out };
}

function append(sheet, rows) {
  if (!rows || !rows.length) return 0;
  var start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
  return rows.length;
}

/** 행 삭제는 지원하지 않는다 — 팀 데이터라 파괴 조작 금지(clean-menu-sheet.mjs 와 같은 규약). */
function update(sheet, updates) {
  if (!updates || !updates.length) return 0;
  for (var i = 0; i < updates.length; i++) {
    var u = updates[i];
    sheet.getRange(u.row, u.col).setValue(u.value);
  }
  return updates.length;
}

/** 제보 사진을 드라이브에 남기고 링크 공유로 연다.
 *  왜 필요한가: 검수는 "사진과 대조해 사람이 확인"이 전부인데, 제보 사진을 안 남기면
 *  운영진이 대조할 원본이 없다. DR4 E2E 에서 실제로 검수 화면이 "사진 없음 — 건너뛰세요"를
 *  띄웠고, 그러면 제보 데이터는 영원히 대기로 남거나 근거 없이 승인된다. */
function savePhoto(name, mimeType, dataBase64) {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  var blob = Utilities.newBlob(Utilities.base64Decode(dataBase64), mimeType || "image/jpeg", name || "contribution.jpg");
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}

function json(obj, code) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
