"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "assets/js/curriculum-loader.js");
const api = require(loaderPath);
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/curriculum-resolved.seed-v1.json"), "utf8"));
const assignmentFixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/curriculum-resolved.assignment-one-unit.json"), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function calendarInlineScript() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const start = html.lastIndexOf("<script>", html.indexOf("window.PHASES")) + "<script>".length;
  return html.slice(start, html.indexOf("</script>", start));
}

function staticCalendar() {
  const source = calendarInlineScript();
  const dataOnly = source.slice(0, source.indexOf("/* Static-only renderer"));
  const context = { window: {} };
  vm.runInNewContext(dataOnly, context);
  return api.fallbackCalendar(context.window.PHASES, context.window.WEEKS);
}

function response(payload, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => clone(payload) };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function host(overrides = {}) {
  return Object.assign({
    PHASES: staticCalendar().phases,
    WEEKS: staticCalendar().weeks,
    FDE_RUN_URL: "https://api.invalid/",
    FDE_ensureSession: async () => "token",
  }, overrides);
}

class TinyNode {
  constructor(tag = "", doc = null, fragment = false) {
    this.tagName = tag ? tag.toUpperCase() : "";
    this.ownerDocument = doc;
    this.isFragment = fragment;
    this.parentNode = null;
    this.children = [];
    this.attributes = {};
    this.className = "";
    this._text = "";
    this.style = {
      setProperty: (name, value) => { this.style[name] = value; },
    };
  }
  get childNodes() { return this.children; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); }
  appendChild(child) {
    if (child.isFragment) {
      child.children.slice().forEach((item) => this.appendChild(item));
      child.children = [];
      return child;
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  replaceChildren(...nodes) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    this._text = "";
    nodes.forEach((node) => this.appendChild(node));
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  contains(target) {
    return this === target || this.children.some((child) => child.contains && child.contains(target));
  }
  closest(selector) {
    if (selector === "[data-unit-key]" && this.getAttribute("data-unit-key") !== null) return this;
    return this.parentNode && this.parentNode.closest ? this.parentNode.closest(selector) : null;
  }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
}

class TinyDocument {
  constructor() {
    this.activeElement = null;
    this.legend = new TinyNode("div", this);
    this.legend.className = "legend";
    this.cal = new TinyNode("div", this);
    this.cal.setAttribute("id", "cal");
  }
  createElement(tag) { return new TinyNode(tag, this); }
  createTextNode(text) { const node = new TinyNode("#text", this); node.textContent = text; return node; }
  createDocumentFragment() { return new TinyNode("", this, true); }
  getElementById(id) { return id === "cal" ? this.cal : null; }
  querySelector(selector) {
    if (selector === ".legend") return this.legend;
    const match = /^\[data-unit-key="([^"]+)"\] \[data-focus-role="([^"]+)"\]$/.exec(selector);
    if (match) {
      const card = descendants(this.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === match[1]);
      return card && descendants(card).find((node) => node.getAttribute && node.getAttribute("data-focus-role") === match[2]) || null;
    }
    return null;
  }
}

function descendants(node) {
  return node.children.reduce((all, child) => all.concat(child, descendants(child)), []);
}

function byClass(node, name) {
  return descendants(node).filter((item) => (item.className || "").split(/\s+/).includes(name));
}

function makeLoader(overrides = {}) {
  const root = host(overrides.root);
  const renders = [];
  const loader = api.createLoader({
    root,
    document: {},
    timeoutMs: overrides.timeoutMs || 100,
    fetch: overrides.fetch,
    render: (model) => { renders.push(model); return true; },
  });
  return { loader, root, renders };
}

test("seed-v1 API fixture has exact static grid parity", () => {
  const validated = api.validateResponse(clone(fixture));
  assert.ok(validated);
  assert.equal(JSON.stringify(api.toCalendar(validated)), JSON.stringify(staticCalendar()));
});

test("assigned and override provenance are accepted without being retained in the grid", () => {
  for (const source of ["assignment", "override"]) {
    const payload = clone(fixture);
    payload.provenance.source_kind = source;
    payload.provenance.effective_from = 1699999999000;
    payload.provenance.version_no = 3;
    const validated = api.validateResponse(payload);
    assert.ok(validated);
    assert.equal(JSON.stringify(api.toCalendar(validated)).includes("provenance"), false);
    assert.equal(JSON.stringify(api.toCalendar(validated)).includes("version_id"), false);
  }
});

test("full response validation fails closed for malformed, duplicate, and out-of-range data", () => {
  const mutations = [
    (p) => { p.ok = "true"; },
    (p) => { p.extra = true; },
    (p) => { p.curriculum.phases.found.extra = "x"; },
    (p) => { p.curriculum.units[1].unit_key = p.curriculum.units[0].unit_key; },
    (p) => { p.curriculum.units[1].position = p.curriculum.units[0].position; },
    (p) => { p.curriculum.units[0].week = 0; },
    (p) => { p.curriculum.units[0].day = 6; },
    (p) => { p.curriculum.units.reverse(); },
    (p) => { p.curriculum.units = []; },
    (p) => { p.curriculum.units.push(clone(p.curriculum.units[0])); },
    (p) => { p.curriculum.units[0].phase_key = "unknown"; },
    (p) => { p.curriculum.units[0].phase_label = "Mismatch"; },
    (p) => { p.curriculum.units[1].week_title = "Inconsistent week"; },
    (p) => { p.curriculum.units[0].availability = "soon"; },
    (p) => { p.curriculum.units[0].star = 1; },
    (p) => { p.provenance.source_kind = "tenant"; },
    (p) => { p.provenance.curriculum_slug = "other"; },
  ];
  mutations.forEach((mutate, index) => {
    const payload = clone(fixture);
    mutate(payload);
    assert.equal(api.validateResponse(payload), null, `mutation ${index} must fail`);
  });
});

test("enum values must be own properties, not inherited object names", () => {
  const inheritedSources = ["toString", "constructor", "__proto__"];
  inheritedSources.forEach((value) => {
    const payload = clone(fixture);
    payload.provenance.source_kind = value;
    payload.provenance.effective_from = 1;
    assert.equal(api.validateResponse(payload), null, `source ${value}`);
  });
  inheritedSources.forEach((value) => {
    const payload = clone(fixture);
    payload.curriculum.units[0].availability = value;
    assert.equal(api.validateResponse(payload), null, `availability ${value}`);
  });
});

test("scalar identifiers reject non-strings without invoking coercion hooks", () => {
  const mutations = [
    (p, value) => { p.curriculum.slug = value; },
    (p, value) => { p.provenance.version_id = value; },
    (p, value) => { p.provenance.source_kind = value; },
    (p, value) => { p.provenance.curriculum_slug = value; },
    (p, value) => { p.curriculum.phases.found.color = value; },
    (p, value) => { p.curriculum.units[0].unit_key = value; },
    (p, value) => { p.curriculum.units[0].phase_key = value; },
    (p, value) => { p.curriculum.units[0].phase_color = value; },
    (p, value) => { p.curriculum.units[0].availability = value; },
  ];
  mutations.forEach((mutate, index) => {
    let coercions = 0;
    const value = { toString() { coercions += 1; return "seed"; }, valueOf() { coercions += 1; return "seed"; } };
    const payload = clone(fixture);
    mutate(payload, value);
    assert.equal(api.validateResponse(payload), null, `mutation ${index}`);
    assert.equal(coercions, 0, `mutation ${index} coerced an untrusted identifier`);
  });
});

test("only safe relative weeks paths, including dotted filenames, are accepted", () => {
  const good = [
    "weeks/w01/d1.html", "weeks/w01/d1.v2.html", "weeks/topic-name_v2.html",
    "weeks/w10/nested-name/file.release-2.html",
  ];
  const bad = [
    "https://evil.invalid/x.html", "//evil.invalid/x.html", "/weeks/w01/d1.html",
    "weeks\\w01\\d1.html", "../x.html", "weeks/../x.html", "weeks/./x.html",
    "javascript:alert(1)", "weeks/w01/x.html?src=evil", "weeks/w01/x.html#fragment",
    "weeks/%2e%2e/x.html", "weeks/%2E%2E/x.html", "weeks/%252e%252e/x.html",
    "data:text/html,x", "x.html", "index.html", "other/w01/d1.html", "weeks.html",
    "weeks//x.html", "weeks/w01/", "weeks/w01/.hidden.html", "weeks/w01/x..html",
    "weeks/w01/x.html\n", "weeks/w01/x.html\u0000", "",
  ];
  good.forEach((href) => assert.equal(api.safeHref(href), true, href));
  bad.forEach((href) => assert.equal(api.safeHref(href), false, JSON.stringify(href)));
  bad.forEach((href) => {
    const payload = clone(assignmentFixture);
    payload.curriculum.units[0].href = href;
    assert.equal(api.validateResponse(payload), null, `unit href ${JSON.stringify(href)}`);
  });

  const dotted = clone(assignmentFixture);
  const dottedDoc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(dotted)), dottedDoc, {});
  assert.equal(byClass(dottedDoc.cal, "ct-link")[0].getAttribute("href"), "weeks/w01/d1.v2.html");
  assert.equal(byClass(dottedDoc.cal, "day-prog")[0].getAttribute("href"), "weeks/w01/d1.v2.html");

  const partPayload = clone(assignmentFixture);
  partPayload.curriculum.units[0].href = null;
  partPayload.curriculum.units[0].parts = [{ t: "Dotted part", href: "weeks/w01/d1.part-2.html" }];
  const partDoc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(partPayload)), partDoc, {});
  assert.equal(byClass(partDoc.cal, "cell-parts")[0].children[0].getAttribute("href"), "weeks/w01/d1.part-2.html");
  assert.equal(byClass(partDoc.cal, "day-prog")[0].getAttribute("href"), "weeks/w01/d1.part-2.html");

  const hostilePart = clone(assignmentFixture);
  hostilePart.curriculum.units[0].href = null;
  hostilePart.curriculum.units[0].parts = [{ t: "Escape", href: "weeks/%2e%2e/escape.html" }];
  assert.equal(api.validateResponse(hostilePart), null);
});

