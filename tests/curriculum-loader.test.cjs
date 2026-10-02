"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "assets/js/curriculum-loader.js");
const readingCoachPath = path.join(__dirname, "..", "assets/js/reading-coach.js");
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

function renderCanonical(calendar, doc, root = {}) {
  return api.renderCalendar(calendar, doc, root, api.assistantWeekParity(calendar, calendar));
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
    this.dataset = {};
    this._text = "";
    this._html = "";
    this.classList = {
      add: (...names) => { this.className = [...new Set(this.className.split(/\s+/).filter(Boolean).concat(names))].join(" "); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter((name) => name && !names.includes(name)).join(" "); },
      toggle: (name, force) => {
        const present = this.className.split(/\s+/).includes(name);
        const add = force === undefined ? !present : !!force;
        if (add) this.classList.add(name); else this.classList.remove(name);
        return add;
      },
    };
    this.style = {
      setProperty: (name, value) => { this.style[name] = value; },
    };
    this.listeners = {};
  }
  get childNodes() { return this.children; }
  set textContent(value) { this._text = String(value); this._html = ""; this.children = []; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); }
  set innerHTML(value) {
    this._html = String(value);
    this._text = "";
    this.children = [];
    if (!this.ownerDocument || !this.ownerDocument.parseHtml) return;
    const tags = this._html.matchAll(/<([a-z][a-z0-9-]*)([^>]*)>/gi);
    for (const match of tags) {
      const child = this.ownerDocument.createElement(match[1]);
      for (const attr of match[2].matchAll(/([a-z][a-z0-9-]*)(?:="([^"]*)")?/gi)) {
        child.setAttribute(attr[1], attr[2] === undefined ? "" : attr[2]);
      }
      this.appendChild(child);
    }
  }
  get innerHTML() { return this._html; }
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
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
    if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    if (name === "hidden") this.hidden = true;
  }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  click() { (this.listeners.click || []).forEach((fn) => fn({ target: this, preventDefault() {} })); }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  querySelectorAll(selector) {
    if (/^\.[A-Za-z0-9_-]+$/.test(selector)) return byClass(this, selector.slice(1));
    return [];
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
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
    this.parseHtml = false;
    this.listeners = {};
    this.readyState = "complete";
    this.body = new TinyNode("body", this);
    this.documentElement = new TinyNode("html", this);
    this.legend = new TinyNode("div", this);
    this.legend.className = "legend";
    this.cal = new TinyNode("div", this);
    this.cal.setAttribute("id", "cal");
  }
  createElement(tag) { return new TinyNode(tag, this); }
  createTextNode(text) { const node = new TinyNode("#text", this); node.textContent = text; return node; }
  createDocumentFragment() { return new TinyNode("", this, true); }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  getElementById(id) {
    if (id === "cal") return this.cal;
    return descendants(this.body).concat(descendants(this.cal), descendants(this.legend))
      .find((node) => node.id === id || node.getAttribute && node.getAttribute("id") === id) || null;
  }
  contains(target) { return this.cal.contains(target) || this.legend.contains(target) || this.body.contains(target); }
  querySelectorAll(selector) {
    if (selector === ".cal-week") return byClass(this.cal, "cal-week");
    if (/^\.[A-Za-z0-9_-]+$/.test(selector)) return byClass(this.cal, selector.slice(1));
    return [];
  }
  querySelector(selector) {
    if (selector === ".legend") return this.legend;
    const match = /^\[data-unit-key="([^"]+)"\] \[data-focus-role="([^"]+)"\]$/.exec(selector);
    if (match) {
      const card = descendants(this.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === match[1]);
      return card && descendants(card).find((node) => node.getAttribute && node.getAttribute("data-focus-role") === match[2]) || null;
    }
    const weekMatch = /^\.cal-week\[data-week-key="([^"]+)"\](?: \.rc-weekask)?$/.exec(selector);
    if (weekMatch) {
      const week = byClass(this.cal, "cal-week").find((node) => node.getAttribute("data-week-key") === weekMatch[1]);
      return selector.endsWith(" .rc-weekask") ? week && week.querySelector(".rc-weekask") || null : week || null;
    }
    return this.querySelectorAll(selector)[0] || null;
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

