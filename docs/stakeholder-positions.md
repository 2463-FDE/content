# Authored stakeholder positions and deliberate conflicts (WP-2.6)

**Status:** review-ready; inactive until trainer-approved (every position is trainer-reviewed before it becomes active — ADR-004 §7, AC-1.6.2).
**Scope:** pilot weeks **W7–W10 × both fictional projects × both roles** — 16 positions, 8 reciprocal conflict pairs, all learner-visible.
**Authoring record:** `tools/expectations/overrides.json` (`stakeholder_context`, `owner_roles`, `versions`, `stakeholder_position_keys`); rendered into `content/expectations.v1.json` by `node tools/expectations/build.mjs --mode post-cutover`.
**Checks:** `node --test tools/expectations/stakeholder-authoring.test.mjs` (reciprocity, same visibility, version bump, fictional label, real-client marker lint, durable keys, S13 phrase hygiene) — wired into `.github/workflows/expectations.yml`.

## 1. This is fictional training-simulation content

Every position below is **authored fiction** for the two training scenarios in `client-delivery.html` — *Riverbend Community Health* (healthcare; business stakeholder Dr. Maya Okonkwo, COO) and *Meridian Lending Co.* (finance; business stakeholder Dana, VP of Lending Ops). No position describes a real client, a real person, a real deadline or a real commitment. Each position's `rationale` ends with an explicit label ("Fictional training-simulation position; describes no real client" / "…the technical-lead role is authored for this scenario and describes no real person"), and the `source` of every carrying item is an authored page path in this repository (plus the durable source-content hash once the content lane lands it) — never a web page, never model memory. The repository is public; the marker list in `tools/expectations/real-client-markers.json` is the lint that keeps real-world identifiers out.

## 2. The two roles

| `stakeholder_role` | Riverbend (healthcare) | Meridian (finance) | Established by |
|---|---|---|---|
| `client_business` | Dr. Maya Okonkwo, COO | Dana, VP of Lending Ops | `client-delivery.html` `window.CLIENT.<project>.persona` — the voice of every `ask` |
| `client_technical_lead` | **Riverbend's IT lead** — the in-house technical decision-maker who runs the portal, its payer and hospital-feed integrations, and whatever on-call exists after the engagement | **Meridian's platform engineering lead** — the in-house technical decision-maker who inherited the services when the vendor went under, carries payments on-call and owns the processor, bureau and model-vendor integrations | **Authored here.** No packet, reading or track page names a technical lead for either project (ADR-004 §1). The role is described by function only — no personal name — so nothing new is asserted about the existing named domain personas. **Trainer to confirm or rename.** |

Named domain personas that already exist in authored content and are referenced (never given positions of their own): Sam (Meridian — "wants the numbers you promised versus what landed… that's his job"; readings: "does the ledger tie out"), Priya (Meridian compliance — "evidence a specific reason for this denial"). Where a position needs their ruling, `approval_authority` carries `domain_expert`.

## 3. How positions attach (schema as built — unchanged by this package)

- One `stakeholder_context` per carrying manifest item; the business position sits on the week's `ask` (W7–W9) or `stated.1` (W10 — see §4), the technical lead's on the week's `deliverable`. `owner_role` of each carrying item is set to the position's role; `version` bumped 1 → 2. Timing, provenance and visibility are inherited from the carrying item (all W7–W10 items: `{week N, mon}` → `{week N, sun}`, learner-visible).
- Every conflict is authored on **both** items with the **same** `dimensions[]` and identical `rationale`/`escalation_trigger` text, so a reviewer reads each conflict once and the reciprocity check is exact.
- **Durable keys.** Per the captain decision of 2026-08-17, every position carries a human-assigned key that never changes with wording: `<project>.w<NN>.<business|techlead>.<topic>` (e.g. `healthcare.w07.business.guardrail-proof`) — adopted as the single scheme; the content lane matches it. The current `stakeholderContext` schema is closed (`additionalProperties: false`) and this package does not change the schema, so keys live in the sidecar map `overrides.json → stakeholder_position_keys` (keyed by carrying item id) until the content lane's key field lands; folding them in is a one-line remap.
- **Commit attestations.** `generated_from_commit` / `reviewed_at_commit` (and the `@commit` suffix on `source`) are stale attestations the captain ordered removed, to be replaced by the durable source-content hash plus PR review evidence. They are inherited from the base branch and the pinned generator still reads them to build the manifest, so this package neither updates nor depends on them; the content lane removes them and this branch absorbs that change (any conflict is flagged, never resolved by reintroducing the fields).
- `supersedes` is empty: first classification is an ordinary versioned addition and needs no supersession record.

## 4. Labelling rules applied — decisions the trainer is asked to accept explicitly

