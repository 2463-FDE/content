# LTM learning-experience correction — causal diagnosis

Recorded: 2026-10-30. Base under diagnosis: `origin/main` `8db2a64b95d0c395b6ec91b5245f02f62bb69350`
(PR #38 integrated release), byte-identical to the deployed GitHub Pages site (see §4).

## 1. Reported symptom (captain, verbatim referent)

"a big archify diagram, with a few sections on paragraphs and very minimal interactivity …
Personas should be for our new brownfields exclusively … updated ui … easier to navigate …
sections shouldn't just be paragraph > paragraph > question > paragraph repeat … more
dynamic interactivity."

## 2. Reproduced learner path and visible symptom

Entry path reproduced from source and deployed bytes: hub `index.html` → day card → lesson
route. Three distinct symptom classes, all real in the shipped source:

1. **Dominant Archify, minimal interaction (Weeks 5–10).** Every W6–W8 route is a thin
   shell whose static body is an `h1` plus a full-width inline Archify SVG
   (`weeks/w06/w06d1.html` `#lesson-root`), and whose rendered form
   (`assets/js/kafka-lesson.js:145-155`, `platform-lesson.js` same template) is:
   header → full-width "visual breakout" (the Archify SVG as first content) → 4–5
   sections of exactly `heading + one paragraph` ("Required decision N") → one
   radio-button drill → 6-question MCQ modal. Per-day interaction audit at 8db2a64:
   W01 pages carry 3–5 rich widgets each (`ix-predict`, `ix-run`, `ix-temp`, `ix-spot`,
   `ix-retry`, `ix-cost`); W02–W04 carry 0–5 plus module-driven practices; **W05–W08 carry
   zero** rich widgets (one single-choice lab/drill per day); W09–W10 carry 0–2. The
   complaint's "paragraph > paragraph > question" pacing is the literal renderer template
   for 25 of 50 days and the W5 static pages.
2. **Navigation.** Lesson topbars carry only Home / Atlas / Client Delivery / AI Interview.
   No program → week → day orientation, no day position ("Day N of 50"), no previous-day
   link, no consistent next action across week families (W1–4 legacy pages, W5 static
   pages, W6–10 rendered shells each use different side/footer affordances). Movement
   between curriculum, lesson, project/persona work, and trainer surfaces relies on
   returning to the hub.
3. **Personas.** The active learner flow still binds to retired clients: Riverbend
   Community Health (healthcare) and Meridian Lending in
   `assets/js/persona-communications-fixtures.js`, `persona-communications.html`,
   `client-delivery.html` (`window.CLIENT`, weekly "Client request" ritual from the hub),
   and `weeks/w04/w04d5.html`. W6–10 lesson data says only "Project 2 · regional
   banking/payments". The two active new-brownfield identities — Juniper Vale Mutual
   Loss Desk (`fde-pc-insurance-modernization`, solo W1–5) and Morrowfield Payment
   Control (`fde-payments-service-platform`, teams of 2–3 W6–10) — appear nowhere in any
   learner-facing surface (repo-wide grep; the only "Juniper" hit is an unrelated
   synthetic learner name in `alt-research.html`).

## 3. Initiating trigger

The October production wave that replaced Weeks 5–10 with data-driven Core-30 renderers:
PR #24 (`f1ff5ab`, W9–10 + shells), PR #26 (`8ca6eb4`, W5 Neo4j), PR #27 (`40ee194`, W6
Kafka), PR #28 (`e9b1718`, W7/W8 remap), integrated by PR #35/#38. The template these
introduced optimizes for verifiable Core-30 budgets, provenance-tracked claims, and one
essential diagram per day — and standardizes exactly one single-choice interaction per
day with the Archify SVG as the first content element. The same wave dropped the earlier
hand-authored practices for those weeks: `interactive-w6-permissions.js` (PR #17) is now
referenced by zero pages (orphaned); the W7 trace waterfall/burn calculator (PR #18) and
W8 lethal-trifecta auditor (PR #16) were replaced along with their host pages. Week 1–4
pages, authored earlier with `interactive.js` widgets, kept the intended experience —
they are the in-repo counterfactual demonstrating the design the program wants.
Persona rebinding to the two new brownfields was never part of any shipped wave.

## 4. Masking conditions

- **Green technical gates.** 164 Python + 89 Node tests pass at 8db2a64. They pin claim
  currency, Core-30 word budgets, route wiring, and design tokens — none measures
  interaction variety, Archify prominence, orientation, or persona binding. Release
  reviews read green checks as experience acceptance.
- **Renderer-vs-static split.** The hub and W1–4 look rich in spot checks; the regression
  concentrates in W5–10 routes, and the W6–10 static shells (what a crawler or first
  paint shows) are *only* the Archify SVG, which overstates diagram dominance further.

## 5. Disconfirming / counterfactual checks

- **Stale deploy / cache / wrong tab — disconfirmed.** Deployed bytes fetched over
  bounded unauthenticated HTTP (`https://2463-fde.github.io/content/`) are byte-identical
  (`cmp`) to 8db2a64 source for `index.html`, `weeks/w06/w06d1.html`,
  `weeks/w02/w02d2.html`, `assets/js/kafka-lesson.js`. The symptom is in the source.
- **Counterfactual working path — confirmed.** `weeks/w01/d1.html` (and W1–4 generally)
  deliver the intended experience with the *same* shared stack (scrolly diagram + varied
  `interactive.js` widgets + quiz), proving the regression is a per-wave authoring
  choice, not a platform limitation.
- **Smallest counterfactual.** Rendering `w06d1` with its lesson data shows the drill is
  the only state-changing element; removing the Archify breakout leaves a pure
  paragraph→question page — i.e., the interactivity deficit is in the data/renderer
  contract, not a broken widget load (no console-dependent widget is referenced at all).

## 6. Correction consequences (what this diagnosis binds)

1. Interaction depth must come from the lesson data/renderer contract (W5–10) and
   authored widgets (W1–4 gaps), not another standalone drill page.
2. Archify stays as supporting context — moved out of the first-action position and the
   static-shell-only body.
3. One shared orientation/navigation chrome across all 50 routes.
4. Persona truth rebinds to Juniper Vale Mutual Loss Desk (W1–5) and Morrowfield Payment
   Control (W6–10) exclusively, preserving learner-authored state honestly.
5. Behavioral regression coverage for all four classes lives in
   `tests/test_learning_experience.py` so green gates can no longer mask this regression.

## 7. Folded-in addition (2026-10-30): Week 1 multi-part topic structure

Captain's exact words (relayed via the shared contract): "Also, week one being the only
week with multi-part topics is odd, we should correct this as well to match the rest
being singular topics as this should be the way."

**Observed distinction.** Week 1 was the only week whose days split into part routes:
Tue–Thu each shipped as two pages (`d2a`/`d2b`, `d3a`/`d3b`, `d4a`/`d4b`) carried by a
`parts:` array in `assets/js/curriculum-map.js`, surfaced as "1 · …" / "2 · …" split
links on the hub launchpad, dual next-hops in the side nav, and two source-anchor
sections per program day. Every later week is one route per day. Progress identity was
already day-level (`w01d2`…`w01d4` in `assets/js/progress.js` ORDER), so the split was
purely presentational.

**Normalization.** Tue–Thu now ship as single-topic routes `d2.html`/`d3.html`/`d4.html`
carrying both halves' full required concepts, interactions, provider blocks, and the
merged comprehension checks; the `parts:` format is removed from the map and hub; day
chaining (`rel=prev/next`, side nav, `FDE_NEXT`) runs d1→d2→d3→d4→d5 like any other
week. Old part URLs remain as moved-lesson alias stubs (meta refresh + canonical +
visible link) so existing deep links keep working without pretending the old pages still
exist. Provider research artifacts were renamed with their routes
(`docs/research/w01/d2-provider-paths.md`, `d4-provider-paths.md`); Core-30 labels were
re-measured per selection after consolidation. No PDF objective, Core-30 requirement,
or technical depth was removed; the 40/40 source-coverage record is unchanged.

**Behavioral demonstration.** `tests/test_week1_launch_readiness.py` now pins the
singular-topic contract: one route per day in the map and hub, alias-stub forwarding
for all six old deep links, d1→d5 prev/next chaining with no route navigating to a
retired part page, per-selection Core-30 measurement with true labels, and the
unchanged authoritative-source denominator. `tests/test_learning_experience.py`
derives the 50 required day routes from the curriculum map, so Week 1 is exercised by
the same orientation/interaction/persona checks as every later week.