test("API strings render as inert text and phase colors pass a strict grammar", () => {
  const payload = clone(fixture);
  payload.curriculum.title = "<img src=x onerror=alert(1)>";
  payload.curriculum.phases.found.label = "<svg/onload=alert(1)>";
  payload.curriculum.units.forEach((unit) => {
    if (unit.phase_key === "found") unit.phase_label = payload.curriculum.phases.found.label;
  });
  payload.curriculum.units[0].title = "<img src=x onerror=alert(1)>";
  payload.curriculum.units[0].subtitle = "</div><script>alert(1)</script>";
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, {});
  assert.equal(descendants(doc.cal).some((node) => node.tagName === "IMG" || node.tagName === "SCRIPT" || node.tagName === "SVG"), false);
  assert.match(doc.cal.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.match(doc.cal.textContent, /<script>alert\(1\)<\/script>/);
  const badColor = clone(fixture);
  badColor.curriculum.phases.found.color = "red; background:url(javascript:x)";
  assert.equal(api.validateResponse(badColor), null);
});

test("nullable phase colors normalize to a code-owned neutral across available, planned, and missing DOM", () => {
  for (const availability of ["available", "planned", "missing"]) {
    const payload = clone(assignmentFixture);
    payload.curriculum.units[0].availability = availability;
    const validated = api.validateResponse(payload);
    assert.ok(validated, availability);
    assert.equal(validated.phases.found.color, "#6b7280");
    assert.equal(validated.units[0].phase_color, "#6b7280");
    const model = api.toCalendar(validated);
    const doc = new TinyDocument();
    api.renderCalendar(model, doc, {});
    assert.equal(byClass(doc.legend, "lg")[0].children[0].style.backgroundColor, "#6b7280");
    assert.equal(byClass(doc.cal, "cal-week")[0].style["--pc"], "#6b7280");
    assert.equal(byClass(doc.cal, "cal-cell")[0].style["--pc"], "#6b7280");
    assert.equal(byClass(doc.cal, "ct-link").length, availability === "available" ? 1 : 0);
    assert.equal(byClass(doc.cal, "day-prog").length, availability === "available" ? 1 : 0);
    assert.equal(byClass(doc.cal, "ritual").length, 1, `${availability} rituals stay active`);
  }

  const mixedCaseHex = clone(assignmentFixture);
  mixedCaseHex.curriculum.phases.found.color = "#ABCDEF";
  mixedCaseHex.curriculum.units[0].phase_color = "#abcdef";
  assert.ok(api.validateResponse(mixedCaseHex));

  const nullPhaseOnly = clone(assignmentFixture);
  nullPhaseOnly.curriculum.units[0].phase_color = "#6b7280";
  assert.equal(api.validateResponse(nullPhaseOnly), null);
  const nullUnitOnly = clone(assignmentFixture);
  nullUnitOnly.curriculum.phases.found.color = "#6b7280";
  assert.equal(api.validateResponse(nullUnitOnly), null);
  for (const invalid of ["", "red", "#123", "#1234567", "#12345g", 0, false, {}, []]) {
    const payload = clone(assignmentFixture);
    payload.curriculum.phases.found.color = invalid;
    payload.curriculum.units[0].phase_color = invalid;
    assert.equal(api.validateResponse(payload), null, `invalid nullable color ${JSON.stringify(invalid)}`);
  }
});

