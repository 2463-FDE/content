# Weeks 5–7 production inventory against LTIM FDE v3

**Checked:** 2026-10-27

**Baseline:** default-branch commit `a971f2aeec2fc65d6d71c134eae52b2bb7889061`

**Authority:** `RevaturePro | LTIM FDE v3.pdf`, literal `%PDF-1.3` header, 8 pages, SHA-256 `1792ba5c20a62fdd1e83463d9032d129ee644e58b220129b2f736f5fb863ed7e`

**Custody:** read only from the designated external path; the PDF is not copied, modified, moved, renamed, committed, or published.

The concurrent source-reconciliation PR #30 was inspected as read-only evidence. Its machine-readable count gives this lane 121 source items across 15 days: Week 5 = 39, Week 6 = 39, Week 7 = 43. The inventory below independently checks those day cells against current-main learner routes, interaction/check data, hub/trainer links, project packets, and regression coverage. “Covered” means the technical outcome is present; a production gap can still block launch.

## Corrected identity and project boundary

| Week | Source module | Project state | Current-main identity | Production disposition |
|---|---|---|---|---|
| 5 | Neo4j Knowledge Graphs & Context Engineering | Project 1, solo; fictional property-and-casualty insurance brownfield | Correct technical week, but lesson routes do not visibly keep the solo insurance context | Keep technical content; add an explicit Project 1 context marker to every route |
| 6 | Kafka & Event-Driven AI Pipelines | Project 2 begins; team of 2–3 inherits the system for a fictional regional banking/payments client | Correct technical week, but the route does not establish the banking/payments handover or Week 6 team-primary-cloud ADR; no-JavaScript path sends learners away | Add a persistent handover/ADR boundary and complete static route content |
| 7 | IaC: Terraform + Ansible & CI/CD for AI | Same Project 2 team and bank/payments system | Correct technical week, but Day 1 says to write the “first” team-cloud ADR, which incorrectly delays the Week 6 decision; bank/payments is not visible in lesson chrome | Consume and validate the Week 6 ADR; add persistent Project 2 context |

A learner's AWS/GCP/Both reading selection remains independent from the team's one primary-cloud ADR. The personal choice controls what comparison material the learner sees. The team ADR controls one shared implementation lane; it never creates a split-primary team architecture.

## Week 5 — 39 source items

| Day | Items | Source objective/module inventory | Current-main evidence | Gap / action |
|---|---:|---|---|---|
| 1 | 9 | Property graphs; nodes/relationships/properties/labels; graph vs relational vs vector judgement; Cypher `MATCH`/`CREATE`/`MERGE`, filtering and aggregation; local Docker/Browser setup; entities, decision points, and action surfaces | `weeks/w05/w05d1.html`; required model-choice lab; six-question check; decision diagram; local-only code viewer | Technical coverage complete. Add visible solo P&C insurance context. |
| 2 | 7 | Variable-length traversal; indexes/constraints; import pipeline; business rules/standards; compliance evidence; lock-vs-defer ADR; graph-schema workshop and AI-native story | `w05d2.html`; lock/defer lab; governed-import diagram; six-question check | Technical coverage complete. Keep Project 1 context visible. |
| 3 | 8 | GraphRAG purpose; experimental `SimpleKGPipeline`; entity/relation extraction; `VectorRetriever`, `VectorCypherRetriever`, `Text2CypherRetriever`; context-diagram/domain session | `w05d3.html`; retriever lab; pinned/sanitized Archify v3.0.1 visual; six-question check | Technical coverage complete. Keep Project 1 context visible. |
| 4 | 9 | Graph as institutional memory; Chroma + Neo4j; LangGraph graph-query node; grounding evaluation; context assembly; query cost/performance; Neo4j MCP; cross-cloud self-managed/Aura topology | `w05d4.html`; context-pack lab; pinned/sanitized Archify visual; six-question check | Technical coverage complete. Keep provider comparison distinct from learner/team decisions. |
| 5 | 6 | Claude Code/MCP retrospective; Text2Cypher review; graph-model assessment; GraphRAG brownfield delivery; executive and technical readouts; feedback | `w05d5.html`; evidence gate lab; six-question check; local evidence-pack diagram | Technical coverage complete. Make the Week 5 solo-project close and Week 6 handover explicit. |

## Week 6 — 39 source items

