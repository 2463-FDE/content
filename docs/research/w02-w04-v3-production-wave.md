# Weeks 2–4 LTIM FDE v3 production inventory

Verified: 2026-10-27

## Authority and custody

The content authority was read in place at `/Users/jestercharles/Downloads/RevaturePro | LTIM FDE v3.pdf` only after these checks matched:

- literal file header: `%PDF-1.3`
- page count: 8
- SHA-256: `1792ba5c20a62fdd1e83463d9032d129ee644e58b220129b2f736f5fb863ed7e`

The PDF remains outside the repository and unchanged. Current technical claims continue to trace to the dated, first-party artifacts under `docs/research/w02/`, `w03/`, and `w04/`; the PDF controls scope and sequence.

## Denominator and route inventory

Weeks 2–4 contain **124 visually separated source items across 15 day cells**: Week 2 has 40, Week 3 has 42, and Week 4 has 42. Every day has one existing route. The item counts and baseline classifications below reproduce the exact-source reconciliation evidence from read-only PR #30 without taking custody of its branch.

| Day | Items | Authoritative objective groups | Route | Main baseline | Production disposition |
|---|---:|---|---|---|---|
| W2 D1 | 8 | RAG fundamentals; retrieval vs fine-tuning; ingestion/parsing; fixed, recursive, semantic, late chunking; Claude Code ingestion skill | `weeks/w02/w02d1.html` | covered | Preserve; add measured Core 30 and insurance-project evidence |
| W2 D2 | 9 | embedding selection; dimensions; batch embeddings; cost/quality; Chroma architecture; collections/metadata; client-server mode; query/filter patterns | `weeks/w02/w02d2.html` | covered | Preserve provider-specific Core 30; add project evidence |
| W2 D3 | 8 | dense, sparse, hybrid; reranking/cross-encoders; Chroma on AWS; Chroma Cloud vs self-hosted; BigQuery source; data-comprehension session | `weeks/w02/w02d3.html` | covered | Preserve provider-specific Core 30; add project evidence |
| W2 D4 | 8 | faithfulness; context recall; answer relevance; harness build; retrieval misses; context pollution; retrieved-content hallucination | `weeks/w02/w02d4.html` | covered | Preserve; add measured Core 30 and project evidence |
| W2 D5 | 7 | Claude Code skills retro; ECS/GKE/managed Google comparison; skill evaluation; client-corpus E2E RAG; harness submission; executive/technical readout; feedback | `weeks/w02/w02d5.html` + certification comparison | partial | Restore the delivery closure and evidence package |
| W3 D1 | 9 | ReAct; plan-and-execute; Reflexion; trade-offs; LangChain v1 `create_agent`; middleware; Claude Code loop mapping; MCP architecture | `weeks/w03/w03d1.html` plus existing D3/D5 depth | partial | Make Plan-and-Execute and Reflexion explicit |
| W3 D2 | 8 | JSON Schema tool calling; errors; retry; idempotency; structured output; approval gates; confidence thresholds; escalation paths | `weeks/w03/w03d2.html` plus D5 | partial | Add explicit confidence/escalation policy |
| W3 D3 | 8 | Python MCP server lab; in-context, external-vector, episodic, semantic, procedural memory; state; stack-onboarding session | `weeks/w03/w03d3.html` with D2/D4 bridges | partial | Add the stack-onboarding outcome on Day 3; the inert Python MCP lab is a cross-day bridge on W3 D2 and memory forms remain on W3 D4 (bridges, not Day 3 coverage) |
| W3 D4 | 9 | eval-driven metrics/suites; OTel traces/spans/OTLP; GenAI conventions; LangSmith vs OTel; structured logs; replay; attribution; E2E instrumentation | `weeks/w03/w03d4.html` with D5 bridge | partial | Add success criteria, replay and failure-attribution evidence |
| W3 D5 | 8 | completed agent; hooks retro; AWS/GCP OTLP targets; walkthrough; brownfield automation; demo craft; two-audience readout; feedback | `weeks/w03/w03d5.html` | partial | Add explicit submission/readout/feedback closure |
| W4 D1 | 9 | supervisor-worker; hierarchical; peer-to-peer; parallel fan-out; StateGraph state/nodes/edges; conditional routing; checkpointing/durability; persistence | `weeks/w04/w04d1.html` | covered | Preserve; add measured Core 30 and project evidence |
| W4 D2 | 8 | interrupts/HITL; parallel/streaming; subgraphs; structured handoffs; shared schemas/state; message passing; conflict resolution; interop | `weeks/w04/w04d2.html` | partial | Add handoff envelope, ownership and conflict policy |
| W4 D3 | 9 | CrewAI crews/tasks/process; typed flows; Crews vs Flows vs LangGraph; over-orchestration; chatty agents; recursion; state explosion; framework defense | `weeks/w04/w04d3.html` | covered | Preserve provider-specific Core 30; add project evidence |
| W4 D4 | 8 | parallelism; caching; token budgets; approval gates; cross-agent trace correlation; cost dashboards; Claude subagents; provider-swap seam | `weeks/w04/w04d4.html` | conflict | Restore source day; retain graph preview as optional Week 5 bridge/history |
| W4 D5 | 8 | clear boundaries/handoffs; subagent retro; Gemini enterprise-agent exercise; mock ServiceNow/Jira MCP; architecture defense; code walkthrough; brownfield delivery; readout/feedback | `weeks/w04/w04d5.html` | conflict | Restore delivery day; retain GraphRAG preview as optional Week 5 bridge/history |

## Production contract

- All 15 routes keep 7–9 required diagram steps, an objective-aligned interaction, and a five-to-seven-question practice check.
- Provider-neutral routes use one measured Core-30 path that is identical for AWS and GCP learners. Routes with provider mechanics keep independent AWS and GCP labels and required paths; the selected cloud is primary and the other is comparison depth.
- Optional technical depth is marked `details.deep[data-core="optional"]`. Required prose is at most 1,800 words and the visible minutes equal `round(words / 150)`.
- Project 1 remains solo and local-first through Week 5. Each day emits one artifact for a **synthetic insurance brownfield** and requires assumptions to be labeled rather than presented as client facts.
- No exercise provisions infrastructure, invokes a paid model, uses credentials, sends communication, or stores learner PII. Code and cloud exercises are static/read-only.

## Project progression

The 15 daily evidence increments form one reviewable chain:

1. W2: corpus boundary → embedding/index decision → retrieval plan → eval cases → E2E RAG evidence/readout.
2. W3: agent-pattern ADR → tool/MCP contract → framework boundary → memory policy → instrumented single-agent evidence/readout.
3. W4: orchestration ADR → durable shared-state/handoff contract → framework defense → cost/trace/approval operating envelope → architecture defense and two-audience readout.

These are learner-authored decisions against synthetic inputs. They do not assert any unnamed client's systems, policies, thresholds, or cloud topology.
