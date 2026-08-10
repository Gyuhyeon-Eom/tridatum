// 공용 헤더 · 푸터 주입 + 현재 페이지 내비 표시
// 사용법: <div data-include="partials/header.html"></div> + <body data-page="home">
(async () => {
  const mounts = document.querySelectorAll('[data-include]');
  await Promise.all([...mounts].map(async (el) => {
    const res = await fetch(el.dataset.include);
    if (res.ok) el.outerHTML = await res.text();
  }));
  const page = document.body.dataset.page;
  if (page) document.querySelector(`[data-nav="${page}"]`)?.classList.add('active');
})();
