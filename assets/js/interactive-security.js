/* Week 8 security practice — deterministic, local-only lethal-trifecta auditor. */
(function (globalScope, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalScope) globalScope.FDETrifectaAuditor = api;

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll("[data-trifecta-auditor]").forEach(api.mount);
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COMPONENTS = ["privateData", "untrustedContent", "externalEgress"];
  const SCENARIOS = Object.freeze([
    Object.freeze({
      id: "clinic-markdown",
      title: "Clinic visit summarizer",
      description: "In this hypothetical production architecture, a summarizer can access private patient records and free-text notes copied from outside referrals. Its answer renderer automatically loads external markdown images. All lesson names and details are synthetic and identifier-free.",
      privateData: true,
      untrustedContent: true,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "The hypothetical system can access private patient records; the lesson examples themselves remain synthetic and identifier-free.",
        untrustedContent: "Outside-referral text can be influenced by a third party before the model reads it.",
        externalEgress: "Loading a model-supplied external image URL creates an outbound channel."
      })
    }),
    Object.freeze({
      id: "offline-contract-review",
      title: "Offline contract reviewer",
      description: "A local reviewer can open confidential contract drafts and vendor-supplied attachments. Network access is disabled, links are inert, and results can only be saved to an encrypted local folder.",
      privateData: true,
      untrustedContent: true,
      externalEgress: false,
      reasons: Object.freeze({
        privateData: "Confidential contract drafts are private data.",
        untrustedContent: "A vendor can influence the attachment content the model reads.",
        externalEgress: "The isolated process has no outbound request, active link, or remote write capability."
      })
    }),
    Object.freeze({
      id: "public-status-bot",
      title: "Public status-page bot",
      description: "A bot summarizes public incident feeds submitted by outside operators, then posts a digest to a public team channel. It has no account, customer, or internal system access.",
      privateData: false,
      untrustedContent: true,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "The session only receives intentionally public incident data.",
        untrustedContent: "Outside operators control text in the incident feeds.",
        externalEgress: "Posting the digest to a team channel is external communication."
      })
    }),
    Object.freeze({
      id: "payroll-template-mailer",
      title: "Payroll template mailer",
      description: "An assistant receives private payroll amounts and tax categories through reviewed, typed fields maintained only by payroll administrators. Those fields and a fixed administrator-owned template are the only model-visible values; employees cannot write them, and no free text or inbound mail enters context. The assistant sends the result through an email tool.",
      privateData: true,
      untrustedContent: false,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "The typed payroll amounts and tax categories are private data.",
        untrustedContent: "Every model-visible value is a reviewed, typed, administrator-controlled field; none is attacker-writable in this scenario.",
        externalEgress: "The email tool can transmit information outside the session."
      })
    }),
    Object.freeze({
      id: "public-doc-kiosk",
      title: "Public documentation kiosk",
      description: "A kiosk answers questions from a mirror of public community documentation. Visitors can influence pages in that mirror, but the kiosk has no private connectors and no network or link-rendering capability.",
      privateData: false,
      untrustedContent: true,
      externalEgress: false,
      reasons: Object.freeze({
        privateData: "The kiosk has no private data source or privileged connector.",
        untrustedContent: "Community-edited pages can contain attacker-influenced text.",
        externalEgress: "The kiosk cannot make requests, render active links, or write remotely."
      })
    }),
    Object.freeze({
      id: "internal-metrics-brief",
      title: "Internal metrics brief",
      description: "A scheduled job reads confidential sales totals and a fixed query written in reviewed application code. It writes a plain-text brief to local encrypted storage with all outbound connectivity blocked.",
      privateData: true,
      untrustedContent: false,
      externalEgress: false,
      reasons: Object.freeze({
        privateData: "Confidential sales totals are private data.",
        untrustedContent: "The model sees a reviewed fixed query, not attacker-influenceable content.",
        externalEgress: "A local encrypted file with outbound connectivity blocked is not an external channel."
      })
    }),
    Object.freeze({
      id: "support-draft-desk",
      title: "Support draft desk",
      description: "An assistant reads private customer history plus customer-authored support tickets. It drafts a reply in a review screen, and a human retypes that model-authored reply into a separate system that sends it to the external customer. No deterministic sensitive-data rule or exact-output approval gates the relay.",
      privateData: true,
      untrustedContent: true,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "Private customer history is available to the assistant.",
        untrustedContent: "Customers control the ticket text the model reads.",
        externalEgress: "The model-authored reply reaches an external customer through a human relay; manual retyping alone does not remove the outbound path."
      })
    }),
    Object.freeze({
      id: "recruiting-link-agent",
      title: "Recruiting research agent",
      description: "An agent reads confidential candidate notes and public job-board profiles. It can include model-generated clickable external links in a hiring-team report.",
      privateData: true,
      untrustedContent: true,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "Confidential candidate notes are private data.",
        untrustedContent: "Third parties can influence public job-board profiles.",
        externalEgress: "A model-generated external link can carry data when a reviewer follows it."
      })
    })
  ]);

  function classify(scenario) {
    const count = COMPONENTS.filter(function (key) { return scenario[key]; }).length;
    if (count === 3) return "lethal-trifecta";
    if (count === 2) return "near-miss";
    return "limited-exposure";
  }

  function evaluate(scenario, answer) {
    const components = COMPONENTS.map(function (key) {
      return Object.freeze({
        key: key,
        expected: scenario[key],
        selected: answer[key],
        correct: answer[key] === scenario[key],
        explanation: scenario.reasons[key]
      });
    });
    return Object.freeze({
      correct: components.every(function (item) { return item.correct; }),
      verdict: classify(scenario),
      components: Object.freeze(components)
    });
  }

  function createSession(scenarios) {
    const items = scenarios || SCENARIOS;
    let index = 0;
    let result = null;
    let complete = false;
    const attempted = new Set();
    const mastered = new Set();

    function snapshot() {
      return Object.freeze({
        index: index,
        total: items.length,
        attempted: attempted.size,
        mastered: mastered.size,
        unresolved: Object.freeze(items.filter(function (item) { return !mastered.has(item.id); }).map(function (item) { return item.id; })),
        scenario: items[index],
        result: result,
        complete: complete
      });
    }

    function visit(target) {
      index = target;
      result = null;
      complete = false;
      return snapshot();
    }

    return Object.freeze({
      snapshot: snapshot,
      submit: function (answer) {
        result = evaluate(items[index], answer);
        attempted.add(items[index].id);
        if (result.correct) mastered.add(items[index].id);
        return snapshot();
      },
      retry: function () { return visit(index); },
      next: function () { return visit(Math.min(index + 1, items.length - 1)); },
      finish: function () {
        complete = true;
        result = null;
        return snapshot();
      },
      review: function (unresolvedOnly) {
        const target = unresolvedOnly
          ? items.findIndex(function (item) { return !mastered.has(item.id); })
          : 0;
        return visit(target < 0 ? 0 : target);
      },
      reset: function () {
        index = 0;
        result = null;
        complete = false;
        attempted.clear();
        mastered.clear();
        return snapshot();
      }
    });
  }

  function setText(node, value) {
    node.textContent = String(value);
  }

  function renderScenarioText(view, scenario) {
    setText(view.title, scenario.title);
    setText(view.description, scenario.description);
  }

  function renderResultText(view, result) {
    const verdictText = result.verdict === "lethal-trifecta"
      ? "Lethal trifecta: all three properties coexist in one session. Remove or reliably gate at least one leg."
      : result.verdict === "near-miss"
        ? "Near miss: exactly two properties apply. This is not the lethal trifecta, but the remaining risks still need controls."
        : "Limited exposure: fewer than two trifecta properties apply. Continue normal threat modeling; this verdict is not a general safety guarantee.";
    setText(view.summary, (result.correct ? "Your audit matches. " : "Not yet. Compare each component. ") + verdictText);
    result.components.forEach(function (component) {
      const target = view.components[component.key];
      setText(target.verdict, (component.correct ? "Correct — " : "Correction — ") + (component.expected ? "Yes" : "No"));
      setText(target.explanation, component.explanation);
    });
  }

  function mount(root) {
    const session = createSession();
    const form = root.querySelector("form");
    const scenarioPanel = root.querySelector("[data-audit-scenario]");
    const completion = root.querySelector("[data-audit-completion]");
    const completionHeading = root.querySelector("[data-completion-heading]");
    const completionSummary = root.querySelector("[data-completion-summary]");
    const completionUnresolved = root.querySelector("[data-completion-unresolved]");
    const reviewUnresolvedButton = root.querySelector("[data-review-unresolved]");
    const reviewAllButton = root.querySelector("[data-review-all]");
    const restartButton = root.querySelector("[data-audit-restart]");
    const view = {
      title: root.querySelector("[data-scenario-title]"),
      description: root.querySelector("[data-scenario-description]"),
      summary: root.querySelector("[data-audit-summary]"),
      components: {
        privateData: { verdict: root.querySelector("[data-result-private-verdict]"), explanation: root.querySelector("[data-result-private-explanation]") },
        untrustedContent: { verdict: root.querySelector("[data-result-untrusted-verdict]"), explanation: root.querySelector("[data-result-untrusted-explanation]") },
        externalEgress: { verdict: root.querySelector("[data-result-egress-verdict]"), explanation: root.querySelector("[data-result-egress-explanation]") }
      }
    };
    const progress = root.querySelector("[data-audit-progress]");
    const status = root.querySelector("[data-audit-status]");
    const feedback = root.querySelector("[data-audit-feedback]");
    const submitButton = root.querySelector("[data-audit-submit]");
    const retryButton = root.querySelector("[data-audit-retry]");
    const nextButton = root.querySelector("[data-audit-next]");
    const resetButton = root.querySelector("[data-audit-reset]");
    const answerGroups = form.querySelectorAll("fieldset");
    const missingAnswerMessage = "Select Yes or No for all three properties before submitting.";

    function readAnswer() {
      const answer = {};
      COMPONENTS.forEach(function (key) {
        const selected = form.querySelector('input[name="' + key + '"]:checked');
        answer[key] = selected ? selected.value === "yes" : null;
      });
      return answer;
    }

    function progressText(state) {
      return "Scenario " + (state.index + 1) + " of " + state.total + " · " + state.attempted + " attempted · " + state.mastered + " mastered";
    }

    function clearAnswers() {
      form.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = false; });
    }

    function setAnswersLocked(locked) {
      answerGroups.forEach(function (group) { group.disabled = locked; });
    }

    function showScenario(message) {
      const state = session.snapshot();
      renderScenarioText(view, state.scenario);
      setText(progress, progressText(state));
      setText(status, message || "Choose Yes or No for all three properties, then submit your audit.");
      scenarioPanel.hidden = false;
      form.hidden = false;
      completion.hidden = true;
      feedback.hidden = true;
      submitButton.disabled = false;
      setAnswersLocked(false);
      clearAnswers();
    }

    function showCompletion() {
      const state = session.finish();
      const unresolvedTitles = SCENARIOS.filter(function (scenario) {
        return state.unresolved.indexOf(scenario.id) !== -1;
      }).map(function (scenario) { return scenario.title; });
      scenarioPanel.hidden = true;
      form.hidden = true;
      feedback.hidden = true;
      completion.hidden = false;
      setText(progress, "Complete · " + state.attempted + " attempted · " + state.mastered + " mastered of " + state.total);
      setText(completionSummary, state.mastered === state.total
        ? "All scenarios mastered. You correctly resolved every three-part audit."
        : "Exercise complete. You mastered " + state.mastered + " of " + state.total + " scenarios; attempted scenarios are not counted as mastered until all three classifications match.");
      setText(completionUnresolved, unresolvedTitles.length
        ? "Review needed: " + unresolvedTitles.join("; ") + "."
        : "No unresolved scenarios remain.");
      reviewUnresolvedButton.hidden = unresolvedTitles.length === 0;
      setText(status, "Exercise complete. Review scenarios or restart the exercise.");
      completionHeading.focus();
    }

    form.addEventListener("change", function () {
      if (!COMPONENTS.some(function (key) { return readAnswer()[key] === null; })) {
        setText(status, "All three properties selected. Submit your audit.");
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const answer = readAnswer();
      if (COMPONENTS.some(function (key) { return answer[key] === null; })) {
        setText(status, missingAnswerMessage);
        const missing = COMPONENTS.find(function (key) { return answer[key] === null; });
        const firstMissing = form.querySelector('input[name="' + missing + '"]');
        if (firstMissing) firstMissing.focus();
        return;
      }
      const state = session.submit(answer);
      renderResultText(view, state.result);
      setText(progress, progressText(state));
      setText(status, state.result.correct ? "Audit submitted. Your three classifications match." : "Audit submitted. Review the component corrections, then retry or continue.");
      setText(nextButton, state.index === state.total - 1 ? "Finish exercise" : "Next scenario");
      feedback.hidden = false;
      submitButton.disabled = true;
      setAnswersLocked(true);
      feedback.focus();
    });

    retryButton.addEventListener("click", function () {
      session.retry();
      showScenario("Retry ready. Reclassify all three properties.");
      view.title.focus();
    });
    nextButton.addEventListener("click", function () {
      const state = session.snapshot();
      if (state.index === state.total - 1) {
        showCompletion();
        return;
      }
      session.next();
      showScenario("Next scenario ready. Classify all three properties.");
      view.title.focus();
    });
    resetButton.addEventListener("click", function () {
      session.reset();
      showScenario("Exercise reset. Progress cleared; scenario one is ready.");
      view.title.focus();
    });
    reviewUnresolvedButton.addEventListener("click", function () {
      session.review(true);
      showScenario("Reviewing an unresolved scenario. Correct all three properties to master it.");
      view.title.focus();
    });
    reviewAllButton.addEventListener("click", function () {
      session.review(false);
      showScenario("Review mode started at scenario one. Prior mastery is preserved.");
      view.title.focus();
    });
    restartButton.addEventListener("click", function () {
      session.reset();
      showScenario("Exercise restarted. Progress cleared; scenario one is ready.");
      view.title.focus();
    });

    showScenario();
    return session;
  }

  return Object.freeze({
    COMPONENTS: COMPONENTS,
    SCENARIOS: SCENARIOS,
    classify: classify,
    evaluate: evaluate,
    createSession: createSession,
    renderScenarioText: renderScenarioText,
    renderResultText: renderResultText,
    mount: mount
  });
});
