const RECIPIENT = "contact@tridatum.co";
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
const line = (value, max) =>
  String(value || "")
    .replace(/[\r\n\x00-\x1f\x7f]/g, " ")
    .trim()
    .slice(0, max);
export function mailConfiguration(env) {
  const from = env.INQUIRY_FROM || "";
  return {
    configured:
      typeof env.INQUIRY_EMAIL?.send === "function" && emailPattern.test(from),
    from,
    to: RECIPIENT,
  };
}
async function dispatch(record, env) {
  const config = mailConfiguration(env);
  if (!config.configured) return record;
  try {
    const result = await env.INQUIRY_EMAIL.send({
      from: { email: config.from, name: "Tridatum 홈페이지" },
      to: RECIPIENT,
      replyTo: record.email,
      subject: `[Tridatum 문의] ${line(record.name, 80)}${record.org ? " · " + line(record.org, 120) : ""}`,
      text: [
        "홈페이지에 새 문의가 접수되었습니다.",
        "",
        `이름: ${record.name}`,
        `소속: ${record.org || "미입력"}`,
        `회신 이메일: ${record.email}`,
        `접수 시각: ${record.at}`,
        `접수 번호: ${record.id}`,
        "",
        record.msg,
        "",
        "관리자 문의함: https://tridatum.co/admin/",
      ].join("\n"),
    });
    record.notification = {
      status: "accepted",
      at: new Date().toISOString(),
      messageId: result?.messageId || null,
    };
  } catch (error) {
    // Provider details and inquiry text must not leak into the public response.
    record.notification = {
      status: "failed",
      at: new Date().toISOString(),
      code: line(error.code || "SEND_FAILED", 80),
    };
  }
  try {
    await env.INQUIRIES.put(record.id, JSON.stringify(record));
  } catch {
    // The inquiry was already saved. Do not turn a status-write error into a
    // public submission failure that encourages duplicate enquiries/emails.
    console.error(
      "inquiry_notification_status_write_failed",
      record.id,
      record.notification.status,
    );
  }
  return record;
}
export async function postInquiry(req, env) {
  const b = await req.json().catch(() => ({}));
  if (!b || typeof b !== "object")
    return json({ error: "잘못된 요청입니다" }, 400);
  if (b.website) return json({ ok: true });
  const name = line(b.name, 80),
    org = line(b.org, 120);
  const email = String(b.email || "").trim();
  const msg = String(b.msg || "")
    .trim()
    .slice(0, 4000);
  if (!name || !email || !msg)
    return json({ error: "이름 · 이메일 · 내용은 필수입니다" }, 400);
  if (email.length > 120 || !emailPattern.test(email))
    return json({ error: "올바른 이메일 주소를 입력해 주세요" }, 400);
  if (b.agree !== "on" && b.agree !== true)
    return json({ error: "개인정보 수집 · 이용 동의가 필요합니다" }, 400);
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  const rlKey = `rl:${ip}`,
    count = parseInt((await env.INQUIRIES.get(rlKey)) || "0", 10);
  if (count >= 5) return json({ error: "잠시 후 다시 시도해 주세요" }, 429);
  await env.INQUIRIES.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  const id = `inq:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
  const record = {
    id,
    name,
    email,
    org,
    msg,
    agree: true,
    at: new Date().toISOString(),
    notification: {
      status: mailConfiguration(env).configured ? "pending" : "not_configured",
      at: new Date().toISOString(),
    },
  };
  // Persist the inquiry before calling the email provider.
  await env.INQUIRIES.put(id, JSON.stringify(record));
  await dispatch(record, env);
  return json({ ok: true, id });
}
export async function listInquiries(env) {
  const { keys } = await env.INQUIRIES.list({ prefix: "inq:", limit: 500 });
  const items = (
    await Promise.all(
      keys.map(async (k) => {
        const value = await env.INQUIRIES.get(k.name);
        return value ? JSON.parse(value) : null;
      }),
    )
  ).filter(Boolean);
  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return json({ items, notifications: mailConfiguration(env) });
}
export async function notifyInquiry(id, env) {
  if (!mailConfiguration(env).configured)
    return json({ error: "메일 발송 연결이 설정되지 않았습니다" }, 503);
  const value = await env.INQUIRIES.get(id);
  if (!value) return json({ error: "문의를 찾을 수 없습니다" }, 404);
  const record = JSON.parse(value);
  if (record.notification?.status === "accepted")
    return json({ ok: true, notification: record.notification });
  if (record.notification?.status === "pending")
    return json(
      { error: "발송 처리 상태를 Cloudflare 메일 로그에서 먼저 확인해 주세요" },
      409,
    );
  if (!emailPattern.test(record.email))
    return json({ error: "문의에 저장된 이메일 형식을 확인해 주세요" }, 400);
  record.notification = { status: "pending", at: new Date().toISOString() };
  await env.INQUIRIES.put(id, JSON.stringify(record));
  await dispatch(record, env);
  if (record.notification.status !== "accepted")
    return json(
      {
        error:
          "메일 알림 발송에 실패했습니다. 관리자 문의함에 문의는 보관되어 있습니다.",
        notification: record.notification,
      },
      502,
    );
  return json({ ok: true, notification: record.notification });
}
