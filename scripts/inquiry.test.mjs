import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import worker from "../worker/src/index.js";
import { notifyInquiry, listInquiries } from "../worker/src/inquiries.mjs";

const payload = {
  name: "테스트 담당자",
  org: "가상 기관",
  email: "sender@example.com",
  msg: "합성 테스트 문의",
  agree: "on",
};
function fixture(send = true) {
  const data = new Map(),
    outbox = [],
    events = [];
  const env = {
    INQUIRY_FROM: "website@notify.tridatum.co",
    INQUIRIES: {
      async get(k) {
        return data.get(k) || null;
      },
      async put(k, v) {
        data.set(k, v);
        events.push(["put", k]);
      },
      async list({ prefix }) {
        return {
          keys: [...data.keys()]
            .filter((k) => k.startsWith(prefix))
            .map((name) => ({ name })),
        };
      },
      async delete(k) {
        data.delete(k);
      },
    },
  };
  if (send)
    env.INQUIRY_EMAIL = {
      async send(message) {
        events.push(["send"]);
        outbox.push(message);
        return { messageId: "mock-message-id" };
      },
    };
  const request = (b = payload) =>
    new Request("https://tridatum.co/api/inquiry", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "192.0.2.10",
      },
      body: JSON.stringify(b),
    });
  const records = () =>
    [...data.entries()]
      .filter(([k]) => k.startsWith("inq:"))
      .map(([, v]) => JSON.parse(v));
  return { env, data, outbox, events, request, records };
}
test("saves before notifying the fixed mailbox and sets the visitor as Reply-To", async () => {
  const f = fixture();
  const response = await worker.fetch(
    f.request({ ...payload, to: "untrusted@example.net", org: "가상\r\n기관" }),
    f.env,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(f.outbox.length, 1);
  assert.equal(f.outbox[0].to, "contact@tridatum.co");
  assert.equal(f.outbox[0].from.email, "website@notify.tridatum.co");
  assert.equal(f.outbox[0].replyTo, payload.email);
  assert(!/[\r\n]/.test(f.outbox[0].subject));
  assert(f.outbox[0].text.includes(payload.msg));
  assert(
    f.events.findIndex((e) => e[0] === "put" && e[1].startsWith("inq:")) <
      f.events.findIndex((e) => e[0] === "send"),
  );
  assert.equal(f.records()[0].notification.status, "accepted");
});
test("missing mail setup still retains an inquiry and exposes configuration only to admin", async () => {
  const f = fixture(false);
  const response = await worker.fetch(f.request(), f.env);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert(!("notification" in body));
  assert.equal(f.records()[0].notification.status, "not_configured");
  assert.equal(
    (await (await listInquiries(f.env)).json()).notifications.configured,
    false,
  );
});
test("mail rejection retains the inquiry and does not leak provider errors to the visitor", async () => {
  const f = fixture();
  f.env.INQUIRY_EMAIL.send = async () => {
    throw Object.assign(new Error("private provider detail"), {
      code: "E_SENDER_NOT_VERIFIED",
    });
  };
  const response = await worker.fetch(f.request(), f.env);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert(!body.includes("private"));
  assert.equal(f.records().length, 1);
  assert.equal(f.records()[0].notification.code, "E_SENDER_NOT_VERIFIED");
});
test("failed persistence never sends email or reports successful submission", async () => {
  const f = fixture();
  const put = f.env.INQUIRIES.put;
  f.env.INQUIRIES.put = async (k, v) => {
    if (k.startsWith("inq:")) throw new Error("storage unavailable");
    return put(k, v);
  };
  const response = await worker.fetch(f.request(), f.env);
  assert.equal(response.status, 500);
  assert.equal(f.outbox.length, 0);
});
test("invalid email, absent consent and bot submissions do not send notifications", async () => {
  const f = fixture();
  for (const b of [
    { ...payload, email: "visitor\r\n@example.com" },
    { ...payload, agree: undefined },
  ])
    assert.equal((await worker.fetch(f.request(b), f.env)).status, 400);
  assert.equal(
    (await worker.fetch(f.request({ ...payload, website: "spam" }), f.env))
      .status,
    200,
  );
  assert.equal(f.outbox.length, 0);
  assert.equal(f.records().length, 0);
});
test("the sixth hourly inquiry is rejected before saving or sending", async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++)
    assert.equal((await worker.fetch(f.request(), f.env)).status, 200);
  assert.equal((await worker.fetch(f.request(), f.env)).status, 429);
  assert.equal(f.outbox.length, 5);
  assert.equal(f.records().length, 5);
});
test("legacy inquiries can be notified by admin and accepted requests are not sent again", async () => {
  const f = fixture();
  const id = "inq:1:abcd";
  await f.env.INQUIRIES.put(
    id,
    JSON.stringify({ ...payload, id, at: "2026-09-08T00:00:00Z" }),
  );
  const unauth = await worker.fetch(
    new Request(`https://tridatum.co/api/admin/inquiries/${id}/notify`, {
      method: "POST",
    }),
    f.env,
  );
  assert.equal(unauth.status, 401);
  assert.equal(f.outbox.length, 0);
  assert.equal((await notifyInquiry(id, f.env)).status, 200);
  assert.equal(f.outbox.length, 1);
  assert.equal((await notifyInquiry(id, f.env)).status, 200);
  assert.equal(f.outbox.length, 1);
});
test("uncertain in-flight requests cannot be retried blindly", async () => {
  const f = fixture();
  const id = "inq:1:abcd";
  await f.env.INQUIRIES.put(
    id,
    JSON.stringify({ ...payload, id, notification: { status: "pending" } }),
  );
  assert.equal((await notifyInquiry(id, f.env)).status, 409);
  assert.equal(f.outbox.length, 0);
  assert.equal((await notifyInquiry(id, fixture(false).env)).status, 503);
});
const client = readFileSync(
  new URL("../assets/js/inquiry.js", import.meta.url),
  "utf8",
);
async function submitClient(response) {
  let submit,
    resets = 0;
  const status = { textContent: "" },
    button = { disabled: false };
  const form = {
    querySelector: () => button,
    addEventListener: (_, fn) => {
      submit = fn;
    },
    reset: () => resets++,
  };
  runInNewContext(client, {
    window: { location: { hostname: "tridatum.co" } },
    document: { getElementById: (id) => (id === "iform" ? form : status) },
    FormData: class {
      entries() {
        return Object.entries(payload);
      }
    },
    fetch: async () => response,
  });
  await submit({ preventDefault() {} });
  return { resets, status: status.textContent, disabled: button.disabled };
}
test("the form keeps input when a static HTML page or unconfirmed JSON is returned", async () => {
  for (const response of [
    new Response("<html>fallback</html>"),
    new Response("{}", { headers: { "content-type": "application/json" } }),
  ]) {
    const result = await submitClient(response);
    assert.equal(result.resets, 0);
    assert(result.status.includes("접수 확인"));
    assert.equal(result.disabled, false);
  }
  const result = await submitClient(
    new Response('{"ok":true,"id":"inq:test"}'),
  );
  assert.equal(result.resets, 1);
  assert(result.status.includes("접수되었습니다"));
});

test("the GitHub Pages contact mirror opens the official form before accepting data", () => {
  let destination;
  runInNewContext(client, {
    window: {
      location: {
        hostname: "gyuhyeon-eom.github.io",
        replace(url) {
          destination = url;
        },
      },
    },
    document: {
      getElementById() {
        throw new Error("mirror form must not accept inquiries");
      },
    },
    fetch() {
      throw new Error("mirror must not send to an absent API");
    },
  });
  assert.equal(destination, "https://tridatum.co/contact");
});
