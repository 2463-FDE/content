// Browser QA for reading-coach.js. Serves the worktree, intercepts the Worker,
// and drives both paths: signed out (offline template) and signed in (chat +
// generated prompt). Screenshots land next to this file.
import { chromium } from "playwright";

const BASE = "http://localhost:8123/weeks/w05/w05d3.html";
const OUT = "/private/tmp/claude-501/-Users-jestercharles-2463-fde/5f02697d-a030-4ed2-af0f-5345ea6b390d/scratchpad/";
let fail = 0;
const ok = (n, c, extra) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c || !extra ? "" : "\n        " + extra)); if (!c) fail++; };

const GEN_PROMPT = "Read this repo's README and entry points first, then find where spec artifacts should live.\nProduce docs/adr/0001-<decision>.md.\nStop when the ADR names a decision, its alternatives and its consequences.\nAsk me anything that would change your approach before editing code.";

const browser = await chromium.launch();

// Reading pages sit behind auth.js's full-screen login overlay, so every case
// here is a signed-in learner. The "degraded" case is the Worker being
// unreachable, not the learner being logged out.
const signIn = async (context) => {
  await context.addInitScript(() => {
    localStorage.setItem("fde_identity", JSON.stringify({ code: "CJ-TEST", name: "Charles Jester", role: "practice" }));
    localStorage.setItem("fde_session", "test-token");
  });
};

// ---- worker down -------------------------------------------------------------
console.log("worker unreachable");
const downCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await signIn(downCtx);
await downCtx.route("**/fde-backend.jestercharles.workers.dev/**", (route) => route.abort());

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await signIn(ctx);

// The Worker, stubbed.
await ctx.route("**/fde-backend.jestercharles.workers.dev/**", async (route) => {
  const url = route.request().url();
  const body = route.request().postDataJSON() || {};
  const send = (obj) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(obj) });
  if (url.endsWith("/reading/start")) {
    return send({ ok: true, sessionId: "sess-1", opening: "I've got today's reading open — The Spec-Driven Tooling Landscape. Ask me anything in it.",
      reading: { id: "w05d3", title: "The Spec-Driven Tooling Landscape", week: "w05", weekTitle: "Spec-Driven Dev & Problem Scoping" }, messagesLeft: 39, budgetLeft: 87, budgetTotal: 100 });
  }
  if (url.endsWith("/reading/message")) {
    return send({ ok: true, reply: "Week 2 called it chunking. Same idea: `split(text)` then embed. Here's the shape:\n```py\nchunks = split(doc, size=800, overlap=120)\n```\nThe constitution plays the same role for decisions.",
      loaded: ["w02d1"], openReadings: ["w02d1"], messagesLeft: 37, budgetLeft: 86, budgetTotal: 100 });
  }
  if (url.endsWith("/reading/prompt")) return send({ ok: true, prompt: GEN_PROMPT, kind: "generic", cached: false });
  if (url.endsWith("/reading/prompt/custom")) return send({ ok: true, prompt: "CUSTOM: aimed at your FastAPI service.\n" + GEN_PROMPT, kind: "custom" });
  if (url.includes("/auth/login")) return send({ ok: true, name: "Charles Jester", role: "practice", token: "t" });
  return send({ ok: true });
});

let page = await downCtx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE, { waitUntil: "domcontentloaded" });

