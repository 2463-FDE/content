/* cloud-path.js — the learner's AWS / GCP / Both curriculum path.

   One cloud is the expected route: the selected provider is the learner's
   primary implementation plane and the other provider is the comparison
   substrate (captain decision gcp-path-primary-plane = mirror, 2026-10-14).
   "Both" shows every provider block and runs beyond the Core-30 guarantee.

   Resolution order (pure, see resolve()):
     1. ?cloud=aws|gcp|both on the URL      — a shared deep link, this tab only
     2. the tab's session value             — set by (1), so the link follows navigation
     3. the saved choice (localStorage)     — set only by an explicit picker change
     4. unset                               — rendered as Both, with a one-time prompt
   A deep link never overwrites the viewer's saved choice.

   Markup contract (authoring):
     <details class="cloud-block" data-cloud="aws|gcp" open><summary>…</summary>…</details>
     <span class="core30-meta" data-cloud="aws|gcp">Core 30 · AWS · ~N min read · …</span>
   Without JavaScript every block stays open and labelled, so nothing is hidden.
   Storage access is wrapped: a blocked or private-mode store degrades to unset. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDECloudPath = api;
  if (typeof document !== "undefined" && document.addEventListener) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { api.init(document); });
    } else {
      api.init(document);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var OPTIONS = ["aws", "gcp", "both"];
  var STORAGE_KEY = "fde_cloud_path";
  var SESSION_KEY = "fde_cloud_path_link";
  var EVENT = "fde-cloud-path-change";
  var NAMES = { aws: "AWS", gcp: "GCP" };

  function hubConfig() {
    var config = root && root.FDE_CURRICULUM_CONFIG;
    return config && config.cloudPath ? config.cloudPath : null;
  }

  function options() {
    var hub = hubConfig();
    var list = hub && Array.isArray(hub.options) ? hub.options : OPTIONS;
    return OPTIONS.filter(function (option) { return list.indexOf(option) !== -1; });
  }

  function normalize(value) {
    var v = String(value == null ? "" : value).trim().toLowerCase();
    return options().indexOf(v) !== -1 ? v : null;
  }

  function fromSearch(search) {
    var match = /[?&]cloud=([^&#]*)/.exec(String(search || ""));
    if (!match) return null;
    try { return normalize(decodeURIComponent(match[1].replace(/\+/g, " "))); } catch (e) { return null; }
  }

  function read(store, key) {
    try { return store ? store.getItem(key) : null; } catch (e) { return null; }
  }

  function write(store, key, value) {
    try { if (store) store.setItem(key, value); return true; } catch (e) { return false; }
  }

  /* Pure resolution: { selection: "aws"|"gcp"|"both"|null, source }. */
  function resolve(env) {
    env = env || {};
    var linked = fromSearch(env.search);
    if (linked) return { selection: linked, source: "url" };
    var session = normalize(read(env.session, SESSION_KEY));
    if (session) return { selection: session, source: "session" };
    var saved = normalize(read(env.local, STORAGE_KEY));
    if (saved) return { selection: saved, source: "storage" };
    return { selection: null, source: "unset" };
  }

  /* Effective view: unset renders as Both so no content is hidden. */
  function effective(selection) {
    return selection === "aws" || selection === "gcp" ? selection : "both";
  }

  /* Mirror semantics: the chosen cloud is primary, the other is the substrate. */
  function describe(selection) {
    if (selection === "aws" || selection === "gcp") {
      var other = selection === "aws" ? "gcp" : "aws";
      return {
        selection: selection,
        primary: selection,
        substrate: other,
        label: NAMES[selection] + " path",
        summary: NAMES[selection] + " is your primary implementation plane; " + NAMES[other] +
          " appears as the comparison substrate in optional depth. Each day's required path stays inside Core 30."
      };
    }
    return {
      selection: "both",
      primary: null,
      substrate: null,
      label: "Both clouds",
      summary: "Every AWS and GCP block is shown in full. This widens the day beyond the Core-30 guarantee — pick one cloud for the 30-minute route."
    };
  }

  function roleOf(blockCloud, view) {
    if (view === "both") return "both";
    return blockCloud === view ? "primary" : "substrate";
  }

  /* Questions tagged with a cloud only appear on that cloud's path. */
  function filterQuestions(quiz, selection) {
    if (!quiz || !Array.isArray(quiz.questions)) return quiz;
    var view = effective(selection);
    var questions = quiz.questions.filter(function (q) {
      return !q || !q.cloud || view === "both" || q.cloud === view;
    });
    var copy = {};
    Object.keys(quiz).forEach(function (key) { copy[key] = quiz[key]; });
    copy.questions = questions;
    return copy;
  }

  // ---- runtime state ---------------------------------------------------
  var state = { selection: null, source: "unset" };

  function env() {
    var w = typeof window !== "undefined" ? window : {};
    var local = null, session = null;
    try { local = w.localStorage; } catch (e) { local = null; }
    try { session = w.sessionStorage; } catch (e) { session = null; }
    return { search: w.location ? w.location.search : "", local: local, session: session };
  }

  function current() { return effective(state.selection); }
  function explicit() { return state.selection; }

  function choose(selection, doc) {
    var value = normalize(selection);
    if (!value) return false;
    var e = env();
    write(e.local, STORAGE_KEY, value);
    write(e.session, SESSION_KEY, value);
    state = { selection: value, source: "storage" };
    try {
      var w = window;
      if (w.history && w.history.replaceState && fromSearch(w.location.search)) {
        var url = String(w.location.href).replace(/([?&]cloud=)[^&#]*/, "$1" + value);
        w.history.replaceState(w.history.state, "", url);
      }
    } catch (err) { /* deep-link rewrite is a convenience only */ }
    apply(doc || (typeof document !== "undefined" ? document : null));
    return true;
  }

  function each(list, fn) { Array.prototype.forEach.call(list || [], fn); }

  /* Apply the view to provider blocks, labels and pickers (codeviewer.js and
     quiz.js follow the fde-cloud-path-change event themselves). */
  function apply(doc) {
    if (!doc || !doc.querySelectorAll) return;
    var view = current();
    var info = describe(view);
    if (doc.documentElement && doc.documentElement.setAttribute) {
      doc.documentElement.setAttribute("data-cloud-view", view);
    }

    each(doc.querySelectorAll(".cloud-block[data-cloud]"), function (block) {
      var role = roleOf(block.getAttribute("data-cloud"), view);
      block.setAttribute("data-cloud-role", role);
      block.open = role !== "substrate";
      var tag = block.querySelector ? block.querySelector(".cloud-role") : null;
      if (tag) {
        tag.textContent = role === "primary" ? "Your path"
          : role === "substrate" ? "Comparison substrate · optional" : "Both paths";
      }
    });

    each(doc.querySelectorAll(".core30-meta[data-cloud]"), function (label) {
      label.hidden = view !== "both" && label.getAttribute("data-cloud") !== view;
    });

    each(doc.querySelectorAll("input[data-cloud-path-option]"), function (input) {
      input.checked = input.value === (state.selection || "");
    });
    each(doc.querySelectorAll(".cloud-picker-summary"), function (node) {
      node.textContent = state.selection ? info.summary
        : "No path chosen yet — showing both clouds. Pick one for the 30-minute route.";
    });
    each(doc.querySelectorAll(".cloud-chip-value"), function (node) { node.textContent = info.label; });

    try {
      var w = typeof window !== "undefined" ? window : null;
      if (w && typeof w.CustomEvent === "function") {
        w.dispatchEvent(new w.CustomEvent(EVENT, { detail: { selection: state.selection, view: view } }));
      }
    } catch (e) { /* event is advisory */ }
  }

  var pickerCount = 0;

  /* Accessible radio-group picker: AWS · GCP · Both. */
  function buildPicker(doc, compact) {
    pickerCount += 1;
    var id = "cloud-path-" + pickerCount;
    var fieldset = doc.createElement("fieldset");
    fieldset.className = "cloud-picker" + (compact ? " is-compact" : "");
    var legend = doc.createElement("legend");
    legend.textContent = compact ? "Cloud path" : "Choose your cloud path";
    fieldset.appendChild(legend);
    var row = doc.createElement("div");
    row.className = "cloud-picker-options";
    options().forEach(function (value) {
      var label = doc.createElement("label");
      label.className = "cloud-picker-option";
      var input = doc.createElement("input");
      input.type = "radio";
      input.name = id;
      input.setAttribute("data-cloud-path-option", "");
      input.value = value;
      input.id = id + "-" + value;
      input.checked = state.selection === value;
      input.addEventListener("change", function () { if (input.checked) choose(value, doc); });
      var text = doc.createElement("span");
      text.textContent = value === "both" ? "Both" : NAMES[value];
      label.appendChild(input);
      label.appendChild(text);
      row.appendChild(label);
    });
    fieldset.appendChild(row);
    var summary = doc.createElement("p");
    summary.className = "cloud-picker-summary";
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");
    fieldset.appendChild(summary);
    var onCertPage = typeof window !== "undefined" && window.location && /certifications\.html$/.test(window.location.pathname || "");
    if (!compact && !onCertPage) {
      var more = doc.createElement("a");
      more.className = "cloud-picker-link";
      more.href = siteRoot(doc) + "certifications.html";
      more.textContent = "How the paths map to AWS and Google Cloud certifications";
      fieldset.appendChild(more);
    }
    return fieldset;
  }

  function mountPickers(doc) {
    var mount = doc.getElementById ? doc.getElementById("cloud-path-mount") : null;
    if (!mount && doc.getElementById && doc.getElementById("cal")) {
      // Hub page without an explicit mount: place the choice above the calendar.
      var cal = doc.getElementById("cal");
      mount = doc.createElement("div");
      mount.id = "cloud-path-mount";
      cal.parentNode.insertBefore(mount, cal);
    }
    if (mount && !mount.querySelector(".cloud-picker")) mount.appendChild(buildPicker(doc, false));

    // Lesson pages with provider blocks get a compact picker beside the label.
    var article = doc.querySelector ? doc.querySelector("article.reading-col") : null;
    if (article && article.querySelector(".cloud-block[data-cloud]") && !article.querySelector(".cloud-chip")) {
      var chip = doc.createElement("div");
      chip.className = "cloud-chip";
      chip.appendChild(buildPicker(doc, true));
      var anchor = article.querySelector(".core30-meta");
      var host = anchor && anchor.parentNode ? anchor.parentNode : article;
      if (host.nextSibling) host.parentNode.insertBefore(chip, host.nextSibling);
      else article.insertBefore(chip, article.firstChild);
    }
  }

  /* Relative path from this page to the site root, derived from our own script tag. */
  function siteRoot(doc) {
    var script = doc.querySelector ? doc.querySelector("script[src*='cloud-path.js']") : null;
    var src = script ? script.getAttribute("src") : "";
    var match = /^(.*?)assets\/js\/cloud-path\.js/.exec(src || "");
    return match ? match[1] : "";
  }

  /* Cache-busting query (?v=…) carried by our own script tag, if any. */
  function assetVersion(doc) {
    var script = doc.querySelector ? doc.querySelector("script[src*='cloud-path.js']") : null;
    var src = script ? script.getAttribute("src") : "";
    var match = /cloud-path\.js\?(?:[^#]*&)?v=([^&#]+)/.exec(src || "");
    return match ? match[1] : "";
  }

  function ensureStyles(doc) {
    if (!doc.querySelector || doc.querySelector("link[data-cloud-path-css]")) return;
    var existing = doc.querySelector("link[href*='cloud-path.css']");
    if (existing) return;
    var script = doc.querySelector("script[src*='cloud-path.js']");
    if (!script || !doc.head) return;
    var link = doc.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-cloud-path-css", "");
    var version = assetVersion(doc);
    link.href = siteRoot(doc) + "assets/css/cloud-path.css" + (version ? "?v=" + encodeURIComponent(version) : "");
    doc.head.appendChild(link);
  }

  function init(doc) {
    if (!doc) return;
    state = resolve(env());
    if (state.source === "url") {
      var e = env();
      write(e.session, SESSION_KEY, state.selection);
    }
    ensureStyles(doc);
    mountPickers(doc);
    apply(doc);
  }

  return {
    OPTIONS: OPTIONS,
    STORAGE_KEY: STORAGE_KEY,
    SESSION_KEY: SESSION_KEY,
    EVENT: EVENT,
    normalize: normalize,
    fromSearch: fromSearch,
    resolve: resolve,
    siteRoot: siteRoot,
    assetVersion: assetVersion,
    effective: effective,
    describe: describe,
    roleOf: roleOf,
    filterQuestions: filterQuestions,
    current: current,
    explicit: explicit,
    choose: choose,
    apply: apply,
    init: init
  };
});
