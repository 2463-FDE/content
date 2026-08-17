import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildManifestFromSources,
  extractAssignedLiteral,
  stripHtml,
  validateManifest,
} from "./build.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (name) => readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");
const sources = () => ({
  client: read("client-delivery.html"),
  weeks: read("index.html"),
  delivery: read("delivery-track.html"),
  alt: read("alt-research.html"),
});
const metadata = {
  reviewed_by_role: "trainer",
  owner_roles: {},
  versions: {},
  supersedes: {},
  persistent: [],
};
const SCHEMA = JSON.parse(read("expectations.v1.schema.json"));

const stakeholderContext = (positionType) => ({
  stakeholder_role: "client_business",
  position_type: positionType,
  approval_authority: ["client_business"],
  rationale: "Synthetic authored business rationale.",
  pressure: "Synthetic authored delivery pressure.",
  success_criteria: ["Synthetic authored success criterion."],
  boundaries: ["Synthetic authored boundary."],
  trade_space: [],
  escalation_triggers: ["Synthetic authored escalation trigger."],
  conflicts: [],
});

const emittedContext = (positionKey, positionType) => ({
  position_key: positionKey,
  ...stakeholderContext(positionType),
});

const standaloneSources = (marker = "") => ({
  client: `${marker ? `<div class="cd-sec trainer-only">${marker}-multi-class</div>` : ""}<script>window.CLIENT = {
      demo: { weeks: { 1: {
        ask: "learner ask",
        handover: ["learner handover one", "learner handover two"],
        dig: ["learner dig"],
        stated: ["learner stated"],${marker ? `\n        hidden: ["${marker}-hidden"],\n        facilitator: "${marker}-facilitator",` : ""}
        deliverable: "learner deliverable"
      } } }
    };</script>`,
  weeks: `<script>window.WEEKS = [{w:1, days:[{t:"learner day",s:"learner detail"}]}];</script>`,
  delivery: `<section id="rhythm"><div class="dt-day" id="rt-mon"><div class="dt-t dt-heading">learner cadence</div><div class="dt-s">learner cadence detail${marker ? ` <span class="note trainer-only">${marker}-delivery-block <em class="trainer-only">${marker}-nested</em></span>` : ""}</div></div></section>
      <section id="rubric"><div class="dt-bar">learner pass bar</div><details class="dt-dim rubric-dim"><span class="dnm">learner dimension</span><div class="dt-score">learner rubric</div></details></section>
      <section id="premortem"><h2>Demo pre-mortem</h2><p class="lede">learner pre-mortem</p></section>
      <section id="blocker"><div class="row bc-row"><div class="lb">learner field</div><input data-f="bc.item"></div></section>`,
  alt: `<script>window.ALT = {1:{title:"learner"${marker ? `,trainer:"${marker}-alt"` : ""}}};</script>`,
});

function writeSourceTree(dir, input) {
  writeFileSync(join(dir, "client-delivery.html"), input.client);
  writeFileSync(join(dir, "index.html"), input.weeks);
  writeFileSync(join(dir, "delivery-track.html"), input.delivery);
  writeFileSync(join(dir, "alt-research.html"), input.alt);
}

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
  const input = standaloneSources(marker);
  const { manifest } = buildManifestFromSources(input, { mode: "pre-cutover", metadata, validateProvenance: false });
  const output = JSON.stringify(manifest);

  assert.equal(manifest.items.every((item) => item.visibility === "learner"), true);
  for (const suffix of ["hidden", "facilitator", "alt", "multi-class", "delivery-block", "nested"]) {
    assert.equal(output.includes(`${marker}-${suffix}`), false, suffix);
  }
  assert.equal(
    manifest.items.find((item) => item.id === "track.cadence.mon-steering").text,
    "learner cadence learner cadence detail",
  );
});

test("a trainer-only marker sharing an element with other classes is still stripped", () => {
  assert.equal(stripHtml('learner <span class="note trainer-only">SECRET</span> ok'), "learner ok");
  assert.equal(stripHtml('learner <span class="trainer-only note">SECRET</span> ok'), "learner ok");
  assert.equal(stripHtml('learner <div class="cd-sec trainer-only">SECRET <b class="trainer-only">DEEPER</b></div> ok'), "learner ok");
  assert.equal(stripHtml('learner <span class="trainer-only-ish">visible</span> ok'), "learner visible ok");
});

