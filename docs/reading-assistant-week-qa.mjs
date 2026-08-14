import { chromium } from "playwright";

// Every Worker route is stubbed here, so nothing validates this value. It is a
// dummy marker, never a real access code.
const PRACTICE_ACCESS_CODE = "practice-placeholder";
let fail = 0;
const ok = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c || !e ? "" : "\n        " + e)); if (!c) fail++; };
const OUT = "/private/tmp/claude-501/-Users-jestercharles-2463-fde/5f02697d-a030-4ed2-af0f-5345ea6b390d/scratchpad/";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((accessCode) => localStorage.setItem("fde_identity", JSON.stringify({ code: accessCode, name: "Charles Jester", role: "learner" })), PRACTICE_ACCESS_CODE);
// Stub only the Worker chat routes; a learner identity so the budget label shows.
await ctx.route("**/fde-backend.jestercharles.workers.dev/**", (r) => {
  const u = r.request().url();
  const j = (o) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(o) });
  if (u.endsWith("/reading/week/start")) return j({ ok: true, sessionId: "w-1", opening: "I've got all of Week 3 loaded.",
    week: { id: "w03", title: "Single-Agent Design & Memory", label: "Week 3 — Single-Agent Design & Memory",
      days: [1,2,3,4,5].map(i => ({ id: "w03d"+i, title: "Day "+i, path: "weeks/w03/w03d"+i+".html" })) },
    digest: "# Week 3 digest\nThe abridged week goes here.", budgetLeft: 87, budgetTotal: 100 });
  if (u.endsWith("/reading/start")) return j({ ok: true, sessionId: "s-1", opening: "Reading open.",
    reading: { id: "w05d3", title: "T", week: "w05", weekTitle: "W" }, budgetLeft: 87, budgetTotal: 100 });
  if (u.endsWith("/reading/message")) return j({ ok: true, reply: "answer", loaded: [], budgetLeft: 86, budgetTotal: 100 });
  if (u.endsWith("/reading/prompt")) return j({ ok: true, prompt: "PROMPT", kind: "generic" });
  return j({ ok: true });
});
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(String(e)));

// ---- reading page: FAB position + real budget label ----
console.log("reading page");
await p.goto("http://localhost:8123/weeks/w05/w05d3.html", { waitUntil: "domcontentloaded" });
const fab = await p.locator("#rcFab").boundingBox();
const vw = p.viewportSize().width;
ok("launcher is on the left", fab.x < vw / 2, JSON.stringify(fab));
ok("launcher clears every fixed sibling", await p.evaluate(() => {
  const a = document.querySelector(".rc-fab").getBoundingClientRect();
  return [...document.querySelectorAll("body *")].every(el => {
    if (el.classList.contains("rc-fab") || getComputedStyle(el).position !== "fixed") return true;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return true;
    return a.right <= r.left || r.right <= a.left || a.bottom <= r.top || r.bottom <= a.top;
  });
}));
await p.locator("#rcFab").click();
await p.waitForSelector(".rc-assistant");
const label = await p.locator("#rcTurns").textContent();
ok("shows the real daily rail, not session turns", label.includes("87 messages left today"), label);
ok("tooltip explains the rail is shared", (await p.locator("#rcTurns").getAttribute("title")).includes("every assistant"));
await p.fill("#rcInput", "hi"); await p.press("#rcInput", "Enter");
await p.waitForFunction(() => document.getElementById("rcTurns").textContent.includes("86"));
ok("budget ticks down with use", (await p.locator("#rcTurns").textContent()).includes("86 messages"));
await p.close();

// ---- curriculum page: week assistant ----
console.log("\ncurriculum page");
const p2 = await ctx.newPage();
p2.on("pageerror", e => errs.push(String(e)));
await p2.goto("http://localhost:8123/index.html", { waitUntil: "domcontentloaded" });
await p2.waitForSelector(".rc-weekask");
ok("a button per week with readings (6)", await p2.locator(".rc-weekask").count() === 6, String(await p2.locator(".rc-weekask").count()));
await p2.locator(".cal-week").first().scrollIntoViewIfNeeded();
await p2.screenshot({ path: OUT + "wk-1-grid.png", clip: await p2.locator(".cal-week").first().boundingBox() });
await p2.locator(".rc-weekask").nth(2).click();
await p2.waitForSelector("#rcModal:not([hidden])");
await p2.waitForSelector(".rc-assistant");
ok("week session opens", (await p2.locator(".rc-assistant").first().textContent()).includes("Week 3"));
ok("header names the week", (await p2.locator("#rcName").textContent()).includes("Week 3"));
ok("rail shows the recap, not a prompt", (await p2.locator("#rcPh").textContent()).includes("Week recap"));
ok("digest rendered", (await p2.locator("#rcPromptBox").textContent()).includes("abridged week"));
ok("day links listed", await p2.locator(".rc-daylink").count() === 5);
ok("copy button relabelled", (await p2.locator("#rcCopy").textContent()).includes("recap"));
ok("customize hidden in week mode", !(await p2.locator("#rcCustom").isVisible()));
ok("budget shown here too", (await p2.locator("#rcTurns").textContent()).includes("87 messages"));
await p2.screenshot({ path: OUT + "wk-2-modal.png" });
// The bug this suite missed: a replayed week session never called
// /reading/week/start, so the rail kept the day-mode "Delivery prompt" heading
// and its "Loading…" placeholder forever.
await p2.keyboard.press("Escape");
await p2.reload({ waitUntil: "domcontentloaded" });
await p2.waitForSelector(".rc-weekask");
await p2.locator(".rc-weekask").nth(2).click();
await p2.waitForSelector(".rc-assistant");
await p2.waitForFunction(() => document.getElementById("rcPromptBox").textContent.includes("abridged week"));
ok("replayed session shows the recap, not 'Delivery prompt'", (await p2.locator("#rcPh").textContent()).includes("Week recap"));
ok("replayed session never shows 'Loading…'", !(await p2.locator("#rcPromptBox").textContent()).includes("Loading"));
ok("replayed transcript is there", await p2.locator(".rc-assistant").count() >= 1);

// Same again with the local recap cache dropped — the rail must refetch, not
// fall back to the day-mode heading.
await p2.keyboard.press("Escape");
await p2.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("rc-digest-")).forEach(k => localStorage.removeItem(k)));
await p2.reload({ waitUntil: "domcontentloaded" });
await p2.waitForSelector(".rc-weekask");
await p2.locator(".rc-weekask").nth(2).click();
await p2.waitForFunction(() => document.getElementById("rcPromptBox").textContent.includes("abridged week"), null, { timeout: 15000 });
ok("recap refetches when the local cache is gone", (await p2.locator("#rcPh").textContent()).includes("Week recap"));

// Switching weeks must not leave the previous week's recap on screen.
await p2.keyboard.press("Escape");
await p2.locator(".rc-weekask").nth(0).click();
await p2.waitForSelector("#rcModal:not([hidden])");
ok("switching weeks re-labels the rail", (await p2.locator("#rcPh").textContent()).includes("Week recap"));
ok("no delivery-prompt affordances in week mode", !(await p2.locator("#rcCustom").isVisible()));

ok("composer copy is week-scoped", (await p2.locator("#rcInput").getAttribute("placeholder")).includes("about this week"));
ok("footer names the week grounding", (await p2.locator("#rcFoot").textContent()).includes("5 readings from this week"));
ok("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(fail ? "\n" + fail + " FAILED" : "\nall passed");
process.exit(fail ? 1 : 0);
