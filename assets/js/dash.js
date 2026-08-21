// 운영 현황 대시보드 데모 인터랙션 — 기간·지역 필터 전환 + 추이 차트 호버 툴팁
(() => {
  const periodBtn = document.getElementById('d-period');
  const regionBtn = document.getElementById('d-region');
  if (!periodBtn || !regionBtn) return;
  const panel = periodBtn.closest('.panel');

  /* 예시 데이터셋 (전부 샘플값) */
  const REGIONS = ['전체 지역', '수도권', '그 외 지역'];
  const DATA = {
    '전체 지역':  { kpi: ['128', '96.2%', '42'], delta: ['+12', '+1.4%p', '+8'], bars: [94, 88, 81, 74], trend: [31,38,37,26,14,10,7,8,13,19,26,35], donut: [148,236,360,496] },
    '수도권':     { kpi: ['74', '97.1%', '18'],  delta: ['+6', '+0.8%p', '+3'],  bars: [91, 84, 77, 70], trend: [22,28,30,20,11,8,6,7,10,15,20,27],  donut: [64,102,155,219] },
    '그 외 지역': { kpi: ['54', '95.4%', '24'],  delta: ['+7', '+1.1%p', '+5'],  bars: [88, 79, 72, 66], trend: [12,16,14,10,6,4,3,4,6,8,11,15],    donut: [84,134,205,277] },
  };
  let region = 0, months = 12;

  /* 추이 차트 요소 */
  const trendBox = [...panel.querySelectorAll('.box')]
    .find(b => b.querySelector('.bt') && b.querySelector('.bt').textContent.includes('월별'));
  trendBox.classList.add('trend-box');
  const svg = trendBox.querySelector('svg');
  const elLine = svg.querySelector('.line');
  const elLate = svg.querySelector('.late');
  const elFill = svg.querySelector('.fill');
  const pop = svg.querySelector('.pop');
  const popDot = pop.querySelector('circle');
  const popTxt = pop.querySelector('text');
  const xLabels = [...svg.querySelectorAll('text')].filter(t => t.textContent.includes('월') && !t.closest('.pop'));

  const X0 = 26, X1 = 292;
  const xy = (vals) => vals.map((v, i) => [
    X0 + (X1 - X0) * i / (vals.length - 1),
    +(100 - v * 2.2).toFixed(1),
  ]);
  const path = pts => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1]).join(' L');

  function render(replay) {
    const d = DATA[REGIONS[region]];
    const vals = months === 12 ? d.trend : d.trend.slice(-6);

    // KPI 3종
    const kpiB = panel.querySelectorAll('.kpi > b');
    const kpiI = panel.querySelectorAll('.kpi .k i');
    d.kpi.forEach((v, i) => { if (kpiB[i]) kpiB[i].textContent = v; });
    d.delta.forEach((v, i) => { if (kpiI[i]) kpiI[i].textContent = v; });

    // 우선순위 바 (width 전환은 CSS transition이 처리)
    panel.querySelectorAll('.hbar .bar i').forEach((el, i) => el.style.setProperty('--w', d.bars[i] + '%'));
    panel.querySelectorAll('.hbar .r b').forEach((el, i) => { el.textContent = d.bars[i]; });

    // 도넛 범례 · 합계
    const lg = panel.querySelectorAll('.donut-lg b');
    d.donut.forEach((v, i) => { if (lg[i]) lg[i].textContent = v.toLocaleString(); });
    const total = d.donut.reduce((a, b) => a + b, 0);
    const center = panel.querySelector('.donut .c b');
    if (center) center.textContent = total.toLocaleString();
    const gs = panel.querySelector('.grade-sum');
    if (gs) gs.querySelectorAll('b')[0].textContent = (d.donut[0] + d.donut[1]).toLocaleString() + '건';

    // 추이 차트 경로 재계산
    const p1 = xy(vals);
    const p2 = xy(vals.map(v => v + 2));
    elLine.setAttribute('d', path(p1));
    elLate.setAttribute('d', path(p2));
    elFill.setAttribute('d', path(p1) + ` L${X1},100 L${X0},100 Z`);
    const last = p1[p1.length - 1];
    popDot.setAttribute('cx', last[0]); popDot.setAttribute('cy', last[1]);
    popTxt.setAttribute('x', last[0] - 4); popTxt.setAttribute('y', Math.max(last[1] + 7, 12));
    popTxt.textContent = `12월 ${vals[vals.length - 1]}건`;
    const startMonth = months === 12 ? 1 : 7;
    if (xLabels[0]) xLabels[0].textContent = startMonth + '월';
    if (xLabels[1]) xLabels[1].textContent = (months === 12 ? 6 : 10) + '월';
    if (xLabels[2]) xLabels[2].textContent = '12월';

    if (replay) {
      svg.classList.remove('anim');
      void svg.getBoundingClientRect();
      requestAnimationFrame(() => svg.classList.add('anim'));
    }
    tipHide();
  }

  periodBtn.addEventListener('click', () => {
    months = months === 12 ? 6 : 12;
    periodBtn.textContent = `최근 ${months}개월 ▾`;
    render(true);
  });
  regionBtn.addEventListener('click', () => {
    region = (region + 1) % REGIONS.length;
    regionBtn.textContent = `${REGIONS[region]} ▾`;
    render(true);
  });
  [periodBtn, regionBtn].forEach(b => b.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
  }));

  /* 호버 툴팁 */
  const tip = document.createElement('div');
  tip.className = 'dash-tip';
  trendBox.appendChild(tip);
  function tipHide() { tip.classList.remove('show'); }
  svg.addEventListener('mousemove', (e) => {
    const r = svg.getBoundingClientRect();
    const sx = 300 / r.width, sy = 118 / r.height;
    const mx = (e.clientX - r.left) * sx;
    const d = DATA[REGIONS[region]];
    const vals = months === 12 ? d.trend : d.trend.slice(-6);
    const n = vals.length;
    const i = Math.min(n - 1, Math.max(0, Math.round((mx - X0) / ((X1 - X0) / (n - 1)))));
    const px = X0 + (X1 - X0) * i / (n - 1);
    const py = 100 - vals[i] * 2.2;
    const month = (months === 12 ? 1 : 7) + i;
    tip.textContent = `${month}월 · 실제 ${vals[i]}건 · 예측 ${vals[i] + 2}건`;
    tip.style.left = (px / sx) + 'px';
    tip.style.top = (py / sy + svg.offsetTop) + 'px';
    tip.classList.add('show');
  });
  svg.addEventListener('mouseleave', tipHide);
})();