test("real loader activates and publishes a one-unit assigned response over the full static fallback", async () => {
  const doc = new TinyDocument();
  const root = host();
  const loader = api.createLoader({ root, document: doc, timeoutMs: 1000, fetch: async () => response(assignmentFixture) });
  assert.equal(await loader.resolve(), true);
  assert.equal(loader.getState(), "dynamic");
  assert.equal(root.WEEKS.filter(Boolean).length, 1);
  assert.equal(root.WEEKS[0].days.length, 1);
  assert.equal(root.WEEKS[0].days[0].t, "Assigned dotted content");
  assert.equal(root.WEEKS[0].days[0].s, "");
  assert.equal(root.PHASES.found.c, "#6b7280");
  assert.equal(byClass(doc.cal, "cal-cell").length, 1);
  assert.equal(byClass(doc.cal, "ct-link")[0].getAttribute("href"), "weeks/w01/d1.v2.html");
  assert.equal(doc.cal.textContent.includes("LLM fundamentals"), false);
});

test("partial assigned curriculum uses the unit day for rituals instead of its array index", () => {
  const payload = clone(assignmentFixture);
  Object.assign(payload.curriculum.units[0], {
    unit_key: "w01d3", day: 3, position: 103, href: "weeks/w01/d3.v2.html",
  });
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, {});
  assert.equal(byClass(doc.cal, "cr").length, 0, "day-three unit must not receive day-one client ritual");
  assert.equal(byClass(doc.cal, "cal-cell-day").length, 1);
  assert.equal(byClass(doc.cal, "cal-cell-day")[0].textContent, "Wednesday");
  assert.equal(byClass(doc.cal, "cal-cell-day")[0].getAttribute("aria-hidden"), null);
  assert.equal(byClass(doc.cal, "iv").length, 1);
  assert.equal(byClass(doc.cal, "ar").length, 1);
  assert.equal(byClass(doc.cal, "ar")[0].getAttribute("href"), "alt-research.html?w=1");
});

