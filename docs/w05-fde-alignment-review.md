# Week 5 — FDE-mindset alignment review

> Reviewed 2026-07-30. Scope: `content/weeks/w05/w05d1–d5.html` + `content/docs/research/w05/*.md`,
> checked against `content/atlas/` (FDE Mindset Atlas), `content/client-delivery.html` (week-5 packets),
> and Galent's published delivery model (web-researched, sources at the bottom).

## STATUS — all six gaps closed 2026-07-30

| # | Gap | Fix shipped |
|---|---|---|
| 1 | Problem scoping absent | `w05d2` re-authored: new spine is client ask → XY reframe → dig the artifacts → name it in the client's currency → *then* ambiguity/EARS/RFC 2119/Gherkin. New diagram (the reframe ladder), new quiz Q1 + open question, new deep dive worked on the real ask. |
| 2 | Readings decoupled from the client packet | All 10 W5+W6 deliverables retargeted to the brownfield repo and deep-linked to `client-delivery.html?w=N`. W5's five days now chain into the one spec package the packet asks for. Convention recorded in `week-fanout-plan.md` for W7+; W2–W4 tracked as an unscheduled retrofit. |
| 3 | Greenfield spine, brownfield job | `w05d1` step 4 replaced with **current state → target state** (spec as the third beat of a four-beat method; spec ships to the client as a proposal) and the **feature-parity trap** pulled forward from W6. New open question replaces the EARS one (d2 owns EARS now). |
| 4 | Graph layer dropped between W4 and W5 | `w05d4`'s closing step rewritten as **decompose against the system graph** (knowledge graph + context graph; "bad decomposition is usually a missing-graph problem"). New ⑤ deliverable item: a five-line system-graph sketch and the phase boundary it changed. |
| 5 | Spec-as-document, not spec-as-loop | `w05d5`'s converge step now names the shape: observe → decide → act → verify → repeat, requiring a trigger and a machine-verifiable stopping condition. Hands off to `w06d2`'s existing `LOOP.md`. |
| 6 | Week ends at merge, not outcome | Outcome gate added to the `w05d5` milestone rubric, the `w05d1`/`w05d2` deliverables, and `w06d5`. |

Also fixed in passing: `w05d5`'s `FDE_NEXT` pointed at the program index instead of `w06d1`.

**Supporting work:** research addenda appended to `docs/research/w05/w05d{1,2,4,5}.md`; three Galent
sources scraped into the vault (`raw/articles/galent-*`) with a synthesis note at
`projects/2463-fde/notes/galent-reference-model.md`; six concepts + five bank questions added to
`backend/src/index.js`; ten glossary terms added to `assets/js/glossary.js`.

The review below is preserved as the original diagnosis.

---

## Verdict

W5 is a **strong spec-driven-development course** and a **weak forward-deployed-engineering week**.

The research is current and well-cited (spec-kit 0.12.3, Kiro, OpenSpec, EARS, ISO 29148, RFC 2119,
ASVS, ISO 25010, the productivity-reliability paradox). The prose is good. The problem is framing:
every day starts *after* the problem is already known and agreed, and every deliverable targets
"your project." That is the SDD literature's frame, not the FDE's, and not Galent's.

---

## The Galent reference model (researched)

Galent is a sister company, not this cohort's client. It is used here as a **consistency
reference**: where our curriculum and their published method describe the same work, the
vocabulary and the shape should match, so a learner moving between the two orgs hears one
message rather than two. The delivery target for these learners remains the brownfield
projects in `client-delivery.html`.

