const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fixtures = require("../assets/js/persona-communications-fixtures.js");
const comms = require("../assets/js/persona-communications.js");
const { loadPage, hexRgb, luminance, contrast, contrastFromLuminance } = require("./support/page-model.cjs");

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.calls = []; }
  getItem(key) { this.calls.push(["get", key]); return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.calls.push(["set", key]); this.values.set(key, String(value)); }
  removeItem(key) { this.calls.push(["remove", key]); this.values.delete(key); }
}

class SpyStorage extends MemoryStorage {
  writes() { return this.calls.filter(([method]) => method !== "get"); }
}

const VOID_TAGS = new Set(["meta", "link", "input", "br", "img", "hr"]);

class DomElement {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.ownText = "";
    this.hidden = false;
    this.value = "";
    this.tabIndex = 0;
    this.type = "";
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }
  get id() { return this.getAttribute("id") || ""; }
  get className() { return this.getAttribute("class") || ""; }
  set className(value) { this.setAttribute("class", value); }
  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; this.ownText = String(value); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "hidden") this.hidden = true;
    if (name === "tabindex") this.tabIndex = Number(value);
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  replaceChildren(...nodes) { this.textContent = ""; nodes.forEach((node) => this.appendChild(node)); }
  isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === this.ownerDocument.documentElement;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, init = {}) {
    const event = Object.assign({ type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, init);
    (this.listeners.get(type) || []).forEach((listener) => listener.call(this, event));
    return event;
  }
  click() { return this.dispatch("click"); }
  focus() { this.ownerDocument.activeElement = this; }
  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }
}