`position_type` is copied from what the authored source says, never inferred to improve a conflict:

- **non_negotiable** where the ask states a *need* or explicitly refuses the softer alternative: healthcare W7 ("I need to know it can't… I want to be shown it can't"), healthcare W9 ("I just need to know what to expect"), finance W9 ("I need to know this doesn't fall over").
- **preference** where the ask states a *want*: healthcare W8 ("they want… let's make it happen this week… can you just flip it on?"), finance W7 ("I want visibility… help me get ahead of this"), finance W8 ("let's roll it out… wider is better, right?"), and both W10s.
- **W10 business positions sit on `stated.1`, not `ask`.** The healthcare W10 ask is an imperative ("Show me what we've got in a way I can take to the board") and the finance W10 ask is a want ("I want something I can show the board"); classifying the two asks differently on grammar alone would be narrative convenience. Both W10 `stated.1` items say the same thing in the same form — "Wants proof of value in language the board understands." — so both W10 business positions are **preference** on `stated.1`, and the AI-headline preference in each is an authored extension of the W8 board excitement. The W10 `ask` items stay `null`. **Trainer may move these to `ask` and/or relabel; either way the conflict pair holds.**
- **Technical-lead positions are all `non_negotiable`.** The role did not exist, so every technical-lead position is newly authored; each is drawn from hard facts already in the learner-visible handovers (W3 synchronous payer call froze intake; W5/W7 double-fund on retry and the two-service split; W8 full record sent to the vendor with no agreement checked / no per-decision model id; the W9 Friday code freeze from `schedule.w09.fri`; the blocker-card owner-person rule) and states the operational lines a technical decision-maker inheriting that estate would defensibly hold. Their preferences are carried in `trade_space[]`. **The trainer may downgrade any of them to `preference` if the pedagogy wants a softer technical counterpart in some week.**
- Nothing from the trainer-only `hidden[]` / `facilitator` text (now in the private trainer manifest) is restated; positions reference only learner-visible packet, schedule and track content.
- Authored text avoids the S13 consent/resolution phrase table ("agreed", "accepted", "signed off", "approved", "will accept", …) so the model cannot quote a stakeholder as having conceded; avoids first-person delivery commitments and second-person address (S12); carries relative timing only.

## 5. Positions (AC-1.6.2 review surface)