test("hostile assigned href fails atomically and leaves static fallback actions active", async () => {
  const payload = clone(assignmentFixture);
  payload.curriculum.units[0].href = "weeks/%2e%2e/escape.html";
  const doc = new TinyDocument();
  const root = host();
  const loader = api.createLoader({ root, document: doc, timeoutMs: 1000, fetch: async () => response(payload) });
  assert.equal(await loader.resolve(), false);
  assert.equal(loader.getState(), "fallback");
  assert.equal(root.WEEKS[0].days[0].t, "LLM fundamentals");
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  assert.equal(descendants(doc.cal).some((node) => node.getAttribute && (node.getAttribute("href") || "").includes("%2e")), false);
});

test("backend contract accepts planned units and normalizes nullable subtitle", () => {
  const payload = clone(fixture);
  payload.curriculum.units[0].availability = "planned";
  payload.curriculum.units[0].subtitle = null;
  payload.curriculum.units[1].availability = "planned";
  const validated = api.validateResponse(payload);
  assert.ok(validated);
  assert.equal(validated.units[0].availability, "planned");
  assert.equal(validated.units[0].subtitle, "");
  assert.equal(validated.units[1].parts.length, 2, "validated planned data retains safe parts for a future available render");
  [false, 0, {}, []].forEach((subtitle) => {
    const malformed = clone(fixture);
    malformed.curriculum.units[0].subtitle = subtitle;
    assert.equal(api.validateResponse(malformed), null, `subtitle ${JSON.stringify(subtitle)} must fail closed`);
  });

  const model = api.toCalendar(validated);
  assert.equal(model.weeks[0].days[0].s, "");
  const doc = new TinyDocument();
  api.renderCalendar(model, doc, { FDE_PROGRESS: { status: () => "started" } });
  for (const key of ["w01d1", "w01d2"]) {
    const card = descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === key);
    assert.ok((card.className || "").split(/\s+/).includes("planned"));
    assert.equal((card.className || "").split(/\s+/).includes("missing"), false);
    assert.equal(card.getAttribute("aria-disabled"), null);
    const region = descendants(card).find((node) => node.getAttribute && node.getAttribute("id") === card.getAttribute("aria-describedby"));
    assert.ok(region);
    assert.equal(region.getAttribute("aria-disabled"), "true");
    assert.match(region.getAttribute("aria-label"), /curriculum content planned$/);
    assert.equal(byClass(region, "availability-badge--planned")[0].textContent, "Planned");
    assert.equal(byClass(card, "ct-link").length, 0);
    assert.equal(byClass(card, "cell-parts").length, 0);
    assert.equal(byClass(card, "day-prog").length, 0);
  }
});

test("available unit with nullable subtitle keeps its keyboard-operable content and progress actions", () => {
  const payload = clone(fixture);
  payload.curriculum.units[0].subtitle = null;
  const validated = api.validateResponse(payload);
  assert.ok(validated);
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(validated), doc, {});
  const card = descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === "w01d1");
  assert.equal(byClass(card, "cs")[0].textContent, "");
  assert.equal(byClass(card, "ct-link").length, 1);
  assert.equal(byClass(card, "day-prog").length, 1);
  byClass(card, "ct-link")[0].focus();
  assert.equal(doc.activeElement, byClass(card, "ct-link")[0]);
});

test("planned rituals stay active outside disabled content and retain focus across rerender", () => {
  const payload = clone(fixture);
  payload.curriculum.units[1].availability = "planned";
  const model = api.toCalendar(api.validateResponse(payload));
  const doc = new TinyDocument();
  api.renderCalendar(model, doc, {});
  const card = () => descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === "w01d2");
  const disabledAncestor = (node) => {
    for (let current = node; current; current = current.parentNode) {
      if (current.getAttribute && current.getAttribute("aria-disabled") === "true") return current;
    }
    return null;
  };
  const rituals = descendants(card()).filter((node) => node.tagName === "A" && (node.className || "").split(/\s+/).includes("ritual"));
  assert.ok(rituals.length > 0);
  rituals.forEach((link) => {
    assert.equal(disabledAncestor(link), null);
    assert.ok(link.getAttribute("href"));
  });
  const dayLabel = byClass(card(), "cal-cell-day")[0];
  assert.equal(dayLabel.textContent, "Tuesday");
  assert.equal(dayLabel.getAttribute("aria-hidden"), null);
  assert.equal(disabledAncestor(dayLabel), null);
  const before = rituals[0];
  before.focus();
  api.renderCalendar(model, doc, {});
  const after = descendants(card()).filter((node) => node.tagName === "A" && (node.className || "").split(/\s+/).includes("ritual"))[0];
  assert.notEqual(after, before);
  assert.equal(doc.activeElement, after);
  assert.equal(disabledAncestor(after), null);
});