class DomDocument {
  constructor(html, view) {
    this.defaultView = view;
    this.readyState = "complete";
    this.documentElement = new DomElement(this, "#root");
    this.activeElement = null;
    this.parse(html);
  }
  parse(html) {
    const stack = [this.documentElement];
    const pattern = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
    let match;
    while ((match = pattern.exec(html))) {
      if (match[5] !== undefined) {
        stack[stack.length - 1].appendChild(Object.assign(new DomElement(this, "#text"), { ownText: match[5] }));
        continue;
      }
      if (!match[2]) continue;
      const tag = match[2].toLowerCase();
      if (match[1]) {
        while (stack.length > 1 && stack.pop().tagName !== tag.toUpperCase());
        continue;
      }
      const element = new DomElement(this, tag);
      for (const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) element.setAttribute(attr[1], attr[2] === undefined ? "" : attr[2]);
      stack[stack.length - 1].appendChild(element);
      if (!VOID_TAGS.has(tag) && !match[4]) stack.push(element);
    }
  }
  all() { return this.documentElement.descendants().filter((node) => node.tagName !== "#TEXT"); }
  createElement(tag) { return new DomElement(this, tag); }
  getElementById(id) { return this.all().find((node) => node.id === id) || null; }
  querySelectorAll(selector) {
    const match = /^\[([\w-]+)\]$/.exec(selector);
    if (!match) throw new Error(`Unsupported selector ${selector}`);
    return this.all().filter((node) => node.hasAttribute(match[1]));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

const PAGE_HTML = fs.readFileSync(path.resolve(__dirname, "..", "persona-communications.html"), "utf8");
const LEARNER = { code: "SYN-LEARNER-01", name: "Synthetic Learner", role: "learner" };

function brightened(color, factor) {
  return luminance(color) * factor;
}

function filterFactor(filter) {
  const match = /^brightness\(\s*([\d.]+)(%?)\s*\)$/.exec(filter);
  assert.ok(match, `expected a brightness() hover filter, got ${filter}`);
  return Number(match[1]) / (match[2] ? 100 : 1);
}

test("persona-owned filled CTAs keep AA contrast at rest, on hover, and with a visible focus ring in both themes", () => {
  const surfaces = [
    ["persona-communications.html", ".pc-send"],
    ["client-delivery.html", ".cc-launch"],
  ];
  for (const [file, selector] of surfaces) {
    const page = loadPage(file);
    const ctas = page.doc.querySelectorAll(selector);
    assert.ok(ctas.length > 0, `${file} must render ${selector}`);
    for (const theme of ["light", "dark"]) {
      if (theme === "dark") page.doc.documentElement.setAttribute("data-theme", "dark");
      else page.doc.documentElement.removeAttribute("data-theme");
      const styles = page.styles({ colorScheme: theme });
      for (const cta of ctas) {
        const label = `${file} ${selector} (${theme})`;
        const text = hexRgb(styles.computed(cta, "color"));
        const fill = hexRgb(styles.computed(cta, "background"));
        assert.ok(parseFloat(styles.computed(cta, "font-size")) >= 14, `${label} keeps its 14px label`);
        assert.ok(contrast(text, fill) >= 4.5, `${label} fell below 4.5:1 at rest`);

        const factor = filterFactor(styles.computed(cta, "filter", { states: new Set(["hover"]) }));
        assert.ok(contrastFromLuminance(brightened(text, factor), brightened(fill, factor)) >= 4.5, `${label} fell below 4.5:1 on hover`);

        const outline = styles.computed(cta, "outline", { states: new Set(["focus-visible"]) });
        assert.ok(outline, `${label} must draw a focus-visible outline`);
        const [width, style] = outline.split(/\s+/);
        assert.ok(parseFloat(width) >= 3 && style === "solid", `${label} focus outline is ${outline}`);
      }
    }
  }
});

function mountPage({ storage = new SpyStorage({ fde_identity: JSON.stringify(LEARNER) }), query = "?simClock=accelerated", clock } = {}) {
  const network = [];
  const intervals = [];
  const view = {
    localStorage: storage,
    location: { search: query },
    setInterval(fn, ms) { intervals.push(ms); return intervals.length; },
    fetch(...args) { network.push(["fetch", args]); throw new Error("network blocked"); },
    XMLHttpRequest: function () { network.push(["xhr"]); throw new Error("network blocked"); },
    WebSocket: function () { network.push(["websocket"]); throw new Error("network blocked"); }
  };
  view.navigator = { sendBeacon(...args) { network.push(["beacon", args]); return false; } };
  const doc = new DomDocument(PAGE_HTML, view);
  const saved = {};
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket"]) { saved[name] = globalThis[name]; globalThis[name] = view[name]; }
  let app;
  try { app = comms.init(doc, clock ? { clock } : {}); }
  finally { for (const name of Object.keys(saved)) globalThis[name] = saved[name]; }
  const $ = (id) => doc.getElementById(id);
  return { doc, storage, network, intervals, app, $ };
}

function withNetworkBlocked(page, fn) {
  const saved = {};
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket"]) { saved[name] = globalThis[name]; globalThis[name] = page.doc.defaultView[name]; }
  try { return fn(); }
  finally { for (const name of Object.keys(saved)) globalThis[name] = saved[name]; }
}

function sendChat(page, text) {
  page.$("pc-chat-input").value = text;
  return page.$("pc-chat-form").dispatch("submit");
}

function sendEmail(page, subject, body) {
  page.$("pc-compose-subject").value = subject;
  page.$("pc-compose-body").value = body;
  return page.$("pc-compose-form").dispatch("submit");
}

function threadRows(page) { return page.$("pc-inbox-list").children; }
function threadBadge(page) { return page.$("pc-thread-view").descendants().find((node) => /\bpc-status\b/.test(node.className)); }
function advanceButton(page, minutes) { return page.doc.querySelectorAll("[data-clock-advance]").find((node) => node.getAttribute("data-clock-advance") === String(minutes)); }

function projectThread(state, projectId, fields, now, id) {
  const thread = comms.createEmailThread(projectId, fields, now, id);
  state.projects[projectId].threads.push(thread);
  return thread;
}

for (const projectId of ["riverbend", "meridian"]) {
  test(`${projectId} chat and email use one fixture-owned truth`, () => {
    const scenario = fixtures.scenarios[projectId];
    const prompt = projectId === "riverbend"
      ? "Can we promise the intake path will never fail again?"
      : "Can we call the payment path done if the API returns 200?";
    const chat = comms.generateChatReply(projectId, prompt);
    const now = fixtures.fixtureEpoch;
    const thread = comms.createEmailThread(projectId, { subject: "Scope and evidence", body: prompt }, now, `${projectId}-shared`);
    const email = comms.generateEmailReply(projectId, thread);

    assert.ok(scenario.facts[chat.factId]);
    assert.ok(scenario.facts[email.factId]);
    assert.ok(Object.values(scenario.facts).every((fact) => /^client-delivery\.html · /.test(fact.source)));
    assert.match(chat.text, new RegExp(scenario.facts[chat.factId].businessOutcome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(email.text, new RegExp(scenario.facts[email.factId].businessOutcome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(chat.role, scenario.technicalLeadLabel);
    assert.ok(!/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(scenario.technicalLeadLabel), "technical lead remains a functional label");
  });
}

test("chat replies are deterministic and cover clarification, negotiation, and justified pushback", () => {
  const clarification = comms.generateChatReply("riverbend", "What evidence should I show about the summary?");
  const negotiation = comms.generateChatReply("riverbend", "Help me negotiate a smaller scope instead.");
  const pushback = comms.generateChatReply("riverbend", "Promise this will never fail and ship today.");

  assert.deepEqual(clarification, comms.generateChatReply("riverbend", "What evidence should I show about the summary?"));
  assert.equal(clarification.intent, "clarify");
  assert.equal(negotiation.intent, "negotiate");
  assert.equal(pushback.intent, "pushback");
  assert.match(negotiation.text, /Option A/);
  assert.match(pushback.text, /push back|risk|smallest defensible/i);
});

test("built-in pushback and overclaim suggestions route to pushback without broad done/enough matching", () => {
  const riverbendPrompt = fixtures.scenarios.riverbend.chatPrompts[2];
  const meridianPrompt = fixtures.scenarios.meridian.chatPrompts[1];
  assert.equal(comms.generateChatReply("riverbend", riverbendPrompt).intent, "pushback");
  assert.equal(comms.generateChatReply("meridian", meridianPrompt).intent, "pushback");
  assert.match(comms.generateChatReply("meridian", meridianPrompt).text, /push back on that commitment/);

  assert.equal(comms.generateChatReply("meridian", "What does done look like for reconciliation?").intent, "clarify");
  assert.equal(comms.generateChatReply("riverbend", "Is the privacy evidence enough for the sponsor?").intent, "clarify");
});

test("email delay is deterministic, inclusive of 15–30 minutes, and reveals only at deliverAt", () => {
  const state = comms.initialState();
  const sentAt = fixtures.fixtureEpoch;
  const thread = projectThread(state, "meridian", {
    subject: "Payment evidence",
    body: "Can we agree a smaller milestone with a reconciliation check?"
  }, sentAt, "boundary-thread");
  const delay = (thread.deliverAt - thread.sentAt) / 60000;

  assert.ok(delay >= 15 && delay <= 30);
  assert.equal(comms.threadStatus(thread, sentAt), "sent");
  assert.equal(comms.threadStatus(thread, sentAt + 1), "awaiting");
  assert.equal(comms.revealDueReplies(state, thread.deliverAt - 1), true, "status transition is persisted");
  assert.equal(thread.messages.length, 1, "reply is not created before deliverAt");
  assert.equal(thread.status, "awaiting");
  assert.equal(comms.revealDueReplies(state, thread.deliverAt), true);
  assert.equal(thread.messages.length, 2);
  assert.equal(thread.messages[1].from, "stakeholder");
  assert.equal(thread.status, "replied");
  assert.equal(comms.revealDueReplies(state, thread.deliverAt + 1), false, "reply is generated once");
});

test("injected clock accelerates delayed replies without real waiting", () => {
  const state = comms.initialState();
  const clock = comms.createInjectedClock(fixtures.fixtureEpoch);
  const thread = projectThread(state, "riverbend", {
    subject: "Intake scope",
    body: "I propose a smaller milestone because the intake fallback needs evidence."
  }, clock.now(), "clock-thread");

  clock.set(thread.deliverAt - 1);
  comms.revealDueReplies(state, clock.now());
  assert.equal(thread.messages.length, 1);
  clock.advance(1);
  comms.revealDueReplies(state, clock.now());
  assert.equal(thread.messages.length, 2);
  assert.equal(clock.mode, "injected");
});

test("local persistence uses an opaque identity hash and reset removes only simulation state", () => {
  const identity = { code: "REAL-LOOKING-CODE", name: "Synthetic Learner", role: "learner" };
  const storage = new MemoryStorage({ fde_results: "keep", fde_progress_REAL: "keep" });
  const store = comms.createStore(storage, identity);
  const state = store.load();
  state.selectedProject = "meridian";
  assert.equal(store.save(state), true);

  assert.match(store.key, /^fde_local_synthetic_persona_v1:local-/);
  assert.ok(!store.key.includes(identity.code));
  assert.equal(store.load().selectedProject, "meridian");
  const reset = store.reset();
  assert.equal(reset.selectedProject, "riverbend");
  assert.equal(storage.getItem("fde_results"), "keep");
  assert.equal(storage.getItem("fde_progress_REAL"), "keep");
  assert.equal(storage.getItem(store.key), null);
});

test("existing browser identity seam is read without creating credentials", () => {
  const storage = new MemoryStorage({
    fde_identity: JSON.stringify({ code: "L-001", name: "Local Learner", role: "learner" }),
    fde_session: "existing-session"
  });
  assert.deepEqual(comms.readExistingIdentity(storage), { code: "L-001", name: "Local Learner", role: "learner" });
  assert.equal(comms.readExistingIdentity(new MemoryStorage()), null);
  assert.ok(storage.calls.every(([method]) => method === "get"), "identity seam is read-only");
});

test("includesWord matches whole words only", () => {
  assert.equal(comms.includesWord("expand the company panel", "pan"), false);
  assert.equal(comms.includesWord("open the dialog slowly", "log"), false);
  assert.equal(comms.includesWord("our philosophy", "phi"), false);
  assert.equal(comms.includesWord("never log the pan", "pan"), true);
  assert.equal(comms.includesWord("duplicate payments", "payment"), true);
  assert.equal(comms.includesWord("avoid a double-book", "double-book"), true);
  assert.equal(comms.selectFact("meridian", "Our company wants to expand the dashboard panel").id === "data", false);
  assert.equal(comms.selectFact("riverbend", "Explain the delivery philosophy for this quarter").id === "privacy", false);
});

test("learner-authored markup is rendered as text, never executable HTML", () => {
  const doc = new DomDocument("", {});
  const container = doc.createElement("div");
  const attack = '<img src=x onerror="globalThis.pwned=true"><script>pwned()</script>';
  const article = comms.renderTextMessage(doc, container, { from: "learner", text: attack }, { learner: "Learner", persona: "Lead" });

  assert.equal(article.children[1].textContent, attack);
  assert.equal(article.children[1].children.length, 0);
  assert.equal(container.children.length, 1);
});

test("tab keyboard behavior supports arrows, Home, End, and wrapping", () => {
  assert.equal(comms.nextTabIndex("ArrowRight", 2, 3), 0);
  assert.equal(comms.nextTabIndex("ArrowLeft", 0, 3), 2);
  assert.equal(comms.nextTabIndex("ArrowDown", 0, 3), 1);
  assert.equal(comms.nextTabIndex("Home", 2, 3), 0);
  assert.equal(comms.nextTabIndex("End", 0, 3), 2);
  assert.equal(comms.nextTabIndex("Enter", 1, 3), 1);
});

test("missing browser identity shows the existing sign-in gate without creating credentials", () => {
  const storage = new SpyStorage();
  const page = mountPage({ storage, query: "" });

  assert.equal(page.app.identity, null);
  assert.equal(page.$("pc-auth-gate").hidden, false);
  assert.equal(page.$("pc-experience").hidden, true);
  assert.equal(page.$("pc-identity-name").textContent, "not signed in");
  assert.deepEqual(storage.writes(), []);
  assert.deepEqual(page.network, []);
});

test("channel and project tabs follow the keyboard tab pattern through init()", () => {
  const page = mountPage();
  const tabs = page.doc.querySelectorAll("[data-channel-tab]");
  const panels = page.doc.querySelectorAll("[data-channel-panel]");
  const visible = () => panels.filter((panel) => !panel.hidden).map((panel) => panel.getAttribute("data-channel-panel"));

  assert.ok(tabs.every((tab) => tab.getAttribute("role") === "tab"));
  assert.deepEqual(visible(), ["chat"]);

  const arrow = tabs[0].dispatch("keydown", { key: "ArrowRight" });
  assert.equal(arrow.defaultPrevented, true);
  assert.equal(page.doc.activeElement, tabs[1]);
  assert.deepEqual(tabs.map((tab) => tab.getAttribute("aria-selected")), ["false", "true", "false"]);
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [-1, 0, -1]);
  assert.deepEqual(visible(), ["inbox"]);

  tabs[1].dispatch("keydown", { key: "End" });
  assert.equal(page.doc.activeElement, tabs[2]);
  assert.deepEqual(visible(), ["coaching"]);
  tabs[2].dispatch("keydown", { key: "ArrowRight" });
  assert.equal(page.doc.activeElement, tabs[0]);
  assert.deepEqual(visible(), ["chat"]);
  assert.equal(tabs[0].dispatch("keydown", { key: "Enter" }).defaultPrevented, false);

  const projects = page.doc.querySelectorAll("[data-project-tab]");
  projects[0].dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(page.doc.activeElement, projects[1]);
  assert.deepEqual(projects.map((tab) => tab.getAttribute("aria-selected")), ["false", "true"]);
  assert.equal(page.$("pc-project-title").textContent, fixtures.scenarios.meridian.projectLabel);
  assert.equal(page.$("pc-lead-label").textContent, fixtures.scenarios.meridian.technicalLeadLabel);
  assert.equal(page.$("pc-compose-to").value, fixtures.scenarios.meridian.stakeholderLabel);
});

for (const projectId of ["riverbend", "meridian"]) {
  test(`${projectId} UI chat replies render as text and announce only the latest reply`, () => {
    const page = mountPage({ query: `?simClock=accelerated&project=${projectId}` });
    const scenario = fixtures.scenarios[projectId];
    const log = page.$("pc-chat-log");
    const announcer = page.$("pc-chat-announcer");
    const attack = '<img src=x onerror="globalThis.pwned=true"> Can we ship today?';

    assert.equal(log.hasAttribute("aria-live"), false, "transcript is not re-announced on rerender");
    assert.equal(announcer.getAttribute("aria-live"), "polite");

    withNetworkBlocked(page, () => sendChat(page, attack));
    const expected = comms.generateChatReply(projectId, attack);
    const messages = log.children;
    assert.equal(messages.length, 3);
    assert.equal(messages[1].children[1].textContent, attack);
    assert.ok(messages[1].descendants().every((node) => node.tagName !== "IMG"));
    assert.equal(messages[2].children[0].textContent, scenario.technicalLeadLabel);
    assert.equal(messages[2].children[1].textContent, expected.text);
    assert.equal(announcer.textContent, `${scenario.technicalLeadLabel}: ${expected.text}`);
    assert.equal(page.$("pc-chat-input").value, "");
    assert.equal(page.doc.activeElement, page.$("pc-chat-input"));
    assert.equal(globalThis.pwned, undefined);
    assert.deepEqual(page.network, []);
  });
}

test("UI compose moves a thread through sent, awaiting, and replied at deliverAt only", () => {
  const page = mountPage();
  page.doc.querySelectorAll("[data-channel-tab]")[1].click();
  withNetworkBlocked(page, () => sendEmail(page, "Rollout boundary", "Can we agree a smaller scope because the intake evidence is pending?"));

  const thread = page.app.state.projects.riverbend.threads.at(-1);
  const delayMinutes = (thread.deliverAt - thread.sentAt) / 60000;
  assert.ok(delayMinutes >= 15 && delayMinutes <= 30);
  assert.equal(threadBadge(page).textContent, "Sent");
  assert.match(threadRows(page)[0].textContent, /^Rollout boundarySent · /);
  assert.match(page.$("pc-compose-status").textContent, /15–30 minute/);
  assert.equal(page.$("pc-inbox-announcer").textContent, "");

  page.app.clock.set(thread.deliverAt - 15 * 60000 - 1);
  advanceButton(page, 15).click();
  assert.equal(page.app.clock.now(), thread.deliverAt - 1);
  assert.equal(threadBadge(page).textContent, "Awaiting reply");
  assert.equal(thread.messages.length, 1);
  assert.match(page.$("pc-thread-view").textContent, /Synthetic reply due in about 1 min/);
  assert.equal(page.$("pc-inbox-announcer").textContent, "");

  page.app.clock.set(thread.deliverAt - 15 * 60000);
  advanceButton(page, 15).click();
  assert.equal(threadBadge(page).textContent, "Replied");
  assert.equal(thread.messages.length, 2);
  assert.equal(thread.messages[1].from, "stakeholder");
  assert.match(page.$("pc-thread-view").textContent, new RegExp(fixtures.scenarios.riverbend.stakeholderLabel));
  assert.equal(page.$("pc-inbox-announcer").textContent, `${fixtures.scenarios.riverbend.stakeholderLabel} replied to “Rollout boundary”.`);
  assert.equal(page.$("pc-thread-view").hasAttribute("aria-live"), false);
  assert.deepEqual(page.network, []);
  assert.deepEqual(page.intervals, [], "accelerated mode has no real-time polling");
});

test("selecting an inbox thread keeps keyboard focus on the selected row", () => {
  const page = mountPage();
  sendEmail(page, "Second thread", "What evidence do you need before the review?");
  const [newest, seed] = threadRows(page);
  assert.equal(newest.getAttribute("aria-pressed"), "true");

  seed.focus();
  seed.click();
  const rows = threadRows(page);
  const selected = rows.find((row) => row.getAttribute("aria-pressed") === "true");
  assert.equal(selected.getAttribute("data-thread-id"), "riverbend-seed");
  assert.equal(page.doc.activeElement, selected);
  assert.ok(page.doc.activeElement.isConnected());
});

test("coaching through the UI is formative and writes nothing to grading, progress, or simulation storage", () => {
  const storage = new SpyStorage({
    fde_identity: JSON.stringify(LEARNER),
    fde_results: JSON.stringify({ score: 10 }),
    fde_progress_LOCAL: JSON.stringify({ w01d1: "completed" }),
    fde_summary: "keep"
  });
  const before = new Map(storage.values);
  const page = mountPage({ storage });
  sendChat(page, "Thanks. What evidence shows the risk? I propose a narrower scope because patient impact matters.");
  sendEmail(page, "Next review", "The owner will review the included scope next week.");

  const writesBeforeCoaching = storage.writes().length;
  page.$("pc-run-coaching").click();
  const items = page.$("pc-coaching-results").children;

  assert.equal(storage.writes().length, writesBeforeCoaching, "coaching does not persist anything");
  assert.deepEqual(items.map((item) => item.children[0].textContent), ["Clarity", "Question quality", "Persuasion", "Respectful pushback", "Expectation-setting", "Rapport"]);
  assert.match(page.$("pc-coaching-status").textContent, /Formative only/);
  assert.ok(storage.writes().every(([, key]) => key === page.app.store.key));
  assert.ok(page.app.store.key.startsWith("fde_local_synthetic_persona_v1:"));
  for (const [key, value] of before) assert.equal(storage.getItem(key), value);
  assert.deepEqual(page.network, []);
});

test("UI reset clears only the active simulation key and re-renders initial state", () => {
  const storage = new SpyStorage({ fde_identity: JSON.stringify(LEARNER), fde_results: "keep", fde_progress_LOCAL: "keep" });
  const page = mountPage({ storage });
  sendChat(page, "How should I explain the rollback owner?");
  sendEmail(page, "Reset me", "Please confirm the owner.");
  assert.ok(storage.getItem(page.app.store.key));

  page.$("pc-reset").click();
  assert.equal(page.$("pc-chat-log").children.length, 1);
  assert.equal(threadRows(page).length, 1);
  assert.match(page.$("pc-reset-status").textContent, /No curriculum progress or assessment data was touched/);
  assert.equal(storage.getItem("fde_results"), "keep");
  assert.equal(storage.getItem("fde_progress_LOCAL"), "keep");
  assert.equal(storage.getItem("fde_identity"), JSON.stringify(LEARNER));
  assert.ok(storage.calls.filter(([method]) => method === "remove").every(([, key]) => key === page.app.store.key));
});

test("accelerated clock state is isolated from system-clock state", () => {
  const storage = new SpyStorage({ fde_identity: JSON.stringify(LEARNER) });
  const accelerated = mountPage({ storage, query: "?simClock=accelerated" });
  sendEmail(accelerated, "Accelerated only", "Can we test the delayed reply?");
  assert.equal(accelerated.$("pc-clock-tools").hidden, false);

  const system = mountPage({ storage, query: "", clock: comms.createInjectedClock(fixtures.fixtureEpoch) });
  assert.equal(system.$("pc-clock-tools").hidden, true);
  assert.notEqual(system.app.store.key, accelerated.app.store.key);
  assert.ok(accelerated.app.store.key.startsWith(system.app.store.key));
  assert.ok(!system.app.state.projects.riverbend.threads.some((thread) => thread.subject === "Accelerated only"));

  system.$("pc-reset").click();
  assert.ok(storage.getItem(accelerated.app.store.key), "system reset leaves accelerated state alone");
});

test("system clock mode polls locally for due replies without network access", () => {
  const page = mountPage({ query: "" });
  assert.equal(page.app.clock.mode, "system");
  assert.deepEqual(page.intervals, [30000]);
  assert.deepEqual(page.network, []);
});
