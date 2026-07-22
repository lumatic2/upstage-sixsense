/** 캠퍼스 기준 도보 분 환산 — /api/recommend 와 칩 검증이 같은 값을 써야 한다.
 *  두 곳에 각자 하버사인을 두면 "도보 5분 안"이라고 제안한 칩과 실제 추천 결과가 어긋난다.
 *  (80m/분 환산은 parse-query 의 `Nm 이내` 해석과 같은 기준.)
 *
 *  기준점 = 경영관 (2026-07-22 사용자 확정). 브라우저 위치 권한을 받지 않으므로 "도보 N분"은
 *  사용자 현위치가 아니라 **캠퍼스 안 고정 지점**에서 잰 값이다. 화면 문구도 그렇게 말해야 한다.
 *  좌표 출처: 네이버 로컬 검색 API "성균관대학교 인문사회과학캠퍼스 경영관" (2026-07-22 조회). */
const CAMPUS = { lat: 37.58878, lng: 126.99260 }; // 경영관

export function walkMin(lat, lng) {
  if (!lat || !lng) return null;
  const R = 6371000, dLat = ((lat - CAMPUS.lat) * Math.PI) / 180, dLng = ((lng - CAMPUS.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((CAMPUS.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round((2 * R * Math.asin(Math.sqrt(s))) / 80));
}
