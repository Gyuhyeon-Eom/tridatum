import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFINITIONS,
  mobilityData,
  filtered,
  markets,
  buildings,
  stacks,
  spots,
  districts,
  od,
  sources,
  sum,
  csv,
} from "../assets/js/solutions-data.mjs";
import { renderSolution, solutionModel } from "../assets/js/solutions-view.mjs";
const choices = {
  market: ["all", "도매", "소매"],
  vacancy: ["all", "0", "1", "2"],
  emission: ["all", "1사업장", "2사업장", "3사업장"],
  broadcast: ["all", "0", "1"],
  care: ["all", "D-1", "D-6"],
  mobility: ["all", "weekend"],
  wildlife: ["all", "priority", "pending"],
  voucher: ["all", "음식점", "기타"],
  risk: ["all", ".8", ".9"],
  documents: [undefined],
  warehouse: ["all", "issues"],
  llm: ["30", "60"],
};
test("all twelve workspaces render every filter choice without invalid values", () => {
  assert.equal(DEFINITIONS.length, 12);
  for (const { id } of DEFINITIONS)
    for (const scope of choices[id]) {
      const state = { scope },
        model = solutionModel(id, state),
        markup = renderSolution(id, state);
      assert(model.rows.length > 0, `${id}: empty records`);
      assert(!/NaN|undefined|Infinity/.test(markup), id);
      assert(markup.includes("SAMPLE"), id);
    }
});
test("market period and type filters retain the selected source records", () => {
  for (const scope of choices.market) {
    const rows = filtered("market", { scope });
    assert(rows.every((r) => scope === "all" || r.type === scope));
    for (const period of [6, 8]) {
      const m = period - 1,
        total = sum(rows.map((r) => r.monthly[m]));
      assert(
        renderSolution("market", { scope, period }).includes(
          `${(total / 10000).toFixed(2)}억 원`,
        ),
      );
    }
  }
  assert.equal(
    filtered("market", { scope: "도매" }).length +
      filtered("market", { scope: "소매" }).length,
    markets.length,
  );
});
test("property and equipment selections keep the detail attached to its record", () => {
  for (const r of [buildings[0], buildings[20]]) {
    const html = renderSolution("vacancy", { selected: r.id });
    assert(html.includes(`${r.id} · ${r.name}`));
    assert(html.includes(r.score.toFixed(2)));
  }
  for (const r of [stacks[3], stacks[8]]) {
    const html = renderSolution("emission", {
      selected: r.id,
      channel: "oxygen",
    });
    assert(html.includes(`${r.id} · 산소 농도`));
    assert.equal(r.forecast.length, 48);
    assert(r.forecast.every((v) => v >= 0 && v <= 1));
  }
});
test("care allocation, OD counts and warehouse reconciliation remain consistent", () => {
  districts.forEach((r) => {
    assert.equal(r.need - r.linked, r.waiting);
    assert(r.capacity >= r.linked);
  });
  assert.equal(
    sum(od.map((r) => sum(r))),
    sum(od[0].map((_, j) => sum(od.map((r) => r[j])))),
  );
  sources.forEach((r) => assert.equal(r.input, r.loaded + r.rejected));
  for (const weekend of [true, false]) {
    const d = mobilityData(weekend);
    assert.equal(sum(d.hourly), d.total);
    assert.equal(sum(d.alightings), d.total);
    assert.equal(sum(d.incoming.map((r) => r.value)), d.total);
  }
});
test("document review and CSV export are deterministic and scoped", () => {
  const markup = renderSolution("documents", {
    selected: "DOC-042",
    reviewed: ["DOC-042"],
  });
  assert(markup.includes("일정표 미첨부"));
  assert(markup.includes("확인 표시 해제"));
  const rows = solutionModel("market", { scope: "도매" }).rows;
  const output = csv(rows);
  assert.equal(output.split("\r\n").length, rows.length + 1);
  assert(output.startsWith("\ufeff"));
  assert(csv([{ 문서: 'a,"b"' }]).includes('"a,""b"""'));
});
