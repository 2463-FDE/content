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
| 8 | p.1 TUE | Brownfield Engagement Begins | `d2` brownfield handoff | Inventory one unfamiliar subsystem | Scorecard feedback criteria | `d2` Q1–Q3 |
| 9 | p.1 TUE | [CC] Brownfield onboarding: codebase comprehension with Claude Code (system maps, business-logic extraction) | `d2` brownfield handoff | Produce a system boundary + one business rule with file evidence | Peer verifies evidence path | `d2` deliverable |
| 10 | p.1 TUE | Model selection: Claude, GPT, Gemini, open-source | `d2` six-axis framework | Choose tier for a constrained workload | Immediate prediction feedback | `d2` Q1–Q3 |
| 11 | p.1 TUE | AWS Bedrock: model access, invocation & inference profiles | `d2` AWS path | Diagnose AWS call surface | Provider-specific feedback | `d2` Q8 (AWS) |
| 12 | p.1 TUE | Converse API & streaming on Bedrock | `d2` streaming + AWS path | Read streaming failure/latency case | Widget feedback | `d2` Q6 + Q8 (AWS) |
| 13 | p.1 TUE | Quotas, throttling & cross-region inference | `d2` rate-limit instruction + optional AWS depth | Run bounded retry simulation | Attempt log explains throttle response | `d2` Q5 + Q8 (AWS) |
| 14 | p.1 TUE | Provisioned throughput vs on-demand | `d2` AWS optional depth | State the demand signal that would change capacity choice | Compare to documented trade-off | `d2` Q8 (AWS) |
| 15 | p.1 TUE | Retry/backoff & batching at production scale | `d2` batching/retry instruction | Retry simulation | Generated bounded-attempt log | `d2` Q4–Q7 |
| 16 | p.1 TUE | Cost vs latency trade-offs per model tier | `d2` cost/latency axes + call path | Weighted model decision | Immediate rationale feedback | `d2` Q2 + Q4–Q7 |
| 17 | p.1 WED | Calibration drill: prompt-pattern speed-run | `d3` prompt anatomy | Harden one weak prompt | Worked comparison feedback | `d3` Q1–Q3 |
| 18 | p.1 WED | Temperature & sampling in production settings | `d3` reasoning/sampling bridge; `d1` sampling optional depth | Select deterministic vs varied setting | Prediction explanation | `d1` Q6 + `d3` Q6 |
| 19 | p.1 WED | System prompt architecture | `d3` standing-contract instruction | Label role/rules/failure behavior | Worked hardened prompt | `d3` Q2 |
| 20 | p.1 WED | Chain-of-thought for reliability | `d3` reasoning scaffold | Decide when reasoning earns its token cost | Immediate prediction feedback | `d3` Q1 |
| 21 | p.1 WED | Structured output contracts: JSON schema enforcement | `d3` output contract | Define required/nullable/enumerated fields | Schema-shape feedback | `d3` Q1 + Q6 |
| 22 | p.1 WED | Prompt templates & versioning | `d3` eval loop | Version one prompt and one expected behavior | Before/after eval result | `d3` Q3 + deliverable |
| 23 | p.1 WED | Tool-use prompting basics | `d3` optional prompt-contract depth | Identify instruction/data/tool boundary | Worked boundary explanation | `d3` Q2 |
| 24 | p.1 WED | FDE Situation Session: model requirements synthesis | `d3` structured questioning | Turn vague ask into measurable spec | Immediate spot/predict feedback | `d3` Q4–Q6 |
| 25 | p.1 THU | Production Hardening Begins | `d4` hardening brief | Classify a malformed/untrusted response | Immediate diagnostic feedback | `d4` Q4–Q5 |
| 26 | p.1 THU | Token optimization: caching | `d4` caching instruction | Find the cache invalidator | Immediate spot feedback | `d4` Q1 |
| 27 | p.1 THU | Context compression | `d4` compression instruction | Choose what to preserve vs summarize | Interactive/example feedback | `d4` Q2 |
| 28 | p.1 THU | Dynamic prompt assembly | `d4` assembly instruction | Select context for one call | Prediction feedback | `d4` Q2–Q3 |
| 29 | p.1 THU | Cost management: tracking API spend per feature, user, run | `d4` cost instruction | Calculate and attribute call cost | Calculator output | `d4` Q3 |
| 30 | p.1 THU | Output validation | `d4` schema-validation instruction | Diagnose malformed response | Immediate diagnostic feedback | `d4` Q4–Q5 |
| 31 | p.1 THU | Bedrock Guardrails first look: content filters & denied topics | `d4` AWS path | Pick the managed safeguard | Provider-specific feedback | `d4` Q6 (AWS) |
| 32 | p.1 THU | Hallucination mitigation strategies | `d4` grounding instruction | Diagnose well-formed fabrication | Immediate explanation | `d4` Q4–Q5 + Q6 (AWS) / Q7 (GCP) |
| 33 | p.1 THU | Prompt regression testing intro | `d4` hardening brief + optional regression depth | Add one failure fixture before changing a prompt | Pass/fail result and quiz explanation | `d4` check |
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
- Source-defined day sessions: **5** (MON–FRI), delivered through **5** singular-topic Core-30 lesson routes (`d1`–`d5`) plus the survey route; the retired part URLs (`d2a`/`d2b`, `d3a`/`d3b`, `d4a`/`d4b`) only forward to their day route.
- Meaningful required interactions: **9 for one learner path across 5 routes** (`d1` and `d5` × 1, `d3` × 2, `d2` × 2 and `d4` × 3 including one provider interaction each on the selected cloud); **11 route/path instances** when AWS and GCP variants are counted separately. Predict/diagnose/simulate/decide interactions produce task-specific feedback; passive disclosures do not count.
- Learning-proof coverage: **40/40**, including the single evidence-backed form exception above.
- Required reading budget and total Core-30 time are computed by `tests/test_week1_launch_readiness.py`; labels use `round(words / 150)` and fixed allowances for essential diagram (3 min), required interaction(s) (4 min each), and comprehension check (5 min).
