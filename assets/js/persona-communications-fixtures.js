/* Local synthetic Juniper Vale / Morrowfield communication fixtures.
   This is the sole scenario-truth source for both chat and simulated email.
   Facts are learner-visible adaptations of the current client-delivery packets
   for the two active brownfield engagements; no other client case is active. */
(function (root, factory) {
  var fixtures = factory();
  if (typeof module === "object" && module.exports) module.exports = fixtures;
  root.FDEPersonaFixtures = fixtures;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MIN_REPLY_MINUTES = 15;
  var MAX_REPLY_MINUTES = 30;
  var FIXTURE_EPOCH = Date.UTC(2026, 9, 29, 9, 0, 0);

  function freezeScenario(scenario) {
    Object.keys(scenario.facts).forEach(function (key) { Object.freeze(scenario.facts[key]); });
    Object.freeze(scenario.facts);
    Object.freeze(scenario.factOrder);
    Object.freeze(scenario.topicRules);
    Object.freeze(scenario.chatPrompts);
    Object.freeze(scenario.seedThread.messages);
    Object.freeze(scenario.seedThread);
    return Object.freeze(scenario);
  }

  var scenarios = {
    "juniper-vale": freezeScenario({
      id: "juniper-vale",
      projectLabel: "Juniper Vale Mutual · Loss Desk",
      projectPhase: "Legacy modernization · P&C insurance · solo · Weeks 1–5",
      technicalLeadLabel: "Juniper Vale claims-platform lead",
      stakeholderLabel: "Juniper Vale claims operations sponsor",
      intro: "Practice communicating about claimant-data boundaries, intake availability, defensible agent decisions, and dispute evidence.",
      facts: {
        logging: {
          label: "Claimant-data boundary",
          source: "client-delivery.html · Juniper Vale Week 1",
          text: "Every FNOL submission writes the claimant's name, policy number, and injury notes into a plain INFO log, while the README simply asserts the system is compliant.",
          businessOutcome: "keep claimant identity and injury details out of logs, prompts, and shared drives",
          safeStep: "redact request bodies, log event metadata only, and prove the redaction with a synthetic claim"
        },
        fragmentation: {
          label: "Fragmented claimant history",
          source: "client-delivery.html · Juniper Vale Week 2",
          text: "One claimant exists as three policyholder IDs created by self-service FNOL with no match key, so the prior-surgery record appears in only one of her files.",
          businessOutcome: "give adjusters one complete claimant history before trusting any retrieval answer",
          safeStep: "measure duplicate rate and fragment coverage in the eval harness, then propose a claimant match key"
        },
        availability: {
          label: "Intake availability",
          source: "client-delivery.html · Juniper Vale Week 3",
          text: "A synchronous coverage call with no timeout sat on the intake request path, so one slow legacy dependency froze the whole FNOL screen for twenty minutes in ticket JV-141.",
          businessOutcome: "keep claim registration available while the legacy coverage service degrades",
          safeStep: "give the coverage tool an explicit deadline, bounded retries, and a degraded answer path"
        },
        defense: {
          label: "Agent-architecture defense",
          source: "client-delivery.html · Juniper Vale Week 4",
          text: "The board saw a nine-agent vendor demo with no budget or failure story, while incident JV-203 shows parallel writers already left 61 claims in conflicting states once.",
          businessOutcome: "give the board a defensible agent decision priced against the ten-cents-per-claim ceiling",
          safeStep: "map reads versus writes, keep claim-state writes single-threaded with one owner, and record the flip condition"
        },
        disputes: {
          label: "Dispute evidence chain",
          source: "client-delivery.html · Juniper Vale Week 5",
          text: "Dispute JV-D-31 cites policy P-4 without a version although the disputed exclusion clause changed between versions 3 and 4, and citations live in a free-text column.",
          businessOutcome: "reconstruct any disputed claim decision in minutes with its exact policy version and decider",
          safeStep: "model Case–CITES–Policy with provenance on every citation and a uniqueness constraint before any import"
        }
      },
      factOrder: ["logging", "fragmentation", "availability", "defense", "disputes"],
      topicRules: [
        { factId: "logging", words: ["log", "pii", "redact", "privacy", "claimant", "injury", "secret", "compliant"] },
        { factId: "fragmentation", words: ["duplicate", "retrieval", "rag", "history", "fragment", "match", "gold", "embedding"] },
        { factId: "availability", words: ["timeout", "freeze", "coverage", "intake", "availability", "outage", "latency"] },
        { factId: "defense", words: ["agent", "multi-agent", "budget", "board", "vendor", "parallel", "triage", "supervisor"] },
        { factId: "disputes", words: ["dispute", "graph", "version", "citation", "audit", "neo4j", "provenance"] }
      ],
      chatPrompts: [
        "Can we promise the intake screen will never freeze again?",
        "What is the smallest safe scope if the board wants an agent demo this week?",
        "I disagree that the README's compliance sentence is enough. How should I push back?"
      ],
      seedThread: {
        id: "juniper-vale-seed",
        subject: "What I need from the next update",
        status: "replied",
        messages: [
          { from: "stakeholder", at: FIXTURE_EPOCH - 3600000, text: "Please frame the next update around what changes for Loss Desk adjusters and what remains simulated." },
          { from: "learner", at: FIXTURE_EPOCH - 3300000, text: "I will separate the local evidence from any rollout claim and name the next decision." },
          { from: "stakeholder", at: FIXTURE_EPOCH - 2400000, text: "That works. Include the owner and the condition that would pause or reverse the plan." }
        ]
      }
    }),

    morrowfield: freezeScenario({
      id: "morrowfield",
      projectLabel: "Morrowfield Payment Control",
      projectPhase: "Platform engagement · payments services · team of 2–3 · Weeks 6–10",
      technicalLeadLabel: "Morrowfield payments-platform lead",
      stakeholderLabel: "Morrowfield payment operations sponsor",
      intro: "Practice communicating about event ordering and money correctness, reviewable infrastructure, actionable telemetry, governance evidence, and a reversible handoff.",
      facts: {
        ordering: {
          label: "Payment ordering and idempotency",
          source: "client-delivery.html · Morrowfield Week 6",
          text: "Three teams re-poll the payments database for the same facts, and the hard rule from finance is that one payment's events must never be processed out of order or posted twice.",
          businessOutcome: "keep one payment's events ordered and applied exactly once across every consumer",
          safeStep: "key the event stream by payment identity and pair replay with an idempotent apply plus a DLQ contract"
        },
        drift: {
          label: "Reviewable infrastructure",
          source: "client-delivery.html · Morrowfield Week 7",
          text: "Incident MP-312 traced a prod failure to a config value staging never had, the fix was applied by SSH and never recorded, and the inherited playbook appends the same line every run.",
          businessOutcome: "make payment infrastructure the team can review, rebuild, and roll back on paper",
          safeStep: "prove idempotence with first, second, and drift runs and bind the named human approval to the exact plan identity"
        },
        observability: {
          label: "Actionable telemetry",
          source: "client-delivery.html · Morrowfield Week 8",
          text: "The dashboards stayed green for a week in which finance logged four stale-advice incidents, and the auditors now read telemetry configs, so client payloads must stay out of whatever is recorded.",
          businessOutcome: "surface freshness, correctness, and cost breaches before finance or a merchant notices",
          safeStep: "define consequence-led signals with payload-free telemetry and an owner for every error-budget action"
        },
        security: {
          label: "Governance evidence",
          source: "client-delivery.html · Morrowfield Week 9",
          text: "An injected instruction inside an uploaded document made a sandbox assistant echo another merchant's reservation data, while the one service token holds read-and-update on every merchant account.",
          businessOutcome: "turn every control claim into evidence a reviewer can replay",
          safeStep: "gate the external sink, scope the tool per operation with caller propagation, and retest the denial on synthetic fixtures"
        },
        handoff: {
          label: "Reversible handoff",
          source: "client-delivery.html · Morrowfield Week 10",
          text: "The rehearsal report describes a candidate that no longer exists after a later merge, and the runbook's rollback plan is one sentence with no prior-version identity or drill evidence.",
          businessOutcome: "hand operations a release they can reverse at two in the morning without calling us",
          safeStep: "pin the prior version, rerun affected checks against the shipped candidate, and drill the rollback with recovery verification"
        }
      },
      factOrder: ["ordering", "drift", "observability", "security", "handoff"],
      topicRules: [
        { factId: "ordering", words: ["kafka", "event", "order", "partition", "duplicate", "replay", "idempotency", "payment", "ledger", "reconciliation"] },
        { factId: "drift", words: ["terraform", "ansible", "drift", "plan", "state", "apply", "infrastructure", "rebuild"] },
        { factId: "observability", words: ["dashboard", "slo", "telemetry", "alert", "freshness", "observability", "signal", "stale"] },
        { factId: "security", words: ["injection", "privilege", "token", "governance", "threat", "red-team", "obligation", "evidence"] },
        { factId: "handoff", words: ["handoff", "rollback", "rehearsal", "runbook", "showcase", "release", "owner", "rollout"] }
      ],
      chatPrompts: [
        "The sponsor wants the advise assistant on more merchant products. How do I respond?",
        "Can we call the payment work done if every API returns 200?",
        "Help me negotiate a smaller milestone without sounding obstructive."
      ],
      seedThread: {
        id: "morrowfield-seed",
        subject: "Keep the update outcome-focused",
        status: "replied",
        messages: [
          { from: "stakeholder", at: FIXTURE_EPOCH - 3600000, text: "For the next update, tell me what finance or a merchant would notice, not only which services changed." },
          { from: "learner", at: FIXTURE_EPOCH - 3300000, text: "I will tie each control to a money-correctness or evidence outcome and state what remains pending." },
          { from: "stakeholder", at: FIXTURE_EPOCH - 2400000, text: "Good. Include the evidence that would stop a wider rollout and who owns the next decision." }
        ]
      }
    })
  };

  Object.freeze(scenarios);

  return Object.freeze({
    version: 2,
    fixtureEpoch: FIXTURE_EPOCH,
    minReplyMinutes: MIN_REPLY_MINUTES,
    maxReplyMinutes: MAX_REPLY_MINUTES,
    scenarios: scenarios
  });
});
