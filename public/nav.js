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

/** 로그인 버튼 팝오버 (2026-07-23 — 구 `<dialog class="sheet">` 모달 대체)
 *
 *  누를 게 하나뿐인 안내에 화면을 덮는 모달을 띄우면 "뭔가 잘못됐나" 로 읽힌다. 버튼 옆에
 *  붙는 작은 말풍선이면 충분하다.
 *
 *  **마크업을 여기서 만든다.** 헤더는 네 페이지에 복제돼 있어서 손으로 적으면 반드시 갈라진다
 *  (실제로 contribute.html 은 nav 항목 하나가 통째로 빠져 있었다). 문구가 한 곳에만 있으면
 *  네 페이지가 같은 말을 하는 것이 보장된다. */
(() => {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;

  const wrap = document.createElement("div");
  wrap.className = "login-wrap";
  btn.replaceWith(wrap);
  wrap.appendChild(btn);

  const onApp = location.pathname.startsWith("/app");
  const pop = document.createElement("div");
  // 여닫힘을 `hidden` 이 아니라 `.open` 으로 다룬다 — `hidden` 은 display:none 이라
  // 페이드가 걸리지 않는다. 닫힘 상태의 접근성은 CSS 의 visibility:hidden 이 맡는다.
  pop.className = "pop";
  pop.innerHTML = `<p>한입지도는 로그인 없이 이용할 수 있어요.</p>`
    + (onApp
      ? `<button class="btn sm" type="button" data-close>알겠어요</button>`
      : `<a class="btn sm" href="/app.html">써보기</a>`);
  // 페이지가 덧붙일 것이 있으면(app.html 의 "기록 지우기") 그 요소를 옮겨 담는다.
  // 페이지 마크업에 남겨 두는 이유: 그 페이지의 인라인 스크립트가 파싱 시점에 id 로 찾는데,
  // nav.js 는 defer 라 나중에 돈다 — 여기서 만들면 그 스크립트가 null 을 잡는다.
  const extra = document.getElementById("loginPopExtra");
  if (extra) { extra.hidden = false; pop.appendChild(extra); }
  wrap.appendChild(pop);

  const close = () => { pop.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = pop.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  pop.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  // 바깥을 누르거나 Esc — 말풍선은 닫는 방법이 분명해야 한다.
  document.addEventListener("click", (e) => { if (pop.classList.contains("open") && !wrap.contains(e.target)) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();
