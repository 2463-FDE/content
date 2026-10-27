# Week 9 source record excerpt

- **Record:** LTIM Custom FDE Curriculum — 10 Weeks (Reverse Classroom), captain-approved derivative (Week 9 section)
- **Record last modified:** 2026-09-25
- **Excerpted:** 2026-10-14

> **Use of this excerpt.** Topic names below are the approved curriculum record, copied verbatim. Provider product names, prices, and `[GCP]`/`[CC]` slots are curriculum *topic labels*, not verified current claims; current provider claims trace to the dated `*-provider-paths.md` artifacts indexed by `docs/research/w08-w10-production-wave.md`.

## Curriculum record — Week 9

*Production AI Systems*

**MON** (8 topics)
> 🏁 **Milestone — Security hardening begins** (threat modeling the client system)
- AI threats: prompt injection
- Jailbreaking
- Data leakage
- Model poisoning
- Tool misuse
- Defending against attacks
- OWASP LLM Top 10
- Threat-model your own agent

**TUE** (8 topics)
- Secure LLM application design: RBAC for AI capabilities and **MCP server auth** — authenticating and authorising an MCP server the agent calls
- Tool and MCP server scoping
- Least-privilege for agents
- Data privacy: PII detection & masking (Bedrock Guardrails sensitive-info filters)
- Data minimization
- Confidential content in prompts
- Secrets hygiene in agentic workflows
- **[CC]** Claude Code security posture: hooks as guardrails, permission modes

**WED** (8 topics)
- Compliance: SOX
- HIPAA
- GDPR
- EU AI Act
- AI governance: audit trails, explainability, human oversight obligations
- Responsible AI practices
- **[GCP]** Cross-cloud identity federation: Workload Identity Federation vs IAM roles + OIDC — trust-boundary design between an AWS-hosted agent and a GCP-hosted service, short-lived credentials, auditability of federated calls
- FDE Situation Session: security threat modeling

**THU** (7 topics)
- AI security in CI/CD: automated scanning
- Secrets management
- Tools: LLM Guard, AWS IAM, Presidio
- Bedrock Guardrails: Automated Reasoning checks
- **[GCP]** Guardrail-layer comparison: Bedrock Guardrails (per-1,000-text-unit policies) vs Model Armor (per-1M-token screening, SCC bundling) — coverage matrix plus unit-cost normalization to a defensible $/1M-token figure
> 🏁 **Milestone — Audit & red-team begins** (adversarial validation of the delivered system)
- Security audit of your own W1–W8 brownfield deliveries
- Red-team exercise: attack a peer team's brownfield deployment

**FRI** (6 topics)
- Brownfield delivery #9 — executive readout + simulated technical-team session: security audit & remediation of the client system
- Assessment: technical exam
- Compliance mapping of the client system (injected change request lands here)
- **[CC]** Claude Code retro: security hooks & permission modes in practice
- Certification selection
- Weekly feedback form
