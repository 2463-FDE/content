# Week 1 v3 source coverage and launch contract

Verified: 2026-10-27

## Source custody

- Authority: `/Users/jestercharles/Downloads/RevaturePro | LTIM FDE v3.pdf` (read-only input; never committed)
- SHA-256 verified before extraction: `1792ba5c20a62fdd1e83463d9032d129ee644e58b220129b2f736f5fb863ed7e`
- Verified shape: PDF 1.3 source record, 8 pages (the local parser reports a PDF 1.4 compatibility level); title `RevaturePro | LTIM FDE v3`
- Week 1 anchor: PDF page 1, `Week 1 — Production LLM Engineering on Bedrock & Claude Code`, Monday through Friday columns
- Extraction method: `pdftotext -f 1 -l 1 -layout`; column order was checked against the rendered day headings

No batch number appears in the authoritative source. `2567` remains the only configured real curriculum model because it is the current supported product model; any future cohort remains an unsupported placeholder until separately authorized.

## Denominator and interpretation

The Week 1 row contains **40 source-defined session/objective lines**: Monday 7, Tuesday 9, Wednesday 8, Thursday 9, Friday 7. Headings that name a launch or phase transition are counted because they direct learner/trainer action. The external feedback form is counted and mapped to the existing survey route. No topic from another week is pulled forward.

A source line may share one active exercise and one formative check with adjacent objectives from the same session. “Feedback” below means immediate exercise feedback, formative quiz explanations, trainer/peer review called for by the source, or the external weekly feedback form. The required route gives the concise first pass; existing long-form material remains optional progressive disclosure.

## Exact source-to-experience map (40/40)

| # | Source anchor | Authoritative session/objective | Instruction | Active practice | Feedback | Check |
|---:|---|---|---|---|---|---|
| 1 | p.1 MON | Program orientation & reverse-classroom operating model | Hub Week 1 launch brief + `d1` launch sequence | `d1` baseline prediction | Immediate reveal | `d1` Q1–Q6 |
| 2 | p.1 MON | [CC] Claude Code install, auth & first session | `d1` launch sequence | Verify local install/auth; record first bounded task | CLI result + partner/trainer unblock | `d1` launch checklist |
| 3 | p.1 MON | [CC] CLAUDE.md conventions & project memory | `d1` launch sequence + optional tooling depth | Draft one durable project rule | Peer review against “durable, project-intrinsic” criterion | `d1` deliverable |
| 4 | p.1 MON | [CC] Plan mode & spec-before-code discipline | `d1` launch sequence | Write a three-line plan before a bounded change | Compare plan to changed files | `d1` deliverable |
| 5 | p.1 MON | Context windows & token budgets | `d1` context/window instruction | Diagnose history eviction | Immediate worked feedback | `d1` Q1–Q6 |
| 6 | p.1 MON | Hallucination failure modes | `d1` hallucination instruction | Identify missing-window cause | Widget explanation | `d1` Q3–Q6 |
| 7 | p.1 MON | Baseline calibration: AI-assisted dev workflow + screened LLM-skill verification | `d1` launch sequence | Complete bounded baseline task without provider secrets | Observable CLI/test result; trainer can review artifact | `d1` deliverable + quiz |
| 8 | p.1 TUE | Brownfield Engagement Begins | `d2a` brownfield handoff | Inventory one unfamiliar subsystem | Scorecard feedback criteria | `d2a` quiz |
| 9 | p.1 TUE | [CC] Brownfield onboarding: codebase comprehension with Claude Code (system maps, business-logic extraction) | `d2a` brownfield handoff | Produce a system boundary + one business rule with file evidence | Peer verifies evidence path | `d2a` deliverable |
| 10 | p.1 TUE | Model selection: Claude, GPT, Gemini, open-source | `d2a` six-axis framework | Choose tier for a constrained workload | Immediate prediction feedback | `d2a` Q1–Q6 |
| 11 | p.1 TUE | AWS Bedrock: model access, invocation & inference profiles | `d2b` AWS path | Diagnose AWS call surface | Provider-specific feedback | `d2b` AWS questions |
| 12 | p.1 TUE | Converse API & streaming on Bedrock | `d2b` streaming + AWS path | Read streaming failure/latency case | Widget feedback | `d2b` AWS questions |
| 13 | p.1 TUE | Quotas, throttling & cross-region inference | `d2b` rate-limit instruction + optional AWS depth | Run bounded retry simulation | Attempt log explains throttle response | `d2b` AWS questions |
| 14 | p.1 TUE | Provisioned throughput vs on-demand | `d2b` AWS optional depth | State the demand signal that would change capacity choice | Compare to documented trade-off | `d2b` AWS question |
| 15 | p.1 TUE | Retry/backoff & batching at production scale | `d2b` batching/retry instruction | Retry simulation | Generated bounded-attempt log | `d2b` shared questions |
| 16 | p.1 TUE | Cost vs latency trade-offs per model tier | `d2a` cost/latency axes + `d2b` call path | Weighted model decision | Immediate rationale feedback | `d2a` Q2 + `d2b` check |
| 17 | p.1 WED | Calibration drill: prompt-pattern speed-run | `d3a` prompt anatomy | Harden one weak prompt | Worked comparison feedback | `d3a` Q1–Q6 |
| 18 | p.1 WED | Temperature & sampling in production settings | `d3a` reasoning/sampling bridge; `d1` sampling optional depth | Select deterministic vs varied setting | Prediction explanation | `d1` Q6 + `d3a` check |
| 19 | p.1 WED | System prompt architecture | `d3a` standing-contract instruction | Label role/rules/failure behavior | Worked hardened prompt | `d3a` Q4–Q5 |
| 20 | p.1 WED | Chain-of-thought for reliability | `d3a` reasoning scaffold | Decide when reasoning earns its token cost | Immediate prediction feedback | `d3a` Q2 |
| 21 | p.1 WED | Structured output contracts: JSON schema enforcement | `d3a` output contract | Define required/nullable/enumerated fields | Schema-shape feedback | `d3a` Q3/Q5 |
| 22 | p.1 WED | Prompt templates & versioning | `d3a` eval loop | Version one prompt and one expected behavior | Before/after eval result | `d3a` Q6 + deliverable |
| 23 | p.1 WED | Tool-use prompting basics | `d3a` optional prompt-contract depth | Identify instruction/data/tool boundary | Worked boundary explanation | `d3a` check |
| 24 | p.1 WED | FDE Situation Session: model requirements synthesis | `d3b` structured questioning | Turn vague ask into measurable spec | Immediate spot/predict feedback | `d3b` Q1–Q6 |
| 25 | p.1 THU | Production Hardening Begins | `d4b` hardening brief | Classify a malformed/untrusted response | Immediate diagnostic feedback | `d4b` check |
| 26 | p.1 THU | Token optimization: caching | `d4a` caching instruction | Find the cache invalidator | Immediate spot feedback | `d4a` Q1–Q6 |
| 27 | p.1 THU | Context compression | `d4a` compression instruction | Choose what to preserve vs summarize | Interactive/example feedback | `d4a` check |
| 28 | p.1 THU | Dynamic prompt assembly | `d4a` assembly instruction | Select context for one call | Prediction feedback | `d4a` check |
| 29 | p.1 THU | Cost management: tracking API spend per feature, user, run | `d4a` cost instruction | Calculate and attribute call cost | Calculator output | `d4a` check |
| 30 | p.1 THU | Output validation | `d4b` schema-validation instruction | Diagnose malformed response | Immediate diagnostic feedback | `d4b` shared questions |
| 31 | p.1 THU | Bedrock Guardrails first look: content filters & denied topics | `d4b` AWS path | Pick the managed safeguard | Provider-specific feedback | `d4b` AWS questions |
| 32 | p.1 THU | Hallucination mitigation strategies | `d4b` grounding instruction | Diagnose well-formed fabrication | Immediate explanation | `d4b` shared/provider questions |
| 33 | p.1 THU | Prompt regression testing intro | `d4b` hardening brief + optional regression depth | Add one failure fixture before changing a prompt | Pass/fail result and quiz explanation | `d4b` check |
| 34 | p.1 FRI | [CC] Claude Code retro #1: workflow share-out | `d5` Friday closure | Share one kept and one rejected workflow change | Peer evidence review | `d5` deliverable |
| 35 | p.1 FRI | Bedrock vs Model Garden on Gemini Enterprise Agent Platform | `d5` cloud-parity brief | Compare access/governance/observability seams | Parity checklist feedback | `d5` Q1–Q6 |
| 36 | p.1 FRI | Parity check: Claude on Bedrock vs Claude on Gemini Enterprise Agent Platform (formerly Vertex AI) | `d5` cloud-parity brief | Run the same contract against selected AWS/GCP path or use static tabletop | Compare schema/latency/error evidence, not prose quality alone | `d5` check |
| 37 | p.1 FRI | Code review assessment activity | `d5` review lens | Spot the highest-risk client defect | Immediate review feedback | `d5` Q1–Q6 |
| 38 | p.1 FRI | Prompt library submission | `d5` prompt-library instruction | Submit versioned prompt + schema + eval fixture | Review checklist | `d5` deliverable |
| 39 | p.1 FRI | Delivery 1: Executive and Technical Readout | `d5` Friday closure | Prepare one outcome sentence + one technical evidence trail | Peer/trainer readout feedback | `d5` deliverable checklist |
| 40 | p.1 FRI | Feedback Form | `survey.html` | Submit weekly reflection | Form confirmation | Submission state |

