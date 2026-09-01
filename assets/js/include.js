// 공용 헤더 · 푸터 주입 + 현재 페이지 내비 표시
// 사용법: <div data-include="partials/header.html"></div> + <body data-page="home">
(async () => {
  const mounts = document.querySelectorAll('[data-include]');
  await Promise.all([...mounts].map(async (el) => {
    // 헤더 · 푸터가 옛 캐시로 주입되지 않도록 항상 서버와 재검증
    const res = await fetch(el.dataset.include, { cache: 'no-cache' });
    if (res.ok) el.outerHTML = await res.text();
  }));
  const page = document.body.dataset.page;
  if (page) document.querySelector(`[data-nav="${page}"]`)?.classList.add('active');

  // 모바일 햄버거 토글
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    const header = toggle.closest('header');
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    header.querySelectorAll('nav.menu a').forEach(a =>
      a.addEventListener('click', () => header.classList.remove('open')));
  }

  document.dispatchEvent(new CustomEvent('includes:done'));
})();
