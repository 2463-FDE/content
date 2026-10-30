const test = require("node:test");
const assert = require("node:assert/strict");
const blueprint = require("../assets/js/system-blueprint.js");

class FakeNode {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.textContent = "";
    this.className = "";
    this.id = "";
    this.open = false;
    this.checked = false;
    this.attributes = {};
    this.listeners = {};
    this.children = [];
    this.selectors = new Map();
    this.selectorLists = new Map();
    this.focusCount = 0;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  click() { if (this.listeners.click) this.listeners.click(); }
  querySelector(selector) { return this.selectors.get(selector) || null; }
  querySelectorAll(selector) { return this.selectorLists.get(selector) || []; }
  closest(selector) { return this.selectors.get("closest:" + selector) || null; }
  focus() { this.focusCount += 1; }
}

function makeDrill({ checkedIndex = -1, correctIndex = 1 } = {}) {
  const fieldset = new FakeNode("fieldset");
  fieldset.setAttribute("data-drill", "");
  fieldset.setAttribute("data-feedback", "stale corpus explains stale citations.");
  const radios = [];
  for (let i = 0; i < 3; i += 1) {
    const input = new FakeNode("input");
    if (i === correctIndex) input.setAttribute("data-correct", "1");
    else input.setAttribute("data-why", "option " + i + " misleads.");
    input.checked = i === checkedIndex;
    radios.push(input);
  }
  fieldset.selectorLists.set("input[type=radio]", radios);
  return { fieldset, radios };
}

test("evaluateDrill: no selection asks for a pick", () => {
  const { fieldset } = makeDrill();
  const result = blueprint.evaluateDrill(fieldset);
  assert.equal(result.state, "empty");
  assert.match(result.message, /Pick an option/);
});

test("evaluateDrill: correct option returns authored feedback", () => {
  const { fieldset } = makeDrill({ checkedIndex: 1 });
  const result = blueprint.evaluateDrill(fieldset);
  assert.equal(result.state, "correct");
  assert.match(result.message, /^Correct: stale corpus/);
});

test("evaluateDrill: wrong option returns that option's authored why", () => {
  const { fieldset } = makeDrill({ checkedIndex: 2 });
  const result = blueprint.evaluateDrill(fieldset);
  assert.equal(result.state, "wrong");
  assert.match(result.message, /option 2 misleads/);
});

test("evaluateDrill: missing fieldset degrades to empty state", () => {
  const result = blueprint.evaluateDrill(null);
  assert.equal(result.state, "empty");
});

test("scoreboard counts only solved drills", () => {
  const section = new FakeNode("section");
  const solved = new FakeNode("fieldset");
  solved.setAttribute("data-solved", "1");
  const unsolved = new FakeNode("fieldset");
  section.selectorLists.set("fieldset[data-drill]", [solved, unsolved]);
  assert.deepEqual(blueprint.scoreboard(section), { solved: 1, total: 2 });
});

test("init wires a drill so a correct check updates status, reveal, and score", () => {
  const doc = new FakeNode("document");
  const { fieldset } = makeDrill({ checkedIndex: 1 });
  const button = new FakeNode("button");
  const status = new FakeNode("p");
  const reveal = new FakeNode("details");
  const section = new FakeNode("section");
  section.id = "sb-diagnosis";
  const score = new FakeNode("span");
  section.selectors.set("[data-score]", score);
  section.selectorLists.set("fieldset[data-drill]", [fieldset]);
  fieldset.selectors.set("button[data-check]", button);
  fieldset.selectors.set("[data-status]", status);
  fieldset.selectors.set("details", reveal);
  fieldset.selectors.set("closest:section[id]", section);
  doc.selectorLists.set("fieldset[data-drill]", [fieldset]);
  doc.selectorLists.set("a[data-week-stop]", []);
  doc.getElementById = (id) => (id === "sb-diagnosis" ? section : null);

  blueprint.init(doc);
  button.click();

  assert.match(status.textContent, /^Correct: /);
  assert.equal(status.className, "sb-status is-correct");
  assert.equal(fieldset.getAttribute("data-solved"), "1");
  assert.equal(reveal.open, true);
  assert.equal(score.textContent, "1 of 1 worked through");
});

test("init wires week stops to open and focus their target details", () => {
  const doc = new FakeNode("document");
  const stop = new FakeNode("a");
  stop.setAttribute("data-week-stop", "");
  stop.setAttribute("href", "#sb-w06");
  const target = new FakeNode("details");
  const summary = new FakeNode("summary");
  target.selectors.set("summary", summary);
  doc.selectorLists.set("fieldset[data-drill]", []);
  doc.selectorLists.set("a[data-week-stop]", [stop]);
  doc.getElementById = (id) => (id === "sb-w06" ? target : null);

  blueprint.init(doc);
  stop.click();

  assert.equal(target.open, true);
  assert.equal(summary.focusCount, 1);
});
