# Week 6 Archify visual plan — execution gated

**Prepared:** 2026-10-14

**Status:** plan only; Archify has not been installed or executed.

The decision in `data/decisions/fde-ltm-archify-active-use-v3.0.1-2026-10-14.md` applies to useful Week 6 event-flow and system-boundary visuals. Execution remains blocked until the dedicated source-verification report confirms the pinned `tt-a1i/archify` v3.0.1 commit, archive hash, license, provenance, and disabled remote/update behavior. The unrelated npm package must never be installed or run.

## Candidate visuals

| Route | Visual worth generating | Required semantics | Keep current renderer when |
|---|---|---|---|
| w06d1 | keyed-record event flow | producer → topic → partition → consumer group → offset/replay; ordering is partition-scoped | generated output obscures partition ownership or replay |
| w06d2 | recovery and side-effect boundary | schema validation, retry, DLQ/quarantine, idempotent side effect, duplicate-safe replay | delivery labels imply end-to-end guarantees |
| w06d3 | token-aware backpressure loop | lag, admission policy, agent workers, token budget, Chroma/Neo4j boundaries | cost and pressure controls are not visible |
| w06d4 | operability system boundary | broker/controller, consumer group, tracing, lag alert, rebalance/failure, runbook | observability appears outside the causal flow |
| w06d5 | defended architecture and fallback | measured pipeline, delivery boundary, batch fallback, egress/cost boundary | decorative detail weakens defense readability |

## Acceptance contract after the gate opens

1. Run only in the isolated verification path at the verified immutable revision; no install scripts, network access, telemetry, update checks, remote fonts, or asset fetches.
2. Feed synthetic text labels only. Do not provide credentials, client material, real learner data, or unpublished infrastructure details.
3. Use system fonts. Emit standalone SVG with all styles and markers inlined; no external references, scripts, `foreignObject`, or remote URLs.
4. Post-process every SVG with a title, description, stable accessible name, logical reading order, sufficient light/dark contrast, and text equivalents in the lesson.
5. Normalize and hash outputs, regenerate in a second clean directory, and fail on semantic or byte drift after normalization.
6. Review against the semantics above. Archify is an authoring aid, not curriculum authority; inaccurate output is discarded.
7. Keep the existing deterministic HTML diagram until an accepted SVG is committed. Learner routes must not depend on Archify at runtime.
