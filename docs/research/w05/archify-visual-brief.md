# Week 5 Archify visual brief and render record

- **Decision received:** 2026-10-14
- **Source verification accepted:** 2026-10-14
- **Approved source:** [`tt-a1i/archify`](https://github.com/tt-a1i/archify) `v3.0.1`
- **Verification record:** `data/fde-archify-v3-source-verification/report.md` in the captain workspace
- **Committed manifest:** [`archify-provenance.json`](archify-provenance.json)

The prior execution gate is resolved. The two diagrams below were rendered once from the verified detached source in a disposable local scratch directory. Archify was not installed into this repository, no package manager ran, networking was denied during rendering and sanitization, and no viewer HTML or authoring JSON was copied into learner content.

## Selection decision

Only two of the five candidate visuals materially improved the lessons:

1. **W05D3 — GraphRAG construction boundary.** Documents become candidate graph structure, cross a schema-and-provenance failure boundary, enter Neo4j as constrained facts, and leave through bounded read-only retrieval. This makes probabilistic extraction and the validation gate visible.
2. **W05D4 — hybrid context assembly.** One question fans out to Chroma candidates and Neo4j paths, then reconverges through context assembly and a grounding gate. This makes the split retrieval responsibilities, abstention boundary, and no-authority agent contract visible.

W05D1, W05D2, and W05D5 retain their existing declarative diagrams. Their candidate Archify flows repeated prose or assessment structure rather than clarifying an architecture/data-flow boundary, so they were not rendered or imported.

## Verified procedure and evidence

Rendering followed sections 6–8 of the accepted source-verification report:

- detached source commit `2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c` and verified tag, tree, Archify subtree, and release-archive identities;
- Node `v24.2.0` on macOS `26.7.1` arm64;
- deny-network `sandbox-exec` profile with isolated `HOME`, `TMPDIR`, and cache;
- `ARCHIFY_UPDATE_CHECK_DISABLED=1` and offline input rejection for `brand`, `repository`, `source`, and `sources` fields;
- two byte-identical raw renders per input;
- the pinned Appendix A sanitizer (`266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c`) run twice under the same sandbox;
- two byte-identical sanitized SVGs per render, followed by forbidden-content, unique-ID, ARIA, title/description, and keyboard-focus checks.

The first W05D3 data-flow authoring attempt failed closed at Archify's label-overlap validator. After correction, visual review found that the pinned sanitizer's replacement stylesheet did not define the data-flow lane fills, making that candidate illegible. Both data-flow candidates were rejected. The two imported versions were rerendered with the verified architecture renderer and only sanitizer-supported component classes; no failed or rejected output entered learner content.

The sanitizer stylesheet also leaves the retained `.c-grid` path's `fill` at the SVG default. The exact sanitized SVG bytes remain unchanged; a scoped, checked-in presentation rule in `assets/css/style.css` sets only that path to `fill:none` and colors two sanitizer-retained semantic text classes. This is static CSS, not an Archify runtime or an SVG post-processing step. Exact input, raw-output, sanitized-output, byte-count, tool, and sandbox hashes are recorded in `archify-provenance.json`.

## Import and accessibility contract

The sanitized SVG bytes are inlined inside `<figure>` elements in `weeks/w05/w05d3.html` and `weeks/w05/w05d4.html`. Each figure has:

- a meaningful SVG `<title>` and `<desc>` connected by `aria-labelledby`;
- `role="img"`, `tabindex="0"`, and keyboard-focus treatment;
- unique namespaced IDs and focusable node groups;
- a visible `<figcaption>` that states source, transformation, destination, and failure boundary;
- a horizontally scrollable narrow-screen viewport while preserving page-level overflow;
- no script, event handler, `foreignObject`, image, remote font, URL-bearing attribute, or Archify runtime dependency.

`tests/test_w05_neo4j_wave1.py` hashes the exact inline SVG serialization against the committed manifest and repeats the forbidden-content, ID, ARIA, caption, no-runtime, scoped-grid-style, responsive, theme, keyboard, print, and no-JavaScript checks. Any edit to generated SVG bytes must therefore be rerendered through the pinned procedure and accompanied by an intentional manifest update.
