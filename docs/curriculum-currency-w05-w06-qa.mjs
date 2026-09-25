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

function contexts(text, pattern, radius = 180) {
  const found = [];
  for (const match of text.matchAll(pattern)) {
    found.push(text.slice(Math.max(0, match.index - radius), match.index + match[0].length + radius));
  }
  return found;
}

console.log("curriculum currency: Weeks 5–6");
for (const [path, html] of pages) {
  check(`${path} retains diagram`, html.includes("window.DIAGRAM ="));
  check(`${path} retains quiz`, html.includes("window.QUIZ ="));

  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  try {
    inlineScripts.forEach((match, index) => new vm.Script(match[1], { filename: `${path}#inline-${index + 1}` }));
    check(`${path} embedded JavaScript parses`, true);
  } catch (error) {
    check(`${path} embedded JavaScript parses`, false, String(error));
  }
}

const w5 = [...pages].filter(([path]) => path.includes("/w05/")).map(([, html]) => html).join("\n");
const w6 = [...pages].filter(([path]) => path.includes("/w06/")).map(([, html]) => html).join("\n");
const all = `${w5}\n${w6}`;

const staleModelContexts = contexts(all, /\bGPT-?4o\b|\bgpt-?5(?:\s*\(high\))?/gi);
const unlabeled = staleModelContexts.filter((text) => !/(historical|dated|2025|study evidence|not a current)/i.test(text));
check("GPT-4o/GPT-5 references are dated historical evidence", staleModelContexts.length > 0 && unlabeled.length === 0,
  unlabeled.join("\n---\n"));

check("no copy-pastable dot-form Spec Kit command remains", !/<code>\/speckit\.[a-z]+<\/code>/i.test(w5));
check("Spec Kit pinned install is exact",
  w5.includes("uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.11"));
check("OpenSpec pinned install is exact", w5.includes("npm install -g @fission-ai/openspec@1.13.2"));
check("Gemini CLI pinned install is exact", w6.includes("npm install -g @google/gemini-cli@0.61.0"));
check("Gemini quota is access-dated", /60 requests\/minute[\s\S]{0,100}1,000 requests\/day[\s\S]{0,100}2026-09-25/.test(w6));
check("Gemini remains explicitly alternative", /Gemini CLI remains an alternative here, not the curriculum\s+default/.test(w6));
check("Aider remains a historical teaching artifact", /Aider is a historical teaching artifact, not a current peer/.test(w6));
check("live sandbox placeholders remain deferred", (all.match(/class="ix-future"/g) || []).length === 30);

const commands = [
  "uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.11",
  "npm install -g @fission-ai/openspec@1.13.2",
  "npm install -g @google/gemini-cli@0.61.0",
];
for (const command of commands) {
  try {
    execFileSync("bash", ["-n", "-c", command], { stdio: "pipe" });
    check(`shell syntax: ${command}`, true);
  } catch (error) {
    check(`shell syntax: ${command}`, false, String(error));
  }
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exitCode = 1;
} else {
  console.log("\nAll Week 5–6 currency checks passed.");
}
