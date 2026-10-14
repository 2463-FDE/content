# Week 6 Archify visual integration

**Executed and reviewed:** 2026-10-14

**Status:** accepted under the dedicated source-verification report. Archify is an offline authoring tool only; no Archify runtime, package, input JSON, raw viewer output, cache, or source checkout is part of the learner site.

## Approved path used

The worker followed sections 6–8 of `data/fde-archify-v3-source-verification/report.md`:

- verified `tt-a1i/archify` tag `v3.0.1`, peeled commit `2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c`, commit tree `b33243ebe2bd6878a9ae58417ff8597c94d31e12`, and `archify/` subtree `7dcd73a73672d5da4f85d4c612017b478547303b`;
- verified the official release ZIP SHA-256 `b0b23bd28db314f04ca8ab9620fe20f8c1ac6474a3546bd8fe4679508aa1b7f5` and exact equality with the tagged Git blob;
- used Node `v24.2.0`, no npm command or package installation, a clean environment, disabled update checks, denied network, and denied reads/writes outside disposable scratch;
- rejected `brand`, `repository`, `source`, and `sources` fields before rendering;
- rendered each final synthetic architecture input twice and required byte-identical raw output;
- independently sanitized both outputs with the exact Appendix A sanitizer, SHA-256 `266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c`, then required byte-identical sanitized SVG;
- required the report's forbidden-content, XML, unique-ID, ARIA, title, description, role, and keyboard-focus checks; and
- copied only each sanitized SVG into its learner-route figure. Inputs and raw outputs remained disposable.

The exact sanitized SVG bytes are preserved inside each figure. Human review found that the verified sanitizer's replacement stylesheet gives `.c-grid` a stroke but does not explicitly suppress SVG's default path fill. The standalone figure therefore adds one FDE-owned, non-runtime presentation rule outside the hashed SVG: `.fde-diagram .c-grid{fill:none}`. This does not modify generated SVG bytes or inherit upstream viewer CSS. Its text and hash are pinned in the provenance manifest and enforced by drift tests.

## Accepted visuals

| Route | Accepted visual | Curriculum boundary made explicit |
|---|---|---|
| w06d1 | keyed Kafka event flow and ownership | producer key, partitioned topic, consumer ownership, completed offset, duplicate-safe outcome, retained retry and replay owner |
| w06d2 | delivery recovery and side-effect boundary | schema validation, bounded retry, outcome marker, external effect outside Kafka transactions, quarantine and approved replay |
| w06d3 | token-aware backpressure | retained intake, lag/token admission gate, bounded agents, separate store markers, preserved deferred work and capacity owner |
| w06d4 | static cross-cloud system boundary | synthetic AWS producer, Kafka handoff, federated-identity assumption, OTel context, partial progress, runbook-owned recovery |
| w06d5 | Friday fallback and evidence path | stable event contract, named delivery gate, bounded single-cloud fallback, measured readout, dated cross-cloud addendum |

All captions state the same relationships in prose. The Day 4 and Day 5 visuals remain explicitly static scenarios and do not claim live infrastructure, identity, traffic, billing, deployment, or cloud access.

## Provenance and drift contract

`archify-provenance.json` is the machine-readable authority for source/tooling identity and each route's input, raw-render, sanitized-SVG, and final-figure hashes and byte counts. `tests/test_week6_archify_visuals.py` verifies the committed public SVG/figure bytes, source pins, presentation shim, forbidden-content rules, document-wide ID uniqueness, accessibility semantics, captions, and absence of Archify runtime dependencies.

Any source, tool, input, raw, sanitized, presentation-style, or figure hash change is a review event. Baselines must never update automatically.
