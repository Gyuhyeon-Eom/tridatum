// Public-page entrance, navigation and scroll choreography. Native scrolling is retained.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const curtain = document.querySelector(".page-transition");
  const sheet = document.querySelector(".sheet");
  const chapters = [...document.querySelectorAll("[data-chapter]")];
  const links = [...document.querySelectorAll(".section-rail a")];
  let header = document.querySelector(".site-header"),
    pending = false,
    navigating = false;
  const revealed = [...document.querySelectorAll(".reveal")];
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add("is-visible");
                io.unobserve(e.target);
              }
            }),
          { rootMargin: "0px 0px -24px 0px", threshold: 0.08 },
        )
      : null;
  revealed.forEach((el, i) => {
    el.style.setProperty(
      "--reveal-delay",
      `${el.matches(".editorial-row,.capability,.person") ? (i % 3) * 65 : 0}ms`,
    );
    if (io && !reduce.matches) io.observe(el);
    else el.classList.add("is-visible");
  });
  if (io && !reduce.matches) root.classList.add("motion-ready");
  function update() {
    pending = false;
    const rect = sheet?.getBoundingClientRect();
    const light =
      document.body.dataset.page === "home" ||
      document.body.dataset.page === "privacy" ||
      (rect && rect.top < 74 && rect.bottom > 74);
    header?.classList.toggle("on-light", Boolean(light));
    if (sheet && !reduce.matches) {
      const p = Math.max(
        0,
        Math.min(1, (innerHeight - (rect?.top || 0)) / innerHeight),
      );
      sheet.style.setProperty("--sheet-radius", `${48 - p * 24}px`);
    }
    const hero = document.querySelector(".hero-copy");
    if (hero && !reduce.matches)
      hero.style.setProperty(
        "--hero-drift",
        `${Math.min(scrollY * 0.13, 65)}px`,
      );
    let current = chapters[0]?.id;
    for (const c of chapters)
      if (c.getBoundingClientRect().top <= Math.min(innerHeight * 0.32, 240))
        current = c.id;
    links.forEach((a) => {
      const active = a.hash === `#${current}`;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  document.addEventListener("includes:done", () => {
    header = document.querySelector(".site-header");
    update();
  });
  addEventListener("pageshow", (e) => {
    navigating = false;
    root.classList.remove("is-leaving");
    if (e.persisted) root.classList.add("entry-complete");
    update();
  });
  curtain?.addEventListener("animationend", () => {
    if (!navigating) root.classList.add("entry-complete");
  });
  // Short cover transition for public HTML links; modified clicks, downloads, anchors and admin keep native behavior.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (
      !a ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      a.download ||
      a.target ||
      reduce.matches ||
      !curtain
    )
      return;
    const url = new URL(a.href, location.href);
    if (
      url.origin !== location.origin ||
      !url.pathname.endsWith(".html") ||
      url.pathname.includes("/admin/") ||
      url.pathname === location.pathname
    )
      return;
    e.preventDefault();
    if (navigating) return;
    navigating = true;
    root.classList.remove("entry-complete");
    root.classList.add("is-leaving");
    setTimeout(() => location.assign(url.href), 390);
  });
  links.forEach((a) =>
    a.addEventListener("click", () => {
      const target = document.getElementById(a.hash.slice(1));
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }),
  );
  document.querySelectorAll("[data-open-demo]").forEach((a) =>
    a.addEventListener("click", () => {
      try {
        sessionStorage.setItem("tridatum:demo", a.dataset.openDemo);
      } catch {}
    }),
  );
  reduce.addEventListener("change", () => {
    if (reduce.matches) {
      revealed.forEach((el) => el.classList.add("is-visible"));
      root.classList.add("entry-complete");
      sheet?.style.removeProperty("--sheet-radius");
      document
        .querySelector(".hero-copy")
        ?.style.removeProperty("--hero-drift");
    }
    update();
  });
  update();
})();
