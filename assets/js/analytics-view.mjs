// Shared, deterministic sample views. Used in the browser and to render static HTML.
// Every record below is fictional; no client data or production measurements.
export const COLORS = ["#49786d", "#8b9db2", "#b39673", "#a0b19b"];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => Number(n).toLocaleString("en-US");
const sum = (a) => a.reduce((s, n) => s + n, 0);
const pct = (n) => `${(n * 100).toFixed(1)}%`;
const options = (values, current) =>
  values
    .map(
      ([v, l]) =>
        `<option value="${v}" ${String(current) === String(v) ? "selected" : ""}>${l}</option>`,
    )
    .join("");
const select = (key, label, values, current) =>
  `<label class="a-control"><span>${label}</span><select data-control="${key}">${options(values, current)}</select></label>`;
const badge = (label, tone = "") =>
  `<span class="a-badge ${tone}">${label}</span>`;
const mark =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 11 18 3v11L3 22Zm18-8 15 8v11l-15-8ZM14 20l5.5-3 5.5 3v14l-5.5 3-5.5-3Z" fill="currentColor"/></svg>';
const legend = (names) =>
  `<div class="a-legend">${names.map((n, i) => `<span><i style="--series:${COLORS[i]}"></i>${n}</span>`).join("")}</div>`;
