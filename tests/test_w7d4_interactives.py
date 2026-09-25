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
const directCost = api.TRACE_SPANS.filter(span => span.parentId === 'agent').reduce((sum, span) => sum + span.estimatedCostUsd, 0);
assert(Math.abs(rootSpan.estimatedCostUsd - directCost) < 1e-12, 'root cost must equal its direct synthetic contributors');
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
const finding = api.evaluateTraceAnswers({ latency: 'tool', error: 'payer', cost: 'primary' });
assert.strictEqual(finding.score, 3);

function classHas(node, className) { return String(node.className || '').split(/\s+/).includes(className); }
let rows = walk(traceRoot, node => classHas(node, 'w7-span-row'));
assert.strictEqual(rows.length, 5, 'root expansion should reveal direct children only');
const toolToggle = walk(traceRoot, node => node.attributes && node.attributes['aria-label'] === 'Expand execute_tool eligibility_lookup')[0];
assert(toolToggle && toolToggle.listeners.click, 'tool span must expose a keyboard button');
toolToggle.listeners.click();
rows = walk(traceRoot, node => classHas(node, 'w7-span-row'));
assert.strictEqual(rows.length, 6, 'expanding tool should reveal the seeded dependency child');
const resetButton = walk(traceRoot, node => node.textContent === 'Reset incident seed')[0];
resetButton.listeners.click();
rows = walk(traceRoot, node => classHas(node, 'w7-span-row'));
assert.strictEqual(rows.length, 5, 'reset should restore the deterministic collapsed state');

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
  { model: 'claude-haiku-4-5', inputTokens: 1, outputTokens: 1, requestsPerDay: 1, dailyBudgetUsd: 0 }
].forEach(input => assert.strictEqual(api.calculateCost(input).valid, false));

const renderedOutputs = walk(costRoot, node => node.tagName === 'output');
assert.deepStrictEqual(renderedOutputs.map(node => node.textContent), ['$0.002000', '$1.00', '$30.00', '0.50×']);
const inputField = walk(costRoot, node => node.name === 'inputTokens')[0];
inputField.value = '-1';
inputField.listeners.input();
assert.strictEqual(inputField.attributes['aria-invalid'], 'true');
assert(renderedOutputs.every(node => node.textContent === 'Not calculated'));
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
  process.stdout.write(JSON.stringify({
    captions: sandbox.window.DIAGRAM.captions.length,
    questions: sandbox.window.QUIZ.questions.length
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
