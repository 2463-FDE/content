# Week Fan-out Plan — Weeks 2-10

How we author the rest of the FDE curriculum (readings + interview questions) the
same way we built Week 1, but parallelized and grounded against current tech.

Status: PLAN (Week 1 is the live reference implementation).

---

## Why this exists

Week 1 was hand-built. Weeks 2-10 are ~45 more reading-days plus interview
questions. Authoring that from a model's training memory produces **plausible but
stale** content — the model defaults to deprecated APIs (LangChain pre-1.0 chains,
old agent patterns) because that's what dominated its training data. The whole
point of this workflow is to make currency a hard gate, not a hope.

Two non-negotiables fall out of that:

1. **Research-first.** Every day is grounded by `/web-research` before a word is
   authored. The research artifact is the source of truth; authoring agents cite
   *only* from it, never from memory.
2. **Citations survive into the reading.** Learners get the source URLs as a
   deeper-dive avenue, and we get an auditable trail to re-check when libraries
   move. (Week 1 shipped without this — see Retrofit below.)

---

## Per-week pipeline

```
Week W
├─ 1. RESEARCH (gate) — /web-research per day's topics
│     → pull current docs into the second-brain
│     → output: docs/research/wWW/dN.md  (claims + source URLs + version stamp)
│     ⛔ no authoring until this file exists.
│
├─ 2. AUTHOR readings (parallel, 1 agent/day)
│     → weeks/wWW/dN.html — cites ONLY from step-1 research
│     → <meta fde-day> + <meta fde-concepts> + Sources block (template v2)
│
├─ 3. AUTHOR questions (parallel, per concept-group)
│     → backend BANK, tagged concepts:[...] + day:"wWWdN"
│     → grounded in the same research (no deprecated-API questions)
│
├─ 4. WIRE shared files (serial, one pass)
│     → index.html WEEKS[] · app.js CURRICULUM_DAYS · progress.js ORDER
│
└─ 5. DEPLOY + VERIFY
      → git push (FE) · wrangler deploy (BE)
      → smoke: ?day=wWWdN scopes right · cards uniform · progress backfills
      → currency check: do the cited URLs actually say what the reading claims?
```

### Parallel vs serial

| Work | Parallelism | Note |
|------|-------------|------|
| Research (1) | per-day | the gating, expensive part |
| Readings (2) | per-day | blocked on that day's research |
| BANK questions (3) | per-concept | blocked on research, not on readings |
| WEEKS / CURRICULUM_DAYS / progress ORDER | **serial** | 3 shared files = merge points, edit once per week |
| SD scenarios | done | backend, domain-based, not weekly |

The research gate is what makes fan-out safe. Without it, parallel authoring just
multiplies stale content faster.

---

## The research artifact contract

`docs/research/wWW/dN.md`, one per reading-day:

```markdown
# wWWdN — <topic>
version-stamps:
  - langchain: v1.0 (verified 2026-06)
  - <lib>: <version> (verified <date>)

## Claims (each MUST carry a source)
- <claim> — [source](url)
- ...

## Sources (canonical, stable URLs preferred)
- <title> — <url>
```

Rules:
- Prefer primary/official docs and papers over blog posts.
- Stamp the library version + verification date. If a model wants to write an API
  call, it must match the stamped version, not its training default.
- Second-brain: route every `/web-research` pull into the vault so later weeks
  reuse it instead of re-fetching.

---

## Reading template v2 (Sources block)

Every reading ends with a Sources block before `</article>`:

```html
<section class="reading-sources" aria-label="Sources and deeper dive">
  <h2>Sources &amp; deeper dive</h2>
  <ul>
    <li><a href="URL" target="_blank" rel="noopener">Title</a> — one-line why-it-matters.</li>
  </ul>
</section>
```

CSS lives in `assets/css/style.css` (`.reading-sources`). d1.html is the worked
reference. Retrofit covers the other 7 Week-1 pages.

---

## Curriculum tech-gap review

Confirming the curriculum as it stands in `index.html` `WEEKS[]`, and flagging
related/current tech that looks missing. **Correct me where my read is wrong.**

| Week | Topic (as written) | Likely-missing / currency flags |
|------|--------------------|---------------------------------|
| W1 | LLM Engineering for Production | Solid. Could name prompt caching + structured outputs explicitly. |
| W2 | RAG & Knowledge Retrieval | Pinecone/Chroma/pgvector stay — good teaching choices. Optional: rerankers (Cohere rerank / cross-encoders) + a nod to GraphRAG (ties to W4). |
| W3 | Single-Agent Design & Memory | **LangChain v1.0** currency risk is highest here. **Add MCP (Model Context Protocol)** to the LangChain v1 material — it's the current standard tool/context interface. Prefer provider-native tool use over old LC tool wrappers. |
| W4 | Multi-Agent & Knowledge Graphs | LangGraph persistence/checkpointers. Neo4j is the standard KG database to teach. |
| W5 | Spec-Driven Dev & Problem Scoping | Aligns with our own GSD/spec workflow. Light gap — maybe name a spec framework (spec-kit). |
| W6 | AI-Augmented SDLC | **Add coding agents — focus on Claude Code**, mention/relate Cursor/Aider. Core FDE tooling. Brownfield/LEGMOD is good. |
| W7 | Observability, SRE & Guardrails | **LangSmith stays core.** Langfuse/Phoenix go to Alt research (see below), not duplicate core. Optional: OpenTelemetry GenAI conventions. |
| W8 | Security, Governance & Responsible AI | Anchor on **OWASP LLM Top 10** as the framework. Guardrails frameworks (NeMo Guardrails / Guardrails AI) alongside LLM Guard/Presidio. |
| W9-10 | Client Specialization / Showcase | **Placeholders.** No client yet; assume healthcare + finance persist. Expect to know the real client by ~W6-7, then run this same fan-out with domain-updated topics. Possible client-specific brownfield project for W9-10 — handle when/if it comes up. |

### Alt-research day topics (Wed of W1-8)

The Wed Alt-research day is where we surface alternatives to the week's core tool
so learners see the landscape, not just our pick:

- **W3 / W4 (LangChain / LangGraph weeks):** alt agent frameworks — CrewAI,
  AutoGen, OpenAI Agents SDK — vs LangChain/LangGraph.
- **W7 (Observability):** alt eval/trace platforms — Langfuse, Arize Phoenix,
  Helicone — vs LangSmith.

Cross-cutting theme: teach **the current standard** (MCP, LangChain v1.0) and our
primary pick per area, with alternatives parked in Alt research — not the
generic/older defaults a model reaches for first.

---

## Shared-file wiring (the serial step)

Each week appends to three files. Keep these edits in one commit per week to keep
merges clean:

1. `index.html` → `window.WEEKS[]` — day entries (`t`, `s`, `href` or `parts[]`,
   `fde:true` on the FDE-situation day, `star:true` on the milestone day).
2. `assets/gauntlet/js/app.js` → `CURRICULUM_DAYS` — interview focus options
   (`{v:"wWWdN", t:"Week W · Day N"}`), in cumulative order.
3. `assets/js/progress.js` → `ORDER` — day ids in sequence (drives
   Start/Resume/✓ backfill).

Cache-buster: bump `?v=` in `gauntlet.html` on any gauntlet asset change.

---

## Open follow-ups

- [ ] Retrofit Sources block onto the other 7 Week-1 readings (d2a, d2b, d3a,
      d3b, d4a, d4b, d5) — each needs its own source verification.
- [ ] Confirm tech-gap additions per week (table above) before research starts.
- [ ] Decide W9-10 once the client is known (~W6-7).