test("week-assistant grounding requires exact ordered canonical unit paths", () => {
  const canonical = staticCalendar();
  const exact = api.toCalendar(api.validateResponse(clone(fixture)));
  const exactParity = api.assistantWeekParity(exact, canonical);
  assert.equal(exactParity.w01, true);
  assert.equal(exactParity.w06, true);

  const partial = api.toCalendar(api.validateResponse(clone(assignmentFixture)));
  assert.deepEqual(Object.keys(api.assistantWeekParity(partial, canonical)), []);

  const divergentPayload = clone(fixture);
  divergentPayload.curriculum.units[0].href = "weeks/w01/d1.v2.html";
  const divergent = api.toCalendar(api.validateResponse(divergentPayload));
  const divergentParity = api.assistantWeekParity(divergent, canonical);
  assert.equal(divergentParity.w01, undefined);
  assert.equal(divergentParity.w02, true);

  const unavailablePayload = clone(fixture);
  unavailablePayload.curriculum.units[0].availability = "planned";
  unavailablePayload.curriculum.units[0].href = null;
  const unavailable = api.toCalendar(api.validateResponse(unavailablePayload));
  assert.equal(api.assistantWeekParity(unavailable, canonical).w01, undefined);
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
  assert.equal(byClass(doc.cal, "cal-week")[0].getAttribute("data-assistant-grounding"), null);
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
  assert.equal(byClass(doc.cal, "cal-week").every((week) => week.getAttribute("data-assistant-grounding") === "canonical"), true);
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

test("delayed dynamic resolution restores focus to the corresponding remounted week assistant", async () => {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  class FakeEvent { constructor(type) { this.type = type; } }
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => { (listeners[event.type] || []).forEach((fn) => fn(event)); },
  };
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = vm.createContext({
    window, document: doc, location: { pathname: "/index.html" }, navigator: {}, localStorage: storage,
    setTimeout, clearTimeout, console,
  });
  vm.runInContext(fs.readFileSync(readingCoachPath, "utf8"), context);
  const week = () => byClass(doc.cal, "cal-week").find((node) => node.getAttribute("data-week-key") === "w01");
  const before = week().querySelector(".rc-weekask");
  assert.ok(before);
  assert.equal(before.getAttribute("data-focus-role"), "week-assistant");
  before.focus();

  const wait = deferred();
  const loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    fetch: () => wait.promise,
  });
  const resolving = loader.resolve();
  await Promise.resolve();
  wait.resolve(response(fixture));
  assert.equal(await resolving, true);
  await new Promise((done) => setTimeout(done, 5));

  const after = week().querySelector(".rc-weekask");
  assert.ok(after);
  assert.notEqual(after, before);
  assert.equal(doc.activeElement, after);
  assert.equal(after.getAttribute("data-focus-role"), "week-assistant");
});

test("divergent resolved weeks suppress canonical assistants while exact seed and fallback remain eligible", async () => {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  class FakeEvent { constructor(type) { this.type = type; } }
  let payload = fixture;
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => { (listeners[event.type] || []).forEach((fn) => fn(event)); },
  };
  const loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    fetch: async () => response(payload),
  });
  window.addEventListener("fde-progress-sync", loader.render);
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = vm.createContext({
    window, document: doc, location: { pathname: "/index.html" }, navigator: {}, localStorage: storage,
    setTimeout, clearTimeout, console,
  });
  vm.runInContext(fs.readFileSync(readingCoachPath, "utf8"), context);
  assert.equal(byClass(doc.cal, "rc-weekask").length, 6, "static fallback exposes canonical weeks 1-6");

  assert.equal(await loader.resolve(), true);
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(byClass(doc.cal, "rc-weekask").length, 6, "exact seed dynamic response preserves assistants");

  const focused = doc.querySelector('.cal-week[data-week-key="w01"] .rc-weekask');
  focused.focus();
  payload = clone(fixture);
  payload.curriculum.units[0].href = "weeks/w01/d1.v2.html";
  assert.equal(await loader.resolve(), true);
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(doc.contains(focused), false);
  assert.equal(doc.activeElement, doc.querySelector('.cal-week[data-week-key="w01"]'), "suppressed focused launcher moves to its week heading");
  assert.equal(doc.querySelector('.cal-week[data-week-key="w01"] .rc-weekask'), null, "divergent href suppresses w01");
  assert.ok(doc.querySelector('.cal-week[data-week-key="w02"] .rc-weekask'), "unchanged exact-parity week remains eligible");
  assert.equal(byClass(doc.cal, "rc-weekask").length, 5);
  assert.ok(byClass(doc.cal, "ritual").length > 0, "ritual controls remain active");

  doc.activeElement = doc.body;
  window.dispatchEvent(new FakeEvent("fde-progress-sync"));
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(doc.activeElement, doc.body, "suppression clears stale week focus");

  payload = assignmentFixture;
  assert.equal(await loader.resolve(), true);
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(byClass(doc.cal, "rc-weekask").length, 0, "accepted partial dotted-path assignment cannot open canonical tutoring");
  assert.ok(byClass(doc.cal, "ritual").length > 0, "partial assignment rituals remain available");

  loader.cancel();
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(loader.getState(), "fallback");
  assert.equal(byClass(doc.cal, "rc-weekask").length, 6, "idle cancellation restores canonical fallback assistants once");
  for (const cell of byClass(doc.cal, "cal-week")) assert.ok(byClass(cell, "rc-weekask").length <= 1);
});

