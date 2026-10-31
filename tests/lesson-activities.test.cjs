/* Behavioral contract for the shared lesson-activity library: learner input
   changes state/output/evidence and returns explanatory feedback, with a
   committed no-JS path per activity. */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const activities = require(path.join(__dirname, "..", "assets", "js", "lesson-activities.js"));

const evidenceDef = {
  type: "evidence",
  title: "Which record proves the duplicate?",
  intro: "Inspect the artifacts.",
  claim: "The consumer processed offset 41 twice.",
  why: "Only the log and the ledger row pair proves double-processing.",
  artifacts: [
    { id: "log", label: "Consumer log", body: "offset=41 handled\noffset=41 handled", probative: true, why: "the same offset appears twice after a rebalance" },
    { id: "lag", label: "Lag graph", body: "lag: 12 -> 3", probative: false, why: "falling lag says nothing about duplicate handling" }
  ]
};

const orderDef = {
  type: "order",
  title: "Order the commit protocol",
  why: "Commit only after the side effect is durable.",
  items: [
    { id: "read", label: "Poll the record", why: "nothing exists to process before the poll" },
    { id: "write", label: "Write the outcome", why: "the side effect must be durable before progress is recorded" },
    { id: "commit", label: "Commit the offset", why: "committing first loses the record on a crash" }
  ],
  correct: ["read", "write", "commit"]
};

const faultDef = {
  type: "fault",
  title: "Find the failing boundary",
  symptom: "Payments show paid, ledger shows nothing.",
  probes: [
    { id: "api", label: "API response", result: "202 accepted" },
    { id: "outbox", label: "Outbox table", result: "12 rows unsent" }
  ],
  suspects: [
    { id: "api-b", label: "API boundary", why: "the API accepted and persisted the intent" },
    { id: "relay", label: "Outbox relay", why: "unsent outbox rows mean the relay stopped publishing" }
  ],
  culprit: "relay"
};

const tradeoffDef = {
  type: "tradeoff",
  title: "Pick the delivery guarantee",
  prompt: "Which consumer policy fits a balanced ledger?",
  dims: ["Duplicates", "Loss", "Cost"],
  options: [
    { label: "At-most-once", outcome: { Duplicates: "none", Loss: "possible", Cost: "low" }, defensible: false, why: "a lost posting breaks the balanced ledger" },
    { label: "At-least-once + idempotent writes", outcome: { Duplicates: "absorbed", Loss: "none", Cost: "medium" }, defensible: true, why: "duplicates are absorbed by the idempotency key, nothing is lost" }
  ]
};

const paramsDef = {
  type: "params",
  title: "Partitions vs ordering",
  controls: [{ key: "partitions", label: "Partitions", options: [{ label: "1", value: "1" }, { label: "6", value: "6" }] }],
  cases: [
    { when: { partitions: "1" }, out: { "ordering scope": "global", throughput: "capped at one consumer" }, note: "one partition serializes everything" },
    { when: { partitions: "6" }, out: { "ordering scope": "per key", throughput: "up to six consumers" }, note: "keys keep per-entity order while work spreads" }
  ]
};

const traceDef = {
  type: "trace",
  title: "Follow one keyed event",
  steps: [
    { label: "Produce", state: [["offset", "—"], ["ledger", "empty"]], note: "the producer keys by payment id" },
    { label: "Consume", state: [["offset", "41"], ["ledger", "posted"]], note: "work lands before commit" }
  ]
};

test("evidence assessment explains misses and false picks", () => {
  const correct = activities.assess.evidence(evidenceDef, ["log"]);
  assert.equal(correct.correct, true);
  assert.match(correct.message, /Only the log/);
  const falsePick = activities.assess.evidence(evidenceDef, ["log", "lag"]);
  assert.equal(falsePick.correct, false);
  assert.match(falsePick.message, /Lag graph/);
  assert.match(falsePick.message, /falling lag/);
  const empty = activities.assess.evidence(evidenceDef, []);
  assert.equal(empty.correct, false);
});

test("order assessment names the violated constraint", () => {
  assert.equal(activities.assess.order(orderDef, ["read", "write", "commit"]).correct, true);
  const wrong = activities.assess.order(orderDef, ["read", "commit", "write"]);
  assert.equal(wrong.correct, false);
  assert.match(wrong.message, /Position 2/);
  assert.match(wrong.message, /committing first loses/);
});

test("fault assessment traces the causal chain and probe spend", () => {
  const right = activities.assess.fault(faultDef, "relay", 2);
  assert.equal(right.correct, true);
  assert.match(right.message, /2 of 2 probes/);
  assert.match(right.message, /relay stopped publishing/);
  const wrong = activities.assess.fault(faultDef, "api-b", 1);
  assert.equal(wrong.correct, false);
  assert.match(wrong.message, /accepted and persisted/);
});

