const agencies = {
  public: { mode: "공공기관 · 민원 안내", title: "복잡한 절차를,\n알기 쉬운 안내로.", desc: "민원과 행정 절차를 공개 자료에서 찾아, 필요한 서류와 순서를 정리합니다.", tags: ["민원 상담", "신청 절차", "근거 확인"], questions: ["전입신고는 어떻게 하나요?", "사업자등록 준비 서류를 알려주세요."] },
  business: { mode: "사기업 · 업무 지원", title: "반복되는 업무 질문,\n바로 꺼내 쓰는 답변.", desc: "인사·노무와 사업 운영에 필요한 공개 지침을 찾아 업무 체크리스트로 정리합니다.", tags: ["업무 가이드", "온보딩", "체크리스트"], questions: ["신입사원 입사 준비 체크리스트를 만들어줘.", "근로계약서에 꼭 포함할 항목은?"] },
  school: { mode: "학교 · 교육 안내", title: "학생과 교직원의 질문을,\n다음 행동으로 연결합니다.", desc: "교육 제도와 학교생활 안내를 찾아, 확인할 조건과 다음 단계를 정리합니다.", tags: ["교육 안내", "학생 지원", "절차 정리"], questions: ["국가장학금 신청 절차를 알려주세요.", "학교생활기록부는 어떻게 발급받나요?"] },
};
const $ = id => document.getElementById(id);
const log = $("ai-messages"), form = $("ai-form"), field = $("ai-question"), send = $("ai-send");
const state = { agency: "public", history: [], busy: false, ready: false, controller: null, generation: 0 };
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
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
  const welcome = el("div", "ai-welcome"); const title = el("h2", "", info.title); title.style.whiteSpace = "pre-line";
  welcome.append(title, el("p", "", info.desc));
  const tags = el("div", "ai-capabilities"); info.tags.forEach(t => tags.append(el("span", "", t))); welcome.append(tags); log.append(welcome);
  $("ai-suggestions").replaceChildren(...info.questions.map(q => { const b = el("button", "", q + " ↗"); b.type = "button"; b.addEventListener("click", () => { field.value = q; form.requestSubmit(); }); return b; }));
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
    answer.sources.forEach((s, i) => sources.append(link(s, `${i + 1}. ${s.title} ↗`, ""))); node.append(sources);
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
  if (!state.ready) $("ai-error").textContent = "지금은 연결을 준비하고 있습니다. 유형별 체험 내용을 먼저 살펴보세요.";
  controls();
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  const question = field.value.trim();
  if (!question || state.busy || !state.ready) return;
  const generation = state.generation;
  state.busy = true; state.controller = new AbortController(); controls(); $("ai-error").textContent = "";
  const user = addMessage("user", question), pending = el("p", "ai-loading", "공식 자료를 확인해 답변을 작성하고 있습니다."); log.append(pending); log.scrollTop = log.scrollHeight;
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
document.querySelectorAll("[data-agency]").forEach(b => b.addEventListener("click", () => select(b.dataset.agency)));
$("ai-reset").addEventListener("click", () => { select(state.agency); field.focus(); });
select("public"); connection();