test("maximum phase and week labels render intact for narrow-screen wrapping", () => {
  const payload = clone(fixture);
  const phaseLabel = "P".repeat(100);
  const weekTitle = "W".repeat(200);
  payload.curriculum.phases.found.label = phaseLabel;
  payload.curriculum.units.forEach((unit) => {
    if (unit.phase_key === "found") unit.phase_label = phaseLabel;
    if (unit.week === 1) unit.week_title = weekTitle;
  });
  const validated = api.validateResponse(payload);
  assert.ok(validated);
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(validated), doc, {});
  assert.equal(byClass(doc.legend, "lg")[0].textContent, phaseLabel);
  assert.equal(byClass(doc.cal, "wt")[0].textContent, weekTitle);
  assert.equal(byClass(doc.cal, "wp")[0].textContent, phaseLabel);
});

test("missing units expose text and aria state with no curriculum link or progress control", () => {
  const payload = clone(fixture);
  payload.curriculum.units[0].availability = "missing";
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, { FDE_PROGRESS: { status: () => "completed" } });
  const card = descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === "w01d1");
  assert.ok((card.className || "").includes("missing"));
  assert.equal(card.getAttribute("role"), "group");
  assert.equal(card.getAttribute("aria-disabled"), null);
  const region = descendants(card).find((node) => node.getAttribute && node.getAttribute("id") === card.getAttribute("aria-describedby"));
  assert.ok(region);
  assert.equal(region.getAttribute("aria-disabled"), "true");
  assert.match(region.getAttribute("aria-label"), /unavailable/);
  assert.ok(region.contains(byClass(card, "ct")[0]));
  assert.equal(byClass(region, "availability-badge")[0].textContent, "Unavailable");
  assert.equal(byClass(card, "availability-badge")[0].getAttribute("role"), null);
  assert.equal(byClass(card, "ct-link").length, 0);
  assert.equal(byClass(card, "cell-parts").length, 0);
  assert.equal(byClass(card, "day-prog").length, 0);
});

test("missing unit ritual links stay active outside the disabled curriculum region", () => {
  const payload = clone(fixture);
  payload.curriculum.units[1].availability = "missing";
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, {});
  const card = descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === "w01d2");
  const rituals = descendants(card).filter((node) => node.tagName === "A" && (node.className || "").split(" ").includes("ritual"));
  assert.ok(rituals.length > 0);
  const disabledAncestor = (node) => {
    for (let current = node; current; current = current.parentNode) {
      if (current.getAttribute && current.getAttribute("aria-disabled") === "true") return current;
    }
    return null;
  };
  rituals.forEach((link) => {
    assert.equal(disabledAncestor(link), null);
    assert.ok(link.getAttribute("href"));
  });
  assert.ok(disabledAncestor(byClass(card, "ct")[0]));
  assert.ok(disabledAncestor(byClass(card, "availability-badge")[0]));
});

test("progress rerender preserves controls, stable identity, and focused control", () => {
  const model = api.toCalendar(api.validateResponse(clone(fixture)));
  const doc = new TinyDocument();
  let status = "started";
  const root = { FDE_PROGRESS: { status: () => status } };
  api.renderCalendar(model, doc, root);
  const before = byClass(doc.cal, "day-prog")[0];
  before.focus();
  status = "completed";
  api.renderCalendar(model, doc, root);
  const after = byClass(doc.cal, "day-prog")[0];
  assert.notEqual(after, before);
  assert.equal(after.textContent, "✓ Completed");
  assert.equal(doc.activeElement, after);
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  assert.equal(new Set(byClass(doc.cal, "cal-cell").map((card) => card.getAttribute("data-unit-key"))).size, 50);
});

test("dark, offline, server-error, parse-error, and malformed API all retain fallback", async () => {
  const cases = [
    async () => response({}, 404),
    async () => { throw new Error("offline"); },
    async () => response({}, 503),
    async () => ({ status: 200, ok: true, json: async () => { throw new Error("bad json"); } }),
    async () => response({ ok: true }, 200),
  ];
  for (const fetch of cases) {
    const { loader, root } = makeLoader({ fetch });
    assert.equal(await loader.resolve(), false);
    assert.equal(loader.getState(), "fallback");
    assert.equal(root.WEEKS[0].days[0].t, "LLM fundamentals");
  }
});

test("anonymous/no-session uses fallback and never calls the endpoint", async () => {
  let calls = 0;
  const { loader } = makeLoader({ root: { FDE_ensureSession: async () => "" }, fetch: async () => { calls += 1; } });
  assert.equal(await loader.resolve(), false);
  assert.equal(calls, 0);
});

test("request is a bearer GET with no identity, access code, query, or body", async () => {
  let seen;
  const { loader } = makeLoader({ fetch: async (url, options) => { seen = { url, options }; return response(fixture); } });
  assert.equal(await loader.resolve(), true);
  assert.equal(seen.url, "https://api.invalid/curriculum/resolved");
  assert.equal(seen.options.method, "GET");
  assert.equal(seen.options.headers.Authorization, "Bearer token");
  assert.equal(Object.hasOwn(seen.options, "body"), false);
  assert.equal(seen.options.cache, "no-store");
  assert.equal(seen.options.credentials, "omit");
});

