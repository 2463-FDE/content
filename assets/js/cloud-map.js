/* cloud-map.js — where each certification objective is taught.
   Keyed by live reading page (weeks/<page>.html) and by the LTM ten-week day it
   corresponds to. `via: "lesson"` = the shared lesson teaches the objective for
   both paths; `via: "provider"` = the page's AWS or GCP provider block carries it.
   Provider anchors only exist on pages listed in `providerPages`. */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.FDE_CLOUD_MAP = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function freeze(value) {
    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }

  function L(page) { return { page: page, via: "lesson" }; }
  function P(page) { return { page: page, via: "provider" }; }

  return freeze({
    // Live pages that carry AWS/GCP provider blocks, with their LTM day.
    providerPages: {
      "w01/d2": { ltm: "W1 · TUE", title: "Model selection & API patterns" },
      "w01/d4": { ltm: "W1 · THU", title: "Token optimization & guardrails" },
      "w02/w02d2": { ltm: "W2 · TUE", title: "Embeddings & vector stores" },
      "w02/w02d3": { ltm: "W2 · WED", title: "Retrieval strategies" },
      "w03/w03d2": { ltm: "W3 · MON/WED", title: "Tools & MCP" },
      "w03/w03d3": { ltm: "W3 · MON", title: "Agent framework landscape" },
      "w03/w03d4": { ltm: "W3 · WED", title: "Agent memory" },
      "w03/w03d5": { ltm: "W3 · THU/FRI", title: "Production single agent and tracing" },
      "w04/w04d3": { ltm: "W4 · WED/FRI", title: "Multi-agent framework landscape" },
      "w04/w04d4": { ltm: "W4 · THU (bridges to W5 Neo4j)", title: "Knowledge graphs & Cypher" },
      "w09/w09d3": { ltm: "W9 · WED", title: "Governance, compliance, and federated trust" },
      "w09/w09d4": { ltm: "W9 · THU", title: "Security audit, red team, and guardrail normalization" },
      "w09/w09d5": { ltm: "W9 · FRI", title: "Hardening package and certification decision" },
      "w10/w10d1": { ltm: "W10 · MON", title: "Rollout and workload-placement memo" },
      "w10/w10d5": { ltm: "W10 · FRI", title: "Handoff and cloud-placement defense" }
    },
    // LTM ten-week mapping for the live weeks these anchors sit in.
    ltmWeekOf: {
      w01: "W1", w02: "W2", w03: "W3", w04: "W4",
      w05: "W5 Neo4j", w06: "W6 Kafka",
      w07: "W8 Observability", w08: "W9 Security",
      w09: "W9 Security", w10: "W10 Rollout and handoff"
    },
    objectives: {
      "aip-c01": {
        "1.1": [L("w01/d3")],
        "1.2": [L("w01/d2"), L("w01/d1"), P("w02/w02d2")],
        "1.3": [L("w02/w02d1")],
        "1.4": [L("w02/w02d2"), L("w02/w02d5"), P("w02/w02d2")],
        "1.5": [L("w02/w02d1"), L("w02/w02d2"), L("w02/w02d3"), P("w02/w02d3")],
        "1.6": [L("w01/d3"), L("w01/d4")],
        "2.1": [L("w03/w03d1"), L("w03/w03d2"), L("w03/w03d5"), P("w03/w03d2"), P("w03/w03d3"), P("w03/w03d4"), P("w04/w04d3")],
        "2.2": [L("w01/d2"), P("w01/d2"), P("w04/w04d3"), P("w10/w10d1")],
        "2.3": [L("w03/w03d2"), L("w06/w06d1"), L("w06/w06d4"), P("w03/w03d2"), P("w04/w04d4")],
        "2.4": [L("w01/d2"), P("w01/d2"), L("w01/d5")],
        "2.5": [L("w01/d1"), P("w03/w03d3")],
        "3.1": [L("w01/d4"), P("w01/d4"), L("w08/w08d2"), P("w09/w09d4")],
        "3.2": [L("w08/w08d4"), P("w03/w03d4"), P("w04/w04d4"), P("w09/w09d3"), P("w09/w09d4")],
        "3.3": [L("w08/w08d4"), P("w09/w09d3"), P("w09/w09d5")],
        "3.4": [L("w08/w08d4"), P("w09/w09d5")],
        "4.1": [L("w01/d4"), P("w10/w10d1"), P("w10/w10d5")],
        "4.2": [L("w01/d2"), P("w01/d2")],
        "4.3": [L("w07/w07d1"), L("w07/w07d4"), P("w03/w03d5")],
        "5.1": [L("w02/w02d4"), L("w07/w07d2")],
        "5.2": [L("w02/w02d4"), L("w07/w07d1")]
      },
      // Google AI Professional Certificate: the eight listed courses (no exam
      // objectives or weights are published). Anchors are shared lessons that
      // teach the course's theme at engineering depth; empty = not taught.
      "gaipc": {
        "1": [L("w01/d1"), L("w01/d3")],
        "2": [L("w01/d3")],
        "3": [L("w02/w02d1"), L("w04/w04d3")],
        "4": [L("w01/d3"), L("w06/w06d5")],
        "5": [],
        "6": [],
        "7": [L("w01/d1")],
        "8": []
      }
    }
  });
});
