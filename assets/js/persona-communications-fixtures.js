/* Local synthetic Riverbend/Meridian communication fixtures.
   This is the sole scenario-truth source for both chat and simulated email.
   Facts are learner-visible adaptations of current client-delivery packets; the
   unresolved historical stakeholder positions are intentionally not activated. */
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
    riverbend: freezeScenario({
      id: "riverbend",
      projectLabel: "Riverbend Community Health",
      projectPhase: "Legacy modernization · healthcare",
      technicalLeadLabel: "Riverbend IT lead",
      stakeholderLabel: "Riverbend operations sponsor",
      intro: "Practice communicating about patient-intake reliability, evidence, privacy boundaries, and a safe handoff.",
      facts: {
        availability: {
          label: "Intake availability",
          source: "client-delivery.html · Riverbend Week 3",
          text: "A synchronous payer eligibility call without a timeout froze the entire intake screen for about 20 minutes.",
          businessOutcome: "keep patient registration available when a dependency slows down",
          safeStep: "time-bound the dependency, preserve an intake fallback, and show the failure path with synthetic evidence"
        },
        scheduling: {
          label: "Scheduling correctness",
          source: "client-delivery.html · Riverbend Week 5",
          text: "Two near-simultaneous synthetic requests both confirmed slot 88231; the path has no idempotency key, transaction, or uniqueness rule.",
          businessOutcome: "prevent a slot from being confirmed twice",
          safeStep: "pair an idempotency contract with a transactional or database-enforced uniqueness boundary"
        },
        privacy: {
          label: "Patient-data boundary",
          source: "client-delivery.html · Riverbend Week 9",
          text: "The synthetic summary path includes name, date of birth, medical-record number, and notes, and no vendor agreement is assumed.",
          businessOutcome: "show exactly what could leave the patient-data boundary before any wider rollout",
          safeStep: "draw the data flow, minimize the payload, test the scrub, and keep the work local"
        },
        reliability: {
          label: "Summary reliability",
          source: "client-delivery.html · Riverbend Week 8",
          text: "A successful HTTP response can still contain an unsupported, incomplete, refused, or degraded summary, so quality evidence is separate from uptime.",
          businessOutcome: "detect an unsafe or degraded summary before staff rely on it",
          safeStep: "use labeled synthetic outcomes, payload-free telemetry, and an explicit degrade-or-refuse branch"
        },
        handoff: {
          label: "Handoff boundary",
          source: "client-delivery.html · Riverbend Week 10",
          text: "Release work is planning and local rehearsal only; a defensible handoff needs rollback conditions, runbooks, owners, and explicit pending items.",
          businessOutcome: "leave Riverbend with an operable package rather than a one-time showcase",
          safeStep: "rehearse the runbook locally and name every owner, open risk, and rollback trigger"
        }
      },
      factOrder: ["availability", "scheduling", "privacy", "reliability", "handoff"],
      topicRules: [
        { factId: "availability", words: ["intake", "payer", "timeout", "freeze", "latency", "available", "availability"] },
        { factId: "scheduling", words: ["schedule", "slot", "booking", "double-book", "idempotency", "transaction", "unique"] },
        { factId: "privacy", words: ["phi", "patient", "privacy", "vendor", "data", "scrub", "agreement"] },
        { factId: "reliability", words: ["summary", "grounded", "unsupported", "quality", "guardrail", "telemetry", "slo"] },
        { factId: "handoff", words: ["handoff", "release", "demo", "rollback", "runbook", "owner", "operate"] }
      ],
      chatPrompts: [
        "Can we promise the intake path will never fail again?",
        "What is the smallest safe scope if the sponsor wants a demo this week?",
        "I disagree that a dashboard is enough. How should I push back?"
      ],
      seedThread: {
        id: "riverbend-seed",
        subject: "What I need from the next update",
        status: "replied",
        messages: [
          { from: "stakeholder", at: FIXTURE_EPOCH - 3600000, text: "Please frame the next update around what changes for front-desk staff and what remains simulated." },
          { from: "learner", at: FIXTURE_EPOCH - 3300000, text: "I will separate the local evidence from any rollout claim and name the next decision." },
          { from: "stakeholder", at: FIXTURE_EPOCH - 2400000, text: "That works. Include the owner and the condition that would pause or reverse the plan." }
        ]
      }
    }),

    meridian: freezeScenario({
      id: "meridian",
      projectLabel: "Meridian Lending Co.",
      projectPhase: "Platform engagement · lending and payments",
      technicalLeadLabel: "Meridian platform engineering lead",
      stakeholderLabel: "Meridian lending operations sponsor",
      intro: "Practice communicating about money correctness, decision evidence, regulated-data boundaries, and an operable handoff.",
      facts: {
        payments: {
          label: "Payment correctness",
          source: "client-delivery.html · Meridian Week 5",
          text: "A slow synthetic payment request was retried 410 milliseconds later and both attempts inserted because the request has no idempotency key.",
          businessOutcome: "stop one intended payment from being applied twice",
          safeStep: "use a stable payment identity and enforce duplicate safety before any money-affecting side effect"
        },
        decisions: {
          label: "Decision evidence",
          source: "client-delivery.html · Meridian Week 3",
          text: "Synthetic denials reuse a generic “purchasing history” reason, while the decision record omits model drivers, version, and timestamp.",
          businessOutcome: "make each synthetic denial specific, reproducible, and reviewable",
          safeStep: "persist versioned decision evidence and test reason mapping before discussing wider use"
        },
        data: {
          label: "Regulated-data boundary",
          source: "client-delivery.html · Meridian Weeks 1 and 5",
          text: "The inherited fixtures show card and identity fields in logs and storage; this simulation uses redacted synthetic placeholders only.",
          businessOutcome: "keep regulated payload out of logs, traces, graph properties, and model context",
          safeStep: "define tokenized identities and payload-free observability before connecting the evidence path"
        },
        reconciliation: {
          label: "Reconciliation evidence",
          source: "client-delivery.html · Meridian Week 8",
          text: "HTTP success does not prove ledger and settlement agree, and reason quality is a separate signal from money correctness.",
          businessOutcome: "detect a reconciliation break or reason-quality failure before finance or an applicant does",
          safeStep: "pair deterministic ledger-versus-settlement checks with versioned labeled reason tests"
        },
        handoff: {
          label: "Handoff boundary",
          source: "client-delivery.html · Meridian Week 10",
          text: "Release work is planning and local rehearsal only; the receiving team needs rollback conditions, runbooks, owners, and explicit pending evidence.",
          businessOutcome: "leave Meridian with an operable package rather than a board-only demonstration",
          safeStep: "run the package locally from the README and record open risks, owners, and flip conditions"
        }
      },
      factOrder: ["payments", "decisions", "data", "reconciliation", "handoff"],
      topicRules: [
        { factId: "payments", words: ["payment", "duplicate", "charge", "retry", "idempotency", "money", "balance"] },
        { factId: "decisions", words: ["decision", "denial", "reason", "model", "scorer", "applicant", "audit"] },
        { factId: "data", words: ["pan", "cvv", "ssn", "privacy", "data", "token", "log", "trace"] },
        { factId: "reconciliation", words: ["reconcile", "settlement", "ledger", "quality", "slo", "alert", "correctness"] },
        { factId: "handoff", words: ["handoff", "release", "demo", "rollback", "runbook", "owner", "operate"] }
      ],
      chatPrompts: [
        "The sponsor wants the scorer across more products. How do I respond?",
        "Can we call the payment work done if every API returns 200?",
        "Help me negotiate a smaller milestone without sounding obstructive."
      ],
      seedThread: {
        id: "meridian-seed",
        subject: "Keep the update outcome-focused",
        status: "replied",
        messages: [
          { from: "stakeholder", at: FIXTURE_EPOCH - 3600000, text: "For the next update, tell me what finance or an applicant would notice, not only which services changed." },
          { from: "learner", at: FIXTURE_EPOCH - 3300000, text: "I will tie each control to a money-correctness or decision-evidence outcome and state what remains pending." },
          { from: "stakeholder", at: FIXTURE_EPOCH - 2400000, text: "Good. Include the evidence that would stop a wider rollout and who owns the next decision." }
        ]
      }
    })
  };

  Object.freeze(scenarios);

  return Object.freeze({
    version: 1,
    fixtureEpoch: FIXTURE_EPOCH,
    minReplyMinutes: MIN_REPLY_MINUTES,
    maxReplyMinutes: MAX_REPLY_MINUTES,
    scenarios: scenarios
  });
});
