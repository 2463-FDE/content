// The budget reminder: fires once per 20% threshold per day, costs nothing, and
// never enters the transcript the model sees.
const PRACTICE_ACCESS_CODE = process.env.FDE_PRACTICE_ACCESS_CODE;
if (!PRACTICE_ACCESS_CODE) {
  throw new Error("FDE_PRACTICE_ACCESS_CODE is required. Every Worker route is stubbed here, so any non-secret placeholder works: FDE_PRACTICE_ACCESS_CODE=practice-placeholder. Never supply a real access code.");
}
const { chromium } = await import("playwright");
let fail = 0, calls = 0;
const ok = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c || !e ? "" : "\n        " + e)); if (!c) fail++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((accessCode) => localStorage.setItem("fde_identity", JSON.stringify({ code: accessCode, name: "C", role: "learner" })), PRACTICE_ACCESS_CODE);

// Budget walks down as the test drives turns.
let left = 100;
await ctx.route("**/fde-backend.jestercharles.workers.dev/**", (r) => {
  const u = r.request().url();
  const j = (o) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(o) });
  if (u.endsWith("/reading/start")) return j({ ok: true, sessionId: "s", opening: "open.",
    reading: { id: "w05d3", title: "T", week: "w05", weekTitle: "W" }, budgetLeft: left, budgetTotal: 100 });
  if (u.endsWith("/reading/message")) { calls++; return j({ ok: true, reply: "r", loaded: [], budgetLeft: left, budgetTotal: 100 }); }
  if (u.endsWith("/reading/prompt")) return j({ ok: true, prompt: "P", kind: "generic" });
  return j({ ok: true });
});
const p = await ctx.newPage();
const netToWorker = [];
p.on("request", (r) => { if (r.url().includes("workers.dev")) netToWorker.push(r.url()); });
await p.goto("http://localhost:8123/weeks/w05/w05d3.html", { waitUntil: "domcontentloaded" });
await p.locator("#rcFab").click();
await p.waitForSelector(".rc-assistant");

const send = async (remaining) => {
  left = remaining;
  const before = netToWorker.length;
  await p.fill("#rcInput", "q"); await p.press("#rcInput", "Enter");
  await p.waitForFunction(t => document.getElementById("rcTurns").textContent.includes(t + " message"), String(remaining));
  return netToWorker.length - before;   // requests this turn
};

ok("nothing at 10% used", (await send(90), await p.locator(".rc-usage").count()) === 0);
const reqs = await send(80);
ok("fires at 20%", await p.locator(".rc-usage").count() === 1);
ok("names the threshold and what's left", /20% .*80 of 100 left/.test(await p.locator(".rc-usage").first().textContent()),
   await p.locator(".rc-usage").first().textContent());
ok("costs exactly one request — the reply itself", reqs === 1, String(reqs));
await send(75);
ok("doesn't re-fire inside the same bucket", await p.locator(".rc-usage").count() === 1);
await send(60);
ok("fires at 40%", await p.locator(".rc-usage").count() === 2);
await send(19);
ok("crossing two buckets at once fires once", await p.locator(".rc-usage").count() === 3,
   String(await p.locator(".rc-usage").count()));
ok("80% notice is the low-budget styling", await p.locator(".rc-usage.is-low").count() === 1);
ok("80% copy steers spend", /stuck on/.test(await p.locator(".rc-usage").last().textContent()));

// The notice must never become model context.
ok("not stored in the transcript", await p.evaluate(() => {
  const log = JSON.parse(localStorage.getItem("rc-log-w05d3") || "[]");
  return !log.some(m => /budget/i.test(m.text));
}));
// The notice itself must add no traffic. /uprog is progress.js and
// /reading/prompt is the cached delivery-prompt rail (a KV read, no model call).
const paths = [...new Set(netToWorker.map(u => u.split("workers.dev")[1].split("?")[0]))].sort();
ok("no endpoint beyond the known ones", JSON.stringify(paths) === JSON.stringify(["/reading/message","/reading/prompt","/reading/start","/uprog"]), paths.join(","));
ok("model calls == turns sent", calls === 5, String(calls));

// A reload must not re-announce thresholds already seen.
await p.reload({ waitUntil: "domcontentloaded" });
await p.locator("#rcFab").click();
await p.waitForSelector(".rc-assistant");
await send(19);
ok("survives a reload without repeating", await p.locator(".rc-usage").count() === 0,
   String(await p.locator(".rc-usage").count()));

// Practice identities are uncapped and must see nothing.
const ctx2 = await b.newContext();
await ctx2.addInitScript((accessCode) => localStorage.setItem("fde_identity", JSON.stringify({ code: accessCode, name: "C", role: "practice" })), PRACTICE_ACCESS_CODE);
await ctx2.route("**/fde-backend.jestercharles.workers.dev/**", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ ok: true, sessionId: "s", opening: "open.", reply: "r", loaded: [],
    reading: { id: "w05d3", title: "T", week: "w05", weekTitle: "W" }, budgetLeft: null, budgetTotal: 100 }) }));
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:8123/weeks/w05/w05d3.html", { waitUntil: "domcontentloaded" });
await p2.locator("#rcFab").click();
await p2.waitForSelector(".rc-assistant");
await p2.fill("#rcInput", "q"); await p2.press("#rcInput", "Enter");
await p2.waitForTimeout(800);
ok("uncapped identity sees no notice and no counter", await p2.locator(".rc-usage").count() === 0 &&
   (await p2.locator("#rcTurns").textContent()) === "");
await b.close();
console.log(fail ? "\n" + fail + " FAILED" : "\nall passed");
process.exit(fail ? 1 : 0);
