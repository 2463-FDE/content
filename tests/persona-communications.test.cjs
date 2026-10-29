const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fixtures = require("../assets/js/persona-communications-fixtures.js");
const comms = require("../assets/js/persona-communications.js");

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.calls = []; }
  getItem(key) { this.calls.push(["get", key]); return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.calls.push(["set", key]); this.values.set(key, String(value)); }
  removeItem(key) { this.calls.push(["remove", key]); this.values.delete(key); }
}

class FakeNode {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.className = ""; this.textContent = ""; this.children = []; }
  appendChild(node) { this.children.push(node); return node; }
}

class FakeDocument {
  createElement(tag) { return new FakeNode(tag); }
}

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

test("learner-authored markup is rendered as text, never executable HTML", () => {
  const doc = new FakeDocument();
  const container = new FakeNode("div");
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

test("coaching covers all six formative dimensions and cannot mutate grading or progress data", () => {
  const state = comms.initialState();
  const before = JSON.stringify(state);
  const storage = new MemoryStorage({
    fde_results: JSON.stringify({ score: 10 }),
    fde_progress_LOCAL: JSON.stringify({ w01d1: "completed" })
  });
  const resultsBefore = storage.getItem("fde_results");
  const progressBefore = storage.getItem("fde_progress_LOCAL");
  const coaching = comms.coachTranscript("Thanks. What evidence shows the risk? I propose a narrower scope because patient impact matters. The owner will review it next week.");

  assert.equal(coaching.formativeOnly, true);
  assert.deepEqual(coaching.criteria.map((item) => item.id), ["clarity", "questions", "persuasion", "pushback", "expectations", "rapport"]);
  assert.equal(JSON.stringify(state), before);
  assert.equal(storage.getItem("fde_results"), resultsBefore);
  assert.equal(storage.getItem("fde_progress_LOCAL"), progressBefore);
  assert.ok(comms.forbiddenCoachingOutputs.includes("assessment"));
  assert.ok(comms.forbiddenCoachingOutputs.includes("rubric"));
});

test("surface is accessible, local-only, and documents the delivered boundary", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "persona-communications.html"), "utf8");
  const runtime = fs.readFileSync(path.join(root, "assets/js/persona-communications.js"), "utf8");
  const fixtureSource = fs.readFileSync(path.join(root, "assets/js/persona-communications-fixtures.js"), "utf8");
  const clientDelivery = fs.readFileSync(path.join(root, "client-delivery.html"), "utf8");
  const docs = fs.readFileSync(path.join(root, "docs/persona-communications.md"), "utf8");

  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tabpanel"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label[^>]+for="pc-compose-subject"/);
  assert.match(html, /Skip to communication workspace/);
  assert.doesNotMatch(html, /assets\/js\/(roster|auth)\.js/);
  assert.doesNotMatch(runtime, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|\.innerHTML\s*=/);
  assert.doesNotMatch(fixtureSource, /<script|https?:\/\//i);
  assert.match(clientDelivery, /local simulation now provides deterministic technical-lead chat/);
  assert.doesNotMatch(clientDelivery, /Design-stage diagram; none of these systems exist yet/);
  assert.match(docs, /formative only/);
  assert.match(docs, /874fb96432110237dcc812a700dc9a90ae099527/);
});
