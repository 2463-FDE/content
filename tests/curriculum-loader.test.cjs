"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const loaderPath = path.join(__dirname, "..", "assets/js/curriculum-loader.js");
const api = require(loaderPath);
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/curriculum-resolved.seed-v1.json"), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function staticCalendar() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const start = html.indexOf("window.PHASES");
  const source = html.slice(start, html.indexOf("</script>", start));
  const context = { window: {} };
  vm.runInNewContext(source, context);
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
    (p) => { p.curriculum.units.pop(); },
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

test("only narrow site-relative curriculum hrefs and parts are accepted", () => {
  const bad = [
    "https://evil.invalid/x.html", "//evil.invalid/x.html", "/weeks/w01/d1.html",
    "weeks\\w01\\d1.html", "../x.html", "weeks/../x.html", "./x.html",
    "javascript:alert(1)", "x.html?src=javascript:alert(1)", "x.html#javascript:alert(1)",
    "weeks/%2e%2e/x.html", "data:text/html,x", "",
  ];
  bad.forEach((href) => assert.equal(api.safeHref(href), false, href));
  assert.equal(api.safeHref("weeks/w01/d1.html"), true);
  bad.forEach((href) => {
    const payload = clone(fixture);
    payload.curriculum.units[0].href = href;
    assert.equal(api.validateResponse(payload), null, `unit href ${href}`);
  });
  const payload = clone(fixture);
  payload.curriculum.units[1].parts[0].href = "../escape.html";
  assert.equal(api.validateResponse(payload), null);
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

test("missing units expose text and aria state with no curriculum link or progress control", () => {
  const payload = clone(fixture);
  payload.curriculum.units[0].availability = "missing";
  const doc = new TinyDocument();
  api.renderCalendar(api.toCalendar(api.validateResponse(payload)), doc, { FDE_PROGRESS: { status: () => "completed" } });
  const card = descendants(doc.cal).find((node) => node.getAttribute && node.getAttribute("data-unit-key") === "w01d1");
  assert.ok((card.className || "").includes("missing"));
  assert.equal(card.getAttribute("role"), "group");
  assert.equal(card.getAttribute("aria-disabled"), "true");
  assert.match(card.getAttribute("aria-label"), /unavailable/);
  assert.equal(byClass(card, "availability-badge")[0].textContent, "Unavailable");
  assert.equal(byClass(card, "availability-badge")[0].getAttribute("role"), null);
  assert.equal(byClass(card, "ct-link").length, 0);
  assert.equal(byClass(card, "cell-parts").length, 0);
  assert.equal(byClass(card, "day-prog").length, 0);
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

test("320 px stylesheet contract reflows to one column without fixed-width cards", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "assets/css/style.css"), "utf8");
  assert.match(css, /@media \(max-width:1000px\)\{ \.cal \{ grid-template-columns:1fr;/);
  assert.match(html, /@media \(max-width:600px\)/);
  assert.match(html, /\.cal-wrap \{ padding:12px 12px 40px; \}/);
  assert.match(html, /overflow-wrap:anywhere/);
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