function assistantResponse(data, status = 200) {
  return { status, json: async () => clone(data) };
}

function revocationPayload(kind) {
  if (kind === "partial") return clone(assignmentFixture);
  const payload = clone(fixture);
  if (kind === "divergent") payload.curriculum.units[0].href = "weeks/w01/d1.v2.html";
  else if (kind === "planned" || kind === "missing") payload.curriculum.units[0].availability = kind;
  return payload;
}

function revocationHarness(assistantFetch) {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  doc.parseHtml = true;
  const listeners = {};
  class FakeEvent { constructor(type) { this.type = type; } }
  let curriculumPayload = fixture;
  let curriculumFetch = async () => response(curriculumPayload);
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_getIdentity: () => ({ code: "test-only" }),
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => { (listeners[event.type] || []).slice().forEach((fn) => fn(event)); },
  };
  const loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    fetch: () => curriculumFetch(),
  });
  window.__FDE_CURRICULUM_LOADER__ = loader;
  window.addEventListener("fde-progress-sync", loader.render);
  const values = new Map();
  const writes = [];
  const storage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => { values.set(key, String(value)); writes.push([key, String(value)]); },
    removeItem: (key) => { values.delete(key); writes.push([key, null]); },
  };
  const context = vm.createContext({
    window, document: doc, location: { pathname: "/index.html" }, navigator: {}, localStorage: storage,
    fetch: assistantFetch, setTimeout, clearTimeout, console,
  });
  vm.runInContext(fs.readFileSync(readingCoachPath, "utf8"), context);
  return {
    doc, fallback, loader, window, storage, values, writes,
    setCurriculum(payload) { curriculumPayload = payload; },
    setCurriculumFetch(fn) { curriculumFetch = fn; },
    weekButton(week = "w01") { return doc.querySelector(`.cal-week[data-week-key="${week}"] .rc-weekask`); },
  };
}

const flushPromises = () => new Promise((done) => setTimeout(done, 0));

for (const kind of ["divergent", "partial", "planned", "missing"]) {
  test(`open week assistant is revoked before deferred start/digest can publish after ${kind} parity loss`, async () => {
    const held = [];
    const harness = revocationHarness(() => {
      const wait = deferred();
      held.push(wait);
      return wait.promise;
    });
    const { doc, loader, values } = harness;
    const launcher = harness.weekButton();
    assert.ok(launcher);
    launcher.click();
    assert.equal(held.length, 2, "open owns one digest and one session-start request");
    assert.equal(doc.getElementById("rcModal").hidden, false);
    assert.equal(doc.body.style.overflow, "hidden");
    values.set("rc-digest-w01", "stale digest");
    values.set("rc-sid-week:w01", "stale session");
    values.set("rc-log-week:w01", "stale transcript");

    harness.setCurriculum(revocationPayload(kind));
    assert.equal(await loader.resolve(), true);
    assert.equal(harness.weekButton(), null);
    assert.equal(doc.getElementById("rcModal").hidden, true);
    assert.equal(doc.body.style.overflow, "");
    assert.equal(doc.activeElement, doc.querySelector('.cal-week[data-week-key="w01"]') || doc.cal);
    for (const key of ["rc-digest-w01", "rc-sid-week:w01", "rc-log-week:w01"]) assert.equal(values.has(key), false);

    const late = assistantResponse({
      ok: true,
      sessionId: "revoked-session",
      opening: "late opening",
      digest: "late digest",
      week: { label: "Late week", days: [{ id: "late", title: "Late", path: "weeks/w01/d1.html" }] },
      budgetLeft: 9,
      budgetTotal: 10,
    });
    held.forEach((wait) => wait.resolve(late));
    await flushPromises();
    await flushPromises();

    assert.equal(doc.getElementById("rcModal").hidden, true);
    assert.equal(doc.getElementById("rcLog").children.length, 0);
    assert.equal(doc.getElementById("rcPromptBox").textContent, "");
    assert.equal(doc.getElementById("rcName").textContent, "");
    assert.equal(doc.getElementById("rcSend").disabled, false);
    for (const key of ["rc-digest-w01", "rc-sid-week:w01", "rc-log-week:w01"]) assert.equal(values.has(key), false, `${key} stays revoked`);
    for (const cell of byClass(doc.cal, "cal-week")) assert.ok(byClass(cell, "rc-weekask").length <= 1);
  });
}

