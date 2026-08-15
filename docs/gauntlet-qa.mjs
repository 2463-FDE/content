// Browser QA for the FDE Interview Gauntlet (gauntlet.html + assets/gauntlet/*).
// Dev-only, like docs/reading-assistant-qa.mjs: it serves this worktree, stubs
// every Cloudflare Worker route, and drives the REAL pages.
//
// What it proves after the learner-leaderboard removal:
//   1. the retained interview flow still works end to end — start -> typed
//      answer -> judge -> finish -> results -> printable report;
//   2. the retained system-design flow still works end to end — scenarios ->
//      start -> clarify -> explain -> submit -> adaptability round -> finalize
//      -> results -> history -> report;
//   3. no runtime path issues GET /leaderboard or GET /design/leaderboard. Every
//      request the pages make is captured off the network, so this is a runtime
//      assertion, not a grep over the source;
//   4. the dark-mode amber accent text (.len-nudge / .not-saved-banner) still
//      computes to amber, not the indigo of the rule that follows it.
//
// The Worker is entirely stubbed, so the access code below is a dummy marker and
// never a real credential.
//
// Needs Playwright, locally (npm i -D playwright) or globally (npm i -g playwright).
// Run:  node docs/gauntlet-qa.mjs
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// This repo has no package.json, so fall back to the global install.
const { chromium } = await import("playwright").catch(async () => {
  const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
  return import(pathToFileURL(join(globalRoot, "playwright", "index.js")).href);
});

const ACCESS_CODE = "qa-placeholder-code";
const ROOT = fileURLToPath(new URL("..", import.meta.url));

let fail = 0;
const ok = (n, c, extra) => {
  console.log((c ? "  ok   " : "  FAIL ") + n + (c || !extra ? "" : "\n        " + extra));
  if (!c) fail++;
};

