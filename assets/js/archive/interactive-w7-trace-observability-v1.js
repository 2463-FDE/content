/* Week 7 Day 4: synthetic trace inspection and token-cost burn practice.
   Local fixture only. No network, storage, credentials, telemetry, or payload capture. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDEW7Trace = api;
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", api.init);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TRACE_SEED = "intake-timeout-07";
  const TRACE_SPANS = Object.freeze([
    Object.freeze({
      id: "agent", parentId: null, depth: 0, startMs: 0, durationMs: 2480,
      name: "invoke_agent intake_triage", purpose: "agent root", kind: "INTERNAL", status: "ERROR",
      operation: "invoke_agent", errorType: "DownstreamTimeout", aggregateDescendantCostUsd: 0.02554,
      note: "Synthetic trace boundary; payload content is intentionally absent."
    }),
    Object.freeze({
      id: "plan", parentId: "agent", depth: 1, startMs: 35, durationMs: 190,
      name: "chat claude-haiku-4-5", purpose: "planning step", kind: "CLIENT", status: "OK",
      operation: "chat", provider: "anthropic", model: "claude-haiku-4-5",
      inputTokens: 640, outputTokens: 38, estimatedCostUsd: 0.00083,
      note: "Synthetic planning call; compare its timing and token evidence with sibling spans."
    }),
    Object.freeze({
      id: "primary", parentId: "agent", depth: 1, startMs: 245, durationMs: 430,
      name: "chat claude-sonnet-5", purpose: "primary draft", kind: "CLIENT", status: "OK",
      operation: "chat", provider: "anthropic", model: "claude-sonnet-5",
      inputTokens: 7600, outputTokens: 46, estimatedCostUsd: 0.01566,
      note: "Synthetic drafting call; payload content is intentionally absent."
    }),
    Object.freeze({
      id: "tool", parentId: "agent", depth: 1, startMs: 700, durationMs: 1180,
      name: "execute_tool eligibility_lookup", purpose: "tool call", kind: "INTERNAL", status: "ERROR",
      operation: "execute_tool", tool: "eligibility_lookup", errorType: "TimeoutError",
      note: "Synthetic tool call; inspect its status and descendant evidence."
    }),
    Object.freeze({
      id: "payer", parentId: "tool", depth: 2, startMs: 735, durationMs: 1050,
      name: "HTTP GET payer-sandbox.local", purpose: "tool dependency", kind: "CLIENT", status: "ERROR",
      httpMethod: "GET", serverAddress: "payer-sandbox.local", errorType: "TimeoutError",
      note: "Synthetic dependency span; no URL path or patient payload is captured."
    }),
    Object.freeze({
      id: "fallback", parentId: "agent", depth: 1, startMs: 1905, durationMs: 510,
      name: "chat claude-haiku-4-5", purpose: "fallback response", kind: "CLIENT", status: "OK",
      operation: "chat", provider: "anthropic", model: "claude-haiku-4-5",
      inputTokens: 8200, outputTokens: 170, estimatedCostUsd: 0.00905,
      note: "Synthetic fallback call; payload content is intentionally absent."
    })
  ]);

  const PRICE_ROWS = Object.freeze([
    Object.freeze({ id: "claude-haiku-4-5", label: "Claude Haiku 4.5", inputPerMillion: 1, outputPerMillion: 5 }),
    Object.freeze({ id: "claude-sonnet-5", label: "Claude Sonnet 5", inputPerMillion: 2, outputPerMillion: 10 })
  ]);

  const DEFAULT_COST_INPUT = Object.freeze({
    model: "claude-haiku-4-5",
    inputTokens: 1000,
    outputTokens: 200,
    requestsPerDay: 500,
    dailyBudgetUsd: 2
  });

  const INPUT_LIMITS = Object.freeze({
    inputTokens: Object.freeze({ min: 0, max: 200000, step: 1, integer: true }),
    outputTokens: Object.freeze({ min: 0, max: 64000, step: 1, integer: true }),
    requestsPerDay: Object.freeze({ min: 1, max: 100000, step: 1, integer: true }),
    dailyBudgetUsd: Object.freeze({ min: 0.01, max: 100000, step: 0.01 })
  });

  const TRACE_EXPECTED = Object.freeze({
    latency: "tool",
    error: "payer",
    cost: "primary",
    observedError: "10-percent",
    burnRate: "100x",
    response: "aggregate-gate"
  });

  const TRACE_EXPLANATIONS = Object.freeze({
    latency: "The 1.18-second tool span is the longest direct child of the root.",
    error: "The HTTP dependency leaf carries error.type=TimeoutError.",
    cost: "The Sonnet 5 span has the largest span-local token estimate: $0.01566.",
    observedError: "One failure among ten requests is 1 ÷ 10 = 10%.",
    burnRate: "A 99.9% SLO allows 0.1% errors, so 10% ÷ 0.1% = 100×.",
    response: "Aggregate a larger surface or window and use a minimum-volume gate; do not hide failures."
  });

  function createTraceState(seed) {
    return {
      seed: seed || TRACE_SEED,
      expanded: ["agent"],
      answers: {
        latency: "", error: "", cost: "",
        observedError: "", burnRate: "", response: ""
      }
    };
  }

  function toggleSpan(state, spanId) {
    const known = TRACE_SPANS.some(function (span) { return span.id === spanId; });
    if (!known) return state;
    const expanded = state.expanded.slice();
    const index = expanded.indexOf(spanId);
    if (index >= 0) expanded.splice(index, 1);
    else expanded.push(spanId);
    return { seed: state.seed, expanded: expanded, answers: Object.assign({}, state.answers) };
  }

  function expandAllSpans(state) {
    return {
      seed: state.seed,
      expanded: TRACE_SPANS.map(function (span) { return span.id; }),
      answers: Object.assign({}, state.answers)
    };
  }

  function setTraceAnswer(state, key, value) {
    if (!Object.prototype.hasOwnProperty.call(state.answers, key)) return state;
    const answers = Object.assign({}, state.answers);
    answers[key] = value;
    return { seed: state.seed, expanded: state.expanded.slice(), answers: answers };
  }

  function evaluateTraceAnswers(answers) {
    const results = {};
    const details = {};
    let score = 0;
    Object.keys(TRACE_EXPECTED).forEach(function (key) {
      results[key] = answers[key] === TRACE_EXPECTED[key];
      details[key] = TRACE_EXPLANATIONS[key];
      if (results[key]) score += 1;
    });
    return { score: score, total: Object.keys(TRACE_EXPECTED).length, results: results, details: details };
  }

  function deriveLowTrafficScenario(requestsPerHour, failures, sloPercent) {
    const observedErrorRate = failures / requestsPerHour;
    const budgetErrorRate = 1 - (sloPercent / 100);
    const monthlyRequests = requestsPerHour * 24 * 30;
    const monthlyErrorBudget = monthlyRequests * budgetErrorRate;
    return {
      observedErrorRate: observedErrorRate,
      budgetErrorRate: budgetErrorRate,
      burnRate: observedErrorRate / budgetErrorRate,
      monthlyRequests: monthlyRequests,
      monthlyErrorBudget: monthlyErrorBudget,
      budgetConsumed: failures / monthlyErrorBudget,
      allowedWholeFailures: Math.floor(monthlyErrorBudget)
    };
  }

  function parseBoundedNumber(value, limits, key, label, errors, fieldErrors) {
    const text = typeof value === "string" ? value.trim() : value;
    const number = text === "" ? NaN : Number(text);
    if (!Number.isFinite(number)) {
      fieldErrors[key] = label + " must be a number.";
      errors.push(fieldErrors[key]);
      return null;
    }
    if (number < limits.min || number > limits.max) {
      fieldErrors[key] = label + " must be between " + limits.min + " and " + limits.max + ".";
      errors.push(fieldErrors[key]);
      return null;
    }
    if (limits.integer && !Number.isInteger(number)) {
      fieldErrors[key] = label + " must be a whole number.";
      errors.push(fieldErrors[key]);
      return null;
    }
    if (limits.step) {
      const steps = (number - limits.min) / limits.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-8) {
        fieldErrors[key] = label + " must use increments of " + limits.step + ".";
        errors.push(fieldErrors[key]);
        return null;
      }
    }
    return number;
  }

  function calculateCost(input) {
    const errors = [];
    const fieldErrors = {};
    const row = PRICE_ROWS.find(function (price) { return price.id === input.model; });
    if (!row) {
      fieldErrors.model = "Choose a model from the dated price table.";
      errors.push(fieldErrors.model);
    }
    const inputTokens = parseBoundedNumber(input.inputTokens, INPUT_LIMITS.inputTokens, "inputTokens", "Input tokens", errors, fieldErrors);
    const outputTokens = parseBoundedNumber(input.outputTokens, INPUT_LIMITS.outputTokens, "outputTokens", "Output tokens", errors, fieldErrors);
    const requestsPerDay = parseBoundedNumber(input.requestsPerDay, INPUT_LIMITS.requestsPerDay, "requestsPerDay", "Requests per day", errors, fieldErrors);
    const dailyBudgetUsd = parseBoundedNumber(input.dailyBudgetUsd, INPUT_LIMITS.dailyBudgetUsd, "dailyBudgetUsd", "Daily budget", errors, fieldErrors);
    if (errors.length) return { valid: false, errors: errors, fieldErrors: fieldErrors };

    const perRequest = (inputTokens / 1000000 * row.inputPerMillion) +
      (outputTokens / 1000000 * row.outputPerMillion);
    const daily = perRequest * requestsPerDay;
    const monthly = daily * 30;
    const burnRate = daily / dailyBudgetUsd;
    return {
      valid: true,
      errors: [],
      fieldErrors: {},
      model: row.id,
      perRequest: perRequest,
      daily: daily,
      monthly: monthly,
      burnRate: burnRate,
      budgetState: burnRate > 1 ? "over" : burnRate === 1 ? "at" : "within"
    };
  }

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function appendText(parent, tag, className, text) {
    const node = makeElement(tag, className, text);
    parent.appendChild(node);
    return node;
  }

  function makeButton(label, className) {
    const button = makeElement("button", className, label);
    button.type = "button";
    return button;
  }

  function childSpans(parentId) {
    return TRACE_SPANS.filter(function (span) { return span.parentId === parentId; });
  }

  function isVisible(span, expanded) {
    let parentId = span.parentId;
    while (parentId) {
      if (expanded.indexOf(parentId) < 0) return false;
      const parent = TRACE_SPANS.find(function (candidate) { return candidate.id === parentId; });
      parentId = parent ? parent.parentId : null;
    }
    return true;
  }

  function renderTrace(rootNode) {
    let state = createTraceState(rootNode.getAttribute("data-seed") || TRACE_SEED);
    rootNode.replaceChildren();
    rootNode.setAttribute("role", "region");
    rootNode.setAttribute("aria-labelledby", "w7-trace-title");

    const heading = appendText(rootNode, "h3", "w7-practice-title", "Inspect a synthetic GenAI trace");
    heading.id = "w7-trace-title";
    appendText(rootNode, "p", "w7-practice-intro", "Expand the seeded spans, inspect exact applicable semantic-convention attributes, and make each incident call from the evidence. This fixture is OTel-GenAI-shaped, payload-free, and never connected to live telemetry or a vendor export.");

    const toolbar = makeElement("div", "w7-toolbar");
    const expandButton = makeButton("Expand all spans", "w7-secondary-btn");
    const resetButton = makeButton("Reset incident seed", "w7-secondary-btn");
    const seedLabel = appendText(toolbar, "span", "w7-seed", "Seed: " + state.seed);
    toolbar.insertBefore(expandButton, seedLabel);
    toolbar.insertBefore(resetButton, seedLabel);
    rootNode.appendChild(toolbar);

    const summary = makeElement("div", "w7-trace-summary");
    summary.setAttribute("aria-label", "Synthetic trace summary");
    [["Trace duration", "2.48 s"], ["Span count", "6"], ["Status", "ERROR"], ["Aggregate descendant token cost", "$0.0255"]].forEach(function (item) {
      const metric = makeElement("div", "w7-trace-metric");
      appendText(metric, "span", "w7-metric-label", item[0]);
      appendText(metric, "strong", "w7-metric-value", item[1]);
      summary.appendChild(metric);
    });
    rootNode.appendChild(summary);

    const tree = makeElement("div", "w7-trace-tree");
    tree.setAttribute("role", "list");
    tree.setAttribute("aria-label", "Synthetic trace waterfall");
    rootNode.appendChild(tree);

    const guide = makeElement("form", "w7-trace-guide");
    guide.noValidate = true;
    appendText(guide, "h4", "w7-guide-title", "Make the incident call");
    const questions = [
      { key: "latency", label: "Which direct child dominates root latency?", answerOptions: [["", "Choose a span"], ["plan", "chat claude-haiku-4-5 (planning step)"], ["primary", "chat claude-sonnet-5"], ["tool", "execute_tool eligibility_lookup"], ["fallback", "chat claude-haiku-4-5 (fallback response)"]] },
      { key: "error", label: "Which leaf span exposes the failing dependency?", answerOptions: [["", "Choose a span"], ["primary", "chat claude-sonnet-5"], ["payer", "HTTP GET payer-sandbox.local"], ["fallback", "chat claude-haiku-4-5 (fallback response)"]] },
      { key: "cost", label: "Which model span has the largest span-local token estimate?", answerOptions: [["", "Choose a model span"], ["plan", "chat claude-haiku-4-5 (planning step)"], ["primary", "chat claude-sonnet-5"], ["fallback", "chat claude-haiku-4-5 (fallback response)"]] },
      { key: "observedError", group: "low-traffic", label: "At 10 requests/hour with one failure, what is the observed error rate?", answerOptions: [["", "Choose a rate"], ["1-percent", "1%"], ["10-percent", "10%"], ["100-percent", "100%"]] },
      { key: "burnRate", group: "low-traffic", label: "Against a 99.9% SLO, what burn rate does that produce?", answerOptions: [["", "Choose a burn rate"], ["10x", "10×"], ["100x", "100×"], ["1000x", "1,000×"]] },
      { key: "response", group: "low-traffic", label: "What is the safest low-volume alert response?", answerOptions: [["", "Choose a response"], ["mute", "Mute single-failure pages"], ["aggregate-gate", "Aggregate a larger surface/window and add a minimum-volume gate"], ["exclude", "Exclude dependency failures from the SLI"]] }
    ];
    const selectNodes = {};
    const diagnosticNodes = {};
    let lowTrafficHeadingAdded = false;
    questions.forEach(function (question) {
      if (question.group === "low-traffic" && !lowTrafficHeadingAdded) {
        appendText(guide, "h4", "w7-guide-subtitle", "Check the low-traffic arithmetic");
        appendText(guide, "p", "w7-guide-context", "Use 10 requests/hour, one failure, and a 99.9% SLO. Derive the rate and choose a response before checking.");
        lowTrafficHeadingAdded = true;
      }
      const label = makeElement("label", "w7-guide-field");
      appendText(label, "span", "w7-guide-label", question.label);
      const select = makeElement("select", "w7-guide-select");
      select.name = question.key;
      question.answerOptions.forEach(function (optionData) {
        const option = makeElement("option", "", optionData[1]);
        option.value = optionData[0];
        select.appendChild(option);
      });
      label.appendChild(select);
      const diagnostic = appendText(label, "span", "w7-guide-diagnostic", "");
      select.addEventListener("change", function () {
        state = setTraceAnswer(state, question.key, select.value);
        if (diagnostic.textContent) {
          diagnostic.className = "w7-guide-diagnostic is-stale";
          diagnostic.textContent = "Answer changed — check again to update this guidance.";
        }
      });
      diagnostic.id = "w7-guide-diagnostic-" + question.key;
      select.setAttribute("aria-describedby", diagnostic.id);
      guide.appendChild(label);
      selectNodes[question.key] = select;
      diagnosticNodes[question.key] = diagnostic;
    });
    const checkButton = makeButton("Check all six findings", "w7-primary-btn");
    guide.appendChild(checkButton);
    const feedback = appendText(guide, "div", "w7-feedback", "Inspect the trace and derive the low-traffic rate before checking.");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    const treeStatus = appendText(guide, "div", "w7-visually-hidden", "");
    treeStatus.setAttribute("role", "status");
    treeStatus.setAttribute("aria-live", "polite");
    rootNode.appendChild(guide);

    function spanById(spanId) {
      return TRACE_SPANS.find(function (candidate) { return candidate.id === spanId; });
    }

    function paintTree(focusSpanId) {
      const toggles = {};
      tree.replaceChildren();
      TRACE_SPANS.forEach(function (span) {
        if (!isVisible(span, state.expanded)) return;
        const open = state.expanded.indexOf(span.id) >= 0;
        const row = makeElement("div", "w7-span-row" + (span.status === "ERROR" ? " is-error" : ""));
        row.setAttribute("role", "listitem");
        row.style.setProperty("--trace-depth", String(span.depth));

        const toggle = makeButton("", "w7-span-toggle");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-controls", "w7-span-detail-" + span.id);
        const parent = spanById(span.parentId);
        const childCount = childSpans(span.id).length;
        const durationLabel = span.durationMs >= 1000
          ? (span.durationMs / 1000).toFixed(2) + " seconds"
          : span.durationMs + " milliseconds";
        const offsetLabel = span.startMs >= 1000
          ? (span.startMs / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + " seconds"
          : span.startMs + " milliseconds";
        toggle.setAttribute("aria-label", span.name + ", " + span.purpose + ", " + span.status +
          ", starts at " + offsetLabel + ", duration " + durationLabel +
          (parent ? ", child of " + parent.name : ", root span") +
          (childCount ? ", " + childCount + " child span" + (childCount === 1 ? "" : "s") : ""));
        toggles[span.id] = toggle;
        const caret = appendText(toggle, "span", "w7-span-caret", open ? "−" : "+");
        caret.setAttribute("aria-hidden", "true");
        const identity = makeElement("span", "w7-span-identity");
        appendText(identity, "strong", "w7-span-name", span.name);
        appendText(identity, "span", "w7-span-kind", span.purpose + " · " + span.kind + " · " + span.status);
        toggle.appendChild(identity);
        const track = makeElement("span", "w7-waterfall-track");
        const bar = makeElement("span", "w7-waterfall-bar");
        bar.style.setProperty("--trace-start", (span.startMs / 2480 * 100).toFixed(2) + "%");
        bar.style.setProperty("--trace-width", Math.max(2.5, span.durationMs / 2480 * 100).toFixed(2) + "%");
        track.appendChild(bar);
        toggle.appendChild(track);
        appendText(toggle, "span", "w7-span-duration", span.durationMs >= 1000 ? (span.durationMs / 1000).toFixed(2) + " s" : span.durationMs + " ms");
        row.appendChild(toggle);

        const detail = makeElement("div", "w7-span-detail");
        detail.id = "w7-span-detail-" + span.id;
        detail.hidden = !open;
        const metadata = [
          ["duration", durationLabel],
          ["start offset", offsetLabel]
        ];
        if (span.operation) metadata.push(["gen_ai.operation.name", span.operation]);
        if (span.provider) metadata.push(["gen_ai.provider.name", span.provider]);
        if (span.model) metadata.push(["gen_ai.request.model", span.model]);
        if (span.inputTokens !== undefined) metadata.push(["gen_ai.usage.input_tokens", String(span.inputTokens)]);
        if (span.outputTokens !== undefined) metadata.push(["gen_ai.usage.output_tokens", String(span.outputTokens)]);
        if (span.tool) metadata.push(["gen_ai.tool.name", span.tool]);
        if (span.httpMethod) metadata.push(["http.request.method", span.httpMethod]);
        if (span.serverAddress) metadata.push(["server.address", span.serverAddress]);
        if (span.errorType) metadata.push(["error.type", span.errorType]);
        if (span.estimatedCostUsd !== undefined) metadata.push(["span-local estimated token cost", "$" + span.estimatedCostUsd.toFixed(5)]);
        if (span.aggregateDescendantCostUsd !== undefined) metadata.push(["aggregate descendant token cost", "$" + span.aggregateDescendantCostUsd.toFixed(5)]);
        metadata.forEach(function (item) {
          const pair = makeElement("span", "w7-meta-pair");
          appendText(pair, "b", "", item[0] + ": ");
          pair.appendChild(document.createTextNode(item[1]));
          detail.appendChild(pair);
        });
        appendText(detail, "p", "w7-span-note", span.note);
        row.appendChild(detail);
        toggle.addEventListener("click", function () {
          state = toggleSpan(state, span.id);
          paintTree(span.id);
          treeStatus.textContent = (state.expanded.indexOf(span.id) >= 0 ? "Expanded " : "Collapsed ") + span.name + ".";
        });
        tree.appendChild(row);
      });
      if (focusSpanId && toggles[focusSpanId]) toggles[focusSpanId].focus();
    }

    expandButton.addEventListener("click", function () {
      state = expandAllSpans(state);
      paintTree();
      treeStatus.textContent = "All six seeded spans are expanded.";
    });
    resetButton.addEventListener("click", function () {
      state = createTraceState(rootNode.getAttribute("data-seed") || TRACE_SEED);
      Object.keys(selectNodes).forEach(function (key) {
        selectNodes[key].value = "";
        diagnosticNodes[key].textContent = "";
        diagnosticNodes[key].className = "w7-guide-diagnostic";
      });
      paintTree();
      feedback.className = "w7-feedback";
      feedback.textContent = "Inspect the trace and derive the low-traffic rate before checking.";
      treeStatus.textContent = "Seed reset. Only the root span is expanded and all answers are cleared.";
    });
    checkButton.addEventListener("click", function () {
      const result = evaluateTraceAnswers(state.answers);
      Object.keys(result.results).forEach(function (key) {
        const diagnostic = diagnosticNodes[key];
        diagnostic.className = "w7-guide-diagnostic " + (result.results[key] ? "is-ok" : "is-error");
        diagnostic.textContent = (result.results[key] ? "Correct — " : "Review — ") + result.details[key];
      });
      feedback.className = "w7-feedback " + (result.score === result.total ? "is-ok" : "is-error");
      feedback.textContent = result.score + "/" + result.total + ". Per-question guidance remains below each answer while you inspect or revise spans.";
    });
    paintTree();
  }

  function formatUsd(value, digits) {
    return "$" + value.toFixed(digits);
  }

  function formatRate(value) {
    let text = value.toFixed(4);
    while (text.indexOf(".") >= 0 && text.endsWith("0") && text.split(".")[1].length > 2) {
      text = text.slice(0, -1);
    }
    return text;
  }

  function formatPercentDelta(value) {
    const absolute = Math.abs(value);
    const digits = absolute >= 10 ? 1 : absolute >= 0.1 ? 2 : 4;
    if (digits <= 2) return absolute.toFixed(digits);
    let text = absolute.toFixed(digits);
    while (text.endsWith("0") && text.split(".")[1].length > 2) text = text.slice(0, -1);
    return text;
  }

  function renderCalculator(rootNode) {
    rootNode.replaceChildren();
    rootNode.setAttribute("role", "region");
    rootNode.setAttribute("aria-labelledby", "w7-cost-title");
    const heading = appendText(rootNode, "h3", "w7-practice-title", "Calculate token-cost burn rate");
    heading.id = "w7-cost-title";
    appendText(rootNode, "p", "w7-practice-intro", "Use the dated standard Claude API prices below. The calculation is local and illustrative: no model call, account, live usage, or telemetry is involved.");

    const sourceLine = makeElement("p", "w7-price-date");
    sourceLine.appendChild(document.createTextNode("Price snapshot verified 2026-09-24. Re-check "));
    const sourceLink = makeElement("a", "", "Anthropic's first-party pricing table");
    sourceLink.href = "https://platform.claude.com/docs/en/about-claude/pricing";
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener";
    sourceLine.appendChild(sourceLink);
    sourceLine.appendChild(document.createTextNode(" before client use."));
    rootNode.appendChild(sourceLine);

    const table = makeElement("table", "w7-price-table");
    const caption = appendText(table, "caption", "", "Standard global Claude API token prices (USD per million tokens)");
    caption.className = "w7-visually-hidden";
    const thead = makeElement("thead");
    const headRow = makeElement("tr");
    ["Model", "Input / MTok", "Output / MTok"].forEach(function (label) { appendText(headRow, "th", "", label); });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = makeElement("tbody");
    PRICE_ROWS.forEach(function (row) {
      const tr = makeElement("tr");
      appendText(tr, "th", "", row.label);
      appendText(tr, "td", "", "$" + row.inputPerMillion.toFixed(2));
      appendText(tr, "td", "", "$" + row.outputPerMillion.toFixed(2));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    rootNode.appendChild(table);

    const form = makeElement("form", "w7-cost-form");
    form.noValidate = true;
    const controls = makeElement("div", "w7-cost-controls");
    const fields = {};
    function addField(key, labelText, type, config) {
      const label = makeElement("label", "w7-cost-field");
      appendText(label, "span", "w7-cost-label", labelText);
      const input = makeElement(type === "select" ? "select" : "input", "w7-cost-input");
      input.name = key;
      if (type === "select") {
        PRICE_ROWS.forEach(function (row) {
          const option = makeElement("option", "", row.label);
          option.value = row.id;
          input.appendChild(option);
        });
      } else {
        input.type = "number";
        input.min = String(config.min);
        input.max = String(config.max);
        input.step = String(config.step);
        input.inputMode = config.integer ? "numeric" : "decimal";
      }
      label.appendChild(input);
      if (config.help) appendText(label, "span", "w7-field-help", config.help);
      controls.appendChild(label);
      fields[key] = input;
    }
    addField("model", "Model", "select", {});
    addField("inputTokens", "Input tokens / request", "number", { min: 0, max: 200000, step: 1, integer: true, help: "Whole number, 0 to 200,000" });
    addField("outputTokens", "Output tokens / request", "number", { min: 0, max: 64000, step: 1, integer: true, help: "Whole number, 0 to 64,000" });
    addField("requestsPerDay", "Requests / day", "number", { min: 1, max: 100000, step: 1, integer: true, help: "Whole number, 1 to 100,000" });
    addField("dailyBudgetUsd", "Daily cost budget (USD)", "number", { min: 0.01, max: 100000, step: 0.01, help: "$0.01 to $100,000" });
    form.appendChild(controls);

    const formula = appendText(form, "p", "w7-formula", "Per request = (input tokens ÷ 1,000,000 × input price) + (output tokens ÷ 1,000,000 × output price). Daily = per request × requests/day. 30-day month = daily × 30. Cost burn rate = daily spend ÷ daily budget.");
    formula.setAttribute("aria-label", "Cost formula");

    const outputs = makeElement("div", "w7-cost-outputs");
    const outputNodes = {};
    [["perRequest", "Per request"], ["daily", "Per day"], ["monthly", "Per 30-day month"], ["burnRate", "Cost burn rate"]].forEach(function (item) {
      const block = makeElement("div", "w7-cost-output");
      appendText(block, "span", "w7-output-label", item[1]);
      const output = appendText(block, "output", "w7-output-value", "Not calculated");
      output.setAttribute("name", item[0]);
      outputs.appendChild(block);
      outputNodes[item[0]] = output;
    });
    form.appendChild(outputs);
    const actions = makeElement("div", "w7-cost-actions");
    const reset = makeButton("Reset hand-check fixture", "w7-secondary-btn");
    actions.appendChild(reset);
    const status = appendText(actions, "div", "w7-feedback", "");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    actions.appendChild(status);
    form.appendChild(actions);
    rootNode.appendChild(form);

    appendText(rootNode, "p", "w7-assumptions", "Assumptions: standard global Claude API input/output pricing only. Excludes caching, Batch API, long-context premiums, tools, data residency, taxes, and partner-platform pricing. This is a dated teaching estimate, not a quote.");

    function setDefaults() {
      Object.keys(DEFAULT_COST_INPUT).forEach(function (key) { fields[key].value = String(DEFAULT_COST_INPUT[key]); });
    }

    function update() {
      const raw = {};
      Object.keys(fields).forEach(function (key) { raw[key] = fields[key].value; });
      const result = calculateCost(raw);
      Object.keys(fields).forEach(function (key) {
        const error = result.fieldErrors[key] || "";
        if (error) fields[key].setAttribute("aria-invalid", "true");
        else fields[key].removeAttribute("aria-invalid");
        if (typeof fields[key].setCustomValidity === "function") fields[key].setCustomValidity(error);
      });
      if (!result.valid) {
        ["perRequest", "daily", "monthly", "burnRate"].forEach(function (key) { outputNodes[key].textContent = "Not calculated"; });
        status.className = "w7-feedback is-error";
        status.textContent = result.errors.join(" ");
        return;
      }
      outputNodes.perRequest.textContent = formatUsd(result.perRequest, 6);
      outputNodes.daily.textContent = formatUsd(result.daily, 2);
      outputNodes.monthly.textContent = formatUsd(result.monthly, 2);
      const displayedRate = formatRate(result.burnRate);
      const budgetDeltaPercent = (result.burnRate - 1) * 100;
      outputNodes.burnRate.textContent = displayedRate + "×";
      status.className = "w7-feedback " + (result.budgetState === "over" ? "is-error" : "is-ok");
      status.textContent = result.budgetState === "over"
        ? "Burn rate " + displayedRate + "× is " + formatPercentDelta(budgetDeltaPercent) + "% over the daily cost budget."
        : result.budgetState === "at"
          ? "Burn rate is 1.00×: this workload uses exactly the daily cost budget."
          : "Burn rate " + displayedRate + "× is " + formatPercentDelta(budgetDeltaPercent) + "% under the daily cost budget.";
    }

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener(key === "model" ? "change" : "input", update);
    });
    reset.addEventListener("click", function () {
      setDefaults();
      update();
      fields.inputTokens.focus();
    });
    form.addEventListener("submit", function (event) { event.preventDefault(); });
    setDefaults();
    update();
  }

  function init() {
    document.querySelectorAll("[data-w7-trace]").forEach(renderTrace);
    document.querySelectorAll("[data-w7-cost]").forEach(renderCalculator);
  }

  return Object.freeze({
    TRACE_SEED: TRACE_SEED,
    TRACE_SPANS: TRACE_SPANS,
    PRICE_ROWS: PRICE_ROWS,
    DEFAULT_COST_INPUT: DEFAULT_COST_INPUT,
    INPUT_LIMITS: INPUT_LIMITS,
    createTraceState: createTraceState,
    toggleSpan: toggleSpan,
    expandAllSpans: expandAllSpans,
    setTraceAnswer: setTraceAnswer,
    evaluateTraceAnswers: evaluateTraceAnswers,
    deriveLowTrafficScenario: deriveLowTrafficScenario,
    calculateCost: calculateCost,
    init: init
  });
});
