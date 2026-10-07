const agencies = {
  public: { mode: "공기업 · 공공기관 도입 상담", title: "우리 기관의 데이터,\n어떤 업무에 쓸 수 있을까요?", desc: "정책·사업 분석부터 내부 문서 AI까지, 트라이데이텀이 구현할 수 있는 방법을 이야기합니다.", tags: ["정책·사업 분석", "위험 예측", "내부 문서 AI"], questions: ["우리 기관에 어떤 도움을 줄 수 있나요?", "내부 규정을 찾는 챗봇을 만들고 싶어요."] },
  business: { mode: "사기업 도입 상담", title: "반복되는 일은 줄이고,\n데이터는 판단에 쓰도록.", desc: "매출 분석, 수요 예측, 사내 지식 검색. 우리 회사에 맞는 개발 방향을 함께 찾아보세요.", tags: ["데이터 대시보드", "예측 모델", "업무 자동화"], questions: ["매출 데이터를 어떻게 활용할 수 있나요?", "반복적인 문서 업무를 줄이고 싶어요."] },
  school: { mode: "학교 도입 상담", title: "학교의 행정과 데이터,\n어떻게 더 잘 연결할까요?", desc: "학사 문서 검색부터 교육 프로그램 분석까지, 학교에 필요한 AI와 분석 시스템을 제안합니다.", tags: ["학사 문서 검색", "행정 지원", "교육 데이터 분석"], questions: ["학교에는 어떤 시스템을 만들어줄 수 있나요?", "학사 규정 안내 챗봇을 만들고 싶어요."] },
};
const $ = id => document.getElementById(id);
const log = $("ai-messages"), form = $("ai-form"), field = $("ai-question"), send = $("ai-send");
const state = { agency: "public", history: [], busy: false, ready: false, controller: null, generation: 0 };
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
const panel = $("ai-panel");
let returnFocus;
function openPanel() {
  if (panel.open) return;
  returnFocus = document.activeElement;
  panel.showModal();
  document.documentElement.classList.add("ai-panel-open");
  $("ai-close").focus();
}
function closePanel() { panel.close(); }
panel.addEventListener("close", () => {
  document.documentElement.classList.remove("ai-panel-open");
  returnFocus?.focus();
});
$("ai-close").addEventListener("click", closePanel);
$("ai-open").addEventListener("click", openPanel);
$("ai-launcher").addEventListener("click", openPanel);
function controls() {
  send.disabled = state.busy || !state.ready;
  send.textContent = state.busy ? "·" : "↑";
  field.disabled = state.busy;
  document.querySelectorAll("#ai-suggestions button").forEach(b => b.disabled = state.busy || !state.ready);
  log.setAttribute("aria-busy", String(state.busy));
}
function select(agency) {
  state.controller?.abort(); state.generation++; state.busy = false; state.agency = agency; state.history = [];
  field.value = ""; $("ai-error").textContent = ""; log.replaceChildren();
  document.querySelectorAll("[data-agency]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.agency === agency)));
  const info = agencies[agency]; $("ai-mode").textContent = info.mode;
  $("ai-entry-title").textContent = info.title; $("ai-entry-desc").textContent = info.desc;
  const welcome = el("div", "ai-welcome"); const title = el("h2", "", info.title); title.style.whiteSpace = "pre-line";
  welcome.append(title, el("p", "", info.desc));
  const tags = el("div", "ai-capabilities"); info.tags.forEach(t => tags.append(el("span", "", t))); welcome.append(tags); log.append(welcome);
  $("ai-suggestions").replaceChildren(...info.questions.map(q => { const b = el("button", "", q + " ↗"); b.type = "button"; b.addEventListener("click", () => { openPanel(); field.value = q; form.requestSubmit(); }); return b; }));
  controls();
}
function addMessage(role, text) {
  log.querySelector(".ai-welcome")?.remove();
  const node = el("article", "ai-message ai-message-" + role);
  node.append(el("span", "ai-message-label", role === "user" ? "YOU" : "TRIDATUM AI"));
  if (text) node.append(el("div", "ai-answer-text", text));
  log.append(node); log.scrollTop = log.scrollHeight; return node;
}
function link(source, label, cls) {
  const a = el("a", cls, label); a.href = source.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.title = source.title; return a;
}
function renderAnswer(answer) {
  const node = addMessage("assistant"), body = el("div", "ai-answer-text");
  for (const part of answer.parts) {
    if (typeof part.text === "string") body.append(document.createTextNode(part.text.replace(/\*\*/g, "").replace(/—/g, "·")));
    else if (answer.sources[part.citation - 1]) body.append(link(answer.sources[part.citation - 1], "[" + part.citation + "]", "ai-citation"));
  }
  node.append(body);
  if (answer.sources.length) {
    const sources = el("div", "ai-source-list");
    answer.sources.forEach((s, i) => sources.append(link(s, `${s.title} ↗`, ""))); node.append(sources);
  }
  log.scrollTop = node.offsetTop - log.offsetTop;
}
async function connection() {
  try {
    const r = await fetch("/api/chat/status", { signal: AbortSignal.timeout(8000), cache: "no-store" });
    state.ready = r.ok && (await r.json()).available === true;
  } catch { state.ready = false; }
  $("ai-connection").textContent = state.ready ? "AI 연결됨" : "AI 연결 준비 중";
  $("ai-connection").dataset.ready = String(state.ready);
  if (!state.ready) $("ai-error").textContent = "지금은 연결을 준비하고 있습니다. 유형별 도입 상담 내용을 먼저 살펴보세요.";
  controls();
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  const question = field.value.trim();
  if (!question || state.busy || !state.ready) return;
  const generation = state.generation;
  state.busy = true; state.controller = new AbortController(); controls(); $("ai-error").textContent = "";
  const user = addMessage("user", question), pending = el("p", "ai-loading", "업무에 맞는 활용 방법을 정리하고 있습니다."); log.append(pending); log.scrollTop = log.scrollHeight;
  const messages = [...state.history.slice(-4), { role: "user", content: question }];
  const controller = state.controller;
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agency: state.agency, messages }), signal: controller.signal });
    const data = await r.json();
    if (generation !== state.generation) return;
    if (!r.ok) throw new Error(data.error || "답변을 받지 못했습니다. 다시 시도해 주세요.");
    if (!Array.isArray(data.parts) || !Array.isArray(data.sources)) throw new Error("응답을 읽을 수 없습니다. 다시 시도해 주세요.");
    pending.remove(); renderAnswer(data);
    state.history = [...messages, { role: "assistant", content: data.parts.map(p => p.text || "").join("").slice(0, 2800) }]; field.value = "";
  } catch (e) {
    if (generation !== state.generation) return;
    user.remove();
    $("ai-error").textContent = e.name === "AbortError" ? "응답 시간이 길어졌습니다. 잠시 후 다시 보내 주세요." : e.message;
  } finally {
    clearTimeout(timeout); pending.remove();
    if (generation === state.generation) { state.busy = false; controls(); }
  }
});
field.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll("[data-agency]").forEach(b => b.addEventListener("click", () => { if (state.agency !== b.dataset.agency) select(b.dataset.agency); }));
$("ai-reset").addEventListener("click", () => { select(state.agency); field.focus(); });
select("public"); connection();
