import test from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE,
  sum,
  operationData,
  modelMetrics,
  prData,
  calibrationData,
  scoreDistribution,
  policyData,
  monitorData,
} from "../assets/js/analytics-data.mjs";
import {
  renderDemo,
  renderDetail,
  detailContent,
  ANSWERS,
} from "../assets/js/analytics-view.mjs";
const approx = (a, b, t = 1e-8) => assert(Math.abs(a - b) < t, `${a} != ${b}`);
test("observation filters preserve unique, missing and histogram counts", () => {
  for (const region of [-1, 0, 1, 2, 3])
    for (const period of [6, 12]) {
      const d = operationData({ region, period });
      assert.equal(d.total, d.unique.length + d.duplicates);
      assert.equal(d.unique.length, d.valid.length + d.missing);
      assert.equal(sum(d.hist.map((b) => b.n)), d.valid.length);
      assert.equal(sum(d.regions.map((r) => r.n)), d.unique.length);
      assert.equal(d.trend.length, period);
      assert(d.q1 <= d.median && d.median <= d.q3);
    }
});
test("held-out predictions yield exact confusion counts and reference AP", () => {
  for (let model = 0; model < 3; model++) {
    approx(prData(model).ap, SAMPLE.models.items[model].ap, 1e-7);
    let previous = Infinity;
    for (let threshold = 5; threshold <= 95; threshold += 5) {
      const d = modelMetrics(model, threshold);
      assert.equal(d.tp + d.fp + d.fn + d.tn, 1000);
      assert.equal(d.tp + d.fn, sum(SAMPLE.models.labels));
      assert.equal(d.flagged, d.tp + d.fp);
      assert(d.flagged <= previous);
      previous = d.flagged;
      approx(d.recall, d.tp / (d.tp + d.fn));
      approx(d.f1, (2 * d.tp) / (2 * d.tp + d.fp + d.fn));
    }
  }
});
test("calibration and score distributions retain all evaluation records", () => {
  for (let m = 0; m < 3; m++) {
    const bins = calibrationData(m),
      scores = scoreDistribution(m);
    assert.equal(sum(bins.map((b) => b.n)), 1000);
    approx(sum(bins.map((b) => b.y * b.n)), sum(SAMPLE.models.labels));
    assert.equal(sum(scores[0]) + sum(scores[1]), 1000);
    assert.equal(sum(scores[1]), sum(SAMPLE.models.labels));
  }
});
test("panel estimates, bootstrap intervals and reference month agree", () => {
  for (let segment = 0; segment < 3; segment++) {
    const d = policyData(segment, 95),
      narrow = policyData(segment, 90);
    approx(d.effect, d.afterT - d.beforeT - (d.afterC - d.beforeC));
    assert(d.ci[0] < d.effect && d.effect < d.ci[1]);
    assert(narrow.ci[0] >= d.ci[0] && narrow.ci[1] <= d.ci[1]);
    assert.equal(d.events.length, 12);
    approx(d.events[5].value, 0);
    approx(d.events[5].lo, 0);
    approx(d.events[5].hi, 0);
    assert.equal(d.units.length, segment ? 40 : 80);
  }
});
test("request totals, percentiles, histograms and trace stages share records", () => {
  for (const window of [30, 60]) {
    const d = monitorData(window);
    assert.equal(d.requests.length, sum(d.buckets.map((b) => b.n)));
    assert.equal(d.requests.length, sum(d.hist.map((b) => b.n)));
    assert.equal(d.tokens, sum(d.requests.map((r) => r.tokens)));
    assert(d.p50 <= d.p95 && d.p95 <= d.p99);
    d.requests
      .filter((r) => !r.error)
      .forEach((r) => assert.equal(sum(r.parts), r.duration));
    assert(d.requests.every((r) => r.minute > 60 - window));
  }
});
test("all five workspaces and fifteen detail views render finite results", () => {
  const keys = [
    ["coverage", "outliers", "profile"],
    ["calibration", "scores", "importance"],
    ["events", "groups", "summary"],
    ["sources", "fields", "audit"],
    ["distribution", "errors", "trace"],
  ];
  keys.forEach((ks, i) => {
    const s = renderDemo(i);
    assert(s.includes("SAMPLE"));
    assert(!/NaN|undefined|Infinity/.test(s));
    ks.forEach((k) => {
      const html = renderDetail(i, k);
      assert(html.includes("detail-title"));
      assert(!/NaN|undefined|Infinity/.test(html));
    });
  });
  ANSWERS.forEach((a, query) => {
    const html = renderDemo(3, { query });
    assert(html.includes(a.excerpt));
    assert(html.includes(a.source));
  });
});
