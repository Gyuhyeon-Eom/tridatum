import test from "node:test";
import assert from "node:assert/strict";
import {
  operationData,
  modelMetrics,
  policyData,
  monitorData,
  renderDemo,
  ANSWERS,
} from "../assets/js/analytics-view.mjs";

test("region and period filters preserve totals across KPIs, series and table", () => {
  for (const region of [-1, 0, 1, 2])
    for (const period of [6, 12]) {
      const d = operationData({ region, period });
      assert.equal(
        d.total,
        d.rows.reduce((s, r) => s + r.received.reduce((a, b) => a + b, 0), 0),
      );
      assert.equal(
        d.complete,
        d.done.reduce((a, b) => a + b, 0),
      );
      assert.equal(d.pending, d.total - d.complete);
      assert.equal(d.labels.length, period);
      assert.equal(d.received.length, period);
    }
});
test("all model thresholds produce valid confusion matrices and consistent scores", () => {
  for (let model = 0; model < 3; model++) {
    let previous = null;
    for (let threshold = 20; threshold <= 85; threshold += 5) {
      const d = modelMetrics(model, threshold);
      assert.equal(d.tp + d.fp + d.tn + d.fn, 1000);
      for (const v of [d.tp, d.fp, d.tn, d.fn])
        assert(v >= 0 && Number.isInteger(v));
      assert.equal(d.precision, d.tp / (d.tp + d.fp));
      assert.equal(d.recall, d.tp / (d.tp + d.fn));
      assert(Math.abs(d.f1 - (2 * d.tp) / (2 * d.tp + d.fp + d.fn)) < 1e-12);
      if (previous) {
        assert(d.recall <= previous.recall);
        assert(d.precision >= previous.precision);
      }
      previous = d;
    }
  }
});
test("policy change difference agrees with displayed before/after means", () => {
  for (const segment of [0, 1, 2]) {
    const d = policyData(segment);
    assert.equal(d.effect, d.afterT - d.beforeT - (d.afterC - d.beforeC));
    assert.equal(d.treated.length, d.control.length);
  }
});
test("monitoring totals agree with the visible time window records", () => {
  for (const window of [30, 60]) {
    const d = monitorData(window);
    assert.equal(
      d.tokens,
      d.requests.reduce((s, r) => s + r.tokens, 0),
    );
    assert.equal(d.ok, d.requests.filter((r) => r.status === "정상").length);
    for (const r of d.requests) {
      const [h, m] = r.time.split(":").map(Number);
      assert(14 * 60 + 32 - (h * 60 + m) <= window);
    }
  }
});
test("each sample answer renders its own question and source", () => {
  ANSWERS.forEach((answer, query) => {
    const output = renderDemo(3, { query });
    assert(output.includes(answer.q));
    assert(output.includes(answer.source));
    assert(output.includes(answer.excerpt));
  });
  for (let i = 0; i < 5; i++) {
    const output = renderDemo(i);
    assert(output.includes("SAMPLE"));
    assert(!/NaN|undefined|Infinity/.test(output));
  }
});
