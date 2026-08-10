// 통합 리빌 엔진 — IntersectionObserver + 스크롤 이벤트 + 폴백 인터벌.
// 어느 하나가 동작하지 않는 환경에서도 나머지가 위치를 검사해 애니메이션을 발동시킨다.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 히어로 텍스트 리빌 (로드 직후 1회) */
  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('go')));
    setTimeout(() => hero.classList.add('go'), 350); // rAF 미동작 환경 대비
  }

  /* 스태거: data-stagger 컨테이너의 .fade 자식에 순차 지연 부여 */
  document.querySelectorAll('[data-stagger]').forEach(c => {
    [...c.querySelectorAll(':scope > .fade')].forEach((el, i) => {
      el.style.setProperty('--d', (i * 90) + 'ms');
    });
  });

  /* 숫자 카운트업 */
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const dur = 1400;
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    let start;
    function tick(ts) {
      if (start === undefined) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = (target * easeOut(p)).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = target.toFixed(dec); }, dur + 200); // rAF 중단 대비 최종값 보장
  }

  /* 발동 대기 목록: {요소, 실행, 발동 기준(뷰포트 높이 비율)} */
  const pend = [];
  document.querySelectorAll('.fade').forEach(el =>
    pend.push({ el, go: () => el.classList.add('in'), m: 0.92 }));
  document.querySelectorAll('svg.sweep, .hbar, .donut').forEach(el =>
    pend.push({ el, go: () => el.classList.add('anim'), m: 0.94 }));
  document.querySelectorAll('[data-count]').forEach(el =>
    pend.push({ el, go: () => countUp(el), m: 0.88 }));

  /* 매니페스토: 줄이 화면 78%→45% 지점을 지나는 동안 서서히 진해짐 */
  const lines = [...document.querySelectorAll('.manifesto p')];

  function check() {
    const ih = innerHeight;
    for (let i = pend.length - 1; i >= 0; i--) {
      const { el, go, m } = pend[i];
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < ih * m) { go(); pend.splice(i, 1); }
    }
    if (!reduce) {
      const from = ih * 0.78, to = ih * 0.45;
      for (let i = lines.length - 1; i >= 0; i--) {
        const t = Math.min(Math.max((from - lines[i].getBoundingClientRect().top) / (from - to), 0), 1);
        lines[i].style.setProperty('--p', t.toFixed(3));
        if (t >= 1) lines.splice(i, 1); // 완전히 켜진 줄은 더 추적하지 않음
      }
    } else {
      lines.length = 0;
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(() => check(), { threshold: [0, 0.25, 0.5, 0.75] });
    pend.forEach(x => io.observe(x.el));
    lines.forEach(p => io.observe(p));
  }
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check, { passive: true });
  const iv = setInterval(() => {
    check();
    if (!pend.length && !lines.length) clearInterval(iv);
  }, 400);
  check();
})();