test("revoked week ignores deferred message and custom-prompt completions", async () => {
  const messageWait = deferred();
  const customWait = deferred();
  const assistantFetch = (url) => {
    if (url.endsWith("/reading/message")) return messageWait.promise;
    if (url.endsWith("/reading/prompt/custom")) return customWait.promise;
    return Promise.resolve(assistantResponse({
      ok: true,
      sessionId: "active-session",
      opening: "canonical opening",
      digest: "canonical digest",
      week: { label: "Week 1", days: [{ id: "w01d1", title: "Day 1", path: "weeks/w01/d1.html" }] },
      budgetLeft: 10,
      budgetTotal: 10,
    }));
  };
  const harness = revocationHarness(assistantFetch);
  const { doc, loader, values, writes } = harness;
  harness.weekButton().click();
  await flushPromises();
  await flushPromises();
  assert.equal(values.has("rc-sid-week:w01"), true);

  doc.getElementById("rcInput").value = "deferred question";
  doc.getElementById("rcSend").click();
  doc.getElementById("rcCustomNote").value = "deferred custom prompt";
  doc.getElementById("rcCustomGo").click();
  const writesBeforeRevocation = writes.length;

  harness.setCurriculum(revocationPayload("divergent"));
  assert.equal(await loader.resolve(), true);
  const writesAfterRevocation = writes.length;
  messageWait.resolve(assistantResponse({ ok: true, reply: "late answer", capped: true, budgetLeft: 0, budgetTotal: 10 }));
  customWait.resolve(assistantResponse({ ok: true, prompt: "late custom prompt" }));
  await flushPromises();
  await flushPromises();

  assert.ok(writesAfterRevocation > writesBeforeRevocation, "revocation clears prior week cache");
  assert.equal(writes.length, writesAfterRevocation, "late completions cannot write storage");
  assert.equal(doc.getElementById("rcModal").hidden, true);
  assert.equal(doc.getElementById("rcLog").children.length, 0);
  assert.equal(doc.getElementById("rcPromptBox").textContent, "");
  assert.equal(doc.getElementById("rcPNote").textContent, "");
  assert.equal(doc.getElementById("rcSend").disabled, false, "late capped state cannot relock chat");
  assert.equal(doc.getElementById("rcCustomGo").disabled, false, "late custom completion cannot change busy state");
  assert.equal(values.has("rc-sid-week:w01"), false);
  assert.equal(values.has("rc-log-week:w01"), false);
  assert.equal(values.has("rc-digest-w01"), false);

  harness.setCurriculum(clone(fixture));
  assert.equal(await loader.resolve(), true);
  const reopened = harness.weekButton();
  assert.ok(reopened, "exact parity remounts the revoked week's launcher");
  reopened.click();
  await flushPromises();
  await flushPromises();
  assert.equal(doc.getElementById("rcModal").hidden, false);
  assert.equal(values.has("rc-sid-week:w01"), true, "fresh exact-parity session can start after revocation");
  assert.ok(doc.getElementById("rcLog").children.length > 0);
});

test("week launchers stay suppressed while resolution loads and return only after exact or fallback settlement", async () => {
  const wait = deferred();
  const harness = revocationHarness(() => Promise.resolve(assistantResponse({ ok: false })));
  const { loader } = harness;
  let pending = wait;
  harness.setCurriculumFetch(() => pending.promise);

  const { doc } = harness;
  const heading = () => doc.querySelector('.cal-week[data-week-key="w01"]');
  const launcher = () => doc.querySelector('.cal-week[data-week-key="w01"] .rc-weekask');
  assert.equal(byClass(harness.doc.cal, "rc-weekask").length, 6);
  launcher().focus();
  const exactResolution = loader.resolve();
  await Promise.resolve();
  assert.equal(byClass(harness.doc.cal, "rc-weekask").length, 0, "launchers disappear when the authenticated request starts");
  assert.equal(doc.activeElement, heading(), "focused launcher hands focus to its week heading while loading");
  assert.equal(heading().getAttribute("tabindex"), "-1");
  wait.resolve(response(fixture));
  assert.equal(await exactResolution, true);
  assert.equal(byClass(harness.doc.cal, "rc-weekask").length, 6, "exact dynamic settlement remounts canonical launchers");
  assert.equal(doc.activeElement, launcher(), "exact settlement restores focus to the remounted launcher");

  const failed = deferred();
  pending = failed;
  const fallbackResolution = loader.resolve();
  await Promise.resolve();
  assert.equal(byClass(harness.doc.cal, "rc-weekask").length, 0);
  assert.equal(doc.activeElement, heading(), "retry loading keeps focus on the stable week heading");
  failed.resolve(response({}, 503));
  assert.equal(await fallbackResolution, false);
  assert.equal(byClass(harness.doc.cal, "rc-weekask").length, 6, "failed resolution remounts launchers only after fallback settles");
  assert.equal(doc.activeElement, launcher(), "fallback settlement restores focus to the remounted launcher");

  const unfocused = deferred();
  pending = unfocused;
  doc.activeElement = doc.body;
  const quietResolution = loader.resolve();
  await Promise.resolve();
  assert.equal(doc.activeElement, doc.body, "loading does not steal focus that was not on a launcher");
  unfocused.resolve(response(fixture));
  assert.equal(await quietResolution, true);
  assert.equal(doc.activeElement, doc.body);
  for (const cell of byClass(harness.doc.cal, "cal-week")) assert.ok(byClass(cell, "rc-weekask").length <= 1);
});

