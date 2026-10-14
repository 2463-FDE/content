const test = require("node:test");
const assert = require("node:assert/strict");

const page = require("../assets/js/cert-page.js");
const data = require("../assets/js/cert-objectives.js");
const map = require("../assets/js/cloud-map.js");

test("lesson labels read like the curriculum calendar", () => {
  assert.equal(page.lessonLabel("w01/d4b"), "Week 1 · Day 4 (Part 2)");
  assert.equal(page.lessonLabel("w01/d2a"), "Week 1 · Day 2 (Part 1)");
  assert.equal(page.lessonLabel("w02/w02d3"), "Week 2 · Day 3");
  assert.equal(page.lessonLabel("w10/w10d5"), "Week 10 · Day 5");
});

test("the AWS path names its target; the GCP path stays pending with both candidates", () => {
  const model = page.buildModel(data, map);
  assert.equal(model.aws.target, "aip-c01");
  assert.equal(model.aws.cert.code, "AIP-C01");
  assert.equal(model.gcp.target, null);
  assert.equal(model.gcp.pendingDecision, "gcp-cert-alignment-target");
  assert.deepEqual(model.gcp.candidates.map((c) => c.id), ["paa", "pmle"]);
});

test("a recorded GCP decision would narrow the GCP section to that one credential", () => {
  const decided = JSON.parse(JSON.stringify(data));
  decided.paths.gcp = { target: "pmle" };
  const model = page.buildModel(decided, map);
  assert.equal(model.gcp.target, "pmle");
  assert.equal(model.gcp.pendingDecision, null);
  assert.deepEqual(model.gcp.candidates.map((c) => c.id), ["pmle"]);
});

test("objectives carry resolvable lesson anchors and an honest coverage count", () => {
  const model = page.buildModel(data, map);
  const aip = model.aws.cert;
  assert.equal(aip.coverage.total, 20);
  assert.equal(aip.coverage.covered, 20);
  const safety = aip.domains[2].objectives[0];
  assert.equal(safety.id, "3.1");
  assert.ok(safety.anchors.some((a) => a.href === "weeks/w01/d4b.html" && a.via === "provider"));
  const pmle = model.gcp.candidates.find((c) => c.id === "pmle");
  assert.ok(pmle.domains.every((d) => d.objectives.length === 1 && d.objectives[0].domainLevel), "PMLE maps at section level");
  assert.ok(pmle.coverage.covered < pmle.coverage.total, "uncovered sections are reported, not hidden");
});

test("provider pages link to both paths", () => {
  const model = page.buildModel(data, map);
  assert.ok(model.providerPages.length >= 1);
  for (const p of model.providerPages) {
    assert.match(p.href, /^weeks\/w\d\d\/[\w]+\.html$/);
    assert.ok(p.title && p.ltm);
  }
});
