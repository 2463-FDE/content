# Curriculum-to-activity coverage — LTM learning-experience correction

Generated 2026-10-30 from `assets/js/curriculum-map.js` (the 50 required day routes),
each route's committed HTML, and `docs/research/fde-ltim-v3-coverage.json` (the accepted
396-item/50-day reconciliation). An activity counts only if it is one of the substantive
kinds enforced by `tests/test_learning_experience.py`: a live widget class that changes or
inspects state/output/evidence with explanatory feedback (`ix-*`), a shared activity mount
(`data-activity`), or — on a shared-renderer shell — a no-JS activity fallback
(`data-activity-fallback`). MCQ comprehension checks and placeholders deliberately do not count.

| # | Route | Day topic | v3 source items | v3 status | Distinct substantive activities |
|---|-------|-----------|-----------------|-----------|--------------------------------|
| 1 | `weeks/w01/d1.html` | LLM fundamentals | 8 | partial | 4: ix-predict, ix-run, ix-spot, ix-temp |
| 2 | `weeks/w01/d2.html` | Model selection & API patterns | 9 | covered | 5: ix-cloud, ix-cost, ix-predict, ix-retry, ix-spot |
| 3 | `weeks/w01/d3.html` | Prompt engineering & FDE Situation | 8 | covered | 3: ix-predict, ix-run, ix-spot |
| 4 | `weeks/w01/d4.html` | Token optimization & guardrails | 9 | covered | 5: ix-cloud, ix-cost, ix-predict, ix-run, ix-spot |
| 5 | `weeks/w01/d5.html` | Code review + LLM API Client | 7 | partial | 3: ix-predict, ix-retry, ix-spot |
| 6 | `weeks/w02/w02d1.html` | RAG fundamentals + chunking | 8 | covered | 3: ix-chunk, ix-retrieve, ix-sim |
| 7 | `weeks/w02/w02d2.html` | Embeddings + vector stores | 9 | covered | 6: ix-cloud, ix-dims, ix-predict, ix-retrieve, ix-sim, ix-spot |
| 8 | `weeks/w02/w02d3.html` | Retrieval strategies | 8 | covered | 3: ix-cloud, ix-predict, ix-retrieve |
| 9 | `weeks/w02/w02d4.html` | RAG evaluation | 8 | covered | 3: ix-faith, ix-precision, ix-ragas |
| 10 | `weeks/w02/w02d5.html` | E2E RAG + evidence readout | 7 | partial | 3: ix-chunk, ix-faith, ix-retrieve |
| 11 | `weeks/w03/w03d1.html` | Agent architectures + ReAct loop | 9 | partial | 2: ix-agent, ix-predict |
| 12 | `weeks/w03/w03d2.html` | Tools & MCP | 8 | partial | 4: ix-cloud, ix-consent, ix-mcp, ix-transport |
| 13 | `weeks/w03/w03d3.html` | Agent framework landscape | 9 | partial | 4: ix-cloud, ix-frameworks, ix-handoff, ix-predict |
| 14 | `weeks/w03/w03d4.html` | Agent memory | 8 | partial | 3: ix-cloud, ix-compress, ix-paging |
| 15 | `weeks/w03/w03d5.html` | Production single agent | 8 | partial | 3: ix-agent, ix-cloud, ix-predict |
| 16 | `weeks/w04/w04d1.html` | Multi-agent orchestration patterns | 9 | covered | 2: trace, tradeoff |
| 17 | `weeks/w04/w04d2.html` | LangGraph state & persistence | 8 | partial | 3: fault, ix-checkpoint, order |
| 18 | `weeks/w04/w04d3.html` | Multi-agent framework landscape | 9 | covered | 3: evidence, ix-cloud, params |
| 19 | `weeks/w04/w04d4.html` | Operating multi-agent systems | 8 | conflict | 3: ix-cloud, order, params |
| 20 | `weeks/w04/w04d5.html` | Multi-agent architecture defense | 8 | conflict | 2: evidence, order |
| 21 | `weeks/w05/w05d1.html` | Property-graph domain model | 9 | covered | 2: evidence, trace |
| 22 | `weeks/w05/w05d2.html` | Governed graph schema | 7 | covered | 2: order, tradeoff |
| 23 | `weeks/w05/w05d3.html` | GraphRAG construction | 8 | covered | 2: evidence, params |
| 24 | `weeks/w05/w05d4.html` | Production context engineering | 9 | covered | 2: fault, trace |
| 25 | `weeks/w05/w05d5.html` | GraphRAG model review | 6 | covered | 2: evidence, order |
| 26 | `weeks/w06/w06d1.html` | Team handover + Kafka foundations | 8 | covered | 3: params, trace, tradeoff |
| 27 | `weeks/w06/w06d2.html` | Delivery semantics, schemas & economics | 8 | covered | 3: evidence, order, tradeoff |
| 28 | `weeks/w06/w06d3.html` | Event-driven agents & streaming stores | 9 | covered | 3: fault, params, tradeoff |
| 29 | `weeks/w06/w06d4.html` | Build, fail & operate the pipeline | 8 | covered | 3: fault, trace, tradeoff |
| 30 | `weeks/w06/w06d5.html` | Pipeline defense & measured readout | 6 | covered | 3: evidence, params, tradeoff |
| 31 | `weeks/w07/w07d1.html` | Terraform foundations & plan discipline | 9 | covered | 3: evidence, order, tradeoff |
| 32 | `weeks/w07/w07d2.html` | Modules, drift & AI plan review | 9 | covered | 3: evidence, fault, tradeoff |
| 33 | `weeks/w07/w07d3.html` | Ansible configuration & idempotence | 9 | covered | 3: order, params, tradeoff |
| 34 | `weeks/w07/w07d4.html` | AI CI/CD gates | 9 | covered | 3: fault, order, tradeoff |
| 35 | `weeks/w07/w07d5.html` | Project 2 infrastructure delivery | 7 | covered | 3: evidence, order, tradeoff |
| 36 | `weeks/w08/w08d1.html` | AI service signals & SLOs | 9 | covered | 3: evidence, params, tradeoff |
| 37 | `weeks/w08/w08d2.html` | OTel signals & GenAI spans | 8 | covered | 2: trace, tradeoff |
| 38 | `weeks/w08/w08d3.html` | Cross-system correlation | 7 | covered | 3: evidence, fault, tradeoff |
| 39 | `weeks/w08/w08d4.html` | Evaluations & reliability guardrails | 8 | covered | 3: evidence, params, tradeoff |
| 40 | `weeks/w08/w08d5.html` | Incident response & reliability evidence | 6 | covered | 3: order, params, tradeoff |
| 41 | `weeks/w09/w09d1.html` | Threat-model the delivered system | 9 | covered | 3: evidence, order, tradeoff |
| 42 | `weeks/w09/w09d2.html` | Least privilege across agents & MCP | 8 | covered | 3: fault, params, tradeoff |
| 43 | `weeks/w09/w09d3.html` | Obligations → control evidence | 8 | partial | 4: evidence, ix-cloud, trace, tradeoff |
| 44 | `weeks/w09/w09d4.html` | Security audit + peer red team | 8 | partial | 4: fault, ix-cloud, order, tradeoff |
| 45 | `weeks/w09/w09d5.html` | Hardening readout | 6 | partial | 4: evidence, ix-cloud, order, tradeoff |
| 46 | `weeks/w10/w10d1.html` | Plan a reversible rollout | 9 | partial | 3: ix-cloud, order, tradeoff |
| 47 | `weeks/w10/w10d2.html` | Execute the release rehearsal | 7 | covered | 3: fault, order, tradeoff |
| 48 | `weeks/w10/w10d3.html` | Verify rollback + build handoff | 6 | covered | 3: evidence, trace, tradeoff |
| 49 | `weeks/w10/w10d4.html` | Freeze + rehearse the full story | 5 | covered | 2: order, tradeoff |
| 50 | `weeks/w10/w10d5.html` | Client showcase + final handoff | 6 | partial | 4: evidence, ix-cloud, order, tradeoff |

**Summary:** 50/50 required day routes carry ≥2 distinct substantive activity kinds
(min 2, max 6 per route; 154 distinct-kind slots across the program).
Every Weeks 6–10 shared-renderer shell also carries ≥2 distinct no-JS activity fallbacks in
its committed semantic article (`test_shell_no_js_path_keeps_two_activities`). Per-objective
tracing from the private LTIM v3 source to each route remains authoritative in
`docs/research/fde-ltim-v3-coverage.json` (per-day `sourceItems`/`status`/`gap`) and the Week 1
40/40 record `docs/research/w01/w01-v3-source-coverage.md`; this table joins those records to the
activity layer added by this correction.

Honest limitations: the activity kinds above are the static/committed markers; rendered-shell
interactivity additionally includes each lesson's quiz and renderer-driven practices defined in
`assets/js/curriculum-lessons-*.js`. Interaction-to-feedback behavior is exercised by the
behavioral suites (`tests/test_learning_experience.py`, `tests/test_week1_launch_readiness.py`,
`tests/test_platform_weeks_core30.py`, `tests/test_w05_neo4j_wave1.py`, `tests/lesson-activities.test.cjs`)
and the recorded browser pass in `behavioral-evidence.md`, not by this table alone.