test("an unquoted trainer-only class attribute is stripped rather than emitted", () => {
  assert.equal(stripHtml("learner <span class=trainer-only>SECRET</span> ok"), "learner ok");
  assert.equal(stripHtml("learner <span class=trainer-only data-x=1>SECRET</span> ok"), "learner ok");
  assert.equal(stripHtml("learner <img class=trainer-only src=x> ok"), "learner ok");
  assert.equal(stripHtml("learner <span class=visible-note>visible</span> ok"), "learner visible ok");
});

test("a void element carrying the trainer marker is stripped instead of aborting the build", () => {
  assert.equal(stripHtml('learner <img class="trainer-only" src=x> ok'), "learner ok");
  assert.equal(stripHtml('learner <br class="trainer-only"> ok'), "learner ok");
  assert.equal(stripHtml('learner <hr class="cd-sec trainer-only"> ok'), "learner ok");
  assert.equal(stripHtml('learner <input class="trainer-only" value="SECRET"> ok'), "learner ok");
  assert.equal(stripHtml('learner <img src=x alt="visible"> ok'), "learner ok");
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
    ...emittedContext("healthcare.w07.business.guardrail-proof", "non_negotiable"),
    conflicts: [{
      with_id: technical.id,
      dimensions: ["delivery", "reliability"],
      rationale: "Synthetic authored cross-cutting conflict.",
      escalation_trigger: "Synthetic authored conflict trigger.",
    }],
  };
  technical.owner_role = "client_technical_lead";
  technical.stakeholder_context = {
    ...emittedContext("healthcare.w07.techlead.intake-path-safety", "preference"),
    stakeholder_role: "client_technical_lead",
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
  const noKey = structuredClone(modeled);
  delete noKey.items[0].stakeholder_context.position_key;
  assert.throws(() => validateManifest(noKey, schema, { root: ROOT }), /stakeholder_context/);
  const textDerivedKey = structuredClone(modeled);
  textDerivedKey.items[0].stakeholder_context.position_key = "The registration page feels slow.";
  assert.throws(() => validateManifest(textDerivedKey, schema, { root: ROOT }), /stakeholder_context/);
  const reusedKey = structuredClone(modeled);
  reusedKey.items[1].stakeholder_context.position_key = reusedKey.items[0].stakeholder_context.position_key;
  assert.throws(() => validateManifest(reusedKey, schema, { root: ROOT }), /duplicate position_key/);
});

test("same inputs are byte-stable and inserting a bullet renumbers nothing", () => {
  const input = sources();
  const first = buildManifestFromSources(input, { mode: "pre-cutover", metadata }).manifest;
  const second = buildManifestFromSources(input, { mode: "pre-cutover", metadata }).manifest;
  assert.equal(JSON.stringify(first), JSON.stringify(second));

  const anchor = '"The registration page feels slow.",';
  assert.ok(input.client.includes(anchor), "insertion fixture anchor still exists in the authored source");
  const insertedInput = {
    ...input,
    client: input.client.replace(anchor, `"Nurses re-key the same intake twice.",\n          ${anchor}`),
  };
  assert.notEqual(insertedInput.client, input.client);

  const versionedId = "healthcare.w01.stated.the-registration-page-feels-slow";
  const insertedMetadata = {
    ...metadata,
    versions: { [versionedId]: 3 },
    owner_roles: { [versionedId]: "client_business" },
  };
  const inserted = buildManifestFromSources(insertedInput, {
    mode: "pre-cutover", metadata: insertedMetadata, validateProvenance: false,
  }).manifest;

  const afterById = new Map(inserted.items.map((item) => [item.id, item]));
  for (const item of first.items) {
    const after = afterById.get(item.id);
    assert.ok(after, `${item.id} survives an insertion earlier in its array`);
    assert.equal(after.text, item.text, `${item.id} still carries its own authored sentence`);
  }
  assert.equal(inserted.items.length, first.items.length + 1);
  assert.ok(afterById.has("healthcare.w01.stated.nurses-re-key-the-same-intake-twice"), "the inserted bullet gets its own id");

  const versioned = afterById.get(versionedId);
  assert.equal(versioned.version, 3, "a recorded version bump stays bound to the sentence it was recorded against");
  assert.equal(versioned.owner_role, "client_business");
  assert.equal(versioned.text, "The registration page feels slow.");
});

test("an override keyed to an id the sources no longer produce is rejected", () => {
  const input = sources();
  for (const override of [
    { versions: { "healthcare.w01.stated.1": 2 } },
    { owner_roles: { "healthcare.w01.stated.2": "client_business" } },
    { supersedes: { "healthcare.w99.ask": "healthcare.w98.ask" } },
    { persistent: ["finance.w01.handover.3"] },
  ]) {
    assert.throws(
      () => buildManifestFromSources(input, {
        mode: "pre-cutover", metadata: { ...metadata, ...override }, validateProvenance: false,
      }),
      /override references unknown expectation id/,
      JSON.stringify(override),
    );
  }
});

