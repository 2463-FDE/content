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
      operation: "invoke_agent", model: "none", inputTokens: 0, outputTokens: 0,
      tool: "none", errorType: "DownstreamTimeout", estimatedCostUsd: 0.02554,
      note: "Synthetic root span. The agent returned a safe degraded response after a tool timeout."
    }),
    Object.freeze({
      id: "plan", parentId: "agent", depth: 1, startMs: 35, durationMs: 190,
      name: "chat claude-haiku-4-5", purpose: "planning step", kind: "CLIENT", status: "OK",
      operation: "chat", model: "claude-haiku-4-5", inputTokens: 640, outputTokens: 38,
      tool: "none", errorType: "none", estimatedCostUsd: 0.00083,
      note: "Chooses the eligibility lookup before drafting a response."
    }),
    Object.freeze({
      id: "primary", parentId: "agent", depth: 1, startMs: 245, durationMs: 430,
      name: "chat claude-sonnet-5", purpose: "primary draft", kind: "CLIENT", status: "OK",
      operation: "chat", model: "claude-sonnet-5", inputTokens: 7600, outputTokens: 46,
      tool: "eligibility_lookup requested", errorType: "none", estimatedCostUsd: 0.01566,
      note: "Largest estimated cost contributor: a long context is sent before the tool call."
    }),
    Object.freeze({
      id: "tool", parentId: "agent", depth: 1, startMs: 700, durationMs: 1180,
      name: "execute_tool eligibility_lookup", purpose: "tool call", kind: "INTERNAL", status: "ERROR",
      operation: "execute_tool", model: "none", inputTokens: 0, outputTokens: 0,
      tool: "eligibility_lookup", errorType: "TimeoutError", estimatedCostUsd: 0,
      note: "Longest direct child of the root. Expand it to inspect the failing dependency."
    }),
    Object.freeze({
      id: "payer", parentId: "tool", depth: 2, startMs: 735, durationMs: 1050,
      name: "HTTP GET payer-sandbox.local", purpose: "tool dependency", kind: "CLIENT", status: "ERROR",
      operation: "http.client", model: "none", inputTokens: 0, outputTokens: 0,
      tool: "eligibility_lookup", errorType: "TimeoutError", estimatedCostUsd: 0,
      note: "Synthetic dependency only. No request URL or patient payload is captured."
    }),
    Object.freeze({
      id: "fallback", parentId: "agent", depth: 1, startMs: 1905, durationMs: 510,
      name: "chat claude-haiku-4-5", purpose: "fallback response", kind: "CLIENT", status: "OK",
      operation: "chat", model: "claude-haiku-4-5", inputTokens: 8200, outputTokens: 170,
      tool: "none", errorType: "none", estimatedCostUsd: 0.00905,
      note: "Produces a bounded fallback after the failed tool. Payload content is intentionally absent."
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
    inputTokens: Object.freeze({ min: 0, max: 200000 }),
    outputTokens: Object.freeze({ min: 0, max: 64000 }),
    requestsPerDay: Object.freeze({ min: 1, max: 100000 }),
    dailyBudgetUsd: Object.freeze({ min: 0.01, max: 100000 })
  });

  function createTraceState(seed) {
    return {
      seed: seed || TRACE_SEED,
      expanded: ["agent"],
      answers: { latency: "", error: "", cost: "" }
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
    const expected = { latency: "tool", error: "payer", cost: "primary" };
    const results = {};
    let score = 0;
    Object.keys(expected).forEach(function (key) {
      results[key] = answers[key] === expected[key];
      if (results[key]) score += 1;
    });
    return { score: score, total: 3, results: results };
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
    appendText(rootNode, "p", "w7-practice-intro", "Expand the seeded spans, then identify the latency, error, and estimated-cost contributors. This fixture is OTel-GenAI-shaped, payload-free, and never connected to live telemetry or a vendor export.");

    const toolbar = makeElement("div", "w7-toolbar");
    const expandButton = makeButton("Expand all spans", "w7-secondary-btn");
    const resetButton = makeButton("Reset incident seed", "w7-secondary-btn");
    const seedLabel = appendText(toolbar, "span", "w7-seed", "Seed: " + state.seed);
    toolbar.insertBefore(expandButton, seedLabel);
    toolbar.insertBefore(resetButton, seedLabel);
    rootNode.appendChild(toolbar);

    const summary = makeElement("div", "w7-trace-summary");
    summary.setAttribute("aria-label", "Synthetic trace summary");
    [["Trace duration", "2.48 s"], ["Span count", "6"], ["Status", "ERROR"], ["Estimated token cost", "$0.0255"]].forEach(function (item) {
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
      { key: "cost", label: "Which span contributes the most estimated token cost?", answerOptions: [["", "Choose a span"], ["plan", "chat claude-haiku-4-5 (planning step)"], ["primary", "chat claude-sonnet-5"], ["fallback", "chat claude-haiku-4-5 (fallback response)"]] }
    ];
    const selectNodes = {};
    questions.forEach(function (question) {
      const label = makeElement("label", "w7-guide-field");
      appendText(label, "span", "w7-guide-label", question.label);
      const select = makeElement("select", "w7-guide-select");
      select.name = question.key;
      question.answerOptions.forEach(function (optionData) {
        const option = makeElement("option", "", optionData[1]);
        option.value = optionData[0];
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        state = setTraceAnswer(state, question.key, select.value);
      });
      label.appendChild(select);
      guide.appendChild(label);
      selectNodes[question.key] = select;
    });
    const checkButton = makeButton("Check findings", "w7-primary-btn");
    guide.appendChild(checkButton);
    const feedback = appendText(guide, "div", "w7-feedback", "Open the suspicious spans before you decide.");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
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
        toggle.setAttribute("aria-label", span.name + ", " + span.purpose + ", " + span.status +
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
          ["operation", span.operation], ["model", span.model],
          ["tokens", span.inputTokens + " input / " + span.outputTokens + " output"],
          ["tool", span.tool], ["error.type", span.errorType],
          ["estimated cost", "$" + span.estimatedCostUsd.toFixed(5)]
        ];
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
          feedback.textContent = (state.expanded.indexOf(span.id) >= 0 ? "Expanded " : "Collapsed ") + span.name + ".";
        });
        tree.appendChild(row);
      });
      if (focusSpanId && toggles[focusSpanId]) toggles[focusSpanId].focus();
    }

    expandButton.addEventListener("click", function () {
      state = expandAllSpans(state);
      paintTree();
      feedback.textContent = "All six seeded spans are expanded.";
    });
    resetButton.addEventListener("click", function () {
      state = createTraceState(rootNode.getAttribute("data-seed") || TRACE_SEED);
      Object.keys(selectNodes).forEach(function (key) { selectNodes[key].value = ""; });
      paintTree();
      feedback.textContent = "Seed reset. Only the root span is expanded.";
    });
    checkButton.addEventListener("click", function () {
      const result = evaluateTraceAnswers(state.answers);
      if (result.score === result.total) {
        feedback.textContent = "3/3. The tool dominates latency, its HTTP child exposes the timeout, and the Sonnet 5 call contributes the most estimated token cost.";
      } else {
        feedback.textContent = result.score + "/3. Re-open the longest bar, follow its child error.type, and compare token counts with the priced model.";
      }
    });
    paintTree();
  }

  function formatUsd(value, digits) {
    return "$" + value.toFixed(digits);
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
        input.inputMode = "decimal";
      }
      label.appendChild(input);
      if (config.help) appendText(label, "span", "w7-field-help", config.help);
      controls.appendChild(label);
      fields[key] = input;
    }
    addField("model", "Model", "select", {});
    addField("inputTokens", "Input tokens / request", "number", { min: 0, max: 200000, step: 100, help: "0 to 200,000" });
    addField("outputTokens", "Output tokens / request", "number", { min: 0, max: 64000, step: 10, help: "0 to 64,000" });
    addField("requestsPerDay", "Requests / day", "number", { min: 1, max: 100000, step: 1, help: "1 to 100,000" });
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
        if (Object.prototype.hasOwnProperty.call(result.fieldErrors, key)) fields[key].setAttribute("aria-invalid", "true");
        else fields[key].removeAttribute("aria-invalid");
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
      outputNodes.burnRate.textContent = result.burnRate.toFixed(2) + "×";
      status.className = "w7-feedback " + (result.budgetState === "over" ? "is-error" : "is-ok");
      status.textContent = result.budgetState === "over"
        ? "Budget is burning too fast. At this volume, projected daily spend exceeds the daily cost budget."
        : result.budgetState === "at"
          ? "Burn rate is 1.00×: this workload uses exactly the daily cost budget."
          : "Within budget. A burn rate below 1.00× leaves budget headroom at this volume.";
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
    calculateCost: calculateCost,
    init: init
  });
});