| # | Durable key | Carrying item id | Week | stakeholder_role | position_type | approval_authority | owner_role → | version | Label evidence (authored source wording) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `finance.w07.business.first-to-know` | `finance.w07.ask` | W7 | client_business | **preference** | client_business | client_business | 2 | ask: "I want visibility so I’m not the last to know… Help me get ahead of this." (want) |
| 2 | `finance.w07.techlead.payment-path-safety` | `finance.w07.deliverable` | W7 | client_technical_lead | **non_negotiable** | client_technical_lead | client_technical_lead | 2 | authored role; hard lines drawn from W5/W7 handover (double-fund on retry, two-service split, no shared trace id, recon stub never runs) and quota (sampled month) |
| 3 | `finance.w08.business.scorer-rollout` | `finance.w08.ask` | W8 | client_business | **preference** | client_business | client_business | 2 | ask: "let’s roll it out to more products… Let’s make this a marketing moment. Wider is better, right?" (let’s + question) |
| 4 | `finance.w08.techlead.decision-record-gate` | `finance.w08.deliverable` | W8 | client_technical_lead | **non_negotiable** | client_technical_lead, domain_expert | client_technical_lead | 2 | authored role; hard lines drawn from W8 handover.1/.2/.5 (generic reasons, no model card, no per-decision model id/version) and deliverable ("governance artifacts; not a model rebuild") |
| 5 | `finance.w09.business.promised-vs-landed` | `finance.w09.ask` | W9 | client_business | **non_negotiable** | client_business, domain_expert | client_business | 2 | ask: "I need to know this doesn’t fall over when you leave. And Sam wants the numbers you promised versus what landed" (need) |
| 6 | `finance.w09.techlead.handover-freeze` | `finance.w09.deliverable` | W9 | client_technical_lead | **non_negotiable** | client_technical_lead | client_technical_lead | 2 | authored role; freeze from schedule.w09.fri / W10 handover.2; owner-person rule from track.blocker-card.owner-person |
| 7 | `finance.w10.techlead.demo-on-main` | `finance.w10.deliverable` | W10 | client_technical_lead | **non_negotiable** | client_technical_lead | client_technical_lead | 2 | authored role; freeze from W10 handover.2; deliverable text; W10 ask (Sam’s team, Monday) |
| 8 | `finance.w10.business.board-headline` | `finance.w10.stated.1` | W10 | client_business | **preference** | client_business | client_business | 2 | stated.1: "Wants proof of value in language the board understands." (want); scorer-headline preference extends W8 ask (board loves the scorer); ask: "Sam wants something his team can pick up on Monday" |
| 9 | `healthcare.w07.business.guardrail-proof` | `healthcare.w07.ask` | W7 | client_business | **non_negotiable** | client_business | client_business | 2 | ask: "I need to know it can’t say something off… I don’t want to be told it hasn’t said anything wrong — I want to be shown it can’t." (need + explicit refusal of the softer alternative) |
| 10 | `healthcare.w07.techlead.intake-path-safety` | `healthcare.w07.deliverable` | W7 | client_technical_lead | **non_negotiable** | client_technical_lead | client_technical_lead | 2 | authored role (no technical lead exists in the packets); hard lines drawn from W3 handover (synchronous payer call froze intake) and W7 handover.5 (summary returns model output directly) |
| 11 | `healthcare.w08.business.summary-rollout` | `healthcare.w08.ask` | W8 | client_business | **preference** | client_business | client_business | 2 | ask: "they want the AI visit-summary turned on… Let’s make it happen this week… Can you just flip it on for everyone?"; stated.1 "Board wants…" (want + question, not must) |
| 12 | `healthcare.w08.techlead.phi-egress-gate` | `healthcare.w08.deliverable` | W8 | client_technical_lead | **non_negotiable** | client_technical_lead, security | client_technical_lead | 2 | authored role; hard lines drawn from W8 handover.1/.2/.5 (full record sent, BAA never asked, no data-flow diagram) and deliverable text |
| 13 | `healthcare.w09.business.support-route` | `healthcare.w09.ask` | W9 | client_business | **non_negotiable** | client_business | client_business | 2 | ask: "I just need to know what to expect… who do they ask?" (need) |
| 14 | `healthcare.w09.techlead.handover-freeze` | `healthcare.w09.deliverable` | W9 | client_technical_lead | **non_negotiable** | client_technical_lead | client_technical_lead | 2 | authored role; freeze from schedule.w09.fri / W10 handover.2; owner-person rule from track.blocker-card.owner-person |
| 15 | `healthcare.w10.techlead.demo-on-main` | `healthcare.w10.deliverable` | W10 | client_technical_lead | **non_negotiable** | client_technical_lead | client_technical_lead | 2 | authored role; freeze from W10 handover.2; "README that is true, runbook that runs" from deliverable; dig.4 |
| 16 | `healthcare.w10.business.board-headline` | `healthcare.w10.stated.1` | W10 | client_business | **preference** | client_business | client_business | 2 | stated.1: "Wants proof of value in language the board understands." (want); AI-headline preference extends W8 ask (board excited about the summary) |

Counts: **16 positions** (8 `client_business`: 3 non_negotiable / 5 preference; 8 `client_technical_lead`: 8 non_negotiable / 0 preference) · **8 conflict pairs** · weeks covered: **W7, W8, W9, W10 × healthcare, finance** · weeks W1–W6 carry no positions (`stakeholder_context: null`; S13 answers "not established") — the pilot readout must say so.

## 6. Conflict pairs (AC-1.6.2 / AC-1.6.3)

| # | Pair (id ↔ with_id) | Durable keys | dimensions[] | Reciprocal | Same visibility |
|---|---|---|---|---|---|
| 1 | `finance.w07.ask` ↔ `finance.w07.deliverable` | `finance.w07.business.first-to-know` ↔ `finance.w07.techlead.payment-path-safety` | reliability, delivery, stakeholder_confidence | yes | learner ↔ learner |
| 2 | `finance.w08.ask` ↔ `finance.w08.deliverable` | `finance.w08.business.scorer-rollout` ↔ `finance.w08.techlead.decision-record-gate` | delivery, risk, maintainability, stakeholder_confidence | yes | learner ↔ learner |
| 3 | `finance.w09.ask` ↔ `finance.w09.deliverable` | `finance.w09.business.promised-vs-landed` ↔ `finance.w09.techlead.handover-freeze` | maintainability, stakeholder_confidence, delivery, risk | yes | learner ↔ learner |
| 4 | `finance.w10.deliverable` ↔ `finance.w10.stated.1` | `finance.w10.techlead.demo-on-main` ↔ `finance.w10.business.board-headline` | stakeholder_confidence, risk, scope, maintainability | yes | learner ↔ learner |
| 5 | `healthcare.w07.ask` ↔ `healthcare.w07.deliverable` | `healthcare.w07.business.guardrail-proof` ↔ `healthcare.w07.techlead.intake-path-safety` | risk, stakeholder_confidence, reliability | yes | learner ↔ learner |
| 6 | `healthcare.w08.ask` ↔ `healthcare.w08.deliverable` | `healthcare.w08.business.summary-rollout` ↔ `healthcare.w08.techlead.phi-egress-gate` | security, delivery, stakeholder_confidence, scope | yes | learner ↔ learner |
| 7 | `healthcare.w09.ask` ↔ `healthcare.w09.deliverable` | `healthcare.w09.business.support-route` ↔ `healthcare.w09.techlead.handover-freeze` | maintainability, stakeholder_confidence, delivery | yes | learner ↔ learner |
| 8 | `healthcare.w10.deliverable` ↔ `healthcare.w10.stated.1` | `healthcare.w10.techlead.demo-on-main` ↔ `healthcare.w10.business.board-headline` | stakeholder_confidence, security, risk, scope | yes | learner ↔ learner |

