# System Blueprint — visual plan, claims mapping, and drift contract

**Executed and reviewed:** 2026-10-29

**Status:** shipped with `system-blueprint.html`. Archify is an offline authoring tool only; no Archify runtime, package, input JSON, raw viewer output, cache, or source checkout is part of the learner site.

## Scope decision

`system-blueprint.html` is a standalone, optional-depth learner page that pairs two program-wide architecture figures with week-by-week progressive disclosure, six diagnosis drills, and four trade-off calls. It was chosen as the conflict-minimal visualization/engagement slice buildable from current `main` while PRs 30–36 rework the hub, the shared design system, and every week route:

- All page code is in new files (`system-blueprint.html`, `assets/js/system-blueprint.js`, this directory, two test files). The only shared-surface edit is one navigation line in `index.html`.
- All curriculum claims stay at the program-map level that is identical on current `main` and on every open PR head (30–36): week themes, the solo Weeks 1–5 insurance brownfield, the Week 6 handover to teams of 2–3 on the banking/payments project, and the serving/operations architecture vocabulary already accepted in the Week 5/6/7–8 Archify reviews.
- Week 1 and Week 4 phrasing deliberately avoids the exact week titles (PR 31 retitles Week 1; PR 34 retitles Week 4) and uses only wording common to both variants ("LLM engineering foundations", "Multi-agent orchestration").

**Ordinary reconciliation path after PRs 30–36 land:** re-add the single `index.html` nav link if the merged hub rewrites the top bar; rerun `tests/test_system_blueprint.py` — its currency checks compare this page's week keywords against the hub's `window.WEEKS` titles and will fail loudly if a merged PR changes a week's theme, which is a review event for this page's copy (not an automatic baseline update).

## Claims mapping (research-first)

This page visualizes only claims already reviewed and published in this repository; it sources none:

| Claim on the page | In-repo authority |
|---|---|
| Ten week themes and phases | `index.html` `window.WEEKS` / `window.PHASES` (shipped hub) |
| Solo Weeks 1–5 → teams of 2–3 Weeks 6–10; insurance brownfield → banking/payments handover | shipped hub + `client-delivery.html` project framing |
| Vector + graph retrieval, context assembly, grounding gate/abstention, read-only retrieval scope | Week 5 accepted visuals (`docs/research/w05/archify-visual-brief.md`) |
| Kafka ownership, retained retry/DLQ, replay owner, token-aware backpressure, synthetic cross-cloud boundary | Week 6 accepted visuals (`docs/research/w06/archify-visual-plan.md`) |
| OTel signals/GenAI spans, SLO + error budget response, incident path | Week 7–8 accepted visuals (`docs/research/w07-w08-archify-visual-plan.md`, `weeks/w08/*`) |
| Gates/plan discipline/drift, least privilege, audit evidence, reversible rollout | shipped hub day summaries for W7, W9, W10 |

The page is provider-neutral: it makes no AWS/GCP-specific technical claim, carries no `data-cloud` blocks, and points learners to the per-lesson cloud lanes. It is explicitly labeled optional depth outside the Core 30 required path and registers no required interaction or comprehension-check contract.

## Verified procedure and evidence

Rendering followed sections 6–8 of the accepted source-verification report (`data/fde-archify-v3-source-verification/report.md`, captain workspace):

- detached source checkout at pinned commit `2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c`; tag, tree, `archify/` subtree, and release-ZIP identities verified byte-exact (see manifest);
- Node `v24.2.0` on macOS `26.7.1` arm64; no npm command, clean `env -i` environment, `ARCHIFY_UPDATE_CHECK_DISABLED=1`;
- deny-network `sandbox-exec` profile with isolated `HOME`, `TMPDIR`, and cache (template below; raw and template hashes in the manifest);
- offline input rejection for `brand`, `repository`, `source`, and `sources` fields before rendering;
- two byte-identical raw renders per input; the pinned Appendix A sanitizer (`266e2da1…ba925c`) run twice per render under the same sandbox with byte-identical output;
- the stricter FDE forbidden-content grep (no `href`/`src` at all), XML/unique-ID/ARIA/title/desc/tabindex checks, and human visual review of label legibility, contrast, focus, and narrow-screen overflow on the final page.

First authoring attempts failed closed at Archify's layout validators (a `via` segment that dishonored `fromSide` on the serving figure; two label-over-component overlaps on the operations figure). Inputs were corrected and both renders rerun from scratch; no failed output entered learner content.

Sandbox profile template (`$SCRATCH` = disposable scratch directory; hashes in manifest):

```
(version 1)
(allow default)
(deny network*)
(deny file-read-data
  (require-all
    (subpath "/Users")
    (require-not (subpath "$SCRATCH"))))
(deny file-read-xattr
  (require-all
    (subpath "/Users")
    (require-not (subpath "$SCRATCH"))))
(deny file-write*
  (require-all
    (subpath "/Users")
    (require-not (subpath "$SCRATCH"))))
```

## Accepted visuals

| Figure | What it makes explicit |
|---|---|
| serving-path | question → orchestrator (traced) → read-only retrieval scope (vector + graph) → budgeted/gated context assembly → one model call → guardrails → checked answer |
| operations-path | change → gates (human approval) → gated apply into a synthetic environment; service ⇄ Kafka with retained failures; signals → SLO alert → on-call rollback; gate decisions + apply receipts → audit trail; explicit no-live-cloud boundary |

Both figcaptions restate the same relationships in prose with week attributions. Both figures are static scenarios and claim no live infrastructure, identity, traffic, billing, deployment, or cloud access.

## Import and presentation contract

The exact sanitized SVG bytes are inlined inside `<figure class="fde-diagram" data-archify-visual data-provenance="system-blueprint">` elements. Because the pinned sanitizer's replacement stylesheet does not style every retained semantic class, the page inlines the same scoped, static `.fde-diagram .fde-archify` presentation rules already reviewed into `assets/css/style.css` (plus the per-figure `.c-grid` shim), so the figures stay legible when the page is saved as a single local file. This is static CSS, not an Archify runtime and not an SVG post-processing step; the generated SVG bytes are untouched.

## Provenance and drift contract

`archify-provenance.json` in this directory is the machine-readable authority for source/tooling identity and each figure's input, raw-render, sanitized-SVG, and final-figure hashes and byte counts. `tests/test_system_blueprint.py` verifies the committed inline SVG bytes against the manifest, the forbidden-content rules, document-wide ID uniqueness, accessibility semantics, captions, the absence of Archify runtime dependencies, the optional-depth and no-provider-block contract, the drill/trade-off interaction contract, and the week-theme currency coupling to `index.html`.

Any source, tool, input, raw, sanitized, presentation-style, or figure hash change is a review event. Baselines must never update automatically.
