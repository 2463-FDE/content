# Week 10 source record excerpt

- **Record:** LTIM Custom FDE Curriculum — 10 Weeks (Reverse Classroom), captain-approved derivative (Week 10 section, plus the RevPro additions record for Week 10)
- **Record last modified:** 2026-09-25
- **Excerpted:** 2026-10-14

> **Use of this excerpt.** Topic names below are the approved curriculum record, copied verbatim. Provider product names, prices, and `[GCP]`/`[CC]` slots are curriculum *topic labels*, not verified current claims; current provider claims trace to the dated `*-provider-paths.md` artifacts indexed by `docs/research/w08-w10-production-wave.md`.

## Curriculum record — Week 10

*Specialization and Delivery*

**MON** (8 topics)
> 🏁 **Milestone — Rollout planning begins** (cutover strategy for production)
- FDE Situation Session: rollout planning & final-week priorities with the client
- Release planning & cutover strategy
- Non-functional requirements verification
- End-to-end integration validation
- ADR & decision-log consolidation
- Rollout risk assessment & mitigation
- Delivery estimation & task assignment
- **[GCP]** Workload-placement decision memo (assessed artifact): TCO model across both clouds — compute (including **Cloud Run** vs ECS/GKE serving), managed Kafka, vector store (**Vector Search on Gemini Enterprise Agent Platform**), managed search (**Agent Search on Gemini Enterprise Agent Platform**), warehouse-side retrieval (**BigQuery**), graph tier, model tokens, **Gemini Enterprise** seats where adopted, guardrail screening, observability ingestion, egress — with assumptions, volume sensitivity and a stated confidence level

**TUE** (7 topics)
> 🏁 **Milestone — Production rollout begins** (release execution to the client environment)
- **[CC]** Production rollout: release execution (Claude Code-driven)
- Regression validation: full eval-suite runs & CI gates
- Performance validation on hot paths
- Cross-team merge & conflict resolution
- Observability verification: alerts & dashboards
- Security sign-off & final remediation
- FDE Situation Session: client check-in & expectation management

**WED** (6 topics)
- Deployment verification & rollback readiness
- System-wide smoke tests & failure drills
- Handoff package: docs, runbooks, ADR index
- Observability dashboard curation for client operations
- Environment & access documentation
- Knowledge-transfer session prep

**THU** (5 topics)
- Release freeze & final build verification
- Production-readiness review
- Handoff narrative & delivery storytelling
- Capstone executive readout dry-run — full-length rehearsal of the W10 FRI showcase against the Friday rubric
- Peer review exchange

**FRI** (7 topics)
- Client showcase: capstone executive readout and full engagement walkthrough — executive presentation followed by the simulated client technical-team session
- **[GCP]** Cloud-placement defense: portability posture, lock-in surface inventory, exit-cost statement under both vendors' migration egress waivers, and the conditions that would flip the recommendation
- Final sign-off & production handoff
- Assessment: architecture defense
- **[CC]** Final retro: personal toolkit export (CLAUDE.md, skills, hooks, MCP config)
- Program retrospective
- Weekly feedback form

## RevPro additions record — Week 10

### W10 D1 (Monday) — 7 → 8 topics

**34. New topic** · tags: GCP, Deliverable
> **Ships as:** `Workload-placement memo: BigQuery, Cloud Run & Agent Search on Gemini Enterprise Agent Platform`

Merged entry: the assessed TCO and placement memo across both clouds now explicitly covers BigQuery, Cloud Run and Agent Search on Gemini Enterprise Agent Platform alongside compute, managed Kafka, vector store, graph tier, model tokens, guardrails, observability and egress.

### W10 D4 (Thursday) — 5 topics, unchanged count

**35. Updated topic** · tags: Deliverable
> **Ships as:** `Capstone executive readout dry-run`

Replaces the existing topic Client presentation dry-run. Named explicitly as the dry-run for the capstone executive readout.

### W10 D5 (Friday) — 6 → 7 topics

**36. Updated topic** · tags: Deliverable
> **Ships as:** `Client showcase: capstone executive readout & engagement walkthrough`

Replaces the existing topic Client showcase: full engagement walkthrough. Covers the full engagement walkthrough and closes the weekly readout progression with the capstone executive presentation.

**37. New topic** · tags: GCP, Deliverable
> **Ships as:** `Cloud-placement defense in the client showcase`
