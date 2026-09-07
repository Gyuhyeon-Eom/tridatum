// Accessible tabs with native keyboard controls and replayable sample charts.
(() => {
  const tabs = [...document.querySelectorAll(".dt")];
  const slides = [...document.querySelectorAll(".demo-slide")];
  const title = document.getElementById("demo-title");
  if (!tabs.length || tabs.length !== slides.length) return;
  const list = document.querySelector(".demo-tabs");
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "결과물 종류");
  tabs.forEach((tab, i) => {
    tab.id = `demo-tab-${i}`;
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `demo-panel-${i}`);
    slides[i].id = `demo-panel-${i}`;
    slides[i].setAttribute("role", "tabpanel");
    slides[i].setAttribute("aria-labelledby", tab.id);
    slides[i].tabIndex = 0;
  });
  let sequence = 0;
  function show(i, focus = false) {
    if (!tabs[i]) return;
    const token = ++sequence;
    tabs.forEach((tab, k) => {
      tab.classList.toggle("on", k === i);
      tab.setAttribute("aria-selected", String(k === i));
      tab.tabIndex = k === i ? 0 : -1;
      slides[k].classList.toggle("on", k === i);
      slides[k].hidden = k !== i;
    });
    if (title) title.textContent = tabs[i].dataset.title;
    if (focus) tabs[i].focus({ preventScroll: true });
    const slide = slides[i];
    slide.querySelectorAll(".fade").forEach((el) => el.classList.add("in"));
    const charts = [...slide.querySelectorAll("svg.sweep, .hbar, .donut")];
    charts.forEach((el) => el.classList.remove("anim"));
    void slide.offsetHeight;
    const replay = () => {
      if (token === sequence) charts.forEach((el) => el.classList.add("anim"));
    };
    requestAnimationFrame(replay);
    setTimeout(replay, 80);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(i));
    tab.addEventListener("keydown", (e) => {
      const next = {
        ArrowRight: (i + 1) % tabs.length,
        ArrowLeft: (i + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[e.key];
      if (next !== undefined) {
        e.preventDefault();
        show(next, true);
        tabs[next].scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  });
  document.querySelectorAll(".var-toggle").forEach((btn, i) => {
    const variants = btn.closest(".variants");
    const grid = variants.querySelector(".var-grid");
    grid.id = `variant-grid-${i}`;
    grid.hidden = true;
    btn.setAttribute("aria-controls", grid.id);
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const opened = variants.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(opened));
      grid.hidden = !opened;
    });
  });
  let initial = 0;
  try {
    const saved = sessionStorage.getItem("tridatum:demo");
    if (location.hash === "#showcase" && saved !== null && tabs[Number(saved)])
      initial = Number(saved);
    sessionStorage.removeItem("tridatum:demo");
  } catch {
    /* First tab is always available */
  }
  show(initial);
})();
