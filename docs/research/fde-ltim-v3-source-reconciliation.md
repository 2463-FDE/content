# LTIM FDE v3 authoritative-source reconciliation

**Reconciled:** 2026-10-27  
**Compared baseline:** `origin/main` at `a971f2aeec2fc65d6d71c134eae52b2bb7889061` (also verified against GitHub's `main` ref)  
**Authority:** read-only local artifact `/Users/jestercharles/Downloads/RevaturePro | LTIM FDE v3.pdf`

## Custody and verification

The curriculum authority is identified by bytes, not by a similarly named file.

| Check | Verified value |
|---|---|
| SHA-256 | `1792ba5c20a62fdd1e83463d9032d129ee644e58b220129b2f736f5fb863ed7e` |
| Header / file type | `%PDF-1.3` / PDF document version 1.3 |
| Page count | 8 |
| Read method | `pdftotext -f N -l N -layout … -` against the original, without modifying or copying it |

The PDF itself is not committed. No other source candidate or historical artifact was changed or removed to establish this authority. Dated first-party research under `docs/research/` remains the authority for current technical behavior; the PDF controls curriculum scope and sequence.

## Complete eight-page inventory

The cells below compact repeated bullets without dropping a curriculum item. Parenthetical route lists show where the site teaches or closes the item. Operational items such as assessment, readout, retrospective, and feedback are curriculum content too.

### Page 1

- **Week 1 Monday — program and Claude Code launch** (`weeks/w01/d1.html`): orientation and reverse-classroom model; Claude Code install/auth/first session; `CLAUDE.md`; plan mode and spec-before-code; context windows/token budgets; hallucination failure modes; baseline AI-assisted workflow and screened LLM-skill calibration.
- **Week 1 Tuesday — brownfield and model plane** (`d2.html`): brownfield onboarding and code/system maps; Claude/GPT/Gemini/open-source selection; Bedrock model access, invocation, inference profiles, Converse/streaming, quotas, throttling, cross-region inference, provisioned versus on-demand capacity, retry/backoff/batching, and cost/latency tier trade-offs.
- **Week 1 Wednesday — production prompting** (`d3.html`): prompt-pattern calibration; temperature/sampling; system prompts; chain-of-thought reliability; JSON-schema structured output; prompt templates/versioning; tool-use prompting; model-requirements synthesis.
- **Week 1 Thursday — production hardening** (`d4.html`): caching, compression, dynamic prompt assembly, API-spend tracking, output validation, Bedrock Guardrails first look, hallucination mitigation, prompt-regression introduction.
- **Week 1 Friday — review and delivery** (`d5.html`, `survey.html`, `certifications.html`): Claude Code retro; Bedrock versus Google's model/enterprise-agent surface; provider parity check; code review assessment; prompt-library submission; executive and technical readout; feedback.
- **Week 2 Monday begins — RAG pipeline** (`weeks/w02/w02d1.html`): retrieval versus fine-tuning; ingestion/parsing; fixed, recursive, semantic, and late chunking; Claude Code skill for repeatable ingestion.

### Page 2

- **Week 2 Tuesday — embeddings and Chroma** (`w02d2.html`): model-selection criteria, dimensionality, batch embedding, cost/quality; ephemeral versus persistent clients; collections/metadata; client-server mode; query patterns and metadata filters.
- **Week 2 Wednesday — retrieval and data placement** (`w02d3.html`): dense, sparse, and hybrid retrieval; reranking/cross-encoder scoring; Chroma in Docker on AWS; Chroma Cloud versus self-hosting; BigQuery as enterprise data source; data-comprehension situation session.
- **Week 2 Thursday — evaluation** (`w02d4.html`): faithfulness, context recall, answer relevance, eval-harness build, retrieval misses, context pollution, and hallucination on retrieved content.
- **Week 2 Friday — delivery** (`w02d5.html`, `certifications.html`): Claude Code skills retro; Chroma on ECS/GKE compared with managed Google vector/search and Cloud Run; skill evaluation; end-to-end brownfield RAG over the client corpus; harness submission; executive and technical readout; feedback.
- **Week 3 Monday — single-agent architecture** (`weeks/w03/w03d1.html`, `w03d3.html`, `w03d5.html`): ReAct, plan-and-execute, Reflexion, trade-offs, LangChain v1 `create_agent`, middleware, Claude Code loop as reference, and MCP clients/servers/tools/resources/prompts.
- **Week 3 Tuesday — tool contract and human control** (`w03d2.html`, `w03d5.html`): JSON Schema tool/function calling; tool errors, retry, idempotency, structured output; approval gates, confidence thresholds, and escalation paths.
- **Week 3 Wednesday — MCP and memory** (`w03d2.html`, `w03d4.html`): Python MCP server lab; in-context, external-vector, episodic, semantic, and procedural memory; state management; technical-stack onboarding situation session.
- **Week 3 Thursday — observability** (`w03d5.html`): eval-driven success metrics/suites; OTel traces/spans/OTLP; GenAI semantic conventions; LangSmith versus OTel-native tracing; structured logging, replay, failure attribution, end-to-end instrumentation.
- **Week 3 Friday — agent defense and delivery** (`w03d5.html`): completed-agent submission; Claude Code hooks; ADOT/CloudWatch/X-Ray versus Cloud Trace targets; walkthrough assessment; brownfield live-agent workflow; demo craft; executive and technical readout; feedback.
- **Week 4 Monday begins — orchestration** (`weeks/w04/w04d1.html`, `w04d2.html`): supervisor-worker, hierarchical, peer-to-peer, parallel fan-out; StateGraph state/nodes/edges, conditional routing, checkpoints/durable execution, persistence.

### Page 3

- **Week 4 Tuesday — execution and communication** (`w04d1.html`, `w04d2.html`): interrupts/HITL, parallel execution/streaming, subgraphs, structured handoffs, shared schemas/state, message passing, conflict resolution, cross-framework considerations.
- **Week 4 Wednesday — CrewAI and framework decision** (`w04d3.html`): role-based crews/tasks/process; flows with `@start`/`@listen` and typed state; Crews versus Flows versus LangGraph; over-orchestration, chatty agents, uncontrolled recursion, state explosion; framework-selection defense.
- **Week 4 Thursday — operating multi-agent systems** (`w04d4.html` source bridge): parallelism, caching, per-agent token budgets, approval gates, cross-agent trace correlation, cost dashboards, Claude Code subagents, and the provider-swap seam.
- **Week 4 Friday — pipeline defense** (`w04d5.html` source bridge): clear boundaries and structural handoffs; Claude Code subagent retro; Gemini enterprise-agent/connectors/workspace exercise; ServiceNow/Jira mock MCP boundaries; architecture defense and code walkthrough; brownfield orchestration delivery; executive and technical readout; feedback.
- **Week 5 Monday — graph model** (`weeks/w05/w05d1.html`): property-graph model; graph/relational/vector judgement; `MATCH`, `CREATE`, `MERGE`, filtering/aggregation; Docker/Browser; entities, relationships, decision points, action surfaces.
- **Week 5 Tuesday — governed graph** (`w05d2.html`): variable-length traversal; indexes/constraints; imports; business rules/standards; compliance governance; lock/defer ADRs; schema workshop.
- **Week 5 Wednesday — GraphRAG build** (`w05d3.html`): why graphs ground LLMs; experimental `SimpleKGPipeline`; entity/relation extraction; `VectorRetriever`, `VectorCypherRetriever`, `Text2CypherRetriever`; context-diagram/domain-model situation session.
- **Week 5 Thursday — production context** (`w05d4.html`): institutional memory; Chroma + Neo4j; LangGraph graph node; grounding evaluation; context assembly; query cost/performance; Claude Code + Neo4j MCP; cross-cloud topology; self-managed versus Aura.
- **Week 5 Friday — model review and readout** (`w05d5.html`): Claude Code MCP-config retro; Text2Cypher quality; graph-model assessment; GraphRAG brownfield service; executive and technical readout; feedback.

### Page 4

- **Week 6 Monday — Kafka foundations** (`weeks/w06/w06d1.html`): queues/pub-sub/streams; topics/partitions/offsets; brokers/KRaft; producer keys/partitioning/acks; consumers/groups; local cluster and CLI.
- **Week 6 Tuesday — delivery and economics** (`w06d2.html`): MSK versus Google managed Kafka versus Pub/Sub; at-most/at-least/exactly-once; JSON/Avro/schema-registry concept; rebalance/lag; retry/DLQ; idempotent producers/transactions; Python; requirements elicitation.
- **Week 6 Wednesday — event-driven AI** (`w06d3.html`): MSK versus self-managed; CrewAI Flow versus LangGraph invocation; asynchronous LLM work; backpressure/token budget; Chroma/Neo4j CDC-style ingestion; LLM side-effect semantics; lag/throughput; producer/consumer scaffolding.
- **Week 6 Thursday — build and operate** (`w06d4.html`): Kafka→agent→stores E2E; broker-failure/rebalance prediction; lag alerts; OTel headers; streaming/batch cost; runbook; static cross-cloud interop, egress, and data-gravity measurement.
- **Week 6 Friday — defend and deliver** (`w06d5.html`): Claude Code test-review retro; throughput/lag report; pipeline architecture defense; client-system ingestion delivery; executive and technical readout; feedback.
- **Week 7 Monday begins — Terraform** (`weeks/w07/w07d1.html`): declarative/imperative and idempotence; write/plan/apply; providers/resources/data sources; variables/outputs; local/remote state and locking; AWS provider; lifecycle/destroy; Google provider/resource hierarchy.

### Page 5

- **Week 7 Tuesday — modules and drift** (`w07d2.html`): critical plan review; modules/reuse; environments/workspaces; training-stack topology; secrets/state hygiene; drift; HCP Terraform/OpenTofu awareness; AI-assisted plan review; multi-provider root/module boundaries.
- **Week 7 Wednesday — Ansible** (`w07d3.html`): inventory/ad-hoc commands; playbooks/tasks; roles/collections; idempotence/handlers; Jinja templates/variables; Terraform-provisions/Ansible-configures; multi-provider boundaries; estimation situation session.
- **Week 7 Thursday — AI CI/CD** (`w07d4.html`): automated eval gates, regression detection, staged rollout, eval deployment gates, GitHub Actions plan/apply pipeline, headless Claude Code review/eval authoring, infrastructure tests, GitHub MCP topic.
- **Week 7 Friday — rebuild and delivery** (`w07d5.html`): teardown/rebuild drill; CI retro; `google.cloud` dynamic-inventory/cross-cloud targeting topic; IaC assessment; Terraform+Ansible brownfield rebuild; executive and technical readout; feedback.
- **Week 8 Monday — service reliability** (`weeks/w08/w08d1.html`): probabilistic versus deterministic systems; latency, cost, tokens, errors, hallucination, retrieval quality; AI-feature SLOs.
- **Week 8 Tuesday — OTel and drift** (`w08d2.html`): traces/metrics/logs; Collectors/OTLP; GenAI spans/agent spans/metrics; LangGraph+Bedrock instrumentation; output, embedding, and retrieval drift; backend portability and cost-per-span.
- **Week 8 Wednesday — correlation** (`w08d3.html`): system-scale trace IDs and attribution; cross-agent correlation; HTTP/Kafka context propagation; dashboards/alerts; structured logs; bad-answer root-cause situation session.
- **Week 8 Thursday — guardrails** (`w08d4.html`): input validation, output filtering, circuits, graceful degradation, Bedrock contextual-grounding checks, `ApplyGuardrail` around any model, failure drills.
- **Week 8 Friday — operations delivery** (`w08d5.html`): on-call runbook; Claude Code trace-debugging retro; stack review; full-stack client observability delivery; executive and technical readout; feedback.
- **Week 9 heading begins** on this page; its row continues on page 6.

### Page 6

- **Week 9 Monday — threats** (`weeks/w09/w09d1.html`): prompt injection, jailbreaking, leakage, poisoning, tool misuse, defenses, OWASP LLM Top 10, own-agent threat model.
- **Week 9 Tuesday — least privilege/privacy** (`w09d2.html`): RBAC/MCP auth; tool/server scope; least privilege; PII detection/masking; minimization; confidential prompts; secrets; Claude Code hooks/permission modes.
- **Week 9 Wednesday — governance** (`w09d3.html`): SOX/HIPAA/GDPR/EU AI Act comparison; audit trails, explainability, oversight; responsible AI; security threat-model session; Workload Identity Federation versus IAM roles with OIDC.
- **Week 9 Thursday — security gates and red team** (`w09d4.html`): automated scanning; secrets management; LLM Guard/AWS IAM/Presidio topic; Bedrock Automated Reasoning checks; audit and peer red-team; Bedrock Guardrails versus Model Armor.
- **Week 9 Friday — hardening delivery** (`w09d5.html`, `certifications.html`): compliance mapping change request; Claude Code security retro; security-audit/remediation delivery; technical exam; executive and technical readout; feedback.
- **Week 10 Monday — rollout planning** (`weeks/w10/w10d1.html`): final-feature brief/ambiguity resolution; cutover; NFRs; E2E validation; ADR/decision log; risk/mitigation; estimation/task assignment; workload-placement memo continuation on page 7.
- **Week 10 Tuesday — release execution** (`w10d2.html`): Claude Code production-rollout rehearsal; full eval/CI regression; hot-path performance; merge/conflict; alert/dashboard verification; security sign-off/remediation; client expectation session.
- **Week 10 Wednesday — verify and hand off** (`w10d3.html`): rollback readiness; system smoke/failure drills; docs/runbooks/ADR index; dashboard curation; environment/access docs; knowledge-transfer preparation.
- **Week 10 Thursday — freeze and rehearse** (`w10d4.html`): freeze/final verification; readiness review; handoff narrative; peer review; capstone executive-readout dry run.
- **Week 10 Friday — showcase and sign-off** (`w10d5.html`): final sign-off/production handoff; architecture defense; Claude Code toolkit export; cloud-placement defense; full-application executive readout; feedback.

### Page 7

- **Week 10 Monday continuation** (`w10d1.html`): workload-placement memo explicitly considers BigQuery, Cloud Run, and Vertex AI Search. The site keeps these as source-assigned decision rows, not invented prices or a predetermined provider conclusion.

### Page 8

- Legend only: Project Phases 1–4 and Technologies, followed by the Revature copyright notice. It assigns no additional learner topic or route.

## Measurable coverage baseline

The extraction has two representations: the complete human-readable inventory above and the machine-readable map in [`fde-ltim-v3-coverage.json`](fde-ltim-v3-coverage.json). The denominator is **396 source items** across **10 modules and 50 day cells**:

- 353 visually separated standard topic groups;
- 33 red milestone or delivery groups;
- 10 Friday feedback links.

Repeated phase labels, weekday headers, the page-8 legend, and copyright text are not learner objectives. This rule is reproducible from the PDF layout: standard item lines are grouped within a day column at their 20-point continuation spacing; a larger vertical gap starts the next item. Red groups and feedback links use their own PDF text styles. The checked-in map records each day's count, route mapping, status, and gap.

At `origin/main` the route-day baseline is **34 covered, 14 partial, and 2 conflicting**. Weighted by the source items assigned to those whole day cells, 271 items sit in covered cells, 109 in partial cells, and 16 in conflicting cells. These weighted figures classify day cells; they do **not** claim that every item in a partial cell is absent.

## Gap and conflict inventory

| Parallel lane | Bounded handoff |
|---|---|
| Week 1 | D1 needs the operating launch (orientation, auth/toolchain, `CLAUDE.md`, plan-mode discipline, baseline calibration). D5 needs the Claude Code retro, provider-parity defense, and explicit executive/technical close. Preserve provider-path Core 30 and the existing survey. |
| Weeks 2–4 | W2 D5 needs the source's skills retro, named deployment comparison, client-corpus delivery, two-audience readout, and feedback. W3's source outcomes are scattered: add Plan-and-Execute/Reflexion, confidence/escalation, the Python MCP lab, eval-driven observability with replay/failure attribution, and Friday delivery closure. W4 D2 needs communication/conflict criteria. W4 D4–D5 are the two conflicts: graph/GraphRAG displaced the source's multi-agent operations and delivery days. Preserve the useful graph work or its history while restoring the v3 outcomes. |
| Weeks 5–7 | No day-level content gap found against v3. Keep Week 5 Neo4j, Week 6 Kafka, Week 7 Terraform+Ansible/AI CI/CD, team-primary-cloud isolation, static-only exercises, Core 30, and Archify provenance unchanged. Week-owned work should only correct a demonstrated item-level mismatch. |
| Weeks 8–10 | W8 is covered. W9 D3–D5 still describe the landed cloud/certification evidence as pending; integrate the source-assigned WIF versus IAM/OIDC, Bedrock Guardrails versus Model Armor, and certification-selection outcomes from the existing dated evidence. W10 D1 must name BigQuery, Cloud Run, and Vertex AI Search in the memo; D5 needs the evidence-linked cloud-placement defense. Do not invent prices, infrastructure, credentials, or a predetermined provider recommendation. |

Shared findings: all 50 route targets exist; the stale global `cloudPath` status conflicts with the already-landed certification map; several shared lesson-data headers still call a provisional derivative authoritative. This lane corrects those global contracts only. Personal AWS/GCP/Both selection remains separate from Project 2's one team-primary cloud.

## Regression contract

`tests/test_v3_source_reconciliation.py` pins the recorded artifact identity, extraction denominator, 10-module/50-day map, route existence, baseline metrics, global cloud/certification status, and exact-source provenance pointers. Existing Core-30, cloud-path, no-JavaScript, Archify provenance/drift, accessibility, and browser suites continue to own established behavior.
