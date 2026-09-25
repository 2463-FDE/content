// Browser QA for the trainer-only content cutover. Serves this worktree,
// stubs the authenticated Worker manifest route, and drives the real pages.
// Needs Playwright locally or globally. Run: node docs/trainer-manifest-qa.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { loadPlaywright } from "./qa/load-playwright.mjs";

const { chromium } = await loadPlaywright();

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKEN = "qa-trainer-session-placeholder";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
let failures = 0;
const ok = (name, condition, extra = "") => {
  console.log((condition ? "  ok   " : "  FAIL ") + name + (condition || !extra ? "" : `\n        ${extra}`));
  if (!condition) failures++;
};

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
  const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  try {
    const body = await readFile(join(ROOT, relative || "index.html"));
    res.writeHead(200, { "content-type": TYPES[extname(relative)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

const trainerItems = [];
for (const project of ["healthcare", "finance"]) {
  for (let week = 1; week <= 10; week++) {
    for (let index = 1; index <= 2; index++) {
      const prefix = project === "healthcare" && week === 1 && index === 1 ? "<img src=x onerror=window.QA_LEAK=true> " : "";
      trainerItems.push({
        id: `${project}.w${String(week).padStart(2, "0")}.hidden.${index}`,
        project,
        week,
        field: "hidden",
        text: `${prefix}Synthetic hidden ${project} week ${week} item ${index}`,
        visibility: "trainer",
      });
    }
    trainerItems.push({
      id: `${project}.w${String(week).padStart(2, "0")}.facilitator`,
      project,
      week,
      field: "facilitator",
      text: `Synthetic facilitator ${project} week ${week}`,
      visibility: "trainer",
    });
  }
}
for (let week = 1; week <= 8; week++) {
  trainerItems.push({
    id: `alt.synthetic-week-${week}.trainer`,
    project: "alt",
    week,
    field: "trainer",
    text: `Synthetic alt trainer week ${week}`,
    visibility: "trainer",
  });
}

const browser = await chromium.launch();
const calls = [];
const errors = [];

async function makeContext(role) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(({ role, token }) => {
    localStorage.setItem("fde_identity", JSON.stringify({ code: "qa-placeholder", name: role === "trainer" ? "QA Trainer" : "Learner A", role }));
    localStorage.setItem("fde_session", token);
  }, { role, token: TOKEN });
  context.on("request", (request) => {
    if (request.url().includes("fde-backend.jestercharles.workers.dev")) {
      calls.push({ role, url: request.url(), authorization: request.headers().authorization || "" });
    }
  });
  await context.route("**/fde-backend.jestercharles.workers.dev/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/coworker/manifest" && url.searchParams.get("scope") === "trainer") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: trainerItems }) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
  });
  return context;
}

console.log("learner route isolation");
{
  const context = await makeContext("learner");
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${BASE}/client-delivery.html`, { waitUntil: "load" });
  await page.waitForTimeout(100);
  ok("learner does not render a trainer manifest section", await page.locator(".trainer-manifest").count() === 0);
  ok("learner makes no trainer manifest request", !calls.some((call) => call.role === "learner"));
  await context.close();
}

console.log("client-delivery trainer cutover");
{
  const context = await makeContext("trainer");
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${BASE}/client-delivery.html`, { waitUntil: "load" });
  await page.waitForSelector(".trainer-manifest .trainer-hidden li");
  const htmlLikeText = await page.locator(".trainer-hidden li").first().textContent();
  ok("fetched HTML-like content remains literal text", htmlLikeText.startsWith("<img src=x onerror="), htmlLikeText);
  ok("fetched HTML-like content creates no element", await page.locator(".trainer-manifest img").count() === 0);

  for (const project of ["healthcare", "finance"]) {
    await page.click(`.cd-proj[data-proj="${project}"]`);
    for (let week = 1; week <= 10; week++) {
      await page.click(`.cd-week[data-week="${week}"]`);
      const hidden = await page.locator(".trainer-manifest .trainer-hidden li").allTextContents();
      const facilitator = await page.locator(".trainer-manifest .trainer-note p").textContent();
      ok(`${project} week ${week} renders every hidden problem`,
        hidden.length === 2 && hidden.every((text, index) => text.includes(`Synthetic hidden ${project} week ${week} item ${index + 1}`)),
        hidden.join(" | "));
      ok(`${project} week ${week} renders its facilitator note`, facilitator === `Synthetic facilitator ${project} week ${week}`, facilitator || "missing");
    }
  }
  ok("fetched content executes no handler", await page.evaluate(() => window.QA_LEAK !== true));
  await context.close();
}

console.log("alternative-research trainer cutover");
{
  const context = await makeContext("trainer");
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${BASE}/alt-research.html`, { waitUntil: "load" });
  await page.waitForSelector(".trainer-manifest .trainer-note p");
  for (let week = 1; week <= 8; week++) {
    await page.click(`.ar-week[data-week="${week}"]`);
    const note = await page.locator(".trainer-manifest .trainer-note p").textContent();
    ok(`alternative-research week ${week} renders its trainer note`, note === `Synthetic alt trainer week ${week}`, note || "missing");
  }
  await context.close();
}

const trainerCalls = calls.filter((call) => call.role === "trainer");
ok("trainer requests use the scoped route", trainerCalls.length === 2 && trainerCalls.every((call) => new URL(call.url).searchParams.get("scope") === "trainer"), JSON.stringify(trainerCalls));
ok("trainer requests carry the bearer session", trainerCalls.every((call) => call.authorization === `Bearer ${TOKEN}`));
ok("pages raised no runtime errors", errors.length === 0, errors.join(" | "));

await browser.close();
await new Promise((resolve) => server.close(resolve));
if (failures) process.exitCode = 1;
else console.log("\nTrainer manifest QA passed.");
