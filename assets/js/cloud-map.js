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
      "w01/d4b": { ltm: "W1 · THU", title: "Output guardrails" }
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
        "1.2": [L("w01/d2a"), L("w01/d1")],
        "1.3": [L("w02/w02d1")],
        "1.4": [L("w02/w02d2"), L("w02/w02d5")],
        "1.5": [L("w02/w02d1"), L("w02/w02d2"), L("w02/w02d3")],
        "1.6": [L("w01/d3a"), L("w01/d4a")],
        "2.1": [L("w03/w03d1"), L("w03/w03d2"), L("w03/w03d5")],
        "2.2": [L("w01/d2a")],
        "2.3": [L("w03/w03d2"), L("w06/w06d4")],
        "2.4": [L("w01/d2b"), L("w01/d5")],
        "2.5": [L("w06/w06d1"), L("w06/w06d2")],
        "3.1": [L("w01/d4b"), P("w01/d4b"), L("w08/w08d2")],
        "3.2": [L("w08/w08d4")],
        "3.3": [L("w08/w08d4")],
        "3.4": [L("w08/w08d4")],
        "4.1": [L("w01/d4a")],
        "4.2": [L("w01/d2b")],
        "4.3": [L("w07/w07d1"), L("w07/w07d4")],
        "5.1": [L("w02/w02d4"), L("w07/w07d2")],
        "5.2": [L("w02/w02d4"), L("w07/w07d1")]
      },
      "paa": {
        "1.1": [],
        "1.2": [],
        "2.1": [L("w06/w06d1"), L("w06/w06d2")],
        "2.2": [L("w06/w06d1")],
        "3.1": [L("w03/w03d1"), L("w03/w03d3"), L("w03/w03d4")],
        "3.2": [L("w02/w02d2"), L("w02/w02d3"), L("w03/w03d2")],
        "3.3": [L("w04/w04d1")],
        "4.1": [L("w02/w02d4"), L("w07/w07d2")],
        "4.2": [L("w03/w03d5"), L("w07/w07d4")],
        "5.1": [L("w08/w08d1"), L("w08/w08d5"), P("w01/d4b")],
        "5.2": [L("w08/w08d2"), L("w03/w03d2")]
      },
      "pmle": {
        "1": [], "2": [], "3": [], "4": [], "5": [],
        "6": [L("w07/w07d1"), L("w07/w07d4")]
      }
    }
  });
});