| Element | Galent's framing |
|---|---|
| Role | FDSE = full-stack engineer **embedded in the customer environment**; "full-stack engineering, data fluency, and **domain empathy**"; many capabilities → one customer |
| Phases | **Problem Decomposition & Scoping** → Rapid Prototyping & Iteration → Optimization & Hardening → Deployment & Feedback Loop |
| Operating model | **Scope → Sequence → Build → Ship → Measure** |
| SDLC | "**Spec-Driven AI-Native SDLC** — AI augments every phase from requirements to deployment with **deterministic, schema-driven execution**" |
| Platform substrate | **Knowledge Graph** ("a living map of your entire system — code, data, logs, and dependencies") + **Context Graph** ("encodes your business logic, architecture standards, and compliance rules") |
| Named service line | **Context Engineering** — compliance, governance, decision tracing |
| Lead service line | **App Dev & Modernization** — Legacy Modernization, Brown & Greenfield Acceleration |
| Delivery metaphor | Grand Prix: Machine (AI stack, where SDD lives — "precision is not a feature, it's the entry fee") / Driver (the FDE) / Crew (AI-native delivery team) |
| Next leap | **Loop Engineering** — "Stop prompting your AI agent. Start designing the loop that prompts it for you." Observe → Decide → Act → Verify → Repeat. Every loop needs a trigger and a **machine-verifiable stopping condition**: "Without a measurable stopping condition, you haven't built a loop. You've built a very confident token furnace." |

Note the shape: **scoping first, graphs underneath, measure at the end, loops as the frontier.**
W5 currently has none of those four.

---

## Gap 1 — The week is titled "Problem Scoping" and doesn't teach it

`index.html` names W5 **"Spec-Driven Dev & Problem Scoping."** The scoping half is missing.

Counts across all five days:

| Term | Hits |
|---|---|
| "XY problem" | **0** |
| "shelfware" | **0** |
| "push back" | **0** |
| "stakeholder" | 31 — **all in d2** |

