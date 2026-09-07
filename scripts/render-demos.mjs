// Run after editing analytics-view.mjs. The committed HTML needs no build server.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderShowcase, renderServicePreview } from "../assets/js/solutions-view.mjs";
const root = new URL("../", import.meta.url);
const stage = renderShowcase();
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
    `<!-- SERVICE:${i}:START -->\n${renderServicePreview(i)}\n<!-- SERVICE:${i}:END -->`,
  );
writeFileSync(file, text);
console.log(
  "Rendered twelve operational workspaces and three service previews.",
);