test("401 refreshes the existing session once and never loops", async () => {
  const forces = [];
  let fetches = 0;
  const root = { FDE_ensureSession: async (force) => { forces.push(force); return force ? "fresh" : "stale"; } };
  const { loader } = makeLoader({ root, fetch: async () => (++fetches === 1 ? response({}, 401) : response(fixture)) });
  assert.equal(await loader.resolve(), true);
  assert.deepEqual(forces, [false, true]);
  assert.equal(fetches, 2);

  fetches = 0; forces.length = 0;
  const failed = makeLoader({ root, fetch: async () => { fetches += 1; return response({}, 401); } });
  assert.equal(await failed.loader.resolve(), false);
  assert.deepEqual(forces, [false, true]);
  assert.equal(fetches, 2);
});

test("bounded timeout leaves fallback even when a late response eventually succeeds", async () => {
  const wait = deferred();
  const { loader, root } = makeLoader({ timeoutMs: 10, fetch: () => wait.promise });
  assert.equal(await loader.resolve(), false);
  assert.equal(loader.getState(), "fallback");
  wait.resolve(response(fixture));
  await new Promise((done) => setTimeout(done, 0));
  assert.equal(root.WEEKS[0].title, "LLM Engineering for Production");
  assert.equal(loader.getState(), "fallback");
});

test("late older resolution cannot clobber a newer valid render", async () => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const { loader, root } = makeLoader({ timeoutMs: 1000, fetch: () => (++calls === 1 ? first.promise : second.promise) });
  const older = loader.resolve();
  await Promise.resolve(); // let the older generation enter fetch before superseding it
  const newer = loader.resolve();
  const newestPayload = clone(fixture);
  newestPayload.curriculum.units[0].title = "Newest assignment";
  second.resolve(response(newestPayload));
  assert.equal(await newer, true);
  first.resolve(response(fixture));
  assert.equal(await older, false);
  assert.equal(root.WEEKS[0].days[0].t, "Newest assignment");
});

