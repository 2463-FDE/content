/* design-system.test.cjs — behavioral/visual contracts for the shared shell.
   assets/css/style.css is parsed into a rule model (at-rule context ->
   selectors -> declarations) and the hub markup into its element tree, so the
   contracts assert what the cascade and the served page actually declare. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const cssSource = fs.readFileSync(path.join(ROOT, "assets/css/style.css"), "utf8");
const hub = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function stripComments(src) {
  let out = "";
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      out += ch;
      if (ch === "\\") out += src[++i] || "";
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
    } else if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 1;
    } else {
      out += ch;
    }
  }
  return out;
}

function parseDeclaration(text) {
  const colon = text.indexOf(":");
  if (colon === -1) return null;
  let value = text.slice(colon + 1).trim();
  const important = /!\s*important$/i.test(value);
  if (important) value = value.replace(/!\s*important$/i, "").trim();
  return { prop: text.slice(0, colon).trim().toLowerCase(), value, important };
}

function parseBlock(src, start) {
  const node = { decls: [], children: [] };
  let buf = "";
  let quote = null;
  let parens = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      buf += ch;
      if (ch === "\\") buf += src[++i] || "";
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === "(") parens++;
    if (ch === ")") parens--;
    if (parens > 0) { buf += ch; continue; }
    if (ch === ";") {
      const decl = parseDeclaration(buf.trim());
      if (decl && !decl.prop.startsWith("@")) node.decls.push(decl);
      buf = "";
    } else if (ch === "{") {
      const child = parseBlock(src, i + 1);
      child.prelude = buf.trim().replace(/\s+/g, " ");
      node.children.push(child);
      i = child.end;
      buf = "";
    } else if (ch === "}") {
      const decl = parseDeclaration(buf.trim());
      if (decl) node.decls.push(decl);
      node.end = i;
      return node;
    } else {
      buf += ch;
    }
  }
  node.end = src.length;
  return node;
}

function splitSelectors(prelude) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of prelude) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function flatten(node, context = [], out = { rules: [], keyframes: [] }) {
  for (const child of node.children) {
    const prelude = child.prelude;
    if (/^@(-webkit-)?keyframes\b/.test(prelude)) {
      out.keyframes.push({
        name: prelude.split(/\s+/)[1],
        context,
        frames: child.children.map((f) => ({ selector: f.prelude, decls: f.decls })),
      });
    } else if (prelude.startsWith("@")) {
      if (child.decls.length) out.rules.push({ context, atRule: prelude, selectors: [], decls: child.decls });
      flatten(child, context.concat(prelude), out);
    } else {
      out.rules.push({ context, selectors: splitSelectors(prelude), decls: child.decls });
      flatten(child, context, out);
    }
  }
  return out;
}

const sheet = flatten(parseBlock(stripComments(cssSource), 0));

function rulesFor(selector, context = []) {
  return sheet.rules.filter(
    (r) => r.selectors.includes(selector) && r.context.length === context.length && r.context.every((c, i) => c === context[i])
  );
}

function declared(rules) {
  const map = new Map();
  for (const r of rules) for (const d of r.decls) map.set(d.prop, d);
  return map;
}

function parseHtmlElements(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const elements = [];
  for (const m of body.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g)) {
    const attrs = new Map();
    for (const a of m[2].matchAll(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs.set(a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? "");
    }
    elements.push({ tag: m[1].toLowerCase(), attrs });
  }
  return elements;
}

const REQUIRED_TOKENS = [
  "--bg", "--ink", "--ink-soft", "--line", "--surface", "--surface-2",
  "--accent", "--accent-fill", "--accent-ink", "--accent-soft", "--accent-line",
  "--dim", "--disabled-fill",
  "--good", "--good-soft", "--good-line", "--good-ink",
  "--bad", "--bad-soft", "--bad-line", "--bad-ink",
  "--info", "--warn-soft", "--warn-ink",
  "--shadow-1", "--shadow-2", "--shadow-3",
  "--r-ctl", "--r-panel", "--r-card",
  "--ease-out", "--t-fast", "--t-med",
  "--label-size", "--label-track",
];

test("the stylesheet parses into a non-trivial rule model", () => {
  assert.ok(sheet.rules.length > 200, `parsed only ${sheet.rules.length} rules`);
  assert.ok(sheet.keyframes.length >= 1, "expected at least one @keyframes rule");
});

test("light theme defines every semantic token", () => {
  const root = declared(rulesFor(":root"));
  for (const token of REQUIRED_TOKENS) {
    assert.ok(root.has(token) && root.get(token).value, `:root must define ${token}`);
  }
  assert.equal(root.get("color-scheme").value, "light");
});

test("dark theme redefines the themeable surface and state tokens", () => {
  const dark = declared(rulesFor('html[data-theme="dark"]'));
  const light = declared(rulesFor(":root"));
  const themeable = [
    "--bg", "--ink", "--ink-soft", "--line", "--surface", "--surface-2",
    "--accent", "--accent-fill", "--accent-ink", "--dim", "--disabled-fill",
    "--good-ink", "--bad-ink", "--warn-ink",
    "--shadow-1", "--shadow-2", "--shadow-3",
  ];
  for (const token of themeable) {
    assert.ok(dark.has(token), `dark theme must redefine ${token}`);
    assert.notEqual(dark.get(token).value, light.get(token).value, `dark ${token} must differ from light`);
  }
  assert.equal(dark.get("color-scheme").value, "dark");
});

test("keyboard focus indicator survives at the shell level", () => {
  const outline = declared(rulesFor(":focus-visible")).get("outline");
  assert.ok(outline, "top-level :focus-visible rule must set an outline");
  assert.equal(outline.value, "3px solid var(--accent)");
  assert.ok(outline.important, "shell focus outline must not be overridable by components");
});

test("reduced motion collapses animation and transition time globally", () => {
  const ctx = ["@media (prefers-reduced-motion: reduce)"];
  const universal = declared(rulesFor("*", ctx));
  for (const [prop, value] of [
    ["animation-duration", ".01ms"],
    ["transition-duration", ".01ms"],
    ["animation-iteration-count", "1"],
  ]) {
    const d = universal.get(prop);
    assert.ok(d, `reduced-motion * rule must set ${prop}`);
    assert.equal(d.value, value);
    assert.ok(d.important, `${prop} must be !important under reduced motion`);
  }
  for (const pseudo of ["*::before", "*::after"]) {
    assert.ok(rulesFor(pseudo, ctx).length, `reduced-motion collapse must cover ${pseudo}`);
  }
});

test("print stylesheet keeps the reading path printable", () => {
  const display = declared(rulesFor(".topbar", ["@media print"])).get("display");
  assert.ok(display, "print media must hide the topbar");
  assert.equal(display.value, "none");
});

test("disabled filled controls use the muted disabled role, not label dim", () => {
  for (const selector of [".btn:disabled", ".quiz-submitbar .btn:disabled"]) {
    const bg = declared(rulesFor(selector)).get("background");
    assert.ok(bg, `${selector} must set a background`);
    assert.equal(bg.value, "var(--disabled-fill)");
  }
  const light = declared(rulesFor(":root"));
  assert.notEqual(light.get("--disabled-fill").value, light.get("--dim").value);
});

test("keyframe animations move only transform and opacity in every frame", () => {
  const allowed = new Set(["transform", "opacity"]);
  for (const kf of sheet.keyframes) {
    assert.ok(kf.frames.length >= 2, `@keyframes ${kf.name} must have at least two frames`);
    for (const frame of kf.frames) {
      for (const d of frame.decls) {
        assert.ok(
          allowed.has(d.prop),
          `@keyframes ${kf.name} ${frame.selector} animates "${d.prop}" — only transform/opacity are allowed`
        );
      }
    }
  }
});

test("filled accent controls use the AA fill token, not the raw accent", () => {
  const offenders = [];
  for (const rule of sheet.rules) {
    const decls = declared([rule]);
    const color = decls.get("color");
    if (!color || !/^#fff(fff)?$/i.test(color.value)) continue;
    for (const prop of ["background", "background-color"]) {
      const bg = decls.get(prop);
      if (bg && /var\(--accent\)/.test(bg.value)) offenders.push(rule.selectors.join(", "));
    }
  }
  assert.deepEqual(offenders, [], `white-on-raw-accent controls: ${offenders.join(" | ")}`);
});

test("hub shell keeps its workflow contracts", () => {
  const elements = parseHtmlElements(hub);
  const byId = (id) => elements.find((e) => e.attrs.get("id") === id);
  for (const [id, tag] of [["hub-week", "select"], ["hub-day", "select"], ["hub-open", null]]) {
    const el = byId(id);
    assert.ok(el, `index.html must keep #${id}`);
    if (tag) assert.equal(el.tag, tag, `#${id} must be a <${tag}>`);
  }
  const cal = byId("cal");
  assert.ok(cal, "index.html must keep #cal");
  assert.equal(cal.tag, "div");
  assert.ok(cal.attrs.get("class").split(/\s+/).includes("cal"));
  assert.ok(cal.attrs.has("data-curriculum-surface"));
  for (const attr of ["data-client-name", "data-batch-value", "data-cloud-path-status"]) {
    assert.ok(elements.some((e) => e.attrs.has(attr)), `index.html must keep a [${attr}] mount`);
  }
  assert.ok(elements.some((e) => e.attrs.get("aria-live") === "polite"), "a polite live region is required");
});

test("hub chrome carries no emoji glyphs", () => {
  const emoji = hub.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
  assert.deepEqual(emoji, [], `emoji found in hub markup: ${emoji.join(" ")}`);
});

test("every root page topnav is emoji-free", () => {
  const pages = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith(".html"));
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    for (const m of html.matchAll(/class="topnav"[^>]*>([^<]*)</g)) {
      const label = m[1];
      assert.ok(
        !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(label),
        `${page}: topnav label "${label}" contains an emoji`
      );
    }
  }
});
