// 결과물 쇼케이스 탭 전환 — 슬라이드 표시 + 차트 애니메이션 재생
(() => {
  const tabs = [...document.querySelectorAll('.dt')];
  const slides = [...document.querySelectorAll('.demo-slide')];
  const titleEl = document.getElementById('demo-title');
  const hintEl = document.getElementById('demo-hint');
  if (!tabs.length || !slides.length) return;

  function show(i) {
    tabs.forEach((t, k) => t.classList.toggle('on', k === i));
    slides.forEach((sl, k) => sl.classList.toggle('on', k === i));
    if (titleEl) titleEl.textContent = tabs[i].dataset.title;
    if (hintEl) hintEl.textContent = tabs[i].dataset.hint || '';
    const sl = slides[i];
    // 숨겨져 있던 슬라이드의 리빌 · 차트 애니메이션 재생
    sl.querySelectorAll('.fade').forEach(el => el.classList.add('in'));
    sl.querySelectorAll('svg.sweep, .hbar, .donut').forEach(el => {
      el.classList.remove('anim');
      void el.getBoundingClientRect();
      requestAnimationFrame(() => el.classList.add('anim'));
      setTimeout(() => el.classList.add('anim'), 80); // rAF 미동작 환경 보강
    });
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));

  /* 변형 펼침 토글 */
  document.querySelectorAll('.var-toggle').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.variants').classList.toggle('open'));
  });
})();
