import { esc, lineFigure, COLORS } from "./analytics-charts.mjs?v=20260907u2";
import {
  operationalDetail,
  WORKFLOWS,
} from "./operations-models.mjs?v=20260907u2";
import { domainLens } from "./operations-lenses.mjs?v=20260907u2";
import { VACANCY } from "./vacancy-regions.mjs?v=20260907u2";
const n = (v) =>
  Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
const box = (title, sub, body, cls = "") =>
  `<section class="a-panel ops-panel ${cls}"><header class="ops-panel-head"><h4>${esc(title)}</h4><span>${esc(sub)}</span></header>${body}</section>`;
const metrics = (items) =>
  `<div class="ops-metrics">${items.map(([label, value, sub]) => `<div class="ops-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></div>`).join("")}</div>`;
function table(columns, records, title) {
  return `<div class="ops-table-scroll" tabindex="0" role="region" aria-label="${esc(title)}"><table class="ops-table"><caption class="a-sr">${esc(title)}</caption><thead><tr>${columns.map((x) => `<th scope="col">${esc(x)}</th>`).join("")}</tr></thead><tbody>${records.map((r) => `<tr>${r.cells.map((cell, i) => (i ? `<td>${esc(cell)}</td>` : `<th scope="row">${esc(cell)}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}
const facts = (items) =>
  `<dl class="ops-facts">${items.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
function figure(c) {
  const values = c.series.flatMap((x) => x.values);
  return lineFigure({
    ...c,
    min: Math.min(0, ...values),
    max: Math.max(1, ...values) * 1.15,
    title: c.title,
  });
}
export function workflowTabs(id, state) {
  const w = WORKFLOWS[id],
    view = state.view || "evidence";
  return `<div class="ops-view-tabs" role="tablist" aria-label="${esc(w.role)} 작업 화면">${[
    ["evidence", w.tabs[1]],
    ["overview", w.tabs[0]],
    ["tasks", w.tabs[2]],
  ]
    .map(
      ([key, label]) =>
        `<button id="ops-view-${key}" role="tab" aria-selected="${view === key}" aria-controls="ops-view-panel" tabindex="${view === key ? 0 : -1}" data-ops-view="${key}">${esc(label)}</button>`,
    )
    .join("")}</div>`;
}
function lineage(w) {
  return `<div class="ops-lineage" aria-label="분석 자료 연결">${w.lineage.map((label, i) => `<span><b>${String(i + 1).padStart(2, "0")}</b>${esc(label)}</span>`).join("")}</div>`;
}
function methodology(w) {
  return `<details class="ops-method"><summary>분석 단위·지표 정의 <span>${esc(w.unit)} · ${esc(w.version)}</span><b aria-hidden="true">+</b></summary><div>${w.methods.map(([title, body]) => `<section><h5>${esc(title)}</h5><p>${esc(body)}</p></section>`).join("")}</div></details>`;
}
function waterfall(spans) {
  const total = spans.at(-1).start + spans.at(-1).duration;
  return `<div class="ops-waterfall">${spans.map((x, i) => `<div><span>${esc(x.name)}</span><div><i style="margin-left:${(x.start / total) * 100}%;width:${(x.duration / total) * 100}%;background:${COLORS[i % 3]}"></i></div><b>${n(x.duration)}ms</b></div>`).join("")}<footer>0ms <span>${n(total)}ms · 단계별 누적 시간</span></footer></div>`;
}
export function renderOperational(id, state, base) {
  if (id === "vacancy") return renderVacancy(state);
  const model = operationalDetail(id, state, base.rows),
    lens = domainLens(id, state, base.rows, model),
    w = model.workflow;
  const choices = base.rows.filter((x) => x.id);
  const picker =
    choices.length > 1
      ? `<label class="ops-detail-picker">분석 대상<select data-detail-select aria-label="분석 대상 선택">${choices.map((r) => `<option value="${esc(r.id)}" ${r.id === state.selected ? "selected" : ""}>${esc(r.name || r.id)}</option>`).join("")}</select></label>`
      : "";
  return `${lineage(w)}<div class="ops-detail-heading"><div><p>${esc(w.role)} · ${esc(w.unit)}</p><h4>${esc(model.title)}</h4></div>${picker}</div>${metrics(model.kpis)}${model.chart ? `<div class="ops-grid wide-left">${box(model.chart.title, model.chart.sub, figure(model.chart))}${box("분석 기준과 자료 이력", w.version, facts(model.facts))}</div>` : box("분석 기준과 자료 이력", w.version, facts(model.facts))}${model.spans ? box("요청 단계별 시간", "직렬 실행 예시 · 요청 시작 기준", waterfall(model.spans)) : ""}${model.excerpt ? box("원문 근거", "직접 작성한 합성 문서", `<blockquote class="ops-excerpt">${esc(model.excerpt)}</blockquote>`) : ""}${box(model.tableTitle, model.tableSub, table(model.columns, model.records, model.tableTitle))}${
    model.breakdown
      ? box(
          "격리 사유와 원천 연결",
          "현재 필터 범위",
          table(
            ["원천 ID", "격리 사유", "건수"],
            model.breakdown.map((x) => ({
              cells: [x.source, x.reason, x.count],
            })),
            "격리 사유별 건수",
          ),
        )
      : ""
  }${lens ? box(lens.title, "입력값 · 계산 기준 · 해석", `<div class="ops-lens-list">${lens.rows.map((x) => `<div><h5>${esc(x.name)}</h5><strong>${esc(x.value)}</strong><p>${esc(x.basis)}</p><span>${esc(x.interpretation)}</span></div>`).join("")}</div>`) : ""}${methodology(w)}`;
}
export function renderCaseQueue(id, state, base) {
  const model = operationalDetail(id, state, base.rows),
    all = model.tasks,
    done = new Set(state.completedCases || []),
    filter = state.caseFilter || "all",
    tasks = all.filter(
      (t) =>
        filter === "all" ||
        (filter === "pending" ? !done.has(t.key) : done.has(t.key)),
    ),
    current = tasks.find((t) => t.key === state.caseId) || tasks[0],
    checks = state.caseChecks || {};
  const kpis = [
    ["전체 작업", `${all.length}건`, "현재 분석 조건"],
    [
      "확인 완료",
      `${all.filter((t) => done.has(t.key)).length}건`,
      "화면 내 검토 기록",
    ],
    [
      "남은 작업",
      `${all.filter((t) => !done.has(t.key)).length}건`,
      "확인 항목 대조 필요",
    ],
    [
      "우선 확인",
      `${all.filter((t) => t.priority === "우선" && !done.has(t.key)).length}건`,
      "미완료 작업 중",
    ],
  ];
  return `${metrics(kpis)}<div class="ops-queue-bar"><span>${esc(model.workflow.role)} · 검토 기록</span><label>상태<select aria-label="작업 상태" data-case-filter>${[
    ["all", "전체"],
    ["pending", "미완료"],
    ["complete", "완료"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${filter === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></label></div><div class="ops-queue-layout"><div class="ops-case-list" role="group" aria-label="검토 작업 목록">${tasks.length ? tasks.map((t) => `<button data-ops-case="${esc(t.key)}" aria-pressed="${current.key === t.key}"><span><i>${done.has(t.key) ? "완료" : esc(t.priority)}</i><small>${esc(t.target)}</small></span><b>${esc(t.issue)}</b><span><small>${esc(t.owner)}</small><small>${esc(t.due)}</small></span></button>`).join("") : '<div class="ops-empty"><b>해당 상태의 작업이 없습니다.</b><p>상태 필터를 바꾸면 전체 작업을 볼 수 있습니다.</p></div>'}</div>${current ? box(current.issue, current.target, `<p class="ops-case-evidence">${esc(current.evidence)}</p><div class="ops-next-action"><span>확인 후 진행할 작업</span><p>${esc(current.next)}</p></div><fieldset class="ops-checklist"><legend>확인 항목</legend>${current.checks.map((text, i) => `<label><input type="checkbox" data-case-check="${i}" data-case-key="${esc(current.key)}" ${checks[current.key]?.includes(i) ? "checked" : ""} ${done.has(current.key) ? "disabled" : ""}/><span>${esc(text)}</span></label>`).join("")}</fieldset><button class="ops-action" data-case-complete="${esc(current.key)}" ${!done.has(current.key) && !current.checks.every((_, i) => checks[current.key]?.includes(i)) ? "disabled" : ""}>${done.has(current.key) ? "검토 다시 열기" : "확인 완료 기록"}</button><p class="ops-note">확인 항목을 모두 대조하면 완료를 기록할 수 있습니다. 기록은 이 화면에서만 유지됩니다.</p>`, "ops-case-detail") : ""}</div>${methodology(model.workflow)}`;
}
export function operationalExport(id, state, base) {
  if ((state.view || "evidence") === "overview") return base.rows;
  const m = operationalDetail(id, state, base.rows);
  if (state.view === "tasks")
    return m.tasks
      .filter((t) =>
        state.caseFilter === "pending"
          ? !state.completedCases?.includes(t.key)
          : state.caseFilter === "complete"
            ? state.completedCases?.includes(t.key)
            : true,
      )
      .map((t) => ({
        작업: t.key,
        대상: t.target,
        사유: t.issue,
        근거: t.evidence,
        후속작업: t.next,
        상태: state.completedCases?.includes(t.key) ? "완료" : "미완료",
      }));
  if (id === "vacancy") {
    const c = Number(state.cluster || 0);
    return VACANCY.regions
      .filter((r) => r.cluster === c)
      .map((r) => ({
        구역: r.id,
        유형: VACANCY.clusters[c].name,
        구간: r.split,
        관측빈집률: r.observed,
        예측빈집률: r.prediction,
        ...Object.fromEntries(
          VACANCY.features.map((f, i) => [
            `${f.name} (${f.unit})`,
            r.values[i],
          ]),
        ),
      }));
  }
  return m.records.map((r) =>
    Object.fromEntries(m.columns.map((h, i) => [h, r.cells[i]])),
  );
}
function regionScatter(cluster, region) {
  const X = 48,
    Y = 20,
    W = 450,
    H = 265,
    xmax = 700,
    ymax = 100;
  let s = `<svg viewBox="0 0 540 350" role="img" aria-label="지역별 노령화지수와 노후 건물 비율 분포"><text x="48" y="13" class="a-axis">노후 건물 비율 %</text>`;
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = Y + H - (v / 100) * H;
    s += `<line x1="${X}" x2="${X + W}" y1="${y}" y2="${y}" class="a-gridline"/><text x="${X - 8}" y="${y + 4}" text-anchor="end" class="a-axis">${v}</text>`;
  });
  [0, 200, 400, 600].forEach((v) => {
    s += `<text x="${X + (v / xmax) * W}" y="${Y + H + 22}" text-anchor="middle" class="a-axis">${v}</text>`;
  });
  s +=
    '<text x="498" y="337" text-anchor="end" class="a-axis">노령화지수 · 유소년 100명당 고령인구</text>';
  for (const r of VACANCY.regions) {
    const x = X + (Math.min(xmax, r.values[3]) / xmax) * W,
      y = Y + H - (r.values[5] / ymax) * H,
      active = r.cluster === cluster;
    s += `<circle cx="${x}" cy="${y}" r="${r.id === region.id ? 6 : active ? 3 : 2}" fill="${active ? "var(--tone-950)" : "var(--tone-300)"}" opacity="${active ? 0.7 : 0.35}" ${r.id === region.id ? 'stroke="var(--accent)" stroke-width="3"' : ""}/>`;
  }
  return s + "</svg>";
}
function renderVacancy(state) {
  const cluster =
      VACANCY.clusters[Number(state.cluster || 0)] || VACANCY.clusters[0],
    featureIndex = Number(state.feature ?? cluster.importance[0].feature),
    feature = VACANCY.features[featureIndex] || VACANCY.features[0],
    regions = VACANCY.regions.filter((r) => r.cluster === cluster.id),
    region =
      regions.find((r) => r.id === state.region) ||
      [...regions].sort((a, b) => b.prediction - a.prediction)[0],
    bins = cluster.effects[featureIndex],
    maxImportance = Math.max(
      ...cluster.importance.map((x) => Math.abs(x.mean)),
      0.001,
    );
  const cards = `<div class="ops-clusters" role="group" aria-label="지역 군집 선택">${VACANCY.clusters.map((c) => `<button data-vacancy-cluster="${c.id}" aria-pressed="${c.id === cluster.id}"><span>CLUSTER 0${c.id + 1}<b>${c.n}개 구역</b></span><strong>${esc(c.name)}</strong><small>${esc(c.desc)}</small></button>`).join("")}</div>`;
  const ranks = `<div class="ops-importance"><div class="ops-importance-label"><span>변수</span><span>검증 MAE 증가 · %p</span></div>${cluster.importance.map((f, i) => `<button data-vacancy-feature="${f.feature}" aria-pressed="${f.feature === featureIndex}" title="${esc(VACANCY.features[f.feature].name)} · 평균 ${f.mean.toFixed(3)}%p, 반복 표준편차 ${f.std.toFixed(3)}%p"><span>${String(i + 1).padStart(2, "0")}</span><div><b>${esc(VACANCY.features[f.feature].name)}</b><i style="width:${(Math.abs(f.mean) / maxImportance) * 100}%"></i></div><strong>${f.mean.toFixed(3)}</strong></button>`).join("")}</div><p class="ops-note">검증 자료에서 변수를 섞었을 때의 오차 증가입니다. 영향 방향이나 인과관계를 의미하지 않습니다.</p>`;
  const importance = cluster.importance.find((x) => x.feature === featureIndex);
  const method = {
    unit: "합성 소지역 × 기준 연도",
    version: "regional-vacancy v1.0",
    methods: [
      [
        "지역 유형 분류",
        `인구·토지·주거·접근성 변수 ${VACANCY.clusterFeatures.length}개를 표준화하고 K-means 3개 군집으로 분류했습니다. 군집 이름은 중심 특성에 따라 붙였습니다. 빈집률은 군집 입력에서 제외했습니다.`,
      ],
      [
        "예측과 변수 중요도",
        `합성 구역 ${VACANCY.trainN}개로 Random Forest를 학습하고 남은 ${VACANCY.testN}개에서 검증했습니다. 각 군집의 검증 자료에서 변수별 12회 순열 중요도를 계산했습니다. 실제 지역 검증 성과가 아닙니다.`,
      ],
      [
        "분포와 해석",
        "구간별 빈집률은 서로 다른 지역을 묶은 관측 평균입니다. 특정 변수만 바꾼 인과효과나 개별 건물의 빈집 확률로 해석하지 않습니다. 상관된 변수 사이에는 중요도가 나뉠 수 있습니다.",
      ],
      [
        "자료 결합 기준",
        "지목 면적·인구·건물·사용량의 집계 시점과 공간 경계를 맞춰야 합니다. 경계 변경, 공용 계량기, 유소년 수가 작은 지역의 불안정한 노령화지수는 별도 확인합니다.",
      ],
    ],
  };
  return `<div class="ops-model-intro"><p>지역 군집 → 변수 기여 → 조사 후보</p><h4>같은 빈집이라도 지역 유형에 따라 설명하는 변수가 다릅니다.</h4><span>합성 소지역 600개 · 입력 변수 20개 · 학습과 검증 구간 분리</span></div>${cards}${metrics(
    [
      ["지역 유형", `군집 0${cluster.id + 1}`, cluster.name],
      ["군집 내 구역", `${cluster.n}개`, `검증 ${cluster.testN}개 포함`],
      ["관측 빈집률", `${cluster.rate.toFixed(2)}%`, "합성 구역 평균"],
      ["검증 오차", `${cluster.mae.toFixed(2)}%p`, "군집별 holdout MAE"],
    ],
  )}<div class="ops-grid ops-cluster-main">${box("지역 특성 분포", "선택 군집을 진하게 표시", regionScatter(cluster.id, region) + `<p class="ops-note">600개 합성 구역 · 지리적 위치가 아닌 변수 공간입니다.</p>`)}${box("빈집 예측 영향 변수 TOP 10", "변수를 선택하면 아래 분포가 바뀝니다", ranks)}</div><div class="ops-feature-heading"><div><p>선택 변수 · ${esc(feature.unit)}</p><h4>${esc(feature.name)}</h4></div><span>${importance ? `순열 중요도 ${importance.mean.toFixed(3)} ± ${importance.std.toFixed(3)}%p` : "변수 분포"}</span></div><div class="ops-grid wide-left">${box(
    "변수 구간별 빈집률",
    "선택 군집의 구역을 변수값 5개 구간으로 나눔",
    figure({
      title: feature.name,
      labels: bins.map((b) => `${n(b.lo)}~${n(b.hi)}`),
      series: [
        { name: "관측 평균", values: bins.map((b) => b.observed ?? 0) },
        {
          name: "예측 평균",
          values: bins.map((b) => b.predicted ?? 0),
          dashed: true,
        },
      ],
      unit: "%",
    }),
  )}${box(
    "변수 정의와 비교",
    "단위·분모·선택 구역을 함께 확인",
    facts([
      ["정의", feature.definition],
      ["산식", feature.formula],
      ["전체 중앙값", `${n(VACANCY.allMedians[featureIndex])} ${feature.unit}`],
      ["군집 중앙값", `${n(cluster.medians[featureIndex])} ${feature.unit}`],
      ["선택 구역", `${n(region.values[featureIndex])} ${feature.unit}`],
    ]),
  )}</div>${box(
    "구역별 예측과 조사 우선순위",
    "같은 군집 안에서 비교 · 예측 빈집률 내림차순",
    `<label class="ops-region-picker">구역 선택<select data-vacancy-region aria-label="구역 선택">${[
      ...regions,
    ]
      .sort((a, b) => b.prediction - a.prediction)
      .map(
        (r) =>
          `<option value="${r.id}" ${r.id === region.id ? "selected" : ""}>${esc(r.name)} · ${r.id}</option>`,
      )
      .join("")}</select></label>${table(
      ["구역", "관측 빈집률", "예측 빈집률", feature.name, "자료 구간"],
      [
        region,
        ...[...regions]
          .filter((r) => r.id !== region.id)
          .sort((a, b) => b.prediction - a.prediction)
          .slice(0, 7),
      ].map((r) => ({
        cells: [
          `${r.name} · ${r.id}`,
          `${r.observed.toFixed(2)}%`,
          `${r.prediction.toFixed(2)}%`,
          `${n(r.values[featureIndex])}${feature.unit}`,
          r.split === "test" ? "검증" : "학습",
        ],
      })),
      "군집별 구역 비교",
    )}`,
  )}${methodology(method)}`;
}
