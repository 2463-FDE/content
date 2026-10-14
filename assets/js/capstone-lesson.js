/* capstone-lesson.js — shared renderer for the authoritative Week 9–10 transfer. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDECapstoneLesson = api;
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
    return wordCount(lesson.summary) + lesson.sections.reduce(function (sum, section) { return sum + wordCount(section[0]) + wordCount(section[1]); }, 0);
  }
  function pacingFor(lesson) {
    var words = requiredWords(lesson);
    var readMinutes = Math.round(words / 150);
    return { words: words, readMinutes: readMinutes, requiredMinutes: readMinutes + 3 + 6 + 5 };
  }
  function route(id) {
    var match = /^w(\d\d)d(\d)$/.exec(id);
    if (!match) return "../../index.html";
    var week = Number(match[1]), day = Number(match[2]);
    if (day < 5) return "w" + match[1] + "d" + (day + 1) + ".html";
    if (week === 9) return "../w10/w10d1.html";
    return "../../index.html";
  }
  function nextLabel(lesson) {
    if (lesson.day < 5) return "Next: Day " + (lesson.day + 1) + " ▸";
    if (lesson.week === 9) return "Next: Week 10 ▸";
    return "Back to curriculum hub ▸";
  }
  function diagramLabel(text) {
    var words = String(text).split(/\s+/), lines = [""];
    words.forEach(function (word) {
      var line = lines[lines.length - 1];
      if (line && (line + " " + word).length > 21 && lines.length < 3) lines.push(word);
      else lines[lines.length - 1] = line ? line + " " + word : word;
    });
    return lines.join("\n");
  }
  function diagramFor(lesson) {
    var nodes = lesson.sections.map(function (section, index) {
      return { id: "n" + index, step: index, x: index % 2 ? 250 : 20, y: 18 + index * 68, w: 210, h: 54, label: diagramLabel(section[0]) };
    });
    var edges = nodes.slice(1).map(function (node, index) {
      return { id: "e" + index, step: index + 1, from: nodes[index].id, to: node.id, bend: index % 2 ? 10 : -10 };
    });
    return {
      title: "Decision path · W" + lesson.week + "D" + lesson.day,
      width: 480,
      height: 500,
      nodes: nodes,
      edges: edges,
      captions: lesson.sections.map(function (section) { return "<b>" + esc(section[0]) + "</b> — " + esc(section[1].split(". ")[0]) + "."; })
    };
  }
  function interactionHtml(lesson, id) {
    return '<div class="capstone-drill" data-capstone-drill>' +
      '<div class="ix-k">Practice · decision drill</div>' +
      '<fieldset><legend>' + esc(lesson.drill.prompt) + '</legend>' +
      lesson.drill.options.map(function (option, index) {
        return '<label><input type="radio" name="' + esc(id) + '-decision" value="' + index + '"> <span>' + esc(option) + '</span></label>';
      }).join("") + '</fieldset>' +
      '<div class="capstone-drill-actions"><button class="ix-btn" type="button" data-drill-check>Check decision</button><button class="ix-btn secondary" type="button" data-drill-reset>Reset</button></div>' +
      '<p class="capstone-drill-status" role="status" aria-live="polite"></p></div>';
  }
  function mountInteraction(doc, lesson) {
    var host = doc.querySelector("[data-capstone-drill]");
    if (!host) return;
    var check = host.querySelector("[data-drill-check]");
    var reset = host.querySelector("[data-drill-reset]");
    var status = host.querySelector(".capstone-drill-status");
    check.addEventListener("click", function () {
      var selected = host.querySelector("input:checked");
      if (!selected) { status.textContent = "Choose one response before checking."; return; }
      var correct = Number(selected.value) === lesson.drill.answer;
      status.textContent = (correct ? "Defensible decision. " : "Reconsider the enforcement boundary. ") + lesson.drill.feedback;
      status.classList.toggle("is-correct", correct);
      host.querySelectorAll("input").forEach(function (input) { input.disabled = true; });
      check.disabled = true;
    });
    reset.addEventListener("click", function () {
      host.querySelectorAll("input").forEach(function (input) { input.checked = false; input.disabled = false; });
      status.textContent = "";
      status.classList.remove("is-correct");
      check.disabled = false;
      host.querySelector("input").focus();
    });
  }
  function setMeta(doc, name, content) {
    var meta = doc.querySelector('meta[name="' + name + '"]');
    if (!meta) { meta = doc.createElement("meta"); meta.name = name; doc.head.appendChild(meta); }
    meta.content = content;
  }
  function render(doc) {
    var id = doc.body && doc.body.getAttribute("data-lesson");
    var lessons = (typeof globalThis !== "undefined" && globalThis.FDE_CAPSTONE_LESSONS) || {};
    var lesson = lessons[id];
    var root = doc.getElementById("lesson-root");
    if (!root) return false;
    if (!lesson) {
      root.innerHTML = '<section class="lesson-load-error" role="alert"><h1>Lesson unavailable</h1><p>This route has no transferred curriculum record. Return to the curriculum hub and notify the trainer.</p><a class="btn" href="../../index.html">Back to hub</a></section>';
      return false;
    }

    var pacing = pacingFor(lesson);
    var readMinutes = pacing.readMinutes;
    var requiredMinutes = pacing.requiredMinutes;
    var dayId = "w" + String(lesson.week).padStart(2, "0") + "d" + lesson.day;
    var next = route(dayId);
    doc.title = "W" + lesson.week + "·D" + lesson.day + " — " + lesson.title + " | 2463-FDE";
    setMeta(doc, "fde-day", dayId);
    setMeta(doc, "fde-concepts", lesson.concepts.join(","));

    var sections = lesson.sections.map(function (section, index) {
      var practice = index === 3 ? interactionHtml(lesson, dayId) : "";
      return '<section class="step" data-diagram="0" data-step="' + index + '"><div class="tag">' + (index + 1) + ' · Required</div><h2>' + esc(section[0]) + '</h2><p>' + esc(section[1]) + '</p>' + practice + '</section>';
    }).join("");
    var sourceList = lesson.sources.map(function (source) {
      return '<li><a href="' + esc(source.href) + '">' + esc(source.label) + '</a></li>';
    }).join("");

    root.innerHTML = '<div class="reading2col"><nav class="toc" aria-label="On this page"></nav>' +
      '<article class="reading-col"><div class="lede"><div class="capstone-kicker">Authoritative transfer · Week ' + lesson.week + ' · Day ' + lesson.day + '</div><h1>' + esc(lesson.title) + '</h1>' +
      '<div class="meta"><span><b>Week ' + lesson.week + '</b> · Day ' + lesson.day + '</span><span>' + esc(lesson.phase) + '</span>' +
      '<span class="core30-meta" title="Required reading time is calculated at 150 words per minute. Diagram, one practice, and six-question check are included in the Core 30 estimate."><b>Core 30</b> · ~' + readMinutes + ' min read · 1 interaction · 6-Q check · ~' + requiredMinutes + ' min required</span></div>' +
      '<p class="summary">' + esc(lesson.summary) + '</p><div class="ix-legend"></div></div>' + sections +
      '<details class="deep capstone-optional" data-core="optional"><summary>' + esc(lesson.optional[0]) + ' · outside Core 30</summary><p>' + esc(lesson.optional[1]) + '</p></details>' +
      '<section class="reading-sources" data-core="optional" aria-label="Sources and evidence"><h2>Sources &amp; evidence trail</h2><p>Optional reference material outside the required daily path.</p><ul>' + sourceList + '</ul></section></article>' +
      '<aside class="side"><div class="side-diagram"><div class="stage-title">Decision path</div><svg id="diagram" role="img" aria-label="Seven-step decision path for this lesson"></svg><div class="stage-caption"></div></div>' +
      '<div class="side-cards"><button class="activity-card" type="button" data-modal="trainer-demo-modal"><div class="ac-k">Trainer demo cue</div><div class="ac-t">Run this page in the room</div><div class="ac-meta">facilitation notes</div></button>' +
      '<button class="activity-card accent" type="button" data-modal="quiz-modal"><div class="ac-k">Comprehension check</div><div class="ac-t"><span class="quiz-count">6</span> questions on today’s decisions</div><div class="ac-meta">~5 min · practice</div></button></div>' +
      '<div class="side-nav"><a class="snav-btn" href="../../index.html#curriculum">◂ Curriculum hub</a><button class="snav-btn goals" type="button" data-modal="goals-modal">Daily goals</button><a class="snav-btn snav-next"></a></div></aside></div>';

    var overlays = doc.getElementById("lesson-overlays");
    overlays.innerHTML = '<div id="trainer-demo-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">✕</button><h2>Trainer demonstration cue</h2><p>' + esc(lesson.demoNote) + '</p><p><b>Batch context:</b> <span data-batch-value>loading</span> · <b>Client:</b> <span data-client-name>loading</span></p></div></div>' +
      '<div id="quiz-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">✕</button><section id="quiz"></section><div class="modal-next"></div></div></div>' +
      '<div id="goals-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">✕</button><h2>Week ' + lesson.week + ' · Day ' + lesson.day + ' goals</h2><ul class="goals-list"><li>Explain the seven decisions in today’s path.</li><li>Complete the decision drill and defend the enforcement or delivery boundary.</li><li>Produce the day’s artifact using evidence from the inherited system.</li></ul><div class="ma-k">Daily deliverable</div><p>Commit one reviewable decision artifact and its evidence to the approved project repository. Do not deploy, provision infrastructure, publish, merge, or send externally as part of this lesson.</p></div></div>';

    root.className = "lesson2 capstone-lesson";
    window.DIAGRAM = diagramFor(lesson);
    window.QUIZ = { id: dayId + "-check", title: "Check your understanding", questions: lesson.checks };
    window.FDE_NEXT = { label: nextLabel(lesson), href: next };
    mountInteraction(doc, lesson);
    return true;
  }

  return { esc: esc, wordCount: wordCount, requiredWords: requiredWords, pacingFor: pacingFor, diagramFor: diagramFor, render: render };
});
