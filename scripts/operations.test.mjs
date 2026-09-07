import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFINITIONS,
  filtered,
  stacks,
  districts,
  monitorData,
  sum,
} from "../assets/js/solutions-data.mjs";
import {
  GROUPS,
  operationalDetail,
  careAllocation,
  sensorWindows,
  traceDetail,
  qualityBreakdown,
} from "../assets/js/operations-models.mjs";
import { renderSolution, solutionModel } from "../assets/js/solutions-view.mjs";
import { operationalExport } from "../assets/js/operations-view.mjs";
import { VACANCY } from "../assets/js/vacancy-regions.mjs";
const scopes = {
  market: ["all", "도매", "소매"],
  vacancy: ["all", "0", "1", "2"],
  emission: ["all", "1사업장", "2사업장", "3사업장"],
  broadcast: ["all", "0", "1"],
  care: ["all", "D-1", "D-6"],
  mobility: ["all", "weekend"],
  wildlife: ["all", "priority", "pending"],
  voucher: ["all", "음식점", "기타"],
  risk: ["all", ".8", ".9"],
  documents: ["all"],
  warehouse: ["all", "issues"],
  llm: ["30", "60"],
};
test("four groups cover each domain once and all views handle every filter", () => {
  const ids = GROUPS.flatMap((g) => g.members);
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  assert.deepEqual(ids.slice().sort(), DEFINITIONS.map((d) => d.id).sort());
  for (const d of DEFINITIONS)
    for (const scope of scopes[d.id])
      for (const mode of [
        { view: "overview" },
        { view: "evidence" },
        { view: "evidence", detailPage: "records" },
        { view: "evidence", detailPage: "rules" },
        { view: "tasks" },
      ]) {
        const html = renderSolution(d.id, { scope, ...mode });
        assert(
          !/NaN|undefined|Infinity/.test(html),
          `${d.id}/${scope}/${mode.view}/${mode.detailPage || "analysis"}`,
        );
        assert(html.includes('role="tabpanel"'));
        assert(html.includes("SAMPLE"));
      }
});
test("market and voucher ledgers reconcile for all periods and filters", () => {
  for (const id of ["market", "voucher"])
    for (const scope of scopes[id])
      for (const period of [6, 8]) {
        const state = { scope, period },
          m = operationalDetail(id, state, filtered(id, state));
        for (const row of m.audit) {
          assert.equal(
            row.gross - row.cancel,
            id === "market" ? row.net : row.amount,
          );
          if (id === "voucher")
            assert.equal(
              row.localAmount + row.outside + row.unknown,
              row.amount,
            );
          else assert(row.shared <= row.stores);
        }
      }
});
test("care allocation conserves demand, capacity and unmatched service types", () => {
  for (const r of districts) {
    const a = careAllocation(r);
    assert.equal(sum(a.map((x) => x.need)), r.waiting);
    assert.equal(sum(a.map((x) => x.capacity)), r.capacity - r.linked);
    for (const x of a) {
      assert.equal(x.need, x.assigned + x.residual);
      assert.equal(x.capacity, x.assigned + x.unused);
      assert(x.assigned <= x.accessible);
      assert(x.accessible <= x.capacity);
    }
  }
});
test("sensor exclusions preserve all expected minute records", () => {
  for (const r of stacks)
    for (const w of sensorWindows(r)) {
      assert.equal(w.valid + w.missing + w.calibration, 30);
      assert.equal(w.included, w.valid >= 24);
    }
  assert(sensorWindows(stacks[8]).some((w) => w.missing > 0 && !w.included));
});
test("quality reasons follow selected source filters; spans include timeout waiting", () => {
  for (const scope of scopes.warehouse) {
    const rows = filtered("warehouse", { scope });
    assert.equal(
      sum(qualityBreakdown(rows).map((x) => x.count)),
      sum(rows.map((x) => x.rejected)),
    );
  }
  for (const r of monitorData(60).requests) {
    const t = traceDetail(r);
    assert.equal(sum(t.spans.map((x) => x.duration)), r.duration);
    assert.equal(t.input + t.output, r.tokens);
    assert.equal(t.ttft, sum(r.parts.slice(0, 3)));
    for (let i = 1; i < t.spans.length; i++)
      assert.equal(
        t.spans[i].start,
        t.spans[i - 1].start + t.spans[i - 1].duration,
      );
  }
});
test("regional clusters, held-out errors and ten-variable rankings agree with fixture records", () => {
  assert.equal(VACANCY.regions.length, 600);
  assert.equal(new Set(VACANCY.regions.map((r) => r.id)).size, 600);
  assert.equal(VACANCY.features.length, 20);
  assert.equal(
    VACANCY.regions.filter((r) => r.split === "test").length,
    VACANCY.testN,
  );
  for (const c of VACANCY.clusters) {
    const rows = VACANCY.regions.filter((r) => r.cluster === c.id),
      holdout = rows.filter((r) => r.split === "test");
    assert.equal(rows.length, c.n);
    assert.equal(holdout.length, c.testN);
    const mae =
      sum(holdout.map((r) => Math.abs(r.observed - r.prediction))) /
      holdout.length;
    assert(Math.abs(mae - c.mae) < 0.001);
    assert.equal(c.importance.length, 10);
    assert.equal(new Set(c.importance.map((f) => f.feature)).size, 10);
    for (let i = 1; i < 10; i++)
      assert(c.importance[i].mean <= c.importance[i - 1].mean);
    for (const bins of c.effects) assert.equal(sum(bins.map((b) => b.n)), c.n);
    for (const f of c.importance) {
      const html = renderSolution("vacancy", {
        view: "evidence",
        cluster: c.id,
        feature: f.feature,
      });
      assert(html.includes(VACANCY.features[f.feature].name));
      assert(!/NaN|undefined|Infinity/.test(html));
    }
  }
});
test("case checklists gate completion and CSV reflects view, filter and completion", () => {
  const base = solutionModel("market", {}),
    model = operationalDetail("market", {}, base.rows),
    first = model.tasks[0];
  const empty = renderSolution("market", { view: "tasks" });
  assert(empty.includes(`data-case-complete="${first.key}" disabled`));
  const ready = renderSolution("market", {
    view: "tasks",
    caseChecks: { [first.key]: [0, 1, 2] },
  });
  assert(!ready.includes(`data-case-complete="${first.key}" disabled`));
  const state = {
    view: "tasks",
    completedCases: [first.key],
    caseFilter: "complete",
  };
  const csv = operationalExport("market", state, base);
  assert.equal(csv.length, 1);
  assert.equal(csv[0].작업, first.key);
  assert.equal(csv[0].상태, "완료");
  const records = operationalExport(
    "vacancy",
    { view: "evidence", cluster: 2 },
    solutionModel("vacancy", {}),
  );
  assert.equal(records.length, VACANCY.clusters[2].n);
  assert(records.every((r) => r.유형 === VACANCY.clusters[2].name));
});
test("narrowing a scope does not rewrite synthetic source ledger values", () => {
  for (const id of ["market", "voucher"]) {
    const all = operationalDetail(id, {}, filtered(id, {})).audit;
    for (const scope of scopes[id])
      for (const r of operationalDetail(id, { scope }, filtered(id, { scope }))
        .audit)
        assert.deepEqual(
          r,
          all.find((x) => x.id === r.id),
        );
  }
});
