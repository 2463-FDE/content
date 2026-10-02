const test = require("node:test");
const assert = require("node:assert/strict");
const chrome = require("../assets/js/learning-chrome.js");

class FakeClassList {
  constructor(node) { this.node = node; }
  add(name) {
    const names = new Set((this.node.className || "").split(/\s+/).filter(Boolean));
    names.add(name);
    this.node.className = [...names].join(" ");
  }
}

class FakeNode {
  constructor(tag = "div", text = "") {
    this.tagName = tag.toUpperCase();
    this.textContent = text;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = "";
    this.id = "";
    this.content = "";
    this.tabIndex = undefined;
    this.focusCount = 0;
    this.scrollCount = 0;
    this.classList = new FakeClassList(this);
    this.selectors = new Map();
  }
  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  insertBefore(node, before) {
    const index = before ? this.children.indexOf(before) : -1;
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  querySelector(selector) { return this.selectors.get(selector) || null; }
  cloneNode() {
    const clone = new FakeNode(this.tagName, this.textContent);
    clone.className = this.className;
    clone.id = this.id;
    clone.attributes = { ...this.attributes };
    return clone;
  }
  focus() { this.focusCount += 1; }
  scrollIntoView() { this.scrollCount += 1; }
}

class FakeDocument {
  constructor({ goals = [], outputs = [], concepts = "", includeMain = true, includeLede = true } = {}) {
    this.body = new FakeNode("body");
    this.main = includeMain ? new FakeNode("main") : null;
    this.lede = includeLede ? new FakeNode("div") : null;
    this.summary = includeLede ? new FakeNode("p", "Summary") : null;
    if (this.lede) {
      this.lede.className = "lede";
      this.lede.appendChild(this.summary);
      this.lede.selectors.set(".summary", this.summary);
    }
    if (this.main) this.body.appendChild(this.main);
    this.meta = concepts ? new FakeNode("meta") : null;
    if (this.meta) this.meta.content = concepts;
    this.goalNodes = goals.map((text) => new FakeNode("li", text));
    this.outputNodes = outputs.map((text) => new FakeNode("li", text));
  }
  createElement(tag) { return new FakeNode(tag); }
  querySelector(selector) {
    if (selector === "main.lesson2, main.lesson, main.wrap, main") return this.main;
    if (selector === ".reading-col .lede, .lede") return this.lede;
    if (selector === 'meta[name="fde-concepts"]') return this.meta;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === "#goals-modal .goals-list li") return this.goalNodes;
    if (selector === "#goals-modal .deliv-list li") return this.outputNodes;
    return [];
  }
  getElementById(id) {
    function find(node) {
      if (!node) return null;
      if (node.id === id) return node;
      for (const child of node.children) {
        const match = find(child);
        if (match) return match;
      }
      return null;
    }
    return find(this.body) || find(this.lede);
  }
}

function countById(root, id) {
  if (!root) return 0;
  return (root.id === id ? 1 : 0) + root.children.reduce((sum, child) => sum + countById(child, id), 0);
}

test("injects skip target, 3–5 canonical objectives, and existing expected output", () => {
  const doc = new FakeDocument({
    goals: ["Goal one", "Goal two", "Goal three", "Goal four", "Goal five", "Goal six"],
    outputs: ["Commit the artifact", "Bring the evidence"],
    concepts: "one,two,three"
  });

  const result = chrome.init(doc);

  assert.equal(result.skipLink.textContent, "Skip to reading");
  assert.equal(result.skipLink.href, "#reading-main");
  assert.equal(doc.main.tabIndex, -1);
  assert.equal(result.objectives.getAttribute("data-source"), "goals-modal");
  assert.equal(result.objectives.children[1].children.length, 5);
  assert.equal(result.objectives.children[2].children[1].children.length, 2);
  assert.equal(doc.lede.children[0].id, "learning-objectives");

  let prevented = false;
  result.skipLink.listeners.click({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(doc.main.focusCount, 1);
  assert.equal(doc.main.scrollCount, 1);
});

test("initialization is idempotent", () => {
  const doc = new FakeDocument({
    goals: ["Goal one", "Goal two", "Goal three"],
    outputs: ["Output"],
    concepts: "one,two,three"
  });

  const first = chrome.init(doc);
  const second = chrome.init(doc);

  assert.equal(second.skipLink, first.skipLink);
  assert.equal(second.objectives, first.objectives);
  assert.equal(countById(doc.body, "reading-skip-link"), 1);
  assert.equal(countById(doc.lede, "learning-objectives"), 1);
});

test("omits an empty objectives block when canonical fields are absent", () => {
  const doc = new FakeDocument({ concepts: "only-one,only-two" });

  const result = chrome.init(doc);

  assert.ok(result.skipLink);
  assert.equal(result.objectives, null);
  assert.equal(countById(doc.lede, "learning-objectives"), 0);
  assert.doesNotThrow(() => chrome.init(new FakeDocument({ includeMain: false })));
});
