/* lesson-activities.js — shared substantive-practice library for lesson routes.

   Six reusable activity kinds, each of which changes or inspects a model,
   state, output, or evidence and teaches through explanatory feedback with
   reset/replay. MCQ checks live in quiz.js; this module is for practice, not
   assessment. Definitions are data (authored in week lesson-data files or in
   inline JSON blocks); content claims must trace to the day's researched
   lesson content.

   Kinds:
     trace     step through an execution/data flow; the state table updates
               and highlights what changed at every step, with a note.
     params    change parameters and compare the recomputed outcome against a
               pinned baseline.
     evidence  inspect artifacts (logs, records, metrics) and select which
               support a claim; feedback explains each artifact's probative
               value.
     order     arrange events/steps into a defensible order with accessible
               move buttons; feedback names the constraint a misplacement
               breaks.
     fault     reveal probe results, then pick the failing boundary; feedback
               traces the causal chain and counts probes spent.
     tradeoff  make a constrained decision and watch its consequences across
               the dimensions that matter, against the defensible option.

   API: html(def, id) renders the interactive host; fallbackHtml(def) renders
   the committed no-JS path; mount(doc) binds every [data-activity] host;
   assess.* are pure and unit-tested. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDEActivities = api;
  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () { api.mount(root.document); });
    } else {
      api.mount(root.document);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var KIND_LABELS = {
    trace: "trace the flow",
    params: "change parameters, compare outcomes",
    evidence: "inspect the evidence",
    order: "arrange the sequence",
    fault: "diagnose the failure",
    tradeoff: "weigh the trade-off"
  };

  /* ---------- pure assessment helpers (unit-tested) ---------- */

  var assess = {
    evidence: function (def, pickedIds) {
      var picked = {};
      (pickedIds || []).forEach(function (id) { picked[id] = true; });
      var missed = [], wrong = [];
      def.artifacts.forEach(function (artifact) {
        if (artifact.probative && !picked[artifact.id]) missed.push(artifact);
        if (!artifact.probative && picked[artifact.id]) wrong.push(artifact);
      });
      var correct = missed.length === 0 && wrong.length === 0 && (pickedIds || []).length > 0;
      var message;
      if (!pickedIds || !pickedIds.length) message = "Select at least one artifact before checking.";
      else if (correct) message = "Correct evidence set. " + def.why;
      else if (wrong.length) message = "“" + wrong[0].label + "” does not support the claim: " + wrong[0].why;
      else message = "Something probative is still unselected. Re-read “" + missed[0].label + "”: " + missed[0].why;
      return { correct: correct, message: message };
    },
    order: function (def, arrangedIds) {
      var firstWrong = -1;
      for (var i = 0; i < def.correct.length; i++) {
        if (arrangedIds[i] !== def.correct[i]) { firstWrong = i; break; }
      }
      if (firstWrong === -1) return { correct: true, message: "Defensible order. " + def.why };
      var misplaced = def.items.filter(function (item) { return item.id === arrangedIds[firstWrong]; })[0];
      return {
        correct: false,
        message: "Position " + (firstWrong + 1) + " breaks the ordering constraint: " +
          (misplaced ? misplaced.why : def.why)
      };
    },
    fault: function (def, suspectId, probesUsed) {
      var suspect = def.suspects.filter(function (s) { return s.id === suspectId; })[0];
      if (!suspect) return { correct: false, message: "Pick a suspect boundary first." };
      var correct = suspectId === def.culprit;
      var spent = typeof probesUsed === "number" ? probesUsed : 0;
      var message = correct
        ? "Diagnosis confirmed after " + spent + " of " + def.probes.length + " probes. " + suspect.why
        : "Not the failing boundary. " + suspect.why;
      return { correct: correct, message: message };
    },
    tradeoff: function (def, optionIndex) {
      var option = def.options[optionIndex];
      if (!option) return { correct: false, message: "Choose one option before checking." };
      return {
        correct: !!option.defensible,
        message: (option.defensible ? "Defensible under the stated constraints. " : "Look at the consequences again. ") + option.why
      };
    },
    params: function (def, selection) {
      var match = null;
      def.cases.some(function (entry) {
        var hit = Object.keys(entry.when).every(function (key) { return String(selection[key]) === String(entry.when[key]); });
        if (hit) match = entry;
        return hit;
      });
      return match;
    }
  };

  /* ---------- shared chrome ---------- */

  function shell(def, id, body) {
    return '<div class="lesson-activity" data-activity="' + esc(def.type) + '" data-activity-id="' + esc(id) + '" data-core-interaction>' +
      '<div class="ix-k">Required practice · ' + esc(KIND_LABELS[def.type] || def.type) + '</div>' +
      '<h3 class="activity-title">' + esc(def.title) + '</h3>' +
      (def.intro ? '<p class="activity-intro">' + esc(def.intro) + "</p>" : "") +
      '<script type="application/json">' + JSON.stringify(def).replace(/</g, "\\u003c") + "</script>" +
      '<div class="activity-body">' + body + "</div>" +
      '<p class="activity-status" role="status" aria-live="polite"></p>' +
      "</div>";
  }

  function checkResetButtons() {
    return '<div class="activity-actions">' +
      '<button class="ix-btn" type="button" data-activity-check>Check</button>' +
      '<button class="ix-btn secondary" type="button" data-activity-reset>Reset</button></div>';
  }

  /* ---------- interactive markup per kind ---------- */

  function traceBody(def) {
    return '<div class="trace-stage">' +
      '<table class="trace-state"><caption class="sr-only">Observed state</caption><tbody></tbody></table>' +
      '<p class="trace-note"></p></div>' +
      '<div class="activity-actions">' +
      '<button class="ix-btn secondary" type="button" data-trace-back>◂ Back</button>' +
      '<span class="trace-pos" aria-live="polite"></span>' +
      '<button class="ix-btn" type="button" data-trace-next>Step ▸</button>' +
      '<button class="ix-btn secondary" type="button" data-activity-reset>Restart</button></div>';
  }

  function paramsBody(def, id) {
    var controls = def.controls.map(function (control) {
      var options = control.options.map(function (option) {
        return '<option value="' + esc(option.value) + '">' + esc(option.label) + "</option>";
      }).join("");
      return '<label class="params-control">' + esc(control.label) +
        '<select data-param="' + esc(control.key) + '">' + options + "</select></label>";
    }).join("");
    return '<div class="params-controls">' + controls + "</div>" +
      '<div class="params-compare"><div class="params-out" data-params-current><h4>Current outcome</h4><dl></dl><p class="params-note"></p></div>' +
      '<div class="params-out params-pinned" data-params-pinned hidden><h4>Pinned baseline</h4><dl></dl><p class="params-note"></p></div></div>' +
      '<div class="activity-actions"><button class="ix-btn secondary" type="button" data-params-pin>Pin baseline to compare</button>' +
      '<button class="ix-btn secondary" type="button" data-activity-reset>Reset</button></div>';
  }

  function evidenceBody(def, id) {
    var artifacts = def.artifacts.map(function (artifact) {
      return '<label class="evidence-item"><input type="checkbox" value="' + esc(artifact.id) + '"> <span class="evidence-label">' + esc(artifact.label) + "</span>" +
        '<pre class="evidence-artifact">' + esc(artifact.body) + "</pre></label>";
    }).join("");
    return '<p class="evidence-claim"><b>Claim:</b> ' + esc(def.claim) + "</p>" +
      '<fieldset class="evidence-set"><legend>Select every artifact that actually supports the claim</legend>' + artifacts + "</fieldset>" +
      checkResetButtons();
  }

  function orderBody(def, id, orderIndexes) {
    var sequence = orderIndexes || def.items.map(function (_, index) { return index; });
    var items = sequence.map(function (itemIndex) {
      var item = def.items[itemIndex];
      return '<li class="order-item" data-id="' + esc(item.id) + '"><span class="order-label">' + esc(item.label) + "</span>" +
        '<span class="order-controls"><button class="ix-btn secondary" type="button" data-move="up" aria-label="Move “' + esc(item.label) + '” earlier">▲</button>' +
        '<button class="ix-btn secondary" type="button" data-move="down" aria-label="Move “' + esc(item.label) + '” later">▼</button></span></li>';
    }).join("");
    return '<ol class="order-list">' + items + "</ol>" + checkResetButtons();
  }

  function faultBody(def, id) {
    var probes = def.probes.map(function (probe) {
      return '<div class="fault-probe"><button class="ix-btn secondary" type="button" data-probe="' + esc(probe.id) + '">Probe: ' + esc(probe.label) + "</button>" +
        '<pre class="fault-result" hidden>' + esc(probe.result) + "</pre></div>";
    }).join("");
    var suspects = def.suspects.map(function (suspect) {
      return '<label><input type="radio" name="' + esc(id) + '-suspect" value="' + esc(suspect.id) + '"> <span>' + esc(suspect.label) + "</span></label>";
    }).join("");
    return '<p class="fault-symptom"><b>Symptom:</b> ' + esc(def.symptom) + "</p>" +
      '<div class="fault-probes">' + probes + "</div>" +
      '<fieldset class="fault-suspects"><legend>Which boundary is failing?</legend>' + suspects + "</fieldset>" +
      checkResetButtons();
  }

  function tradeoffBody(def, id) {
    var options = def.options.map(function (option, index) {
      return '<label><input type="radio" name="' + esc(id) + '-tradeoff" value="' + index + '"> <span>' + esc(option.label) + "</span></label>";
    }).join("");
    var heads = def.dims.map(function (dim) { return "<th>" + esc(dim) + "</th>"; }).join("");
    return '<fieldset class="tradeoff-options"><legend>' + esc(def.prompt) + "</legend>" + options + "</fieldset>" +
      '<div class="tradeoff-consequences" hidden><table><caption class="sr-only">Consequences</caption><thead><tr><th>Option</th>' + heads + "</tr></thead><tbody></tbody></table></div>" +
      checkResetButtons();
  }

  function html(def, id) {
    var body;
    if (def.type === "trace") body = traceBody(def);
    else if (def.type === "params") body = paramsBody(def, id);
    else if (def.type === "evidence") body = evidenceBody(def, id);
    else if (def.type === "order") body = orderBody(def, id);
    else if (def.type === "fault") body = faultBody(def, id);
    else if (def.type === "tradeoff") body = tradeoffBody(def, id);
    else return "";
    return shell(def, id, body);
  }

  /* ---------- committed no-JS path ---------- */

  function fallbackHtml(def) {
    var inner = "";
    if (def.type === "trace") {
      inner = "<ol>" + def.steps.map(function (step) {
        var state = step.state.map(function (pair) { return pair[0] + " = " + pair[1]; }).join(" · ");
        return "<li><b>" + esc(step.label) + "</b> — " + esc(state) + (step.note ? "<br>" + esc(step.note) : "") + "</li>";
      }).join("") + "</ol>";
    } else if (def.type === "params") {
      inner = "<ul>" + def.cases.map(function (entry) {
        var when = Object.keys(entry.when).map(function (key) { return key + ": " + entry.when[key]; }).join(", ");
        var out = Object.keys(entry.out).map(function (key) { return key + " → " + entry.out[key]; }).join("; ");
        return "<li><b>" + esc(when) + "</b> — " + esc(out) + ". " + esc(entry.note) + "</li>";
      }).join("") + "</ul>";
    } else if (def.type === "evidence") {
      inner = "<p><b>Claim:</b> " + esc(def.claim) + "</p><ul>" + def.artifacts.map(function (artifact) {
        return "<li><b>" + esc(artifact.label) + "</b> — " + (artifact.probative ? "supports the claim: " : "does not support the claim: ") + esc(artifact.why) + "</li>";
      }).join("") + "</ul><p>" + esc(def.why) + "</p>";
    } else if (def.type === "order") {
      var byId = {};
      def.items.forEach(function (item) { byId[item.id] = item; });
      inner = "<ol>" + def.correct.map(function (itemId) {
        var item = byId[itemId];
        return "<li><b>" + esc(item.label) + "</b> — " + esc(item.why) + "</li>";
      }).join("") + "</ol><p>" + esc(def.why) + "</p>";
    } else if (def.type === "fault") {
      var culprit = def.suspects.filter(function (s) { return s.id === def.culprit; })[0];
      inner = "<p><b>Symptom:</b> " + esc(def.symptom) + "</p><ul>" + def.probes.map(function (probe) {
        return "<li><b>" + esc(probe.label) + ":</b> " + esc(probe.result) + "</li>";
      }).join("") + "</ul><p><b>Failing boundary:</b> " + esc(culprit ? culprit.label : "") + ". " + esc(culprit ? culprit.why : "") + "</p>";
    } else if (def.type === "tradeoff") {
      var defensible = def.options.filter(function (o) { return o.defensible; })[0];
      inner = "<p>" + esc(def.prompt) + "</p><ul>" + def.options.map(function (option) {
        var out = def.dims.map(function (dim) { return dim + ": " + (option.outcome[dim] || "—"); }).join("; ");
        return "<li><b>" + esc(option.label) + "</b> — " + esc(out) + ". " + esc(option.why) + "</li>";
      }).join("") + "</ul><p><b>Defensible choice:</b> " + esc(defensible ? defensible.label : "") + "</p>";
    }
    return '<details class="activity-fallback" data-core-interaction data-activity-fallback="' + esc(def.type) + '">' +
      "<summary>Required practice · " + esc(def.title) + " · static path</summary>" +
      (def.intro ? "<p>" + esc(def.intro) + "</p>" : "") + inner + "</details>";
  }

  /* ---------- runtime mounting ---------- */

  function readDef(host) {
    var script = host.querySelector('script[type="application/json"]');
    try { return JSON.parse(script.textContent); } catch (error) { return null; }
  }

  function setStatus(host, result) {
    var status = host.querySelector(".activity-status");
    status.textContent = result.message;
    status.classList.toggle("is-correct", !!result.correct);
  }

  function mountTrace(host, def) {
    var tbody = host.querySelector(".trace-state tbody");
    var note = host.querySelector(".trace-note");
    var pos = host.querySelector(".trace-pos");
    var back = host.querySelector("[data-trace-back]");
    var next = host.querySelector("[data-trace-next]");
    var at = 0;
    function renderStep() {
      var step = def.steps[at];
      var previous = at > 0 ? def.steps[at - 1] : null;
      var previousState = {};
      if (previous) previous.state.forEach(function (pair) { previousState[pair[0]] = pair[1]; });
      tbody.innerHTML = step.state.map(function (pair) {
        var changed = !previous || previousState[pair[0]] !== pair[1];
        return '<tr class="' + (changed ? "is-changed" : "") + '"><th scope="row">' + esc(pair[0]) + "</th><td>" + esc(pair[1]) + (changed && previous ? ' <span class="trace-delta">changed</span>' : "") + "</td></tr>";
      }).join("");
      note.textContent = (step.label ? step.label + " — " : "") + (step.note || "");
      pos.textContent = "Step " + (at + 1) + " of " + def.steps.length;
      back.disabled = at === 0;
      next.disabled = at === def.steps.length - 1;
    }
    back.addEventListener("click", function () { if (at > 0) { at -= 1; renderStep(); } });
    next.addEventListener("click", function () { if (at < def.steps.length - 1) { at += 1; renderStep(); } });
    host.querySelector("[data-activity-reset]").addEventListener("click", function () { at = 0; renderStep(); });
    renderStep();
  }

  function mountParams(host, def) {
    var selects = Array.prototype.slice.call(host.querySelectorAll("[data-param]"));
    var current = host.querySelector("[data-params-current]");
    var pinned = host.querySelector("[data-params-pinned]");
    function selection() {
      var picked = {};
      selects.forEach(function (select) { picked[select.getAttribute("data-param")] = select.value; });
      return picked;
    }
    function renderInto(panel, entry) {
      panel.querySelector("dl").innerHTML = Object.keys(entry.out).map(function (key) {
        return "<dt>" + esc(key) + "</dt><dd>" + esc(entry.out[key]) + "</dd>";
      }).join("");
      panel.querySelector(".params-note").textContent = entry.note;
    }
    function update() {
      var entry = assess.params(def, selection());
      if (entry) renderInto(current, entry);
      setStatus(host, { correct: false, message: "" });
    }
    selects.forEach(function (select) { select.addEventListener("change", update); });
    host.querySelector("[data-params-pin]").addEventListener("click", function () {
      var entry = assess.params(def, selection());
      if (!entry) return;
      renderInto(pinned, entry);
      pinned.hidden = false;
      setStatus(host, { correct: true, message: "Baseline pinned. Change a parameter and compare the two outcomes." });
    });
    host.querySelector("[data-activity-reset]").addEventListener("click", function () {
      selects.forEach(function (select) { select.selectedIndex = 0; });
      pinned.hidden = true;
      update();
    });
    update();
  }

  function mountEvidence(host, def) {
    var check = host.querySelector("[data-activity-check]");
    check.addEventListener("click", function () {
      var picked = Array.prototype.slice.call(host.querySelectorAll("input:checked")).map(function (input) { return input.value; });
      setStatus(host, assess.evidence(def, picked));
    });
    host.querySelector("[data-activity-reset]").addEventListener("click", function () {
      Array.prototype.slice.call(host.querySelectorAll("input")).forEach(function (input) { input.checked = false; });
      setStatus(host, { correct: false, message: "" });
    });
  }

  function mountOrder(host, def) {
    var list = host.querySelector(".order-list");
    function arrangement() {
      return Array.prototype.slice.call(list.querySelectorAll(".order-item")).map(function (item) { return item.getAttribute("data-id"); });
    }
    list.addEventListener("click", function (event) {
      var button = event.target.closest("[data-move]");
      if (!button) return;
      var item = button.closest(".order-item");
      if (button.getAttribute("data-move") === "up" && item.previousElementSibling) {
        list.insertBefore(item, item.previousElementSibling);
      } else if (button.getAttribute("data-move") === "down" && item.nextElementSibling) {
        list.insertBefore(item.nextElementSibling, item);
      }
      button.focus();
    });
    host.querySelector("[data-activity-check]").addEventListener("click", function () {
      setStatus(host, assess.order(def, arrangement()));
    });
    var initial = arrangement();
    host.querySelector("[data-activity-reset]").addEventListener("click", function () {
      initial.forEach(function (id) {
        list.appendChild(list.querySelector('[data-id="' + id + '"]'));
      });
      setStatus(host, { correct: false, message: "" });
    });
  }

  function mountFault(host, def) {
    var used = 0;
    Array.prototype.slice.call(host.querySelectorAll("[data-probe]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var result = button.parentElement.querySelector(".fault-result");
        if (result.hidden) { result.hidden = false; used += 1; button.disabled = true; }
      });
    });
    host.querySelector("[data-activity-check]").addEventListener("click", function () {
      var picked = host.querySelector("input:checked");
      setStatus(host, assess.fault(def, picked ? picked.value : null, used));
    });
    host.querySelector("[data-activity-reset]").addEventListener("click", function () {
      used = 0;
      Array.prototype.slice.call(host.querySelectorAll("[data-probe]")).forEach(function (button) {
        button.disabled = false;
        button.parentElement.querySelector(".fault-result").hidden = true;
      });
      Array.prototype.slice.call(host.querySelectorAll("input")).forEach(function (input) { input.checked = false; });
      setStatus(host, { correct: false, message: "" });
    });
  }

  function mountTradeoff(host, def) {
    var consequences = host.querySelector(".tradeoff-consequences");
    var tbody = consequences.querySelector("tbody");
    host.querySelector("[data-activity-check]").addEventListener("click", function () {
      var picked = host.querySelector("input:checked");
      var index = picked ? Number(picked.value) : -1;
      var result = assess.tradeoff(def, index);
      if (index >= 0) {
        var rows = [index];
        def.options.forEach(function (option, optionIndex) {
          if (option.defensible && optionIndex !== index) rows.push(optionIndex);
        });
        tbody.innerHTML = rows.map(function (optionIndex) {
          var option = def.options[optionIndex];
          return "<tr" + (option.defensible ? ' class="is-defensible"' : "") + '><th scope="row">' + esc(option.label) + (option.defensible ? " · defensible" : " · chosen") + "</th>" +
            def.dims.map(function (dim) { return "<td>" + esc(option.outcome[dim] || "—") + "</td>"; }).join("") + "</tr>";
        }).join("");
        consequences.hidden = false;
      }
      setStatus(host, result);
    });
    host.querySelector("[data-activity-reset]").addEventListener("click", function () {
      Array.prototype.slice.call(host.querySelectorAll("input")).forEach(function (input) { input.checked = false; });
      consequences.hidden = true;
      tbody.innerHTML = "";
      setStatus(host, { correct: false, message: "" });
    });
  }

  var MOUNTS = { trace: mountTrace, params: mountParams, evidence: mountEvidence, order: mountOrder, fault: mountFault, tradeoff: mountTradeoff };

  function mount(doc) {
    if (!doc || typeof doc.querySelectorAll !== "function") return 0;
    var hosts = Array.prototype.slice.call(doc.querySelectorAll("[data-activity]"));
    hosts.forEach(function (host) {
      if (host.getAttribute("data-activity-mounted")) return;
      var def = readDef(host);
      if (!def || !MOUNTS[def.type]) return;
      // Inline-JSON authored hosts render their body lazily here.
      if (!host.querySelector(".activity-body")) {
        var rendered = html(def, host.getAttribute("data-activity-id") || def.type);
        var wrapper = doc.createElement("div");
        wrapper.innerHTML = rendered;
        var replacement = wrapper.firstChild;
        host.parentNode.replaceChild(replacement, host);
        host = replacement;
        def = readDef(host);
      }
      MOUNTS[def.type](host, def);
      host.setAttribute("data-activity-mounted", "true");
    });
    return hosts.length;
  }

  return { esc: esc, html: html, fallbackHtml: fallbackHtml, mount: mount, assess: assess, KIND_LABELS: KIND_LABELS };
});