ok("delivery block rendered", await page.locator(".rc-deliver").count() === 1);
ok("big CTA present", (await page.locator("#rcCta").textContent()).includes("delivery prompt"));
ok("launcher present", await page.locator("#rcFab").count() === 1);
ok("block sits above Summarize Your Day", await page.evaluate(() => {
  const d = document.querySelector(".rc-deliver"), s = document.querySelector(".day-summary");
  return !!d && !!s && (d.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
}));
// The two fixed buttons must not overlap.
ok("launcher clears the quiz FAB", await page.evaluate(() => {
  const a = document.querySelector(".rc-fab"), b = document.querySelector(".quiz-fab");
  if (!a || !b) return true;
  const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
  return r1.bottom <= r2.top || r2.bottom <= r1.top || r1.right <= r2.left || r2.right <= r1.left;
}));
await page.locator(".rc-deliver").scrollIntoViewIfNeeded();
await page.screenshot({ path: OUT + "qa-1-block.png", clip: await page.locator(".rc-deliver").boundingBox() });

await page.locator("#rcCta").click();
await page.waitForSelector("#rcModal:not([hidden])");
await page.waitForFunction(() => !/Loading|Writing/.test(document.getElementById("rcPromptBox").textContent));
ok("prompt tab opens from the CTA", await page.locator('.rc-pane.rc-prompt.on').count() === 1);
const offline = await page.locator("#rcPromptBox").textContent();
ok("offline template used when the Worker is down", offline.includes("Orient yourself in this repo first"), offline.slice(0, 80));
ok("template names today's reading", offline.includes("The Spec-Driven Tooling Landscape"));
ok("template carries the day's concepts", offline.includes("speckit constitution"));
ok("template lists the day's sections", offline.includes("Sections:"));
ok("kind labelled offline", (await page.locator("#rcKind").textContent()).includes("offline"));
ok("degradation explained", (await page.locator("#rcPNote").textContent()).length > 10);
await page.screenshot({ path: OUT + "qa-2-prompt-degraded.png" });
await page.keyboard.press("Escape");
ok("escape closes", await page.locator("#rcModal[hidden]").count() === 1);
await page.close();

// ---- worker up ---------------------------------------------------------------
console.log("\nworker up");
page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator("#rcFab").click();
await page.waitForSelector("#rcModal:not([hidden])");
await page.waitForSelector(".rc-assistant");
ok("chat tab opens from the launcher", await page.locator(".rc-pane.rc-chat.on").count() === 1);
ok("curated opening rendered", (await page.locator(".rc-assistant").first().textContent()).includes("Spec-Driven Tooling"));
ok("header shows the week", (await page.locator("#rcWeek").textContent()).includes("Week 5"));
// Deliberately NOT the session turn count: a reload mints a new session, so
// that number never limited anything. The shared daily budget does.
ok("shows the daily budget, not session turns", (await page.locator("#rcTurns").textContent()).includes("87 messages left today"));
ok("session turn count is not advertised", !(await page.locator("#rcTurns").textContent()).includes("turns"));

await page.fill("#rcInput", "how does this relate to chunking in week 2?");
await page.press("#rcInput", "Enter");
await page.waitForSelector(".rc-loaded");
ok("learner turn rendered", await page.locator(".rc-learner").count() === 1);
ok("reply rendered", (await page.locator(".rc-assistant").last().textContent()).includes("Week 2 called it chunking"));
ok("code block rendered as a block", await page.locator(".rc-code").count() === 1);
ok("inline code rendered", await page.locator(".rc-assistant code").count() >= 1);
ok("pulled-reading note shown", (await page.locator(".rc-loaded").textContent()).includes("w02d1"));
ok("custom form starts collapsed", !(await page.locator("#rcCustomWrap").isVisible()));
await page.screenshot({ path: OUT + "qa-3-chat.png" });

// Desktop shows both panes at once — no tab click available, so the rail must
// have filled itself when the modal opened.
ok("prompt rail visible beside the chat", await page.locator(".rc-pane.rc-prompt").isVisible());
ok("tab bar hidden on desktop", !(await page.locator(".rc-tabbar").isVisible()));
await page.waitForFunction(() => !/Loading|Writing/.test(document.getElementById("rcPromptBox").textContent));
ok("generated prompt shown", (await page.locator("#rcPromptBox").textContent()).includes("docs/adr/0001"));
ok("kind labelled generic", (await page.locator("#rcKind").textContent()).includes("today's reading"));
await page.locator("#rcCustom").click();
ok("custom form expands on click", await page.locator("#rcCustomWrap").isVisible());
await page.fill("#rcCustomNote", "a FastAPI service with Postgres");
await page.locator("#rcCustomGo").click();
await page.waitForFunction(() => document.getElementById("rcPromptBox").textContent.startsWith("CUSTOM:"));
ok("custom prompt replaces it", (await page.locator("#rcPromptBox").textContent()).includes("FastAPI"));
ok("kind labelled custom", (await page.locator("#rcKind").textContent()).includes("customized"));
ok("custom form collapses after success", !(await page.locator("#rcCustomWrap").isVisible()));
await page.screenshot({ path: OUT + "qa-4-prompt-custom.png" });

// Transcript survives a reload (session is still live).
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("#rcFab").click();
await page.waitForSelector(".rc-learner");
ok("transcript replays after reload", await page.locator(".rc-learner").count() === 1);

// ---- dark mode ---------------------------------------------------------------
console.log("\ndark mode");
await page.evaluate(() => { document.documentElement.setAttribute("data-theme", "dark"); });
await page.screenshot({ path: OUT + "qa-5-dark.png" });
const contrast = await page.evaluate(() => {
  const box = document.querySelector(".rc-promptbox");
  const cs = getComputedStyle(box);
  return { bg: cs.backgroundColor, fg: cs.color };
});
ok("prompt box picks up themed vars", contrast.bg !== contrast.fg, JSON.stringify(contrast));

// ---- mobile ------------------------------------------------------------------
console.log("\nnarrow viewport");
await page.setViewportSize({ width: 420, height: 860 });
ok("tab bar appears", await page.locator(".rc-tabbar").isVisible());
ok("only one pane visible", (await page.locator(".rc-pane:visible").count()) === 1);
await page.locator('.rc-tab[data-pane="prompt"]').click();
ok("tab switches the pane", await page.locator(".rc-pane.rc-prompt").isVisible());
ok("chat pane hidden after switch", !(await page.locator(".rc-pane.rc-chat").isVisible()));
await page.screenshot({ path: OUT + "qa-6-mobile.png" });

ok("no page errors", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fail ? "\n" + fail + " FAILED" : "\nall passed");
process.exit(fail ? 1 : 0);
