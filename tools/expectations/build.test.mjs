import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildManifestFromSources,
  extractAssignedLiteral,
  stripHtml,
  validateManifest,
} from "./build.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const read = (name) => readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");
const sources = () => ({
  client: read("client-delivery.html"),
  weeks: read("index.html"),
  delivery: read("delivery-track.html"),
  alt: read("alt-research.html"),
});
const metadata = {
  generated_from_commit: COMMIT,
  reviewed_by_role: "trainer",
  reviewed_at_commit: COMMIT,
  owner_roles: {},
  versions: {},
  supersedes: {},
  persistent: [],
};

function sourcePacketCount(client) {
  let count = 0;
  for (const project of Object.values(client)) {
    for (const week of Object.values(project.weeks)) {
      count += ["ask", "deliverable", "quota"].filter((field) => week[field]).length;
      count += ["handover", "dig", "stated"].reduce((n, field) => n + (week[field]?.length || 0), 0);
    }
  }
  return count;
}

function seededTen(items) {
  let seed = 0x2463fde;
  const picked = [];
  const pool = items.slice();
  while (picked.length < 10) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    picked.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return picked;
}

function resolvePacketText(client, item) {
  const [, project, weekText, field, indexText] = item.source.match(
    /#window\.CLIENT\.([^.]+)\.weeks\.(\d+)\.([^.@]+)(?:\.(\d+))?@/,
  ) || [];
  assert.ok(project, `packet source path resolves: ${item.source}`);
  const value = client[project].weeks[Number(weekText)][field];
  return stripHtml(indexText ? value[Number(indexText) - 1] : value);
}

test("balanced literal extraction ignores braces and brackets inside strings", () => {
  const page = `before window.SAMPLE = { one: "} still text", two: ['a]b', { deep: true }] }; after`;
  const literal = extractAssignedLiteral(page, "window.SAMPLE");
  assert.deepEqual(Function(`return (${literal})`)(), {
    one: "} still text",
    two: ["a]b", { deep: true }],
  });
});

test("AC-1.2.2 manifest counts match authored packets, schedule, and track", () => {
  const input = sources();
  const client = Function(`return (${extractAssignedLiteral(input.client, "window.CLIENT")})`)();
  const weeks = Function(`return (${extractAssignedLiteral(input.weeks, "window.WEEKS")})`)();
  const { manifest, counts } = buildManifestFromSources(input, { mode: "pre-cutover", metadata });

  assert.equal(counts.packet, sourcePacketCount(client));
  assert.equal(counts.schedule, weeks.reduce((n, week) => n + week.days.length, 0));
  assert.ok(counts.track >= 12, `expected >=12 track entries, got ${counts.track}`);
  assert.equal(manifest.items.length, counts.packet + counts.schedule + counts.track);
  assert.equal(manifest.items.every((item) => item.stakeholder_context === null), true,
    "unclassified authored content stays explicitly unclassified rather than inventing stakeholder positions");
  assert.deepEqual([...new Set(manifest.items.map((item) => item.project))].sort(), [
    "finance", "healthcare", "schedule", "track",
  ]);
});

