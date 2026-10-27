/* design-system.test.cjs — behavioral/visual contracts for the shared shell.
   These are static contracts over assets/css/style.css and the shell markup:
   they pin the token system, both themes, accessibility affordances, and the
   motion rules the curriculum pages rely on, without rendering a browser. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(ROOT, "assets/css/style.css"), "utf8");
const hub = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function block(startMarker) {
  const start = css.indexOf(startMarker);
  assert.notEqual(start, -1, `missing block: ${startMarker}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  assert.fail(`unterminated block: ${startMarker}`);
}

const REQUIRED_TOKENS = [
  "--bg", "--ink", "--ink-soft", "--line", "--surface", "--surface-2",
  "--accent", "--accent-fill", "--accent-ink", "--accent-soft", "--accent-line",
  "--good", "--good-soft", "--good-line", "--good-ink",
  "--bad", "--bad-soft", "--bad-line", "--bad-ink",
  "--info", "--warn-soft", "--warn-ink",
  "--shadow-1", "--shadow-2", "--shadow-3",
  "--r-ctl", "--r-panel", "--r-card",
  "--ease-out", "--t-fast", "--t-med",
  "--label-size", "--label-track",
];

test("light theme defines every semantic token", () => {
  const root = block(":root");
  for (const token of REQUIRED_TOKENS) {
    assert.match(root, new RegExp(`${token}\\s*:`), `:root must define ${token}`);
  }
});

test("dark theme redefines the themeable surface and state tokens", () => {
  const dark = block('html[data-theme="dark"] {');
  const themeable = [
    "--bg", "--ink", "--ink-soft", "--line", "--surface", "--surface-2",
    "--accent", "--accent-fill", "--accent-ink",
    "--good-ink", "--bad-ink", "--warn-ink",
    "--shadow-1", "--shadow-2", "--shadow-3",
  ];
  for (const token of themeable) {
    assert.match(dark, new RegExp(`${token}\\s*:`), `dark theme must redefine ${token}`);
  }
  assert.match(dark, /color-scheme:\s*dark/);
});

test("keyboard focus indicator survives at the shell level", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--accent\)/);
});

test("reduced motion collapses animation and transition time globally", () => {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "reduced-motion media block is required");
  const slice = css.slice(start, start + 600);
  assert.match(slice, /animation-duration:\s*\.01ms\s*!important/);
  assert.match(slice, /transition-duration:\s*\.01ms\s*!important/);
  assert.match(slice, /animation-iteration-count:\s*1\s*!important/);
});

test("print stylesheet keeps the reading path printable", () => {
  assert.match(css, /@media print/);
  const printStart = css.indexOf("@media print");
  const printSlice = css.slice(printStart);
  assert.match(printSlice, /\.topbar[^{]*\{[^}]*display:\s*none/s);
});

test("keyframe animations move only transform and opacity", () => {
  const re = /@keyframes\s+[\w-]+\s*\{([\s\S]*?)\}\s*(?=@|\.|\/\*|#|:|\w|$)/g;
  let m;
  let found = 0;
  while ((m = re.exec(css))) {
    found++;
    const body = m[1];
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
    for (const prop of props) {
      assert.ok(
        ["transform", "opacity", "from", "to"].includes(prop),
        `@keyframes animates "${prop}" — only transform/opacity are allowed`
      );
    }
  }
  assert.ok(found >= 1, "expected at least one @keyframes rule");
});

test("filled accent controls use the AA fill token, not the raw accent", () => {
  // Any rule that paints white text over an accent background must use
  // --accent-fill (tuned to >=4.5:1 against #fff). The raw --accent stays for
  // lines, marks, and large fills that carry no text.
  const offenders = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*color:\s*#fff[^}]*)\}/g)) {
    const body = m[2];
    if (/background[^;]*var\(--accent\)[\s;]/.test(body.replace(/var\(--accent-(fill|ink|soft|line)\)/g, ""))) {
      offenders.push(m[1].trim().slice(0, 60));
    }
  }
  assert.deepEqual(offenders, [], `white-on-raw-accent controls: ${offenders.join(", ")}`);
});

test("hub shell keeps its workflow contracts", () => {
  for (const anchor of [
    'id="hub-week"', 'id="hub-day"', 'id="hub-open"',
    '<div class="cal" id="cal" data-curriculum-surface>',
    "data-client-name", "data-batch-value", "data-cloud-path-status",
    'aria-live="polite"',
  ]) {
    assert.ok(hub.includes(anchor), `index.html must keep ${anchor}`);
  }
});

test("hub chrome carries no emoji glyphs — icons are drawn SVG", () => {
  const emoji = hub.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
  assert.deepEqual(emoji, [], `emoji found in hub markup: ${emoji.join(" ")}`);
  assert.match(hub, /<svg viewBox="0 0 24 24" aria-hidden="true"/, "drawn icon set expected");
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