test("provenance is pinned to source content, validates without git, and catches a stale source", () => {
  const dir = mkdtempSync(join(tmpdir(), "expectations-provenance-"));
  try {
    assert.equal(existsSync(join(dir, ".git")), false, "the fixture tree is not a git repository");
    const input = standaloneSources();
    writeSourceTree(dir, input);
    const { manifest } = buildManifestFromSources(input, {
      mode: "post-cutover", metadata, root: dir, schema: SCHEMA,
    });

    assert.equal(manifest.items.every((item) => /@sha256:[0-9a-f]{64}$/.test(item.source)), true);
    assert.doesNotThrow(() => validateManifest(manifest, SCHEMA, { root: dir }));

    writeSourceTree(dir, { ...input, client: input.client.replace("learner ask", "learner ask, revised") });
    assert.throws(
      () => validateManifest(manifest, SCHEMA, { root: dir }),
      /client-delivery\.html no longer matches its pinned content hash/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const CARRYING_ID = "healthcare.w07.ask";
const POSITION_KEY = "healthcare.w07.business.guardrail-proof";
const ledger = (...entries) => ({ positions: { [POSITION_KEY]: entries } });

function classifiedManifest(positionType, { id = CARRYING_ID, version = 1, supersedes = null, input = sources() } = {}) {
  const manifest = buildManifestFromSources(input, {
    mode: "pre-cutover",
    metadata: {
      ...metadata,
      versions: { [id]: version },
      supersedes: supersedes ? { [id]: supersedes } : {},
      owner_roles: { [id]: "client_business" },
      stakeholder_position_keys: { [id]: POSITION_KEY },
      stakeholder_context: { [id]: stakeholderContext(positionType) },
    },
    validateProvenance: false,
  }).manifest;
  return manifest;
}

test("the authored position keys resolve to real expectations and never inline the key", () => {
  const authored = JSON.parse(read("tools/expectations/overrides.json"));
  const keys = authored.stakeholder_position_keys;
  assert.equal(Object.keys(keys).length, 16, "the sixteen authoring-lane position keys are preserved");
  for (const key of Object.values(keys)) {
    assert.match(key, /^[a-z][a-z0-9-]*\.w[0-9]{2}\.(business|techlead)\.[a-z0-9][a-z0-9-]*$/, key);
  }
  assert.equal(new Set(Object.values(keys)).size, 16, "each carrying item maps to a distinct position key");

  const { manifest } = buildManifestFromSources(sources(), { mode: "pre-cutover", metadata: authored });
  const ids = new Set(manifest.items.map((item) => item.id));
  for (const id of Object.keys(keys)) assert.ok(ids.has(id), `${id} is a real expectation id`);
  assert.equal(manifest.items.every((item) => item.stakeholder_context === null), true,
    "reserving keys establishes no client position");

  assert.throws(
    () => buildManifestFromSources(sources(), {
      mode: "pre-cutover",
      validateProvenance: false,
      metadata: { ...metadata, stakeholder_context: { [CARRYING_ID]: stakeholderContext("preference") } },
    }),
    /has no stakeholder_position_keys entry/,
  );
  assert.throws(
    () => buildManifestFromSources(sources(), {
      mode: "pre-cutover",
      validateProvenance: false,
      metadata: {
        ...metadata,
        stakeholder_position_keys: { [CARRYING_ID]: POSITION_KEY },
        stakeholder_context: { [CARRYING_ID]: { ...stakeholderContext("preference"), position_key: "other.w01.business.x" } },
      },
    }),
    /must not inline position_key/,
  );
});

test("classifying previously unclassified content is an ordinary versioned addition", () => {
  const unclassified = buildManifestFromSources(sources(), { mode: "pre-cutover", metadata }).manifest;
  assert.equal(unclassified.items.every((item) => item.stakeholder_context === null), true);
  assert.doesNotThrow(() => validateManifest(unclassified, SCHEMA, { root: ROOT, baseline: { positions: {} } }));

  const classified = classifiedManifest("non_negotiable");
  const carrier = classified.items.find((item) => item.id === CARRYING_ID);
  assert.equal(carrier.version, 1);
  assert.equal(carrier.supersedes, null);
  assert.doesNotThrow(() => validateManifest(classified, SCHEMA, {
    root: ROOT, validateProvenance: false,
    baseline: ledger({ version: 1, position_type: "non_negotiable", supersedes: null }),
  }));

  assert.throws(
    () => validateManifest(classified, SCHEMA, { root: ROOT, validateProvenance: false, baseline: { positions: {} } }),
    /classified in the manifest but absent from the classification baseline/,
  );
});

test("reclassifying a position in either direction needs an explicit version and supersession", () => {
  for (const [from, to] of [["non_negotiable", "preference"], ["preference", "non_negotiable"]]) {
    const sameVersion = ledger(
      { version: 1, position_type: from, supersedes: null },
      { version: 2, position_type: to, supersedes: null },
    );
    sameVersion.positions[POSITION_KEY][1].version = 1;
    assert.throws(
      () => validateManifest(classifiedManifest(to), SCHEMA, { root: ROOT, validateProvenance: false, baseline: sameVersion }),
      /does not increment version past 1/,
      `${from} -> ${to} at the same version`,
    );

    const versionedOnly = ledger(
      { version: 1, position_type: from, supersedes: null },
      { version: 2, position_type: to, supersedes: null },
    );
    assert.throws(
      () => validateManifest(classifiedManifest(to, { version: 2 }), SCHEMA, {
        root: ROOT, validateProvenance: false, baseline: versionedOnly,
      }),
      new RegExp(`position ${POSITION_KEY.replace(/\./g, "\\.")} moves from ${from} to ${to} without a supersession record`),
      `${from} -> ${to} with a version bump but no supersession`,
    );

    const wrongKey = structuredClone(versionedOnly);
    wrongKey.positions[POSITION_KEY][1].supersedes = `${CARRYING_ID}@v1`;
    assert.throws(
      () => validateManifest(classifiedManifest(to, { version: 2, supersedes: `${CARRYING_ID}@v1` }), SCHEMA, {
        root: ROOT, validateProvenance: false, baseline: wrongKey,
      }),
      /without a supersession record naming/,
      `${from} -> ${to} superseding the carrying item id instead of the durable position key`,
    );

    const recorded = structuredClone(versionedOnly);
    recorded.positions[POSITION_KEY][1].supersedes = `${POSITION_KEY}@v1`;
    assert.doesNotThrow(
      () => validateManifest(classifiedManifest(to, { version: 2, supersedes: `${POSITION_KEY}@v1` }), SCHEMA, {
        root: ROOT, validateProvenance: false, baseline: recorded,
      }),
      `${from} -> ${to} with both a version bump and a supersession record`,
    );
  }
});

test("retiring a position tombstones it and re-adding one needs the supersession record", () => {
  const active = ledger({ version: 1, position_type: "non_negotiable", supersedes: null });
  const unclassified = buildManifestFromSources(sources(), { mode: "pre-cutover", metadata }).manifest;

  assert.throws(
    () => validateManifest(unclassified, SCHEMA, { root: ROOT, baseline: active }),
    /classified at v1 in the baseline but absent from the manifest; record its retirement/,
    "dropping a classified position without a tombstone is rejected",
  );

  const undocumentedTombstone = ledger(
    { version: 1, position_type: "non_negotiable", supersedes: null },
    { version: 2, retired: true, supersedes: null },
  );
  assert.throws(
    () => validateManifest(unclassified, SCHEMA, { root: ROOT, baseline: undocumentedTombstone }),
    /moves from non_negotiable to retired without a supersession record/,
  );

  const tombstone = ledger(
    { version: 1, position_type: "non_negotiable", supersedes: null },
    { version: 2, retired: true, supersedes: `${POSITION_KEY}@v1` },
  );
  assert.doesNotThrow(() => validateManifest(unclassified, SCHEMA, { root: ROOT, baseline: tombstone }));
  assert.throws(
    () => validateManifest(classifiedManifest("preference"), SCHEMA, {
      root: ROOT, validateProvenance: false, baseline: tombstone,
    }),
    /retired at v2 but is still classified in the manifest/,
  );

  const laundered = ledger(
    { version: 1, position_type: "non_negotiable", supersedes: null },
    { version: 2, retired: true, supersedes: `${POSITION_KEY}@v1` },
    { version: 3, position_type: "preference", supersedes: null },
  );
  assert.throws(
    () => validateManifest(classifiedManifest("preference", { version: 3 }), SCHEMA, {
      root: ROOT, validateProvenance: false, baseline: laundered,
    }),
    /moves from retired to preference without a supersession record/,
    "delete-then-re-add must not launder a softening past the guard",
  );

  const readded = structuredClone(laundered);
  readded.positions[POSITION_KEY][2].supersedes = `${POSITION_KEY}@v2`;
  assert.doesNotThrow(() => validateManifest(
    classifiedManifest("preference", { version: 3, supersedes: `${POSITION_KEY}@v2` }), SCHEMA,
    { root: ROOT, validateProvenance: false, baseline: readded },
  ));
});

test("a corrupted classification history is rejected rather than trusted", () => {
  const classified = classifiedManifest("non_negotiable");
  const corruptions = [
    [{ positions: { [POSITION_KEY]: [] } }, /has no entries/],
    [ledger({ version: 1, position_type: "non_negotiable", supersedes: `${POSITION_KEY}@v0` }), /predates its own history/],
    [ledger({ version: 0, position_type: "non_negotiable", supersedes: null }), /non-versioned entry/],
    [ledger({ version: 1, position_type: "nice_to_have", supersedes: null }), /unknown position_type/],
    [ledger({ version: 2, position_type: "non_negotiable", supersedes: null }), /v1 in the manifest but v2 in the classification baseline/],
    [ledger({ version: 1, position_type: "preference", supersedes: null }), /non_negotiable in the manifest but preference in the classification baseline/],
    [ledger({ version: 1, position_type: "non_negotiable", supersedes: `${POSITION_KEY}@v1` }), /predates its own history/],
  ];
  for (const [baseline, expected] of corruptions) {
    assert.throws(
      () => validateManifest(classified, SCHEMA, { root: ROOT, validateProvenance: false, baseline }),
      expected,
      JSON.stringify(baseline),
    );
  }
});

test("rewording the authored sentence rotates the item id but not the position identity", () => {
  const input = sources();
  const beforeId = "healthcare.w01.stated.the-registration-page-feels-slow";
  const afterId = "healthcare.w01.stated.the-registration-page-is-slow-for-the-front-desk";
  const reworded = {
    ...input,
    client: input.client.replace("The registration page feels slow.", "The registration page is slow for the front desk."),
  };
  assert.notEqual(reworded.client, input.client);

  const before = classifiedManifest("non_negotiable", { id: beforeId, input });
  assert.equal(before.items.find((item) => item.id === beforeId).stakeholder_context.position_key, POSITION_KEY);

  const after = classifiedManifest("preference", { id: afterId, input: reworded });
  assert.equal(after.items.some((item) => item.id === beforeId), false, "the display id rotated with the wording");
  assert.equal(after.items.find((item) => item.id === afterId).stakeholder_context.position_key, POSITION_KEY,
    "the durable position key did not rotate with the wording");

  const baseline = ledger(
    { version: 1, position_type: "non_negotiable", supersedes: null },
    { version: 1, position_type: "preference", supersedes: null },
  );
  assert.throws(
    () => validateManifest(after, SCHEMA, { root: ROOT, validateProvenance: false, baseline }),
    /does not increment version past 1/,
    "a wording change must not launder a softening past the guard",
  );

  const recorded = ledger(
    { version: 1, position_type: "non_negotiable", supersedes: null },
    { version: 2, position_type: "preference", supersedes: `${POSITION_KEY}@v1` },
  );
  const superseded = classifiedManifest("preference", {
    id: afterId, input: reworded, version: 2, supersedes: `${POSITION_KEY}@v1`,
  });
  assert.doesNotThrow(() => validateManifest(superseded, SCHEMA, {
    root: ROOT, validateProvenance: false, baseline: recorded,
  }));
});

const runCheck = (mode = "pre-cutover") => spawnSync(
  process.execPath,
  ["tools/expectations/build.mjs", "--mode", mode, "--check"],
  { cwd: ROOT, encoding: "utf8" },
);

test("CLI check is a drift guard and reports generated counts", () => {
  const run = runCheck();
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /packet=\d+ schedule=\d+ track=\d+ total=\d+/);
});

test("CLI check fails when the committed manifest no longer matches the sources", () => {
  const manifestPath = join(ROOT, "content/expectations.v1.json");
  const committed = readFileSync(manifestPath, "utf8");
  try {
    const perturbed = JSON.parse(committed);
    perturbed.items[0].text = `${perturbed.items[0].text} (hand-edited)`;
    writeFileSync(manifestPath, `${JSON.stringify(perturbed, null, 2)}\n`);

    const drifted = runCheck();
    assert.equal(drifted.status, 1, drifted.stdout);
    assert.match(drifted.stderr, /expectations manifest drift detected/);
  } finally {
    writeFileSync(manifestPath, committed);
  }
  assert.equal(runCheck().status, 0, "the committed manifest is restored");
});
