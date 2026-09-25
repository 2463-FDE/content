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
      description: "A summarizer reads a synthetic patient encounter and free-text notes copied from outside referrals. Its answer renderer automatically loads external markdown images.",
      privateData: true,
      untrustedContent: true,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "The synthetic encounter represents private clinical data available in the same session.",
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
      description: "An assistant reads employee payroll records, fills a fixed message template maintained by payroll administrators, and sends the result through an email tool. It cannot read inbound mail or free-form fields.",
      privateData: true,
      untrustedContent: false,
      externalEgress: true,
      reasons: Object.freeze({
        privateData: "Employee payroll records are private data.",
        untrustedContent: "Only the administrator-controlled fixed template enters context; no attacker-influenceable content is present in this scenario.",
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
      description: "An assistant reads private customer history plus customer-authored support tickets. It drafts a reply in a locked review screen, but a human must retype any response in a separate system; the assistant has no send, link, or network tool.",
      privateData: true,
      untrustedContent: true,
      externalEgress: false,
      reasons: Object.freeze({
        privateData: "Private customer history is available to the assistant.",
        untrustedContent: "Customers control the ticket text the model reads.",
        externalEgress: "The assistant itself has no outbound capability; a separate human action is outside this session's capability set."
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
    const attempted = new Set();

    function snapshot() {
      return Object.freeze({
        index: index,
        total: items.length,
        attempted: attempted.size,
        scenario: items[index],
        result: result
      });
    }

    return Object.freeze({
      snapshot: snapshot,
      submit: function (answer) {
        result = evaluate(items[index], answer);
        attempted.add(items[index].id);
        return snapshot();
      },
      retry: function () {
        result = null;
        return snapshot();
      },
      next: function () {
        index = (index + 1) % items.length;
        result = null;
        return snapshot();
      },
      reset: function () {
        index = 0;
        result = null;
        attempted.clear();
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

    function readAnswer() {
      const answer = {};
      COMPONENTS.forEach(function (key) {
        const selected = form.querySelector('input[name="' + key + '"]:checked');
        answer[key] = selected ? selected.value === "yes" : null;
      });
      return answer;
    }

    function clearAnswers() {
      form.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = false; });
    }

    function showScenario(message) {
      const state = session.snapshot();
      renderScenarioText(view, state.scenario);
      setText(progress, "Scenario " + (state.index + 1) + " of " + state.total + " · " + state.attempted + " audited");
      setText(status, message || "Choose Yes or No for all three properties, then submit your audit.");
      feedback.hidden = true;
      retryButton.hidden = true;
      nextButton.hidden = true;
      submitButton.disabled = false;
      clearAnswers();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const answer = readAnswer();
      if (COMPONENTS.some(function (key) { return answer[key] === null; })) {
        setText(status, "Select Yes or No for all three properties before submitting.");
        const missing = COMPONENTS.find(function (key) { return answer[key] === null; });
        const firstMissing = form.querySelector('input[name="' + missing + '"]');
        if (firstMissing) firstMissing.focus();
        return;
      }
      const state = session.submit(answer);
      renderResultText(view, state.result);
      setText(progress, "Scenario " + (state.index + 1) + " of " + state.total + " · " + state.attempted + " audited");
      setText(status, state.result.correct ? "Audit submitted. Your three classifications match." : "Audit submitted. Review the component corrections, then retry or continue.");
      feedback.hidden = false;
      retryButton.hidden = false;
      nextButton.hidden = false;
      submitButton.disabled = true;
      feedback.focus();
    });

    retryButton.addEventListener("click", function () {
      session.retry();
      showScenario("Retry ready. Reclassify all three properties.");
      view.title.focus();
    });
    nextButton.addEventListener("click", function () {
      session.next();
      showScenario("Next scenario ready. Classify all three properties.");
      view.title.focus();
    });
    resetButton.addEventListener("click", function () {
      session.reset();
      showScenario("Exercise reset. Progress cleared; scenario one is ready.");
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
