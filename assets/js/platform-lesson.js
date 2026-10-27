/* Shared Core-30 renderer for source-aligned Week 7 and Week 8 lessons. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDEPlatformLesson = api;
  if (root.document) api.render(root.document);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function wordCount(text) {
    return (String(text || "").match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  }
  function requiredWords(lesson) {
    var words = wordCount(lesson.summary) + lesson.sections.reduce(function (sum, item) {
      return sum + wordCount(item[0]) + wordCount(item[1]);
    }, 0) + wordCount(lesson.drill.prompt) + lesson.drill.options.reduce(function (sum, item) { return sum + wordCount(item); }, 0);
    if (lesson.teamEvidence) words += wordCount(Object.values(lesson.teamEvidence).join(" "));
    return words;
  }
  function pacingFor(lesson) {
    var words = requiredWords(lesson);
    var readMinutes = Math.round(words / 150);
    return { words: words, readMinutes: readMinutes, requiredMinutes: readMinutes + 3 + 6 + 5 };
  }
  function route(id) {
    var match = /^w(07|08)d([1-5])$/.exec(id);
    if (!match) return "../../index.html";
    var week = Number(match[1]);
    var day = Number(match[2]);
    if (day < 5) return "w" + String(week).padStart(2, "0") + "d" + (day + 1) + ".html";
    return week === 7 ? "../w08/w08d1.html" : "../w09/w09d1.html";
  }
  function nextLabel(lesson) {
    return lesson.day < 5 ? "Next: Day " + (lesson.day + 1) + " ▸" : "Next: Week " + (lesson.week + 1) + " ▸";
  }
  function drillOrder(count, random) {
    var rand = typeof random === "function" ? random : Math.random;
    var result = [];
    for (var i = 0; i < count; i++) result.push(i);
    for (var j = count - 1; j > 0; j--) {
      var at = Math.min(j, Math.floor(rand() * (j + 1)));
      var swap = result[j]; result[j] = result[at]; result[at] = swap;
    }
    return result;
  }
  function assessDrill(lesson, value) {
    var correct = Number(value) === lesson.drill.answer;
    return { correct: correct, message: (correct ? "Defensible decision. " : "Recheck the consequence and control boundary. ") + lesson.drill.feedback };
  }
  function interactionHtml(lesson, id, order) {
    var sequence = order || lesson.drill.options.map(function (_, index) { return index; });
    return '<div class="capstone-drill platform-drill" data-platform-drill>' +
      '<div class="ix-k">Required practice · predict, then check</div>' +
      '<fieldset><legend>' + esc(lesson.drill.prompt) + '</legend>' +
      sequence.map(function (index) {
        return '<label><input type="radio" name="' + esc(id) + '-decision" value="' + index + '"> <span>' + esc(lesson.drill.options[index]) + '</span></label>';
      }).join("") + '</fieldset>' +
      '<div class="capstone-drill-actions"><button class="ix-btn" type="button" data-drill-check>Check decision</button><button class="ix-btn secondary" type="button" data-drill-reset>Reset</button></div>' +
      '<p class="capstone-drill-status" role="status" aria-live="polite"></p></div>';
  }
  function mountInteraction(doc, lesson) {
    var host = doc.querySelector("[data-platform-drill]");
    if (!host) return;
    var check = host.querySelector("[data-drill-check]");
    var reset = host.querySelector("[data-drill-reset]");
    var status = host.querySelector(".capstone-drill-status");
    check.addEventListener("click", function () {
      var selected = host.querySelector("input:checked");
      if (!selected) { status.textContent = "Choose one response before checking."; return; }
      var result = assessDrill(lesson, selected.value);
      status.textContent = result.message;
      status.classList.toggle("is-correct", result.correct);
      host.querySelectorAll("input").forEach(function (input) { input.disabled = true; });
      check.disabled = true;
    });
    reset.addEventListener("click", function () {
      host.querySelectorAll("input").forEach(function (input) { input.checked = false; input.disabled = false; });
      status.textContent = "";
      status.classList.remove("is-correct");
      check.disabled = false;
      var first = host.querySelector("input");
      if (first) first.focus();
    });
  }
  function setMeta(doc, name, content) {
    var meta = doc.querySelector('meta[name="' + name + '"]');
    if (!meta) { meta = doc.createElement("meta"); meta.name = name; doc.head.appendChild(meta); }
    meta.content = content;
  }
  function optionalHtml(lesson) {
    return lesson.optional.map(function (item) {
      return '<details class="deep capstone-optional" data-core="optional"><summary>' + esc(item[0]) + ' · outside Core 30</summary><p>' + esc(item[1]) + '</p></details>';
    }).join("");
  }
  function teamEvidenceHtml(lesson) {
    var item = lesson.teamEvidence;
    if (!item) return "";
    return '<section class="step team-evidence" aria-labelledby="team-evidence-title"><div class="tag">Team delivery evidence</div><h2 id="team-evidence-title">' + esc(item.artifact) + '</h2><dl><div><dt>Accountable role</dt><dd>' + esc(item.owner) + '</dd></div><div><dt>Acceptance rule</dt><dd>' + esc(item.acceptance) + '</dd></div><div><dt>Independent proof</dt><dd>' + esc(item.review) + '</dd></div></dl><p class="team-cloud-note"><b>Two separate decisions:</b> your personal AWS/GCP/Both reading view never rewrites the team’s single Week 6 primary-cloud ADR.</p></section>';
  }
  function render(doc, options) {
    var id = doc.body && doc.body.getAttribute("data-lesson");
    var lessons = (typeof globalThis !== "undefined" && globalThis.FDE_PLATFORM_LESSONS) || {};
    var lesson = lessons[id];
    var lessonRoot = doc.getElementById("lesson-root");
    if (!lessonRoot) return false;
    var authoredVisual = doc.querySelector("[data-archify-visual]");
    var visualHtml = authoredVisual ? authoredVisual.outerHTML : '<div class="lesson-load-error" role="alert">Essential system visual unavailable. Use the visible text alternative or notify the trainer.</div>';
    if (!lesson) {
      lessonRoot.innerHTML = '<section class="lesson-load-error" role="alert"><h1>Lesson unavailable</h1><p>This route has no transferred curriculum record.</p><a class="btn" href="../../index.html">Back to hub</a></section>';
      return false;
    }
    var pacing = pacingFor(lesson);
    var dayId = "w" + String(lesson.week).padStart(2, "0") + "d" + lesson.day;
    var next = route(dayId);
    var order = drillOrder(lesson.drill.options.length, options && options.random);
    doc.title = "W" + lesson.week + "·D" + lesson.day + " — " + lesson.title + " | 2463-FDE";
    setMeta(doc, "fde-day", dayId);
    setMeta(doc, "fde-concepts", lesson.concepts.join(","));
    var sections = lesson.sections.map(function (section, index) {
      var practice = index === 3 ? interactionHtml(lesson, dayId, order) : "";
      return '<section class="step" data-diagram="0" data-step="' + index + '"><div class="tag">Required decision ' + (index + 1) + '</div><h2>' + esc(section[0]) + '</h2><p>' + esc(section[1]) + '</p>' + practice + '</section>';
    }).join("");
    var sources = lesson.sources.map(function (source) {
      var external = /^https?:/.test(source.href) ? ' target="_blank" rel="noopener"' : "";
      return '<li><a href="' + esc(source.href) + '"' + external + '>' + esc(source.label) + '</a></li>';
    }).join("");
    var visualTitle = lesson.week === 7 ? "Essential delivery-control boundary" : "Essential reliability-evidence boundary";
    lessonRoot.innerHTML = '<header class="kafka-page-head platform-page-head"><div class="lede"><h1>' + esc(lesson.title) + '</h1>' +
      '<div class="meta"><span><b>Week ' + lesson.week + '</b> · Day ' + lesson.day + (lesson.day === 5 ? ' · milestone' : '') + '</span><span>' + esc(lesson.phase) + '</span>' +
      '<span class="core30-meta" title="Required reading is measured at 150 words per minute. Essential diagram dwell, one interaction, and the six-question check are included."><b>Core 30</b> · ~' + pacing.readMinutes + ' min read · 1 interaction · 6-Q check · ~' + pacing.requiredMinutes + ' min required</span></div>' +
      '<p class="summary">' + esc(lesson.summary) + '</p><div class="ix-legend"></div></div></header>' +
      '<section class="kafka-visual-breakout platform-visual-breakout" aria-label="' + visualTitle + '"><div class="stage-title">' + visualTitle + '</div>' + visualHtml + '</section>' +
      '<div class="reading2col"><nav class="toc" aria-label="On this page"></nav><article class="reading-col"><section class="capstone-context" aria-label="Project context"><b>Inherited team brownfield:</b> synthetic banking/payments evidence only. No client, learner, account, or provider fact is inferred.</section>' + sections + teamEvidenceHtml(lesson) + optionalHtml(lesson) +
      '<section class="reading-sources" data-core="optional" aria-label="Sources and evidence"><h2>Sources &amp; evidence trail</h2><p>Optional references outside the required path. Dated research records carry scope and currency notes.</p><ul>' + sources + '</ul></section></article>' +
      '<aside class="side kafka-side"><div class="side-cards"><button class="activity-card" type="button" data-modal="trainer-demo-modal"><div class="ac-k">Trainer cue</div><div class="ac-t">Facilitate the inert evidence exercise</div><div class="ac-meta">synthetic and review-only</div></button>' +
      '<button class="activity-card accent" type="button" data-modal="quiz-modal"><div class="ac-k">Comprehension check</div><div class="ac-t"><span class="quiz-count">6</span> questions on delivery judgement</div><div class="ac-meta">~5 min · practice</div></button></div>' +
      '<div class="side-nav"><a class="snav-btn" href="../../index.html#curriculum">◂ Curriculum hub</a><button class="snav-btn goals" type="button" data-modal="goals-modal">Daily goals</button><a class="snav-btn snav-next"></a></div></aside></div>';
    var overlays = doc.getElementById("lesson-overlays");
    overlays.innerHTML = '<div id="trainer-demo-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><h2>Trainer facilitation cue</h2><p>Ask for a prediction before revealing the diagram relationship or interaction response. Require the learner to connect decision, evidence, human authority, rollback or response, and client consequence.</p><p><b>Safety boundary:</b> inert configuration and synthetic evidence only. No account, credential, IAM, billing, provider initialization, Terraform apply/destroy, Ansible host connection, deployment, publication, external message, paid model call, or real learner/client data.</p><p><b>Batch context:</b> <span data-batch-value>loading</span> · <b>Client:</b> <span data-client-name>loading</span></p></div></div>' +
      '<div id="quiz-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><section id="quiz"></section><div class="modal-next"></div></div></div>' +
      '<div id="goals-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><h2>Week ' + lesson.week + ' · Day ' + lesson.day + ' goals</h2><ul class="goals-list">' + lesson.goals.map(function (goal) { return '<li>' + esc(goal) + '</li>'; }).join("") + '</ul><div class="ma-k">Daily deliverable · Project 2</div><ul class="deliv-list"><li>' + esc(lesson.deliverable) + '</li><li>Use synthetic, local/static evidence only. Do not provision, apply, destroy, connect, deploy, publish, merge, send externally, or use a paid provider.</li><li><a href="../../client-delivery.html?w=' + lesson.week + '">Open the Week ' + lesson.week + ' client packet</a>.</li></ul></div></div>';
    lessonRoot.className = "lesson2 capstone-lesson kafka-lesson platform-lesson week-" + lesson.week;
    var browserRoot = typeof window !== "undefined" ? window : globalThis;
    browserRoot.QUIZ = { id: dayId + "-check", title: "Check your understanding", questions: lesson.checks };
    browserRoot.FDE_NEXT = { label: nextLabel(lesson), href: next };
    mountInteraction(doc, lesson);
    return true;
  }
  return { esc: esc, wordCount: wordCount, requiredWords: requiredWords, pacingFor: pacingFor, route: route, drillOrder: drillOrder, assessDrill: assessDrill, interactionHtml: interactionHtml, teamEvidenceHtml: teamEvidenceHtml, render: render };
});
