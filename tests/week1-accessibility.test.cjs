const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { loadPage } = require("./support/page-model.cjs");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "assets/js/interactive.js"), "utf8");

class Classes {
  toggle() {}
}

function node(overrides = {}) {
  return {
    className: "",
    classList: new Classes(),
    dataset: {},
    hidden: false,
    disabled: false,
    value: "",
    textContent: "",
    addEventListener() {},
    focus() {},
    setSelectionRange() {},
    ...overrides,
  };
}

const DEFAULT_RUN_DATASET = {
  id: "w01-d1-call",
  examples: JSON.stringify(["Answerable", "Not in the window"]),
  labels: JSON.stringify(["First", "Second"]),
  yourturn: "Editable prompt",
};

function datasetOf(element) {
  const dataset = {};
  for (const [name, value] of element.attributes) {
    if (name.startsWith("data-")) dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return dataset;
}

function initializeWeek1Widgets(runDataset = DEFAULT_RUN_DATASET) {
  const range = node({ value: "20" });
  const temperatureValue = node();
  const temperatureDescription = node();
  const bars = node();
  const temp = {
    html: "",
    set innerHTML(value) { this.html = value; },
    querySelector(selector) {
      return ({ ".ix-range": range, "b": temperatureValue, ".ix-temp-desc": temperatureDescription, ".ix-bars": bars })[selector] || null;
    },
  };

  const preset = node();
  const edit = node();
  const presetLabel = node();
  const editLabel = node();
  const result = node();
  const runButton = node();
  const remaining = node();
  const note = node();
  const tabs = [node(), node(), node()];
  const run = {
    dataset: runDataset,
    classList: new Classes(),
    html: "",
    set innerHTML(value) { this.html = value; },
    querySelector(selector) {
      return ({
        ".run-preset": preset,
        ".run-edit": edit,
        ".run-preset-label": presetLabel,
        ".run-edit-label": editLabel,
        ".run-out": result,
        ".run-go": runButton,
        ".run-left": remaining,
        ".run-note": note,
      })[selector] || null;
    },
    querySelectorAll(selector) { return selector === ".run-tab" ? tabs : []; },
  };

  const listeners = {};
  const sandbox = {
    document: {
      addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
      querySelectorAll(selector) {
        if (selector === ".ix-temp") return [temp];
        if (selector === ".ix-run") return [run];
        return [];
      },
      querySelector() { return null; },
    },
    Intl,
    Math,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  for (const listener of listeners.DOMContentLoaded || []) listener();
  return { temp, run, preset, edit, result };
}

test("Week 1 temperature range has an explicit associated label and description", () => {
  const { temp } = initializeWeek1Widgets();
  assert.match(temp.html, /<label class="ix-control-label" for="ix-temperature-1">Temperature<\/label>/);
  assert.match(temp.html, /<input id="ix-temperature-1"[^>]+aria-describedby="ix-temperature-1-value">/);
  assert.match(temp.html, /id="ix-temperature-1-value"/);
});

test("Week 1 live example and result use named output semantics", () => {
  const { run, preset, edit } = initializeWeek1Widgets();
  assert.match(run.html, /<label class="ix-control-label run-preset-label" for="run-w01-d1-call-preset">Example prompt<\/label>/);
  assert.match(run.html, /<output class="ix-ta run-in run-preset" id="run-w01-d1-call-preset" tabindex="0"><\/output>/);
  assert.match(run.html, /<label class="ix-control-label run-edit-label" for="run-w01-d1-call-edit" hidden>Your prompt<\/label>/);
  assert.match(run.html, /<textarea class="ix-ta run-in run-edit" id="run-w01-d1-call-edit" rows="3" hidden><\/textarea>/);
  assert.match(run.html, /<output class="run-out" aria-label="Run result" aria-live="polite"><\/output>/);
  assert.equal(preset.hidden, false);
  assert.equal(edit.hidden, true);
});

test("representative Week 1 lesson mounts its own widgets with the accepted names and copy", () => {
  const { doc } = loadPage("weeks/w01/d1.html");
  const runs = doc.querySelectorAll("div.ix-run");
  assert.ok(runs.length >= 1, "Week 1 lesson must include a live example widget");
  assert.ok(doc.querySelectorAll("div.ix-temp").length >= 1, "Week 1 lesson must include the temperature widget");
  const dataset = datasetOf(runs[0]);
  const { run, temp } = initializeWeek1Widgets(dataset);
  assert.match(run.html, new RegExp(`<label class="ix-control-label run-preset-label" for="run-${dataset.id}-preset">Example prompt</label>`));
  assert.match(run.html, new RegExp(`<output class="ix-ta run-in run-preset" id="run-${dataset.id}-preset"`));
  assert.match(run.html, /<output class="run-out" aria-label="Run result" aria-live="polite"><\/output>/);
  assert.match(temp.html, /<label class="ix-control-label" for="ix-temperature-\d+">Temperature<\/label>/);
  assert.match(doc.body.textContent, /6-Q check/);
});
