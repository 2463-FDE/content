"""Behavioral contracts for the Week 7 Day 4 synthetic practices."""

from __future__ import annotations

import json
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "weeks" / "w07" / "w07d4.html"
MODULE = ROOT / "assets" / "js" / "interactive-w7-trace.js"


class ContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.future_placeholders = 0
        self.trace_practices = 0
        self.cost_practices = 0
        self.module_scripts = 0
        self.inline_scripts: list[str] = []
        self._inline_script: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())
        if "ix-future" in classes:
            self.future_placeholders += 1
        if "data-w7-trace" in attributes:
            self.trace_practices += 1
        if "data-w7-cost" in attributes:
            self.cost_practices += 1
        if tag == "script":
            source = attributes.get("src") or ""
            if source.endswith("/interactive-w7-trace.js"):
                self.module_scripts += 1
            if not source:
                self._inline_script = []

    def handle_data(self, data: str) -> None:
        if self._inline_script is not None:
            self._inline_script.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._inline_script is not None:
            self.inline_scripts.append("".join(self._inline_script))
            self._inline_script = None


NODE_BEHAVIOR_PROBE = r"""
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(process.argv[1], 'utf8');
const accessed = [];
const listeners = {};

class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = { values: {}, setProperty: (key, value) => { this.style.values[key] = value; } };
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.name = '';
    this.type = '';
    this.min = '';
    this.max = '';
    this.step = '';
    this.inputMode = '';
    this.validationMessage = '';
  }
  appendChild(node) { this.children.push(node); return node; }
  insertBefore(node, reference) {
    const index = this.children.indexOf(reference);
    if (index < 0) this.children.push(node); else this.children.splice(index, 0, node);
    return node;
  }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return Object.prototype.hasOwnProperty.call(this.attributes, key) ? this.attributes[key] : null; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  focus() { this.focused = true; }
  setCustomValidity(message) { this.validationMessage = String(message); }
  checkValidity() {
    if (this.type !== 'number') return true;
    if (this.value === '' || !Number.isFinite(Number(this.value))) return false;
    return Number(this.value) >= Number(this.min) && Number(this.value) <= Number(this.max);
  }
}

function walk(node, predicate, found = []) {
  if (predicate(node)) found.push(node);
  (node.children || []).forEach(child => walk(child, predicate, found));
  return found;
}

const traceRoot = new FakeNode('div');
traceRoot.attributes['data-seed'] = 'intake-timeout-07';
const costRoot = new FakeNode('div');
const fakeDocument = {
  addEventListener(name, callback) { listeners[name] = callback; },
  querySelectorAll(selector) {
    if (selector === '[data-w7-trace]') return [traceRoot];
    if (selector === '[data-w7-cost]') return [costRoot];
    return [];
  },
  createElement(tag) { return new FakeNode(tag); },
  createTextNode(text) { const node = new FakeNode('#text'); node.textContent = String(text); return node; }
};

const sandbox = { module: { exports: {} }, exports: {}, document: fakeDocument };
['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB'].forEach(name => {
  Object.defineProperty(sandbox, name, {
    configurable: true,
    get() { accessed.push(name); throw new Error(name + ' must not be accessed'); }
  });
});
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'interactive-w7-trace.js' });
assert.strictEqual(typeof listeners.DOMContentLoaded, 'function');
listeners.DOMContentLoaded();

const api = sandbox.module.exports;
assert.strictEqual(api.TRACE_SEED, 'intake-timeout-07');
const rootSpan = api.TRACE_SPANS.find(span => span.id === 'agent');
const directCost = api.TRACE_SPANS
  .filter(span => span.parentId === 'agent')
  .reduce((sum, span) => sum + (span.estimatedCostUsd || 0), 0);
assert.strictEqual(rootSpan.estimatedCostUsd, undefined, 'root must not masquerade aggregate cost as span-local cost');
assert(Math.abs(rootSpan.aggregateDescendantCostUsd - directCost) < 1e-12, 'root aggregate cost must equal descendant model-span estimates');
let state = api.createTraceState();
assert.deepStrictEqual(Array.from(state.expanded), ['agent']);
state = api.toggleSpan(state, 'tool');
assert.deepStrictEqual(Array.from(state.expanded), ['agent', 'tool']);
state = api.toggleSpan(state, 'tool');
assert.deepStrictEqual(Array.from(state.expanded), ['agent']);
state = api.expandAllSpans(state);
assert.strictEqual(state.expanded.length, 6);
const resetState = api.createTraceState();
assert.deepStrictEqual(Array.from(resetState.expanded), ['agent']);
const finding = api.evaluateTraceAnswers({
  latency: 'tool', error: 'payer', cost: 'primary',
  observedError: '10-percent', burnRate: '100x', response: 'aggregate-gate'
});
assert.strictEqual(finding.score, 6);
assert.strictEqual(finding.total, 6);
const lowTraffic = api.deriveLowTrafficScenario(10, 1, 99.9);
assert(Math.abs(lowTraffic.observedErrorRate - 0.10) < 1e-12);
assert(Math.abs(lowTraffic.budgetErrorRate - 0.001) < 1e-12);
assert(Math.abs(lowTraffic.burnRate - 100) < 1e-9);
assert.strictEqual(lowTraffic.monthlyRequests, 7200);
assert(Math.abs(lowTraffic.monthlyErrorBudget - 7.2) < 1e-9);
assert(Math.abs(lowTraffic.budgetConsumed - (1 / 7.2)) < 1e-9);
assert.strictEqual(lowTraffic.allowedWholeFailures, 7);
assert(Math.abs(api.deriveLowTrafficScenario(10, 10, 99.9).burnRate - 1000) < 1e-9, '1,000x is reserved for total outage');
assert(api.TRACE_SPANS.every(span => !/(largest estimated cost|longest direct child)/i.test(span.note)), 'fixture notes must not reveal answers');

function classHas(node, className) { return String(node.className || '').split(/\s+/).includes(className); }
function nodeText(node) { return String(node.textContent || '') + (node.children || []).map(nodeText).join(''); }
let rows = walk(traceRoot, node => classHas(node, 'w7-span-row'));
assert.strictEqual(rows.length, 5, 'root expansion should reveal direct children only');
function findToggle(spanId) {
  return walk(traceRoot, node => node.tagName === 'button' && node.attributes['aria-controls'] === 'w7-span-detail-' + spanId)[0];
}
function detailLabels(spanId) {
  const detail = walk(traceRoot, node => node.id === 'w7-span-detail-' + spanId)[0];
  return walk(detail, node => classHas(node, 'w7-meta-pair')).map(nodeText);
}
assert.strictEqual(walk(traceRoot, node => node.attributes && ['tree', 'treeitem'].includes(node.attributes.role)).length, 0);
assert(rows.every(row => row.attributes['aria-expanded'] === undefined), 'rows must not carry disclosure state');
['plan', 'primary', 'tool', 'fallback'].forEach(spanId => {
  const label = findToggle(spanId).attributes['aria-label'];
  assert(/duration (?:\d+ milliseconds|\d+\.\d+ seconds)/.test(label), spanId + ' must expose audible duration evidence');
  assert(label.includes('child of invoke_agent intake_triage'), spanId + ' must expose its parent relation');
});
const toolToggle = findToggle('tool');
assert(toolToggle && toolToggle.listeners.click, 'tool span must expose a keyboard button');
assert.strictEqual(toolToggle.attributes['aria-expanded'], 'false');
assert(toolToggle.attributes['aria-label'].includes('starts at 700 milliseconds'));
assert(toolToggle.attributes['aria-label'].includes('duration 1.18 seconds'));
assert(toolToggle.attributes['aria-label'].includes('child of invoke_agent intake_triage'));
toolToggle.listeners.click();
rows = walk(traceRoot, node => classHas(node, 'w7-span-row'));
assert.strictEqual(rows.length, 6, 'expanding tool should reveal the seeded dependency child');
const rebuiltToolToggle = findToggle('tool');
assert.notStrictEqual(rebuiltToolToggle, toolToggle);
assert.strictEqual(rebuiltToolToggle.focused, true, 'focus must follow the toggled span after repaint');
assert.strictEqual(rebuiltToolToggle.attributes['aria-expanded'], 'true');
const payerToggle = findToggle('payer');
assert(payerToggle.attributes['aria-label'].includes('duration 1.05 seconds'));
assert(payerToggle.attributes['aria-label'].includes('child of execute_tool eligibility_lookup'));
const planSpan = api.TRACE_SPANS.find(span => span.id === 'plan');
assert.strictEqual(planSpan.kind, 'CLIENT');
assert.strictEqual(planSpan.name, planSpan.operation + ' ' + planSpan.model);

const expandButton = walk(traceRoot, node => node.textContent === 'Expand all spans')[0];
expandButton.listeners.click();
assert.deepStrictEqual(detailLabels('agent'), [
  'duration: 2.48 seconds', 'start offset: 0 milliseconds',
  'gen_ai.operation.name: invoke_agent', 'error.type: DownstreamTimeout',
  'aggregate descendant token cost: $0.02554'
]);
assert.deepStrictEqual(detailLabels('primary'), [
  'duration: 430 milliseconds', 'start offset: 245 milliseconds',
  'gen_ai.operation.name: chat', 'gen_ai.provider.name: anthropic',
  'gen_ai.request.model: claude-sonnet-5', 'gen_ai.usage.input_tokens: 7600',
  'gen_ai.usage.output_tokens: 46', 'span-local estimated token cost: $0.01566'
]);
assert.deepStrictEqual(detailLabels('payer'), [
  'duration: 1.05 seconds', 'start offset: 735 milliseconds',
  'http.request.method: GET', 'server.address: payer-sandbox.local',
  'error.type: TimeoutError'
]);
assert(!walk(traceRoot, node => classHas(node, 'w7-meta-pair')).some(node => /none|undefined|tokens: 0 input/i.test(nodeText(node))), 'details must omit inapplicable attributes');

const selects = Object.fromEntries(walk(traceRoot, node => node.tagName === 'select').map(node => [node.name, node]));
const correctAnswers = {
  latency: 'tool', error: 'payer', cost: 'primary',
  observedError: '10-percent', burnRate: '100x', response: 'aggregate-gate'
};
Object.entries(correctAnswers).forEach(([key, value]) => {
  selects[key].value = value;
  selects[key].listeners.change();
});
const checkButton = walk(traceRoot, node => node.textContent === 'Check all six findings')[0];
checkButton.listeners.click();
const scoreFeedback = walk(traceRoot, node => classHas(node, 'w7-feedback'))[0];
assert.strictEqual(scoreFeedback.textContent.startsWith('6/6.'), true);
const diagnostics = Object.fromEntries(walk(traceRoot, node => classHas(node, 'w7-guide-diagnostic')).map(node => [node.id.replace('w7-guide-diagnostic-', ''), node]));
assert(Object.values(diagnostics).every(node => node.textContent.startsWith('Correct —')));
const persistentScore = scoreFeedback.textContent;
findToggle('plan').listeners.click();
assert.strictEqual(scoreFeedback.textContent, persistentScore, 'span disclosures must not overwrite checked feedback');
selects.burnRate.value = '1000x';
selects.burnRate.listeners.change();
assert(!diagnostics.burnRate.textContent.startsWith('Correct —'), 'changed answer must not keep stale correct guidance');
assert(classHas(diagnostics.burnRate, 'is-stale'));
assert(diagnostics.observedError.textContent.startsWith('Correct —'), 'unchanged answers keep persistent guidance');
checkButton.listeners.click();
assert(!classHas(diagnostics.burnRate, 'is-stale'));
assert(scoreFeedback.textContent.startsWith('5/6.'));
assert(diagnostics.burnRate.textContent.startsWith('Review —'));
assert(diagnostics.observedError.textContent.startsWith('Correct —'));

const resetButton = walk(traceRoot, node => node.textContent === 'Reset incident seed')[0];
resetButton.listeners.click();
rows = walk(traceRoot, node => classHas(node, 'w7-span-row'));
assert.strictEqual(rows.length, 5, 'reset should restore the deterministic collapsed state');
assert(Object.values(selects).every(node => node.value === ''), 'reset must clear all six answers');
assert(Object.values(diagnostics).every(node => node.textContent === ''), 'reset must clear per-question feedback');
assert(scoreFeedback.textContent.includes('derive the low-traffic rate'));
checkButton.listeners.click();
assert(scoreFeedback.textContent.startsWith('0/6.'), 'all-unanswered run must remain honest');
assert(Object.values(diagnostics).every(node => node.textContent.startsWith('Review —')));

const fixture = api.calculateCost({ model: 'claude-haiku-4-5', inputTokens: 1000, outputTokens: 200, requestsPerDay: 500, dailyBudgetUsd: 2 });
assert.strictEqual(fixture.valid, true);
assert(Math.abs(fixture.perRequest - 0.002) < 1e-12);
assert(Math.abs(fixture.daily - 1) < 1e-12);
assert(Math.abs(fixture.monthly - 30) < 1e-12);
assert(Math.abs(fixture.burnRate - 0.5) < 1e-12);

const boundary = api.calculateCost({ model: 'claude-sonnet-5', inputTokens: 200000, outputTokens: 64000, requestsPerDay: 100000, dailyBudgetUsd: 100000 });
assert.strictEqual(boundary.valid, true);
assert(Math.abs(boundary.perRequest - 1.04) < 1e-12);
const zeroTokens = api.calculateCost({ model: 'claude-haiku-4-5', inputTokens: 0, outputTokens: 0, requestsPerDay: 1, dailyBudgetUsd: 0.01 });
assert.strictEqual(zeroTokens.valid, true);
assert.strictEqual(zeroTokens.daily, 0);
[
  { model: 'claude-haiku-4-5', inputTokens: '', outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: -1, outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 64001, requestsPerDay: 1, dailyBudgetUsd: 1 },
  { model: 'unknown', inputTokens: 1, outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 1, requestsPerDay: 0, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 0 },
  { model: 'claude-haiku-4-5', inputTokens: 1.5, outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 1.5, requestsPerDay: 1, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 1, requestsPerDay: 1.5, dailyBudgetUsd: 1 },
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 1.001 }
].forEach(input => assert.strictEqual(api.calculateCost(input).valid, false));
const belowBudget = api.calculateCost({ model: 'claude-haiku-4-5', inputTokens: 1000, outputTokens: 0, requestsPerDay: 999, dailyBudgetUsd: 1 });
const atBudget = api.calculateCost({ model: 'claude-haiku-4-5', inputTokens: 1000, outputTokens: 0, requestsPerDay: 1000, dailyBudgetUsd: 1 });
const overBudget = api.calculateCost({ model: 'claude-haiku-4-5', inputTokens: 1000, outputTokens: 0, requestsPerDay: 1001, dailyBudgetUsd: 1 });
assert.strictEqual(belowBudget.budgetState, 'within');
assert(Math.abs(belowBudget.burnRate - 0.999) < 1e-12);
assert.strictEqual(atBudget.budgetState, 'at');
assert.strictEqual(atBudget.burnRate, 1);
assert.strictEqual(overBudget.budgetState, 'over');
assert(Math.abs(overBudget.burnRate - 1.001) < 1e-12);

const renderedOutputs = walk(costRoot, node => node.tagName === 'output');
assert.deepStrictEqual(renderedOutputs.map(node => node.textContent), ['$0.002000', '$1.00', '$30.00', '0.50×']);
const inputField = walk(costRoot, node => node.name === 'inputTokens')[0];
const requestsField = walk(costRoot, node => node.name === 'requestsPerDay')[0];
assert.strictEqual(inputField.step, '1');
assert.strictEqual(inputField.inputMode, 'numeric');
assert.strictEqual(requestsField.step, '1');
assert.strictEqual(requestsField.inputMode, 'numeric');
inputField.value = '-1';
inputField.listeners.input();
assert.strictEqual(inputField.attributes['aria-invalid'], 'true');
assert(inputField.validationMessage.includes('between'));
assert.strictEqual(requestsField.attributes['aria-invalid'], undefined, 'only the failing field is marked invalid');
assert(renderedOutputs.every(node => node.textContent === 'Not calculated'));
inputField.value = '1.5';
inputField.listeners.input();
assert.strictEqual(inputField.attributes['aria-invalid'], 'true');
assert(inputField.validationMessage.includes('whole number'));
inputField.value = '150';
inputField.listeners.input();
assert.strictEqual(inputField.attributes['aria-invalid'], undefined, 'a value the calculator accepts must not be marked invalid');
assert.strictEqual(inputField.validationMessage, '');
assert.strictEqual(renderedOutputs[0].textContent, '$0.001150');
const outputField = walk(costRoot, node => node.name === 'outputTokens')[0];
const budgetField = walk(costRoot, node => node.name === 'dailyBudgetUsd')[0];
assert.strictEqual(outputField.step, '1');
assert.strictEqual(outputField.inputMode, 'numeric');
assert.strictEqual(budgetField.step, '0.01');
assert.strictEqual(budgetField.inputMode, 'decimal');
const costStatus = walk(costRoot, node => classHas(node, 'w7-feedback'))[0];
inputField.value = '1000';
outputField.value = '0';
budgetField.value = '1';
requestsField.value = '1001';
requestsField.listeners.input();
assert.strictEqual(renderedOutputs[3].textContent, '1.001×', 'near-threshold over-budget burn must not round to 1.00×');
assert(costStatus.textContent.includes('0.10% over'));
requestsField.value = '999';
requestsField.listeners.input();
assert.strictEqual(renderedOutputs[3].textContent, '0.999×');
assert(costStatus.textContent.includes('0.10% under'));
requestsField.value = '1000';
requestsField.listeners.input();
assert.strictEqual(renderedOutputs[3].textContent, '1.00×');
assert(costStatus.textContent.includes('exactly the daily cost budget'));
budgetField.value = '1.001';
budgetField.listeners.input();
assert.strictEqual(budgetField.attributes['aria-invalid'], 'true');
assert(budgetField.validationMessage.includes('increments of 0.01'));
assert.deepStrictEqual(Object.keys(api.calculateCost({ model: 'x', inputTokens: 1, outputTokens: -1, requestsPerDay: 1, dailyBudgetUsd: 1 }).fieldErrors).sort(), ['model', 'outputTokens']);
assert.deepStrictEqual(
  Object.keys(api.calculateCost({ model: 'claude-haiku-4-5', inputTokens: 1.5, outputTokens: 2.5, requestsPerDay: 3.5, dailyBudgetUsd: 1.001 }).fieldErrors).sort(),
  ['dailyBudgetUsd', 'inputTokens', 'outputTokens', 'requestsPerDay']
);
assert.deepStrictEqual(accessed, [], 'practice must not touch network or browser storage APIs');

process.stdout.write(JSON.stringify({
  defaultRows: 5,
  expandedRows: 6,
  fixture: { perRequest: fixture.perRequest, daily: fixture.daily, monthly: fixture.monthly, burnRate: fixture.burnRate },
  accessed
}));
"""


