// Focused static regression checks for the Week 5–6 S7 currency restamp.
// No package install or provider/product API is invoked.
// Run: node docs/curriculum-currency-w05-w06-qa.mjs
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const weekFiles = [
  ...Array.from({ length: 5 }, (_, i) => `weeks/w05/w05d${i + 1}.html`),
  ...Array.from({ length: 5 }, (_, i) => `weeks/w06/w06d${i + 1}.html`),
];
const pages = new Map(await Promise.all(weekFiles.map(async (path) => [path, await readFile(path, "utf8")])));
let failures = 0;

function check(label, condition, detail = "") {
  console.log(`${condition ? "  ok  " : "  FAIL"} ${label}${condition || !detail ? "" : `\n       ${detail}`}`);
  if (!condition) failures++;
}

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", rarr: "→", hellip: "…" };
function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref) => {
    if (ref[0] === "#") return String.fromCodePoint(ref[1].toLowerCase() === "x" ? parseInt(ref.slice(2), 16) : Number(ref.slice(1)));
    return entities[ref.toLowerCase()] ?? whole;
  });
}
const normalize = (text) => decode(text.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

function runPage(path, html) {
  const window = {};
  const context = vm.createContext({ window, console: { log() {}, warn() {}, error() {} } });
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  inline.forEach((match, index) => vm.runInContext(match[1], context, { filename: `${path}#inline-${index + 1}` }));
  return window;
}

function diagramProblems(d) {
  if (!d || typeof d !== "object") return ["DIAGRAM is not an object"];
  const problems = [];
  if (!(d.width > 0 && d.height > 0)) problems.push("width/height must be positive");
  if (!Array.isArray(d.nodes) || d.nodes.length === 0) return [...problems, "nodes must be a non-empty array"];
  const ids = new Set();
  for (const n of d.nodes) {
    if (!n.id || ids.has(n.id)) problems.push(`node id missing or duplicate: ${n.id}`);
    ids.add(n.id);
    if (![n.x, n.y, n.w, n.h].every(Number.isFinite)) problems.push(`node ${n.id} lacks numeric geometry`);
    if (typeof n.label !== "string" || !n.label) problems.push(`node ${n.id} lacks a label`);
  }
  if (!Array.isArray(d.edges)) problems.push("edges must be an array");
  else for (const e of d.edges) if (!ids.has(e.from) || !ids.has(e.to)) problems.push(`edge ${e.from}→${e.to} references unknown node`);
  return problems;
}

const validIndex = (value, options) => Number.isInteger(value) && value >= 0 && value < options.length;
function quizProblems(q) {
  if (!q || typeof q !== "object") return ["QUIZ is not an object"];
  if (!Array.isArray(q.questions) || q.questions.length === 0) return ["questions must be a non-empty array"];
  const problems = [];
  q.questions.forEach((item, i) => {
    const where = `question ${i + 1} (${item.type})`;
    if (typeof item.stem !== "string" || !item.stem) problems.push(`${where} lacks a stem`);
    if (item.type === "scq") {
      if (!Array.isArray(item.options) || item.options.length < 2 || !validIndex(item.answer, item.options)) problems.push(`${where} answer out of range`);
    } else if (item.type === "mcq") {
      const ok = Array.isArray(item.options) && Array.isArray(item.answer) && item.answer.length > 0
        && new Set(item.answer).size === item.answer.length && item.answer.every((a) => validIndex(a, item.options));
      if (!ok) problems.push(`${where} answers out of range`);
    } else if (item.type === "tf") {
      if (typeof item.answer !== "boolean") problems.push(`${where} answer must be boolean`);
    } else if (item.type === "match") {
      if (!Array.isArray(item.pairs) || item.pairs.length < 2 || !item.pairs.every((p) => p.l && p.r)) problems.push(`${where} pairs malformed`);
    } else if (item.type !== "open") {
      problems.push(`${where} has unknown type`);
    }
  });
  return problems;
}

function runtimeStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((v) => runtimeStrings(v, out));
  return out;
}

function learnerTextBlocks(html) {
  const body = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  return body
    .split(/<\/?(?:p|li|h[1-6]|td|th|div|section|figcaption|blockquote|summary|dd|dt)\b[^>]*>/i)
    .map(normalize)
    .filter(Boolean);
}

