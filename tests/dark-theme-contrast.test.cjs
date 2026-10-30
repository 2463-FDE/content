const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { loadPage, hexRgb, composite, contrast, ROOT } = require("./support/page-model.cjs");

function darkWeek1() {
  const page = loadPage("weeks/w01/d1.html");
  page.doc.documentElement.setAttribute("data-theme", "dark");
  return { page, doc: page.doc, styles: page.styles({ colorScheme: "dark" }) };
}

function inactiveStep(doc) {
  const step = doc.querySelectorAll("section.step").find((node) => !node.classList.contains("active"));
  assert.ok(step, "Week 1 must render inactive lesson steps");
  return step;
}

test("default-dark inactive lesson prose, labels, and tags remain WCAG AA", () => {
  const { doc, styles } = darkWeek1();
  const background = hexRgb(styles.computed(doc.body, "background"));
  const step = inactiveStep(doc);
  const opacity = Number(styles.computed(step, "opacity"));
  assert.ok(opacity > 0 && opacity < 1, "inactive steps must retain visual hierarchy");

  const probe = doc.createElement("div");
  probe.innerHTML = '<button class="btn" type="button">Run</button><button class="code-cta" type="button"><span class="cc-meta">window.py</span></button>';
  step.appendChild(probe);
  const tokens = styles.customProperties(step);
  const samples = [
    ["instructional prose", styles.computed(step.querySelector("p"), "color")],
    ["secondary labels", styles.computed(probe.querySelector(".cc-meta"), "color")],
    ["step tags", styles.computed(step.querySelector(".tag"), "color")],
    ["instructional controls", styles.resolve("var(--accent)", tokens)],
    ["control metadata", styles.resolve("var(--dim)", tokens)],
  ];
  for (const [surface, color] of samples) {
    const rendered = composite(hexRgb(color), background, opacity);
    assert.ok(contrast(rendered, background) >= 4.5, `${surface} fell below 4.5:1`);
  }

  const button = probe.querySelector(".btn");
  const mutedButtonText = composite(hexRgb(styles.computed(button, "color")), background, opacity);
  const mutedButtonFill = composite(hexRgb(styles.computed(button, "background")), background, opacity);
  assert.ok(contrast(mutedButtonText, mutedButtonFill) >= 4.5, "filled control fell below 4.5:1");
});

function renderWeek1Diagram(doc) {
  const sandbox = { document: doc, console, requestAnimationFrame: (fn) => fn(), setTimeout: (fn) => fn() };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const script of doc.querySelectorAll("script")) {
    if (!script.getAttribute("src")) vm.runInContext(script.textContent, sandbox);
  }
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/diagram.js"), "utf8"), sandbox);
  sandbox.Diagram.init("#diagram", ".stage-caption");
  return sandbox;
}

test("Week 1 step tags resolve through the shared dark accent-ink token", () => {
  const { doc, styles } = darkWeek1();
  const step = inactiveStep(doc);
  const tag = step.querySelector(".tag");
  assert.ok(tag, "Week 1 steps must render a step tag");
  const tokens = styles.customProperties(step);
  assert.equal(styles.computed(tag, "color"), styles.resolve("var(--accent-ink)", tokens));
});

test("Week 1 rendered diagram caption hints keep dark-theme opacity of at least 0.8", () => {
  const { doc, styles } = darkWeek1();
  const sandbox = renderWeek1Diagram(doc);
  const caption = doc.querySelector(".stage-caption");
  const steps = sandbox.DIAGRAM.captions.length;
  assert.ok(steps > 0, "Week 1 diagram must define captions");
  let hints = 0;
  for (let n = 0; n < steps; n += 1) {
    sandbox.Diagram.goTo(n);
    assert.ok(caption.textContent.trim(), `caption ${n} must render`);
    hints += caption.querySelectorAll(".stage-hint").length;
    for (const node of [caption, ...caption.descendants()]) {
      const opacity = Number(styles.computed(node, "opacity") ?? 1);
      assert.ok(opacity >= 0.8, `caption ${n} renders <${node.localName} class="${node.className}"> at opacity ${opacity}`);
    }
  }
  assert.ok(hints > 0, "rendered captions must include tap hints");
});
