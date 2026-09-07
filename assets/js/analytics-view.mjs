import { WORDMARK } from "./brand.mjs?v=20260907v1";
import {
  SAMPLE,
  REGIONS,
  MODELS,
  sum,
  mean,
  quantile,
  operationData,
  modelMetrics,
  prData,
  calibrationData,
  scoreDistribution,
  policyData,
  monitorData,
} from "./analytics-data.mjs?v=20260907v1";
import {
  COLORS,
  esc,
  lineFigure,
  histogramFigure,
  prFigure,
  eventFigure,
  forestFigure,
  horizontalFigure,
  calibrationFigure,
  heatFigure,
} from "./analytics-charts.mjs?v=20260907v1";
export { operationData, modelMetrics, policyData, monitorData, MODELS };
const fmt = (n) => Number(n).toLocaleString("en-US");
const fixed = (n, d = 1) => Number(n).toFixed(d);
const signed = (n) => `${n >= 0 ? "+" : ""}${fixed(n, 2)}`;
const percent = (n) => `${fixed(n * 100)}%`;
const badge = (t, c = "") => `<span class="a-badge ${c}">${t}</span>`;
const select = (key, label, values, current) =>
  `<label class="a-control"><span>${label}</span><select data-control="${key}">${values.map(([v, l]) => `<option value="${v}" ${String(current) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
const metric = (label, value, note, unit = "") =>
  `<div class="a-metric"><span class="a-metric-label">${label}</span><strong>${value}<small>${unit}</small></strong><span class="a-metric-note">${note}</span></div>`;
const panel = (title, meta, body, cls = "") =>
  `<section class="a-panel ${cls}"><header class="a-panel-head"><h4>${title}</h4><span>${meta}</span></header>${body}</section>`;
const table = (caption, heads, rows) =>
  `<div class="a-table-scroll" tabindex="0" role="region" aria-label="${caption}"><table class="a-table"><caption class="a-sr">${caption}</caption><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
const note = (t, label = "해석") =>
  `<div class="a-reading"><span>${label}</span><p>${t}</p></div>`;
const method = (text) =>
  `<details class="a-methods"><summary>데이터와 분석 조건 <span aria-hidden="true">＋</span></summary><p>${text}</p></details>`;
const headerNames = [
  "Data profile",
  "Model evaluation",
  "Policy analysis",
  "Document intelligence",
  "Observability",
];
function shell(i, title, description, filters, body, methods) {
  return `<div class="a-chrome"><div>${WORDMARK}<span class="a-crumb">/ ${headerNames[i]}</span></div><span class="a-sample">SAMPLE</span></div><div class="a-body"><header class="a-heading"><div><h3>${title}</h3><p>${description}</p></div><div class="a-filters">${filters}</div></header>${body}${method(methods)}</div>`;
}
const opMethod =
  "seed 20260907로 생성한 합성 관측값 2,400건에 중복 키 24건을 추가했습니다. 집계는 선택 기간·권역에서 중복 키를 제거한 뒤 계산합니다. 분포와 중앙값은 결측값을 제외하며, 이상치 후보는 Q3 + 1.5 × IQR 초과값입니다.";
function dataTrend(d) {
  return lineFigure({
    labels: d.labels,
    series: [{ name: "월별 중앙값", values: d.trend.map((r) => r.median) }],
    band: {
      name: "사분위 범위 · Q1–Q3",
      low: d.trend.map((r) => r.q1),
      high: d.trend.map((r) => r.q3),
    },
    min: 0,
    max: Math.ceil(Math.max(...d.trend.map((r) => r.q3)) / 20) * 20,
    unit: "관측값",
    title: "월별 관측값의 중앙값과 사분위 범위",
  });
}
function operation(state) {
  const d = operationData(state);
  const filters =
    select(
      "region",
      "권역",
      [[-1, "전체 권역"], ...REGIONS.map((r, i) => [i, r])],
      d.region,
    ) +
    select(
      "period",
      "기간",
      [
        [12, "1–12월"],
        [6, "7–12월"],
      ],
      d.period,
    );
  const metrics =
    metric(
      "관측 레코드",
      fmt(d.total),
      `고유 키 ${fmt(d.unique.length)}건`,
      "건",
    ) +
    metric(
      "결측 비율",
      percent(d.missing / d.unique.length),
      `${d.missing}건 / 중복 제외 표본`,
    ) +
    metric(
      "분포 중앙값",
      fixed(d.median),
      `Q1 ${fixed(d.q1)} · Q3 ${fixed(d.q3)}`,
    ) +
    metric(
      "이상치 후보",
      String(d.outliers),
      `상한 ${fixed(d.cut)} 초과`,
      "건",
    );
  const body = `<div class="a-metrics">${metrics}</div><div class="a-grid-main">${panel("분포와 계절성", "월 단위 · 중앙값 / IQR", dataTrend(d))}${panel("관측값 분포", `유효 표본 ${fmt(d.valid.length)}건`, histogramFigure(d.hist, { unit: "관측값", title: "관측값 구간별 빈도" }))}</div><div class="a-grid-bottom">${panel(
    "권역별 표본 점검",
    "중복 키 제외",
    table(
      "권역별 표본과 결측",
      ["권역", "관측 건수", "결측", "결측률", "중앙값"],
      d.regions.map((r) => [
        r.name,
        fmt(r.n),
        r.missing,
        percent(r.missing / r.n),
        fixed(r.median),
      ]),
    ),
  )}${panel("분석 전 처리 항목", "검토 대상", `<div class="a-check-list"><div><b>01</b><span>중복 키</span><strong>${d.duplicates}건</strong></div><div><b>02</b><span>관측값 결측</span><strong>${d.missing}건</strong></div><div><b>03</b><span>IQR 상한 초과</span><strong>${d.outliers}건</strong></div></div>` + note("결측과 극단값의 원인을 확인한 뒤 제외·대체 기준을 정합니다."))}</div>`;
  return shell(
    0,
    "데이터 탐색 · 품질 진단",
    "분포, 표본 편차, 결측 위치를 함께 검토합니다.",
    filters,
    body,
    opMethod,
  );
}
const curves = MODELS.map((_, i) => prData(i));
const modelMethod = `scikit-learn ${SAMPLE.meta.sklearn}의 합성 이진 분류 데이터 4,000건을 계층화 분할했습니다. 학습 3,000건, 독립 검증 1,000건, 설명변수 10개입니다. AP·PR·혼동 행렬은 실제 학습한 세 후보 모델의 검증 점수에서 계산합니다. 변수 기여도는 검증 표본의 permutation ΔAP 5회 평균입니다. 실제 프로젝트의 성능 수치가 아닙니다.`;
function model(state) {
  const d = modelMetrics(state.model ?? 0, state.threshold ?? 35),
    dist = scoreDistribution(d.model);
  const filters = select(
    "model",
    "평가 모델",
    MODELS.map((m, i) => [i, m]),
    d.model,
  );
  const metrics =
    metric(
      "Average precision",
      fixed(d.ap, 3),
      `무작위 기준 ${fixed(d.prevalence, 3)}`,
    ) +
    metric(
      "Precision",
      fixed(d.precision, 3),
      `탐지 ${d.flagged}건 중 정탐 ${d.tp}건`,
    ) +
    metric(
      "Recall",
      fixed(d.recall, 3),
      `양성 ${d.tp + d.fn}건 중 탐지 ${d.tp}건`,
    ) +
    metric(
      "검토 대상",
      fmt(d.flagged),
      `전체 검증 표본 ${percent(d.flagged / d.n)}`,
      "건",
    );
  const range = `<label class="a-threshold"><span>판정 임계값 <output>${fixed(d.threshold / 100, 2)}</output></span><input type="range" data-control="threshold" min="5" max="95" step="5" value="${d.threshold}" aria-label="분류 임계값"><small>누락 감소 <span>검토량 감소</span></small></label>`;
  const matrix = `<div class="a-matrix"><span></span><span>예측 음성</span><span>예측 양성</span><span>실제 음성</span><div><b>${d.tn}</b><small>TN</small></div><div class="a-cell-warn"><b>${d.fp}</b><small>FP · 오탐</small></div><span>실제 양성</span><div class="a-cell-warn"><b>${d.fn}</b><small>FN · 누락</small></div><div class="a-cell-good"><b>${d.tp}</b><small>TP · 정탐</small></div></div>`;
  const importance = SAMPLE.models.items[d.model].importance
    .map((v, i) => ({
      label: `변수 ${String(i + 1).padStart(2, "0")}`,
      value: v,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const body = `<div class="a-context-strip"><span>독립 검증 ${fmt(d.n)}건</span><span>양성 비율 ${percent(d.prevalence)}</span><span>층화 분할 · 75 / 25</span></div><div class="a-metrics">${metrics}</div><div class="a-grid-main model-grid">${panel("불균형 데이터의 탐지 성능", "PR curve · 점은 현재 임계값", prFigure(curves, d, d.prevalence) + range)}${panel("오탐과 누락", "혼동 행렬 · 건", matrix + note(`임계값 ${fixed(d.threshold / 100, 2)}에서 ${d.flagged}건을 검토하고 양성 ${d.fn}건을 놓칩니다.`))}</div><div class="a-grid-bottom">${panel(
    "후보 모델 비교",
    "동일 검증 표본",
    table(
      "후보 모델 평가",
      ["모델", "AP", "Precision", "Recall", "F1"],
      MODELS.map((name, i) => {
        const m = modelMetrics(i, d.threshold);
        return [
          i === d.model ? `<b>${name}</b>` : name,
          fixed(m.ap, 3),
          fixed(m.precision, 3),
          fixed(m.recall, 3),
          fixed(m.f1, 3),
        ];
      }),
    ),
  )}${panel("검증 성능에 기여한 변수", "Permutation ΔAP", horizontalFigure(importance, { title: "변수별 검증 AP 감소량" }) + `<p class="a-panel-note">변수 값을 섞었을 때 AP가 감소한 정도입니다.</p>`)}</div>`;
  return shell(
    1,
    "예측 모델 검증",
    "희소한 대상을 얼마나 찾고, 얼마나 놓치는지 평가합니다.",
    filters,
    body,
    modelMethod,
  );
}
const policyMethod =
  "80개 개체의 12개월 합성 패널입니다. 처치·비교 집단은 각각 40개이며 시행 전후 6개월씩 관측했습니다. 집단 간 전후 평균 변화 차이를 계산하고, 개체를 복원 추출하는 percentile bootstrap 800회로 구간을 구합니다. 시점별 차이는 시행 전 −1개월을 기준으로 합니다. 실제 사업의 효과 추정치가 아닙니다.";
function policyTrend(d) {
  return lineFigure({
    labels: [
      "−6",
      "−5",
      "−4",
      "−3",
      "−2",
      "−1",
      "+1",
      "+2",
      "+3",
      "+4",
      "+5",
      "+6",
    ],
    series: [
      { name: "처치 집단", values: d.treated },
      { name: "비교 집단", values: d.control, color: COLORS[1] },
    ],
    min: Math.floor(Math.min(...d.treated, ...d.control) / 5) * 5 - 2,
    max: Math.ceil(Math.max(...d.treated, ...d.control) / 5) * 5 + 2,
    unit: "결과 지수",
    eventAt: 5.5,
    title: "시행 전후 집단별 평균 결과 지수",
  });
}
function policy(state) {
  const segment = Number(state.segment) || 0,
    level = Number(state.level) || 95,
    d = policyData(segment, level);
  const metrics =
    metric(
      "전후 변화의 집단 차이",
      signed(d.effect),
      `${level}% 구간 [${fixed(d.ci[0], 2)}, ${fixed(d.ci[1], 2)}]`,
      "p",
    ) +
    metric(
      "관측 개체",
      String(d.units.length),
      `처치 ${d.groups[0].length} · 비교 ${d.groups[1].length}`,
      "개",
    ) +
    metric(
      "분석 표본",
      fmt(d.units.length * 12),
      "시행 전 6개월 · 시행 후 6개월",
      "개체·월",
    );
  const side = `<div class="a-estimate"><span>추정 대상</span><h5>집단별 평균 변화의 차이</h5><dl><div><dt>처치 집단</dt><dd>${signed(d.afterT - d.beforeT)} p</dd></div><div><dt>비교 집단</dt><dd>${signed(d.afterC - d.beforeC)} p</dd></div><div class="a-result"><dt>차이의 차이</dt><dd>${signed(d.effect)} p</dd></div></dl><div class="a-ci"><span>${level}% bootstrap interval</span><b>${fixed(d.ci[0], 2)} <i>↔</i> ${fixed(d.ci[1], 2)}</b></div></div>`;
  const groups = [0, 1, 2].map((s) => {
    const r = policyData(s, level);
    return {
      label: ["전체", "집단 A", "집단 B"][s],
      value: r.effect,
      lo: r.ci[0],
      hi: r.ci[1],
    };
  });
  const body = `<div class="a-context-strip"><span>패널 데이터</span><span>Difference in differences</span><span>개체 단위 bootstrap · 800회</span></div><div class="a-metrics a-metrics-three">${metrics}</div><div class="a-grid-main policy-grid">${panel("시행 전후 추이", "집단별 월평균 · 결과 지수", policyTrend(d))}${panel("효과 추정 요약", `${level}% 구간`, side)}</div><div class="a-grid-bottom equal">${panel("시점별 변화와 사전 추세", "−1개월 대비 · 지수 p", eventFigure(d.events, level))}${panel("집단별 효과 차이", "동일 추정 방식", forestFigure(groups))}</div>${note("시행 이전 계수와 구간을 먼저 확인하고, 집단 간 구성 차이와 외부 요인을 추가 검토합니다.", "분석 순서")}`;
  return shell(
    2,
    "정책효과 · 집단 비교",
    "효과의 크기와 불확실성, 사전 추세를 함께 검토합니다.",
    select(
      "segment",
      "분석 집단",
      [
        [0, "전체"],
        [1, "집단 A"],
        [2, "집단 B"],
      ],
      segment,
    ) +
      select(
        "level",
        "구간 수준",
        [
          [95, "95%"],
          [90, "90%"],
        ],
        level,
      ),
    body,
    policyMethod,
  );
}
export const ANSWERS = [
  {
    q: "분석 대상과 제외 기준은?",
    title: "관측 키를 기준으로 표본을 정리합니다.",
    steps: [
      "권역·기준월 조건으로 분석 대상 레코드를 추출합니다.",
      "같은 관측 키가 반복되면 한 건만 유지합니다.",
      "결측값은 분포 계산에서 제외하고, 극단값은 별도 검토 대상으로 표시합니다.",
    ],
    source: "데이터 분석 설계서",
    page: "04",
    section: "2.1 분석 표본 정의",
    excerpt:
      "동일 관측 키의 중복 레코드는 제거한다. 관측값이 비어 있는 항목은 분포 산출에서 제외하되 결측 현황에 남긴다. IQR 상한을 초과한 값은 원천 데이터 확인 후 처리한다.",
    fields: [
      ["분석 단위", "관측 키"],
      ["제외 기준", "중복 키 · 관측값 결측"],
      ["극단값", "검토 후 처리 결정"],
    ],
  },
  {
    q: "모델 검증 기준을 요약해줘",
    title: "독립 검증 표본에서 탐지 성능을 비교합니다.",
    steps: [
      "전체 합성 데이터의 25%를 계층화해 검증용으로 분리합니다.",
      "후보 모델은 동일한 표본에서 AP와 Precision·Recall을 비교합니다.",
      "판정 임계값에 따른 오탐·누락 건수와 검토량을 함께 기록합니다.",
    ],
    source: "예측 모델 검증 계획",
    page: "07",
    section: "3.2 평가 설계",
    excerpt:
      "검증 표본은 전체의 25%로 고정하고 양성 비율을 유지한다. AP를 중심으로 비교하되, 임계값별 혼동 행렬과 검토 대상 건수를 함께 보고한다. 검증 표본은 학습에 사용하지 않는다.",
    fields: [
      ["검증 방식", "Stratified holdout"],
      ["분할 비율", "학습 75% · 검증 25%"],
      ["비교 지표", "AP · Precision · Recall"],
    ],
  },
  {
    q: "정책효과의 불확실성은 어떻게 산출해?",
    title: "개체 단위 재표집으로 구간을 구합니다.",
    steps: [
      "시행 전후 평균 변화의 처치·비교 집단 차이를 계산합니다.",
      "각 집단에서 개체를 복원 추출하는 bootstrap을 800회 반복합니다.",
      "추정치 분포의 분위수로 구간을 산출하고 사전 추세를 별도로 확인합니다.",
    ],
    source: "정책효과 추정 명세",
    page: "11",
    section: "4.1 추정과 불확실성",
    excerpt:
      "월별 관측을 개별적으로 섞지 않고 개체의 전체 시계열을 함께 재표집한다. 800회 추정한 분포에서 percentile 구간을 계산한다. 구간 추정과 별개로 시행 전 추세 및 교란 요인을 검토한다.",
    fields: [
      ["재표집 단위", "개체의 전체 시계열"],
      ["반복 횟수", "800회"],
      ["구간 산출", "Percentile bootstrap"],
    ],
  },
];
const docMethod =
  "직접 작성한 예시 분석 문서 3종과 사전 구성된 답변입니다. 질문 선택 시 해당 문서의 인용 구간과 구조화 필드가 함께 바뀝니다. 운영 LLM 호출이나 실제 검색 점수를 가장하지 않습니다.";
function documentAI(state) {
  const query = Number(state.query) || 0,
    a = ANSWERS[query];
  const source = `<article class="a-document-page"><div class="a-doc-meta"><span>분석 방법론 / ${a.source}</span><b>${a.page}</b></div><h4>${a.section}</h4><p class="a-document-intro">본 절은 분석 실행과 검증 과정에 적용하는 기준을 정의한다.</p><p class="a-highlight">${a.excerpt}</p><h5>검토 기록</h5><p>분석 조건과 처리 내역을 기록하고, 산출물에서 원문과 적용 기준을 확인할 수 있도록 연결한다.</p><footer>예시 문서 · Tridatum research notes</footer></article>`;
  const answer = `<article class="a-answer"><div class="a-answer-label"><span class="a-answer-id">01</span><b>근거에 연결된 답변</b>${badge("인용 1개")}</div><h4>${a.title}</h4><ol>${a.steps.map((s) => `<li>${s}</li>`).join("")}</ol><a class="a-citation" href="#document-source" data-source-link>${a.source} · p.${a.page}<span>↗</span></a></article>${panel("추출한 분석 조건", "문서 → 구조화 필드", table("문서에서 추출한 분석 조건", ["항목", "추출값"], a.fields))}`;
  const body = `<div class="a-query-box"><span>분석 문서 질의</span><p>${a.q}</p><span class="a-query-mark">↵</span></div><div class="a-doc-workspace"><div class="a-doc-answer">${answer}</div><div class="a-doc-source" id="document-source" tabindex="-1">${source}</div></div><div class="a-prompt-list"><span>질문 선택</span>${ANSWERS.map((r, i) => `<button type="button" data-query="${i}" aria-pressed="${i === query}">${r.q}<span>↗</span></button>`).join("")}</div>`;
  return shell(
    3,
    "문서 AI · 근거 추적",
    "답변, 인용 구간, 추출 필드를 같은 문맥에서 검토합니다.",
    badge("분석 문서 3종"),
    body,
    docMethod,
  );
}
const routes = ["문서 질의", "요약 생성", "근거 검색"];
function waterfall(r) {
  const labels = ["Retrieval", "Reranking", "첫 토큰 대기", "생성"],
    total = sum(r.parts);
  let elapsed = 0;
  return `<div class="a-waterfall">${r.parts
    .map((v, i) => {
      const start = elapsed;
      elapsed += v;
      return `<div><span>${labels[i]}</span><div><i style="margin-left:${(start / total) * 100}%;width:${(v / total) * 100}%;background:${COLORS[i % 4]}"></i></div><b>${v} ms</b></div>`;
    })
    .join("")}</div>`;
}
const monitoringMethod =
  "합성 요청 420건의 처리 시간·토큰·단계별 지연을 생성했습니다. 기간 필터를 적용한 요청에서 전체 KPI와 5분 단위 분위수를 다시 계산합니다. 시간 초과는 5,000ms로 기록합니다. 오류 필터는 하단 요청 표에 적용되며, 단계별 추적은 정상 요청의 실제 합산값과 일치합니다.";
function monitoring(state) {
  const window = Number(state.window) || 60,
    d = monitorData(window),
    errors = state.status === "error",
    rows = d.requests.filter((r) => !errors || r.error),
    selected =
      d.requests.find((r) => r.id === state.trace && !r.error) ||
      d.requests.find((r) => !r.error);
  const metrics =
    metric(
      "요청 수",
      fmt(d.requests.length),
      `5분 단위 집계 · ${window}분`,
      "건",
    ) +
    metric(
      "p95 지연",
      fmt(Math.round(d.p95)),
      `p50 ${Math.round(d.p50)} ms`,
      "ms",
    ) +
    metric(
      "오류율",
      percent((d.requests.length - d.ok) / d.requests.length),
      `시간 초과 ${d.requests.length - d.ok}건`,
    ) +
    metric("사용 토큰", fmt(d.tokens), "선택 구간 요청의 합계");
  const trend = lineFigure({
    labels: d.buckets.map((b) => b.label),
    series: [
      { name: "p50", values: d.buckets.map((b) => b.p50) },
      { name: "p95", values: d.buckets.map((b) => b.p95), color: COLORS[1] },
    ],
    min: 0,
    max: Math.ceil(Math.max(...d.buckets.map((b) => b.p95)) / 1000) * 1000,
    unit: "ms",
    title: "5분 구간별 요청 지연 분위수",
  });
  const trace = panel(
    "선택 요청의 단계별 지연",
    `${selected.id} · ${fmt(selected.duration)} ms`,
    waterfall(selected) +
      `<p class="a-panel-note">${routes[selected.route]} · 입력·출력 ${fmt(selected.tokens)} tokens</p>`,
  );
  const body = `<div class="a-context-strip"><span>LLM request traces</span><span>집계 간격 5분</span><span>상세 요청 선택 가능</span></div><div class="a-metrics">${metrics}</div><div class="a-grid-main">${panel("응답 지연 추이", "Latency percentiles", trend)}${panel("지연 시간 분포", `p99 ${fmt(Math.round(d.p99))} ms`, histogramFigure(d.hist, { unit: "ms", title: "전체 요청 지연 분포" }))}</div><div class="a-grid-bottom monitor-bottom">${panel(
    "요청 추적",
    `${rows.length}건 중 최근 ${Math.min(rows.length, 6)}건`,
    select(
      "status",
      "표에 표시",
      [
        ["all", "전체 요청"],
        ["error", "오류만"],
      ],
      errors ? "error" : "all",
    ) +
      table(
        "요청별 실행 정보",
        ["요청", "유형", "지연", "토큰", "상태"],
        rows
          .slice(0, 6)
          .map((r) => [
            r.error
              ? `<code>${r.id}</code>`
              : `<button class="a-trace-button" data-trace="${r.id}" aria-pressed="${selected.id === r.id}">${r.id} ↗</button>`,
            routes[r.route],
            `${fmt(r.duration)} ms`,
            fmt(r.tokens),
            badge(r.error ? "시간 초과" : "정상", r.error ? "a-warn" : ""),
          ]),
      ),
  )}${trace}</div>`;
  return shell(
    4,
    "LLM 운영 · 요청 분석",
    "전체 지연 분포에서 개별 요청의 병목까지 추적합니다.",
    select(
      "window",
      "기간",
      [
        [60, "최근 60분"],
        [30, "최근 30분"],
      ],
      window,
    ),
    body,
    monitoringMethod,
  );
}
export function renderDemo(index, state = {}) {
  return [operation, model, policy, documentAI, monitoring][Number(index)](
    state,
  );
}

const variants = [
  [
    ["coverage", "관측 커버리지", "권역·월별 관측 건수와 누락 구간"],
    ["outliers", "극단값 검토", "IQR 상한을 초과한 레코드 확인"],
    ["profile", "권역별 분포 비교", "중앙값과 사분위 범위의 차이"],
  ],
  [
    ["calibration", "확률 보정", "예측 확률과 실제 양성 비율"],
    ["scores", "예측 점수 분포", "양성·음성 점수의 중첩 구간"],
    ["importance", "변수 기여도", "변수별 검증 성능 감소량"],
  ],
  [
    ["events", "사전 추세 검토", "시점별 변화 차이와 구간 추정"],
    ["groups", "집단별 효과", "같은 추정 방식의 집단 간 비교"],
    ["summary", "추정 표본 점검", "시행 전후 관측값과 표본 구성"],
  ],
  [
    ["sources", "인용 구간 검토", "답변과 연결된 문서 원문"],
    ["fields", "구조화 필드", "문서에서 추출한 분석 조건"],
    ["audit", "답변 검토 기록", "질문·근거·검토 항목의 연결"],
  ],
  [
    ["distribution", "지연 분포 분석", "분위수와 긴 응답 시간의 분포"],
    ["errors", "오류 요청 분석", "시간 초과가 발생한 요청 확인"],
    ["trace", "단계별 실행 추적", "검색·재정렬·추론 지연의 분해"],
  ],
];
export function detailContent(i, key, state = {}) {
  if (i === 0) {
    const d = operationData(state);
    if (key === "coverage") {
      const rows = d.regions.map((r) => ({
        label: r.name,
        values: Array.from(
          { length: d.period },
          (_, m) =>
            d.unique.filter(
              (u) => REGIONS[u[1]] === r.name && u[2] === 13 - d.period + m,
            ).length,
        ),
      }));
      return {
        figure: heatFigure(
          rows,
          d.labels,
          "권역별 관측 커버리지",
          (v) => `${v}건`,
        ),
        body: table(
          "권역별 표본 구성",
          ["권역", "고유 키", "비결측", "결측"],
          d.regions.map((r) => [r.name, r.n, r.n - r.missing, r.missing]),
        ),
        method: opMethod,
      };
    }
    if (key === "outliers") {
      const r = d.valid.filter((r) => r[3] > d.cut).sort((a, b) => b[3] - a[3]);
      return {
        figure: histogramFigure(d.hist, { unit: "관측값" }),
        body: table(
          "IQR 상한 초과 레코드",
          ["관측 키", "권역", "기준월", "관측값"],
          r
            .slice(0, 8)
            .map((r) => [`obs_${r[0]}`, REGIONS[r[1]], `${r[2]}월`, r[3]]),
        ),
        method: `상한 ${fixed(d.cut)} 초과 ${r.length}건. ${opMethod}`,
      };
    }
    return {
      figure: forestFigure(
        d.regions.map((r) => {
          const v = d.valid
            .filter((u) => REGIONS[u[1]] === r.name)
            .map((u) => u[3]);
          return {
            label: r.name,
            value: r.median,
            lo: quantile(v, 0.25),
            hi: quantile(v, 0.75),
          };
        }),
        "관측값 · 점은 중앙값, 구간은 IQR",
      ),
      body: note(
        "구간은 신뢰구간이 아니라 각 권역 관측값의 사분위 범위입니다.",
      ),
      method: opMethod,
    };
  }
  if (i === 1) {
    const m = Number(state.model) || 0;
    if (key === "calibration") {
      const r = calibrationData(m);
      return {
        figure: calibrationFigure(r),
        body: table(
          "확률 구간별 예측과 관측",
          ["확률 구간", "표본", "평균 예측", "실제 양성률"],
          r.map((b) => [b.bin, b.n, fixed(b.x, 3), fixed(b.y, 3)]),
        ),
        method: modelMethod,
      };
    }
    if (key === "scores") {
      const dist = scoreDistribution(m);
      return {
        figure: histogramFigure(
          dist[0].map((n, i) => ({
            n,
            lo: fixed(i / 10),
            label: `${fixed(i / 10)}–${fixed((i + 1) / 10)}`,
          })),
          {
            secondary: dist[1],
            names: ["실제 음성", "실제 양성"],
            unit: "예측 점수",
          },
        ),
        body: note(
          "점수 분포가 겹치는 구간에서 임계값을 옮기면 오탐과 누락의 비율이 달라집니다.",
        ),
        method: modelMethod,
      };
    }
    const rows = SAMPLE.models.items[m].importance
      .map((v, i) => ({
        label: `변수 ${String(i + 1).padStart(2, "0")}`,
        value: v,
      }))
      .sort((a, b) => b.value - a.value);
    return {
      figure: horizontalFigure(rows, { title: "변수별 permutation AP 감소량" }),
      body: note(
        "검증 표본에서 변수 하나씩 값을 섞어 AP 감소량을 5회 측정했습니다. 기여도는 인과관계를 뜻하지 않습니다.",
      ),
      method: modelMethod,
    };
  }
  if (i === 2) {
    const level = Number(state.level) || 95,
      d = policyData(Number(state.segment) || 0, level);
    if (key === "events")
      return {
        figure: eventFigure(d.events, level),
        body: table(
          "시점별 변화 추정치",
          ["시점", "계수", "구간 하한", "구간 상한"],
          d.events.map((r) => [
            `${r.label}개월`,
            fixed(r.value, 2),
            fixed(r.lo, 2),
            fixed(r.hi, 2),
          ]),
        ),
        method: policyMethod,
      };
    if (key === "groups")
      return {
        figure: forestFigure(
          [0, 1, 2].map((s) => {
            const r = policyData(s, level);
            return {
              label: ["전체", "집단 A", "집단 B"][s],
              value: r.effect,
              lo: r.ci[0],
              hi: r.ci[1],
            };
          }),
        ),
        body: note(
          "집단별 표본 수가 작아질수록 구간이 넓어질 수 있습니다. 전체 효과와 하위 집단 차이를 함께 비교합니다.",
        ),
        method: policyMethod,
      };
    return {
      figure: policyTrend(d),
      body: table(
        "시행 전후 집단 평균",
        ["집단", "개체", "시행 전", "시행 후", "변화"],
        [
          [
            "처치",
            d.groups[0].length,
            fixed(d.beforeT, 2),
            fixed(d.afterT, 2),
            signed(d.afterT - d.beforeT),
          ],
          [
            "비교",
            d.groups[1].length,
            fixed(d.beforeC, 2),
            fixed(d.afterC, 2),
            signed(d.afterC - d.beforeC),
          ],
        ],
      ),
      method: policyMethod,
    };
  }
  if (i === 3) {
    const a = ANSWERS[Number(state.query) || 0];
    if (key === "sources")
      return {
        figure: `<div class="a-document-excerpt"><span>${a.source} · p.${a.page}</span><h4>${a.section}</h4><p>${a.excerpt}</p></div>`,
        body: note(a.title, "연결 답변"),
        method: docMethod,
      };
    if (key === "fields")
      return {
        figure: table(
          "구조화 필드 원문 대조",
          ["항목", "추출값", "출처"],
          a.fields.map((f) => [...f, `${a.source} p.${a.page}`]),
        ),
        body: note("추출값을 원문과 대조한 뒤 업무 시스템에 연결합니다."),
        method: docMethod,
      };
    return {
      figure: `<div class="a-audit-flow">${["질문 수신", "근거 문서 연결", "답변 문장 대조", "원문 검토"].map((s, i) => `<div><b>0${i + 1}</b><h4>${s}</h4><p>${[a.q, a.source, a.title, a.section][i]}</p></div>`).join("")}</div>`,
      body: note("생성된 답변과 출처를 함께 남겨 검토 과정을 추적합니다."),
      method: docMethod,
    };
  }
  const d = monitorData(Number(state.window) || 60);
  if (key === "distribution")
    return {
      figure: histogramFigure(d.hist, { unit: "ms" }),
      body: table(
        "지연 분위수",
        ["p50", "p95", "p99", "최대"],
        [
          [
            ...["p50", "p95", "p99"].map((k) => `${Math.round(d[k])} ms`),
            `${Math.max(...d.requests.map((r) => r.duration))} ms`,
          ],
        ],
      ),
      method: monitoringMethod,
    };
  if (key === "errors") {
    const errors = d.requests.filter((r) => r.error);
    return {
      figure: heatFigure(
        [{ label: "오류율", values: d.buckets.map((b) => b.errors / b.n) }],
        d.buckets.map((b) => b.label),
        "구간별 오류 집중도",
      ),
      body: table(
        "시간 초과 요청",
        ["요청 ID", "유형", "처리 시간", "종료 상태"],
        errors.map((r) => [
          r.id,
          routes[r.route],
          `${r.duration} ms`,
          "timeout",
        ]),
      ),
      method: monitoringMethod,
    };
  }
  const selected =
    d.requests.find((r) => r.id === state.trace && !r.error) ||
    d.requests.find((r) => !r.error);
  return {
    figure: waterfall(selected),
    body: table(
      "요청 추적 정보",
      ["요청", "작업", "전체 지연", "사용 토큰"],
      [
        [
          selected.id,
          routes[selected.route],
          `${selected.duration} ms`,
          fmt(selected.tokens),
        ],
      ],
    ),
    method: monitoringMethod,
  };
}
export function renderDetail(index, key, state = {}) {
  const title = variants[index].find((r) => r[0] === key)?.[1] || "상세 분석",
    d = detailContent(index, key, state);
  return `<div class="analytics a-detail"><div class="a-chrome"><div>${WORDMARK}<span class="a-crumb">/ ${headerNames[index]}</span></div><span class="a-sample">SAMPLE</span></div><div class="a-body"><header class="a-heading"><h3 id="detail-title">${title}</h3></header>${panel(title, "선택한 분석 조건 적용", d.figure)}${d.body}${method(d.method)}</div></div>`;
}
export function renderVariants(index) {
  return `<div class="variants"><button class="var-toggle" type="button"><span>세부 분석 화면 <small>03</small></span><span class="arrow" aria-hidden="true">↓</span></button><div class="var-grid">${variants[
    index
  ]
    .map(([key, title, desc]) => {
      const figure = detailContent(index, key).figure;
      const svg = figure
        .match(/<svg[\s\S]*?<\/svg>/)?.[0]
        ?.replaceAll('tabindex="0"', "");
      const a = ANSWERS[0];
      const documentPreview =
        key === "sources"
          ? `<h4>${a.section}</h4><p class="a-mini-excerpt">${a.excerpt}</p>`
          : key === "fields"
            ? a.fields.map(([k, v]) => `<p><b>${k}</b>${v}</p>`).join("")
            : ["질문 수신", "근거 문서 연결", "답변 문장 대조", "원문 검토"]
                .map(
                  (label, i) => `<p><b>0${i + 1}</b><span>${label}</span></p>`,
                )
                .join("");
      const preview =
        svg ||
        `<div class="a-mini-document"><span>${index === 3 ? a.source : title}</span>${index === 3 ? documentPreview : figure}</div>`;
      return `<button class="var-card" type="button" aria-label="${title} 상세 보기" data-detail="${index}:${key}"><div class="var-thumb" aria-hidden="true">${preview}</div><b>${title}<i aria-hidden="true">↗</i></b><span>${desc}</span></button>`;
    })
    .join("")}</div></div>`;
}
export function renderService(index) {
  const d =
    index === 1
      ? detailContent(1, "calibration")
      : index === 2
        ? detailContent(2, "events")
        : detailContent(3, "sources");
  return `<div class="a-service-preview">${panel({ 1: "검증 표본의 확률 보정", 2: "시점별 변화와 불확실성", 3: "문서와 연결된 답변" }[index], badge("SAMPLE"), d.figure)}${note({ 1: "독립 검증 표본의 예측 확률과 실제 양성 비율을 비교합니다.", 2: "시행 전 추세와 이후 변화의 크기를 구간 추정과 함께 확인합니다.", 3: "인용 구간과 답변 문장을 연결해 검토할 수 있게 구성합니다." }[index], "분석 내용")}</div>`;
}