async function assertFailedRetryRestoresWeekAssistant(failure) {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  const emitted = [];
  class FakeEvent { constructor(type) { this.type = type; } }
  let fetchAttempt = async () => response(fixture);
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => {
      emitted.push(event.type);
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  };
  const loader = api.createLoader({
    root: window, document: doc, timeoutMs: 8, fallback, fallbackAlreadyRendered: true,
    fetch: (...args) => fetchAttempt(...args),
  });
  // Match boot order: the loader's progress renderer is registered before the
  // reading coach's remount listener.
  window.addEventListener("fde-progress-sync", loader.render);
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = vm.createContext({
    window, document: doc, location: { pathname: "/index.html" }, navigator: {}, localStorage: storage,
    setTimeout, clearTimeout, console,
  });
  vm.runInContext(fs.readFileSync(readingCoachPath, "utf8"), context);

  assert.equal(await loader.resolve(), true);
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(loader.getState(), "dynamic");
  const week = () => byClass(doc.cal, "cal-week").find((node) => node.getAttribute("data-week-key") === "w01");
  const before = week().querySelector(".rc-weekask");
  assert.ok(before);
  before.focus();
  const listenerCounts = Object.fromEntries(Object.entries(listeners).map(([name, entries]) => [name, entries.length]));
  const integrationCount = emitted.filter((name) => name === "fde-progress-sync").length;

  fetchAttempt = failure;
  assert.equal(await loader.resolve(), false);
  await new Promise((done) => setTimeout(done, 12));

  const after = week().querySelector(".rc-weekask");
  assert.equal(loader.getState(), "fallback");
  assert.ok(after, "fallback remounts the corresponding week assistant");
  assert.notEqual(after, before, "the replaced control is a new node");
  assert.equal(doc.contains(before), false, "the focused old control is disconnected");
  assert.equal(doc.activeElement, after, "focus follows the stable week token");
  assert.equal(byClass(doc.cal, "rc-weekask").length, 6, "one assistant mounts for each readable fallback week");
  for (const cell of byClass(doc.cal, "cal-week")) {
    assert.ok(byClass(cell, "rc-weekask").length <= 1, "week assistants never duplicate");
  }
  assert.deepEqual(
    Object.fromEntries(Object.entries(listeners).map(([name, entries]) => [name, entries.length])),
    listenerCounts,
    "retry does not duplicate integration listeners",
  );
  assert.equal(
    emitted.filter((name) => name === "fde-progress-sync").length,
    integrationCount + 1,
    "failed retry publishes one bounded remount signal",
  );

  // A later unrelated render must not reuse a stale focus token.
  doc.activeElement = doc.body;
  window.dispatchEvent(new FakeEvent("fde-progress-sync"));
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(doc.activeElement, doc.body);
}

for (const [name, failure] of [
  ["network rejection", async () => { throw new Error("offline"); }],
  ["timeout", () => new Promise(() => {})],
  ["invalid response", async () => response({ ok: true })],
]) {
  test(`failed retry (${name}) remounts week assistants once and restores focus`, async () => {
    await assertFailedRetryRestoresWeekAssistant(failure);
  });
}

