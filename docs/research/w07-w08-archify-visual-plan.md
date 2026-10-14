# Week 7–8 Archify visual plan and review record

**Reviewed:** 2026-10-14  
**Claims:** only the provisionally authoritative Week 7/8 map and dated research in `docs/research/w07/` and `docs/research/w08/`.

## Visual decisions

- **Week 7:** one architecture view makes the delivery-control boundary materially clearer: reviewed Terraform configuration → static plan artifact → deterministic gates → human authority, plus a narrow inventory handoff → Ansible evidence → owned recovery. The final node explicitly blocks apply/deploy in the lesson.
- **Week 8:** one architecture view makes signal roles and response clearer: payload-free traces/metrics/logs → OTel Collector; versioned evaluation/guardrail outcomes → SLO, quality, latency, cost and error-budget policy → incident owner/runbook response.
- Each visual is repeated on the five routes in its week because it is the common system map every daily decision annotates. Each final document has one SVG, so IDs remain document-wide unique.

## Renderer and isolation

The exact approved v3.0.1 direct architecture renderer was copied into disposable worktree scratch from the pinned clean checkout. Preconditions and identities were verified before render:

- tag object `679f195584e4216fd582c073d8964b3a9f59107e`
- commit `2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c`
- tree `b33243ebe2bd6878a9ae58417ff8597c94d31e12`
- `archify/` subtree `7dcd73a73672d5da4f85d4c612017b478547303b`
- release ZIP SHA-256 `b0b23bd28db314f04ca8ab9620fe20f8c1ac6474a3546bd8fe4679508aa1b7f5`
- sanitizer SHA-256 `266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c`
- Node `v24.2.0`; no `node_modules`; npm unused

Each input was rejected on `brand`, repository/source evidence, or URL-asset fields; none were present. The renderer and sanitizer ran under the report's `sandbox-exec` pattern with a clean environment, network denied, reads/writes outside scratch denied, update checks disabled, disposable HOME/cache/tmp, and Python bytecode disabled. Two independent raw renders and two independent sanitizations compared byte-for-byte for each visual. Scratch, source, inputs, raw viewers, caches and runtime files were deleted after hashes were recorded.

## Import and human review

`w07-w08-archify-provenance.json` pins every source/tool/input/raw/sanitized/figure hash and route import. The sanitizer's replacement stylesheet styles only grid, region, mask, backend and message-bus shapes plus default/emphasis edges; Week 7–8 also emit security, security-group, database, external and cloud shapes, security/dashed edges and their markers, labels and sigils, which would otherwise paint with SVG's default black fill or no stroke. The FDE-owned static rules in `assets/css/style.css` (scoped to `.fde-diagram .fde-archify`) supply those light, system-font-safe classes plus the `--mask` halo color outside the hashed SVG and figure bytes, on the SVG's always-white canvas in both themes; a rendered-DOM test asserts every shape, edge and label computes a visible, non-black paint. Import omits the standalone XML declaration and trims trailing line whitespace for inline HTML; the manifest separately pins that semantics-preserving normalization and every resulting inline SVG/figure hash. Final checks assert:

- no script, event handler, `foreignObject`, image, iframe/object/embed, href/src, remote/data URL, import, `@font-face`, JetBrains font, Archify runtime, sibling asset, brand, network, or absolute scratch path;
- meaningful `<title>` and `<desc>`, `role="img"`, valid `aria-labelledby`, root and readable groups keyboard-focusable, visible caption and prose text alternative;
- system fonts only, responsive horizontal overflow hint, visible focus, document-wide unique IDs, light/dark readability and standalone file behavior;
- no-JavaScript pages retain the complete required prose, a text alternative, native-details decision practice, and six question/answer disclosures.

Human review found the relationship labels legible at desktop and mobile overflow widths, the captions equivalent to the relationship shown, and the visuals useful rather than decorative. Any source, renderer, sanitizer, input, raw, sanitized, figure or route hash change is a review event; tests must not auto-update the baseline.
