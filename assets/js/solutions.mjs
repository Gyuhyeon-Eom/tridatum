import {
  GROUPS,
  operationalDetail,
} from "./operations-models.mjs?v=20260907v1";
import { operationalExport } from "./operations-view.mjs?v=20260907v1";
import { DEFINITIONS, csv } from "./solutions-data.mjs?v=20260907v1";
import {
  renderSolution,
  solutionModel,
} from "./solutions-view.mjs?v=20260907v1";
const screen = document.getElementById("solution-screen");
if (screen) {
  const tabs = [...document.querySelectorAll("[data-solution]")],
    mobile = document.querySelector(".solution-select select"),
    states = new Map();
  const shell = document.querySelector(".solution-shell");
  const themeButtons = [...document.querySelectorAll("[data-workspace-theme]")];
  themeButtons.forEach((button) =>
    button.addEventListener("click", () => {
      shell.dataset.theme = button.dataset.workspaceTheme;
      themeButtons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button)),
      );
      document.getElementById("solution-status").textContent =
        `${shell.dataset.theme === "dark" ? "어두운" : "밝은"} 업무 화면으로 전환했습니다.`;
    }),
  );
  let current = "market";
  const state = () => states.get(current) || {};
  function render(focus) {
    screen.innerHTML = renderSolution(current, state());
    screen.setAttribute("aria-labelledby", `solution-tab-${current}`);
    if (focus) screen.querySelector(focus)?.focus({ preventScroll: true });
  }
  function setGroup(groupId) {
    const group = GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    document
      .querySelectorAll("[data-solution-group]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.solutionGroup === groupId),
        ),
      );
    tabs.forEach(
      (t) => (t.hidden = !group.members.includes(t.dataset.solution)),
    );
    [...mobile.options].forEach((o) => {
      o.hidden = !group.members.includes(o.value);
      o.disabled = o.hidden;
    });
    document.querySelector("[data-catalog-group]").textContent = group.name;
  }
  document.querySelectorAll("[data-solution-group]").forEach((button) =>
    button.addEventListener("click", () => {
      const group = GROUPS.find((g) => g.id === button.dataset.solutionGroup);
      const active = group.members.includes(current)
        ? current
        : group.members[0];
      show(active);
    }),
  );
  function show(id, keyboard = false) {
    if (!DEFINITIONS.some((d) => d.id === id)) return;
    current = id;
    setGroup(GROUPS.find((g) => g.members.includes(id)).id);
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
      const visible = tabs.filter((t) => !t.hidden),
        index = visible.indexOf(tab);
      let j;
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        j = (index + 1) % visible.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        j = (index + visible.length - 1) % visible.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = visible.length - 1;
      else return;
      e.preventDefault();
      show(visible[j].dataset.solution, true);
    });
  });
  mobile.addEventListener("change", () => show(mobile.value));
  screen.addEventListener("change", (e) => {
    if (e.target.matches("[data-detail-select]")) {
      states.set(current, { ...state(), selected: e.target.value });
      render("[data-detail-select]");
      return;
    }
    if (e.target.matches("[data-case-filter]")) {
      states.set(current, {
        ...state(),
        caseFilter: e.target.value,
        caseId: undefined,
      });
      render("[data-case-filter]");
      return;
    }
    if (e.target.matches("[data-vacancy-region]")) {
      states.set(current, { ...state(), region: e.target.value });
      render("[data-vacancy-region]");
      return;
    }
    if (e.target.matches("[data-case-check]")) {
      const key = e.target.dataset.caseKey,
        index = Number(e.target.dataset.caseCheck),
        map = { ...(state().caseChecks || {}) },
        checked = new Set(map[key] || []);
      if (e.target.checked) checked.add(index);
      else checked.delete(index);
      map[key] = [...checked];
      states.set(current, { ...state(), caseChecks: map });
      render(`[data-case-key="${key}"][data-case-check="${index}"]`);
      return;
    }
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
    const tab = e.target.closest("[data-ops-view]");
    if (tab && ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const all = [...screen.querySelectorAll("[data-ops-view]")],
        i = all.indexOf(tab);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? all.length - 1
            : (i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length;
      states.set(current, { ...state(), view: all[next].dataset.opsView });
      render(`[data-ops-view="${all[next].dataset.opsView}"]`);
      return;
    }
    const el = e.target.closest(".ops-map-point");
    if (el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      selectRecord(el);
    }
  });
  screen.addEventListener("click", (e) => {
    const page = e.target.closest("[data-detail-page], [data-overview-page]");
    if (page) {
      const detail = page.hasAttribute("data-detail-page"),
        key = detail ? "detailPage" : "overviewPage",
        attr = detail ? "data-detail-page" : "data-overview-page";
      states.set(current, { ...state(), [key]: page.getAttribute(attr) });
      render(`[${attr}="${page.getAttribute(attr)}"]`);
      return;
    }
    if (e.target.closest("[data-vacancy-reset]")) {
      states.set(current, { ...state(), feature: undefined });
      render("[data-vacancy-feature]");
      return;
    }

    const view = e.target.closest("[data-ops-view]"),
      item = e.target.closest("[data-ops-case]"),
      complete = e.target.closest("[data-case-complete]"),
      cluster = e.target.closest("[data-vacancy-cluster]"),
      feature = e.target.closest("[data-vacancy-feature]");
    if (view) {
      states.set(current, { ...state(), view: view.dataset.opsView });
      render(`[data-ops-view="${view.dataset.opsView}"]`);
      return;
    }
    if (cluster) {
      states.set(current, {
        ...state(),
        cluster: cluster.dataset.vacancyCluster,
        feature: undefined,
        region: undefined,
      });
      render(`[data-vacancy-cluster="${cluster.dataset.vacancyCluster}"]`);
      return;
    }
    if (feature) {
      states.set(current, {
        ...state(),
        feature: feature.dataset.vacancyFeature,
      });
      render(`[data-vacancy-feature="${feature.dataset.vacancyFeature}"]`);
      return;
    }
    if (item) {
      states.set(current, { ...state(), caseId: item.dataset.opsCase });
      render(`[data-ops-case="${item.dataset.opsCase}"]`);
      return;
    }
    if (complete) {
      const key = complete.dataset.caseComplete,
        done = new Set(state().completedCases || []);
      const model = operationalDetail(
          current,
          state(),
          solutionModel(current, state()).rows,
        ),
        task = model.tasks.find((t) => t.key === key);
      if (!task) return;
      if (done.has(key)) done.delete(key);
      else if (
        task.checks.every((_, i) => state().caseChecks?.[key]?.includes(i))
      )
        done.add(key);
      else return;
      states.set(current, { ...state(), completedCases: [...done] });
      render(`[data-case-complete="${key}"]`);
      document.getElementById("solution-status").textContent = done.has(key)
        ? "화면 내 검토 기록을 완료했습니다."
        : "검토 작업을 다시 열었습니다.";
      return;
    }
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
      const blob = new Blob(
          [
            csv(
              operationalExport(
                current,
                state(),
                solutionModel(current, state()),
              ),
            ),
          ],
          {
            type: "text/csv;charset=utf-8",
          },
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `tridatum-${current}-${state().view || "evidence"}-sample.csv`;
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