async function assertActiveCancellationKeepsSingleFallbackRemount(primePayload, initiallyEligible) {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  const emitted = [];
  class FakeEvent { constructor(type) { this.type = type; } }
  let fetchAttempt = async () => response(primePayload);
  let requestSignal = null;
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => {
      emitted.push(event.type);
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  };
  const loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    fetch: (...args) => fetchAttempt(...args),
  });
  window.addEventListener("fde-progress-sync", loader.render);
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = vm.createContext({
    window, document: doc, location: { pathname: "/index.html" }, navigator: {}, localStorage: storage,
    setTimeout, clearTimeout, console,
  });
  vm.runInContext(fs.readFileSync(readingCoachPath, "utf8"), context);
  assert.equal(await loader.resolve(), true);
  await new Promise((done) => setTimeout(done, 5));

  const selector = '.cal-week[data-week-key="w01"] .rc-weekask';
  const prior = doc.querySelector(selector);
  assert.equal(!!prior, initiallyEligible);
  if (prior) prior.focus();
  else doc.activeElement = doc.body;
  const beforeListeners = Object.fromEntries(Object.entries(listeners).map(([name, entries]) => [name, entries.length]));
  const beforeSignals = emitted.filter((name) => name === "fde-progress-sync").length;
  const pending = deferred();
  fetchAttempt = async (url, options) => {
    requestSignal = options.signal;
    return pending.promise;
  };

  const resolving = loader.resolve();
  await new Promise((done) => setTimeout(done, 5));
  const fallbackCard = byClass(doc.cal, "cal-cell")[0];
  assert.equal(doc.querySelector(selector), null, "retry suppresses fallback launchers until resolution settles");
  assert.equal(byClass(doc.cal, "rc-weekask").length, 0);
  assert.equal(emitted.filter((name) => name === "fde-progress-sync").length, beforeSignals + 1);

  loader.cancel();
  const settlement = await Promise.race([
    resolving,
    new Promise((done) => setTimeout(() => done("not-settled"), 30)),
  ]);
  assert.equal(settlement, false, "cancellation settles the active resolve promptly");
  assert.equal(requestSignal.aborted, true, "cancellation aborts its generation's controller");
  assert.equal(loader.getState(), "fallback");
  const settled = doc.querySelector(selector);
  assert.ok(settled, "cancel settlement enables the canonical fallback launcher");
  assert.equal(byClass(doc.cal, "cal-cell")[0], fallbackCard, "cancel does not replace the first fallback remount");
  if (initiallyEligible) assert.equal(doc.activeElement, settled, "eligible focused week restores after fallback settles");
  else assert.equal(doc.activeElement, doc.body, "a previously suppressed week leaves no stale focus request");
  assert.equal(emitted.filter((name) => name === "fde-progress-sync").length, beforeSignals + 1, "cancel emits no second remount signal");
  assert.deepEqual(
    Object.fromEntries(Object.entries(listeners).map(([name, entries]) => [name, entries.length])),
    beforeListeners,
    "cancel adds no listeners",
  );
  assert.equal(byClass(doc.cal, "rc-weekask").length, 6);
  for (const cell of byClass(doc.cal, "cal-week")) assert.ok(byClass(cell, "rc-weekask").length <= 1);

  pending.resolve(response(assignmentFixture));
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(loader.getState(), "fallback");
  assert.equal(doc.contains(settled), true, "late canceled response cannot render");
  assert.equal(doc.activeElement, initiallyEligible ? settled : doc.body);
  assert.equal(emitted.filter((name) => name === "fde-progress-sync").length, beforeSignals + 1);
}

test("active retry cancellation aborts promptly without a second eligible-week remount", async () => {
  await assertActiveCancellationKeepsSingleFallbackRemount(fixture, true);
});

test("active retry cancellation clears suppressed-week focus without a second remount", async () => {
  const divergent = clone(fixture);
  divergent.curriculum.units[0].href = "weeks/w01/d1.v2.html";
  await assertActiveCancellationKeepsSingleFallbackRemount(divergent, false);
});

test("synchronous cancellation before dynamic render cannot leave fallback state with dynamic DOM", async () => {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  const emitted = [];
  class FakeEvent { constructor(type) { this.type = type; } }
  let payload = fixture;
  let armed = false;
  let renderAnnouncements = 0;
  let loader;
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => {
      emitted.push(event.type);
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  };
  window.addEventListener("fde-curriculum-before-render", () => {
    if (armed && ++renderAnnouncements === 3) loader.cancel();
  });
  loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    fetch: async () => response(payload),
  });
  window.addEventListener("fde-progress-sync", loader.render);
  assert.equal(await loader.resolve(), true);
  assert.equal(loader.getState(), "dynamic");

  payload = assignmentFixture;
  armed = true;
  const beforeSignals = emitted.filter((name) => name === "fde-progress-sync").length;
  assert.equal(await loader.resolve(), false);
  assert.equal(renderAnnouncements, 3, "cancel fires from the dynamic render announcement after the retry fallback renders");
  assert.equal(loader.getState(), "fallback");
  assert.equal(byClass(doc.cal, "cal-cell").length, 50);
  assert.equal(byClass(doc.cal, "ct")[0].textContent, "LLM fundamentals");
  assert.equal(doc.cal.textContent.includes("Assigned dotted content"), false);
  assert.equal(emitted.filter((name) => name === "fde-progress-sync").length, beforeSignals + 1);
});

function cancelHarness() {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  const emitted = [];
  class FakeEvent { constructor(type) { this.type = type; } }
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_RUN_URL: "https://api.invalid",
    FDE_ensureSession: async () => "token",
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => {
      emitted.push(event.type);
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  };
  return { doc, fallback, window, emitted, signals: () => emitted.filter((name) => name === "fde-progress-sync").length };
}