// ---- static server for the worktree -----------------------------------------
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon"
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const rel = normalize(path).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  try {
    const buf = await readFile(join(ROOT, rel));
    res.writeHead(200, { "content-type": TYPES[extname(rel)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/gauntlet.html`;

// ---- the Worker, stubbed ------------------------------------------------------
const workerCalls = [];   // "METHOD /path" for every backend call the app makes
const allRequests = [];   // every request either page issues, any origin

const IV_QUESTIONS = [
  { id: "q1", prompt: "Tell me about a time you scoped a vague client ask.", type: "behavioral", topic: "scoping" },
  { id: "q2", prompt: "How would you explain retrieval-augmented generation to a non-technical stakeholder?", type: "technical", topic: "rag" }
];
const FOLLOWUPS = [
  { question: "Traffic just went 10x. What breaks first and what do you change?" },
  { question: "The client now needs per-tenant data isolation. Rework it." }
];
const DESIGN_REPORT = {
  name: "QA Learner", tier: "associate", track: "fullstack",
  scenarioTitle: "Multi-tenant rate limiter", date: "2026-08-14",
  overall: 84, dims: { completeness: 82, design_quality: 86, scoping: 80, deliverability: 88, adaptability: 84 },
  summary: "Scoped before drawing and defended the token-bucket choice.",
  topStrengths: ["Asked for the traffic shape first"],
  focusAreas: ["Name the failure mode when Redis is down"],
  questionsYouShouldHaveAsked: ["What is the burst tolerance?"],
  actionableItems: ["Draw the degraded path next time"],
  elapsedMin: 18, timePenalty: 0,
  followups: FOLLOWUPS.map((f) => ({ question: f.question, transcript: "Reworked answer for QA." })),
  explanation: "I used a token bucket in Redis fronted by the edge worker.",
  clarify: [{ role: "learner", text: "What is the expected request volume?" }, { role: "client", text: "About 4k requests a second at peak." }]
};

const stubWorker = (context) =>
  context.route("**/fde-backend.jestercharles.workers.dev/**", (route) => {
    const url = new URL(route.request().url());
    workerCalls.push(route.request().method() + " " + url.pathname);
    const send = (obj) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(obj) });
    const p = url.pathname;

    if (p === "/session") {
      return send({
        ok: true, name: "QA Learner", tier: "associate", practice: false,
        attemptsUsed: 0, maxPerDay: 3, attemptsRemaining: 3, weeklyInterviewDone: false
      });
    }
    if (p === "/interview/start") return send({ ok: true, interviewId: "iv-qa-1", questions: IV_QUESTIONS });
    if (p === "/judge") {
      const q = route.request().postDataJSON() || {};
      return send({
        ok: true, score: 78, delivery: "Steady pace, few fillers.",
        strengths: ["Concrete example"], improvements: ["Land the outcome sooner"], questionId: q.questionId
      });
    }
    if (p === "/interview/finish") {
      return send({
        ok: true, interviewScore: 81, personalBestToday: true,
        overall: {
          summary: "Strong scoping instincts; tighten the close.",
          topStrengths: ["Led with the client's problem"],
          focusAreas: ["Quantify the impact"],
          softSkills: "Clear delivery, minimal filler."
        },
        perQuestion: IV_QUESTIONS.map((q, i) => ({
          questionId: q.id, idx: i, prompt: q.prompt, type: q.type, topic: q.topic,
          score: 78 + i, strengths: ["Concrete example"], improvements: ["Land the outcome sooner"],
          delivery: "Steady pace, few fillers."
        }))
      });
    }

    if (p === "/design/scenarios") {
      return send({
        ok: true, completed: [],
        scenarios: [{
          id: "fs-rate-limiter", title: "Multi-tenant rate limiter", tier: "both",
          clientBrief: "We keep getting hammered by a few tenants. Fix it.",
          liveSystem: "Cloudflare rate limiting", sourceUrl: "https://example.invalid/rate-limiting"
        }]
      });
    }
    if (p === "/design/start") {
      return send({
        ok: true, sessionId: "sd-qa-1", deadlineAt: Date.now() + 20 * 60000,
        scenario: {
          id: "fs-rate-limiter", title: "Multi-tenant rate limiter",
          clientBrief: "We keep getting hammered by a few tenants. Fix it.", starterScene: null
        }
      });
    }
    if (p === "/design/clarify") return send({ ok: true, answer: "About 4k requests a second at peak." });
    if (p === "/design/snapshot") return send({ ok: true });
    if (p === "/design/submit") return send({ ok: true, followups: FOLLOWUPS });
    if (p === "/design/followup") {
      return send({
        ok: true, finalScore: 84, personalBestToday: true, dims: DESIGN_REPORT.dims,
        adaptability: 84, adaptabilityNote: "Reworked the isolation story without losing composure.",
        elapsedMin: 18, timePenalty: 0, timeTarget: 20,
        summary: DESIGN_REPORT.summary, topStrengths: DESIGN_REPORT.topStrengths,
        focusAreas: DESIGN_REPORT.focusAreas,
        questionsYouShouldHaveAsked: DESIGN_REPORT.questionsYouShouldHaveAsked,
        actionableItems: DESIGN_REPORT.actionableItems
      });
    }
    if (p === "/design/history") {
      return send({ ok: true, sessions: [{ id: "sd-qa-1", overall: 84, scenarioTitle: "Multi-tenant rate limiter", date: "2026-08-14", track: "fullstack" }] });
    }
    if (p === "/design/report") return send({ ok: true, report: DESIGN_REPORT });

    return send({ ok: true });
  });

const browser = await chromium.launch();

async function newLearnerContext() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.on("request", (r) => allRequests.push(r.method() + " " + r.url()));
  await context.addInitScript((code) => {
    try { localStorage.setItem("fde_identity", JSON.stringify({ code, name: "QA Learner", role: "learner" })); } catch (e) { /* opaque origin */ }
    // Force the typed paths deterministically: headless has no usable mic, and
    // the spoken paths are not what this regression is about.
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    // The report tabs call print() right after document.write; headless must not block.
    window.print = () => {};
  }, ACCESS_CODE);
  await stubWorker(context);
  // Excalidraw/React come from unpkg. Cut the CDN so the canvas takes its
  // documented fallback and the run needs no network.
  await context.route("**/unpkg.com/**", (route) => route.abort());
  return context;
}

const texts = (page, sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));
const bodyHas = (page, s) => page.evaluate((t) => document.body.innerText.includes(t), s);

// =============================================================================
// FLOW 1 — interview: start -> answer -> judge -> finish -> results -> report
// =============================================================================
console.log("interview flow");
{
  const context = await newLearnerContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sd-track-grid");

  const hubActions = await texts(page, ".mode-actions button");
  ok("hub has no leaderboard entry point", !hubActions.some((t) => /leaderboard/i.test(t)), hubActions.join(" | "));
  ok("hub keeps its retained controls", hubActions.length === 3 && hubActions.some((t) => /past designs/i.test(t)), hubActions.join(" | "));

  await page.click(".sd-track-card:has(.sd-track-title:text-is('AI Interview'))");
  await page.waitForSelector("#startBtn");

  const tabs = await texts(page, ".tabs .tab");
  ok("lobby tabs are Modes + Lobby only", tabs.length === 2 && !tabs.some((t) => /leaderboard/i.test(t)), tabs.join(" | "));

  await page.click("#startBtn");
  for (let i = 0; i < IV_QUESTIONS.length; i++) {
    await page.waitForSelector("#transcriptBox");
    ok(`question ${i + 1} prompt rendered`, await bodyHas(page, IV_QUESTIONS[i].prompt));
    await page.fill("#transcriptBox", `Answer number ${i + 1}. I scoped the ask with the client first, agreed the success metric, then shipped the smallest slice that proved it and iterated from real usage.`);
    await page.click("#submitBtn");
  }

  await page.waitForSelector(".results-title", { timeout: 15000 });
  ok("interview results screen renders", await bodyHas(page, "Interview complete"));
  ok("overall feedback rendered", await bodyHas(page, "Strong scoping instincts"));
  ok("per-question breakdown rendered", (await page.$$(".pq-card")).length === IV_QUESTIONS.length);
  ok("personal-best badge preserved", await bodyHas(page, "Personal best today"));
  ok("no rank surface on results", !(await bodyHas(page, "rank")) && (await page.$$(".rank-line")).length === 0);

  const resultActions = await texts(page, ".results-actions button");
  ok("results actions are Download + Lobby only",
    resultActions.length === 2 && !resultActions.some((t) => /leaderboard/i.test(t)), resultActions.join(" | "));

  // dark-mode amber accents (regression: the deleted .yesterday rule used to
  // terminate this selector group, so these fell through to the indigo rule)
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const amber = await page.evaluate(() => {
    const nudge = document.createElement("p");
    nudge.className = "len-nudge";
    document.body.appendChild(nudge);
    const read = (n) => getComputedStyle(n).color;
    const out = { nudge: read(nudge), banner: read(document.querySelector(".not-saved-banner")) };
    nudge.remove();
    return out;
  });
  ok("dark .len-nudge is amber", amber.nudge === "rgb(255, 208, 138)", amber.nudge);
  ok("dark .not-saved-banner is amber", amber.banner === "rgb(255, 208, 138)", amber.banner);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

  const [ivReport] = await Promise.all([
    page.waitForEvent("popup"),
    page.click(".results-actions button:has-text('Download PDF')")
  ]);
  await ivReport.waitForFunction(() => document.body && document.body.innerText.includes("Interview Feedback"), null, { timeout: 10000 });
  const ivReportText = await ivReport.evaluate(() => document.body.innerText);
  ok("printable interview report carries the score", ivReportText.includes("81 / 100"));
  ok("printable interview report carries the answers", ivReportText.includes("Answer number 1"));
  ok("printable interview report has no rank line", !/rank/i.test(ivReportText));
  await ivReport.close();

  ok("no page errors in the interview flow", errors.length === 0, errors.join("\n        "));
  await context.close();
}

// =============================================================================
// FLOW 2 — design: scenarios -> clarify -> explain -> submit -> follow-ups ->
//          finalize -> results -> history -> report
// =============================================================================
console.log("system-design flow");
{
  const context = await newLearnerContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept("I would shard the counters per tenant and degrade to local buckets.") : d.accept()));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sd-track-grid");

  await page.click(".sd-track-card:has(.sd-track-title:text-is('System Design Simulator'))");
  await page.click(".sd-modal .sd-track-card:has-text('Full-Stack System Design')");

  await page.waitForSelector(".sd-scenario-card");
  ok("scenario picker renders the brief", await bodyHas(page, "We keep getting hammered"));
  ok("scenario blurb drops the board copy", !(await bodyHas(page, "counts on the board")));

  await page.click(".sd-scenario-card button:has-text('Start')");
  await page.waitForSelector("#sdChatInput");
  ok("canvas takes its documented fallback with the CDN cut", (await page.$$(".sd-canvas-fallback")).length === 1);

  await page.fill("#sdChatInput", "What is the expected request volume?");
  await page.click(".sd-send");
  await page.waitForSelector(".sd-chat-turn--client:not(.is-thinking)");
  ok("clarify chat returns the client answer", await bodyHas(page, "4k requests a second"));

  await page.click("button:has-text('Done → Explain & submit')");
  await page.waitForSelector("textarea.transcript");
  await page.fill("textarea.transcript", "I used a token bucket in Redis fronted by the edge worker, because per-tenant fairness matters more than absolute precision, and the degraded path falls back to local buckets.");
  await page.click("button:has-text('Submit design for review')");

  await page.waitForSelector(".sd-followup-panel");
  ok("adaptability round renders both follow-ups", (await page.$$(".sd-fu-item")).length === FOLLOWUPS.length);
  for (let i = 0; i < FOLLOWUPS.length; i++) {
    await page.click(`.sd-fu-item:nth-child(${i + 3}) button`);
  }
  const fuStatuses = await texts(page, ".sd-fu-status");
  ok("follow-up answers are captured", fuStatuses.every((t) => /answered/.test(t) && !/^Not/.test(t)), fuStatuses.join(" | "));

  await page.click("button:has-text('Submit & reveal my feedback')");
  await page.waitForSelector(".sd-dims-panel");
  ok("design results screen renders", await bodyHas(page, "Design complete"));
  ok("all five dimensions render", (await page.$$(".sd-dims-panel .sd-dim")).length === 5);
  ok("two-critic feedback renders", await bodyHas(page, "defended the token-bucket choice"));
  ok("delivery-time note renders", await bodyHas(page, "18 min (target 20)"));

  const designActions = await texts(page, ".results-actions button");
  ok("design results actions drop Leaderboards",
    !designActions.some((t) => /leaderboard/i.test(t)) && designActions.length === 3, designActions.join(" | "));

  const [sdReport] = await Promise.all([
    page.waitForEvent("popup"),
    page.click(".results-actions button:has-text('Download PDF')")
  ]);
  await sdReport.waitForFunction(() => document.body && document.body.innerText.includes("Multi-tenant rate limiter"), null, { timeout: 10000 });
  ok("printable design report carries the score", (await sdReport.evaluate(() => document.body.innerText)).includes("84 / 100"));
  await sdReport.close();

  await page.click(".results-actions button:has-text('My past designs')");
  await page.waitForSelector(".sd-history-row");
  ok("history lists the finalized session", await bodyHas(page, "Multi-tenant rate limiter"));
  await page.click(".sd-history-row button:has-text('View report')");
  await page.waitForSelector(".board-title:text-is('Design report')");
  ok("history report screen renders the feedback", await bodyHas(page, "Draw the degraded path next time"));
  ok("history report screen renders the clarify log", await bodyHas(page, "4k requests a second"));

  ok("no page errors in the design flow", errors.length === 0, errors.join("\n        "));
  await context.close();
}

// =============================================================================
// The point of the change: the removed routes are never requested at runtime.
// =============================================================================
console.log("removed routes");
{
  const removed = allRequests.filter((r) => /\/(design\/)?leaderboard(\?|$)/.test(r) || /\/design\/session-view(\?|$)/.test(r));
  ok("no request to /leaderboard or /design/leaderboard", removed.length === 0, removed.join("\n        "));
  ok("no request to the peer-view route", !workerCalls.some((c) => c.endsWith("/design/session-view")), workerCalls.join(" | "));

  // Guard against a vacuous negative: the retained routes really were exercised.
  const expected = [
    "POST /session", "POST /interview/start", "POST /judge", "POST /interview/finish",
    "POST /design/scenarios", "POST /design/start", "POST /design/clarify",
    "POST /design/submit", "POST /design/followup", "POST /design/history", "POST /design/report"
  ];
  const missing = expected.filter((e) => !workerCalls.includes(e));
  ok("every retained backend route was exercised", missing.length === 0, "missing: " + missing.join(", "));
  ok("only GET-less backend traffic remains", workerCalls.every((c) => c.startsWith("POST ")), workerCalls.filter((c) => !c.startsWith("POST ")).join(" | "));
}

await browser.close();
server.close();
console.log(fail ? `\n${fail} check(s) failed` : "\nall checks passed");
process.exit(fail ? 1 : 0);
