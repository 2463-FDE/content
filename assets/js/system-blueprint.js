/* system-blueprint.js — interaction layer for the System Blueprint page.
   All drill content, correct answers, and feedback strings are authored in the
   page HTML (data attributes + <details> bodies); this file never invents
   curriculum claims and renders only authored strings via textContent.
   Without JavaScript the page stays complete: every drill's diagnosis path is
   readable through its native <details> element. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDESystemBlueprint = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { api.init(document); });
    } else {
      api.init(document);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* Evaluate one drill fieldset. Returns an authored-feedback result object;
     never reads free text, only which authored radio is checked. */
  function evaluateDrill(fieldset) {
    if (!fieldset) return { state: "empty", message: "Pick an option first." };
    var options = fieldset.querySelectorAll ? fieldset.querySelectorAll("input[type=radio]") : [];
    var checked = null;
    for (var i = 0; i < options.length; i += 1) {
      if (options[i].checked) { checked = options[i]; break; }
    }
    if (!checked) {
      return { state: "empty", message: "Pick an option first." };
    }
    if (checked.getAttribute("data-correct") === "1") {
      var confirmed = fieldset.getAttribute("data-feedback") || "Correct.";
      return { state: "correct", message: "Correct: " + confirmed };
    }
    var why = checked.getAttribute("data-why") || "that is not where the evidence points first.";
    return { state: "wrong", message: "Not the first look: " + why };
  }

  /* Count solved drills inside a section for its score line. */
  function scoreboard(section) {
    if (!section || !section.querySelectorAll) return { solved: 0, total: 0 };
    var drills = section.querySelectorAll("fieldset[data-drill]");
    var solved = 0;
    for (var i = 0; i < drills.length; i += 1) {
      if (drills[i].getAttribute("data-solved") === "1") solved += 1;
    }
    return { solved: solved, total: drills.length };
  }

  function updateScore(doc, sectionId) {
    var section = doc.getElementById(sectionId);
    if (!section) return;
    var out = section.querySelector("[data-score]");
    if (!out) return;
    var tally = scoreboard(section);
    out.textContent = tally.solved + " of " + tally.total + " worked through";
  }

  function wireDrill(doc, fieldset) {
    var button = fieldset.querySelector("button[data-check]");
    var status = fieldset.querySelector("[data-status]");
    if (!button || !status) return;
    button.addEventListener("click", function () {
      var result = evaluateDrill(fieldset);
      status.textContent = result.message;
      status.className = "sb-status" + (result.state === "correct" ? " is-correct" : "");
      if (result.state === "correct") {
        fieldset.setAttribute("data-solved", "1");
        var reveal = fieldset.querySelector("details");
        if (reveal) reveal.open = true;
        var section = fieldset.closest ? fieldset.closest("section[id]") : null;
        if (section) updateScore(doc, section.id);
      }
    });
  }

  /* Week strip: plain anchors without JS; with JS they also open the target
     details entry and move focus to its summary. */
  function wireStrip(doc) {
    var stops = doc.querySelectorAll("a[data-week-stop]");
    for (var i = 0; i < stops.length; i += 1) {
      (function (stop) {
        stop.addEventListener("click", function () {
          var id = (stop.getAttribute("href") || "").slice(1);
          var target = id ? doc.getElementById(id) : null;
          if (!target) return;
          target.open = true;
          var summary = target.querySelector("summary");
          if (summary && summary.focus) summary.focus();
        });
      })(stops[i]);
    }
  }

  function init(doc) {
    if (!doc || !doc.querySelectorAll) return;
    var drills = doc.querySelectorAll("fieldset[data-drill]");
    for (var i = 0; i < drills.length; i += 1) wireDrill(doc, drills[i]);
    wireStrip(doc);
  }

  return {
    evaluateDrill: evaluateDrill,
    scoreboard: scoreboard,
    updateScore: updateScore,
    init: init
  };
});