for (const [name, mutate] of [
  ["eligible", () => {}],
  ["parity-suppressed", (payload) => { payload.curriculum.units[0].href = "weeks/w01/d1.v2.html"; }],
]) {
  test(`cancellation inside the synchronous dynamic render (${name}) restores fallback DOM once`, async () => {
    const { doc, fallback, window, signals } = cancelHarness();
    const dynamic = clone(assignmentFixture);
    mutate(dynamic);
    let payload = fixture;
    let armed = false;
    let loader;
    loader = api.createLoader({
      root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
      fetch: async () => response(payload),
      render: (model, d, host, parity) => {
        const result = api.renderCalendar(model, d, host, parity);
        if (armed && model !== fallback) { armed = false; loader.cancel(); }
        return result;
      },
    });
    window.addEventListener("fde-progress-sync", loader.render);
    assert.equal(await loader.resolve(), true);

    payload = dynamic;
    armed = true;
    const beforeSignals = signals();
    assert.equal(await loader.resolve(), false);
    assert.equal(armed, false, "cancel fired after the dynamic grid replaced the DOM");
    assert.equal(loader.getState(), "fallback");
    assert.equal(window.WEEKS, fallback.weeks);
    assert.equal(byClass(doc.cal, "cal-cell").length, 50);
    assert.equal(byClass(doc.cal, "ct")[0].textContent, "LLM fundamentals");
    assert.equal(doc.cal.textContent.includes("Assigned dotted content"), false);
    assert.equal(signals(), beforeSignals + 2, "retry remount plus one restore remount");
  });
}

test("cancellation from the post-commit integration signal resolves false and restores fallback", async () => {
  const { doc, fallback, window } = cancelHarness();
  let loader;
  let armed = true;
  loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    fetch: async () => response(assignmentFixture),
  });
  window.addEventListener("fde-progress-sync", () => {
    if (armed && loader.getState() === "dynamic") { armed = false; loader.cancel(); }
  });
  window.addEventListener("fde-progress-sync", loader.render);
  assert.equal(await loader.resolve(), false);
  assert.equal(armed, false);
  assert.equal(loader.getState(), "fallback");
  assert.equal(window.WEEKS, fallback.weeks);
  assert.equal(doc.cal.textContent.includes("Assigned dotted content"), false);
});