test("inline static renderer keeps the calendar fully usable when the loader asset is absent", () => {
  const doc = new TinyDocument();
  const listeners = {};
  let progress = "started";
  const window = {
    document: doc,
    FDE_PROGRESS: { status: () => progress },
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
  };
  const context = vm.createContext({ window, document: doc });
  vm.runInContext(calendarInlineScript(), context);
  assert.equal(typeof window.FDE_STATIC_CALENDAR_RENDER, "function");
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  assert.equal(byClass(doc.cal, "cal-week").length, 10);
  assert.equal(byClass(doc.cal, "cal-cell-day").length, 50);
  assert.deepEqual(byClass(doc.cal, "cal-cell-day").slice(0, 5).map((node) => node.textContent), ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  assert.equal(byClass(doc.cal, "day-prog").length, 40);
  assert.equal(byClass(doc.cal, "ritual").length > 0, true);
  assert.equal(byClass(doc.cal, "day-prog")[0].textContent, "↻ Resume");
  assert.equal(listeners["fde-progress-sync"].length, 1);
  progress = "completed";
  listeners["fde-progress-sync"][0]();
  assert.equal(byClass(doc.cal, "day-prog")[0].textContent, "✓ Completed");
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
});

test("dynamic loader takes ownership from the static renderer without duplicate listeners", async () => {
  const source = fs.readFileSync(loaderPath, "utf8");
  const doc = new TinyDocument();
  const listeners = {};
  const window = {
    document: doc,
    FDE_PROGRESS: { status: () => "none" },
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "",
    fetch: async () => response({}, 404),
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    removeEventListener: (name, fn) => { listeners[name] = (listeners[name] || []).filter((item) => item !== fn); },
  };
  const context = vm.createContext({ window, document: doc, globalThis: window, AbortController, setTimeout, clearTimeout, module: undefined });
  vm.runInContext(calendarInlineScript(), context);
  const originalCards = byClass(doc.cal, "cal-cell");
  vm.runInContext(source, context);
  assert.equal(listeners["fde-progress-sync"].length, 1);
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  assert.equal(byClass(doc.cal, "cal-cell")[0], originalCards[0], "loader should adopt the already-rendered fallback without replacing it");
  await new Promise((done) => setTimeout(done, 0));
});

test("auto-boot installs one progress listener and never duplicates calendar DOM", async () => {
  const source = fs.readFileSync(loaderPath, "utf8");
  const doc = new TinyDocument();
  const listeners = {};
  const window = host({
    document: doc,
    fetch: async () => response({}, 404),
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
  });
  const context = vm.createContext({ window, globalThis: window, AbortController, setTimeout, clearTimeout, module: undefined });
  vm.runInContext(source, context);
  vm.runInContext(source, context);
  assert.equal(listeners["fde-progress-sync"].length, 1);
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  listeners["fde-progress-sync"][0]();
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  await new Promise((done) => setTimeout(done, 0));
});

test("curriculum resolution emits the existing progress-sync signal once without a listener loop", async () => {
  const source = fs.readFileSync(loaderPath, "utf8");
  const doc = new TinyDocument();
  const listeners = {};
  const emitted = [];
  class FakeEvent { constructor(type) { this.type = type; } }
  const window = host({
    document: doc,
    CustomEvent: FakeEvent,
    fetch: async () => response(fixture),
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => {
      emitted.push(event.type);
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  });
  const context = vm.createContext({ window, globalThis: window, AbortController, setTimeout, clearTimeout, module: undefined });
  vm.runInContext(source, context);
  for (let i = 0; i < 10 && window.__FDE_CURRICULUM_LOADER__.getState() !== "dynamic"; i += 1) {
    await new Promise((done) => setTimeout(done, 0));
  }
  assert.equal(window.__FDE_CURRICULUM_LOADER__.getState(), "dynamic");
  assert.deepEqual(emitted, ["fde-progress-sync"]);
  assert.equal(listeners["fde-progress-sync"].length, 1);
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
});

function parseStylesheet(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const walk = (start, media) => {
    let index = start;
    let prelude = "";
    while (index < text.length) {
      const char = text[index];
      if (char === "}") return index + 1;
      if (char === "{") {
        const head = prelude.trim();
        prelude = "";
        if (head.startsWith("@")) {
          const context = head.startsWith("@media") ? head.slice("@media".length) : head;
          index = walk(index + 1, context.trim().replace(/\s+/g, " "));
          continue;
        }
        const end = text.indexOf("}", index);
        const declarations = {};
        for (const part of text.slice(index + 1, end).split(";")) {
          const colon = part.indexOf(":");
          if (colon > 0) declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
        }
        for (const selector of head.split(",")) rules.push({ media, selector: selector.trim().replace(/\s+/g, " "), declarations });
        index = end + 1;
        continue;
      }
      prelude += char;
      index += 1;
    }
    return index;
  };
  walk(0, null);
  return rules;
}

function computedRule(rules, selector, media = null) {
  return rules
    .filter((rule) => rule.selector === selector && rule.media === media)
    .reduce((merged, rule) => Object.assign(merged, rule.declarations), {});
}

function inlineStylesheet(html) {
  const start = html.indexOf("<style>") + "<style>".length;
  return html.slice(start, html.indexOf("</style>", start));
}

test("320 px stylesheet contract reflows to one column without fixed-width cards", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const page = parseStylesheet(inlineStylesheet(html));
  const site = parseStylesheet(fs.readFileSync(path.join(__dirname, "..", "assets/css/style.css"), "utf8"));
  assert.equal(computedRule(site, ".cal", "(max-width:1000px)")["grid-template-columns"], "1fr");
  assert.equal(computedRule(page, ".cal-wrap", "(max-width:600px)").padding, "12px 12px 40px");
  for (const selector of [".cal-cell", ".cal-cell .ct", ".cal-cell .cs"]) {
    assert.equal(computedRule(page, selector)["min-width"], "0", selector);
    assert.equal(computedRule(page, selector)["overflow-wrap"], "anywhere", selector);
  }
  assert.deepEqual(
    { maxWidth: computedRule(page, ".legend .lg")["max-width"], wrap: computedRule(page, ".legend .lg")["overflow-wrap"] },
    { maxWidth: "100%", wrap: "anywhere" },
  );
  for (const selector of [".cal-week .wt", ".cal-week .wp"]) {
    assert.equal(computedRule(page, selector)["overflow-wrap"], "anywhere", selector);
  }
  assert.equal(computedRule(page, ".cal-cell-day").display, "none");
  assert.equal(computedRule(page, ".cal-cell-day", "(max-width:1000px)").display, "block");
  assert.equal(computedRule(site, ".cal-dayhead", "(max-width:1000px)").display, "none");
  const missing = computedRule(page, ".cal-cell.missing");
  const planned = computedRule(page, ".cal-cell.planned");
  assert.equal(planned["border-style"], "dotted");
  assert.notEqual(planned["border-style"], missing["border-style"]);
  const badge = computedRule(page, ".availability-badge");
  const plannedBadge = computedRule(page, ".availability-badge--planned");
  assert.ok(plannedBadge.color, "planned badge sets a text color");
  assert.ok(plannedBadge.background, "planned badge sets a background");
  assert.notEqual(plannedBadge.color, badge.color);
  assert.notEqual(plannedBadge.background, badge.background);
});

function desktopGridPlacement(cal, rules) {
  const media = "(min-width:1001px)";
  const columnFor = (node) => (node.className || "").split(/\s+/).filter(Boolean)
    .map((name) => computedRule(rules, `.${name}`, media)["grid-column"])
    .filter(Boolean).pop();
  const placed = [];
  let row = 1;
  let column = 1;
  for (const node of cal.childNodes) {
    const explicit = columnFor(node) === undefined ? null : Number(columnFor(node));
    if (explicit === null) {
      if (column > 6) { row += 1; column = 1; }
      placed.push({ node, row, column });
      column += 1;
      continue;
    }
    if (explicit < column) row += 1;
    column = explicit;
    placed.push({ node, row, column });
    column += 1;
  }
  return placed;
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255).map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("week labels use theme foreground contrast independently of phase color", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const page = parseStylesheet(inlineStylesheet(html));
  const site = parseStylesheet(fs.readFileSync(path.join(__dirname, "..", "assets/css/style.css"), "utf8"));
  assert.equal(computedRule(page, ".cal-week .ww").color, "var(--ink)");
  assert.equal(computedRule(site, ".cal-week").background, "var(--surface)");
  const light = computedRule(site, ":root");
  const dark = computedRule(site, 'html[data-theme="dark"]');
  assert.ok(contrastRatio(light["--ink"], light["--surface"]) >= 4.5);
  assert.ok(contrastRatio(dark["--ink"], dark["--surface"]) >= 4.5);

  for (const color of ["#ffffff", "#000000", null]) {
    const payload = clone(assignmentFixture);
    payload.curriculum.phases.found.color = color;
    payload.curriculum.units[0].phase_color = color;
    const doc = new TinyDocument();
    api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, {});
    const week = byClass(doc.cal, "cal-week")[0];
    assert.equal(week.style["--pc"], color === null ? "#6b7280" : color);
    assert.equal(byClass(week, "ww")[0].style.color, undefined, "backend color must not become inline week-label text color");
  }
});

