#!/usr/bin/env node
/* Deterministically renders the ten W9–W10 route shells and no-JS articles. */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const lessons = require(path.join(ROOT, "assets/js/curriculum-lessons-w09-w10.js"));
const renderer = require(path.join(ROOT, "assets/js/capstone-lesson.js"));

function quizScript(id, lesson) {
  const json = JSON.stringify({ id: `${id}-check`, title: "Check your understanding", questions: lesson.checks })
    .replace(/</g, "\\u003c");
  return `<script>window.QUIZ=${json};</script>`;
}

function page(id, lesson) {
  const staticArticle = renderer.staticArticleHtml(lesson);
  const concepts = lesson.concepts.join(",");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="fde-day" content="${id}">
<meta name="fde-concepts" content="${concepts}">
<title>W${lesson.week}·D${lesson.day} — ${renderer.esc(lesson.title)} | 2463-FDE</title>
<link rel="stylesheet" href="../../assets/css/style.css?v=20261027-capstone">
<link rel="stylesheet" href="../../assets/css/cloud-path.css?v=20261014-c2">
<script src="../../assets/js/theme.js"></script>
</head>
<body data-lesson="${id}">
<div class="topbar">
  <div class="topbar-left"><span class="brand"><a href="../../index.html"><b>2463</b>·FDE</a></span><a class="topnav" href="../../index.html">Home</a></div>
  <nav class="topbar-center" aria-label="Program"><a class="topnav" href="../../atlas/">FDE Mindset Atlas</a><a class="topnav" href="../../client-delivery.html?w=${lesson.week}&amp;p=finance">Team delivery</a><a class="topnav" href="../../gauntlet.html">AI Interview</a></nav>
  <div class="topbar-right"><span class="progressbar" aria-hidden="true"><i></i></span></div>
</div>
<main id="lesson-root" class="lesson2"><section class="lesson-loading" role="status"><h1>${renderer.esc(lesson.title)}</h1><p>Loading the interactive route. The complete static lesson follows when JavaScript is unavailable.</p></section></main>
<noscript><style>#lesson-root{display:none}</style><main class="lesson2 nojs-lesson">${staticArticle}</main></noscript>
<footer class="foot">2463-FDE · Forward Deployed Engineer Program · Week ${lesson.week} Day ${lesson.day} · <span data-client-name>Client curriculum</span> · Batch <span data-batch-value>loading</span></footer>
<div id="lesson-overlays"></div>
${quizScript(id, lesson)}
<script src="../../assets/js/curriculum-lessons-w09-w10.js?v=20261027"></script>
<script src="../../assets/js/capstone-lesson.js?v=20261027"></script>
<script src="../../assets/js/progress.js?v=20260630"></script>
<script src="../../assets/js/day-summary.js?v=20260630-2"></script>
<script src="../../assets/js/auth.js?v=20261014"></script>
<script src="../../assets/js/diagram.js"></script>
<script src="../../assets/js/scrolly.js"></script>
<script src="../../assets/js/modals.js?v=20261014"></script>
<script src="../../assets/js/cloud-path.js?v=20261014-c2"></script>
<script src="../../assets/js/interactive-cloud.js?v=20261014-c2"></script>
<script src="../../assets/js/quiz.js?v=20260630-1"></script>
<script src="../../assets/js/learning-chrome.js?v=20261001-1"></script>
<script src="../../assets/js/reading-coach.js?v=20260630-1"></script>
</body>
</html>
`;
}

for (const [id, lesson] of Object.entries(lessons)) {
  const target = path.join(ROOT, "weeks", id.slice(0, 3), `${id}.html`);
  fs.writeFileSync(target, page(id, lesson));
}
