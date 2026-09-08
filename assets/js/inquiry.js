// 문의 폼: API의 명시적 접수 확인 후에만 입력을 지운다.
(() => {
  const form = document.getElementById("iform");
  if (!form) return;
  const status = document.getElementById("iform-status");
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    btn.disabled = true;
    status.textContent = "보내는 중…";
    try {
      const r = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(res.error || "접수에 실패했습니다");
      if (res.ok !== true) throw new Error("접수 확인 응답을 받지 못했습니다");
      form.reset();
      status.textContent = "접수되었습니다. 1영업일 내에 회신드리겠습니다.";
    } catch (err) {
      status.textContent = `${err.message} · 급하시면 상단 이메일로 보내 주세요.`;
    } finally {
      btn.disabled = false;
    }
  });
})();