test("partial assigned units land under their weekday column on the desktop grid", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const page = parseStylesheet(inlineStylesheet(html));
  const payload = clone(assignmentFixture);
  const template = payload.curriculum.units[0];
  payload.curriculum.units = [[1, 3], [2, 2], [2, 5]].map(([week, day]) => Object.assign(clone(template), {
    unit_key: `w0${week}d${day}`, week, day, position: week * 100 + day, href: `weeks/w0${week}/d${day}.html`,
  }));
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, {});
  const placed = desktopGridPlacement(doc.cal, page);
  const heads = placed.filter(({ node }) => node.className === "cal-dayhead");
  const columnOf = (label) => heads.find(({ node }) => node.textContent === label).column;
  const unit = (key) => placed.find(({ node }) => node.getAttribute && node.getAttribute("data-unit-key") === key);
  const weeks = placed.filter(({ node }) => node.className === "cal-week");
  assert.deepEqual(weeks.map(({ column }) => column), [1, 1]);
  assert.equal(unit("w01d3").column, columnOf("Wed"));
  assert.equal(unit("w01d3").row, weeks[0].row);
  assert.equal(unit("w02d2").column, columnOf("Tue"));
  assert.equal(unit("w02d5").column, columnOf("Fri"));
  assert.equal(unit("w02d2").row, weeks[1].row);
  assert.equal(unit("w02d5").row, weeks[1].row);
  assert.equal(computedRule(parseStylesheet(fs.readFileSync(path.join(__dirname, "..", "assets/css/style.css"), "utf8")), ".cal", "(max-width:1000px)")["grid-template-columns"], "1fr");
  assert.equal(computedRule(page, ".cal-day-3", "(max-width:1000px)")["grid-column"], undefined);
});

test("loader never persists curriculum, provenance, identity, or bearer material", async () => {
  const writes = [];
  const storage = (name) => ({
    getItem: () => null,
    setItem: (key, value) => { writes.push([name, key, value]); },
    removeItem: (key) => { writes.push([name, "remove", key]); },
    clear: () => { writes.push([name, "clear"]); },
  });
  const doc = new TinyDocument();
  Object.defineProperty(doc, "cookie", { get: () => "", set: (value) => { writes.push(["cookie", value]); } });
  const payload = clone(fixture);
  payload.provenance.source_kind = "override";
  payload.provenance.effective_from = 1699999999000;
  payload.provenance.version_no = 7;
  const root = host({
    localStorage: storage("localStorage"),
    sessionStorage: storage("sessionStorage"),
    indexedDB: { open: () => { writes.push(["indexedDB"]); } },
    FDE_ensureSession: async () => "secret-bearer",
  });
  const before = new Set(Object.keys(root));
  const loader = api.createLoader({ root, document: doc, timeoutMs: 1000, fetch: async () => response(payload) });
  assert.equal(await loader.resolve(), true);
  assert.equal(loader.getState(), "dynamic");
  assert.deepEqual(writes, []);
  assert.deepEqual(Object.keys(root).filter((key) => !before.has(key)), []);
  const retained = JSON.stringify({ PHASES: root.PHASES, WEEKS: root.WEEKS });
  for (const secret of ["secret-bearer", "provenance", "version_id", "source_kind", "override", payload.curriculum.slug]) {
    assert.equal(retained.includes(secret), false, secret);
  }
  assert.equal(doc.cal.textContent.includes("secret-bearer"), false);
  assert.equal(descendants(doc.cal).some((node) => Object.values(node.attributes).some((value) => value.includes("secret-bearer"))), false);
});

test("rerender restores focus to a ritual link on the same card", () => {
  const model = api.toCalendar(api.validateResponse(clone(fixture)));
  const doc = new TinyDocument();
  api.renderCalendar(model, doc, {});
  const card = () => descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === "w02d5");
  const before = byClass(card(), "ar")[0];
  before.focus();
  api.renderCalendar(model, doc, {});
  const after = byClass(card(), "ar")[0];
  assert.notEqual(after, before);
  assert.equal(doc.activeElement, after);
  assert.equal(after.textContent, "🔬 Alt research · due");
});
