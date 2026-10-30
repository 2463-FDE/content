/* capstone-lesson.js — shared Core-30 renderer for authoritative Weeks 9–10. */
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
  function providerRecord(lesson, selection) {
    return lesson.cloud && (selection === "aws" || selection === "gcp") ? lesson.cloud[selection] : null;
  }
  var SKIPPED_TAGS = { pre: 1, script: 1, button: 1, svg: 1 };
  var SKIPPED_CLASSES = ["reading-sources", "ix-future", "trifecta-auditor"];
  var VOID_TAGS = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1 };
  function attr(attrs, name) {
    var match = new RegExp("\\s" + name + '(?:="([^"]*)")?(?=[\\s/>]|$)').exec(attrs);
    return match ? (match[1] == null ? "" : match[1]) : null;
  }
  function skipsRequiredPath(tag, attrs, selection) {
    if (SKIPPED_TAGS[tag]) return true;
    var classes = (attr(attrs, "class") || "").split(/\s+/);
    if (SKIPPED_CLASSES.some(function (name) { return classes.indexOf(name) !== -1; })) return true;
    if (attr(attrs, "data-core") === "optional" || attr(attrs, "data-core-interaction") !== null) return true;
    var cloud = attr(attrs, "data-cloud");
    return !!(selection && cloud && cloud !== selection);
  }
  function requiredPathWords(html, selection) {
    var stack = [], texts = [], token, pattern = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
    while ((token = pattern.exec(html))) {
      var skipping = stack.length && stack[stack.length - 1].skip;
      if (token[4] != null) { if (!skipping) texts.push(token[4]); continue; }
      var tag = token[2].toLowerCase();
      if (token[1]) {
        for (var i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      } else if (!VOID_TAGS[tag] && !/\/\s*$/.test(token[3])) {
        stack.push({ tag: tag, skip: skipping || skipsRequiredPath(tag, token[3], selection) });
      }
    }
    return texts.join(" ").split(/\s+/).filter(Boolean).length;
  }
  function requiredWords(lesson, selection) {
    return requiredPathWords(articleHtml(lesson, function () { return { readMinutes: 0, requiredMinutes: 0 }; }), selection);
  }
  function pacingFor(lesson, selection) {
    var words = requiredWords(lesson, selection);
    var readMinutes = Math.round(words / 150);
    var interactions = lesson.cloud && (selection === "aws" || selection === "gcp") ? 2 : 1;
    var allowances = { diagram: 3, interaction: interactions === 2 ? 8 : 6, check: 5 };
    return { words: words, readMinutes: readMinutes, interactions: interactions, allowances: allowances, requiredMinutes: readMinutes + allowances.diagram + allowances.interaction + allowances.check };
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
    return lesson.week === 9 ? "Next: Week 10 ▸" : "Back to curriculum hub ▸";
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
    return {
      title: "Decision and evidence path · W" + lesson.week + "D" + lesson.day,
      width: 480,
      height: 500,
      nodes: nodes,
      edges: nodes.slice(1).map(function (node, index) { return { id: "e" + index, step: index + 1, from: nodes[index].id, to: node.id, bend: index % 2 ? 10 : -10 }; }),
      captions: lesson.sections.map(function (section) { return "<b>" + esc(section[0]) + "</b> — " + esc(section[1].split(". ")[0]) + "."; })
    };
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
    return { correct: correct, message: (correct ? "Defensible decision. " : "Reconsider the enforcement boundary. ") + lesson.drill.feedback };
  }
  function interactionHtml(lesson, id, order) {
    var sequence = order || lesson.drill.options.map(function (_, index) { return index; });
    var evidence = lesson.teamEvidence;
    return '<div class="capstone-drill" data-capstone-drill data-core-interaction>' +
      '<div class="ix-k">Required practice · decision and evidence gate</div>' +
      '<fieldset><legend>' + esc(lesson.drill.prompt) + '</legend>' +
      sequence.map(function (index) { return '<label><input type="radio" name="' + esc(id) + '-decision" value="' + index + '"> <span>' + esc(lesson.drill.options[index]) + '</span></label>'; }).join("") +
      '</fieldset><div class="capstone-drill-actions"><button class="ix-btn" type="button" data-drill-check>Check decision</button><button class="ix-btn secondary" type="button" data-drill-reset>Reset</button></div>' +
      '<p class="capstone-drill-status" role="status" aria-live="polite"></p>' +
      (evidence ? '<fieldset class="evidence-gate"><legend>Evidence receipt · ' + esc(evidence.artifact) + '</legend>' +
        '<label><input type="checkbox" data-evidence-item> Owning role recorded: ' + esc(evidence.owner) + '</label>' +
        '<label><input type="checkbox" data-evidence-item> Acceptance rule linked to the artifact</label>' +
        '<label><input type="checkbox" data-evidence-item> Independent review or replay result linked</label>' +
        '<button class="ix-btn secondary" type="button" data-evidence-issue>Issue local receipt</button><output class="evidence-receipt" data-evidence-receipt aria-live="polite"></output></fieldset>' : '') + '</div>';
  }
  function staticInteractionHtml(lesson) {
    return '<div class="capstone-drill" data-core-interaction><div class="ix-k">Required practice · decision and evidence gate</div><p>' + esc(lesson.drill.prompt) + '</p><ol>' +
      lesson.drill.options.map(function (option) { return '<li>' + esc(option) + '</li>'; }).join("") + '</ol><details><summary>Defensible response and evidence receipt</summary><p><b>Answer:</b> ' + esc(lesson.drill.options[lesson.drill.answer]) + '</p><p>' + esc(lesson.drill.feedback) + '</p>' +
      (lesson.teamEvidence ? '<p><b>' + esc(lesson.teamEvidence.artifact) + ':</b> record ' + esc(lesson.teamEvidence.owner) + ', the acceptance rule, and the independent review result.</p>' : '') + '</details></div>';
  }
  function mountInteraction(doc, lesson) {
    var host = doc.querySelector("[data-capstone-drill]");
    if (!host) return;
    var check = host.querySelector("[data-drill-check]");
    var reset = host.querySelector("[data-drill-reset]");
    var status = host.querySelector(".capstone-drill-status");
    var issue = host.querySelector("[data-evidence-issue]");
    var receipt = host.querySelector("[data-evidence-receipt]");
    check.addEventListener("click", function () {
      var selected = host.querySelector('input[type="radio"]:checked');
      if (!selected) { status.textContent = "Choose one response before checking."; return; }
      var result = assessDrill(lesson, selected.value);
      host.setAttribute("data-decision-correct", result.correct ? "true" : "false");
      status.textContent = result.message;
      status.classList.toggle("is-correct", result.correct);
    });
    if (issue && receipt) issue.addEventListener("click", function () {
      var items = Array.prototype.slice.call(host.querySelectorAll("[data-evidence-item]"));
      if (host.getAttribute("data-decision-correct") !== "true") { receipt.textContent = "Pass the decision check before issuing evidence."; return; }
      if (!items.every(function (item) { return item.checked; })) { receipt.textContent = "Confirm owner, acceptance, and independent review evidence first."; return; }
      receipt.textContent = lesson.teamEvidence.artifact + " ready · " + lesson.teamEvidence.owner + " · acceptance and review linked · local synthetic exercise only.";
    });
    reset.addEventListener("click", function () {
      Array.prototype.forEach.call(host.querySelectorAll("input"), function (input) { input.checked = false; input.disabled = false; });
      host.removeAttribute("data-decision-correct");
      status.textContent = ""; status.classList.remove("is-correct");
      if (receipt) receipt.textContent = "";
      var first = host.querySelector('input[type="radio"]'); if (first) first.focus();
    });
  }
  function setMeta(doc, name, content) {
    var meta = doc.querySelector('meta[name="' + name + '"]');
    if (!meta) { meta = doc.createElement("meta"); meta.name = name; doc.head.appendChild(meta); }
    meta.content = content;
  }
  function teamEvidenceHtml(lesson, options) {
    var item = lesson.teamEvidence;
    if (!item) return "";
    if (options && options.summary) return '<section class="team-evidence" aria-label="Team delivery evidence · ' + esc(item.artifact) + '"><div class="tag">Team delivery evidence</div><h3>' + esc(item.artifact) + '</h3><dl><div><dt>Accountable role</dt><dd>' + esc(item.owner) + '</dd></div><div><dt>Acceptance rule</dt><dd>' + esc(item.acceptance) + '</dd></div><div><dt>Independent proof</dt><dd>' + esc(item.review) + '</dd></div></dl></section>';
    var step = options && options.step != null ? ' data-diagram="0" data-step="' + options.step + '"' : "";
    return '<section class="step team-evidence"' + step + ' aria-labelledby="team-evidence-title"><div class="tag">Team delivery evidence</div><h2 id="team-evidence-title">' + esc(item.artifact) + '</h2><dl><div><dt>Accountable role</dt><dd>' + esc(item.owner) + '</dd></div><div><dt>Acceptance rule</dt><dd>' + esc(item.acceptance) + '</dd></div><div><dt>Independent proof</dt><dd>' + esc(item.review) + '</dd></div></dl><p class="team-cloud-note"><b>Two separate decisions:</b> your AWS/GCP/Both reading view is personal. The team’s single Week 6 primary-cloud ADR controls shared implementation evidence.</p></section>';
  }
  function cloudBlockHtml(selection, record) {
    var options = record[3];
    return '<details class="cloud-block" data-cloud="' + selection + '" open><summary><span class="cloud-tag">' + selection.toUpperCase() + '</span>' + esc(record[0]) + '<span class="cloud-role"></span></summary><p>' + esc(record[1]) + '</p>' +
      '<div class="ix-cloud" data-core-interaction data-cloud="' + selection + '"><div class="ix-k">Required provider decision</div><p class="ix-cloud-q">' + esc(record[2]) + '</p><ol class="ix-cloud-options">' +
      options.map(function (option, index) { return '<li' + (index === record[4] ? ' data-correct' : '') + ' data-why="' + esc(index === record[4] ? record[5] : "This does not enforce the documented boundary.") + '">' + esc(option) + '</li>'; }).join("") +
      '</ol><details class="ix-cloud-answer"><summary>Show the answer</summary><p><b>' + esc(options[record[4]]) + '</b> ' + esc(record[5]) + '</p></details></div></details>';
  }
  function cloudHtml(lesson) {
    if (!lesson.cloud) return "";
    return '<section class="provider-paths" aria-labelledby="provider-path-title"><h2 id="provider-path-title">Apply today’s decision on your selected cloud</h2><p>The selected path is primary reading; the other block is comparison depth. Both remains available beyond the one-provider Core 30.</p>' + cloudBlockHtml("aws", lesson.cloud.aws) + cloudBlockHtml("gcp", lesson.cloud.gcp) + '</section>';
  }
  function coreLabelsHtml(lesson, pacing) {
    pacing = pacing || pacingFor;
    if (!lesson.cloud) {
      var p = pacing(lesson);
      return '<span class="core30-meta"><b>Core 30</b> · ~' + p.readMinutes + ' min read · 1 interaction · 6-Q check · ~' + p.requiredMinutes + ' min required</span>';
    }
    return ["aws", "gcp"].map(function (selection) {
      var p = pacing(lesson, selection);
      return '<span class="core30-meta" data-cloud="' + selection + '"><b>Core 30</b> · ' + selection.toUpperCase() + ' · ~' + p.readMinutes + ' min read · 2 interactions · 6-Q check · ~' + p.requiredMinutes + ' min required</span>';
    }).join("");
  }
  function optionalHtml(lesson) {
    return '<details class="deep capstone-optional" data-core="optional"><summary>' + esc(lesson.optional[0]) + ' · outside Core 30</summary><p>' + esc(lesson.optional[1]) + '</p></details>';
  }
  function sourcesFor(lesson) {
    var sources = lesson.sources.slice();
    if (lesson.cloud && lesson.cloud.sources) sources = sources.concat(lesson.cloud.sources);
    return sources;
  }
  function sourcesHtml(lesson) {
    return '<section class="reading-sources" data-core="optional" aria-label="Sources and evidence"><h2>Sources &amp; evidence trail</h2><p>Optional references outside the required path. Provider facts are dated; public prices are not client quotes.</p><ul>' + sourcesFor(lesson).map(function (source) {
      var external = /^https?:/.test(source.href) ? ' target="_blank" rel="noopener"' : "";
      return '<li><a href="' + esc(source.href) + '"' + external + '>' + esc(source.label) + '</a></li>';
    }).join("") + '</ul></section>';
  }
  function diagramAlternativeHtml(lesson) {
    return '<details class="diagram-alternative"><summary>Decision diagram · text alternative</summary><ol>' + lesson.sections.map(function (section) { return '<li><b>' + esc(section[0]) + ':</b> ' + esc(section[1].split(". ")[0]) + '.</li>'; }).join("") + '</ol></details>';
  }
  function checkHtml(lesson) {
    return '<section class="static-check" aria-labelledby="static-check-title"><h2 id="static-check-title">Comprehension check</h2>' + lesson.checks.map(function (question, index) {
      return '<details><summary>' + (index + 1) + '. ' + esc(question.stem) + '</summary><p><b>Answer:</b> ' + esc(question.options[question.answer]) + '</p><p>' + esc(question.explain) + '</p></details>';
    }).join("") + '</section>';
  }
  function staticArticleHtml(lesson) {
    return articleHtml(lesson, pacingFor);
  }
  function articleHtml(lesson, pacing) {
    var dayId = "w" + String(lesson.week).padStart(2, "0") + "d" + lesson.day;
    var sections = lesson.sections.map(function (section, index) {
      return '<section><h2>' + esc(section[0]) + '</h2><p>' + esc(section[1]) + '</p>' + (index === 3 ? staticInteractionHtml(lesson) : "") + '</section>';
    }).join("");
    return '<article class="reading-col"><header class="lede"><h1>' + esc(lesson.title) + '</h1><div class="meta"><span><b>Week ' + lesson.week + '</b> · Day ' + lesson.day + '</span>' + coreLabelsHtml(lesson, pacing) + '</div><p class="summary">' + esc(lesson.summary) + '</p></header>' +
      '<section aria-labelledby="static-diagram-' + dayId + '"><h2 id="static-diagram-' + dayId + '">Decision and evidence path · text alternative</h2><p>Follow the seven required decisions in order. Each arrow advances from client consequence and evidence to an owned control, verification result, residual risk, and handoff.</p>' + diagramAlternativeHtml(lesson) + '</section>' +
      sections + teamEvidenceHtml(lesson) + cloudHtml(lesson) + optionalHtml(lesson) + checkHtml(lesson) + sourcesHtml(lesson) + '<p><a href="../../index.html#curriculum">Return to the curriculum hub</a></p></article>';
  }
  function render(doc, options) {
    var id = doc.body && doc.body.getAttribute("data-lesson");
    var lessons = (typeof globalThis !== "undefined" && globalThis.FDE_CAPSTONE_LESSONS) || {};
    var lesson = lessons[id];
    var root = doc.getElementById("lesson-root");
    if (!root) return false;
    if (!lesson) {
      root.innerHTML = '<section class="lesson-load-error" role="alert"><h1>Lesson unavailable</h1><p>This route has no transferred curriculum record. Return to the curriculum hub and notify the trainer.</p><a class="btn" href="../../index.html">Back to hub</a></section>';
      return false;
    }
    var dayId = "w" + String(lesson.week).padStart(2, "0") + "d" + lesson.day;
    var order = drillOrder(lesson.drill.options.length, options && options.random);
    doc.title = "W" + lesson.week + "·D" + lesson.day + " — " + lesson.title + " | 2463-FDE";
    setMeta(doc, "fde-day", dayId); setMeta(doc, "fde-concepts", lesson.concepts.join(","));
    var sections = lesson.sections.map(function (section, index) {
      return '<section class="step" data-diagram="0" data-step="' + index + '"><div class="tag">Required decision ' + (index + 1) + '</div><h2>' + esc(section[0]) + '</h2><p>' + esc(section[1]) + '</p>' + (index === 3 ? interactionHtml(lesson, dayId, order) : "") + '</section>';
    }).join("");
    root.innerHTML = '<div class="reading2col"><nav class="toc" aria-label="On this page"></nav><article class="reading-col"><div class="lede"><h1>' + esc(lesson.title) + '</h1><div class="meta"><span><b>Week ' + lesson.week + '</b> · Day ' + lesson.day + '</span><span>' + esc(lesson.phase) + '</span>' + coreLabelsHtml(lesson) + '</div><p class="summary">' + esc(lesson.summary) + '</p><div class="ix-legend"></div></div>' +
      '<section class="capstone-context" aria-label="Project context"><b>Inherited team brownfield:</b> synthetic banking/payments evidence only. No client, learner, account, or provider fact is inferred.</section>' + sections + teamEvidenceHtml(lesson, { step: lesson.sections.length - 1 }) + cloudHtml(lesson) + diagramAlternativeHtml(lesson) + optionalHtml(lesson) + sourcesHtml(lesson) + '</article>' +
      '<aside class="side"><div class="side-diagram"><div class="stage-title">Decision and evidence path</div><svg id="diagram" role="img" aria-label="Seven-step decision and evidence path"></svg><div class="stage-caption"></div></div><div class="side-cards"><button class="activity-card" type="button" data-modal="trainer-demo-modal"><div class="ac-k">Trainer cue</div><div class="ac-t">Facilitate the evidence gate</div><div class="ac-meta">synthetic · local · review-only</div></button><button class="activity-card accent" type="button" data-modal="quiz-modal"><div class="ac-k">Comprehension check</div><div class="ac-t"><span class="quiz-count">6</span> questions</div><div class="ac-meta">~5 min · practice</div></button></div><div class="side-nav"><a class="snav-btn" href="../../index.html#curriculum">◂ Curriculum hub</a><button class="snav-btn goals" type="button" data-modal="goals-modal">Daily evidence</button><a class="snav-btn snav-next"></a></div></aside></div>';
    var overlays = doc.getElementById("lesson-overlays");
    overlays.innerHTML = '<div id="trainer-demo-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><h2>Trainer facilitation cue</h2><p>' + esc(lesson.demoNote) + '</p><p><b>Safety boundary:</b> local/static synthetic evidence only. No account, credential, IAM, billing, provider call, deployment, publication, merge, real communication, or learner/client data.</p><p><b>Batch:</b> <span data-batch-value>loading</span> · <b>Client:</b> <span data-client-name>loading</span></p></div></div><div id="quiz-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><section id="quiz"></section><div class="modal-next"></div></div></div><div id="goals-modal" class="modal-overlay" hidden><div class="modal-card"><button class="modal-close" type="button" aria-label="Close">Close</button><h2>Daily evidence contract</h2>' + teamEvidenceHtml(lesson, { summary: true }) + '<p>Commit only to the approved project repository. Do not deploy, provision, publish, merge, or send externally as part of this lesson.</p></div></div>';
    root.className = "lesson2 capstone-lesson week-" + lesson.week;
    var browserRoot = typeof window !== "undefined" ? window : globalThis;
    browserRoot.DIAGRAM = diagramFor(lesson);
    browserRoot.QUIZ = { id: dayId + "-check", title: "Check your understanding", questions: lesson.checks };
    browserRoot.FDE_NEXT = { label: nextLabel(lesson), href: route(dayId) };
    mountInteraction(doc, lesson);
    return true;
  }
  return { esc: esc, wordCount: wordCount, drillOrder: drillOrder, assessDrill: assessDrill, interactionHtml: interactionHtml, staticInteractionHtml: staticInteractionHtml, requiredWords: requiredWords, requiredPathWords: requiredPathWords, pacingFor: pacingFor, teamEvidenceHtml: teamEvidenceHtml, diagramFor: diagramFor, staticArticleHtml: staticArticleHtml, render: render };
});