| Day | Items | Source objective/module inventory | Current-main evidence | Gap / action |
|---|---:|---|---|---|
| 1 | 8 | EDA queue/pub-sub/stream judgement; Kafka topics/partitions/offsets; brokers/KRaft; producer keys/acks; consumers/groups; local cluster and CLI | `assets/js/curriculum-lessons-w06.js#w06d1`; decision lab; Archify event-flow visual; six-question check | Add the inherited banking/payments team handover and primary-cloud ADR as required context. |
| 2 | 8 | MSK vs Google managed Kafka vs Pub/Sub economics; delivery semantics; JSON/Avro and registry; lag/rebalance; retries/DLQ; idempotent producers/transactions; Python client; requirements elicitation | `w06d2` lesson data and route; semantic decision lab; six-question check | Preserve provider-native units and personal/team-cloud separation. |
| 3 | 9 | MSK vs self-managed; CrewAI/LangGraph event invocation; async LLM work; backpressure/token budgets; Chroma/Neo4j streaming writes; exactly-once limits; lag/throughput; scaffold review | `w06d3` lesson data and route; backpressure lab; six-question check | Tie the stream to the inherited banking/payment event without erasing prior artifacts. |
| 4 | 8 | End-to-end Kafka→agent→stores; broker failure/rebalance; lag alerting; OTel headers; stream-vs-batch cost; runbook; AWS→GCP interop; egress/data gravity | `w06d4` lesson data and route; recovery lab; Archify pipeline visual; six-question check | Technical coverage complete; keep exercise static and synthetic. |
| 5 | 6 | Test-review retro; throughput/lag report; architecture defense; brownfield event pipeline delivery; executive/technical readout; feedback | `w06d5` lesson data and route; defense lab; six-question check | Close on team banking/payments evidence and the already-recorded Week 6 ADR. |

**Launch blocker across all five routes:** the JavaScript-disabled experience currently exposes only an error/recovery message, not the required reading, visual alternative, interaction prompt, or checks. Generate complete semantic static fallbacks from the same lesson records.

## Week 7 — 43 source items

| Day | Items | Source objective/module inventory | Current-main evidence | Gap / action |
|---|---:|---|---|---|
| 1 | 9 | IaC judgement and idempotence; Terraform workflow; HCL providers/resources/data/variables/outputs; state; AWS and Google foundations; lifecycle/destroy | `assets/js/curriculum-lessons-w07-w08.js#w07d1`; plan-decision lab; Archify delivery-control visual; six-question check; full no-JS route | Replace “first ADR” with validation/use of the Week 6 team ADR. |
| 2 | 9 | Plan-diff review; modules; workspaces/environments; training-stack topology; secrets; drift; HCP Terraform/OpenTofu awareness; AI-assisted plan review; provider/module boundaries | `w07d2` lesson data and route; plan-review lab; six-question check; full no-JS route | Keep team-primary implementation and learner comparison view separate. |
| 3 | 9 | Ansible inventory/ad-hoc commands; playbooks/tasks; roles/collections; handlers/idempotence; Jinja variables; Terraform-provisions/Ansible-configures; multi-provider boundaries; estimation session | `w07d3` lesson data and route; idempotence lab; six-question check; full no-JS route | Name the bank/payments target boundary; no host or dynamic-inventory call. |
| 4 | 9 | AI-system CI/CD; eval regression gates; staged rollout; GitHub Actions plan/apply shape; headless AI review/eval authoring; infrastructure testing; human approval and rollback | `w07d4` lesson data and route; immutable-plan lab; six-question check; full no-JS route | Technical coverage complete; apply/deploy remains blocked. |
| 5 | 7 | Teardown/rebuild drill; CI retrospective; Google dynamic inventory comparison; IaC assessment; brownfield infrastructure delivery; executive/technical readout; feedback | `w07d5` lesson data and route; fallback lab; six-question check; full no-JS route | Defend the Week 6 ADR rather than creating it here; retain one team primary. |

## Production acceptance to regress

1. Fifteen routes retain the corrected Week 5→6→7 identity and day ordering.
2. Every route publishes measured required prose, an essential diagram/text alternative, one objective-aligned decision interaction, and six checks within 30 minutes; optional depth stays in `details.deep[data-core="optional"]`.
3. Week 5 visibly remains the solo P&C-insurance project. Week 6 visibly starts the inherited 2–3-person banking/payments project and links the team-primary-cloud ADR. Week 7 consumes that decision.
4. Personal AWS/GCP/Both selection and team-primary cloud remain separately described and independently restorable; neither silently changes the other.
5. Week 6 static fallbacks expose the required content, practice answer/feedback, checks, visual alternative, and onward/hub navigation without JavaScript.
6. Trainer navigation names and links Week 5, Week 6 handover/Kafka, and Week 7 IaC in source order.
7. Existing pinned Archify v3.0.1 bytes, hashes, sanitization, accessibility, provenance, and no-runtime contracts remain unchanged.
