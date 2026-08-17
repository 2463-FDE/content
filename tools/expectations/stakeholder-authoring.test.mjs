// Authored stakeholder positions (WP-2.6) — content checks that sit beside the
// generator without changing it: reciprocity and same-visibility of conflicts
// (AC-1.6.3), version bump on carrying items (AC-1.6.2), fictional-content and
// real-client-marker lint (AC-1.6.5), durable position keys, and S13 hygiene
// (no consent/resolution phrases in authored text). Fold into validateManifest
// when the content lane's validator follow-up lands.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (name) => JSON.parse(readFileSync(new URL(`../../${name}`, import.meta.url), "utf8"));
const overrides = read("tools/expectations/overrides.json");
const manifest = read("content/expectations.v1.json");
const markers = read("tools/expectations/real-client-markers.json");
const schema = read("expectations.v1.schema.json");

const positions = overrides.stakeholder_context || {};
const positionIds = Object.keys(positions);
const byId = new Map(manifest.items.map((item) => [item.id, item]));
const KEY_PATTERN = /^[a-z][a-z0-9-]*\.w[0-9]{2}\.(business|techlead)\.[a-z][a-z0-9-]*$/;
const FICTION_LABEL = /Fictional training-simulation position/;
// S13 consent/resolution/impersonation phrases (ADR-005 §3) — authored text must not
// hand the model these words to quote back as if a stakeholder had conceded.
const CONSENT_PHRASES = [
  /\bagreed\b/i, /\baccepted\b/i, /\bsigned off\b/i, /\bis fine with\b/i, /\bwill accept\b/i,
  /\bapproved\b/i, /\bno longer requires\b/i, /\bas the (cto|coo|cfo|client|technical lead), i\b/i,
];

function strings(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
  }
  return [];
}

test("authored positions exist only on learner-visible manifest items and carry every schema field", () => {
  assert.ok(positionIds.length > 0, "this test file exists because positions were authored");
  const required = schema.$defs.stakeholderContext.required;
  for (const id of positionIds) {
    const item = byId.get(id);
    assert.ok(item, `${id} resolves to a manifest item`);
    assert.equal(item.visibility, "learner", `${id} is learner-visible (trainer positions live in the trainer manifest)`);
    assert.deepEqual(item.stakeholder_context, positions[id], `${id} manifest position equals the authoring record`);
    for (const key of required) assert.ok(Object.hasOwn(positions[id], key), `${id}.${key} present`);
    assert.equal(item.owner_role, positions[id].stakeholder_role, `${id} owner_role matches the authored stakeholder_role`);
  }
});

test("AC-1.6.2 every carrying item bumped its version when its position was added", () => {
  for (const id of positionIds) {
    assert.ok(byId.get(id).version >= 2, `${id} version >= 2 (was 1 before authoring)`);
    assert.equal(overrides.versions?.[id], byId.get(id).version, `${id} version comes from overrides.json`);
  }
});

test("AC-1.6.3 every conflict is reciprocal, intra-week, same dimensions, same visibility, and resolves", () => {
  let ends = 0;
  const unorderedPairs = new Set();
  const pairsByProjectWeek = new Map();
  for (const id of positionIds) {
    const item = byId.get(id);
    for (const conflict of positions[id].conflicts) {
      const other = positions[conflict.with_id];
      assert.ok(other, `${id} conflicts with ${conflict.with_id}, which must carry an authored position`);
      const otherItem = byId.get(conflict.with_id);
      assert.equal(otherItem?.visibility, item.visibility, `${id} ↔ ${conflict.with_id} share visibility`);
      assert.equal(otherItem.project, item.project, `${id} ↔ ${conflict.with_id} are in the same project`);
      assert.equal(otherItem.week, item.week, `${id} ↔ ${conflict.with_id} are in the same week`);
      const back = other.conflicts.find((candidate) => candidate.with_id === id);
      assert.ok(back, `${conflict.with_id} names ${id} back`);
      assert.deepEqual([...back.dimensions].sort(), [...conflict.dimensions].sort(), `${id} ↔ ${conflict.with_id} same dimensions`);
      assert.ok(conflict.dimensions.length >= 2, `${id} ↔ ${conflict.with_id} spans at least two dimensions`);
      assert.notEqual(other.stakeholder_role, positions[id].stakeholder_role, `${id} ↔ ${conflict.with_id} is a cross-role conflict`);
      ends += 1;
      const key = `${item.project}.W${item.week}`;
      unorderedPairs.add([id, conflict.with_id].sort().join("↔"));
      pairsByProjectWeek.set(key, (pairsByProjectWeek.get(key) || new Set()).add([id, conflict.with_id].sort().join("↔")));
    }
  }
  assert.equal(ends, 2 * unorderedPairs.size, "every conflict pair is carried by exactly two reciprocal ends");
  for (const project of ["healthcare", "finance"]) {
    for (const week of [7, 8, 9, 10]) {
      const key = `${project}.W${week}`;
      assert.ok((pairsByProjectWeek.get(key)?.size ?? 0) >= 1, `${key} carries at least one intra-week conflict pair`);
    }
  }
});

