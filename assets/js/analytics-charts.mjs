export const COLORS = ["#2d624e", "#81b6a3", "#579e84", "#aacbbf"];
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const round = (v) => Number(Number(v).toFixed(1));
export const legend = (items) =>
  `<div class="a-legend">${items.map((item, i) => `<span><i style="--series:${item.color || COLORS[i % 4]};${item.dashed ? "border-top:1px dashed currentColor;background:none" : ""}"></i>${esc(item.name || item)}</span>`).join("")}</div>`;
const tx = (x, y, t, anchor = "start", cls = "a-axis") =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(t)}</text>`;
function chart(label, draw, items = []) {
  return `<div class="a-chart">${items.length ? legend(items) : ""}${[
    false,
    true,
  ]
    .map((compact) => {
      const w = compact ? 360 : 560,
        h = compact ? 274 : 278;
      return `<svg class="${compact ? "a-plot-mobile" : "a-plot-desktop"}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(label)}">${draw({ compact, w, h, X: 47, Y: 24, W: w - 66, H: h - 75 })}</svg>`;
    })
    .join("")}<div class="a-tooltip" hidden></div></div>`;
}
function niceStep(value) {
  const power = 10 ** Math.floor(Math.log10(value));
  const choices = [1, 2, 2.5, 5, 10].map((n) => n * power);
  return choices.reduce((a, b) =>
    Math.abs(a - value) < Math.abs(b - value) ? a : b,
  );
}
function grid({ X, Y, W, H }, min, max, unit = "") {
  const y = (v) => Y + H - ((v - min) / (max - min)) * H,
    step = niceStep((max - min) / 4);
  let result = tx(X, 12, unit);
  for (
    let v = Math.ceil(min / step) * step;
    v <= max + step * 0.00001;
    v += step
  ) {
    const value = Number(v.toPrecision(6));
    result += `<line class="a-gridline" x1="${X}" x2="${X + W}" y1="${y(value)}" y2="${y(value)}"/>${tx(X - 9, y(value) + 4, value, "end")}`;
  }
  return result;
}
const interactive = (markup, detail) =>
  `<g tabindex="0" role="img" aria-label="${esc(detail)}" data-tip="${esc(detail)}">${markup}</g>`;
export function lineFigure({
  labels,
  series,
  min = 0,
  max = 100,
  unit = "",
  band = null,
  eventAt = null,
  eventLabel = "시행 이후",
  title = "추이 분석",
}) {
  return chart(
    title,
    (o) => {
      const { compact, X, Y, W, H, h } = o,
        x = (i) => X + (i * W) / (labels.length - 1),
        y = (v) => Y + H - ((v - min) / (max - min)) * H;
      let s = grid(o, min, max, unit);
      if (eventAt !== null)
        s += `<rect x="${x(eventAt)}" y="${Y}" width="${X + W - x(eventAt)}" height="${H}" fill="#2d624e" opacity=".045"/><line x1="${x(eventAt)}" x2="${x(eventAt)}" y1="${Y}" y2="${Y + H}" stroke="#81b6a3" stroke-dasharray="4 4"/>${tx(x(eventAt) + 7, Y + 16, eventLabel)}`;
      if (band)
        s += `<polygon points="${band.high
          .map((v, i) => `${x(i)},${y(v)}`)
          .concat(band.low.map((v, i) => `${x(i)},${y(v)}`).reverse())
          .join(" ")}" fill="${COLORS[0]}" opacity=".12"/>`;
      series.forEach((r, k) => {
        s += `<polyline class="a-line" pathLength="1" points="${r.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" stroke="${r.color || COLORS[k]}" stroke-width="2" stroke-linejoin="round" ${r.dashed ? 'stroke-dasharray="4 3"' : ""}/>`;
      });
      labels.forEach((l, i) => {
        const step = Math.ceil(labels.length / (compact ? 5 : 8));
        if (
          i === labels.length - 1 ||
          (i % step === 0 && i < labels.length - 2)
        )
          s += tx(x(i), Y + H + 24, l, "middle");
        const detail = `${l} · ${series.map((r) => `${r.name} ${round(r.values[i])}${unit}`).join(" / ")}`;
        s += interactive(
          `<rect x="${Math.max(X, x(i) - W / (labels.length - 1) / 2)}" y="${Y + 18}" width="${W / (labels.length - 1)}" height="${H - 18}" fill="transparent"/><circle class="a-data-point" cx="${x(i)}" cy="${y(series[0].values[i])}" r="4" fill="${COLORS[0]}" stroke="#f6f9f8" stroke-width="2"/>`,
          detail,
        );
      });
      return s;
    },
    series
      .map((r) => ({ name: r.name, color: r.color }))
      .concat(
        band ? [{ name: band.name || "사분위 범위", color: "#cbdcd6" }] : [],
      ),
  );
}
export function histogramFigure(
  bins,
  { title = "분포", unit = "", secondary = null, names = ["관측 건수"] } = {},
) {
  const max =
    Math.ceil(Math.max(...bins.map((b) => b.n), ...(secondary || [0])) / 10) *
      10 || 10;
  return chart(
    title,
    (o) => {
      const { X, Y, W, H, compact } = o,
        step = W / bins.length,
        y = (v) => Y + H - (v / max) * H;
      let s = grid(o, 0, max, "건");
      bins.forEach((b, i) => {
        const bw = secondary ? step * 0.33 : step * 0.68,
          x = X + i * step + step * 0.14;
        const shape =
          `<rect class="a-bar" x="${x}" y="${y(b.n)}" width="${bw}" height="${Y + H - y(b.n)}" rx="1.5" fill="${COLORS[0]}"/>` +
          (secondary
            ? `<rect class="a-bar" x="${x + bw + 1}" y="${y(secondary[i])}" width="${bw}" height="${Y + H - y(secondary[i])}" rx="1.5" fill="${COLORS[1]}"/>`
            : "");
        s += interactive(
          shape,
          `${b.label}${unit} · ${names[0]} ${b.n}건${secondary ? ` / ${names[1]} ${secondary[i]}건` : ""}`,
        );
        const tickEvery = compact ? Math.ceil(bins.length / 5) : 1;
        if (i % tickEvery === 0 && bins.length - i >= tickEvery)
          s += tx(X + i * step, Y + H + 24, b.lo ?? b.label, "middle");
      });
      if (bins.at(-1).hi !== undefined)
        s += tx(X + W, Y + H + 24, bins.at(-1).hi, "middle");
      return s + tx(X + W, Y + H + 45, unit, "end");
    },
    names.map((name, i) => ({ name, color: COLORS[i] })),
  );
}
export function prFigure(curves, current, baseline) {
  return chart(
    "정밀도·재현율 곡선 · 모든 후보 모델",
    (o) => {
      const { X, Y, W, H } = o,
        x = (v) => X + v * W,
        y = (v) => Y + H - v * H;
      let s = grid(o, 0, 1, "Precision");
      s += `<path d="M${X} ${y(baseline)}H${X + W}" stroke="#aacbbf" stroke-dasharray="4 4"/>`;
      curves.forEach((c, i) => {
        const points = c.curve.filter(
          (_, j, a) => j % 5 === 0 || j === a.length - 1,
        );
        s += `<polyline points="${points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}" fill="none" stroke="${COLORS[i]}" stroke-width="${i === current.model ? 2.5 : 1.4}" opacity="${i === current.model ? 1 : 0.6}"/>`;
      });
      s += `<path d="M${X} ${y(current.precision)}H${x(current.recall)}V${Y + H}" fill="none" stroke="#81b6a3" stroke-dasharray="3 4"/><circle cx="${x(current.recall)}" cy="${y(current.precision)}" r="5" fill="${COLORS[current.model]}" stroke="#f6f9f8" stroke-width="2"/>`;
      [0, 0.25, 0.5, 0.75, 1].forEach(
        (v) => (s += tx(x(v), Y + H + 23, v, "middle")),
      );
      return s + tx(X + W, Y + H + 44, "Recall", "end");
    },
    curves
      .map((c, i) => ({
        name: `${["Boosting", "Forest", "Logistic"][i]} · AP ${c.ap.toFixed(3)}`,
        color: COLORS[i],
      }))
      .concat([
        {
          name: `기준선 ${(baseline * 100).toFixed(1)}%`,
          color: "#aacbbf",
          dashed: true,
        },
      ]),
  );
}
export function eventFigure(events, level = 95) {
  const lo = Math.floor(Math.min(...events.map((e) => e.lo)) / 2) * 2 - 1,
    hi = Math.ceil(Math.max(...events.map((e) => e.hi)) / 2) * 2 + 1;
  return chart(
    "시점별 집단 간 변화 차이와 불확실성",
    (o) => {
      const { X, Y, W, H } = o,
        x = (i) => X + (i * W) / (events.length - 1),
        y = (v) => Y + H - ((v - lo) / (hi - lo)) * H;
      let s = grid(o, lo, hi, "지수 p");
      s += `<line x1="${X}" x2="${X + W}" y1="${y(0)}" y2="${y(0)}" stroke="#81b6a3" stroke-dasharray="4 4"/><line x1="${x(5.5)}" x2="${x(5.5)}" y1="${Y}" y2="${Y + H}" stroke="#cbdcd6"/>`;
      events.forEach((e, i) => {
        s += interactive(
          `<path d="M${x(i)} ${y(e.lo)}V${y(e.hi)}m-4 0h8m-8 ${y(e.lo) - y(e.hi)}h8" fill="none" stroke="${i < 6 ? "#aacbbf" : COLORS[0]}" stroke-width="1.3"/><circle cx="${x(i)}" cy="${y(e.value)}" r="3.4" fill="${i < 6 ? "#81b6a3" : COLORS[0]}"/>`,
          `${e.label}개월 · 추정치 ${e.value.toFixed(2)} · ${level}% 구간 [${e.lo.toFixed(2)}, ${e.hi.toFixed(2)}]`,
        );
        if (i % 2 === 0 || i === events.length - 1)
          s += tx(x(i), Y + H + 23, e.label, "middle");
      });
      return s + tx(X + W, Y + H + 43, "시행 기준 개월 · −1개월 기준", "end");
    },
    [
      { name: "시점별 변화 차이" },
      { name: `${level}% 부트스트랩 구간`, color: "#aacbbf" },
    ],
  );
}
export function forestFigure(rows, unit = "지수 p") {
  const min = Math.min(0, Math.floor(Math.min(...rows.map((r) => r.lo)))),
    max = Math.ceil(Math.max(...rows.map((r) => r.hi))) + 1;
  return chart("집단별 점 추정치와 구간", (o) => {
    const { X, Y, W, H } = o,
      left = X + 38,
      ww = W - 70,
      x = (v) => left + ((v - min) / (max - min)) * ww;
    let s = "";
    [0, 0.5, 1].forEach((t) => {
      const v = min + t * (max - min);
      s += `<line class="a-gridline" x1="${x(v)}" x2="${x(v)}" y1="${Y}" y2="${Y + H}"/>${tx(x(v), Y + H + 24, round(v), "middle")}`;
    });
    rows.forEach((r, i) => {
      const y = Y + ((i + 0.5) * H) / rows.length;
      s +=
        tx(2, y + 4, r.label) +
        `<path d="M${x(r.lo)} ${y}H${x(r.hi)}m0-5v10m${x(r.lo) - x(r.hi)}-10v10" stroke="${COLORS[0]}" stroke-width="1.4" fill="none"/><circle cx="${x(r.value)}" cy="${y}" r="4" fill="${COLORS[0]}"/>${tx(X + W, y + 4, r.value.toFixed(2), "end")}`;
    });
    return s + tx(X + W, Y + H + 44, unit, "end");
  });
}
export function horizontalFigure(
  rows,
  { title = "항목별 비교", unit = "", max = null } = {},
) {
  const low = Math.min(0, ...rows.map((r) => r.value)),
    high = max || Math.max(...rows.map((r) => r.value)) * 1.1 || 1,
    span = high - low;
  return `<div class="a-horizontal" role="img" aria-label="${esc(title)}">${rows.map((r, i) => `<div><span>${esc(r.label)}</span><div class="a-htrack" style="--zero:${(-low / span) * 100}%"><i style="margin-left:${((Math.min(0, r.value) - low) / span) * 100}%;width:${(Math.abs(r.value) / span) * 100}%;background:${r.color || COLORS[i % 3]}"></i></div><b>${typeof r.display === "string" ? r.display : r.value.toFixed(4)}${unit}</b></div>`).join("")}</div>`;
}
export function calibrationFigure(points) {
  return chart("확률 보정 · 예측 확률과 실제 양성 비율", (o) => {
    const { X, Y, W, H } = o,
      x = (v) => X + v * W,
      y = (v) => Y + H - v * H;
    let s = grid(o, 0, 1, "실제 양성 비율");
    s += `<path d="M${X} ${Y + H} ${X + W} ${Y}" stroke="#aacbbf" stroke-dasharray="4 4"/><polyline points="${points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}" fill="none" stroke="${COLORS[0]}" stroke-width="1.7"/>`;
    points.forEach(
      (p) =>
        (s += interactive(
          `<circle cx="${x(p.x)}" cy="${y(p.y)}" r="${Math.min(7, 3 + Math.sqrt(p.n) / 8)}" fill="${COLORS[0]}" stroke="#f6f9f8"/>`,
          `구간 ${p.bin} · ${p.n}건 · 실제 비율 ${(p.y * 100).toFixed(1)}%`,
        )),
    );
    [0, 0.25, 0.5, 0.75, 1].forEach(
      (v) => (s += tx(x(v), Y + H + 23, v, "middle")),
    );
    return s + tx(X + W, Y + H + 43, "예측 확률", "end");
  });
}
export function heatFigure(
  rows,
  labels,
  title = "관측 현황",
  format = (v) => `${(v * 100).toFixed(1)}%`,
) {
  const ceiling = Math.max(...rows.flatMap((r) => r.values), 0.0001);
  return chart(
    title,
    (o) => {
      const { X, Y, W, H } = o,
        cw = W / labels.length,
        rh = (H - 15) / rows.length;
      let s = "";
      rows.forEach((r, i) => {
        s += tx(0, Y + (i + 0.6) * rh, r.label);
        r.values.forEach(
          (v, j) =>
            (s += interactive(
              `<rect x="${X + j * cw + 2}" y="${Y + i * rh + 2}" width="${cw - 5}" height="${rh - 5}" rx="3" fill="${COLORS[0]}" opacity="${0.12 + (v / ceiling) * 0.85}"/>`,
              `${r.label} · ${labels[j]} · ${format(v)}`,
            )),
        );
      });
      labels.forEach((l, i) => {
        if (labels.length <= 6 || i % 2 === 0 || i === labels.length - 1)
          s += tx(X + (i + 0.5) * cw, Y + H + 13, l, "middle");
      });
      return s;
    },
    [{ name: "낮음 → 높음", color: COLORS[0] }],
  );
}