test("a failed calendar render does not leave a stale week assistant focus request", async () => {
  const doc = new TinyDocument();
  const fallback = staticCalendar();
  renderCanonical(fallback, doc);
  const listeners = {};
  class FakeEvent { constructor(type) { this.type = type; } }
  const window = {
    document: doc,
    PHASES: fallback.phases,
    WEEKS: fallback.weeks,
    FDE_PROGRESS: { status: () => "none" },
    CustomEvent: FakeEvent,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
    dispatchEvent: (event) => { (listeners[event.type] || []).forEach((fn) => fn(event)); },
  };
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = vm.createContext({
    window, document: doc, location: { pathname: "/index.html" }, navigator: {}, localStorage: storage,
    setTimeout, clearTimeout, console,
  });
  vm.runInContext(fs.readFileSync(readingCoachPath, "utf8"), context);
  const week = () => byClass(doc.cal, "cal-week").find((node) => node.getAttribute("data-week-key") === "w01");
  week().querySelector(".rc-weekask").focus();

  const loader = api.createLoader({
    root: window, document: doc, timeoutMs: 1000, fallback, fallbackAlreadyRendered: true,
    render: () => { throw new Error("render failed"); },
  });
  assert.throws(() => loader.render(), /render failed/);

  doc.activeElement = doc.body;
  renderCanonical(fallback, doc);
  listeners["fde-progress-sync"].forEach((fn) => fn());
  await new Promise((done) => setTimeout(done, 5));
  assert.ok(week().querySelector(".rc-weekask"));
  assert.equal(doc.activeElement, doc.body);
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
  assert.deepEqual(emitted.filter((name) => name === "fde-progress-sync"), ["fde-progress-sync"]);
  assert.ok(emitted.filter((name) => name === "fde-curriculum-before-render").length >= 1);
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

function parseCssColor(value) {
  if (value.startsWith("#")) {
    const hex = value.length === 4 ? "#" + value.slice(1).split("").map((part) => part + part).join("") : value;
    return [...hex.slice(1).matchAll(/.{2}/g)].map((part) => parseInt(part[0], 16)).concat(1);
  }
  const parts = value.match(/[\d.]+/g).map(Number);
  return [parts[0], parts[1], parts[2], parts[3] === undefined ? 1 : parts[3]];
}

function compositeColor(foreground, background) {
  const alpha = foreground[3];
  return [0, 1, 2].map((index) => foreground[index] * alpha + background[index] * (1 - alpha)).concat(1);
}

function channelLuminance(color) {
  const channels = color.slice(0, 3).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function effectiveContrast(foreground, layer, surface) {
  const background = compositeColor(parseCssColor(layer), parseCssColor(surface));
  const values = [channelLuminance(parseCssColor(foreground)), channelLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function resolveCssColor(value, tokens) {
  const variable = /^var\((--[^,)]+)(?:,[^)]+)?\)$/.exec(value || "");
  return variable ? tokens[variable[1]] : value;
}

test("calendar interaction, progress, milestone, weekday, and ritual states retain AA contrast", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const page = parseStylesheet(inlineStylesheet(html));
  const site = parseStylesheet(fs.readFileSync(path.join(__dirname, "..", "assets/css/style.css"), "utf8"));
  assert.equal(computedRule(page, ".cal-cell.missing").opacity, undefined);
  assert.equal(computedRule(page, ".cal-cell.planned").opacity, undefined);
  assert.equal(computedRule(page, ".cal-cell.soon").opacity, "1");
  assert.equal(computedRule(page, ".cal-cell.live:after").color, "var(--accent-ink)");
  for (const theme of ['html[data-theme="dark"]', ":root"]) {
    const tokens = computedRule(site, theme);
    assert.ok(contrastRatio(tokens["--accent-ink"], tokens["--surface"]) >= 4.5, `${theme} available card open label`);
  }
  const resource = computedRule(page, ".fr-btn");
  assert.ok(contrastRatio(resource.color, resource.background) >= 4.5, "resource buttons retain normal-text contrast");

  const progressStates = ["start", "resume", "done"];
  for (const theme of ["light", "dark"]) {
    const tokenSelector = theme === "light" ? ":root" : 'html[data-theme="dark"]';
    const tokens = computedRule(site, tokenSelector);
    const surface = tokens["--surface"];
    for (const state of progressStates) {
      const rule = Object.assign(
        {},
        computedRule(site, `.day-prog--${state}`),
        computedRule(page, `.cal-cell .day-prog--${state}`),
      );
      assert.ok(
        effectiveContrast(resolveCssColor(rule.color, tokens), resolveCssColor(rule.background, tokens), surface) >= 4.5,
        `${theme} ${state} progress label`,
      );
    }

    const title = computedRule(page, ".cal-cell.live .ct-link");
    const titleHover = Object.assign(
      {},
      computedRule(site, ".cal-cell.live .ct-link:hover"),
      computedRule(page, ".cal-cell.live .ct-link:hover"),
    );
    assert.ok(contrastRatio(resolveCssColor(title.color, tokens), surface) >= 4.5, `${theme} live title`);
    assert.ok(contrastRatio(resolveCssColor(titleHover.color, tokens), surface) >= 4.5, `${theme} hovered live title`);

    const star = Object.assign(
      {},
      computedRule(site, ".cal-cell .mk.star"),
      computedRule(page, ".cal-cell .mk.star"),
      theme === "dark" ? computedRule(site, 'html[data-theme="dark"] .cal-cell .mk.star') : {},
      theme === "dark" ? computedRule(page, 'html[data-theme="dark"] .cal-cell .mk.star') : {},
    );
    assert.ok(
      effectiveContrast(resolveCssColor(star.color, tokens), resolveCssColor(star.background, tokens), surface) >= 4.5,
      `${theme} milestone marker`,
    );
  }

  const variants = ["cr", "sd", "ar", "iv", "fde"];
  const states = ["available", "planned", "missing"];
  for (const theme of ["light", "dark"]) {
    const tokens = computedRule(site, theme === "light" ? ":root" : 'html[data-theme="dark"]');
    for (const state of states.concat("soon")) {
      const surface = state === "missing" || state === "soon" ? tokens["--surface-2"] : tokens["--surface"];
      assert.ok(contrastRatio(tokens["--ink-soft"], surface) >= 4.5, `${theme} ${state} weekday`);
      if (state === "soon") continue;
      for (const variant of variants) {
        const base = Object.assign({}, computedRule(site, `.ritual.${variant}`), computedRule(page, `.ritual.${variant}`));
        const themed = theme === "dark" ? computedRule(site, `html[data-theme="dark"] .ritual.${variant}`) : {};
        const rule = Object.assign(base, themed);
        assert.ok(effectiveContrast(rule.color, rule.background, surface) >= 4.5, `${theme} ${state} ritual ${variant}`);
      }
    }
  }
});

test("week labels use theme foreground contrast independently of phase color", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const page = parseStylesheet(inlineStylesheet(html));
  const site = parseStylesheet(fs.readFileSync(path.join(__dirname, "..", "assets/css/style.css"), "utf8"));
  assert.equal(computedRule(page, ".cal-week .ww").color, "var(--ink)");
  assert.equal(computedRule(page, ".cal-week .rc-weekask").color, "var(--ink)", "week assistant text must not inherit phase color");
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
