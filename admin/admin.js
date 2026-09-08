// 관리자 화면 로직 — 모든 요청은 /api/admin/* (워커가 Access JWT를 검증)
(() => {
  const $ = (s) => document.querySelector(s);
  const status = $("#adm-status");

  /* 문구 편집기에 노출할 키와 라벨 (site.json과 짝) */
  const COPY_FIELDS = [
    { key: "hero.lede", label: "메인 히어로 보조 문구", long: true },
    { key: "cta.title", label: "하단 문의 배너 제목" },
    { key: "cta.desc", label: "하단 문의 배너 설명", long: true },
    { key: "contact.person", label: "문의 담당자" },
    { key: "contact.phone", label: "대표 연락처" },
    { key: "contact.email", label: "대표 이메일" },
    { key: "footer.desc", label: "푸터 소개 문구", long: true },
  ];

  let copyData = {};
  let copyWritable = false;

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  async function api(path, opts) {
    const r = await fetch(path, opts);
    if (r.status === 401)
      throw new Error("로그인이 만료되었습니다. 새로고침해 주세요.");
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `요청 실패 (${r.status})`);
    return body;
  }
  const say = (msg) => {
    status.textContent = msg;
  };
  const showError = (selector, message = "") => {
    const box = $(selector);
    box.textContent = message;
    box.style.display = message ? "block" : "none";
  };

  /* 탭 전환 */
  document.querySelectorAll(".adm-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".adm-tabs button")
        .forEach((b) => b.classList.toggle("on", b === btn));
      document
        .querySelectorAll(".pane")
        .forEach((p) =>
          p.classList.toggle("on", p.id === `pane-${btn.dataset.pane}`),
        );
    });
  });

  /* ---------- 문구 ---------- */
  function renderCopy() {
    $("#copy-editor").innerHTML = `<div class="acard">${COPY_FIELDS.map(
      (f) => `
      <label>${f.label}
        ${
          f.long
            ? `<textarea data-k="${f.key}" rows="2" maxlength="500">${esc(copyData[f.key])}</textarea>`
            : `<input data-k="${f.key}" value="${esc(copyData[f.key])}" maxlength="200">`
        }
      </label>`,
    ).join("")}</div>`;
    document.querySelectorAll("#copy-editor [data-k]").forEach((el) => {
      el.disabled = !copyWritable;
    });
    $("#copy-save").disabled = !copyWritable;
  }
  $("#copy-save").addEventListener("click", async () => {
    if (!copyWritable) return;
    document.querySelectorAll("#copy-editor [data-k]").forEach((el) => {
      copyData[el.dataset.k] = el.value.trim();
    });
    try {
      $("#copy-save").disabled = true;
      say("저장 중…");
      await api("/api/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: "site", data: copyData }),
      });
      say("저장되었습니다. 다음 배포 때 홈페이지에 반영됩니다.");
    } catch (err) {
      say(err.message);
    } finally {
      $("#copy-save").disabled = !copyWritable;
    }
  });

  /* ---------- 문의함 ---------- */
  let notifications = { configured: false };
  async function loadInquiries() {
    const reload = $("#inq-reload");
    reload.disabled = true;
    showError("#inq-error");
    try {
      const inq = await api("/api/admin/inquiries");
      if (!Array.isArray(inq.items))
        throw new Error("문의 목록 응답을 확인할 수 없습니다.");
      renderInq(inq.items, inq.notifications);
    } catch (err) {
      showError(
        "#inq-error",
        `문의 목록을 불러오지 못했습니다. ${err.message}`,
      );
    } finally {
      reload.disabled = false;
    }
  }
  $("#inq-reload").addEventListener("click", loadInquiries);
  function renderInq(items, config) {
    if (config) notifications = config;
    $("#inq-mail-status").textContent = notifications.configured
      ? `메일 알림 수신: ${notifications.to} · 각 문의에서 발송 결과를 확인하세요.`
      : "메일 알림 미연결 · 문의는 이 문의함에 저장됩니다. 발송 연결과 Worker 배포가 필요합니다.";
    const mailErrors = {
      E_SENDER_NOT_VERIFIED: "발신 도메인 인증 필요",
      E_SENDER_DOMAIN_NOT_AVAILABLE: "발신 도메인 연결 필요",
      E_RECIPIENT_NOT_ALLOWED: "수신 주소 인증·허용 설정 확인",
      E_RECIPIENT_SUPPRESSED: "수신 주소 차단 상태 확인",
      E_DAILY_LIMIT_EXCEEDED: "일일 발송 한도 초과",
      E_RATE_LIMIT_EXCEEDED: "발송 요청 한도 초과",
    };
    const labels = {
      accepted: "메일 발송 요청 완료",
      failed: "메일 알림 실패",
      not_configured: "메일 알림 미연결",
      pending: "메일 발송 확인 필요",
    };

    $("#inq-list").innerHTML = items.length
      ? items
          .map(
            (q) => `
      <div class="inq">
        <div class="m">
          <b>${esc(q.name)}</b>
          <span>${esc(q.org || "")}</span>
          <span><a href="mailto:${esc(q.email)}">${esc(q.email)}</a></span>
          <span>${esc((q.at || "").slice(0, 16).replace("T", " "))}</span>
          <button class="abtn danger" data-id="${esc(q.id)}" type="button">삭제</button>
        </div>
        <p>${esc(q.msg)}</p>
        <div class="inq-notification">
          <span>${esc(labels[q.notification?.status] || "기존 접수 · 메일 알림 없음")}${q.notification?.code ? " · " + esc(mailErrors[q.notification.code] || q.notification.code) : ""}</span>
          ${!["accepted", "pending"].includes(q.notification?.status) ? `<button class="abtn sub" data-notify-id="${esc(q.id)}" type="button" ${notifications.configured ? "" : "disabled"}>메일 알림 보내기</button>` : ""}
        </div>
      </div>`,
          )
          .join("")
      : '<p class="empty">접수된 문의가 없습니다.</p>';
  }
  $("#inq-list").addEventListener("click", async (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    const notifyId = button.dataset.notifyId;
    const id = notifyId || button.dataset.id;
    if (!id) return;
    if (!notifyId && !confirm("이 문의를 삭제할까요? 되돌릴 수 없습니다."))
      return;
    button.disabled = true;
    try {
      if (notifyId) {
        say("메일 알림 발송 중…");
        await api(`/api/admin/inquiries/${id}/notify`, { method: "POST" });
        say("메일 발송 요청이 완료되었습니다.");
      } else {
        await api(`/api/admin/inquiries/${id}`, { method: "DELETE" });
        say("문의가 삭제되었습니다.");
      }
    } catch (err) {
      say(err.message);
    } finally {
      button.disabled = false;
      await loadInquiries();
    }
  });

  /* ---------- 초기 로드 ---------- */
  async function loadCopy() {
    showError("#copy-error");
    try {
      const site = await api("/api/admin/content?file=site");
      if (
        !site.data ||
        typeof site.data !== "object" ||
        Array.isArray(site.data)
      )
        throw new Error("문구 응답을 확인할 수 없습니다.");
      copyData = site.data;
      copyWritable = !site.readOnly;
      renderCopy();
      if (site.warning)
        showError(
          "#copy-error",
          `${site.warning} 현재 문구는 읽기 전용이며, 문의함은 계속 사용할 수 있습니다.`,
        );
    } catch (err) {
      showError(
        "#copy-error",
        `문구를 불러오지 못했습니다. ${err.message} 문의함은 별도로 사용할 수 있습니다.`,
      );
    }
  }
  (async () => {
    try {
      const me = await api("/api/admin/me");
      $("#adm-who").textContent = me.email;
      // Each pane renders as soon as its own request finishes.
      await Promise.allSettled([loadCopy(), loadInquiries()]);
    } catch (err) {
      showError(
        "#adm-error",
        `로그인 상태를 확인하지 못했습니다. ${err.message}`,
      );
    }
  })();
})();
