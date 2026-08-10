// 스크롤 리빌 엔진 — 페이드 · 스태거 · 매니페스토 라인 · 숫자 카운트업
// prefers-reduced-motion 설정 시 모든 동작을 건너뛰고 최종 상태로 표시합니다.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 히어로 텍스트 리빌 (로드 직후 1회) */
  const hero = document.querySelector('.hero');
  if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('go')));

  /* 스태거: data-stagger 컨테이너의 .fade 자식에 순차 지연 부여 */
  document.querySelectorAll('[data-stagger]').forEach(c => {
    [...c.querySelectorAll(':scope > .fade')].forEach((el, i) => {
      el.style.setProperty('--d', (i * 90) + 'ms');
    });
  });

  /* 기본 페이드 인 */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade').forEach(el => io.observe(el));

  /* 패널 안 차트·바·도넛은 각 요소가 화면에 들어올 때 개별 발동 */
  const aio = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('anim'); aio.unobserve(e.target); }
    }
  }, { threshold: 0.35 });
  document.querySelectorAll('svg.sweep, .hbar, .donut').forEach(el => aio.observe(el));

  /* 매니페스토: 줄이 화면 78% 지점에서 45% 지점으로 올라오는 동안 서서히 진해짐 (--p: 0→1) */
  const lines = [...document.querySelectorAll('.manifesto p')];
  if (lines.length && !reduce) {
    /* 기본: 스크롤 위치 연동(줄이 올라올수록 진해짐). 스크롤 이벤트 후부터만 인라인 값을 쓰므로
       이벤트가 없는 환경에서는 아래 IO 폴백(.on → --p:1)이 대신 동작한다 */
    const lightUp = () => {
      const from = innerHeight * 0.78, to = innerHeight * 0.45;
      lines.forEach(p => {
        const t = Math.min(Math.max((from - p.getBoundingClientRect().top) / (from - to), 0), 1);
        p.style.setProperty('--p', t.toFixed(3));
      });
    };
    addEventListener('scroll', lightUp, { passive: true });
    const lio = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('on'); lio.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -35% 0px' });
    lines.forEach(p => lio.observe(p));
  }

  /* 숫자 카운트업: <span data-count="16.5" data-decimals="1"> */
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const dur = 1400;
    let start;
    function tick(ts) {
      if (start === undefined) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = (target * easeOut(p)).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // rAF가 중단되는 환경(백그라운드 탭 등)에서도 최종값 보장
    setTimeout(() => { el.textContent = target.toFixed(dec); }, dur + 200);
  }
  const cio = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        cio.unobserve(e.target);
        if (reduce) {
          e.target.textContent = parseFloat(e.target.dataset.count)
            .toFixed(parseInt(e.target.dataset.decimals || '0', 10));
        } else countUp(e.target);
      }
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
})();
