#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SCHEMA_PATH = resolve(ROOT, "expectations.v1.schema.json");
const OUTPUT_PATH = resolve(ROOT, "content/expectations.v1.json");
const OVERRIDES_PATH = resolve(ROOT, "tools/expectations/overrides.json");
const BASELINE_PATH = resolve(ROOT, "tools/expectations/classification-baseline.json");
const CLASSIFICATIONS = new Set(["non_negotiable", "preference"]);
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const PACKET_FIELDS = ["ask", "handover", "dig", "stated", "deliverable", "quota"];
const OWNER_DEFAULTS = {
  ask: "client",
  deliverable: "client",
  stated: "client",
  handover: "learner",
  dig: "learner",
  quota: "trainer",
};

export function extractAssignedLiteral(source, assignment) {
  const assignmentAt = source.indexOf(assignment);
  if (assignmentAt < 0) throw new Error(`Assignment not found: ${assignment}`);
  const equalsAt = source.indexOf("=", assignmentAt + assignment.length);
  if (equalsAt < 0) throw new Error(`Assignment has no value: ${assignment}`);

  let start = equalsAt + 1;
  while (/\s/.test(source[start] || "")) start++;
  const opening = source[start];
  if (opening !== "{" && opening !== "[") {
    throw new Error(`${assignment} must be assigned an object or array literal`);
  }
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; i++; continue; }
    if (char === "/" && next === "*") { blockComment = true; i++; continue; }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === opening) depth++;
    if (char === closing && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unbalanced literal for ${assignment}`);
}

function evaluateLiteral(source, assignment) {
  const literal = extractAssignedLiteral(source, assignment);
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1_000 });
}

const ENTITIES = {
  amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
  ndash: "–", mdash: "—", hellip: "…", rarr: "→", middot: "·",
};

export function stripHtml(value) {
  const learnerVisibleHtml = removeElementsByClass(String(value ?? ""), "trainer-only");
  return learnerVisibleHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) =>
      String.fromCodePoint(code[0].toLowerCase() === "x" ? Number.parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&([a-z]+);/gi, (entity, name) => ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);

function extractElementAt(html, start) {
  const opening = html.slice(start).match(/^<([a-z][a-z0-9-]*)\b[^>]*>/i);
  if (!opening) throw new Error(`Expected an HTML element at offset ${start}`);
  const tag = opening[1];
  if (VOID_TAGS.has(tag.toLowerCase())) return opening[0];
  const token = new RegExp(`<\\/?${escapeRegex(tag)}\\b[^>]*>`, "gi");
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(html))) {
    const isClose = /^<\//.test(match[0]);
    const isVoid = /\/>$/.test(match[0]);
    if (isClose) depth--;
    else if (!isVoid) depth++;
    if (depth === 0) return html.slice(start, token.lastIndex);
  }
  throw new Error(`Unclosed <${tag}> element`);
}

function extractElementById(html, id) {
  const opening = new RegExp(`<([a-z][a-z0-9-]*)\\b[^>]*\\bid=(['"])${escapeRegex(id)}\\2[^>]*>`, "i").exec(html);
  if (!opening) throw new Error(`Element not found: #${id}`);
  return extractElementAt(html, opening.index);
}

function extractElementsByClass(html, className, tag = "[a-z][a-z0-9-]*") {
  const opening = new RegExp(`<(${tag})\\b[^>]*\\bclass=(?:(['"])([^'"]*)\\2|([^\\s>]+))[^>]*>`, "gi");
  const elements = [];
  let match;
  while ((match = opening.exec(html))) {
    const classList = match[3] ?? match[4] ?? "";
    if (!classList.trim().split(/\s+/).includes(className)) continue;
    elements.push(extractElementAt(html, match.index));
  }
  return elements;
}

function removeElementsByClass(html, className) {
  let output = html;
  for (const element of extractElementsByClass(html, className)) output = output.replace(element, " ");
  return output;
}

function classText(html, className) {
  const [element] = extractElementsByClass(html, className);
  if (!element) throw new Error(`Element not found: .${className}`);
  return stripHtml(element);
}

function slug(value) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function idSlug(text) {
  const base = slug(text);
  if (!base) throw new Error(`Authored entry has no addressable text: ${JSON.stringify(text).slice(0, 60)}`);
  if (base.length <= 48) return base;
  const trimmed = base.slice(0, 48).replace(/-[^-]*$/, "").replace(/-+$/, "");
  return `${trimmed || base.slice(0, 48)}-${sha256(text).slice(0, 8)}`;
}

function sourceRef(file, path, hash) {
  return `${file}#${path}@sha256:${hash}`;
}

function stakeholderContextFor(metadata, id) {
  const context = metadata.stakeholder_context?.[id];
  if (!context) return null;
  if (Object.hasOwn(context, "position_key")) {
    throw new Error(`stakeholder_context for ${id} must not inline position_key; author it in stakeholder_position_keys`);
  }
  const positionKey = metadata.stakeholder_position_keys?.[id];
  if (!positionKey) {
    throw new Error(`stakeholder_context for ${id} has no stakeholder_position_keys entry`);
  }
  return { position_key: positionKey, ...context };
}

function makeItem(metadata, values) {
  const id = values.id;
  return {
    ...values,
    text: stripHtml(values.text),
    visibility: "learner",
    owner_role: metadata.owner_roles?.[id] || values.owner_role,
    supersedes: metadata.supersedes?.[id] || null,
    version: metadata.versions?.[id] || 1,
    stakeholder_context: stakeholderContextFor(metadata, id),
  };
}

function packetItems(client, metadata, hash) {
  const items = [];
  for (const project of Object.keys(client).sort()) {
    const weeks = client[project]?.weeks || {};
    for (const weekText of Object.keys(weeks).map(Number).sort((a, b) => a - b)) {
      const packet = weeks[weekText];
      for (const field of PACKET_FIELDS) {
        if (packet[field] == null) continue;
        const isList = Array.isArray(packet[field]);
        const values = isList ? packet[field] : [packet[field]];
        values.forEach((text, index) => {
          const idSuffix = isList ? `.${idSlug(text)}` : "";
          const pathSuffix = isList ? `.${index + 1}` : "";
          const id = `${project}.w${String(weekText).padStart(2, "0")}.${field}${idSuffix}`;
          items.push(makeItem(metadata, {
            id,
            project,
            week: weekText,
            field,
            text,
            owner_role: OWNER_DEFAULTS[field],
            effective_from: { week: weekText, day: "mon" },
            effective_to: metadata.persistent?.includes(id) ? null : { week: weekText, day: "sun" },
            source: sourceRef("client-delivery.html", `window.CLIENT.${project}.weeks.${weekText}.${field}${pathSuffix}`, hash),
          }));
        });
      }
    }
  }
  return items;
}

function scheduleItems(weeks, metadata, hash) {
  const items = [];
  weeks.forEach((week, weekIndex) => {
    (week.days || []).forEach((day, dayIndex) => {
      const dayName = DAYS[dayIndex];
      if (!dayName) throw new Error(`Week ${week.w} has more than seven schedule days`);
      const id = `schedule.w${String(week.w).padStart(2, "0")}.${dayName}`;
      const detail = day.s ? `: ${stripHtml(day.s)}` : "";
      items.push(makeItem(metadata, {
        id,
        project: "schedule",
        week: week.w,
        field: "schedule",
        text: `${dayName[0].toUpperCase()}${dayName.slice(1)} — ${stripHtml(day.t)}${detail}`,
        owner_role: "trainer",
        effective_from: { week: week.w, day: dayName },
        effective_to: { week: week.w, day: dayName },
        source: sourceRef("index.html", `window.WEEKS.${weekIndex}.days.${dayIndex}`, hash),
      }));
    });
  });
  return items;
}

function trackItems(delivery, metadata, hash) {
  const items = [];
  const add = (topic, itemSlug, field, text, path) => {
    const id = `track.${topic}.${itemSlug}`;
    items.push(makeItem(metadata, {
      id,
      project: "track",
      week: { from: 7, to: 10 },
      field,
      text,
      owner_role: "trainer",
      effective_from: { week: 7, day: "mon" },
      effective_to: null,
      source: sourceRef("delivery-track.html", path, hash),
    }));
  };

  const cadenceIds = ["rt-mon", "rt-tue", "rt-wed", "rt-thu", "rt-fri", "rt-any"];
  const cadenceSlugs = ["mon-steering", "tue-respec", "wed-number", "thu-fri-build", "fri-premortem", "weekly-translation"];
  cadenceIds.forEach((id, index) => {
    let element;
    try { element = extractElementById(delivery, id); } catch { return; }
    add("cadence", cadenceSlugs[index], "cadence", `${classText(element, "dt-t")} ${classText(element, "dt-s")}`, id);
  });

  let rubric;
  try { rubric = extractElementById(delivery, "rubric"); } catch { rubric = ""; }
  if (rubric) {
    try { add("rubric", "pass-bar", "rubric", classText(rubric, "dt-bar"), "rubric.pass-bar"); } catch { /* optional in fixture */ }
    extractElementsByClass(rubric, "dt-dim", "details").forEach((dimension) => {
      const name = classText(dimension, "dnm");
      const score = classText(dimension, "dt-score");
      add("rubric", slug(name), "rubric", `${name}. ${score}`, `rubric.${slug(name)}`);
    });
  }

  let blocker;
  try { blocker = extractElementById(delivery, "blocker"); } catch { blocker = ""; }
  const blockerSlugs = {
    item: "item", what: "whats-blocked", why: "why", likely: "likely", bad: "bad-case",
    action: "unblocking-action", owner: "owner-person", meanwhile: "meanwhile", convert: "conversion-date",
  };
  if (blocker) {
    extractElementsByClass(blocker, "row", "div").forEach((row) => {
      const fieldMatch = row.match(/data-f=(['"])bc\.([a-z]+)\1/i);
      if (!fieldMatch || !blockerSlugs[fieldMatch[2]]) return;
      add("blocker-card", blockerSlugs[fieldMatch[2]], "blocker-card", classText(row, "lb"), `blocker.${fieldMatch[2]}`);
    });
  }

  try {
    const premortem = extractElementById(delivery, "premortem");
    const heading = stripHtml((premortem.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i) || ["Demo pre-mortem"])[0]);
    add("pre-mortem", "demo", "pre-mortem", `${heading}. ${classText(premortem, "lede")}`, "premortem");
  } catch { /* optional in fixture */ }

  return items;
}

function assertTrainerFields(client, alt, mode) {
  const leaks = [];
  for (const [project, data] of Object.entries(client || {})) {
    for (const [week, packet] of Object.entries(data?.weeks || {})) {
      for (const field of ["hidden", "facilitator"]) {
        if (Object.hasOwn(packet, field)) leaks.push(`window.CLIENT.${project}.weeks.${week}.${field}`);
      }
    }
  }
  for (const [week, entry] of Object.entries(alt || {})) {
    if (Object.hasOwn(entry, "trainer")) leaks.push(`window.ALT.${week}.trainer`);
  }
  if (mode === "post-cutover" && leaks.length) {
    throw new Error(`Post-cutover source contains trainer-only fields: ${leaks.join(", ")}`);
  }
}

function resolveRef(schema, root) {
  const path = schema.$ref.slice(2).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  return path.reduce((value, part) => value?.[part], root);
}

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function checkSchema(value, schema, root, path = "manifest") {
  if (schema.$ref) return checkSchema(value, resolveRef(schema, root), root, path);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => {
      try { checkSchema(value, candidate, root, path); return true; } catch { return false; }
    });
    if (matches.length !== 1) throw new Error(`${path} must match exactly one schema`);
  }
  if (schema.anyOf) {
    const matches = schema.anyOf.some((candidate) => {
      try { checkSchema(value, candidate, root, path); return true; } catch { return false; }
    });
    if (!matches) throw new Error(`${path} does not match an allowed schema`);
  }
  if (schema.const !== undefined && value !== schema.const) throw new Error(`${path} must equal ${schema.const}`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} must be one of ${schema.enum.join(", ")}`);
  if (schema.type && !typeMatches(value, schema.type)) throw new Error(`${path} must be ${schema.type}`);
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) throw new Error(`${path} is too short`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) throw new Error(`${path} does not match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${path} is below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`${path} exceeds ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) throw new Error(`${path} needs at least ${schema.minItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) throw new Error(`${path} items must be unique`);
    if (schema.items) value.forEach((item, index) => checkSchema(item, schema.items, root, `${path}[${index}]`));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      if (!Object.hasOwn(value, required)) throw new Error(`${path}.${required} is required`);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      const extra = Object.keys(value).find((key) => !allowed.has(key));
      if (extra) throw new Error(`${path}.${extra} is not allowed`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) checkSchema(value[key], childSchema, root, `${path}.${key}`);
    }
  }
}

