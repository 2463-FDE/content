// Static regression checks for the Week 1-2 curriculum-currency slice.
// No network or provider calls. Run: node docs/curriculum-currency-qa.mjs
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let failures = 0;
const ok = (name, condition, detail = "") => {
  console.log(`${condition ? "  ok   " : "  FAIL "}${name}${condition || !detail ? "" : `\n        ${detail}`}`);
  if (!condition) failures++;
};
const load = (path) => readFile(join(ROOT, path), "utf8");
const approx = (actual, expected) => Math.abs(actual - expected) < 1e-9;

const weekPaths = [
  ...["d1", "d2a", "d2b", "d3a", "d3b", "d4a", "d4b", "d5"].map((d) => `weeks/w01/${d}.html`),
  ...[1, 2, 3, 4, 5].map((d) => `weeks/w02/w02d${d}.html`),
];
const weekFiles = await Promise.all(weekPaths.map(async (path) => [path, await load(path)]));
const allWeeks = weekFiles.map(([, text]) => text).join("\n");

console.log("obsolete current labels");
const obsolete = [
  /GPT-5\.5/i,
  /GPT-5 line/i,
  /Opus 4\.8/i,
  /Sonnet 4\.6/i,
  /Gemini 3\.5 Flash/i,
  /claude-sonnet-4-6-v1/i,
  /as of\s*<span class="nowrap">June 2026/i,
];
for (const pattern of obsolete) {
  ok(`W1-W2 omit ${pattern}`, !pattern.test(allWeeks));
}

console.log("price table and worked calculations");
const d1 = await load("weeks/w01/d1.html");
const d2a = await load("weeks/w01/d2a.html");
const d4a = await load("weeks/w01/d4a.html");
const interactive = await load("assets/js/interactive.js");
const requiredPriceRows = [
  "Fable 5.1  $10 / $50", "Opus 5.5  $4 / $20", "Sonnet 5  $2 / $10", "Haiku 4.5  $1 / $5",
  "GPT-6 Astra $10 / $50", "GPT-6 Sol $2 / $10", "GPT-6 Luna $0.10 / $0.50",
  "Gemini 3.8 Flash $0.75 / $3.75",
];
for (const row of requiredPriceRows) ok(`table includes ${row}`, d2a.includes(row));
ok("cost widget defaults to Sonnet 5 input", /c-pin[^>]+value="2"/.test(interactive));
ok("cost widget defaults to Sonnet 5 output", /c-pout[^>]+value="10"/.test(interactive));

const priceIn = 2 / 1_000_000;
const priceOut = 10 / 1_000_000;
const d1Call = 4_800 * priceIn + 400 * priceOut;
const d4Call = 5_800 * priceIn + 400 * priceOut;
const d4Cached = (1_300 + 4_500 * 0.1) * priceIn + 400 * priceOut;
ok("D1 arithmetic is $0.0136/call and $680/day", approx(d1Call, 0.0136) && d1.includes("$680/day"));
ok("D1 history line is $120/day", approx(1_200 * priceIn * 50_000, 120) && d1.includes("$120/day"));
ok("D4 arithmetic is $0.0156/call and $624/day", approx(d4Call, 0.0156) && d4a.includes("$0.0156 / turn") && d4a.includes("$624/day"));
ok("D4 cached steady state is $0.0075/call", approx(d4Cached, 0.0075) && d4a.includes("$0.0075"));
ok("D4 caching saves $324/day", approx((d4Call - d4Cached) * 40_000, 324) && d4a.includes("$324/day"));

console.log("model IDs and routing note");
ok("Haiku US inference profile retained", allWeeks.includes("us.anthropic.claude-haiku-4-5-20251001-v1:0"));
ok("Sonnet 5 US inference profile taught", allWeeks.includes("us.anthropic.claude-sonnet-5"));
ok("trainer note preserves cross-Region nuance", allWeeks.includes("can route across US Regions") && allWeeks.includes("do not guess a prefix"));

console.log("W1 research coverage");
const researchDays = ["d1", "d2a", "d2b", "d3a", "d3b", "d4a", "d4b", "d5"];
for (const day of researchDays) {
  const path = `docs/research/w01/${day}.md`;
  try {
    await access(join(ROOT, path), constants.R_OK);
    const text = await load(path);
    const claims = text.match(/## Claims[\s\S]*?(?=\n## )/)?.[0] || "";
    const bullets = claims.split("\n").filter((line) => line.startsWith("- "));
    ok(`${path} follows research contract`, /version-stamps:/.test(text) && /2026-09-25/.test(text) && /## Sources/.test(text) && bullets.length > 0 && bullets.every((line) => /https:\/\//.test(line)));
  } catch (error) {
    ok(`${path} exists`, false, String(error));
  }
}

console.log("inline-script syntax");
for (const [path, html] of weekFiles) {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  let syntaxError = "";
  try {
    for (const source of scripts) new vm.Script(source, { filename: path });
  } catch (error) {
    syntaxError = String(error);
  }
  ok(`${path} inline scripts parse`, !syntaxError, syntaxError);
}

if (failures) {
  console.error(`\n${failures} curriculum-currency check(s) failed`);
  process.exit(1);
}
console.log("\nAll curriculum-currency checks passed");
