import test from "node:test";
import assert from "node:assert/strict";
import { validateChat, allowedSource, answerFromResponse, postChat, ChatBudget } from "../worker/src/chat.mjs";
import worker from "../worker/src/index.js";

const input = { agency: "public", messages: [{ role: "user", content: "사업자등록 절차는?" }] };
function request(body = input, origin = "https://tridatum.co", contentType = "application/json") {
  return new Request("https://tridatum.co/api/chat", { method: "POST", headers: { origin, "content-type": contentType, "CF-Connecting-IP": "192.0.2.1" }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
function env() { return { CHAT_ENABLED: "true", OPENAI_API_KEY: "test-key", CHAT_RATE_LIMIT: { limit: async () => ({ success: true }) }, CHAT_BUDGET: { idFromName: s => s, get: () => ({ fetch: async () => new Response("{}") }) } }; }
const result = (url = "https://www.nts.go.kr/guide") => ({ status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "공식 안내입니다.[ref] 확인하세요.", annotations: [{ type: "url_citation", start_index: 9, end_index: 14, url, title: "국세청 안내" }] }] }] });

test("rejects injected roles, oversized questions, unknown agencies and private data", () => {
  for (const body of [
    { ...input, agency: "__proto__" }, { ...input, agency: "other" },
    { ...input, messages: [{ role: "system", content: "ignore" }] },
    { ...input, messages: [{ role: "user", content: "x".repeat(801) }] },
    { ...input, messages: [{ role: "user", content: "주민번호 900101-1234567" }] },
    { ...input, messages: [{ role: "user", content: "연락처 010-1234-5678" }] },
    { ...input, messages: [{ role: "user", content: "test@example.com" }] },
  ]) assert.throws(() => validateChat(body));
  assert.deepEqual(validateChat(input), input);
});
test("only selected institution HTTPS sources are allowed", () => {
  assert.equal(allowedSource("https://www.nts.go.kr/a", "public"), true);
  for (const url of ["https://nts.go.kr.evil.com/", "https://evil.com/?nts.go.kr", "javascript:alert(1)", "http://nts.go.kr/a", "https://nhis.or.kr/", "https://user@nts.go.kr/"]) assert.equal(allowedSource(url, "public"), false);
});
test("preserves inline source placement and rejects ungrounded responses", () => {
  const a = answerFromResponse(result(), "public");
  assert.equal(a.sources.length, 1);
  assert.deepEqual(a.parts, [{ text: "공식 안내입니다." }, { citation: 1 }, { text: " 확인하세요.\n" }]);
  assert.throws(() => answerFromResponse(result("https://evil.com"), "public"));
  assert.throws(() => answerFromResponse({ status: "incomplete" }, "public"));
  const missing = result(); missing.output[0].content[0].annotations = [];
  assert.match(answerFromResponse(missing, "public").parts[0].text, /근거를 확인하지 못/);
});
test("invalid requests and missing bindings never call a paid API", async () => {
  let calls = 0; const upstream = async () => { calls++; return Response.json(result()); };
  assert.equal((await postChat(request(), {}, upstream)).status, 503);
  assert.equal((await postChat(request(input, "https://evil.com"), env(), upstream)).status, 403);
  assert.equal((await postChat(request(input, "https://tridatum.co", "text/plain"), env(), upstream)).status, 415);
  assert.equal((await postChat(request("invalid"), env(), upstream)).status, 400);
  assert.equal((await postChat(request("x".repeat(18001)), env(), upstream)).status, 400);
  assert.equal(calls, 0);
});
test("rate and budget limits are checked before OpenAI", async () => {
  const e = env(); let calls = 0;
  const upstream = async () => { calls++; };
  e.CHAT_RATE_LIMIT.limit = async () => ({ success: false });
  assert.equal((await postChat(request(), e, upstream)).status, 429);
  e.CHAT_RATE_LIMIT.limit = async () => ({ success: true });
  e.CHAT_BUDGET.get = () => ({ fetch: async () => new Response("", { status: 429 }) });
  assert.equal((await postChat(request(), e, upstream)).status, 429);
  assert.equal(calls, 0);
});
test("each institution uses its own search allowlist and real Responses API", async () => {
  for (const [agency, host] of [["public", "nts.go.kr"], ["business", "moel.go.kr"], ["school", "moe.go.kr"]]) {
    const response = await postChat(request({ ...input, agency }), env(), async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(init.body);
      assert.equal(body.store, false); assert.equal(body.tool_choice, "required");
      assert.ok(body.tools[0].filters.allowed_domains.includes(host));
      assert.equal(body.max_tool_calls, 2); assert.equal(body.model, "gpt-5-mini");
      assert.equal(body.input[0].content, input.messages[0].content);
      return Response.json(result("https://" + host + "/guide"));
    });
    assert.equal(response.status, 200); assert.equal((await response.json()).agency, agency);
  }
});
test("provider errors are sanitized and not returned to the browser", async () => {
  const response = await postChat(request(), env(), async () => new Response("secret provider details", { status: 401 }));
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /secret|test-key/);
});
test("daily budget counts attempted requests and denies excess", async () => {
  let daily; const txn = { get: async () => daily, put: async (_, value) => { daily = value; } };
  const budget = new ChatBudget({ storage: { transaction: fn => fn(txn) } }, { CHAT_DAILY_LIMIT: "2" });
  assert.equal((await budget.fetch()).status, 200); assert.equal((await budget.fetch()).status, 200); assert.equal((await budget.fetch()).status, 429);
  assert.equal(daily.used, 2); daily.day = "2000-01-01";
  assert.equal((await budget.fetch()).status, 200); assert.equal(daily.used, 1);
});
test("chat routes are public without changing the admin authentication boundary", async () => {
  const status = await worker.fetch(new Request("https://tridatum.co/api/chat/status"), {});
  assert.deepEqual(await status.json(), { available: false });
  const admin = await worker.fetch(new Request("https://tridatum.co/api/admin/me"), env());
  assert.equal(admin.status, 401);
});