function verifySource(root, source, hashes) {
  const match = source.match(/^([^#]+)#.+@sha256:([0-9a-f]{64})$/);
  if (!match) throw new Error(`Invalid source provenance: ${source}`);
  const [, file, hash] = match;
  const repoRoot = resolve(root);
  const absolute = resolve(repoRoot, file);
  if (absolute !== repoRoot && !absolute.startsWith(repoRoot + sep)) throw new Error(`Source escapes repository: ${file}`);
  let actual = hashes?.get(absolute);
  if (actual === undefined) {
    let content;
    try { content = readFileSync(absolute, "utf8"); } catch { throw new Error(`Source file does not exist: ${file}`); }
    actual = sha256(content);
    hashes?.set(absolute, actual);
  }
  if (actual !== hash) {
    throw new Error(`Source file ${file} no longer matches its pinned content hash ${hash}; regenerate the manifest`);
  }
}

function classifiedPositions(manifest) {
  const positions = new Map();
  for (const item of manifest.items || []) {
    const context = item.stakeholder_context;
    if (!context) continue;
    if (positions.has(context.position_key)) {
      throw new Error(`duplicate position_key: ${context.position_key}`);
    }
    positions.set(context.position_key, { position_type: context.position_type, item });
  }
  return positions;
}

function ledgerState(entry) {
  return entry.retired ? "retired" : entry.position_type;
}

function assertLedgerIsAppendOnly(key, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`classification baseline for ${key} has no entries`);
  }
  if (entries[0].supersedes != null) {
    throw new Error(`classification baseline for ${key} supersedes a record that predates its own history`);
  }
  entries.forEach((entry, index) => {
    if (!Number.isInteger(entry.version) || entry.version < 1) {
      throw new Error(`classification baseline for ${key} has a non-versioned entry`);
    }
    if (!entry.retired && !CLASSIFICATIONS.has(entry.position_type)) {
      throw new Error(`classification baseline for ${key} has an unknown position_type: ${entry.position_type}`);
    }
    if (index === 0) return;
    const prior = entries[index - 1];
    if (entry.version <= prior.version) {
      throw new Error(`classification baseline for ${key} does not increment version past ${prior.version}`);
    }
    if (ledgerState(entry) === ledgerState(prior)) return;
    const change = `position ${key} moves from ${ledgerState(prior)} to ${ledgerState(entry)}`;
    if (entry.supersedes !== `${key}@v${prior.version}`) {
      throw new Error(`${change} without a supersession record naming ${key}@v${prior.version}`);
    }
  });
}

function assertClassificationMatchesBaseline(baseline, manifest) {
  const positions = classifiedPositions(manifest);
  const recorded = baseline?.positions || {};
  for (const [key, entries] of Object.entries(recorded)) {
    assertLedgerIsAppendOnly(key, entries);
    const current = entries[entries.length - 1];
    const live = positions.get(key);
    if (current.retired) {
      if (live) throw new Error(`position ${key} is retired at v${current.version} but is still classified in the manifest`);
      continue;
    }
    if (!live) {
      throw new Error(`position ${key} is classified at v${current.version} in the baseline but absent from the manifest; record its retirement`);
    }
    if (live.position_type !== current.position_type) {
      throw new Error(`position ${key} is ${live.position_type} in the manifest but ${current.position_type} in the classification baseline`);
    }
    if (live.item.version !== current.version) {
      throw new Error(`position ${key} is v${live.item.version} in the manifest but v${current.version} in the classification baseline`);
    }
    if ((live.item.supersedes ?? null) !== (current.supersedes ?? null)) {
      throw new Error(`position ${key} carries supersedes ${live.item.supersedes} in the manifest but ${current.supersedes} in the classification baseline`);
    }
  }
  for (const key of positions.keys()) {
    if (!Object.hasOwn(recorded, key)) {
      throw new Error(`position ${key} is classified in the manifest but absent from the classification baseline`);
    }
  }
}

export function validateManifest(manifest, schema, { root, validateProvenance = true, baseline } = {}) {
  checkSchema(manifest, schema, schema);
  const ids = new Set();
  const hashes = new Map();
  for (const item of manifest.items) {
    if (ids.has(item.id)) throw new Error(`duplicate id: ${item.id}`);
    ids.add(item.id);
    if (/[<>]/.test(item.text)) throw new Error(`${item.id}.text contains HTML delimiters`);
    if (validateProvenance && root) verifySource(root, item.source, hashes);
  }
  if (manifest.items.some((item) => item.visibility !== "learner") && manifest.items.some((item) => item.visibility === "learner")) {
    throw new Error("A manifest cannot mix learner and trainer visibility");
  }
  classifiedPositions(manifest);
  if (baseline) assertClassificationMatchesBaseline(baseline, manifest);
  return manifest;
}

function assertOverridesAreBound(metadata, ids) {
  const bindings = [
    ["owner_roles", Object.keys(metadata.owner_roles || {})],
    ["versions", Object.keys(metadata.versions || {})],
    ["supersedes", Object.keys(metadata.supersedes || {})],
    ["stakeholder_context", Object.keys(metadata.stakeholder_context || {})],
    ["stakeholder_position_keys", Object.keys(metadata.stakeholder_position_keys || {})],
    ["persistent", metadata.persistent || []],
  ];
  for (const [name, keys] of bindings) {
    for (const key of keys) {
      if (!ids.has(key)) throw new Error(`${name} override references unknown expectation id: ${key}`);
    }
  }
}

export function buildManifestFromSources(sources, options = {}) {
  const mode = options.mode || "pre-cutover";
  if (!new Set(["pre-cutover", "post-cutover"]).has(mode)) throw new Error(`Unknown mode: ${mode}`);
  const metadata = options.metadata;
  if (!metadata) throw new Error("Manifest metadata is required");

  const client = evaluateLiteral(sources.client, "window.CLIENT");
  const weeks = evaluateLiteral(sources.weeks, "window.WEEKS");
  let alt = {};
  try { alt = evaluateLiteral(sources.alt || "", "window.ALT"); } catch (error) {
    if (mode === "post-cutover") throw error;
  }
  assertTrainerFields(client, alt, mode);

  const packets = packetItems(client, metadata, sha256(sources.client));
  const schedule = scheduleItems(weeks, metadata, sha256(sources.weeks));
  const track = trackItems(sources.delivery, metadata, sha256(sources.delivery));
  assertOverridesAreBound(metadata, new Set([...packets, ...schedule, ...track].map((item) => item.id)));
  const manifest = {
    schema: "fde.expectations/v1",
    reviewed_by_role: metadata.reviewed_by_role,
    items: [...packets, ...schedule, ...track].sort((a, b) => a.id.localeCompare(b.id)),
  };
  const schema = options.schema || JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  validateManifest(manifest, schema, {
    root: options.root || ROOT,
    validateProvenance: options.validateProvenance !== false,
    baseline: options.baseline,
  });
  if (manifest.items.some((item) => item.visibility !== "learner")) {
    throw new Error("Public learner manifest contains a trainer-visible item");
  }
  return {
    manifest,
    counts: { packet: packets.length, schedule: schedule.length, track: track.length },
  };
}

function parseArgs(argv) {
  const parsed = { mode: "pre-cutover", check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") parsed.check = true;
    else if (argv[i] === "--mode") parsed.mode = argv[++i];
    else if (argv[i].startsWith("--mode=")) parsed.mode = argv[i].slice(7);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!new Set(["pre-cutover", "post-cutover"]).has(parsed.mode)) {
    throw new Error("--mode must be pre-cutover or post-cutover");
  }
  return parsed;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const metadata = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
  const sourceFiles = {
    client: readFileSync(resolve(ROOT, "client-delivery.html"), "utf8"),
    weeks: readFileSync(resolve(ROOT, "index.html"), "utf8"),
    delivery: readFileSync(resolve(ROOT, "delivery-track.html"), "utf8"),
    alt: readFileSync(resolve(ROOT, "alt-research.html"), "utf8"),
  };
  let committed = "";
  try { committed = readFileSync(OUTPUT_PATH, "utf8"); } catch { /* first generation has no prior manifest */ }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

  const { manifest, counts } = buildManifestFromSources(sourceFiles, { mode: args.mode, metadata, root: ROOT, baseline });
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  const countText = `packet=${counts.packet} schedule=${counts.schedule} track=${counts.track} total=${manifest.items.length}`;

  if (args.check) {
    if (committed !== output) {
      console.error(`expectations manifest drift detected (${countText}); run node tools/expectations/build.mjs --mode ${args.mode}`);
      process.exitCode = 1;
      return;
    }
    console.log(`expectations manifest is current (${countText})`);
    return;
  }
  writeFileSync(OUTPUT_PATH, output);
  console.log(`wrote content/expectations.v1.json (${countText})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runCli(); }
  catch (error) {
    console.error(`expectations build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