test("tradeoff assessment rewards the defensible option with its why", () => {
  assert.equal(activities.assess.tradeoff(tradeoffDef, 1).correct, true);
  const wrong = activities.assess.tradeoff(tradeoffDef, 0);
  assert.equal(wrong.correct, false);
  assert.match(wrong.message, /balanced ledger/);
});

test("params lookup resolves the matching deterministic case", () => {
  assert.equal(activities.assess.params(paramsDef, { partitions: "6" }).out.throughput, "up to six consumers");
  assert.equal(activities.assess.params(paramsDef, { partitions: "1" }).out["ordering scope"], "global");
});

test("interactive markup is a core interaction with controls and status", () => {
  for (const def of [evidenceDef, orderDef, faultDef, tradeoffDef, paramsDef, traceDef]) {
    const html = activities.html(def, "t-" + def.type);
    assert.match(html, /data-core-interaction/);
    assert.match(html, new RegExp(`data-activity="${def.type}"`));
    assert.match(html, /activity-status/);
    assert.match(html, /aria-live="polite"/);
  }
});

test("every kind ships a committed no-JS path with the reasoning", () => {
  for (const def of [evidenceDef, orderDef, faultDef, tradeoffDef, paramsDef, traceDef]) {
    const fallback = activities.fallbackHtml(def);
    assert.match(fallback, new RegExp(`data-activity-fallback="${def.type}"`));
    assert.match(fallback, /<details/);
  }
  assert.match(activities.fallbackHtml(orderDef), /committing first loses/);
  assert.match(activities.fallbackHtml(faultDef), /Failing boundary/);
  assert.match(activities.fallbackHtml(tradeoffDef), /Defensible choice/);
});

test("fallback escapes authored content", () => {
  const hostile = {
    type: "tradeoff",
    title: "<script>alert(1)</script>",
    prompt: "safe?",
    dims: ["X"],
    options: [{ label: "<img src=x onerror=1>", outcome: { X: "ok" }, defensible: true, why: "fine" }]
  };
  const fallback = activities.fallbackHtml(hostile);
  assert.doesNotMatch(fallback, /<script>alert/);
  assert.doesNotMatch(fallback, /<img src=x/);
  const html = activities.html(hostile, "x");
  assert.doesNotMatch(html.replace(/<script type="application\/json">[\s\S]*?<\/script>/, ""), /<img src=x/);
});

function authoredOrderDefs() {
  const root = path.join(__dirname, "..");
  const defs = [];
  for (const file of ["curriculum-lessons-w06.js", "curriculum-lessons-w07-w08.js", "curriculum-lessons-w09-w10.js"]) {
    const lessons = require(path.join(root, "assets", "js", file));
    for (const [dayId, lesson] of Object.entries(lessons)) {
      for (const def of lesson.activities || []) if (def.type === "order") defs.push([dayId, def]);
    }
  }
  for (const week of ["w04", "w05"]) {
    const dir = path.join(root, "weeks", week);
    for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".html"))) {
      const html = fs.readFileSync(path.join(dir, name), "utf8");
      const hosts = html.matchAll(/data-activity="order"[^>]*>\s*<script type="application\/json">([\s\S]*?)<\/script>/g);
      for (const match of hosts) defs.push([name, JSON.parse(match[1])]);
    }
  }
  return defs;
}

function renderedOrder(markup) {
  return [...markup.matchAll(/<li class="order-item" data-id="([^"]+)"/g)].map((match) => match[1]);
}

test("order activities never start in the defensible order", () => {
  const defs = [["fixture", orderDef], ...authoredOrderDefs()];
  assert.ok(defs.length >= 19, `expected the authored order activities, found ${defs.length}`);
  for (const [where, def] of defs) {
    const start = renderedOrder(activities.html(def, "t-order"));
    assert.deepEqual([...start].sort(), def.items.map((item) => item.id).sort(), `${where}: every item rendered once`);
    assert.equal(activities.assess.order(def, start).correct, false, `${where}: starting arrangement is already solved`);
    assert.deepEqual(renderedOrder(activities.html(def, "t-order")), start, `${where}: starting arrangement is deterministic`);
  }
});

test("lesson section helpers place activities by their authored section", () => {
  const lesson = { activities: [{ ...orderDef, at: 2 }, { ...evidenceDef }, { ...faultDef, at: 2 }] };
  const section2 = activities.blocksFor(lesson, "w06d1", 2);
  assert.match(section2, /data-activity-id="w06d1-a20"/);
  assert.match(section2, /data-activity-id="w06d1-a21"/);
  assert.match(activities.blocksFor(lesson, "w06d1", 1), /data-activity="evidence"/);
  assert.equal(activities.blocksFor(lesson, "w06d1", 0), "");
  assert.match(activities.fallbacksFor(lesson, 2), /data-activity-fallback="order"[\s\S]*data-activity-fallback="fault"/);
  assert.equal(activities.fallbacksFor({}, 1), "");
});