const staleModel = /\bGPT-?4o\b|\bGPT-?5\b/i;
const staleLabel = /\b(?:historical(?:ly)?|dated|snapshot|study|\d{4}-\d{2}-\d{2}|(?:as of|in) (?:early |late |mid-)?\d{4})\b|not a current/i;
const sentences = (block) => block.split(/(?<=[.!?])\s+(?=[A-Z"“(])/);
const unlabeledStale = (blocks) => blocks.flatMap(sentences).filter((s) => staleModel.test(s) && !staleLabel.test(s));

function ixFutureBlocks(html) {
  const blocks = [];
  for (const start of html.matchAll(/<div class="ix-future">/g)) {
    let depth = 0;
    const tag = /<\/?div\b[^>]*>/g;
    tag.lastIndex = start.index;
    for (let m; (m = tag.exec(html)); ) {
      depth += m[0][1] === "/" ? -1 : 1;
      if (depth === 0) { blocks.push(html.slice(start.index, tag.lastIndex)); break; }
    }
  }
  return blocks;
}

const shellPrefix = /^(?:npm|npx|uv|uvx|pip|pipx|brew|curl|specify|openspec|gemini)\s/;
const codeTexts = [];
const extractedCommands = new Map();
const allBlocks = [];
let ixFutureCount = 0;

console.log("curriculum currency: Weeks 5–6");
for (const [path, html] of pages) {
  let window = {};
  try {
    window = runPage(path, html);
    check(`${path} embedded JavaScript runs`, true);
  } catch (error) {
    check(`${path} embedded JavaScript runs`, false, String(error));
  }
  const dProblems = diagramProblems(window.DIAGRAM);
  check(`${path} diagram is renderable`, dProblems.length === 0, dProblems.join("; "));
  const qProblems = quizProblems(window.QUIZ);
  check(`${path} quiz is gradable`, qProblems.length === 0, qProblems.join("; "));

  allBlocks.push(...learnerTextBlocks(html), ...runtimeStrings(window.DIAGRAM), ...runtimeStrings(window.QUIZ));

  for (const m of html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi)) {
    const command = normalize(m[1]);
    codeTexts.push({ path, text: command });
    if (shellPrefix.test(command)) extractedCommands.set(command, path);
  }

  const futures = ixFutureBlocks(html);
  ixFutureCount += futures.length;
  const live = futures.filter((b) => /<(?:iframe|input|textarea|button|form|script|canvas)\b|data-(?:sandbox|terminal)/i.test(b));
  check(`${path} ix-future placeholders stay inert`, live.length === 0, live.join("\n---\n"));
  check(`${path} loads no terminal/sandbox integration`, !/<script[^>]+src="[^"]*(?:xterm|terminal|sandbox|webcontainer)/i.test(html));
}
check("ix-future placeholders remain present", ixFutureCount > 0);

check("stale-model detector rejects an unlabelled current claim",
  unlabeledStale(["Tools are dated quickly. GPT-5 is the current best model, see the 2025 notes."]).length === 1);
const unlabeled = unlabeledStale(allBlocks);
check("GPT-4o/GPT-5 mentions are labelled historical in the same sentence",
  allBlocks.some((b) => staleModel.test(b)) && unlabeled.length === 0, unlabeled.join("\n---\n"));

const w5Codes = [...extractedCommands].filter(([, p]) => p.includes("/w05/")).map(([c]) => c);
const w6Codes = [...extractedCommands].filter(([, p]) => p.includes("/w06/")).map(([c]) => c);
check("no copy-pastable dot-form Spec Kit command remains",
  !codeTexts.some(({ path, text }) => path.includes("/w05/") && /^\/speckit\.[a-z]+/i.test(text)));
check("Spec Kit pinned install is shown",
  w5Codes.includes("uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.11"));
check("OpenSpec pinned install is shown", w5Codes.includes("npm install -g @fission-ai/openspec@1.13.2"));
check("Gemini CLI pinned install is shown", w6Codes.includes("npm install -g @google/gemini-cli@0.61.0"));

const w6Text = allBlocks.join("\n");
check("Gemini quota is access-dated", /60 requests\/minute and 1,000 requests\/day as of 2026-09-25/.test(w6Text));
check("Gemini remains explicitly alternative", /Gemini CLI remains an alternative here, not the curriculum default/.test(w6Text));
check("Aider remains a historical teaching artifact", /Aider is a historical teaching artifact, not a current peer/.test(w6Text));

check("learner-facing commands were extracted", extractedCommands.size >= 3);
for (const [command, path] of extractedCommands) {
  try {
    const filled = command.replace(/<([a-z][a-z0-9-]*)>/gi, (_, name) => name.toUpperCase().replace(/-/g, "_"));
    execFileSync("bash", ["-n", "-c", filled], { stdio: "pipe" });
    check(`shell syntax (${path}): ${command}`, true);
  } catch (error) {
    check(`shell syntax (${path}): ${command}`, false, String(error.stderr || error));
  }
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exitCode = 1;
} else {
  console.log("\nAll Week 5–6 currency checks passed.");
}
