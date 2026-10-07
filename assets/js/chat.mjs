const agencies = {
  nts: { mode: "세금 안내 · 절차 정리", title: "복잡한 세금 업무,\n어디서 시작할까요?", desc: "국세청 공개 자료를 찾아 신고 절차와 확인할 사항을 정리합니다.", tags: ["신고 안내", "단계별 정리", "공식 출처"], questions: ["처음 사업자등록을 하려면?", "종합소득세와 연말정산의 차이는?"] },
  nhis: { mode: "건강보험 안내 · 체크리스트", title: "필요한 서류부터\n확인할 조건까지.", desc: "국민건강보험공단의 안내를 바탕으로 자격·증명서 관련 질문을 풀어드립니다.", tags: ["자격 안내", "준비 서류", "공식 출처"], questions: ["자격득실확인서는 어떻게 발급받나요?", "피부양자 등록 전 무엇을 확인하나요?"] },
  reb: { mode: "부동산 통계 · 지표 해석", title: "숫자의 의미를\n질문으로 확인하세요.", desc: "한국부동산원 공개 통계에서 지표의 의미와 비교할 때 주의할 점을 찾습니다.", tags: ["통계 조회", "지표 비교", "기준 시점"], questions: ["주택가격지수와 실거래가격지수의 차이는?", "서울 아파트 가격동향은 어디서 확인하나요?"] },
};
const $ = id => document.getElementById(id);
const log = $("ai-messages"), form = $("ai-form"), field = $("ai-question"), send = $("ai-send");
const state = { agency: "nts", history: [], busy: false, ready: false, controller: null, generation: 0 };
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
  if (!state.ready) $("ai-error").textContent = "지금은 연결을 준비하고 있습니다. 기관별 체험 내용을 먼저 살펴보세요.";
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
select("nts"); connection();
