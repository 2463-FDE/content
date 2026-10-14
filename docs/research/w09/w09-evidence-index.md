# Week 9 evidence index — AI security, governance, and hardening

- **Status:** approved curriculum transfer; provider-objective seam intentionally open
- **Prepared:** 2026-10-14
- **Primary curriculum record:** [`w09-source-excerpt.md`](w09-source-excerpt.md) — verbatim Week 9 section of the approved curriculum record
- **Reconciliation record:** 2026-10-13 target-state scout report (program-owner record, not published). Findings used here: the derivative defines W9 as AI security & hardening and W10 as wrap-up, rollout & client showcase; W9–W10 had no reading pages; the client rebranded to "LTM Limited (Formerly LTIMindtree Limited)"; no provisioning, deployment, or external action is authorized.
- **Inherited security evidence:** `docs/research/w09/archive-week8-security/w08d1.md`, `w08d2.md`, `w08d4.md`, and `w08d5.md` (preserved historical filenames; Week 9 now owns security/governance)

## Day-by-day transfer

| Day | Approved topic | Evidence used by the lesson | Scope boundary |
|---|---|---|---|
| D1 | AI threat model: prompt injection, leakage, poisoning, tool misuse | Preserved threat taxonomy, Week 8 reliability evidence, and delivered-system artifacts | One bounded hardening slice; no generic enterprise audit |
| D2 | RBAC, MCP auth, least privilege, PII, secrets, coding-agent guardrails | Preserved prompt-injection architecture plus the approved Week 9 topic list | Provider-neutral; downstream enforcement, not model judgement |
| D3 | Compliance mapping, audit trails, explainability, human oversight, cross-cloud trust | Approved Week 9 topic list and client control-evidence method | No legal conclusion; applicability and provider services need verified evidence |
| D4 | CI security checks, secrets scanning, guardrail comparison, audit, red team | Preserved security research plus the approved audit/red-team milestone | Safe fixtures and local checks only; provider columns stay blank |
| D5 | Audit/remediation, compliance map, readout, certification selection | Approved Friday milestone | Certification-objective mapping is not in this lane |

## Claim policy

The pages make no current provider-service, price, or certification-objective claim. They define neutral decision fields so the parallel AWS/GCP evidence lane can populate a stable integration seam later. Named regulations are curriculum comparison topics, not legal advice or a claim of applicability.

## Exact evidence gap

Verified current AWS/GCP certification objectives and provider-control mappings are absent from this lane. **Consequence:** trainers may coach learner goals and demonstrate the neutral control method, but must not claim objective coverage or provider equivalence until the parallel evidence is reviewed and integrated through `FDE_CURRICULUM_CONFIG.cloudPath`.