D2 is the closest day, but it teaches *elicitation coverage* (NN/g's four areas, follow-up probing,
EARS rewriting) — extracting a clean spec from a cooperative stakeholder. It does not teach
**reframing a wrong ask**. The Atlas's single most load-bearing principle is the XY problem
("customers ask for Y when they need a solution to X… the single most important FDE question:
*what are you trying to accomplish?*"). Galent's phase 1 is literally *Problem Decomposition &
Scoping*. Neither shows up in W5.

**The distinction that's collapsed:** an ambiguous requirement and a wrong requirement are different
failures. W5 teaches the first (EARS, `[NEEDS CLARIFICATION]`, 29148 well-formedness) exhaustively
and the second not at all. You can write a flawlessly unambiguous, fully verifiable, EARS-shaped
spec for the wrong system — that is the Atlas's "most expensive mistake," and W5 has no defense
against it.

---

## Gap 2 — Two parallel week-5s that never touch

`client-delivery.html` already contains a genuinely FDE-shaped Week 5 for both brownfield projects:

**Riverbend (healthcare):**
> "Our scheduling keeps double-booking… The team's pretty sure it's a glitch in the calendar widget,
> so could you just fix the calendar so it stops doing that?"
> - `hidden`: "'double-booking' is a correctness defect (retry = duplicate; race on Slot), not a
>   calendar-UI bug. 'Fixing the calendar' without idempotency just reshuffles the race."
> - `facilitator`: "Reframe the ask: lead them from 'calendar bug' to 'retry produced a duplicate.'"
> - `deliverable`: "A spec package… **Spec only — implementation is scoped, not built.**"

**Lender (finance):**
> "Let's just add a payment form… We've had a few 'I was charged twice' complaints, but I think
> people are just confused."
> - `facilitator`: "Reframe 'add a payment form' → idempotency + PCI tokenization + no-SAD storage.
>   **Spec week — don't let them start building.**"

That packet is a textbook XY reframe with the landmines pre-planted, and its `stated` / `dig` /
`hidden` / `facilitator` fields are effectively a finished lesson plan.

The readings never reach for it:

| Term in `w05d*.html` | Hits |
|---|---|
| "your project" / "your own project" | **11** |
| "Riverbend" | 0 |
| "idempoten*" | 0 |
| "double-book" | 0 |
| `client-delivery.html` deep-link (`?w=5`) | 0 (nav-bar link only) |

Every day's deliverable — `specs/day1-spec.md`, `requirements.md`, `doc/arch/adr-001.md`, `PLAN.md`,
`REVIEW.md` — is authored against "one small feature of your project." The client packet asks for a
spec package against a real brownfield repo with a hidden defect. Same week, same topic, zero
connection.

Meanwhile "client" appears 61 times across the week — but as rhetoric, not structure:
"when a client asks…", "on a client engagement…". The learner is told about clients and never
faces one.

---

## Gap 3 — Greenfield spine, brownfield job

D1's spine is `specify → plan → tasks → implement` from nothing. D3 is honest about the mismatch —
"spec-kit's regenerate-from-spec thesis is most natural on greenfield; **most clients you'll meet
are standing in fifteen years of brownfield**" — and then still sends the learner off to write a
greenfield spec for their own project.

The Atlas puts SDD *inside* the App Modernization branch, where the spec is an output of a method:

1. Understand the business before a line of code
2. Analyze the sources — trust nothing, trace everything
3. **Specification generation via the target state** — "it goes to the client **as a proposal**"
4. Implement in modules, validated by SMEs

W5 does step 3's mechanics beautifully and skips 1, 2, and 4. Consequences:

- "current state → target state" — the Atlas node where UI/UX, DB, language, and deployment
  strategy are actually chosen — has no counterpart in W5, even though D3 is the tooling/decision
  day and D4 is the planning day.
- The spec is never framed as a **client-facing proposal** iterated with feature add/omit. It's an
  internal agent-input document throughout.
- `legacy`, `SME`, `strangler`, `characterization test` → **0 hits**. W6d4 owns strangler-fig and
  characterization tests, which is defensible sequencing — but W5 is where the spec that governs a
  brownfield change gets written, and it never mentions that its subject might already exist.
- The **feature-parity trap** (Atlas: ~50% of legacy features unused; defining "as-is" is the
  biggest cost) is exactly a *spec-scoping* failure and belongs in W5, not W6.

---

## Gap 4 — The graph layer is dropped between W4 and W5

`knowledge graph` and `context graph`: **0 hits in all of W5.** Week 4 just finished teaching Neo4j
property graphs and GraphRAG end-to-end.

Galent's entire platform is Knowledge Graph + Context Graph as the substrate that makes
schema-driven execution deterministic. The Atlas hands this off explicitly on the decomposition
branch:

> "An agent only decomposes *correctly* if it can traverse the system graph — which subtasks touch
> which services, entities, and rules. **Bad decomposition is usually a missing-graph problem, not a
> model problem.**"

W5d4 *is* the decomposition day. The handoff arrives and nothing catches it. This is the single
cheapest gap to close, and the one where our material and Galent's diverge most visibly on the
same idea — they build the whole platform on it, we teach it in W4 and then drop it in W5.

---

## Gap 5 — Spec as document, not as loop

W5's terminal picture is a gated pipeline a human walks: checklist → analyze → handoff → verify →
converge → review. Good, and better than most curricula.

Galent's stated frontier is one step past that: the leverage has moved **from prompting to
orchestration**. Design the loop — trigger, verifiable goal, external verification, cost ceiling —
rather than supervising each iteration.

W5 already has the raw material and doesn't assemble it:

- D4: "every task ends in a check that passes or fails" → that *is* a machine-verifiable stopping
  condition, taught as documentation hygiene rather than as loop design.
- D5: "give the implementer a check it can run" and "converge is a loop, not a step" → framed as a
  manual pass the human re-runs, not as an automated loop with a halt condition.
- D5 correctly insists on "verification evidence (test output, not assertions)" → that is Galent's
  "agents shouldn't decide it's finished simply because it says so," one sentence from being named.

Naming it costs one node in D5 and converts W5's checks from paperwork into the input to W6's
agentic loops.

---

## Gap 6 — The week ends at merge, not at outcome

Galent's model ends on **Measure**. The Atlas's first line is "an FDE owns customer *outcomes*…
shipping the PR is an **output**; the analyst's morning being 45 minutes shorter is an **outcome**,"
and "shelfware is the enemy — software that gets adopted is worth infinitely more."

The D5 milestone ends at: merge decision against the Google code-health standard + one requirement
traced spec → task → code → test. That is output-complete and outcome-silent. No day asks *what
changes for the user, and how will we know?* No adoption or measurement gate anywhere in the week.
`outcome` appears 10 times across five days, mostly incidentally; `shelfware` zero.

---

## What's working (don't touch)

- The productivity-reliability paradox as D1's hook (98% more PRs / 91% longer reviews / flat
  delivery; "specification discipline, not model capability, is the binding constraint") is the
  strongest opening in the week and lands the "why" cleanly.
