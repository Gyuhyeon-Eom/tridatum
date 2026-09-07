// 관리자 페이지에서 수정한 콘텐츠(JSON)를 화면에 반영
// - [data-c="키"] 요소의 텍스트를 assets/content/site.json 값으로 덮어씀
//   (HTML에 이미 같은 문구가 있으므로 JSON을 못 읽어도 화면은 그대로 유지됨)
// - [data-c-href="mailto|tel"] 이면 href도 함께 갱신
(async () => {
  // 헤더 · 푸터 주입(include.js)이 끝난 뒤에 실행 — 푸터 문구도 대상이므로
  if (document.documentElement.dataset.includesReady !== 'true' && document.querySelector('[data-include]')) {
    await new Promise(res => document.addEventListener('includes:done', res, { once: true }));
  }

  // CDN 캐시를 타지 않도록 매번 고유 쿼리로 원본을 읽는다 (수정 즉시 반영)
  const bust = `?t=${Date.now()}`;

  try {
    const site = await (await fetch(`assets/content/site.json${bust}`)).json();
    document.querySelectorAll('[data-c]').forEach(el => {
      const v = site[el.dataset.c];
      if (typeof v !== 'string' || !v) return;
      el.textContent = v;
      if (el.dataset.cHref === 'mailto') el.href = `mailto:${v}`;
      if (el.dataset.cHref === 'tel') el.href = `tel:${v.replace(/[^\d+]/g, '')}`;
    });
    // 연락처처럼 값은 다른 키에 있는데 href만 따라가야 하는 링크
    document.querySelectorAll('[data-c-link]').forEach(el => {
      const v = site[el.dataset.cLink];
      if (typeof v === 'string' && v) el.href = `mailto:${v}`;
    });
  } catch { /* 콘텐츠 파일이 없으면 HTML 원문 유지 */ }
})();
