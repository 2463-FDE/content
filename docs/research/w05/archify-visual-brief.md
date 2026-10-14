# Week 5 Archify visual brief — execution gated

- **Decision received:** 2026-10-14
- **Approved tool/source:** `tt-a1i/archify` v3.0.1
- **Current status:** captain approved active use, but **do not install or execute** until the dedicated source-verification report confirms the pinned safe path (source commit/hash, MIT license, dependency provenance, disabled remote update/brand/icon fetches, and any local-only controls).
- **Interim:** independent lesson authoring continues with inline declarative diagrams and complete no-JavaScript text alternatives. These are the content briefs for later verified rendering, not claimed Archify output.

## Visuals selected for useful Archify treatment

1. **W05D1 — client question to action surface**
   - Flow: decision question → Case/Policy nodes → `CITES` relationship with provenance → decision point → application-owned action surface.
   - Teaching job: distinguish entity/property/relationship and show that the graph supports, but does not authorize, action.

2. **W05D2 — governed graph import**
   - Flow: synthetic source → normalize → constrained identity → idempotent merge → versioned rule/provenance → ADR lock/defer → acceptance tests.
   - Teaching job: separate performance/indexes from integrity/constraints and storage from enforcement.

3. **W05D3 — GraphRAG construction and retriever fork**
   - Flow: documents/chunks → candidate extraction → schema/provenance validation → Neo4j → Vector / VectorCypher / Text2Cypher branches → bounded context.
   - Teaching job: make the experimental builder boundary and retriever tradeoffs visible.

4. **W05D4 — production context assembly**
   - Flow: question → Chroma candidates + Neo4j path → LangGraph evidence node → layered grounding evaluation → context assembler → NFR/cost review → agent input.
   - Teaching job: show hybrid responsibilities, policy boundary, and context-budget decisions.

5. **W05D5 — evidence-backed two-audience readout**
   - Flow: client outcome → graph-model review → retrieval trace/source path → ADR/risk → executive and technical cuts → repository-local evidence pack.
   - Teaching job: connect every readout claim to evidence and show unsupported confidence as a release blocker.

## Required post-processing if execution becomes authorized

- System fonts only; no remote brand, icon, font, or runtime dependency.
- Inline the SVG in each standalone Week 5 HTML route.
- Add meaningful `<title>` and `<desc>`, explicit `role="img"`/ARIA, and a keyboard/readable text alternative.
- Preserve the current diagram’s teaching sequence and Core-30 three-minute dwell.
- Record Archify source version/commit and output hash; add deterministic drift/import checks.
- Validate light/dark themes, narrow/wide layouts, keyboard reading order, reduced motion, print, and no-JavaScript behavior.