- The **rigor spectrum** node (D1) — spec-first / spec-anchored / spec-as-source / no spec, and
  "the fastest way to discredit SDD at a client is to apply it to everything" — is genuine FDE
  judgment (Atlas trait 2, calibrate engineering to the situation). Keep and reuse.
- The **lock-vs-defer axis** (D3) as the one axis under spec-kit / Kiro / OpenSpec is a real
  teaching insight, and it's already framed as a client-matching decision.
- D4's NFR rigor (ISO 25010 + SLO-shaped targets + cited ASVS level) is better than most
  professional practice and directly supports "Optimization & Hardening."
- Source discipline and version stamping across all five research briefs is excellent.

---

## Recommended changes, ranked by leverage

1. **Rewire all five deliverables to the client-delivery repo.** Replace "your project" (11 uses)
   with the W5 client packet. D1 spec → D2 requirements → D3 ADR → D4 plan → D5 milestone becomes
   the spec package the packet already asks for. Deep-link each day's deliverable block to
   `client-delivery.html?w=5&p=<proj>`. **Highest leverage, lowest authoring cost** — the client
   material already exists and is already correct.

2. **Rebuild D2 around the reframe, not the interview.** Open with the verbatim client ask
   ("just fix the calendar"). Teach the sequence: stated ask → dig questions → hidden problem →
   *then* EARS. The packet's `stated` / `dig` / `hidden` / `facilitator` fields map 1:1 onto scrolly
   steps. Add the XY problem by name and "push back with an alternative, not a no" as an explicit
   rubric line. EARS survives intact — it just stops being step one.

3. **Add current-state → target-state to D1 or D3.** One node: the spec is derived from business
   understanding + analysis of the existing system, and it ships to the client **as a proposal**,
   iterated with feature add/omit. Pull the feature-parity trap forward from W6 — it's a scoping
   failure, and scoping is this week.

4. **Add the graph node to D4.** The plan is decomposed *against the system graph*; missing graph →
   wrong decomposition. Connects W4 → W5 and is the most Galent-specific fix available.

5. **Reframe convergence as loop design in D5.** Trigger + machine-verifiable stopping condition +
   external verification + cost ceiling. Ties D4's pass/fail checks to W6's agentic loops.

6. **Add an outcome gate to the D5 milestone.** One line before the merge decision: the user-visible
   outcome this spec buys, and how it will be measured. Closes Galent's Measure and the Atlas's
   output-vs-outcome distinction in a single rubric row.

7. **Optional — adopt Scope → Sequence → Build → Ship → Measure as the week's spine language**
   (D1 opener and D5 milestone). Costs nothing, and puts our curriculum and our sister company on
   the same five words for the same delivery arc.

None of 1–6 requires new research. 1, 2, and 6 alone would move the week from "SDD course with
client anecdotes" to "FDE week that happens to teach SDD."

---

## Sources

Repo:
`content/atlas/assets/js/content.js` (Mindset + Decomposition + App Modernization branches) ·
`content/client-delivery.html` (week-5 packets, both projects) ·
`content/index.html` (`window.WEEKS[]`, W5 title) ·
`content/docs/week-fanout-plan.md` (W5 scope note: "Aligns with our own GSD/spec workflow. Light gap") ·
`content/docs/research/w05/*.md` · `content/weeks/w05/w05d1–d5.html`

Web:
- [Beyond the Build: Why Forward-Deployed Engineers Are the New Face of Tech — Galent](https://galent.com/insights/blogs/beyond-the-build-why-forward-deployed-engineers-are-the-new-face-of-tech/)
- [Galent — AI Native Digital Engineering (service lines, GalentAI engines, Spec-Driven AI-Native SDLC)](https://galent.com/)
- [Loop Engineering: Why the Next Leap in AI Development Isn't a Better Prompt — Galent](https://galent.com/insights/blogs/loop-engineering-why-the-next-leap-in-ai-development-isnot-a-better-prompt/)
- [The Grand Prix Model of AI Delivery — Galent](https://galent.com/insights/blogs/the-grand-prix-model-of-ai-delivery)