What makes each pair hard (both sides reasonable; the learner has to name the trade-off, not pick a winner):

| Pair | The tension in one line |
|---|---|
| finance W7 | Dana wants to be told first; the platform lead will not page the business on an untuned break/error-rate alert and will run the reconciliation control but not own the breaks it finds (that is Sam's territory). Same control, different owner and routing. |
| finance W8 | Dana wants the scorer wider and a marketing page now (board momentum); the platform lead will not enable a new product until each decision records model id/version/features (nothing can be rolled back or explained today) and the reason mapping has been through Priya. Story vs. the ability to explain and undo a decision. |
| finance W9 | Dana and Sam want the promised numbers landed and owned; the platform lead freezes Friday and will not put the team's name on un-run code — so some promises show as "not landed" *because* they were not merged under pressure. Two honest readings of "done". |
| finance W10 | Dana's preferred headline is the AI scorer; the platform lead will show only what is on main under freeze — the scorer governed and unchanged, the reconciliation control as the landed work. The most valuable true story is not the story the board was primed for. |
| healthcare W7 | The COO's line is "show me it can't"; the IT lead will not certify an absolute about model output. A guardrail that structurally rejects ungrounded content can satisfy the demand *as a claim about the system* — only if worded that way. |
| healthcare W8 | The COO wants the summary on for every patient this week; the IT lead's PHI-egress line, applied honestly, reaches the summary that is *already live* — so the real choice is expand / wait / pause what the board thinks is done. |
| healthcare W9 | The COO needs a name her staff can call in three months; the IT lead's team owns only what it has run from the runbook before Friday's freeze. Not everything can be both landed and handed over. |
| healthcare W10 | The COO's preferred headline is the AI summary; the IT lead shows only main under freeze, with the summary in the gated W8 state — a guarded system that refuses, not "on for everyone". |

## 7. Not in this package (deliberately)

- **Trainer-only positions.** ADR-004 §8 allows a rationale the learner must *elicit* rather than read to live in the trainer manifest (`fde-backend/content/expectations.trainer.v1.json`, private repo). This is the public repo, so nothing trainer-only is authored here and no learner-visible conflict points at a trainer-only id. Candidate for a private-repo follow-up if the pedagogy wants it: the technical lead's *pressure* text (why they hold the line) could be withheld for elicitation while the line itself stays learner-visible.
- **W1–W6.** No positions; the amendment fixes the representation, not the count, and the pilot runs the Delivery Track weeks.
- **Schema / generator / `overrides.json` machinery** — untouched (content-lane owned). The only additions beside authored content are a content-side test, a marker list and one CI step.

## 8. Editing positions later

1. Edit `stakeholder_context` in `tools/expectations/overrides.json`; bump the carrying item's `version`; keep the durable key unchanged (keys change only if the *position* is replaced, never for wording).
2. A genuine change between `non_negotiable` and `preference` needs a supersession record; wording edits do not.
3. `node tools/expectations/build.mjs --mode post-cutover` → `node --test tools/expectations/build.test.mjs tools/expectations/stakeholder-authoring.test.mjs` → `node tools/expectations/build.mjs --mode post-cutover --check`.
4. PR body lists every position (id, role, type, authority) and every conflict pair (ids, dimensions) — regenerate §5/§6 from the data rather than by hand.

## 9. Trainer-review effort (honest estimate)

≈ 5,600 unique words of authored text (16 positions ≈ 4,700 words + 8 conflict texts ≈ 900 words; each conflict text appears on both ends) + the tables above. A **careful** review — read each position against its week's packet, decide the demand/preference label, judge whether the conflict is fair to both sides, and check that nothing restates trainer-only material — runs about **20 minutes per project-week (2 positions + 1 conflict) → ~2.5–3 h for the 8 sets, plus ~30–45 min of cross-checks** (parallel wording across the two projects, the technical-lead role framing, phrase hygiene). **Budget 3.5 h.** A label-acceptance-only pass over §5/§6 with spot reads is ~1 h; it is not enough to accept the technical-lead role framing, which is the one genuinely new authored element.