class WeekSevenDayFourInteractiveTests(unittest.TestCase):
    def test_two_placeholders_become_real_practices(self) -> None:
        parser = ContractParser()
        parser.feed(PAGE.read_text(encoding="utf-8"))
        parser.close()
        self.assertEqual(1, parser.future_placeholders)
        self.assertEqual(1, parser.trace_practices)
        self.assertEqual(1, parser.cost_practices)
        self.assertEqual(1, parser.module_scripts)

    def test_module_parses_and_embedded_page_javascript_executes(self) -> None:
        subprocess.run(["node", "--check", str(MODULE)], check=True, capture_output=True, text=True)
        parser = ContractParser()
        parser.feed(PAGE.read_text(encoding="utf-8"))
        parser.close()
        probe = """
const vm = require('vm');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => source += chunk);
process.stdin.on('end', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'w07d4-inline.js' });
  const lowTrafficNode = sandbox.window.DIAGRAM.nodes.find(node => node.id === 'lowq');
  const lowTrafficQuestion = sandbox.window.QUIZ.questions[3];
  process.stdout.write(JSON.stringify({
    captions: sandbox.window.DIAGRAM.captions.length,
    questions: sandbox.window.QUIZ.questions.length,
    lowTrafficNode,
    lowTrafficCaption: sandbox.window.DIAGRAM.captions[6],
    lowTrafficQuestion
  }));
});
"""
        result = subprocess.run(
            ["node", "-e", probe],
            input="\n".join(parser.inline_scripts),
            check=True,
            capture_output=True,
            text=True,
        )
        contract = json.loads(result.stdout)
        self.assertEqual(9, contract["captions"])
        self.assertEqual(6, contract["questions"])
        self.assertIn("1 failure = 100×", contract["lowTrafficNode"]["label"])
        self.assertIn("that is 100× burn", contract["lowTrafficNode"]["detail"])
        self.assertIn("100× burn", contract["lowTrafficCaption"])
        self.assertEqual([0, 1, 3], contract["lowTrafficQuestion"]["answer"])
        self.assertIn("100× burn rate", contract["lowTrafficQuestion"]["options"][0])
        self.assertIn("10% hourly error rate", contract["lowTrafficQuestion"]["explain"])
        self.assertIn("7.2-failure budget", contract["lowTrafficQuestion"]["explain"])

    def test_seeded_trace_calculator_boundaries_and_offline_runtime(self) -> None:
        result = subprocess.run(
            ["node", "-e", NODE_BEHAVIOR_PROBE, str(MODULE)],
            check=True,
            capture_output=True,
            text=True,
        )
        evidence = json.loads(result.stdout)
        self.assertEqual(5, evidence["defaultRows"])
        self.assertEqual(6, evidence["expandedRows"])
        self.assertEqual(
            {"perRequest": 0.002, "daily": 1, "monthly": 30, "burnRate": 0.5},
            evidence["fixture"],
        )
        self.assertEqual([], evidence["accessed"])


if __name__ == "__main__":
    unittest.main()
