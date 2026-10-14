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
const requiredPriceRows = [
  "Fable 5.1  $10 / $50", "Opus 5.5  $4 / $20", "Sonnet 5  $2 / $10", "Haiku 4.5  $1 / $5",
  "GPT-6 Astra $10 / $50", "GPT-6 Sol $2 / $10", "GPT-6 Luna $0.10 / $0.50",
  "Gemini 3.8 Flash $0.75 / $3.75",
];
for (const row of requiredPriceRows) ok(`table includes ${row}`, d2a.includes(row));

const num = (text) => Number(String(text).replace(/[$,]/g, ""));
const near = (actual, published, decimals) => Math.abs(actual - published) <= 0.5 * 10 ** -decimals + 1e-12;
const decimalsOf = (text) => (String(text).split(".")[1] || "").length;
const checkAmount = (name, actual, published) => {
  ok(`${name} ${published ?? "(missing)"} matches computed ${actual}`, published != null && near(actual, num(published), decimalsOf(published)));
};
const tableRate = (model) => {
  const m = d2a.match(new RegExp(`${model.replace(".", "\\.")}\\s+\\$([\\d.]+) / \\$([\\d.]+)`));
  return m ? { in: Number(m[1]) / 1e6, out: Number(m[2]) / 1e6 } : null;
};
const sonnet = tableRate("Sonnet 5");
const opus = tableRate("Opus 5.5");
ok("Sonnet 5 and Opus 5.5 rates parse from table", Boolean(sonnet && opus));
ok("D2a 2× Opus-vs-Sonnet claim matches table", opus.in / sonnet.in === 2 && opus.out / sonnet.out === 2 && d2a.includes("2× Sonnet 5 at $2/$10"));
const rfpCost = d2a.match(/id:"costL"[^}]*?detail:"([^"]*)"/)?.[1] || "";
ok("D2a RFP cost detail carries no support-bot per-call or per-day figure", rfpCost !== "" && !/¢|\$[\d.,]+\/day/.test(rfpCost));
const statedRate = (html) => {
  const m = html.match(/\$([\d.]+) \/ M input,? and \$([\d.]+) \/ M output|\$([\d.]+) \/ M input,\s*\$([\d.]+) \/ M output/);
  return m ? { in: Number(m[1] ?? m[3]) / 1e6, out: Number(m[2] ?? m[4]) / 1e6 } : null;
};
const d1Rate = statedRate(d1);
const d4Rate = statedRate(d4a);
ok("D1 stated rate matches Sonnet 5 table row", d1Rate?.in === sonnet.in && d1Rate?.out === sonnet.out);
ok("D4 stated rate matches Sonnet 5 table row", d4Rate?.in === sonnet.in && d4Rate?.out === sonnet.out);

const tokens = (text) => Number(text.replace(/,/g, ""));
const d1Block = d1.match(/Worked example — one support-bot turn[\s\S]*?<\/p>\s*<\/div>/)?.[0] || "";
const d1Items = Object.fromEntries([...d1Block.matchAll(/<li>([^:<]+):\s*([\d,]+) tokens<\/li>/g)].map((m) => [m[1].trim(), tokens(m[2])]));
const d1Input = ["System prompt", "Retrieved help-center docs", "Conversation history", "User question"].reduce((sum, k) => sum + (d1Items[k] ?? NaN), 0);
const d1Output = d1Items["Answer (output)"];
const d1Line = d1Block.match(/Input = ([\d,]+) tokens → (\$[\d.]+)\. Output = ([\d,]+) → (\$[\d.]+)\./);
const d1Turns = tokens(d1Block.match(/multiply by ([\d,]+) turns\/day/)?.[1] || "NaN");
const d1InCost = d1Input * sonnet.in;
const d1OutCost = d1Output * sonnet.out;
const d1Call = d1InCost + d1OutCost;
ok("D1 input total matches component list", d1Line && tokens(d1Line[1]) === d1Input);
ok("D1 output total matches component list", d1Line && tokens(d1Line[3]) === d1Output);
checkAmount("D1 input cost", d1InCost, d1Line?.[2]);
checkAmount("D1 output cost", d1OutCost, d1Line?.[4]);
checkAmount("D1 per-turn cost", d1Call, d1Block.match(/≈ (\$[\d.]+) per turn/)?.[1]);
checkAmount("D1 daily cost", d1Call * d1Turns, d1Block.match(/(\$[\d,]+)\/day<\/strong>/)?.[1]);
checkAmount("D1 history line item", d1Items["Conversation history"] * sonnet.in * d1Turns, d1Block.match(/history you never trimmed is a (\$[\d,]+)\/day/)?.[1]);