test("AC-1.2.3 ten deterministic random packet entries round-trip to authored wording", () => {
  const input = sources();
  const client = Function(`return (${extractAssignedLiteral(input.client, "window.CLIENT")})`)();
  const { manifest } = buildManifestFromSources(input, { mode: "pre-cutover", metadata });
  const packetItems = manifest.items.filter((item) => /#window\.CLIENT\./.test(item.source));

  for (const item of seededTen(packetItems)) {
    assert.equal(item.text, resolvePacketText(client, item), `${item.id} round-trips to its authored source path`);
  }
});

test("AC-1.2.4 every trainer-only source class is excluded from learner output", () => {
  const marker = "TRAINER-ONLY-MARKER-7f3a";
  const input = {
    client: `<div class="trainer-only">${marker}-block</div><script>window.CLIENT = {
      demo: { weeks: { 1: { ask: "learner ask", handover: ["learner handover"], dig: ["learner dig"], stated: ["learner stated"], hidden: ["${marker}-hidden"], facilitator: "${marker}-facilitator", deliverable: "learner deliverable" } } }
    };</script>`,
    weeks: `<script>window.WEEKS = [{w:1, days:[{t:"learner day",s:"learner detail"}]}];</script>`,
    delivery: `<section id="rhythm"><div class="dt-day" id="rt-mon"><div class="dt-t">learner cadence</div><div class="dt-s">learner cadence detail <span class="trainer-only">${marker}-delivery-block</span></div></div></section>
      <section id="rubric"><div class="dt-bar">learner pass bar</div><details class="dt-dim"><span class="dnm">learner dimension</span><div class="dt-score">learner rubric</div></details></section>
      <section id="premortem"><h2>Demo pre-mortem</h2><p class="lede">learner pre-mortem</p></section>
      <section id="blocker"><div class="row"><div class="lb">learner field</div><input data-f="bc.item"></div></section>`,
    alt: `<script>window.ALT = {1:{title:"learner",trainer:"${marker}-alt"}};</script>`,
  };
  const { manifest } = buildManifestFromSources(input, { mode: "pre-cutover", metadata, validateProvenance: false });
  const output = JSON.stringify(manifest);

  assert.equal(manifest.items.every((item) => item.visibility === "learner"), true);
  for (const suffix of ["hidden", "facilitator", "alt", "block", "delivery-block"]) {
    assert.equal(output.includes(`${marker}-${suffix}`), false, suffix);
  }
});

test("post-cutover rejects every trainer-only authored field", () => {
  const base = sources();
  const cases = [
    { key: "client", value: `window.CLIENT={demo:{weeks:{1:{ask:"ok",hidden:["marker"],deliverable:"ok"}}}}` },
    { key: "client", value: `window.CLIENT={demo:{weeks:{1:{ask:"ok",facilitator:"marker",deliverable:"ok"}}}}` },
    { key: "alt", value: `window.ALT={1:{title:"ok",trainer:"marker"}}` },
  ];
  for (const fixture of cases) {
    const input = { ...base, [fixture.key]: fixture.value };
    assert.throws(
      () => buildManifestFromSources(input, { mode: "post-cutover", metadata, validateProvenance: false }),
      /trainer-only/i,
      fixture.key,
    );
  }
});

test("schema contract and semantic checks reject malformed or duplicate items", () => {
  const schema = JSON.parse(read("expectations.v1.schema.json"));
  const { manifest } = buildManifestFromSources(sources(), { mode: "pre-cutover", metadata });

  for (const [field, value] of [["visibility", undefined], ["owner_role", undefined], ["text", "<trainer>"]]) {
    const broken = structuredClone(manifest);
    if (value === undefined) delete broken.items[0][field];
    else broken.items[0][field] = value;
    assert.throws(() => validateManifest(broken, schema, { root: ROOT }), new RegExp(field));
  }

  const duplicate = structuredClone(manifest);
  duplicate.items[1].id = duplicate.items[0].id;
  assert.throws(() => validateManifest(duplicate, schema, { root: ROOT }), /duplicate id/);

  const badSource = structuredClone(manifest);
  badSource.items[0].source = badSource.items[0].source.replace(/^[^#]+/, "missing.html");
  assert.throws(() => validateManifest(badSource, schema, { root: ROOT }), /source file.*does not exist/i);
});

test("captain amendment schema preserves two roles, demand/preference, authority, trade space, and conflicts", () => {
  const schema = JSON.parse(read("expectations.v1.schema.json"));
  const { manifest } = buildManifestFromSources(sources(), { mode: "pre-cutover", metadata });
  const modeled = structuredClone(manifest);
  const business = modeled.items[0];
  const technical = modeled.items[1];
  business.owner_role = "client_business";
  business.stakeholder_context = {
    stakeholder_role: "client_business",
    position_type: "non_negotiable",
    approval_authority: ["client_business"],
    rationale: "Synthetic authored business rationale.",
    pressure: "Synthetic authored delivery pressure.",
    success_criteria: ["Synthetic authored success criterion."],
    boundaries: ["Synthetic authored boundary."],
    trade_space: [],
    escalation_triggers: ["Synthetic authored escalation trigger."],
    conflicts: [{
      with_id: technical.id,
      dimensions: ["delivery", "reliability"],
      rationale: "Synthetic authored cross-cutting conflict.",
      escalation_trigger: "Synthetic authored conflict trigger.",
    }],
  };
  technical.owner_role = "client_technical_lead";
  technical.stakeholder_context = {
    stakeholder_role: "client_technical_lead",
    position_type: "preference",
    approval_authority: ["client_technical_lead", "security"],
    rationale: "Synthetic authored technical rationale.",
    pressure: "Synthetic authored maintainability pressure.",
    success_criteria: [],
    boundaries: [],
    trade_space: ["Synthetic authored acceptable trade."],
    escalation_triggers: [],
    conflicts: [{
      with_id: business.id,
      dimensions: ["delivery", "maintainability"],
      rationale: "Synthetic authored reciprocal conflict.",
      escalation_trigger: "Synthetic authored reciprocal trigger.",
    }],
  };
  assert.doesNotThrow(() => validateManifest(modeled, schema, { root: ROOT }));

  const softened = structuredClone(modeled);
  softened.items[0].stakeholder_context.position_type = "nice_to_have";
  assert.throws(() => validateManifest(softened, schema, { root: ROOT }));
  const noAuthority = structuredClone(modeled);
  noAuthority.items[0].stakeholder_context.approval_authority = [];
  assert.throws(() => validateManifest(noAuthority, schema, { root: ROOT }));
  const oneDimensional = structuredClone(modeled);
  oneDimensional.items[0].stakeholder_context.conflicts[0].dimensions = ["delivery"];
  assert.throws(() => validateManifest(oneDimensional, schema, { root: ROOT }));
});

test("same inputs are byte-stable; a versioned packet edit preserves every id", () => {
  const input = sources();
  const first = buildManifestFromSources(input, { mode: "pre-cutover", metadata }).manifest;
  const second = buildManifestFromSources(input, { mode: "pre-cutover", metadata }).manifest;
  assert.equal(JSON.stringify(first), JSON.stringify(second));

  const editedInput = { ...input, client: input.client.replace("The registration page feels slow.", "The registration page remains slow.") };
  const changedId = "healthcare.w01.stated.1";
  const editedMetadata = { ...metadata, versions: { [changedId]: 2 } };
  const edited = buildManifestFromSources(editedInput, {
    mode: "pre-cutover", metadata: editedMetadata, validateProvenance: false,
  }).manifest;
  assert.deepEqual(edited.items.map((item) => item.id), first.items.map((item) => item.id));

  const beforeById = new Map(first.items.map((item) => [item.id, item]));
  const changed = edited.items.filter((item) => JSON.stringify(item) !== JSON.stringify(beforeById.get(item.id)));
  assert.equal(changed.length, 1);
  assert.equal(changed[0].id, changedId);
  assert.equal(changed[0].version, 2);
});

test("CLI check is a drift guard and reports generated counts", () => {
  const run = spawnSync(process.execPath, ["tools/expectations/build.mjs", "--mode", "pre-cutover", "--check"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /packet=\d+ schedule=\d+ track=\d+ total=\d+/);
});
