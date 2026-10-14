const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const MODULE = path.join(__dirname, "..", "assets", "js", "cloud-path.js");
const CHECK = path.join(__dirname, "..", "assets", "js", "interactive-cloud.js");

function fresh(globals = {}) {
  delete require.cache[require.resolve(MODULE)];
  const saved = {};
  for (const [key, value] of Object.entries(globals)) { saved[key] = globalThis[key]; globalThis[key] = value; }
  try { return require(MODULE); } finally {
    for (const key of Object.keys(globals)) {
      if (saved[key] === undefined) delete globalThis[key]; else globalThis[key] = saved[key];
    }
  }
}

function memoryStore(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

const throwingStore = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

test("a deep link wins over the session and saved choices", () => {
  const cp = fresh();
  const result = cp.resolve({
    search: "?w=1&cloud=GCP",
    session: memoryStore({ fde_cloud_path_link: "both" }),
    local: memoryStore({ fde_cloud_path: "aws" }),
  });
  assert.deepEqual(result, { selection: "gcp", source: "url" });
});

test("session value beats the saved choice; saved choice beats unset", () => {
  const cp = fresh();
  assert.deepEqual(
    cp.resolve({ search: "", session: memoryStore({ fde_cloud_path_link: "aws" }), local: memoryStore({ fde_cloud_path: "gcp" }) }),
    { selection: "aws", source: "session" });
  assert.deepEqual(cp.resolve({ search: "", local: memoryStore({ fde_cloud_path: "gcp" }) }), { selection: "gcp", source: "storage" });
  assert.deepEqual(cp.resolve({ search: "" }), { selection: null, source: "unset" });
});

test("invalid values are ignored at every layer", () => {
  const cp = fresh();
  const result = cp.resolve({
    search: "?cloud=azure",
    session: memoryStore({ fde_cloud_path_link: "<script>" }),
    local: memoryStore({ fde_cloud_path: "gcp" }),
  });
  assert.deepEqual(result, { selection: "gcp", source: "storage" });
  assert.equal(cp.fromSearch("?cloud=%E0%A4%A"), null, "malformed escapes do not throw");
});

test("blocked storage degrades to unset instead of throwing", () => {
  const cp = fresh();
  assert.deepEqual(cp.resolve({ search: "", local: throwingStore, session: throwingStore }), { selection: null, source: "unset" });
});

test("unset renders as Both so no provider content is hidden", () => {
  const cp = fresh();
  assert.equal(cp.effective(null), "both");
  assert.equal(cp.effective("both"), "both");
  assert.equal(cp.effective("gcp"), "gcp");
});

test("mirror semantics: the selected cloud is primary and the other is the comparison substrate", () => {
  const cp = fresh();
  const gcp = cp.describe("gcp");
  assert.equal(gcp.primary, "gcp");
  assert.equal(gcp.substrate, "aws");
  const aws = cp.describe("aws");
  assert.equal(aws.primary, "aws");
  assert.equal(aws.substrate, "gcp");
  const both = cp.describe("both");
  assert.equal(both.primary, null);
  assert.match(both.summary, /beyond the Core-30 guarantee/);
  assert.equal(cp.roleOf("aws", "gcp"), "substrate");
  assert.equal(cp.roleOf("gcp", "gcp"), "primary");
  assert.equal(cp.roleOf("aws", "both"), "both");
});

test("provider questions only appear on their path; shared questions always appear", () => {
  const cp = fresh();
  const quiz = { id: "x", questions: [{ stem: "shared" }, { stem: "a", cloud: "aws" }, { stem: "g", cloud: "gcp" }] };
  assert.deepEqual(cp.filterQuestions(quiz, "aws").questions.map((q) => q.stem), ["shared", "a"]);
  assert.deepEqual(cp.filterQuestions(quiz, "gcp").questions.map((q) => q.stem), ["shared", "g"]);
  assert.deepEqual(cp.filterQuestions(quiz, null).questions.map((q) => q.stem), ["shared", "a", "g"]);
  assert.equal(quiz.questions.length, 3, "the source quiz is not mutated");
});

test("the hub config (read at call time) can narrow the offered options", () => {
  const cp = fresh();
  globalThis.FDE_CURRICULUM_CONFIG = { cloudPath: { options: ["aws", "gcp"] } };
  try {
    assert.equal(cp.normalize("both"), null);
    assert.equal(cp.normalize("aws"), "aws");
  } finally { delete globalThis.FDE_CURRICULUM_CONFIG; }
  assert.equal(cp.normalize("both"), "both", "without hub config all three options exist");
});

// ---- DOM behaviour on a minimal fake document ----------------------------------

class Node {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.children = [];
    this.parentNode = null;
    this.textContent = "";
    this.hidden = false;
    this.open = "open" in attrs;
    this.listeners = {};
  }
  get className() { return this.attrs.class || ""; }
  set className(v) { this.attrs.class = v; }
  get id() { return this.attrs.id || ""; }
  set id(v) { this.attrs.id = v; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] || null;
  }
  get firstChild() { return this.children[0] || null; }
  getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = String(v); }
  hasAttribute(n) { return n in this.attrs; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c, ref) {
    c.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
    return c;
  }
  addEventListener(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); }
  dispatch(name) { (this.listeners[name] || []).forEach((fn) => fn({ target: this })); }
  all() { return this.children.flatMap((c) => [c, ...c.all()]); }
  matches(sel) { return sel.split(",").some((s) => matchOne(this, s.trim())); }
  querySelectorAll(sel) { return this.all().filter((n) => n.matches(sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

// Supports the selector shapes cloud-path.js uses: tag, .class, [attr], [attr='v'], combined, descendant.
function matchOne(node, selector) {
  const parts = selector.split(/\s+/);
  if (parts.length > 1) {
    const last = parts.pop();
    if (!matchOne(node, last)) return false;
    for (let p = node.parentNode; p; p = p.parentNode) if (p.matches && matchOne(p, parts.join(" "))) return true;
    return false;
  }
  const re = /^([a-z]+)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i;
  const m = re.exec(selector);
  if (!m) return false;
  if (m[1] && node.tagName !== m[1].toUpperCase()) return false;
  for (const cls of (m[2] || "").split(".").filter(Boolean)) {
    if (!node.className.split(/\s+/).includes(cls)) return false;
  }
  for (const a of (m[3] || "").match(/\[[^\]]+\]/g) || []) {
    const am = /^\[([\w-]+)(?:\*?=['"]?([^'"\]]*)['"]?)?\]$/.exec(a);
    if (!am) return false;
    const contains = a.includes("*=");
    const v = node.getAttribute(am[1]);
    if (v === null) return false;
    if (am[2] !== undefined && (contains ? !v.includes(am[2]) : v !== am[2])) return false;
  }
  return true;
}

function lessonDoc() {
  const doc = new Node("document");
  doc.documentElement = new Node("html");
  doc.head = new Node("head");
  doc.body = new Node("body");
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.appendChild(doc.documentElement);
  doc.createElement = (tag) => new Node(tag);
  doc.getElementById = (id) => doc.all().find((n) => n.id === id) || null;
  const script = new Node("script", { src: "../../assets/js/cloud-path.js?v=1" });
  doc.body.appendChild(script);
  const article = new Node("article", { class: "reading-col" });
  doc.body.appendChild(article);
  const meta = new Node("div", { class: "meta" });
  article.appendChild(meta);
  meta.appendChild(new Node("span", { class: "core30-meta", "data-cloud": "aws" }));
  meta.appendChild(new Node("span", { class: "core30-meta", "data-cloud": "gcp" }));
  for (const cloud of ["aws", "gcp"]) {
    const block = new Node("details", { class: "cloud-block", "data-cloud": cloud, open: "" });
    const summary = new Node("summary");
    summary.appendChild(new Node("span", { class: "cloud-role" }));
    block.appendChild(summary);
    article.appendChild(block);
  }
  return { doc, article };
}

function withWindow(search, local, session, fn) {
  const saved = globalThis.window;
  globalThis.window = { location: { search, href: "http://x/p.html" + search }, localStorage: local, sessionStorage: session, history: null, CustomEvent: undefined };
  try { return fn(); } finally { if (saved === undefined) delete globalThis.window; else globalThis.window = saved; }
}

test("init on a lesson: the selected path opens, the substrate collapses, labels follow", () => {
  const cp = fresh();
  const { doc } = lessonDoc();
  withWindow("?cloud=gcp", memoryStore(), memoryStore(), () => cp.init(doc));
  const [aws, gcp] = doc.querySelectorAll(".cloud-block");
  assert.equal(gcp.open, true);
  assert.equal(aws.open, false);
  assert.equal(aws.getAttribute("data-cloud-role"), "substrate");
  assert.equal(aws.querySelector(".cloud-role").textContent, "Comparison substrate · optional");
  const [awsLabel, gcpLabel] = doc.querySelectorAll(".core30-meta");
  assert.equal(awsLabel.hidden, true);
  assert.equal(gcpLabel.hidden, false);
  assert.equal(doc.documentElement.getAttribute("data-cloud-view"), "gcp");
  assert.ok(doc.querySelector(".cloud-chip .cloud-picker"), "a compact picker is mounted on the lesson");
  assert.ok(doc.querySelector("link[data-cloud-path-css]"), "path styles are attached");
  assert.equal(doc.querySelector("link[data-cloud-path-css]").getAttribute("href") || doc.querySelector("link[data-cloud-path-css]").href, "../../assets/css/cloud-path.css");
});

test("a deep link does not overwrite the saved choice, but an explicit pick does", () => {
  const cp = fresh();
  const { doc } = lessonDoc();
  const local = memoryStore({ fde_cloud_path: "aws" });
  const session = memoryStore();
  withWindow("?cloud=gcp", local, session, () => {
    cp.init(doc);
    assert.equal(local.data.fde_cloud_path, "aws");
    assert.equal(session.data.fde_cloud_path_link, "gcp");
    const radio = doc.querySelectorAll("input[data-cloud-path-option]").find((i) => i.value === "both");
    radio.checked = true;
    radio.dispatch("change");
  });
  assert.equal(local.data.fde_cloud_path, "both");
  const blocks = doc.querySelectorAll(".cloud-block");
  assert.ok(blocks.every((b) => b.open), "Both opens every provider block");
  assert.ok(doc.querySelectorAll(".core30-meta").every((l) => !l.hidden));
});

test("with nothing chosen every block stays open and the picker says so", () => {
  const cp = fresh();
  const { doc } = lessonDoc();
  withWindow("", memoryStore(), memoryStore(), () => cp.init(doc));
  assert.ok(doc.querySelectorAll(".cloud-block").every((b) => b.open));
  assert.match(doc.querySelector(".cloud-picker-summary").textContent, /No path chosen yet/);
  const inputs = doc.querySelectorAll("input[data-cloud-path-option]");
  assert.deepEqual(inputs.map((i) => i.value), ["aws", "gcp", "both"]);
  assert.ok(inputs.every((i) => !i.checked));
  assert.equal(new Set(inputs.map((i) => i.name)).size, 1, "one radio group per picker");
});

test("the hub page gets a full picker above the calendar", () => {
  const cp = fresh();
  const doc = new Node("document");
  doc.documentElement = new Node("html");
  doc.head = new Node("head");
  doc.body = new Node("body");
  doc.appendChild(doc.documentElement);
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.createElement = (tag) => new Node(tag);
  doc.getElementById = (id) => doc.all().find((n) => n.id === id) || null;
  doc.body.appendChild(new Node("script", { src: "assets/js/cloud-path.js" }));
  const main = doc.body.appendChild(new Node("div", { class: "cal-main" }));
  main.appendChild(new Node("div", { id: "cal" }));
  withWindow("", memoryStore(), memoryStore(), () => cp.init(doc));
  const mount = doc.getElementById("cloud-path-mount");
  assert.ok(mount, "mount inserted");
  assert.equal(mount.nextSibling.id, "cal", "mount sits directly above the calendar");
  const link = mount.querySelector(".cloud-picker-link");
  assert.equal(link.href, "certifications.html");
});

// ---- provider decision check -----------------------------------------------------

test("decision check grading reports correct, wrong and unanswered picks", () => {
  delete require.cache[require.resolve(CHECK)];
  const check = require(CHECK);
  const options = [{ correct: false, why: "no" }, { correct: true, why: "yes" }];
  assert.deepEqual(check.grade(options, 1), { status: "correct", correct: true, why: "yes" });
  assert.deepEqual(check.grade(options, 0), { status: "wrong", correct: false, why: "no" });
  assert.equal(check.grade(options, -1).status, "unanswered");
});
