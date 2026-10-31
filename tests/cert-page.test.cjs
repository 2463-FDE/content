const test = require("node:test");
const assert = require("node:assert/strict");

const page = require("../assets/js/cert-page.js");
const data = require("../assets/js/cert-objectives.js");
const map = require("../assets/js/cloud-map.js");

test("lesson labels read like the curriculum calendar", () => {
  assert.equal(page.lessonLabel("w01/d4"), "Week 1 · Day 4");
  assert.equal(page.lessonLabel("w01/d2"), "Week 1 · Day 2");
  assert.equal(page.lessonLabel("w02/w02d3"), "Week 2 · Day 3");
  assert.equal(page.lessonLabel("w10/w10d5"), "Week 10 · Day 5");
});

test("each path renders exactly its alignment target", () => {
  const model = page.buildModel(data, map);
  assert.equal(model.aws.target, "aip-c01");
  assert.equal(model.aws.cert.code, "AIP-C01");
  assert.equal(model.gcp.target, "gaipc");
  assert.equal(model.gcp.cert.name, "Google AI Professional Certificate");
  assert.equal(model.gcp.cert.weightsPublished, false);
});

test("objectives carry resolvable lesson anchors and an honest coverage count", () => {
  const model = page.buildModel(data, map);
  const aip = model.aws.cert;
  assert.equal(aip.coverage.total, 20);
  assert.equal(aip.coverage.covered, 20);
  const safety = aip.domains[2].objectives[0];
  assert.equal(safety.id, "3.1");
  assert.ok(safety.anchors.some((a) => a.href === "weeks/w01/d4.html" && a.via === "provider"));
  const cert = model.gcp.cert;
  assert.equal(cert.coverage.total, 8, "one entry per listed course");
  assert.ok(cert.domains.every((d) => d.objectives.length === 1 && d.objectives[0].domainLevel), "courses map at course level");
  assert.ok(cert.coverage.covered < cert.coverage.total, "courses with no lesson are reported, not hidden");
  const gaps = cert.domains.filter((d) => !d.objectives[0].anchors.length).map((d) => d.title);
  assert.deepEqual(gaps, ["AI for Content Creation", "AI for Data Analysis", "AI for App Deployment"]);
});

test("provider pages link to both paths", () => {
  const model = page.buildModel(data, map);
  assert.ok(model.providerPages.length >= 1);
  for (const p of model.providerPages) {
    assert.match(p.href, /^weeks\/w\d\d\/[\w]+\.html$/);
    assert.ok(p.title && p.ltm);
  }
});
