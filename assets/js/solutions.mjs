import { DEFINITIONS, csv } from "./solutions-data.mjs?v=20260907s3";
import {
  renderSolution,
  solutionModel,
} from "./solutions-view.mjs?v=20260907s3";
const screen = document.getElementById("solution-screen");
if (screen) {
  const tabs = [...document.querySelectorAll("[data-solution]")],
    mobile = document.querySelector(".solution-select select"),
    states = new Map();
  let current = "market";
  const state = () => states.get(current) || {};
  function render(focus) {
    screen.innerHTML = renderSolution(current, state());
    screen.setAttribute("aria-labelledby", `solution-tab-${current}`);
    if (focus) screen.querySelector(focus)?.focus({ preventScroll: true });
  }
  function show(id, keyboard = false) {
    if (!DEFINITIONS.some((d) => d.id === id)) return;
    current = id;
    tabs.forEach((t) => {
      const active = t.dataset.solution === id;
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
      if (active && keyboard) t.focus();
    });
    mobile.value = id;
    render();
    document.getElementById("solution-status").textContent =
      `${DEFINITIONS.find((d) => d.id === id).title} 화면을 열었습니다.`;
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(tab.dataset.solution));
    tab.addEventListener("keydown", (e) => {
      let j;
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        j = (i + tabs.length - 1) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      else return;
      e.preventDefault();
      show(tabs[j].dataset.solution, true);
    });
  });
  mobile.addEventListener("change", () => show(mobile.value));
  screen.addEventListener("change", (e) => {
    const input = e.target.closest("[data-ops-filter]");
    if (!input) return;
    states.set(current, {
      ...state(),
      [input.dataset.opsFilter]: input.value,
      selected: undefined,
    });
    render(`[data-ops-filter="${input.dataset.opsFilter}"]`);
  });
  function selectRecord(el) {
    states.set(current, { ...state(), selected: el.dataset.opsRecord });
    const id = el.dataset.opsRecord;
    const wasMap = el.matches(".ops-map-point");
    render(
      wasMap
        ? `.ops-map-point[data-ops-record="${id}"]`
        : `button[data-ops-record="${id}"]`,
    );
  }
  screen.addEventListener("keydown", (e) => {
    const el = e.target.closest(".ops-map-point");
    if (el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      selectRecord(el);
    }
  });
  screen.addEventListener("click", (e) => {
    const record = e.target.closest("[data-ops-record]"),
      review = e.target.closest("[data-ops-review]"),
      source = e.target.closest("[data-ops-source]");
    if (record) selectRecord(record);
    if (review) {
      const set = new Set(state().reviewed || []),
        id = review.dataset.opsReview;
      if (set.has(id)) set.delete(id);
      else set.add(id);
      states.set(current, { ...state(), reviewed: [...set] });
      render(`[data-ops-review="${id}"]`);
      document.getElementById("solution-status").textContent = set.has(id)
        ? "현재 화면에 확인 표시를 남겼습니다."
        : "확인 표시를 해제했습니다.";
    }
    if (source) {
      e.preventDefault();
      const target = screen.querySelector(".ops-paper mark");
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
    if (e.target.closest("[data-ops-export]")) {
      const blob = new Blob([csv(solutionModel(current, state()).rows)], {
          type: "text/csv;charset=utf-8",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `tridatum-${current}-sample.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      document.getElementById("solution-status").textContent =
        "선택한 조건의 예시 데이터를 CSV로 내보냈습니다.";
    }
  });
  for (const type of ["pointerover", "focusin"])
    screen.addEventListener(type, (e) => {
      const target = e.target.closest("[data-tip]"),
        tip = target?.closest(".a-chart")?.querySelector(".a-tooltip");
      if (tip) {
        tip.textContent = target.dataset.tip;
        tip.hidden = false;
      }
    });
  for (const type of ["pointerout", "focusout"])
    screen.addEventListener(type, (e) => {
      const target = e.target.closest("[data-tip]"),
        tip = target?.closest(".a-chart")?.querySelector(".a-tooltip");
      if (tip && !target.contains(e.relatedTarget)) tip.hidden = true;
    });
  try {
    const saved = sessionStorage.getItem("tridatum:demo");
    if (saved !== null) {
      sessionStorage.removeItem("tridatum:demo");
      show(
        ["market", "vacancy", "voucher", "documents", "llm"][Number(saved)] ||
          "market",
      );
    }
  } catch {}
}
