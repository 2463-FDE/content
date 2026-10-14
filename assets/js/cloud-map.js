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
      "w01/d2b": { ltm: "W1 · TUE", title: "API integration patterns" },
      "w01/d4b": { ltm: "W1 · THU", title: "Output guardrails" },
      "w02/w02d2": { ltm: "W2 · TUE", title: "Embeddings & vector stores" },
      "w02/w02d3": { ltm: "W2 · WED", title: "Retrieval strategies" },
      "w03/w03d2": { ltm: "W3 · MON/WED", title: "Tools & MCP" },
      "w03/w03d3": { ltm: "W3 · MON", title: "Agent framework landscape" },
      "w03/w03d4": { ltm: "W3 · WED", title: "Agent memory" },
      "w03/w03d5": { ltm: "W3 · THU/FRI", title: "Production single agent and tracing" },
      "w04/w04d3": { ltm: "W4 · WED/FRI", title: "Multi-agent framework landscape" },
      "w04/w04d4": { ltm: "W5 · MON–THU (Neo4j)", title: "Knowledge graphs & Cypher" }
    },
    // LTM ten-week mapping for the live weeks these anchors sit in.
    ltmWeekOf: {
      w01: "W1", w02: "W2", w03: "W3", w04: "W4 (D4–D5 = LTM W5 Neo4j)",
      w05: "distributed (spec discipline)", w06: "distributed (AI SDLC)",
      w07: "W8 Observability", w08: "W9 Security"
    },
    objectives: {
      "aip-c01": {
        "1.1": [L("w01/d3b"), L("w05/w05d2")],
        "1.2": [L("w01/d2a"), L("w01/d1"), P("w02/w02d2")],
        "1.3": [L("w02/w02d1")],
        "1.4": [L("w02/w02d2"), L("w02/w02d5"), P("w02/w02d2")],
        "1.5": [L("w02/w02d1"), L("w02/w02d2"), L("w02/w02d3"), P("w02/w02d3")],
        "1.6": [L("w01/d3a"), L("w01/d4a")],
        "2.1": [L("w03/w03d1"), L("w03/w03d2"), L("w03/w03d5"), P("w03/w03d2"), P("w03/w03d3"), P("w03/w03d4"), P("w04/w04d3")],
        "2.2": [L("w01/d2a"), P("w01/d2b"), P("w04/w04d3")],
        "2.3": [L("w03/w03d2"), L("w06/w06d4"), P("w03/w03d2"), P("w04/w04d4")],
        "2.4": [L("w01/d2b"), P("w01/d2b"), L("w01/d5")],
        "2.5": [L("w06/w06d1"), L("w06/w06d2"), P("w03/w03d3")],
        "3.1": [L("w01/d4b"), P("w01/d4b"), L("w08/w08d2")],
        "3.2": [L("w08/w08d4"), P("w03/w03d4"), P("w04/w04d4")],
        "3.3": [L("w08/w08d4")],
        "3.4": [L("w08/w08d4")],
        "4.1": [L("w01/d4a")],
        "4.2": [L("w01/d2b"), P("w01/d2b")],
        "4.3": [L("w07/w07d1"), L("w07/w07d4"), P("w03/w03d5")],
        "5.1": [L("w02/w02d4"), L("w07/w07d2")],
        "5.2": [L("w02/w02d4"), L("w07/w07d1")]
      },
      // Google AI Professional Certificate: the eight listed courses (no exam
      // objectives or weights are published). Anchors are shared lessons that
      // teach the course's theme at engineering depth; empty = not taught.
      "gaipc": {
        "1": [L("w01/d1"), L("w01/d3a")],
        "2": [L("w05/w05d4"), L("w06/w06d2")],
        "3": [L("w02/w02d1"), L("w04/w04d3")],
        "4": [L("w01/d3b"), L("w05/w05d2")],
        "5": [],
        "6": [],
        "7": [L("w06/w06d1"), L("w06/w06d2")],
        "8": [L("w06/w06d5")]
      }
    }
  });
});
