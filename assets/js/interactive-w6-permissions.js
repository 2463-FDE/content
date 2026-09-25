/* Week 6 permission-rule practice. Deterministic, synthetic, and fully local. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Week6Permissions = api;
  if (root.document) {
    const start = () => api.init(root.document);
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
    else start();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RULES = Object.freeze([
    { id: "S-01", effect: "deny", tool: "*", target: "sensitive argument", description: "Deny any call whose argument name or value signals a secret, token, password, credential, private key, or .env file." },
    { id: "F-01", effect: "deny", tool: "file.read", target: "restricted/**", description: "Deny reads below the synthetic restricted/ boundary." },
    { id: "F-02", effect: "allow", tool: "file.read", target: "docs/**", description: "Allow reads below docs/ for planning and review." },
    { id: "F-03", effect: "allow", tool: "file.read", target: "**", description: "Allow other file reads. More-specific rules above this wildcard win." },
    { id: "T-01", effect: "allow", tool: "test.run", target: "unit:*", description: "Allow unit suites only." },
    { id: "T-02", effect: "deny", tool: "test.run", target: "*", description: "Deny every other test suite. The specific unit allowance above takes precedence." },
    { id: "H-01", effect: "allow", tool: "http.fetch", target: "docs.example.test", description: "Allow the one synthetic documentation host." },
    { id: "D-01", effect: "deny", tool: "*", target: "*", description: "Deny anything not explicitly allowed (least-privilege default)." }
  ]);

  const CASES = Object.freeze([
    { id: "docs-guide", title: "Read a migration guide", call: { tool: "file.read", args: { path: "docs/migration-guide.md" } }, verdict: "allow", focus: "specific allow" },
    { id: "source-read", title: "Inspect application source", call: { tool: "file.read", args: { path: "src/billing/router.py" } }, verdict: "allow", focus: "wildcard allow" },
    { id: "secret-file", title: "Read synthetic restricted data", call: { tool: "file.read", args: { path: "restricted/customer-map.json" } }, verdict: "deny", focus: "specific deny before wildcard" },
    { id: "sensitive-arg", title: "Pass a credential-shaped argument", call: { tool: "file.read", args: { path: "docs/setup.md", api_token: "synthetic-demo-value" } }, verdict: "deny", focus: "sensitive arguments outrank an allowed path" },
    { id: "unit-tests", title: "Run a unit suite", call: { tool: "test.run", args: { suite: "unit:permissions" } }, verdict: "allow", focus: "specific rule before wildcard deny" },
    { id: "deployment-tests", title: "Run a deployment suite", call: { tool: "test.run", args: { suite: "deployment:staging" } }, verdict: "deny", focus: "wildcard deny" },
    { id: "public-fetch", title: "Fetch synthetic public docs", call: { tool: "http.fetch", args: { host: "docs.example.test", path: "/agent-policy" } }, verdict: "allow", focus: "exact allow" },
    { id: "unknown-fetch", title: "Fetch an unlisted host", call: { tool: "http.fetch", args: { host: "updates.example.test", path: "/latest" } }, verdict: "deny", focus: "least-privilege fallback" },
    { id: "shell-command", title: "Attempt a shell command", call: { tool: "shell.execute", args: { command: "printf synthetic" } }, verdict: "deny", focus: "unlisted tool and least privilege" }
  ]);

  const SETS = Object.freeze({
    all: CASES.map((item) => item.id),
    legacy: ["docs-guide", "secret-file", "source-read"],
    delivery: ["unit-tests", "deployment-tests", "public-fetch", "unknown-fetch"]
  });

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function containsSensitiveArgument(value, key) {
    const marker = /(?:secret|token|password|credential|private[_-]?key|(?:^|\/)\.env(?:\.|$|\/))/i;
    if (key && marker.test(key)) return true;
    if (typeof value === "string") return marker.test(value);
    if (Array.isArray(value)) return value.some((item) => containsSensitiveArgument(item, ""));
    if (isRecord(value)) return Object.keys(value).some((name) => containsSensitiveArgument(value[name], name));
    return false;
  }

  function wildcardMatch(pattern, value) {
    if (typeof pattern !== "string" || typeof value !== "string") return false;
    if (pattern === "**" || pattern === "*") return true;
    if (pattern.endsWith("**")) return value.startsWith(pattern.slice(0, -2));
    if (pattern.endsWith("*")) return value.startsWith(pattern.slice(0, -1));
    return pattern === value;
  }

  function targetFor(call) {
    if (call.tool === "file.read") return call.args.path;
    if (call.tool === "test.run") return call.args.suite;
    if (call.tool === "http.fetch") return call.args.host;
    return "";
  }

  function evaluateRule(rule, call) {
    if (rule.id === "S-01") {
      const matched = containsSensitiveArgument(call.args, "");
      return { matched, reason: matched ? "A sensitive argument marker is present." : "No sensitive argument marker is present." };
    }
    const toolMatches = rule.tool === "*" || rule.tool === call.tool;
    const target = targetFor(call);
    const targetMatches = rule.target === "*" || wildcardMatch(rule.target, target);
    const matched = toolMatches && targetMatches;
    const reason = matched
      ? `Tool “${call.tool}” and target “${target || "(none)"}” match.`
      : `Does not match tool “${call.tool}” and target “${target || "(none)"}”.`;
    return { matched, reason };
  }

  function evaluateCall(call) {
    if (!isRecord(call) || typeof call.tool !== "string" || !call.tool.trim() || !isRecord(call.args)) {
      return { ok: false, error: "A proposed call needs a non-empty tool name and an arguments object." };
    }
    const trace = RULES.map((rule) => Object.assign({ id: rule.id, effect: rule.effect }, evaluateRule(rule, call)));
    const decidingIndex = trace.findIndex((entry) => entry.matched);
    if (decidingIndex < 0) return { ok: false, error: "The policy has no deciding rule." };
    trace.forEach((entry, index) => {
      entry.decision = index === decidingIndex;
      entry.precedence = index > decidingIndex && entry.matched ? "matched later; earlier rule wins" : "";
    });
    const decidingRule = RULES[decidingIndex];
    return { ok: true, verdict: decidingRule.effect, decidingRule: decidingRule.id, trace };
  }

  function createSession(caseIds) {
    const ids = Array.isArray(caseIds) && caseIds.length ? caseIds.slice() : SETS.all.slice();
    if (ids.some((id) => !CASES.some((item) => item.id === id))) throw new Error("Unknown permission-practice case.");
    let index = 0;
    let prediction = null;
    let checked = false;
    return {
      current: () => CASES.find((item) => item.id === ids[index]),
      state: () => ({ index, prediction, checked, total: ids.length }),
      predict(value) {
        if (value !== "allow" && value !== "deny") throw new Error("Prediction must be allow or deny.");
        prediction = value;
        checked = false;
      },
      check() {
        if (!prediction) return { ok: false, error: "Choose allow or deny before checking." };
        const result = evaluateCall(this.current().call);
        checked = true;
        return Object.assign({}, result, { correct: result.verdict === prediction, prediction });
      },
      next() {
        index = (index + 1) % ids.length;
        prediction = null;
        checked = false;
        return this.current();
      },
      retry() {
        prediction = null;
        checked = false;
      },
      reset() {
        index = 0;
        prediction = null;
        checked = false;
        return this.current();
      }
    };
  }

  function el(document, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function append(parent) {
    for (let i = 1; i < arguments.length; i += 1) parent.appendChild(arguments[i]);
    return parent;
  }

  function addStyles(document) {
    if (document.getElementById("w6-permission-styles")) return;
    const style = el(document, "style");
    style.id = "w6-permission-styles";
    style.textContent = ".ix-permission{margin:18px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.perm-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.perm-rules,.perm-practice{min-width:0}.perm-rule{display:grid;grid-template-columns:3.3rem 3.2rem 1fr;gap:7px;padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px;line-height:1.4}.perm-rule:last-child{border-bottom:0}.perm-rule-id{font-family:var(--mono);font-weight:700}.perm-effect{text-transform:uppercase;font-weight:700}.perm-effect.deny{color:var(--bad)}.perm-effect.allow{color:var(--good-ink)}.perm-case-select{width:100%;box-sizing:border-box;font:inherit;color:var(--ink);background:var(--surface);border:1.5px solid var(--line);border-radius:8px;padding:8px}.perm-call{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;background:var(--code-bg);border-radius:8px;padding:10px;font:12.5px/1.5 var(--mono)}.perm-predict{margin:0;padding:8px 0;border:0}.perm-predict legend{font-weight:700;margin-bottom:5px}.perm-predict label{display:inline-flex;align-items:center;gap:6px;margin:0 18px 5px 0}.perm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:5px}.perm-actions button{font:inherit}.perm-secondary{cursor:pointer;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-weight:600;padding:9px 13px;border-radius:9px}.perm-feedback{margin-top:12px;padding:11px;border:1px solid var(--line);border-radius:9px;background:var(--surface)}.perm-feedback:empty{display:none}.perm-verdict{font-weight:800;margin-bottom:7px}.perm-trace{margin:7px 0 0;padding-left:20px;font-size:13px}.perm-trace li{margin:5px 0}.perm-trace .deciding{font-weight:700;color:var(--accent-ink)}.perm-progress{font-size:12px;color:var(--ink-soft);margin:7px 0}.perm-note{font-size:12.5px;color:var(--ink-soft);margin:10px 0 0}@media(max-width:560px){.perm-layout{grid-template-columns:1fr}.ix-permission{padding:12px}.perm-rule{grid-template-columns:3rem 3rem 1fr}.perm-actions>*{flex:1 1 8rem}}";
    (document.head || document.documentElement).appendChild(style);
  }

  function renderWidget(document, rootNode) {
    const requestedSet = rootNode.getAttribute("data-case-set") || "all";
    const caseIds = SETS[requestedSet] || SETS.all;
    const session = createSession(caseIds);
    rootNode.textContent = "";

    const heading = el(document, "div", "ix-k", "▶ Try it · permission-rule evaluator");
    const layout = el(document, "div", "perm-layout");
    const rulesPanel = el(document, "section", "perm-rules");
    const rulesTitle = el(document, "h3", "", "Displayed policy — first matching rule wins");
    rulesPanel.setAttribute("aria-labelledby", `${rootNode.id}-rules-title`);
    rulesTitle.id = `${rootNode.id}-rules-title`;
    const ruleList = el(document, "div", "perm-rule-list");
    RULES.forEach((rule) => {
      const row = el(document, "div", "perm-rule");
      append(row,
        el(document, "span", "perm-rule-id", rule.id),
        el(document, "span", `perm-effect ${rule.effect}`, rule.effect),
        el(document, "span", "", `${rule.tool} · ${rule.target} — ${rule.description}`)
      );
      ruleList.appendChild(row);
    });
    append(rulesPanel, rulesTitle, ruleList, el(document, "p", "perm-note", "Every call is a synthetic proposal. This exercise evaluates policy only; it never runs a tool."));

    const practice = el(document, "section", "perm-practice");
    const caseLabel = el(document, "label", "", "Proposed tool-call case");
    const select = el(document, "select", "perm-case-select");
    select.id = `${rootNode.id}-case`;
    caseLabel.setAttribute("for", select.id);
    caseIds.forEach((id) => {
      const item = CASES.find((candidate) => candidate.id === id);
      const option = el(document, "option", "", item.title);
      option.value = item.id;
      select.appendChild(option);
    });
    const progress = el(document, "div", "perm-progress");
    const call = el(document, "pre", "perm-call");
    const fieldset = el(document, "fieldset", "perm-predict");
    const legend = el(document, "legend", "", "Your prediction");
    const radioName = `${rootNode.id}-prediction`;
    function radio(value, labelText) {
      const label = el(document, "label");
      const input = el(document, "input");
      input.type = "radio";
      input.name = radioName;
      input.value = value;
      label.appendChild(input);
      label.appendChild(document.createTextNode(labelText));
      return { label, input };
    }
    const allow = radio("allow", "Allow");
    const deny = radio("deny", "Deny");
    append(fieldset, legend, allow.label, deny.label);
    const actions = el(document, "div", "perm-actions");
    const check = el(document, "button", "btn", "Check prediction");
    check.type = "button";
    const retry = el(document, "button", "perm-secondary", "Retry case");
    retry.type = "button";
    const next = el(document, "button", "perm-secondary", "Next case");
    next.type = "button";
    const reset = el(document, "button", "perm-secondary", "Reset drill");
    reset.type = "button";
    append(actions, check, retry, next, reset);
    const feedback = el(document, "div", "perm-feedback");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.setAttribute("aria-atomic", "true");
    append(practice, caseLabel, select, progress, call, fieldset, actions, feedback);
    append(layout, rulesPanel, practice);
    append(rootNode, heading, layout);

    function clearPrediction() {
      allow.input.checked = false;
      deny.input.checked = false;
      feedback.textContent = "";
    }

    function drawCase() {
      const item = session.current();
      select.value = item.id;
      progress.textContent = `Case ${session.state().index + 1} of ${session.state().total} · Focus: ${item.focus}`;
      call.textContent = `${item.call.tool}(${JSON.stringify(item.call.args, null, 2)})`;
      clearPrediction();
    }

    function chooseCase(id) {
      session.reset();
      while (session.current().id !== id) session.next();
      drawCase();
    }

    select.addEventListener("change", () => chooseCase(select.value));
    allow.input.addEventListener("change", () => session.predict("allow"));
    deny.input.addEventListener("change", () => session.predict("deny"));
    check.addEventListener("click", () => {
      const result = session.check();
      feedback.textContent = "";
      if (!result.ok) {
        feedback.appendChild(el(document, "div", "perm-verdict", result.error));
        return;
      }
      const verdict = el(document, "div", "perm-verdict", `${result.correct ? "Correct" : "Not yet"}: ${result.verdict.toUpperCase()} — deciding rule ${result.decidingRule}.`);
      const traceTitle = el(document, "div", "", "Rule-by-rule evaluation:");
      const trace = el(document, "ol", "perm-trace");
      result.trace.forEach((entry) => {
        const item = el(document, "li", entry.decision ? "deciding" : "");
        let text = `${entry.id}: ${entry.matched ? "matched" : "skipped"}. ${entry.reason}`;
        if (entry.decision) text += ` Exact deciding rule → ${entry.effect.toUpperCase()}.`;
        else if (entry.precedence) text += ` ${entry.precedence}.`;
        item.textContent = text;
        trace.appendChild(item);
      });
      append(feedback, verdict, traceTitle, trace);
    });
    retry.addEventListener("click", () => { session.retry(); clearPrediction(); allow.input.focus(); });
    next.addEventListener("click", () => { session.next(); drawCase(); select.focus(); });
    reset.addEventListener("click", () => { session.reset(); drawCase(); select.focus(); });
    drawCase();
  }

  function init(document) {
    addStyles(document);
    const nodes = document.querySelectorAll(".ix-permission");
    for (let index = 0; index < nodes.length; index += 1) renderWidget(document, nodes[index]);
    return nodes.length;
  }

  return Object.freeze({ RULES, CASES, SETS, evaluateCall, createSession, init });
});
