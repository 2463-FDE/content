const assert = require("node:assert/strict");
const test = require("node:test");
const { loadPage, hexRgb, composite, contrast } = require("./support/page-model.cjs");

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

test("Week 1 step tags and caption hints resolve through the shared dark tokens", () => {
  const { doc, styles } = darkWeek1();
  const step = inactiveStep(doc);
  const tag = step.querySelector(".tag");
  assert.equal(tag.textContent, "The whole game");
  const tokens = styles.customProperties(step);
  assert.equal(styles.computed(tag, "color"), styles.resolve("var(--accent-ink)", tokens));

  const caption = doc.querySelector(".stage-caption");
  assert.ok(caption, "Week 1 must render the diagram caption surface");
  caption.innerHTML = "Window budget <span class='stage-hint'>(tap nodes for detail)</span>";
  const hint = caption.querySelector(".stage-hint");
  const opacity = Number(styles.computed(hint, "opacity"));
  assert.ok(opacity >= 0.8, `caption hint opacity ${opacity} is below 0.8`);
});
