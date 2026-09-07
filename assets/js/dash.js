import { renderDemo, renderDetail } from "./analytics-view.mjs?v=20260907v1";
const states = new WeakMap();
function render(host, state, focus) {
  host.innerHTML = renderDemo(Number(host.dataset.demo), state);
  states.set(host, state);
  if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  const status = host.parentElement.querySelector(".demo-status");
  if (status) status.textContent = "선택 조건에 맞춰 분석 결과를 갱신했습니다.";
}
document.querySelectorAll(".analytics[data-demo]").forEach((host) => {
  states.set(host, {});
  host.addEventListener("change", (e) => {
    const input = e.target.closest("[data-control]");
    if (!input) return;
    const key = input.dataset.control;
    render(
      host,
      { ...states.get(host), [key]: input.value },
      `[data-control="${key}"]`,
    );
  });
  host.addEventListener("input", (e) => {
    if (e.target.matches('[data-control="threshold"]'))
      host.querySelector("output").textContent = (
        Number(e.target.value) / 100
      ).toFixed(2);
  });
  host.addEventListener("click", (e) => {
    const q = e.target.closest("[data-query]"),
      trace = e.target.closest("[data-trace]"),
      source = e.target.closest("[data-source-link]");
    if (q)
      render(
        host,
        { ...states.get(host), query: Number(q.dataset.query) },
        `[data-query="${q.dataset.query}"]`,
      );
    if (trace)
      render(
        host,
        { ...states.get(host), trace: trace.dataset.trace },
        `[data-trace="${trace.dataset.trace}"]`,
      );
    if (source) {
      e.preventDefault();
      const target = host.querySelector(".a-doc-source");
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        block: "nearest",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  });
});
const dialog = document.createElement("dialog");
dialog.className = "analysis-dialog";
dialog.setAttribute("aria-labelledby", "detail-title");
dialog.innerHTML =
  '<button type="button" aria-label="상세 분석 닫기">×</button><div class="detail-content"></div>';
document.body.append(dialog);
dialog.querySelector("button").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-detail]");
  if (!button) return;
  const [index, key] = button.dataset.detail.split(":");
  const host = document.querySelector(`.analytics[data-demo="${index}"]`);
  dialog.querySelector(".detail-content").innerHTML = renderDetail(
    Number(index),
    key,
    states.get(host) || {},
  );
  dialog.showModal();
});
function showTip(e) {
  const target = e.target.closest("[data-tip]");
  if (!target) return;
  const tip = target.closest(".a-chart")?.querySelector(".a-tooltip");
  if (tip) {
    tip.textContent = target.dataset.tip;
    tip.hidden = false;
  }
}
function hideTip(e) {
  const target = e.target.closest("[data-tip]");
  if (!target || target.contains(e.relatedTarget)) return;
  const tip = target.closest(".a-chart")?.querySelector(".a-tooltip");
  if (tip) tip.hidden = true;
}
document.addEventListener("pointerover", showTip);
document.addEventListener("focusin", showTip);
document.addEventListener("pointerout", hideTip);
document.addEventListener("focusout", hideTip);
