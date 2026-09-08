import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import worker, { getContent, putContent } from "../worker/src/index.js";

const env = {
  GH_OWNER: "example",
  GH_REPO: "public-site",
  GH_BRANCH: "main",
  GITHUB_TOKEN: "mock-invalid-token",
};
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });
const metadata = {
  sha: "test-sha",
  content: Buffer.from(JSON.stringify({ "cta.title": "문의" })).toString(
    "base64",
  ),
};

test("expired editing credentials allow only public content reads and flag them read-only", async (t) => {
  const calls = [];
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, ...opts });
    return opts.headers?.authorization
      ? response({}, 401)
      : response({ "cta.title": "문의" });
  };
  const result = await getContent(
    new URL("https://example.com/api/admin/content?file=site"),
    env,
  );
  const body = await result.json();
  assert.equal(body.data["cta.title"], "문의");
  assert.equal(body.readOnly, true);
  assert.match(body.warning, /GITHUB_TOKEN/);
  assert.equal(calls.length, 2);
  assert(calls.every((call) => (call.method || "GET") === "GET"));
  assert.equal(
    calls[1].url,
    "https://raw.githubusercontent.com/example/public-site/main/assets/content/site.json",
  );
  assert(!calls[1].headers);
  assert(!JSON.stringify(body).includes(env.GITHUB_TOKEN));
});

test("content writes never retry without authentication", async (t) => {
  const calls = [];
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, ...opts });
    return opts.method === "GET" ? response(metadata) : response({}, 401);
  };
  await assert.rejects(
    putContent(
      new Request("https://example.com/api/admin/content", {
        method: "PUT",
        body: JSON.stringify({ file: "site", data: { "cta.title": "변경" } }),
      }),
      env,
      { email: "admin@example.com" },
    ),
    { code: "GITHUB_AUTH_FAILED" },
  );
  assert.deepEqual(
    calls.map((call) => call.method),
    ["GET", "PUT"],
  );
  assert(
    calls.every(
      (call) => call.headers.authorization === `Bearer ${env.GITHUB_TOKEN}`,
    ),
  );
});

test("Access remains required for content and inquiries; file paths remain restricted", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = () => {
    throw new Error("upstream must not be called");
  };
  for (const path of ["content?file=site", "inquiries"]) {
    assert.equal(
      (
        await worker.fetch(
          new Request(`https://example.com/api/admin/${path}`),
          env,
        )
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await getContent(
        new URL("https://example.com/api/admin/content?file=secrets"),
        env,
      )
    ).status,
    400,
  );
});

const client = readFileSync(
  new URL("../admin/admin.js", import.meta.url),
  "utf8",
);
const sampleInquiries = {
  items: [
    {
      id: "inq:test",
      name: "문의 확인용",
      msg: "합성 문의 본문",
      email: "visitor@example.com",
      notification: { status: "accepted" },
    },
  ],
  notifications: { configured: true, to: "contact@tridatum.co" },
};
async function openAdmin(handle) {
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector))
      elements.set(selector, {
        style: {},
        disabled: true,
        textContent: "",
        innerHTML: "",
        handlers: {},
        addEventListener(type, fn) {
          this.handlers[type] = fn;
        },
      });
    return elements.get(selector);
  };
  const calls = [];
  runInNewContext(client, {
    document: { querySelector: element, querySelectorAll: () => [] },
    fetch: async (path, opts) => {
      calls.push({ path, opts });
      return path === "/api/admin/me"
        ? response({ email: "admin@example.com" })
        : handle(path, opts);
    },
  });
  // Flush the network and rendering microtasks without relying on fixed delays.
  await new Promise(setImmediate);
  return { element, calls };
}

test("content failure does not hide inquiries or enable an empty content save", async () => {
  const { element, calls } = await openAdmin((path) =>
    path.includes("content")
      ? response({ error: "GitHub error" }, 500)
      : response(sampleInquiries),
  );
  assert.match(element("#inq-list").innerHTML, /문의 확인용/);
  assert.match(element("#copy-error").textContent, /GitHub error/);
  assert.equal(element("#adm-error").textContent, "");
  assert.equal(element("#copy-save").disabled, true);
  await element("#copy-save").handlers.click();
  assert(!calls.some((call) => call.opts?.method === "PUT"));
});

test("a stalled content request does not delay the inbox", async () => {
  const { element } = await openAdmin((path) =>
    path.includes("content")
      ? new Promise(() => {})
      : response(sampleInquiries),
  );
  assert.match(element("#inq-list").innerHTML, /합성 문의 본문/);
  assert.equal(element("#inq-reload").disabled, false);
});

test("read-only content disables saving while inquiries remain available", async () => {
  const { element, calls } = await openAdmin((path) =>
    path.includes("content")
      ? response({
          data: { "cta.title": "문의" },
          readOnly: true,
          warning: "토큰 갱신 필요",
        })
      : response(sampleInquiries),
  );
  assert.equal(element("#copy-save").disabled, true);
  assert.match(element("#copy-error").textContent, /읽기 전용/);
  assert.match(element("#inq-list").innerHTML, /문의 확인용/);
  await element("#copy-save").handlers.click();
  assert(!calls.some((call) => call.opts?.method === "PUT"));
});

test("inquiry failure stays in its pane and can be retried without reloading content", async () => {
  let fail = true;
  const { element, calls } = await openAdmin((path) =>
    path.includes("content")
      ? response({ data: { "cta.title": "문의" } })
      : fail
        ? response({ error: "일시적 오류" }, 503)
        : response(sampleInquiries),
  );
  assert.equal(element("#copy-save").disabled, false);
  assert.match(element("#inq-error").textContent, /일시적 오류/);
  fail = false;
  await element("#inq-reload").handlers.click();
  assert.equal(element("#inq-error").style.display, "none");
  assert.match(element("#inq-list").innerHTML, /문의 확인용/);
  assert.equal(calls.filter((call) => call.path.includes("content")).length, 1);
});