const d4Block = d4a.match(/One turn, then at scale[\s\S]*?<\/p>\s*<\/div>/)?.[0] || "";
const d4Parts = d4Block.match(/System prompt ([\d,]+) \+ manual ([\d,]+) \+ history ([\d,]+) \+ question ([\d,]+) = <b>([\d,]+) input<\/b>/);
const d4Output = tokens(d4Block.match(/Answer = <b>([\d,]+) output<\/b>/)?.[1] || "NaN");
const d4Input = d4Parts ? [1, 2, 3, 4].reduce((sum, i) => sum + tokens(d4Parts[i]), 0) : NaN;
const d4Line = d4Block.match(/Input ([\d,]+) → (\$[\d.]+) · Output ([\d,]+) → (\$[\d.]+) · <b>(\$[\d.]+) \/ turn<\/b>/);
const d4Turns = tokens(d4Block.match(/× ([\d,]+) turns\/day/)?.[1] || "NaN");
const d4Prefix = tokens(d4Block.match(/Cache the ([\d,]+)-token system\+manual prefix/)?.[1] || "NaN");
const d4ReadRate = Number(d4Block.match(/at the ([\d.]+)× read rate/)?.[1]);
const d4FanOut = tokens(d4Block.match(/fans out to ([\d,]+) calls/)?.[1] || "NaN");
const d4InCost = d4Input * sonnet.in;
const d4OutCost = d4Output * sonnet.out;
const d4Call = d4InCost + d4OutCost;
const d4Cached = ((d4Input - d4Prefix) + d4Prefix * d4ReadRate) * sonnet.in + d4OutCost;
ok("D4 input total matches components", d4Parts && tokens(d4Parts[5]) === d4Input && d4Line && tokens(d4Line[1]) === d4Input);
ok("D4 cached prefix equals system + manual", d4Parts && d4Prefix === tokens(d4Parts[1]) + tokens(d4Parts[2]));
ok("D4 output total matches answer", d4Line && tokens(d4Line[3]) === d4Output);
checkAmount("D4 input cost", d4InCost, d4Line?.[2]);
checkAmount("D4 output cost", d4OutCost, d4Line?.[4]);
checkAmount("D4 per-turn cost", d4Call, d4Line?.[5]);
checkAmount("D4 daily cost", d4Call * d4Turns, d4Block.match(/= <b>(\$[\d,]+)\/day<\/b>/)?.[1]);
checkAmount("D4 cached per-call cost", d4Cached, d4Block.match(/fall to about <b>(\$[\d.]+)<\/b>/)?.[1]);
checkAmount("D4 daily caching savings", (d4Call - d4Cached) * d4Turns, d4Block.match(/roughly <b>(\$[\d,]+)\/day saved<\/b>/)?.[1]);
checkAmount("D4 fan-out run cost", d4Call * d4FanOut, d4Block.match(/calls costs about (\$[\d.]+)/)?.[1]);
checkAmount("D4 fan-out contrast per-turn", d4Call, d4Block.match(/, not (\$[\d.]+)\)/)?.[1]);

console.log("cost widget runtime defaults");
const makeElement = () => {
  const el = { listeners: {}, children: new Map() };
  Object.defineProperty(el, "innerHTML", {
    set(html) {
      el.children.clear();
      for (const m of html.matchAll(/<(input|b)\b([^>]*)>/g)) {
        const cls = m[2].match(/class="([^"]+)"/)?.[1];
        if (!cls) continue;
        const child = { tag: m[1], value: m[2].match(/value="([^"]*)"/)?.[1] ?? "", textContent: "", listeners: {} };
        child.addEventListener = (type, fn) => { (child.listeners[type] ||= []).push(fn); };
        el.children.set(`.${cls}`, child);
      }
    },
  });
  el.querySelector = (sel) => el.children.get(sel) ?? null;
  el.querySelectorAll = (sel) => (sel === "input" ? [...el.children.values()].filter((c) => c.tag === "input") : []);
  return el;
};
const costEl = makeElement();
const domListeners = {};
const sandbox = {
  document: {
    addEventListener: (type, fn) => { (domListeners[type] ||= []).push(fn); },
    querySelectorAll: (sel) => (sel === ".ix-cost" ? [costEl] : []),
    querySelector: () => null,
  },
  window: {},
};
sandbox.window = sandbox;
let widgetError = "";
try {
  vm.runInNewContext(await load("assets/js/interactive.js"), sandbox, { filename: "assets/js/interactive.js" });
  for (const fn of domListeners.DOMContentLoaded || []) fn();
} catch (error) {
  widgetError = String(error);
}
ok("interactive.js runs in DOM harness", !widgetError, widgetError);
const field = (sel) => costEl.querySelector(sel);
ok("widget default input rate equals Sonnet 5 table rate", num(field(".c-pin")?.value) / 1e6 === sonnet.in);
ok("widget default output rate equals Sonnet 5 table rate", num(field(".c-pout")?.value) / 1e6 === sonnet.out);
ok("widget default tokens and volume match D1 worked example",
  num(field(".c-in")?.value) === d1Input && num(field(".c-out")?.value) === d1Output && num(field(".c-n")?.value) === d1Turns);
const widgetCall = d1Input * sonnet.in + d1Output * sonnet.out;
checkAmount("widget rendered per-call", widgetCall, field(".c-call")?.textContent);
checkAmount("widget rendered per-day", widgetCall * d1Turns, field(".c-day")?.textContent);
checkAmount("widget rendered per-month", widgetCall * d1Turns * 30, field(".c-mo")?.textContent);
field(".c-pin").value = "4";
field(".c-pout").value = "20";
for (const fn of field(".c-pin").listeners.input || []) fn();
checkAmount("widget recomputes per-day at Opus 5.5 rates", (d1Input * opus.in + d1Output * opus.out) * d1Turns, field(".c-day")?.textContent);

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
