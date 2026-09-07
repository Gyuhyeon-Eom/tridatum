import { renderDemo } from "./analytics-view.mjs?v=20260907g";
// Interactions update only the selected demo. Static HTML is usable before JS loads.
const states = new WeakMap();
function render(host, state, focus) {
  host.innerHTML = renderDemo(Number(host.dataset.demo), state);
  states.set(host, state);
  if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  const status = host.parentElement.querySelector(".demo-status");
  if (status)
    status.textContent = `${host.querySelector(".a-heading h3").textContent} 화면이 선택 조건에 맞춰 갱신되었습니다.`;
}
document.querySelectorAll(".analytics[data-demo]").forEach((host) => {
  states.set(host, {});
  host.addEventListener("change", (event) => {
    const input = event.target.closest("[data-control]");
    if (!input) return;
    const key = input.dataset.control;
    render(
      host,
      { ...states.get(host), [key]: input.value },
      `[data-control="${key}"]`,
    );
  });
  // Update a range's displayed value while dragging; commit the chart on release.
  host.addEventListener("input", (event) => {
    if (event.target.matches('[data-control="threshold"]'))
      host.querySelector(".a-threshold output").textContent = (
        Number(event.target.value) / 100
      ).toFixed(2);
  });
  host.addEventListener("click", (event) => {
    const query = event.target.closest("[data-query]");
    if (query)
      render(
        host,
        { ...states.get(host), query: Number(query.dataset.query) },
        `[data-query="${query.dataset.query}"]`,
      );
  });
});
// SVG marks expose the same values on hover and keyboard focus.
function tip(event) {
  const target = event.target.closest("[data-tip]");
  if (!target) return;
  const tooltip = target.closest(".a-chart")?.querySelector(".a-tooltip");
  if (tooltip) {
    tooltip.textContent = target.dataset.tip;
    tooltip.hidden = false;
  }
}
function hideTip(event) {
  const target = event.target.closest("[data-tip]");
  if (!target || target.contains(event.relatedTarget)) return;
  const tooltip = target.closest(".a-chart")?.querySelector(".a-tooltip");
  if (tooltip) tooltip.hidden = true;
}
document.addEventListener("pointerover", tip);
document.addEventListener("focusin", tip);
document.addEventListener("pointerout", hideTip);
document.addEventListener("focusout", hideTip);
