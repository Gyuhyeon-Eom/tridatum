// Run after editing analytics-view.mjs. The committed HTML needs no build server.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  renderDemo,
  renderVariants,
  renderService,
} from "../assets/js/analytics-view.mjs";
const root = new URL("../", import.meta.url);
const tech = [
  ["Tableau", "웹 대시보드", "PostgreSQL", "Airflow"],
  ["Python", "scikit-learn", "PyTorch", "SHAP"],
  ["Python", "statsmodels", "GeoPandas", "QGIS"],
  ["RAG", "Elasticsearch", "문서 파싱", "오픈소스 LLM"],
  ["Grafana", "Prometheus", "Langfuse", "Docker"],
];
const stage = `<div class="demo-stage">${tech.map((tools, i) => `<div class="demo-slide ${i === 0 ? "on" : ""}"><div class="analytics" data-demo="${i}">${renderDemo(i)}</div><p class="a-sr demo-status" role="status"></p><div class="tagrow demo-tech"><span class="lab">구현에 활용하는 기술</span>${tools.map((t) => `<span class="chip">${t}</span>`).join("")}</div>${renderVariants(i)}</div>`).join("")}</div>`;
let file = new URL("index.html", root),
  text = readFileSync(file, "utf8");
text = text.replace(
  /<!-- ANALYTICS:START -->[\s\S]*?<!-- ANALYTICS:END -->/,
  `<!-- ANALYTICS:START -->\n${stage}\n<!-- ANALYTICS:END -->`,
);
writeFileSync(file, text);
file = new URL("services.html", root);
text = readFileSync(file, "utf8");
for (const i of [2, 1, 3])
  text = text.replace(
    new RegExp(
      `<!-- SERVICE:${i}:START -->[\\s\\S]*?<!-- SERVICE:${i}:END -->`,
    ),
    `<!-- SERVICE:${i}:START -->\n${renderService(i)}\n<!-- SERVICE:${i}:END -->`,
  );
writeFileSync(file, text);
console.log(
  "Rendered five dashboards, fifteen variations and three service previews.",
);
