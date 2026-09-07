// Public-page entrance, navigation and scroll choreography. Native scrolling is retained.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const curtain = document.querySelector(".page-transition");
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
    const section = [
      ...document.querySelectorAll(
        ".masthead, .chapter, .contact-banner, .contact-sheet, .legal-page, .site-footer",
      ),
    ].find((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= 100 && r.bottom > 100;
    });
    const light = !section?.matches(".theme-dark, .site-footer");
    header?.classList.toggle("on-light", light);
    const hero = document.querySelector(".hero-copy");
    if (hero && !reduce.matches)
      hero.style.setProperty(
        "--hero-drift",
        `${Math.min(scrollY * 0.13, 65)}px`,
      );
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
      document
        .querySelector(".hero-copy")
        ?.style.removeProperty("--hero-drift");
    }
    update();
  });
  document.querySelectorAll(".service-accordion").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (detail.open)
        document.querySelectorAll(".service-accordion").forEach((other) => {
          if (other !== detail) other.open = false;
        });
    });
  });
  update();
})();
