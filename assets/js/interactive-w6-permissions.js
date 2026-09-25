/* Week 6 permission-rule practice. Deterministic, synthetic, and fully local. */
(function (root, factory) {
  "use strict";
  const implementation = factory();
  if (typeof module === "object" && module.exports) module.exports = implementation.testing;
  root.Week6Permissions = implementation.browser;
  if (root.document) {
    const start = () => implementation.browser.init(root.document);
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
    else start();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RULES = [
    { id: "S-01", effect: "deny", tool: "*", target: "credential-shaped argument", description: "Deny explicitly named credential fields or tightly defined secret-bearing values." },
    { id: "F-01", effect: "deny", tool: "file.read", target: "restricted/**", description: "Deny canonical reads below the synthetic restricted/ boundary." },
    { id: "F-02", effect: "allow", tool: "file.read", target: "docs/**", description: "Allow canonical reads below docs/ for planning and review." },
    { id: "F-03", effect: "allow", tool: "file.read", target: "src/**", description: "Allow canonical reads below the synthetic application source tree." },
    { id: "T-01", effect: "allow", tool: "test.run", target: "unit:*", description: "Allow unit suites only." },
    { id: "T-02", effect: "deny", tool: "test.run", target: "*", description: "Deny every other test suite. The specific unit allowance above takes precedence." },
    { id: "H-01", effect: "allow", tool: "http.fetch", target: "docs.example.test", description: "Allow the one synthetic documentation host." },
    { id: "D-01", effect: "deny", tool: "*", target: "*", description: "Deny anything not explicitly allowed (default deny)." }
  ];

  const CASES = [
    { id: "docs-guide", title: "Read a guide file", call: { tool: "file.read", args: { path: "docs/migration-guide.md" } }, debrief: "A specific documentation subtree is allowed by F-02." },
    { id: "source-read", title: "Read a router file", call: { tool: "file.read", args: { path: "src/billing/router.py" } }, debrief: "F-03 grants only the bounded src/ subtree, not arbitrary reads." },
    { id: "restricted-read", title: "Read a map file", call: { tool: "file.read", args: { path: "restricted/customer-map.json" } }, debrief: "F-01 denies the restricted/ subtree before any later rule can decide." },
    { id: "sensitive-arg", title: "Read a setup file with extra arguments", call: { tool: "file.read", args: { path: "docs/setup.md", api_token: "synthetic-demo-value" } }, debrief: "S-01 wins because api_token is an explicitly credential-shaped field." },
    { id: "unit-tests", title: "Run a permissions test suite", call: { tool: "test.run", args: { suite: "unit:permissions" } }, debrief: "The specific unit:* allowance T-01 precedes the broader test deny." },
    { id: "deployment-tests", title: "Run a staging test suite", call: { tool: "test.run", args: { suite: "deployment:staging" } }, debrief: "T-02 denies non-unit test suites." },
    { id: "public-fetch", title: "Fetch a policy page", call: { tool: "http.fetch", args: { host: "docs.example.test", path: "/agent-policy" } }, debrief: "H-01 allows one exact synthetic host." },
    { id: "unknown-fetch", title: "Fetch a latest-updates page", call: { tool: "http.fetch", args: { host: "updates.example.test", path: "/latest" } }, debrief: "No host allowance matches, so D-01 defaults to deny." },
    { id: "shell-command", title: "Run a print command", call: { tool: "shell.execute", args: { command: "printf synthetic" } }, debrief: "The unlisted tool reaches D-01 and is denied by default." },
    { id: "outside-source", title: "Read an example script", call: { tool: "file.read", args: { path: "vendor/example.js" } }, debrief: "File access is subtree-scoped; an unlisted tree reaches D-01." },
    { id: "case-variant", title: "Read another guide file", call: { tool: "file.read", args: { path: "Docs/migration-guide.md" } }, debrief: "This teaching grammar is case-sensitive, so Docs/ does not match docs/**." }
  ];

  const SETS = {
    all: CASES.map((item) => item.id),
    legacy: ["docs-guide", "restricted-read", "source-read", "case-variant"],
    delivery: ["unit-tests", "deployment-tests", "public-fetch", "unknown-fetch"]
  };

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isPlainRecord = (value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };

  function readBounded(value, path, depth, seen) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return { ok: true, value };
    if (typeof value === "number" && Number.isFinite(value)) return { ok: true, value };
    if (typeof value !== "object") return { ok: false, error: `${path} contains an unsupported value.` };
    if (depth > 5) return { ok: false, error: `${path} exceeds the maximum nesting depth.` };
    if (seen.has(value)) return { ok: false, error: `${path} contains a cycle.` };
    seen.add(value);
    const output = Array.isArray(value) ? [] : Object.create(null);
    if (!Array.isArray(value) && !isPlainRecord(value)) return { ok: false, error: `${path} must be plain data.` };
    const keys = Object.keys(value);
    if (keys.length > 32) return { ok: false, error: `${path} contains too many fields.` };
    for (const key of keys) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") return { ok: false, error: `${path} contains an unsafe field name.` };
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !hasOwn(descriptor, "value")) return { ok: false, error: `${path}.${key} must be a data field.` };
      const child = readBounded(descriptor.value, `${path}.${key}`, depth + 1, seen);
      if (!child.ok) return child;
      output[key] = child.value;
    }
    seen.delete(value);
    return { ok: true, value: output };
  }

  function parseCall(input) {
    if (!isPlainRecord(input)) return { ok: false, error: "A proposed call must be a plain data object." };
    for (const key of ["tool", "args"]) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !hasOwn(descriptor, "value")) return { ok: false, error: "A proposed call needs own tool and args data fields." };
    }
    const tool = Object.getOwnPropertyDescriptor(input, "tool").value;
    const args = Object.getOwnPropertyDescriptor(input, "args").value;
    if (typeof tool !== "string" || !tool || tool !== tool.trim() || tool.length > 64 || !isPlainRecord(args)) {
      return { ok: false, error: "A proposed call needs a bounded tool name and a plain arguments object." };
    }
    const cloned = readBounded(args, "args", 0, new WeakSet());
    return cloned.ok ? { ok: true, call: { tool, args: cloned.value } } : cloned;
  }

  function validateRelativePath(path) {
    if (typeof path !== "string" || !path || path.length > 240) return "File paths must be non-empty bounded strings.";
    if (path !== path.trim()) return "File paths may not have leading or trailing whitespace.";
    if (path.startsWith("/") || path.includes("\\")) return "File paths must use POSIX-relative syntax with no backslashes.";
    if (path.includes("\0")) return "File paths may not contain NUL characters.";
    const segments = path.split("/");
    if (segments.some((segment) => segment === "")) return "File paths may not contain empty segments or repeated separators.";
    if (segments.some((segment) => segment === "." || segment === "..")) return "File paths may not contain dot or traversal segments.";
    return "";
  }

  function findSensitiveArgument(value) {
    const credentialNames = new Set(["api_key", "api_token", "password", "credential", "private_key", "secret"]);
    const seen = new WeakSet();
    function visit(current, path, depth) {
      if (depth > 5 || current === null || typeof current !== "object") return null;
      if (seen.has(current)) return null;
      seen.add(current);
      for (const key of Object.keys(current)) {
        const fieldPath = Array.isArray(current) ? `${path}[${key}]` : `${path}.${key}`;
        const normalizedName = key.trim().replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[-\s]+/g, "_");
        if (credentialNames.has(normalizedName)) return { field: fieldPath, kind: "credential-shaped field name" };
        const child = current[key];
        if (typeof child === "string") {
          const trimmed = child.trim();
          if (/(?:^|\/)\.env(?:$|\.[^/]*)/i.test(trimmed)) return { field: fieldPath, kind: ".env path/value form" };
          if (/^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----$/.test(trimmed.split(/\r?\n/, 1)[0])) return { field: fieldPath, kind: "private-key header" };
          if (/^Bearer\s+[A-Za-z0-9._~-]{8,}$/i.test(trimmed)) return { field: fieldPath, kind: "bearer credential form" };
        }
        const nested = visit(child, fieldPath, depth + 1);
        if (nested) return nested;
      }
      return null;
    }
    return visit(value, "args", 0);
  }

  function wildcardMatch(pattern, value) {
    if (typeof pattern !== "string" || typeof value !== "string") return false;
    if (pattern === "*") return true;
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
      const finding = findSensitiveArgument(call.args);
      return {
        matched: Boolean(finding),
        reason: finding ? `${finding.kind} matched at ${finding.field}.` : "No bounded credential marker matched."
      };
    }
    const toolMatches = rule.tool === "*" || rule.tool === call.tool;
    const target = targetFor(call);
    const targetMatches = rule.target === "*" || wildcardMatch(rule.target, target);
    const matched = toolMatches && targetMatches;
    return {
      matched,
      reason: matched
        ? `Tool “${call.tool}” and target “${target || "(none)"}” match.`
        : `Does not match tool “${call.tool}” and target “${target || "(none)"}”.`
    };
  }

  function evaluateCall(input) {
    try {
      return evaluateParsed(input);
    } catch {
      return { ok: false, verdict: "deny", error: "The proposed call could not be read safely; default deny." };
    }
  }

  function evaluateParsed(input) {
    const parsed = parseCall(input);
    if (!parsed.ok) return { ok: false, verdict: "deny", error: parsed.error };
    const call = parsed.call;
    if (call.tool === "file.read") {
      const pathError = validateRelativePath(call.args.path);
      if (pathError) return { ok: false, verdict: "deny", error: `${pathError} Malformed calls default to deny.` };
    }
    const trace = RULES.map((rule) => Object.assign({ id: rule.id, effect: rule.effect }, evaluateRule(rule, call)));
    const decidingIndex = trace.findIndex((entry) => entry.matched);
    if (decidingIndex < 0) return { ok: false, verdict: "deny", error: "No deciding rule; default deny." };
    trace.forEach((entry, index) => {
      entry.decision = index === decidingIndex;
      entry.precedence = index > decidingIndex && entry.matched ? "matched later; earlier rule wins" : "";
    });
    const decidingRule = RULES[decidingIndex];
    return { ok: true, verdict: decidingRule.effect, decidingRule: decidingRule.id, trace };
  }

  function caseById(id) {
    return CASES.find((item) => item.id === id);
  }

  function cloneCase(item) {
    return { id: item.id, title: item.title, call: JSON.parse(JSON.stringify(item.call)), debrief: item.debrief };
  }

  function createSession(caseIds) {
    const ids = Array.isArray(caseIds) && caseIds.length ? caseIds.slice() : SETS.all.slice();
    if (ids.some((id) => typeof id !== "string" || !caseById(id))) throw new Error("Unknown permission-practice case.");
    let index = 0;
    let prediction = null;
    let checked = false;
    return {
      current: () => cloneCase(caseById(ids[index])),
      state: () => ({ index, prediction, checked, total: ids.length }),
      predict(value) {
        if (value !== "allow" && value !== "deny") throw new Error("Prediction must be allow or deny.");
        prediction = value;
        checked = false;
      },
      check() {
        if (!prediction) return { ok: false, error: "Choose allow or deny before checking." };
        const result = evaluateCall(caseById(ids[index]).call);
        checked = true;
        return Object.assign({}, result, { correct: result.verdict === prediction, prediction, debrief: caseById(ids[index]).debrief });
      },
      next() { index = (index + 1) % ids.length; prediction = null; checked = false; return this.current(); },
      retry() { prediction = null; checked = false; },
      reset() { index = 0; prediction = null; checked = false; return this.current(); }
    };
  }

  function el(document, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function append(parent) {
    for (let index = 1; index < arguments.length; index += 1) parent.appendChild(arguments[index]);
    return parent;
  }

  function addStyles(document) {
    if (document.getElementById("w6-permission-styles")) return;
    const style = el(document, "style");
    style.id = "w6-permission-styles";
    style.textContent = ".ix-permission{margin:18px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.perm-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.perm-rules,.perm-practice{min-width:0}.perm-rule{display:grid;grid-template-columns:3.3rem 3.2rem 1fr;gap:7px;padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px;line-height:1.4}.perm-rule:last-child{border-bottom:0}.perm-rule-id{font-family:var(--mono);font-weight:700}.perm-effect{text-transform:uppercase;font-weight:700}.perm-effect.deny{color:var(--bad)}.perm-effect.allow{color:var(--good-ink)}.perm-case-select{width:100%;box-sizing:border-box;font:inherit;color:var(--ink);background:var(--surface);border:1.5px solid var(--line);border-radius:8px;padding:8px}.perm-call{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;background:var(--code-bg);border-radius:8px;padding:10px;font:12.5px/1.5 var(--mono)}.perm-predict{margin:0;padding:8px 0;border:0}.perm-predict legend{font-weight:700;margin-bottom:5px}.perm-predict label{display:inline-flex;align-items:center;gap:6px;margin:0 18px 5px 0}.perm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:5px}.perm-actions button{font:inherit}.perm-check{cursor:pointer;border:1px solid #481900;background:#7a2e00;color:#fff;font-weight:700;padding:10px 16px;border-radius:9px}.perm-check:hover{background:#5d2200}.perm-secondary{cursor:pointer;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-weight:600;padding:9px 13px;border-radius:9px}.perm-feedback{margin-top:12px;padding:11px;border:1px solid var(--line);border-radius:9px;background:var(--surface)}.perm-feedback:empty{display:none}.perm-verdict{font-weight:800;margin-top:12px}.perm-verdict:empty{display:none}.perm-trace{margin:7px 0 0;padding-left:20px;font-size:13px}.perm-trace li{margin:5px 0}.perm-trace .deciding{font-weight:700;color:var(--accent-ink)}.perm-progress{font-size:12px;color:var(--ink-soft);margin:7px 0}.perm-note,.perm-boundary{font-size:12.5px;color:var(--ink-soft);margin:10px 0 0}.perm-boundary{padding-top:9px;border-top:1px solid var(--line)}@media(max-width:560px){.perm-layout{grid-template-columns:1fr}.ix-permission{padding:12px}.perm-rule{grid-template-columns:3rem 3rem 1fr}.perm-actions>*{flex:1 1 8rem}}";
    (document.head || document.documentElement).appendChild(style);
  }

  function renderWidget(document, rootNode) {
    const requestedSet = rootNode.getAttribute("data-case-set") || "all";
    const caseIds = hasOwn(SETS, requestedSet) ? SETS[requestedSet].slice() : SETS.all.slice();
    const session = createSession(caseIds);
    rootNode.textContent = "";

    const heading = el(document, "div", "ix-k", "▶ Try it · permission-rule evaluator");
    const layout = el(document, "div", "perm-layout");
    const rulesPanel = el(document, "section", "perm-rules");
    const rulesTitle = el(document, "h3", "", "Displayed teaching policy — first matching rule wins");
    rulesPanel.setAttribute("aria-labelledby", `${rootNode.id}-rules-title`);
    rulesTitle.id = `${rootNode.id}-rules-title`;
    const ruleList = el(document, "div", "perm-rule-list");
    RULES.forEach((rule) => {
      const row = el(document, "div", "perm-rule");
      append(row, el(document, "span", "perm-rule-id", rule.id), el(document, "span", `perm-effect ${rule.effect}`, rule.effect), el(document, "span", "", `${rule.tool} · ${rule.target} — ${rule.description}`));
      ruleList.appendChild(row);
    });
    append(rulesPanel, rulesTitle, ruleList,
      el(document, "p", "perm-note", "Grammar: case-sensitive, pre-normalized POSIX-relative paths only. Malformed proposals default to deny."),
      el(document, "p", "perm-note", "Every call is synthetic. This string evaluator teaches policy reasoning; it is not a filesystem sandbox and never runs a tool."));

    const practice = el(document, "section", "perm-practice");
    const caseLabel = el(document, "label", "", "Proposed tool-call case");
    const select = el(document, "select", "perm-case-select");
    select.id = `${rootNode.id}-case`;
    caseLabel.setAttribute("for", select.id);
    caseIds.forEach((id, index) => { const option = el(document, "option", "", caseById(id).title); option.value = `case-${index + 1}`; select.appendChild(option); });
    const progress = el(document, "div", "perm-progress");
    const call = el(document, "pre", "perm-call");
    const fieldset = el(document, "fieldset", "perm-predict");
    const legend = el(document, "legend", "", "Your prediction");
    const radioName = `${rootNode.id}-prediction`;
    function radio(value, labelText) {
      const label = el(document, "label");
      const input = el(document, "input");
      input.type = "radio"; input.name = radioName; input.value = value;
      label.appendChild(input); label.appendChild(document.createTextNode(labelText));
      return { label, input };
    }
    const allow = radio("allow", "Allow");
    const deny = radio("deny", "Deny");
    append(fieldset, legend, allow.label, deny.label);
    const actions = el(document, "div", "perm-actions");
    const check = el(document, "button", "perm-check", "Check prediction"); check.type = "button";
    const retry = el(document, "button", "perm-secondary", "Retry case"); retry.type = "button";
    const next = el(document, "button", "perm-secondary", "Next case"); next.type = "button";
    const reset = el(document, "button", "perm-secondary", "Reset drill"); reset.type = "button";
    append(actions, check, retry, next, reset);
    const status = el(document, "div", "perm-verdict");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); status.setAttribute("aria-atomic", "true");
    const feedback = el(document, "div", "perm-feedback");
    const boundary = el(document, "p", "perm-boundary", "Model boundary: this drill uses one explicit first-match, case-sensitive, pre-normalized grammar. Real permission engines vary: precedence may use deny overrides, specificity, layered scopes, canonicalized paths, and product-specific syntax. Verify the actual engine before relying on a policy.");
    append(practice, caseLabel, select, progress, call, fieldset, actions, status, feedback, boundary);
    append(layout, rulesPanel, practice); append(rootNode, heading, layout);

    function clearEvaluation(message) { status.textContent = message || ""; feedback.textContent = ""; }
    function clearPrediction() { allow.input.checked = false; deny.input.checked = false; clearEvaluation(""); }
    function drawCase() {
      const item = session.current();
      select.value = `case-${session.state().index + 1}`;
      progress.textContent = `Case ${session.state().index + 1} of ${session.state().total} · Which rule decides?`;
      call.textContent = `${item.call.tool}(${JSON.stringify(item.call.args, null, 2)})`;
      clearPrediction();
    }
    function chooseCase(token) {
      const index = Number(String(token).replace(/^case-/, "")) - 1;
      session.reset();
      for (let step = 0; step < index && step < caseIds.length; step += 1) session.next();
      drawCase();
    }
    function changePrediction(value) {
      const wasChecked = session.state().checked;
      session.predict(value);
      clearEvaluation(wasChecked ? "Prediction changed—check again." : "");
    }

    select.addEventListener("change", () => chooseCase(select.value));
    allow.input.addEventListener("change", () => changePrediction("allow"));
    deny.input.addEventListener("change", () => changePrediction("deny"));
    check.addEventListener("click", () => {
      const result = session.check();
      feedback.textContent = "";
      if (!result.ok) { status.textContent = result.error; return; }
      status.textContent = `${result.correct ? "Correct" : "Not yet"}: ${result.verdict.toUpperCase()} — deciding rule ${result.decidingRule}.`;
      const traceTitle = el(document, "div", "", "Rule-by-rule evaluation:");
      const trace = el(document, "ol", "perm-trace");
      result.trace.forEach((entry) => {
        const item = el(document, "li", entry.decision ? "deciding" : "");
        let text = `${entry.id}: ${entry.matched ? "matched" : "skipped"}. ${entry.reason}`;
        if (entry.decision) text += ` Exact deciding rule → ${entry.effect.toUpperCase()}.`;
        else if (entry.precedence) text += ` ${entry.precedence}.`;
        item.textContent = text; trace.appendChild(item);
      });
      append(feedback, traceTitle, trace, el(document, "p", "perm-note", `Learning focus: ${result.debrief}`));
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

  function snapshot(value) {
    const clone = JSON.parse(JSON.stringify(value));
    function freeze(item) { if (item && typeof item === "object") { Object.values(item).forEach(freeze); Object.freeze(item); } return item; }
    return freeze(clone);
  }

  return {
    browser: Object.freeze({ init }),
    testing: Object.freeze({ evaluateCall, createSession, init, fixtures: () => snapshot(CASES), rules: () => snapshot(RULES), sets: () => snapshot(SETS) })
  };
});
