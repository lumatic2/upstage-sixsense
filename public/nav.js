/** 헤더 nav 공통 동작 (DR10 step-4)
 *
 *  좁은 화면에서 nav 는 한 줄 가로 스크롤이다. 넘치는 항목이 그냥 잘리면 "고장" 으로 읽혀서
 *  오른쪽에 페이드를 깔아 뒀는데(theme.css), 끝까지 스크롤한 뒤에도 페이드가 남으면
 *  마지막 항목이 흐린 채라 그것도 잘린 것처럼 보인다. 끝에 닿으면 페이드를 걷는다.
 *
 *  현재 페이지 링크에 aria-current 를 붙이는 일도 여기서 한다 — 페이지마다 손으로 적다 보니
 *  contribute.html 처럼 항목 하나가 통째로 빠지는 일이 생겼다(2026-07-21 감사).
 */
(() => {
  const nav = document.querySelector(".site-head .nav-main");
  if (!nav) return;

  const sync = () => {
    const atEnd = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2;
    nav.classList.toggle("at-end", atEnd || nav.scrollWidth <= nav.clientWidth);
  };
  sync();
  nav.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  document.fonts?.ready?.then(sync); // 웹폰트 적용 후 폭이 바뀐다
})();