test("AC-1.6.4 pilot weeks W7–W10 carry both roles and at least one conflict pair per project-week", () => {
  for (const project of ["healthcare", "finance"]) {
    for (const week of [7, 8, 9, 10]) {
      const inWeek = positionIds.filter((id) => byId.get(id).project === project && byId.get(id).week === week);
      const roles = new Set(inWeek.map((id) => positions[id].stakeholder_role));
      assert.ok(roles.has("client_business") && roles.has("client_technical_lead"), `${project} W${week} has both roles`);
      assert.ok(inWeek.some((id) => positions[id].conflicts.length > 0), `${project} W${week} has a conflict pair`);
    }
  }
});

test("AC-1.6.5 positions are labelled fictional and match no real-client marker; source is an authored page in this repo", () => {
  const patterns = markers.patterns.map((entry) => ({ ...entry, re: new RegExp(entry.regex, "u") }));
  for (const id of positionIds) {
    assert.match(positions[id].rationale, FICTION_LABEL, `${id} rationale carries the fictional-content label`);
    // Provenance is the authored page path (+ the durable source-content hash once the
    // content lane lands it); never a web page or model memory. Commit attestations are
    // being removed, so nothing here depends on an @commit suffix.
    assert.match(byId.get(id).source, /^[A-Za-z0-9_./-]+\.html#/, `${id} source is an authored page path in this repository`);
    for (const [path, value] of strings(positions[id])) {
      for (const pattern of patterns) {
        assert.doesNotMatch(value, pattern.re, `${id}.${path} matches real-client marker "${pattern.name}": ${value.slice(0, 80)}`);
      }
      assert.doesNotMatch(value, /[<>]/, `${id}.${path} has no HTML delimiters`);
      for (const phrase of CONSENT_PHRASES) {
        assert.doesNotMatch(value, phrase, `${id}.${path} avoids S13 consent/resolution phrase ${phrase}`);
      }
    }
  }
});

test("every authored position carries a durable, human-assigned key that is unique and wording-independent", () => {
  const keys = overrides.stakeholder_position_keys || {};
  for (const id of positionIds) {
    assert.ok(keys[id], `${id} has a durable key`);
    assert.match(keys[id], KEY_PATTERN, `${id} key "${keys[id]}" is <project>.w<NN>.<business|techlead>.<topic>`);
    const [project, week, role] = keys[id].split(".");
    assert.equal(project, byId.get(id).project, `${id} key project matches the carrying item`);
    assert.equal(Number(week.slice(1)), byId.get(id).week, `${id} key week matches the carrying item`);
    assert.equal(role, positions[id].stakeholder_role === "client_business" ? "business" : "techlead", `${id} key role matches`);
  }
  assert.equal(new Set(Object.values(keys)).size, Object.keys(keys).length, "durable keys are unique");
  assert.deepEqual(Object.keys(keys).sort(), positionIds.sort(), "keys and positions cover the same items");
});