## Evidence-backed exceptions

1. **Feedback Form (#40)** is an external reflective workflow rather than an instructional objective. It therefore uses the existing survey form's submission confirmation as feedback/check instead of adding a synthetic technical quiz.
2. **Live provider calls are not required.** The source requires model/cloud comparison, not paid calls or cloud provisioning. AWS/GCP activities provide local/static table-top paths and mark provider operations as optional. This preserves both cloud choices, no-JavaScript access, and the prohibition on paid providers or provisioning.
3. **Claude Code authentication is locally verified, never collected.** The lesson tells learners to verify their own CLI session; the site does not request, store, or transmit provider credentials.
4. **“Next batch” has no number in the source.** The UI may label it “next batch (not configured)” but must not fabricate a cohort number or map it to Batch 2567 content.

## Launch accounting

- Source coverage: **40/40** source-defined lines mapped; **0 unexplained omissions**.
- Source-defined day sessions: **5** (MON–FRI), delivered through **8** Core-30 lesson routes plus the survey route.
- Meaningful required interactions: **10 for one learner path across 8 routes** (6 non-provider routes × 1, plus 2 provider routes × 2 on the selected cloud); **14 route/path instances** when AWS and GCP variants are counted separately. Predict/diagnose/simulate/decide interactions produce task-specific feedback; passive disclosures do not count.
- Learning-proof coverage: **40/40**, including the single evidence-backed form exception above.
- Required reading budget and total Core-30 time are computed by `tests/test_week1_launch_readiness.py`; labels use `round(words / 150)` and fixed allowances for essential diagram (3 min), required interaction(s) (4 min each), and comprehension check (5 min).
