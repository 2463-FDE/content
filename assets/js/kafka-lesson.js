/* kafka-lesson.js — shared renderer for the source-authoritative Week 6 transfer. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDEKafkaLesson = api;
  if (root.document) api.render(root.document);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var ADR_LINK_LABEL = "Open the team-primary-cloud ADR template";
  function activityLib() {
    if (typeof globalThis !== "undefined" && globalThis.FDEActivities) return globalThis.FDEActivities;
    if (typeof module === "object" && module.exports) { try { return require("./lesson-activities.js"); } catch (error) { return null; } }
    return null;
  }
  function wordCount(text) {
    return (String(text || "").match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  }
  function requiredWords(lesson) {
    var projectWords = lesson.project ? wordCount(lesson.project.label) + wordCount(lesson.project.context) + wordCount(ADR_LINK_LABEL) : 0;
    return projectWords + wordCount(lesson.summary) + lesson.sections.reduce(function (sum, section) {
      return sum + wordCount(section[0]) + wordCount(section[1]);
    }, 0);
  }
  function pacingFor(lesson) {
    var words = requiredWords(lesson);
    var readMinutes = Math.round(words / 150);
    var activityCount = (lesson.activities || []).length;
    return {
      words: words,
      readMinutes: readMinutes,
      interactions: 1 + activityCount,
      requiredMinutes: readMinutes + 3 + 6 + 5 + 4 * activityCount
    };
  }
  function route(id) {
    var match = /^w06d([1-5])$/.exec(id);
    if (!match) return "../../index.html";
    var day = Number(match[1]);
    return day < 5 ? "w06d" + (day + 1) + ".html" : "../w07/w07d1.html";
  }
  function nextLabel(lesson) {
    return lesson.day < 5 ? "Next: Day " + (lesson.day + 1) + " ▸" : "Next: Week 7 ▸";
  }
  function drillOrder(count, random) {
    var rand = typeof random === "function" ? random : Math.random;
    var order = [];
    for (var i = 0; i < count; i++) order.push(i);
    for (var j = count - 1; j > 0; j--) {
      var k = Math.min(j, Math.floor(rand() * (j + 1)));
      var swap = order[j]; order[j] = order[k]; order[k] = swap;
    }
    return order;
  }
  function assessDrill(lesson, value) {
    var correct = Number(value) === lesson.drill.answer;
    return { correct: correct, message: (correct ? "Defensible decision. " : "Recheck the pipeline consequence. ") + lesson.drill.feedback };
  }
  function interactionHtml(lesson, id, order) {
    var sequence = order || lesson.drill.options.map(function (_, index) { return index; });
    return '<div class="capstone-drill kafka-drill" data-kafka-drill data-core-interaction>' +
      '<div class="ix-k">Required practice · pipeline decision</div>' +
      '<fieldset><legend>' + esc(lesson.drill.prompt) + '</legend>' +
      sequence.map(function (index) {
        return '<label><input type="radio" name="' + esc(id) + '-decision" value="' + index + '"> <span>' + esc(lesson.drill.options[index]) + '</span></label>';
      }).join("") + '</fieldset>' +
      '<div class="capstone-drill-actions"><button class="ix-btn" type="button" data-drill-check>Check decision</button><button class="ix-btn secondary" type="button" data-drill-reset>Reset</button></div>' +
      '<p class="capstone-drill-status" role="status" aria-live="polite"></p></div>';
  }
  function mountInteraction(doc, lesson) {
    var host = doc.querySelector("[data-kafka-drill]");
    if (!host) return;
    var checkButton = host.querySelector("[data-drill-check]");
    var resetButton = host.querySelector("[data-drill-reset]");
    var status = host.querySelector(".capstone-drill-status");
    checkButton.addEventListener("click", function () {
      var selected = host.querySelector("input:checked");
      if (!selected) { status.textContent = "Choose one response before checking."; return; }
      var result = assessDrill(lesson, selected.value);
      status.textContent = result.message;
      status.classList.toggle("is-correct", result.correct);
      host.querySelectorAll("input").forEach(function (input) { input.disabled = true; });
      checkButton.disabled = true;
    });
    resetButton.addEventListener("click", function () {
      host.querySelectorAll("input").forEach(function (input) { input.checked = false; input.disabled = false; });
      status.textContent = "";
      status.classList.remove("is-correct");
      checkButton.disabled = false;
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
  function projectHtml(lesson) {
    if (!lesson.project) return "";
    return '<aside class="project-context" aria-label="Project and cloud decision context"><strong>' + esc(lesson.project.label) + '</strong><p>' + esc(lesson.project.context) + '</p><a href="' + esc(lesson.project.adrHref) + '">' + ADR_LINK_LABEL + '</a></aside>';
  }
  function activityFallbacks(lesson, index) {
    var lib = activityLib();
    if (!lib) return "";
    return (lesson.activities || []).filter(function (def) { return (def.at == null ? 1 : def.at) === index; })
      .map(function (def) { return lib.fallbackHtml(def); }).join("");
  }
  function activityBlocks(lesson, dayId, index) {
    var lib = activityLib();
    if (!lib) return "";
    return (lesson.activities || []).filter(function (def) { return (def.at == null ? 1 : def.at) === index; })
      .map(function (def, defIndex) { return lib.html(def, dayId + "-a" + index + defIndex); }).join("");
  }
  function staticFallbackHtml(lesson, visualText) {
    var dayId = "w06d" + lesson.day;
    var pacing = pacingFor(lesson);
    var practice = '<details data-activity-fallback="tradeoff"><summary>Required practice: ' + esc(lesson.drill.prompt) + '</summary><ul>' + lesson.drill.options.map(function (option) { return '<li>' + esc(option) + '</li>'; }).join("") + '</ul><p><b>Defensible response:</b> ' + esc(lesson.drill.options[lesson.drill.answer]) + '</p><p>' + esc(lesson.drill.feedback) + '</p></details>';
    var sections = lesson.sections.map(function (section, index) {
      return '<section><h2>' + esc(section[0]) + '</h2><p>' + esc(section[1]) + '</p>' + (index === 3 ? practice : '') + activityFallbacks(lesson, index) + '</section>';
    }).join("");
    var checks = lesson.checks.map(function (question, index) {
      return '<details><summary>' + (index + 1) + '. ' + esc(question.stem) + '</summary><p><b>Answer:</b> ' + esc(question.options[question.answer]) + '</p><p>' + esc(question.explain) + '</p></details>';
    }).join("");
    var sources = lesson.sources.map(function (source) { return '<li><a href="' + esc(source.href) + '">' + esc(source.label) + '</a></li>'; }).join("");
    return '<noscript><style>#lesson-root{display:none}</style><main class="lesson2 nojs-lesson" data-curriculum-surface><article class="reading-col"><header class="lede"><h1>' + esc(lesson.title) + '</h1><div class="meta"><span><b>Week 6</b> · Day ' + lesson.day + '</span><span><b>Core 30</b> · ~' + pacing.readMinutes + ' min read · ' + pacing.interactions + ' interaction' + (pacing.interactions === 1 ? '' : 's') + ' · 6-Q check · ~' + pacing.requiredMinutes + ' min required</span></div><p class="summary">' + esc(lesson.summary) + '</p>' + projectHtml(lesson) + '</header><section aria-labelledby="nojs-visual-' + dayId + '"><h2 id="nojs-visual-' + dayId + '">Essential event-flow boundary · text alternative</h2><p>' + esc(visualText || "The required diagram connects the day's system boundaries, evidence, failure path, and human owner.") + '</p></section>' + sections + optionalHtml(lesson) + '<section><h2>Comprehension check</h2>' + checks + '</section><section class="reading-sources" data-core="optional" aria-label="Sources and evidence"><h2>Sources &amp; evidence trail</h2><ul>' + sources + '</ul></section><p><a href="../../index.html#curriculum">Return to the curriculum hub</a> · <a href="' + esc(route(dayId)) + '">' + esc(nextLabel(lesson)) + '</a></p></article></main></noscript>';
  }
  function render(doc, options) {
    var id = doc.body && doc.body.getAttribute("data-lesson");
    var lessons = (typeof globalThis !== "undefined" && globalThis.FDE_KAFKA_LESSONS) || {};
    var lesson = lessons[id];
    var lessonRoot = doc.getElementById("lesson-root");
    if (!lessonRoot) return false;
    var visualTemplate = doc.querySelector("template[data-archify-template]");
    var authoredVisual = doc.querySelector("[data-archify-visual]");
    var visualHtml = visualTemplate ? visualTemplate.innerHTML
      : (authoredVisual ? authoredVisual.outerHTML : '<div class="lesson-load-error" role="alert">Essential pipeline visual unavailable. Ask the trainer for the static export.</div>');
    if (!lesson) {
      lessonRoot.innerHTML = '<section class="lesson-load-error" role="alert"><h1>Lesson unavailable</h1><p>This Week 6 route has no transferred curriculum record. Return to the curriculum hub and notify the trainer.</p><a class="btn" href="../../index.html">Back to hub</a></section>';
      return false;
    }

    var pacing = pacingFor(lesson);
    var dayId = "w06d" + lesson.day;
    var next = route(dayId);
    var order = drillOrder(lesson.drill.options.length, options && options.random);
    doc.title = "W6·D" + lesson.day + " — " + lesson.title + " | 2463-FDE";
    setMeta(doc, "fde-day", dayId);
    setMeta(doc, "fde-concepts", lesson.concepts.join(","));

    var visualBlock = '<section class="lesson-visual-context" data-visual-role="context" aria-label="Essential event-flow boundary">' +
      '<p class="visual-lede"><b>Supporting context · essential event-flow boundary.</b> ' + esc(lesson.visualLede || "Place the decisions above inside the day’s system boundary, then continue.") + '</p>' + visualHtml + '</section>';
    var sections = lesson.sections.map(function (section, index) {
      var practice = index === 3 ? interactionHtml(lesson, dayId, order) : "";
      return '<section class="step" data-diagram="0" data-step="' + index + '"><div class="tag">Required decision ' + (index + 1) + '</div><h2>' + esc(section[0]) + '</h2><p>' + esc(section[1]) + '</p>' + practice + '</section>' +
        activityBlocks(lesson, dayId, index) + (index === 2 ? visualBlock : "");
    }).join("");
    var sourceList = lesson.sources.map(function (source) {
      var external = /^https?:/.test(source.href) ? ' target="_blank" rel="noopener"' : "";
      return '<li><a href="' + esc(source.href) + '"' + external + '>' + esc(source.label) + '</a></li>';
    }).join("");

    lessonRoot.innerHTML = '<header class="kafka-page-head"><div class="lede"><h1>' + esc(lesson.title) + '</h1>' +
      '<div class="meta"><span><b>Week 6</b> · Day ' + lesson.day + (lesson.day === 5 ? ' · milestone' : '') + '</span><span>' + esc(lesson.phase) + '</span>' +
      '<span class="core30-meta" title="Required reading time is calculated at 150 words per minute. Essential diagram dwell, the required practices, and the six-question check are included in the Core 30 estimate."><b>Core 30</b> · ~' + pacing.readMinutes + ' min read · ' + pacing.interactions + ' interaction' + (pacing.interactions === 1 ? '' : 's') + ' · 6-Q check · ~' + pacing.requiredMinutes + ' min required</span></div>' +
      '<p class="summary">' + esc(lesson.summary) + '</p>' + projectHtml(lesson) + '<div class="ix-legend"></div></div></header>' +
      '<div class="reading2col"><nav class="toc" aria-label="On this page"></nav>' +
      '<article class="reading-col">' + sections + optionalHtml(lesson) +
      '<section class="reading-sources" data-core="optional" aria-label="Sources and evidence"><h2>Sources &amp; evidence trail</h2><p>Optional reference material outside the required daily path. Research records carry retrieval dates and source-custody notes.</p><ul>' + sourceList + '</ul></section></article>' +
      '<aside class="side kafka-side"><div class="side-cards"><button class="activity-card" type="button" data-modal="trainer-demo-modal"><div class="ac-k">Trainer demo cue</div><div class="ac-t">Facilitate the static pipeline exercise</div><div class="ac-meta">local and simulated only</div></button>' +
      '<button class="activity-card accent" type="button" data-modal="quiz-modal"><div class="ac-k">Comprehension check</div><div class="ac-t"><span class="quiz-count">6</span> questions on event-pipeline decisions</div><div class="ac-meta">~5 min · practice</div></button></div>' +
      '<div class="side-nav"><a class="snav-btn" href="../../index.html#curriculum">◂ Curriculum hub</a><button class="snav-btn goals" type="button" data-modal="goals-modal">Daily goals</button><a class="snav-btn snav-next"></a></div></aside></div>';

    var overlays = doc.getElementById("lesson-overlays");
    overlays.innerHTML = '<div id="trainer-demo-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><h2>Trainer demonstration cue</h2><p>' + esc(lesson.demoNote) + '</p><p><b>Safety boundary:</b> static or local synthetic exercise only. No account, billing, IAM, credential, provisioning, deployment, publication, external message, paid model call, or real learner data.</p><p><b>Batch context:</b> <span data-batch-value>loading</span> · <b>Client:</b> <span data-client-name>loading</span></p></div></div>' +
      '<div id="quiz-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><section id="quiz"></section><div class="modal-next"></div></div></div>' +
      '<div id="goals-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><h2>Week 6 · Day ' + lesson.day + ' goals</h2><ul class="goals-list">' + lesson.goals.map(function (goal) { return '<li>' + esc(goal) + '</li>'; }).join("") + '</ul><div class="ma-k">Daily deliverable · Project 2 · Morrowfield Payment Control</div><ul class="deliv-list"><li>' + esc(lesson.deliverable) + '</li>' + (lesson.project ? '<li><a href="' + esc(lesson.project.adrHref) + '">Open ADR-P2-001: one team-primary cloud</a>. This team decision does not change any learner&rsquo;s AWS/GCP/Both reading view.</li>' : "") + '<li>Keep every exercise local or static and use synthetic data only. Do not provision, deploy, publish, merge, send externally, or use a paid provider.</li></ul></div></div>';

    lessonRoot.className = "lesson2 capstone-lesson kafka-lesson";
    var browserRoot = typeof window !== "undefined" ? window : globalThis;
    browserRoot.QUIZ = { id: dayId + "-check", title: "Check your understanding", questions: lesson.checks };
    browserRoot.FDE_NEXT = { label: nextLabel(lesson), href: next };
    mountInteraction(doc, lesson);
    var lib = activityLib();
    if (lib) lib.mount(doc);
    return true;
  }

  return { esc: esc, wordCount: wordCount, drillOrder: drillOrder, assessDrill: assessDrill, interactionHtml: interactionHtml, requiredWords: requiredWords, pacingFor: pacingFor, route: route, projectHtml: projectHtml, staticFallbackHtml: staticFallbackHtml, activityBlocks: activityBlocks, activityFallbacks: activityFallbacks, render: render };
});