const spark = (values, color = COLORS[0]) => {
  const min = Math.min(...values) * 0.9,
    max = Math.max(...values) * 1.05;
  const points = values
    .map(
      (v, i) =>
        `${(i * 72) / (values.length - 1)},${24 - ((v - min) / (max - min)) * 22}`,
    )
    .join(" ");
  return `<svg class="a-spark" viewBox="0 0 74 26" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
};
const kpi = (label, value, note, values, unit = "") =>
  `<div class="a-metric"><span class="a-metric-label">${label}</span><strong>${value}<small>${unit}</small></strong><div class="a-metric-foot"><span>${note}</span>${values ? spark(values) : ""}</div></div>`;
const panel = (title, meta, content, cls = "") =>
  `<section class="a-panel ${cls}"><header class="a-panel-head"><h4>${title}</h4><span>${meta}</span></header>${content}</section>`;
const table = (caption, heads, rows) =>
  `<div class="a-table-scroll" tabindex="0" role="region" aria-label="${caption}"><table class="a-table"><caption class="a-sr">${caption}</caption><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
const bars = (labels, values, unit = "", max = Math.max(...values)) =>
  `<div class="a-bars">${labels.map((l, i) => `<div><span>${l}</span><div class="a-track"><i style="--bar:${(values[i] / max) * 100}%;--series:${COLORS[i % 4]}"></i></div><b>${values[i]}${unit}</b></div>`).join("")}</div>`;

export function lineChart({
  labels,
  series,
  max = 100,
  min = 0,
  unit = "",
  annotation = null,
  band = null,
  label = "추이 차트",
  xLabel = "",
  compact = false,
}) {
  const X = 44,
    Y = 22,
    W = compact ? 254 : 478,
    H = 158,
    B = Y + H;
  const x = (i) => X + (i * W) / (labels.length - 1),
    y = (v) => B - ((v - min) / (max - min)) * H;
  let content = "";
  for (let i = 0; i <= 4; i++) {
    const value = min + ((max - min) * i) / 4,
      yy = y(value);
    content += `<line class="a-gridline" x1="${X}" y1="${yy}" x2="${X + W}" y2="${yy}"/><text class="a-axis" x="${X - 9}" y="${yy + 4}" text-anchor="end">${Number(value.toFixed(1))}</text>`;
  }
  if (annotation) {
    const xx = x(annotation.index);
    content += `<rect x="${xx}" y="${Y}" width="${X + W - xx}" height="${H}" fill="#49786d" opacity=".035"/><line x1="${xx}" y1="${Y}" x2="${xx}" y2="${B}" stroke="#95aaa0" stroke-dasharray="3 4"/><text class="a-axis" x="${xx + 6}" y="${Y + 10}">${annotation.label}</text>`;
  }
  if (band) {
    content += `<polygon points="${band.high
      .map((v, i) => `${x(i)},${y(v)}`)
      .concat(band.low.map((v, i) => `${x(i)},${y(v)}`).reverse())
      .join(" ")}" fill="${COLORS[0]}" opacity=".1"/>`;
  }
  series.forEach((s, k) => {
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    if (k === 0 && !band)
      content += `<polygon points="${X},${B} ${pts} ${x(labels.length - 1)},${B}" fill="${COLORS[0]}" opacity=".04"/>`;
    content += `<polyline class="a-line" pathLength="1" points="${pts}" fill="none" stroke="${COLORS[k]}" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round" ${s.dashed ? 'stroke-dasharray="5 5"' : ""}/>`;
  });
  labels.forEach((l, i) => {
    const step = compact
      ? labels.length > 6
        ? 3
        : 2
      : labels.length > 7
        ? 2
        : 1;
    if (
      i === labels.length - 1 ||
      (i % step === 0 && (step === 1 || i < labels.length - 2))
    )
      content += `<text class="a-axis" x="${x(i)}" y="${B + 23}" text-anchor="middle">${l}</text>`;
    const detail = `${l} · ${series.map((s) => `${s.name} ${s.values[i]}${unit}`).join(" / ")}`;
    content += `<g tabindex="0" role="img" aria-label="${esc(detail)}" data-tip="${esc(detail)}"><rect x="${x(i) - W / (labels.length - 1) / 2}" y="${Y + 14}" width="${W / (labels.length - 1)}" height="${H - 14}" fill="transparent"/><circle class="a-data-point" cx="${x(i)}" cy="${y(series[0].values[i])}" r="3.4" fill="${COLORS[0]}" stroke="#f9faf6" stroke-width="2"/></g>`;
  });
  const plot = `<svg class="${compact ? "a-plot-mobile" : "a-plot-desktop"}" viewBox="0 0 ${compact ? 320 : 550} 230" role="group" aria-label="${label}"><text class="a-axis" x="${X}" y="11">${unit}</text>${content}<text class="a-axis" x="${X + W}" y="225" text-anchor="end">${xLabel}</text></svg>`;
  if (compact) return plot;
  return `<div class="a-chart">${legend(series.map((s) => s.name))}${plot}${lineChart({ labels, series, max, min, unit, annotation, band, label, xLabel, compact: true })}<div class="a-tooltip" hidden></div></div>`;
}

export const OP_REGIONS = [
  {
    name: "북부 권역",
    received: [128, 142, 139, 160, 151, 173, 183, 179, 196, 201, 216, 228],
    done: [115, 130, 132, 151, 144, 165, 169, 168, 185, 190, 204, 215],
  },
  {
    name: "중부 권역",
    received: [112, 118, 125, 127, 139, 131, 150, 162, 168, 178, 183, 192],
    done: [99, 108, 114, 121, 130, 122, 142, 151, 159, 166, 174, 183],
  },
  {
    name: "남부 권역",
    received: [83, 96, 103, 98, 108, 118, 127, 132, 141, 153, 156, 171],
    done: [73, 89, 96, 91, 101, 110, 118, 124, 131, 143, 148, 159],
  },
];
export function operationData(state = {}) {
  const period = Number(state.period) || 12,
    region = Number(state.region ?? -1);
  const rows = OP_REGIONS.filter((_, i) => region < 0 || i === region).map(
    (r) => ({
      ...r,
      received: r.received.slice(-period),
      done: r.done.slice(-period),
    }),
  );
  const received = Array.from({ length: period }, (_, i) =>
      sum(rows.map((r) => r.received[i])),
    ),
    done = received.map((_, i) => sum(rows.map((r) => r.done[i])));
  return {
    period,
    region,
    rows,
    received,
    done,
    total: sum(received),
    complete: sum(done),
    pending: sum(received) - sum(done),
    labels: Array.from({ length: period }, (_, i) => `${13 - period + i}월`),
  };
}
function operation(state) {
  const d = operationData(state);
  const filters =
    select(
      "region",
      "권역",
      [[-1, "전체 권역"], ...OP_REGIONS.map((r, i) => [i, r.name])],
      d.region,
    ) +
    select(
      "period",
      "조회 기간",
      [
        [12, "2026년 전체"],
        [6, "2026년 하반기"],
      ],
      d.period,
    );
  const metrics =
    kpi("접수 건수", fmt(d.total), "선택 기간 누적", d.received, "건") +
    kpi(
      "처리 완료",
      fmt(d.complete),
      `처리율 ${pct(d.complete / d.total)}`,
      d.done,
      "건",
    ) +
    kpi("검토 대기", fmt(d.pending), "접수 건수 − 처리 완료", null, "건") +
    kpi("연결 데이터", "4", "모든 수집 경로 정상", null, "개");
  const stage = [Math.round(d.pending * 0.48), Math.round(d.pending * 0.32)];
  stage.push(d.pending - sum(stage));
  const body = `<div class="a-metrics">${metrics}</div><div class="a-grid-main">${panel(
    "접수 및 처리 추이",
    "월 단위 · 건",
    lineChart({
      labels: d.labels,
      series: [
        { name: "접수", values: d.received },
        { name: "처리 완료", values: d.done },
      ],
      max: Math.ceil(Math.max(...d.received) / 100) * 100,
      unit: "건",
      label: "월별 접수 및 처리 완료 건수",
    }),
  )}${panel("검토 대기 현황", `${fmt(d.pending)}건`, bars(["내용 확인", "담당자 검토", "보완 요청"], stage, "", d.pending) + `<div class="a-note"><i></i><p>검토가 필요한 항목을<br>단계별로 확인합니다.</p></div>`)}</div>${panel(
    "권역별 처리 현황",
    `${d.rows.length}개 권역`,
    table(
      "권역별 접수와 처리율",
      ["권역", "접수", "완료", "대기", "처리율"],
      d.rows.map((r) => {
        const n = sum(r.received),
          c = sum(r.done);
        return [
          r.name,
          fmt(n),
          fmt(c),
          fmt(n - c),
          `<span class="a-inline-meter"><i style="width:${(c / n) * 100}%"></i></span>${pct(c / n)}`,
        ];
      }),
    ),
  )}`;
  return shell(
    0,
    "운영 현황",
    "업무의 흐름을 한눈에 확인합니다.",
    filters,
    body,
    "2026.12.31 기준 · 예시 데이터",
  );
}

export const MODELS = [
  "Gradient Boosting",
  "Random Forest",
  "Logistic Regression",
];
export function modelMetrics(model = 0, threshold = 50) {
  const t = Math.min(100, Math.max(0, Number(threshold))),
    m = Math.min(2, Math.max(0, Number(model)));
  // Two synthetic score distributions (500 positives / 500 negatives).
  // The same threshold counts drive the PR curve and confusion matrix.
  const score = t / 100;
  const tp = Math.round(500 * (1 - score ** (1.8 - m * 0.2))),
    fp = Math.round(500 * (1 - score) ** (3 - m * 0.35)),
    fn = 500 - tp,
    tn = 500 - fp;
  const precision = tp + fp ? tp / (tp + fp) : 1,
    recall = tp / (tp + fn),
    f1 = (2 * tp) / (2 * tp + fp + fn);
  return { tp, fp, fn, tn, precision, recall, f1, threshold: t, model: m };
}
function prPlot(d, compact = false) {
  const curve = Array.from({ length: 21 }, (_, i) =>
    modelMetrics(d.model, 100 - i * 5),
  );
  const x = (v) => 44 + v * (compact ? 254 : 470),
    y = (v) => 191 - v * 160;
  const detail = `현재 임계값 ${(d.threshold / 100).toFixed(2)} · 정밀도 ${d.precision.toFixed(3)} · 재현율 ${d.recall.toFixed(3)}`;
  const plot = `<svg class="${compact ? "a-plot-mobile" : "a-plot-desktop"}" viewBox="0 0 ${compact ? 320 : 550} 230" role="img" aria-label="${detail}">${[0, 0.25, 0.5, 0.75, 1].map((v) => `<line class="a-gridline" x1="44" x2="${x(1)}" y1="${y(v)}" y2="${y(v)}"/><text class="a-axis" x="34" y="${y(v) + 4}" text-anchor="end">${v}</text><text class="a-axis" x="${x(v)}" y="213" text-anchor="middle">${v}</text>`).join("")}<text class="a-axis" x="44" y="15">Precision</text><text class="a-axis" x="${x(1)}" y="228" text-anchor="end">Recall</text><polyline class="a-line" pathLength="1" points="${curve.map((m) => `${x(m.recall)},${y(m.precision)}`).join(" ")}" stroke="${COLORS[0]}" stroke-width="2.4" fill="none"/><path d="M44 ${y(d.precision)}H${x(d.recall)}V191" fill="none" stroke="#b6c7bd" stroke-dasharray="4 4"/><circle cx="${x(d.recall)}" cy="${y(d.precision)}" r="7" fill="${COLORS[0]}" stroke="#f9faf6" stroke-width="3"/><text x="${x(d.recall) - 12}" y="${y(d.precision) - 15}" text-anchor="end" class="a-axis">threshold ${(d.threshold / 100).toFixed(2)}</text></svg>`;
  return compact
    ? plot
    : `<div class="a-chart">${legend([MODELS[d.model], "현재 임계값"])}${plot}${prPlot(d, true)}</div>`;
}
function model(state) {
  const d = modelMetrics(state.model ?? 0, state.threshold ?? 50);
  const filters = select(
    "model",
    "모델",
    MODELS.map((m, i) => [i, m]),
    d.model,
  );
  const metrics =
    kpi("Precision", d.precision.toFixed(3), "정밀도 · TP / (TP + FP)") +
    kpi("Recall", d.recall.toFixed(3), "재현율 · TP / (TP + FN)") +
    kpi("F1 score", d.f1.toFixed(3), "정밀도와 재현율의 조화평균") +
    kpi("검증 데이터", "1,000", "양성 500 · 음성 500", "", "건");
  const matrix = `<div class="a-matrix"><span></span><span>예측 음성</span><span>예측 양성</span><span>실제 음성</span><div class="a-cell-good"><b>${d.tn}</b><small>TN</small></div><div class="a-cell-warn"><b>${d.fp}</b><small>FP</small></div><span>실제 양성</span><div class="a-cell-warn"><b>${d.fn}</b><small>FN</small></div><div class="a-cell-good"><b>${d.tp}</b><small>TP</small></div></div>`;
  const range = `<label class="a-threshold"><span>분류 임계값 <output>${(d.threshold / 100).toFixed(2)}</output></span><input type="range" data-control="threshold" min="20" max="85" step="5" value="${d.threshold}" aria-label="분류 임계값"><small>재현율 우선 <span>정밀도 우선</span></small></label>`;
  const body = `<div class="a-metrics">${metrics}</div><div class="a-grid-main">${panel("정밀도 · 재현율", "임계값별 비교", prPlot(d) + range)}${panel("혼동 행렬", "건수", matrix + `<p class="a-panel-note">오탐과 누락을 함께 비교합니다.</p>`)}</div>${panel(
    "모델 비교",
    `동일 검증 데이터 · 임계값 ${(d.threshold / 100).toFixed(2)}`,
    table(
      "모델별 정밀도, 재현율 및 F1 비교",
      ["모델", "Precision", "Recall", "F1 score", "선택"],
      MODELS.map((name, i) => {
        let m = modelMetrics(i, d.threshold);
        return [
          name,
          m.precision.toFixed(3),
          m.recall.toFixed(3),
          m.f1.toFixed(3),
          i === d.model ? badge("선택 모델") : "",
        ];
      }),
    ),
  )}`;
  return shell(
    1,
    "모델 검증",
    "수치와 오류 유형을 함께 비교합니다.",
    filters,
    body,
    "검증 데이터 v1.2 · 예시 데이터",
  );
}

export function policyData(segment = 0) {
  const offset = Number(segment) * 2;
  const control = [99, 101, 100, 102, 103, 104, 105, 106],
    treated = [
      100,
      102,
      101,
      103,
      107 + offset,
      111 + offset,
      116 + offset,
      119 + offset,
    ];
  const beforeT = sum(treated.slice(0, 4)) / 4,
    beforeC = sum(control.slice(0, 4)) / 4,
    afterT = sum(treated.slice(4)) / 4,
    afterC = sum(control.slice(4)) / 4;
  return {
    control,
    treated,
    beforeT,
    beforeC,
    afterT,
    afterC,
    effect: afterT - beforeT - (afterC - beforeC),
  };
}
function policy(state) {
  const s = Number(state.segment) || 0,
    d = policyData(s);
  const metrics =
    kpi(
      "집단 간 변화 차이",
      `+${d.effect.toFixed(1)}`,
      "시행 전후 평균 변화의 차이",
      null,
      "p",
    ) +
    kpi(
      "참여 집단 변화",
      `+${(d.afterT - d.beforeT).toFixed(1)}`,
      "시행 후 평균 − 시행 전 평균",
      d.treated,
      "p",
    ) +
    kpi(
      "비교 집단 변화",
      `+${(d.afterC - d.beforeC).toFixed(1)}`,
      "시행 후 평균 − 시행 전 평균",
      d.control,
      "p",
    ) +
    kpi("분석 구간", "8", "시행 전 4개월 · 시행 후 4개월", null, "개월");
  const chart = lineChart({
    labels: [
      "−4개월",
      "−3개월",
      "−2개월",
      "−1개월",
      "+1개월",
      "+2개월",
      "+3개월",
      "+4개월",
    ],
    series: [
      { name: "참여 집단", values: d.treated },
      { name: "비교 집단", values: d.control },
    ],
    min: 90,
    max: 130,
    unit: "지수",
    annotation: { index: 3.5, label: "시행 시점" },
    label: "참여 집단과 비교 집단의 시행 전후 지수 추이",
  });
  const dots = `<div class="a-effect"><span>시행 전후 변화 비교</span><strong>+${d.effect.toFixed(1)}<small>p</small></strong><div class="a-effect-formula"><span>참여 집단 <b>+${(d.afterT - d.beforeT).toFixed(1)}</b></span><span>비교 집단 <b>+${(d.afterC - d.beforeC).toFixed(1)}</b></span></div><p>집단 간 변화 차이를 표시한 예시입니다. 인과효과 판단에는 별도의 가정 검증이 필요합니다.</p></div>`;
  const body = `<div class="a-metrics">${metrics}</div><div class="a-grid-main">${panel("시행 전후 추이", "기준 지수 100", chart)}${panel("변화 차이", "Difference in differences", dots)}</div>${panel(
    "분석 집단 요약",
    "선택 구간 평균",
    table(
      "집단별 시행 전후 평균",
      ["집단", "시행 전", "시행 후", "변화", "관측 구간"],
      [
        [
          "참여 집단",
          d.beforeT.toFixed(1),
          d.afterT.toFixed(1),
          `+${(d.afterT - d.beforeT).toFixed(1)}`,
          "4개월 / 4개월",
        ],
        [
          "비교 집단",
          d.beforeC.toFixed(1),
          d.afterC.toFixed(1),
          `+${(d.afterC - d.beforeC).toFixed(1)}`,
          "4개월 / 4개월",
        ],
      ],
    ),
  )}`;
  return shell(
    2,
    "정책효과 분석",
    "참여 집단과 비교 집단의 변화를 살펴봅니다.",
    select(
      "segment",
      "분석 집단",
      [
        [0, "전체 집단"],
        [1, "집단 A"],
        [2, "집단 B"],
      ],
      s,
    ),
    body,
    "지수화한 가상 관측값 · 예시 데이터",
  );
}

export const ANSWERS = [
  {
    q: "검토 절차를 알려줘",
    title: "검토는 다음 순서로 진행합니다.",
    steps: [
      "접수 항목과 필수 서류를 확인합니다.",
      "담당자가 검토 의견을 기록합니다.",
      "보완 사항을 확인한 뒤 최종 결과를 등록합니다.",
    ],
    source: "업무 처리 매뉴얼",
    page: "12",
    excerpt:
      "접수한 자료는 필수 항목의 누락 여부를 확인한다. 담당자는 검토 의견을 기록하고, 보완 사항 확인 후 결과를 등록한다.",
    secondary: "검토 체크리스트",
    tag: "업무 절차",
  },
  {
    q: "첨부 서류는 어떤 게 필요해?",
    title: "접수 시 아래 서류를 확인합니다.",
    steps: [
      "기본 신청서와 항목별 확인 자료를 준비합니다.",
      "첨부 목록을 작성해 제출 파일과 대조합니다.",
      "자료가 누락된 경우 보완 요청 내역을 남깁니다.",
    ],
    source: "서류 접수 가이드",
    page: "8",
    excerpt:
      "기본 신청서, 항목별 확인 자료 및 첨부 목록을 제출한다. 누락 항목이 있으면 보완 요청 내역을 기록한다.",
    secondary: "첨부 목록 양식",
    tag: "서류 안내",
  },
  {
    q: "결과는 어디에 기록해?",
    title: "검토 결과는 처리 이력에 기록합니다.",
    steps: [
      "검토 완료 후 결과 요약을 입력합니다.",
      "판단에 사용한 근거 문서를 함께 연결합니다.",
      "최종 등록 시 담당자와 처리 일자를 기록합니다.",
    ],
    source: "기록 관리 지침",
    page: "21",
    excerpt:
      "결과 요약과 근거 문서를 처리 이력에 연결한다. 최종 등록 시 담당자 및 처리 일자를 함께 기록한다.",
    secondary: "결과 등록 안내",
    tag: "기록 관리",
  },
];
function documentAI(state) {
  const q = Number(state.query) || 0,
    a = ANSWERS[q];
  const body = `<div class="a-doc-layout"><div class="a-conversation"><div class="a-query"><span>선택한 질문</span><p>${a.q}</p><i aria-hidden="true">↗</i></div><article class="a-answer"><div class="a-answer-label">${mark}<b>Tridatum AI</b>${badge("근거 연결")}</div><h4>${a.title}</h4><ol>${a.steps.map((s) => `<li>${s}</li>`).join("")}</ol><div class="a-citation"><span>참조 01</span>${a.source} · p.${a.page}</div></article><div class="a-prompt-list"><span>다른 질문 살펴보기</span>${ANSWERS.map((r, i) => `<button type="button" data-query="${i}" aria-pressed="${i === q}">${r.q}<span aria-hidden="true">↗</span></button>`).join("")}</div></div><aside class="a-sources" aria-label="답변 근거 문서"><header><h4>검색된 근거</h4><span>2개 문서</span></header><article class="a-source selected"><div><span>01 / PDF</span>${badge(`p.${a.page}`)}</div><h5>${a.source}</h5><p><mark>${a.excerpt}</mark></p><footer>${a.tag} · 예시 문서</footer></article><article class="a-source"><div><span>02 / PDF</span>${badge("p.3")}</div><h5>${a.secondary}</h5><p>해당 업무에 필요한 항목과 확인 방법을 정리한 참조 문서입니다.</p><footer>참고 자료 · 예시 문서</footer></article></aside></div><div class="a-doc-pipeline"><span><i>01</i> 문서 구조화</span><b>→</b><span><i>02</i> 관련 근거 검색</span><b>→</b><span><i>03</i> 답변 · 출처 연결</span></div>`;
  return shell(
    3,
    "문서 검색 · 답변",
    "답변과 근거 문서를 같은 화면에서 확인합니다.",
    badge("문서 24개 연결"),
    body,
    "선택형 데모 · 사전 작성된 예시 답변",
  );
}

export const REQUESTS = [
  {
    id: "req_8f2a",
    time: "14:32:08",
    route: "문서 질의",
    duration: 842,
    tokens: 1280,
    status: "정상",
  },
  {
    id: "req_8f29",
    time: "14:18:54",
    route: "요약 생성",
    duration: 1236,
    tokens: 2164,
    status: "정상",
  },
  {
    id: "req_8f28",
    time: "14:08:41",
    route: "문서 질의",
    duration: 3000,
    tokens: 0,
    status: "시간 초과",
  },
  {
    id: "req_8f27",
    time: "13:56:26",
    route: "문서 질의",
    duration: 768,
    tokens: 1028,
    status: "정상",
  },
  {
    id: "req_8f26",
    time: "13:44:10",
    route: "근거 검색",
    duration: 312,
    tokens: 384,
    status: "정상",
  },
  {
    id: "req_8f25",
    time: "13:35:58",
    route: "요약 생성",
    duration: 3000,
    tokens: 0,
    status: "시간 초과",
  },
];
export function monitorData(window = 60) {
  const requests = Number(window) === 30 ? REQUESTS.slice(0, 3) : REQUESTS;
  return {
    requests,
    ok: requests.filter((r) => r.status === "정상").length,
    tokens: sum(requests.map((r) => r.tokens)),
  };
}
function monitoring(state) {
  const window = Number(state.window) || 60,
    status = state.status || "all",
    d = monitorData(window);
  const rows = d.requests.filter(
    (r) => status === "all" || r.status === "시간 초과",
  );
  const labels =
    window === 60
      ? ["13:30", "13:40", "13:50", "14:00", "14:10", "14:20", "14:30"]
      : ["14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30"];
  const metrics =
    kpi(
      "추적 요청",
      String(d.requests.length),
      "아래 요청 로그 기준",
      null,
      "건",
    ) +
    kpi(
      "정상 처리",
      String(d.ok),
      `시간 초과 ${d.requests.length - d.ok}건`,
      null,
      "건",
    ) +
    kpi("사용 토큰", fmt(d.tokens), "입력 · 출력 토큰 합계", null, "tokens") +
    kpi("연결 서비스", "3", "API · 검색 · 추론", null, "개");
  const chart = lineChart({
    labels,
    series: [
      {
        name: "p50",
        values:
          window === 60
            ? [720, 690, 810, 750, 790, 730, 820]
            : [750, 720, 770, 840, 780, 790, 820],
      },
      {
        name: "p95",
        values:
          window === 60
            ? [1120, 1280, 1400, 1210, 1540, 1360, 1420]
            : [1210, 1300, 1370, 1510, 1480, 1350, 1420],
      },
    ],
    max: 2000,
    unit: "ms",
    label: "구간별 응답 지연 p50 및 p95 · 가상 집계값",
  });
  const resources =
    bars(["추론 GPU", "시스템 메모리", "검색 인덱스"], [62, 48, 35], "%", 100) +
    `<div class="a-resource-foot">${badge("수집 정상")}<span>15초 간격 · 가상 스냅샷</span></div>`;
  const filter = select(
    "status",
    "로그 표시",
    [
      ["all", "전체 요청"],
      ["error", "오류만"],
    ],
    status,
  );
  const body = `<div class="a-metrics">${metrics}</div><div class="a-grid-main">${panel("응답 지연", "가상 집계 · p50 / p95", chart)}${panel("리소스 사용률", "현재 시점", resources)}</div>${panel(
    "요청 추적",
    `${rows.length}건 표시`,
    filter +
      table(
        "요청별 시간, 응답 시간, 토큰 및 처리 상태",
        ["요청 ID", "시각", "작업", "응답 시간", "토큰", "상태"],
        rows.map((r) => [
          `<code>${r.id}</code>`,
          r.time,
          r.route,
          `${fmt(r.duration)} ms`,
          fmt(r.tokens),
          badge(r.status, r.status === "정상" ? "" : "a-warn"),
        ]),
      ),
    "a-logs",
  )}`;
  return shell(
    4,
    "서비스 모니터링",
    "응답 지연부터 개별 요청까지 추적합니다.",
    select(
      "window",
      "조회 구간",
      [
        [60, "최근 60분"],
        [30, "최근 30분"],
      ],
      window,
    ),
    body,
    "집계·로그·리소스는 각각 가상 데이터",
  );
}
const TITLES = [
  "Analytics",
  "Model evaluation",
  "Policy research",
  "Document intelligence",
  "Observability",
];
function shell(index, title, desc, filters, body, foot) {
  return `<div class="a-chrome"><div>${mark}<b>Tridatum</b><span>/</span><span>${TITLES[index]}</span></div><span class="a-sample">SAMPLE</span></div><div class="a-body"><header class="a-heading"><div><h3>${title}</h3><p>${desc}</p></div><div class="a-filters">${filters}</div></header>${body}</div><div class="a-bottom"><span><i></i>예시 데이터 기반 데모</span><span>${foot}</span></div>`;
}
export function renderDemo(index, state = {}) {
  return [operation, model, policy, documentAI, monitoring][Number(index)](
    state,
  );
}

const variants = [
  [
    [
      "지표 중심 대시보드",
      "핵심 지표와 추이를 한 화면에 요약합니다.",
      "metric",
    ],
    ["데이터 품질 모니터", "수집 지연과 결측 비율을 점검합니다.", "heat"],
    ["처리 단계 분석", "단계별 흐름과 병목 구간을 비교합니다.", "bar"],
  ],
  [
    ["모델 비교 리포트", "같은 기준으로 후보 모델을 평가합니다.", "bar"],
    ["확률 보정 리포트", "예측 확률과 실제 비율을 비교합니다.", "calibration"],
    ["변수 기여도 분석", "예측을 설명하는 주요 변수를 확인합니다.", "diverge"],
  ],
  [
    ["집단별 변화 분석", "집단마다 다른 변화의 크기를 살펴봅니다.", "diverge"],
    ["공간 분포 리포트", "권역별 지표 차이를 비교합니다.", "heat"],
    ["전후 비교 리포트", "동일한 지표의 시행 전후를 비교합니다.", "metric"],
  ],
  [
    ["문서 검토 화면", "추출 항목과 원문을 함께 검토합니다.", "document"],
    ["질의 분석 화면", "질문 유형과 검색 흐름을 확인합니다.", "bar"],
    ["유사 문서 검색", "검색된 문서와 일치 근거를 확인합니다.", "document"],
  ],
  [
    ["요청 품질 추적", "응답 시간과 오류 흐름을 확인합니다.", "metric"],
    ["알림 이력", "서비스별 장애와 복구 시점을 살펴봅니다.", "heat"],
    ["리소스 현황", "GPU와 메모리의 사용량을 점검합니다.", "bar"],
  ],
];
export function miniature(kind, index = 0, title = "분석 화면") {
  let body = "";
  const tx = (x, y, t, sz = 8, color = "#728178") =>
    `<text x="${x}" y="${y}" fill="${color}" font-size="${sz}">${t}</text>`;
  const rc = (x, y, w, h, c = "#e7ece6") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}"/>`;
  if (kind === "heat") {
    ["수집 A", "수집 B", "수집 C", "수집 D"].forEach((n, i) => {
      body += tx(12, 66 + i * 20, n);
      for (let k = 0; k < 8; k++)
        body += rc(
          54 + k * 23,
          56 + i * 20,
          18,
          13,
          (i * 7 + k + index) % 9 === 0
            ? "#ba9b78"
            : (i + k) % 3 === 0
              ? "#729488"
              : "#d4e0d5",
        );
    });
    body += tx(54, 150, "MON     TUE     WED     THU     FRI");
  } else if (kind === "document") {
    body +=
      rc(12, 46, 142, 107, "#fff") +
      tx(23, 62, "Document / 0" + (index + 1), 9, "#3c5b4e") +
      rc(23, 72, 118, 1, "#d8e2d8");
    for (let i = 0; i < 6; i++)
      body += rc(
        23,
        82 + i * 10,
        110 - (i % 3) * 14,
        3,
        i === 2 ? "#9fb9a8" : "#dde3dc",
      );
    body +=
      tx(170, 60, "출처 연결", 9, "#3c5b4e") +
      tx(170, 81, "01  업무 매뉴얼") +
      tx(170, 102, "02  작성 가이드") +
      tx(170, 123, "03  참고 자료");
  } else if (kind === "calibration") {
    body += tx(15, 44, "관측 비율", 7);
    [0, 0.5, 1].forEach((v) => {
      const y = 146 - v * 94;
      body +=
        `<line x1="35" y1="${y}" x2="237" y2="${y}" stroke="#e1e7df"/>` +
        tx(16, y + 3, String(v), 7) +
        tx(32 + v * 202, 158, String(v), 7);
    });
    body += `<path d="M35 146 237 52" stroke="#b7c5bc" stroke-dasharray="3 4"/>`;
    [0.11, 0.18, 0.34, 0.38, 0.55, 0.59, 0.73, 0.78, 0.94].forEach(
      (v, i) =>
        (body += `<circle cx="${35 + (i + 1) * 20.2}" cy="${146 - v * 94}" r="2.8" fill="#49786d"/>`),
    );
    body += tx(197, 166, "예측 확률", 6);
  } else if (kind === "diverge") {
    body +=
      `<line x1="142" y1="47" x2="142" y2="143" stroke="#cad6ca" stroke-dasharray="3 3"/>` +
      tx(139, 155, "0", 7);
    ["집단 A", "집단 B", "집단 C", "집단 D"].forEach((n, i) => {
      const x = [186, 174, 125, 94][i],
        y = 61 + i * 23;
      body +=
        tx(12, y + 3, n) +
        `<path d="M${x - 21} ${y}h42m-42-4v8m42-8v8" stroke="${COLORS[i]}" fill="none"/><circle cx="${x}" cy="${y}" r="3.5" fill="${COLORS[i]}"/>` +
        tx(235, y + 3, ["+4.4", "+3.2", "−1.7", "−4.8"][i], 7);
    });
  } else if (kind === "bar") {
    (title.includes("모델")
      ? ["Boosting", "Forest", "Logistic", "Baseline"]
      : title.includes("리소스")
        ? ["GPU", "Memory", "CPU", "Storage"]
        : title.includes("단계")
          ? ["접수", "검토", "보완", "완료"]
          : ["유형 A", "유형 B", "유형 C", "유형 D"]
    ).forEach((n, i) => {
      const w = [140, 110, 83, 52][i];
      body +=
        tx(13, 67 + i * 23, n) +
        rc(57, 58 + i * 23, 179, 8) +
        rc(
          kind === "diverge" ? 116 : 57,
          58 + i * 23,
          kind === "diverge" ? w * 0.6 : w,
          8,
          COLORS[i],
        ) +
        tx(241, 66 + i * 23, String([84, 66, 50, 31][i]), 7);
    });
  } else {
    for (let i = 0; i < 3; i++)
      body +=
        rc(12 + i * 85, 44, 79, 36, "#eef2ec") +
        tx(19 + i * 85, 56, ["관측값", "비교값", "변화율"][i], 7) +
        tx(19 + i * 85, 72, ["128", "116", "+10.3%"][i], 12, "#344e41");
    [98, 116, 134].forEach(
      (y) =>
        (body += `<line x1="22" y1="${y}" x2="249" y2="${y}" stroke="#e1e7df"/>`),
    );
    if (kind === "calibration") {
      body += `<path d="M22 146 246 89" stroke="#b1bdc5" stroke-dasharray="3 4"/>`;
    }
    body += `<polyline points="22,138 48,133 74,137 100,117 126,123 152,108 178,114 204,99 246,91" fill="none" stroke="#49786d" stroke-width="1.7"/><polyline points="22,145 48,139 74,141 100,136 126,135 152,130 178,135 204,126 246,119" fill="none" stroke="#9ba9b9" stroke-width="1.5"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 170" role="img" aria-label="예시 분석 화면"><rect width="270" height="170" rx="8" fill="#f8faf5"/><path d="M0 28H270" stroke="#e0e6dc"/>${tx(12, 18, title, 9, "#537466")}${tx(231, 18, "SAMPLE", 6)}${body}</svg>`;
}
export function renderVariants(index) {
  return `<div class="variants"><button class="var-toggle" type="button"><span>함께 구성할 수 있는 화면 <small>03</small></span><span class="arrow" aria-hidden="true">↓</span></button><div class="var-grid">${variants[index].map(([title, desc, kind], i) => `<div class="var-card"><div class="var-thumb">${miniature(kind, index + i, title)}</div><b>${title}</b><span>${desc}</span></div>`).join("")}</div></div>`;
}
export function renderService(index) {
  const d = policyData(),
    m = modelMetrics();
  if (index === 2)
    return `<div class="a-service-preview">${panel(
      "시행 전후 비교",
      badge("SAMPLE"),
      lineChart({
        labels: ["−4", "−3", "−2", "−1", "+1", "+2", "+3", "+4"],
        series: [
          { name: "참여 집단", values: d.treated },
          { name: "비교 집단", values: d.control },
        ],
        min: 90,
        max: 130,
        unit: "지수",
        annotation: { index: 3.5, label: "시행" },
        label: "참여 집단과 비교 집단의 예시 변화",
      }),
    )}<div class="a-service-bottom"><span>집단 간 변화 차이</span><b>+${d.effect.toFixed(1)}p</b></div></div>`;
  if (index === 1)
    return `<div class="a-service-preview">${panel("분류 성능 검증", badge("SAMPLE"), prPlot(m))}<div class="a-service-bottom"><span>Precision <b>${m.precision.toFixed(3)}</b></span><span>Recall <b>${m.recall.toFixed(3)}</b></span></div></div>`;
  return `<div class="a-service-preview"><header class="a-panel-head"><h4>문서에서 찾는 답변</h4>${badge("SAMPLE")}</header><div class="a-query"><span>질문</span><p>${ANSWERS[0].q}</p></div><article class="a-answer"><div class="a-answer-label">${mark}<b>근거가 연결된 답변</b></div><p>${ANSWERS[0].steps.join(" ")}</p><div class="a-citation">${ANSWERS[0].source} · p.${ANSWERS[0].page}</div></article></div>`;
}
