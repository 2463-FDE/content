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

## Established metrics (the spec critics enforce)

Derived from the Week-1 readings — this is the gold standard new weeks must match.

| Metric | Target | Source of truth |
|--------|--------|-----------------|
| Reading rate | **150 wpm** | every page meta line |
| Reading time / day | **16-20 min** core (~2,400-3,000 words prose) | meta lines (~16-20 min) |
| Scrolly steps / reading | **7-9** `.step` sections | W1 pages (d1 = 9 steps) |
| Diagram binding | every `.step` carries `data-diagram`/`data-step`; one live `#diagram` | shared `diagram.js` + `scrolly.js` |
| Interactive | ≥1 `ix-run` "try it" block | `interactive.js` |
| Comprehension check | **6 questions**, ~4-5 min, practice (not graded) | `quiz.js` modal |
| Deep dive | 1 optional modal, ~10 min | `modals.js` |
| Citations | Sources block, every URL 200, claims trace to research artifact | template v2 |

---

## Workflow v2 — gated fan-out with repass loops (CANONICAL RUN SPEC)

This supersedes the basic pipeline above. One orchestrated run covers **all weeks
at once** (scope: **W2-8**; W9-10 deferred until the client is known). Sub-agents
do the work; the organizer terminal only tracks status.

### Run config (confirmed 2026-06-29)

- **Deploy gate:** auto-deploy (git push + wrangler) ONLY if the run finishes with
  zero flagged items; if anything hit the 3-pass flag, stop before deploy for
  human review.
- **Day structure:** single reading page per day by default, but authors MAY split
  a dense day into a/b parts (like W1's d2a/d2b) where the topic warrants it.
- **Question volume:** per-concept, not per-day (see Interview question bank model).

### Interview question bank model

The interview pulls **10 questions per session** (`pickQuestions().slice(0,10)`)
from the cumulative in-scope pool. `WEAK_TARGET=4` of those 10 are pulled from the
learner's OPEN weak concepts (the seedWeakConcepts loop); `WEAK_PASS=70` clears a
concept. So coverage is a **per-concept** number:

- **Target: ≥4 questions per technical concept-id** — one per weak slot, so a weak
  concept resurfaces 4 distinct questions before repeating.
- New weeks add **technical** concepts only; behavioral/fde-mindset concepts are
  week-0, shared across all weeks, already rich.
- Per week ≈ (new technical concepts) × 4 ≈ **20-30 new questions/week**.
- ⚠ W1 is currently UNDER this bar (context-window=1, knowledge-graph=1,
  model-selection/prompt-engineering/token-optimization/output-guardrails=2 each).
  Backfill W1 thin concepts to ≥4 alongside the run.

### Phase shape (all weeks, one run)

```
Phase 1 — RESEARCH        45→35 day-agents in parallel (W2-8 = 35 reading-days)
   each: /web-research → docs/research/wWW/dN.md → persist to second-brain
   └─ GATE A (research critic) with repass loop

Phase 2 — AUTHOR (parallel, each gated on its own research)
   2a readings:   1 agent/day → weeks/wWW/dN.html
        └─ GATE B (reading metrics + citation) + GATE C (design/diagram) repass loops
   2b questions:  1 agent/concept → ≥4 STRUCTURED question objects per concept
        (returned, not written inline — avoids parallel edits to the single
        backend file); proposes new concept-ids for the CONCEPTS taxonomy
        └─ GATE D (question critic) repass loop

Phase 3 — WIRE shared single-files (SERIAL, one pass, all weeks in order)
   index.html WEEKS[] · app.js CURRICULUM_DAYS · progress.js ORDER ·
   backend/src/index.js CONCEPTS (new concept-ids) + BANK (Phase-2b questions)
   → these are single files; parallel edits collide, so one serial pass appends
     W2..W8 in sequence.

Phase 4 — GATE E (integration) + final report → DEPLOY (conditional)
   smoke per week: ?day=wWWdN scopes · cards uniform · progress backfills · links 200
   deploy ONLY if zero flagged items (else stop for review):
     git push (FE) · wrangler deploy (BE)
```

Parallel-safe (own file each): research artifacts, reading pages.
Serial (single shared file): WEEKS[], CURRICULUM_DAYS, progress ORDER, backend BANK.

### Repass loop (every gate)

```
generate(artifact)
for pass in 1..3:
    verdict = critic(artifact)          # critic ≠ author (no self-rubber-stamp)
    if verdict.pass: stop
    if pass == 3:
        flag_for_review(artifact, verdict, attempt_history)   # do NOT block the run
        stop
    regenerate(artifact, verdict.critiques)   # take the critiques, fix what failed
```

Critic findings drive regeneration until requirements are met. **Max 3 passes**,
then the item is flagged for end-of-run human review with a summary of what was
attempted — it does not stall the rest of the fan-out.

### Critics

| Gate | Critic | Checks | On fail |
|------|--------|--------|---------|
| **A** | Research | every claim has a 200 source URL; library version stamped + current (no deprecated APIs, e.g. LangChain pre-1.0); web-research actually run; pull saved to second-brain | repass: re-research the gap |
| **B** | Reading metrics + citation | 2,400-3,000 words → 16-20 min @150 wpm; 7-9 steps; 6-Q check + deep-dive present; every claim traces to the research artifact (no invented facts); Sources block present, all URLs 200 | repass: trim/expand, re-cite |
| **C** | Design / live-diagram | pull W1 readings as the reference design set; scrolly steps each bound to a *meaningful* diagram step (diagram drives the concept, not decoration); consistent components/classes; comparable interaction density; **browser screenshot-diff vs a W1 exemplar** for layout/hierarchy/AI-slop | repass: rework diagram/layout to match exemplar |
| **D** | Question | **≥4 questions per technical concept-id** (feeds WEAK_TARGET=4 without repeats); tagged to correct concept-ids; grounded in research (no deprecated-API questions); difficulty spread; new concept-ids added to backend CONCEPTS taxonomy | repass: author more / re-tag |
| **E** | Integration | `?day=wWWdN` scopes right; cards uniform; progress backfills; all new links 200 | fix wiring (serial) |

### Organizer ↔ sub-agent reporting contract

Sub-agents return to this terminal ONLY a compact record — never file contents or
full critiques (keeps the organizer context lean across a 35-day run):

```json
{
  "task": "w03d2 reading",
  "status": "done | flagged",
  "passes": 2,
  "flags": ["..."],          // present only when status=flagged
  "summary": "one short paragraph: what was produced + key decisions"
}
```

The organizer aggregates these into a final run report: per-task status table,
the flagged items (with attempt summaries) needing human review, and a one-line
summary per task. Everything else stays in the sub-agents.

---

## Open follow-ups

- [x] Retrofit Sources block onto all 7 remaining Week-1 readings (done; URLs
      normalized to canonical, all 200).
- [x] Confirm tech-gap additions per week (confirmed 2026-06-29).
- [ ] Build the W2-8 run as a Workflow script implementing the phases + repass
      loops + reporting contract above. Run only on explicit go.
- [ ] Backfill W1 thin technical concepts to ≥4 questions each (context-window,
      knowledge-graph, model-selection, prompt-engineering, token-optimization,
      output-guardrails, structured-output) — fold into the run.
- [ ] Decide W9-10 once the client is known (~W6-7), then re-run this workflow
      with domain-updated topics.
