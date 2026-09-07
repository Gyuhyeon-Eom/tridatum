// Public-page motion, section tracking and cross-page demo links. No scroll hijacking.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const revealed = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window && !reduce.matches) {
    document.documentElement.classList.add("motion-ready");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -32px 0px", threshold: 0.06 },
    );
    revealed.forEach((el) => io.observe(el));
    reduce.addEventListener("change", () => {
      if (reduce.matches) {
        revealed.forEach((el) => el.classList.add("is-visible"));
        io.disconnect();
      }
    });
  }
  const sheet = document.querySelector(".sheet");
  const chapters = [...document.querySelectorAll("[data-chapter]")];
  const links = [...document.querySelectorAll(".section-rail a")];
  const sculpture = document.querySelector(".sculpture-shift");
  let header = document.querySelector(".site-header");
  let pending = false;
  function update() {
    pending = false;
    if (header) {
      const rect = sheet?.getBoundingClientRect();
      const light =
        document.body.dataset.page === "privacy" ||
        (rect && rect.top < 72 && rect.bottom > 72);
      header.classList.toggle("on-light", Boolean(light));
    }
    if (chapters.length) {
      let current = chapters[0].id;
      for (const chapter of chapters) {
        if (
          chapter.getBoundingClientRect().top <=
          Math.min(innerHeight * 0.32, 240)
        )
          current = chapter.id;
      }
      links.forEach((a) => {
        const active = a.hash === `#${current}`;
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    }
    if (sculpture && !reduce.matches && scrollY < 850) {
      sculpture.style.setProperty(
        "--sculpture-y",
        `${Math.min(scrollY * 0.1, 70)}px`,
      );
      sculpture.style.setProperty(
        "--sculpture-r",
        `${Math.min(scrollY * 0.01, 7)}deg`,
      );
    }
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  addEventListener("pageshow", update);
  document.addEventListener("includes:done", () => {
    header = document.querySelector(".site-header");
    update();
  });
  links.forEach((a) =>
    a.addEventListener("click", () => {
      const target = document.getElementById(a.hash.slice(1));
      // Keep the browser's native anchor navigation; make the destination keyboard reachable.
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }),
  );
  document.querySelectorAll("[data-open-demo]").forEach((a) => {
    a.addEventListener("click", () => {
      try {
        sessionStorage.setItem("tridatum:demo", a.dataset.openDemo);
      } catch {
        /* Optional convenience */
      }
    });
  });
  // Pause the SVG's decorative motion when the user prefers reduced motion.
  function syncDecoration() {
    document.querySelectorAll(".hero-sculpture svg").forEach((svg) => {
      if (reduce.matches) svg.pauseAnimations?.();
      else svg.unpauseAnimations?.();
    });
  }
  reduce.addEventListener("change", syncDecoration);
  syncDecoration();
  update();
})();
