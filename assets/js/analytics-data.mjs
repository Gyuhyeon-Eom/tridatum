import SAMPLE from "./analysis-samples.mjs?v=20260907s3";
export { SAMPLE };
export const sum = (values) => values.reduce((s, v) => s + v, 0);
export const mean = (values) => sum(values) / values.length;
export const quantile = (values, p) => {
  const s = [...values].sort((a, b) => a - b),
    t = (s.length - 1) * p,
    i = Math.floor(t);
  return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (t - i);
};
export const extent = (values) => [Math.min(...values), Math.max(...values)];
export function rng(seed = 42) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function histogram(values, edges) {
  return edges
    .slice(0, -1)
    .map((v, i) => ({
      label: `${v}–${edges[i + 1]}`,
      n: values.filter(
        (x) =>
          x >= v &&
          (i === edges.length - 2 ? x <= edges[i + 1] : x < edges[i + 1]),
      ).length,
      lo: v,
      hi: edges[i + 1],
    }));
}
export const REGIONS = ["권역 A", "권역 B", "권역 C", "권역 D"];
export function operationData(state = {}) {
  const period = Number(state.period) || 12,
    region = Number(state.region ?? -1);
  const rows = SAMPLE.observations.filter(
      (r) => (region < 0 || r[1] === region) && r[2] > 12 - period,
    ),
    unique = [...new Map(rows.map((r) => [r[0], r])).values()];
  const valid = unique.filter((r) => r[3] !== null),
    values = valid.map((r) => r[3]),
    q1 = quantile(values, 0.25),
    q3 = quantile(values, 0.75),
    cut = q3 + 1.5 * (q3 - q1);
  const months = Array.from({ length: period }, (_, i) => 13 - period + i);
  return {
    period,
    region,
    rows,
    unique,
    valid,
    values,
    total: rows.length,
    duplicates: rows.length - unique.length,
    missing: unique.length - valid.length,
    median: quantile(values, 0.5),
    q1,
    q3,
    cut,
    outliers: values.filter((v) => v > cut).length,
    labels: months.map((m) => `${m}월`),
    trend: months.map((m) => {
      const v = valid.filter((r) => r[2] === m).map((r) => r[3]);
      return {
        median: quantile(v, 0.5),
        q1: quantile(v, 0.25),
        q3: quantile(v, 0.75),
        n: v.length,
      };
    }),
    hist: histogram(
      values,
      Array.from({ length: 13 }, (_, i) => i * 50),
    ),
    regions: REGIONS.map((name, i) => {
      const all = unique.filter((r) => r[1] === i),
        v = all.filter((r) => r[3] !== null).map((r) => r[3]);
      return {
        name,
        n: all.length,
        missing: all.length - v.length,
        median: v.length ? quantile(v, 0.5) : 0,
      };
    }).filter((r) => r.n),
  };
}
export const MODELS = SAMPLE.models.items.map((m) => m.name);
export function modelMetrics(model = 0, threshold = 35) {
  const index = Number(model),
    t = Number(threshold) / 100,
    labels = SAMPLE.models.labels,
    scores = SAMPLE.models.items[index].scores;
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  labels.forEach((y, i) => {
    if (scores[i] >= t) {
      y ? tp++ : fp++;
    } else {
      y ? fn++ : tn++;
    }
  });
  const precision = tp + fp ? tp / (tp + fp) : 1,
    recall = tp / (tp + fn),
    f1 = (2 * tp) / (2 * tp + fp + fn);
  return {
    model: index,
    threshold: Number(threshold),
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    f1,
    flagged: tp + fp,
    prevalence: mean(labels),
    ap: SAMPLE.models.items[index].ap,
    n: labels.length,
  };
}
export function prData(model = 0) {
  const scores = SAMPLE.models.items[model].scores,
    labels = SAMPLE.models.labels,
    positive = sum(labels);
  const sorted = scores
    .map((s, i) => ({ s, y: labels[i] }))
    .sort((a, b) => b.s - a.s);
  let tp = 0,
    fp = 0,
    curve = [{ x: 0, y: 1 }],
    ap = 0,
    oldRecall = 0;
  sorted.forEach((p, i) => {
    p.y ? tp++ : fp++;
    if (i === sorted.length - 1 || sorted[i + 1].s !== p.s) {
      const recall = tp / positive,
        precision = tp / (tp + fp);
      ap += (recall - oldRecall) * precision;
      oldRecall = recall;
      curve.push({ x: recall, y: precision });
    }
  });
  return { curve, ap };
}
export function calibrationData(model = 0) {
  const scores = SAMPLE.models.items[model].scores,
    labels = SAMPLE.models.labels;
  return Array.from({ length: 10 }, (_, b) => {
    const ids = scores
      .map((s, i) => ({ s, i }))
      .filter(
        (p) => p.s >= b / 10 && (b === 9 ? p.s <= 1 : p.s < (b + 1) / 10),
      );
    return {
      x: ids.length ? mean(ids.map((p) => p.s)) : 0,
      y: ids.length ? mean(ids.map((p) => labels[p.i])) : 0,
      n: ids.length,
      bin: `${(b / 10).toFixed(1)}–${((b + 1) / 10).toFixed(1)}`,
    };
  }).filter((d) => d.n);
}
export function scoreDistribution(model = 0) {
  return [0, 1].map((label) =>
    Array.from(
      { length: 10 },
      (_, b) =>
        SAMPLE.models.labels.filter(
          (y, i) =>
            y === label &&
            SAMPLE.models.items[model].scores[i] >= b / 10 &&
            (b === 9
              ? SAMPLE.models.items[model].scores[i] <= 1
              : SAMPLE.models.items[model].scores[i] < (b + 1) / 10),
        ).length,
    ),
  );
}
const policyCache = new Map();
export function policyData(segment = 0, level = 95) {
  const key = `${segment}:${level}`;
  if (policyCache.has(key)) return policyCache.get(key);
  const units = SAMPLE.policy.filter(
      (r) => Number(segment) === 0 || r.segment === Number(segment) - 1,
    ),
    groups = [units.filter((u) => u.treated), units.filter((u) => !u.treated)];
  const averages = groups.map((g) =>
    Array.from({ length: 12 }, (_, m) => mean(g.map((u) => u.values[m]))),
  );
  const delta = (u) => mean(u.values.slice(6)) - mean(u.values.slice(0, 6));
  const changes = groups.map((g) => g.map(delta));
  const effect = mean(changes[0]) - mean(changes[1]);
  const event = Array.from(
    { length: 12 },
    (_, m) =>
      averages[0][m] - averages[1][m] - (averages[0][5] - averages[1][5]),
  );
  const random = rng(973 + Number(segment)),
    boot = [],
    eventBoot = Array.from({ length: 12 }, () => []);
  for (let b = 0; b < 800; b++) {
    const samples = groups.map((g) =>
      Array.from(
        { length: g.length },
        () => g[Math.floor(random() * g.length)],
      ),
    );
    boot.push(mean(samples[0].map(delta)) - mean(samples[1].map(delta)));
    for (let m = 0; m < 12; m++)
      eventBoot[m].push(
        mean(samples[0].map((u) => u.values[m] - u.values[5])) -
          mean(samples[1].map((u) => u.values[m] - u.values[5])),
      );
  }
  const alpha = (1 - Number(level) / 100) / 2;
  const ci = [quantile(boot, alpha), quantile(boot, 1 - alpha)];
  const d = {
    units,
    groups,
    treated: averages[0],
    control: averages[1],
    effect,
    ci,
    level: Number(level),
    events: event.map((v, i) => ({
      label: i < 6 ? `${i - 6}` : `+${i - 5}`,
      value: v,
      lo: quantile(eventBoot[i], alpha),
      hi: quantile(eventBoot[i], 1 - alpha),
    })),
    beforeT: mean(averages[0].slice(0, 6)),
    afterT: mean(averages[0].slice(6)),
    beforeC: mean(averages[1].slice(0, 6)),
    afterC: mean(averages[1].slice(6)),
  };
  policyCache.set(key, d);
  return d;
}
export function monitorData(window = 60) {
  const requests = SAMPLE.traces.filter((r) => r.minute > 60 - Number(window)),
    durations = requests.map((r) => r.duration),
    steps = Number(window) / 5;
  const buckets = Array.from({ length: steps }, (_, i) => {
    const lo = 60 - Number(window) + i * 5,
      rows = requests.filter((r) => r.minute > lo && r.minute <= lo + 5),
      v = rows.map((r) => r.duration);
    return {
      label: `${String(13 + Math.floor((lo + 5) / 60)).padStart(2, "0")}:${String((lo + 5) % 60).padStart(2, "0")}`,
      n: rows.length,
      p50: quantile(v, 0.5),
      p95: quantile(v, 0.95),
      errors: rows.filter((r) => r.error).length,
    };
  });
  return {
    requests,
    ok: requests.filter((r) => !r.error).length,
    tokens: sum(requests.map((r) => r.tokens)),
    p50: quantile(durations, 0.5),
    p95: quantile(durations, 0.95),
    p99: quantile(durations, 0.99),
    buckets,
    hist: histogram(
      durations,
      Array.from({ length: 11 }, (_, i) => i * 500),
    ),
  };
}
