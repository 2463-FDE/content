"""Behavior and public-markup contracts for the Week 8 trifecta auditor."""

from __future__ import annotations

import json
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "weeks" / "w08" / "w08d2.html"
MODULE = ROOT / "assets" / "js" / "interactive-security.js"
FIXTURE = ROOT / "tests" / "fixtures" / "w8_trifecta_scenarios.json"
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Element:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = dict(attrs)
        self.children: list[Element | str] = []

    def find_all(self, tag: str | None = None, attr: str | None = None) -> list[Element]:
        found: list[Element] = []
        if (tag is None or self.tag == tag) and (attr is None or attr in self.attrs):
            found.append(self)
        for child in self.children:
            if isinstance(child, Element):
                found.extend(child.find_all(tag, attr))
        return found

    def classes(self) -> set[str]:
        return set((self.attrs.get("class") or "").split())


class StrictHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document", [])
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return
        raise AssertionError(f"unmatched closing tag: {tag}")

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


def parse_page() -> Element:
    parser = StrictHTMLParser()
    parser.feed(PAGE.read_text(encoding="utf-8"))
    parser.close()
    if len(parser.stack) != 1:
        raise AssertionError(f"unclosed tags: {[node.tag for node in parser.stack[1:]]}")
    return parser.root


IO_TRAP_PRELUDE = r"""
const fs = require('fs');
const vm = require('vm');
const FORBIDDEN_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Image', 'navigator',
  'open', 'location', 'window', 'parent', 'top', 'opener', 'Worker', 'SharedWorker', 'BroadcastChannel',
  'RTCPeerConnection', 'postMessage', 'importScripts', 'localStorage', 'sessionStorage', 'indexedDB',
  'caches', 'cookieStore', 'credentials', 'PasswordCredential', 'FederatedCredential'];
function loadModule(source, documentStub) {
  const violations = [];
  function trap(target, name, label) {
    const reported = label || name;
    Object.defineProperty(target, name, {
      configurable: false,
      get() { violations.push(reported); throw new Error('forbidden I/O access: ' + reported); },
      set() { violations.push(reported); throw new Error('forbidden I/O access: ' + reported); }
    });
  }
  let ready = null;
  documentStub.addEventListener = function (type, callback) { if (type === 'DOMContentLoaded') ready = callback; };
  for (const name of ['cookie', 'domain', 'referrer', 'location', 'defaultView', 'createElement', 'write', 'writeln']) {
    trap(documentStub, name, 'document.' + name);
  }
  const sandbox = { module: { exports: {} }, document: documentStub };
  for (const name of FORBIDDEN_GLOBALS) trap(sandbox, name);
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'interactive-security.js' });
  return { sandbox, ready, violations };
}
"""


def node_json(script: str, *args: str) -> dict:
    completed = subprocess.run(
        ["node", "-e", IO_TRAP_PRELUDE + script, *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def serialize(node: Element | str) -> dict | str:
    if isinstance(node, str):
        return node
    return {"tag": node.tag, "attrs": node.attrs, "children": [serialize(child) for child in node.children]}


def run_node_probe() -> dict:
    probe = r"""
const source = fs.readFileSync(process.argv[1], 'utf8');
const fixtures = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const documentStub = { querySelectorAll() { return []; } };
const { sandbox, ready, violations } = loadModule(source, documentStub);
ready();
const api = sandbox.module.exports;
const actual = api.SCENARIOS.map(s => {
  const answer = { privateData: s.privateData, untrustedContent: s.untrustedContent, externalEgress: s.externalEgress };
  const exact = api.evaluate(s, answer);
  const wrong = api.evaluate(s, { ...answer, privateData: !answer.privateData });
  return { id: s.id, privateData: s.privateData, untrustedContent: s.untrustedContent,
    externalEgress: s.externalEgress, verdict: exact.verdict, exact: exact.correct,
    rejectsWrong: !wrong.correct, explained: exact.components.every(c => Boolean(c.explanation)) };
});
const session = api.createSession();
session.submit({ privateData: true, untrustedContent: true, externalEgress: true });
session.next();
session.submit({ privateData: true, untrustedContent: true, externalEgress: false });
const beforeReset = session.snapshot();
const retryState = session.retry();
const afterReset = session.reset();
class TextOnlyNode {
  constructor() { this.value = ''; }
  set textContent(value) { this.value = String(value); }
  get textContent() { return this.value; }
  set innerHTML(_) { throw new Error('unsafe HTML rendering attempted'); }
}
const poison = '<img src=x onerror="globalThis.pwned=true">';
const scenarioView = { title: new TextOnlyNode(), description: new TextOnlyNode() };
api.renderScenarioText(scenarioView, { title: poison, description: poison });
const resultView = { summary: new TextOnlyNode(), components: {} };
for (const key of api.COMPONENTS) resultView.components[key] = { verdict: new TextOnlyNode(), explanation: new TextOnlyNode() };
const maliciousScenario = { privateData: true, untrustedContent: true, externalEgress: true,
  reasons: { privateData: poison, untrustedContent: poison, externalEgress: poison } };
api.renderResultText(resultView, api.evaluate(maliciousScenario,
  { privateData: true, untrustedContent: true, externalEgress: true }));
process.stdout.write(JSON.stringify({ fixtures, actual, violations,
  reset: { beforeIndex: beforeReset.index, beforeAttempted: beforeReset.attempted,
    retryClearsResult: retryState.result === null, index: afterReset.index,
    attempted: afterReset.attempted, result: afterReset.result },
  xss: { title: scenarioView.title.textContent, description: scenarioView.description.textContent,
    explanations: Object.values(resultView.components).map(x => x.explanation.textContent) }
}));
"""
    return node_json(probe, str(MODULE), str(FIXTURE))


def run_mounted_probe() -> dict:
    auditor = parse_page().find_all("div", "data-trifecta-auditor")[0]
    probe = r"""
const source = fs.readFileSync(process.argv[1], 'utf8');
const tree = JSON.parse(process.argv[2]);
let focused = null;
class FakeElement {
  constructor(spec, parent) {
    this.tag = spec.tag;
    this.attrs = spec.attrs;
    this.parent = parent;
    this.listeners = {};
    this.hidden = 'hidden' in spec.attrs;
    this.disabled = 'disabled' in spec.attrs;
    this.checked = 'checked' in spec.attrs;
    this.value = spec.attrs.value;
    this.children = spec.children.map(child => typeof child === 'string' ? child : new FakeElement(child, this));
  }
  get textContent() {
    return this.children.map(child => typeof child === 'string' ? child : child.textContent).join('');
  }
  set textContent(value) { this.children = [String(value)]; }
  set innerHTML(_) { throw new Error('unsafe HTML rendering attempted'); }
  set outerHTML(_) { throw new Error('unsafe HTML rendering attempted'); }
  insertAdjacentHTML() { throw new Error('unsafe HTML rendering attempted'); }
  focus() { focused = this; }
  addEventListener(type, callback) { (this.listeners[type] = this.listeners[type] || []).push(callback); }
  dispatch(type) {
    const event = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const callback of this.listeners[type] || []) callback(event);
    return event;
  }
  descendants() {
    const found = [];
    for (const child of this.children) {
      if (typeof child === 'string') continue;
      found.push(child, ...child.descendants());
    }
    return found;
  }
  matches(selector) {
    const parsed = /^([a-z]+)?((?:\[[^\]]+\])*)(:checked)?$/.exec(selector);
    if (!parsed) throw new Error('unsupported selector: ' + selector);
    if (parsed[1] && parsed[1] !== this.tag) return false;
    if (parsed[3] && !this.checked) return false;
    for (const clause of parsed[2].matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (!(clause[1] in this.attrs)) return false;
      if (clause[2] !== undefined && this.attrs[clause[1]] !== clause[2]) return false;
    }
    return true;
  }
  querySelectorAll(selector) { return this.descendants().filter(node => node.matches(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closestDisabledFieldset() {
    for (let node = this.parent; node; node = node.parent) if (node.tag === 'fieldset' && node.disabled) return node;
    return null;
  }
}
const root = new FakeElement(tree, null);
const documentStub = { querySelectorAll(selector) { return root.matches(selector) ? [root] : []; } };
const { sandbox, ready, violations } = loadModule(source, documentStub);
const scenarios = sandbox.module.exports.SCENARIOS;
const q = selector => root.querySelector(selector);
const radios = () => root.querySelectorAll('input[type="radio"]');
function choose(name, value) {
  const input = root.querySelector('input[name="' + name + '"][value="' + value + '"]');
  if (input.disabled || input.closestDisabledFieldset()) return false;
  for (const other of root.querySelectorAll('input[name="' + name + '"]')) other.checked = other === input;
  return true;
}
function answerAll(answer) {
  return Object.entries(answer).map(([name, yes]) => choose(name, yes ? 'yes' : 'no'));
}
function focusLabel() {
  if (!focused) return null;
  for (const attr of ['data-scenario-title', 'data-audit-feedback']) if (attr in focused.attrs) return attr;
  return focused.attrs.id || focused.tag;
}
function capture(label, extra) {
  return Object.assign({
    label,
    title: q('[data-scenario-title]').textContent,
    progress: q('[data-audit-progress]').textContent,
    status: q('[data-audit-status]').textContent,
    summary: q('[data-audit-summary]').textContent,
    privateVerdict: q('[data-result-private-verdict]').textContent,
    feedbackHidden: q('[data-audit-feedback]').hidden,
    retryHidden: q('[data-audit-retry]').hidden,
    nextHidden: q('[data-audit-next]').hidden,
    submitDisabled: q('[data-audit-submit]').disabled,
    fieldsetsDisabled: root.querySelectorAll('fieldset').map(node => node.disabled),
    checked: radios().filter(node => node.checked).map(node => node.attrs.id),
    focus: focusLabel()
  }, extra || {});
}
const steps = [];
ready();
steps.push(capture('initial'));
const empty = q('form').dispatch('submit');
steps.push(capture('incomplete', { prevented: empty.defaultPrevented }));
const first = scenarios[0];
answerAll({ privateData: first.privateData, untrustedContent: first.untrustedContent, externalEgress: first.externalEgress });
const correct = q('form').dispatch('submit');
steps.push(capture('submitted', { prevented: correct.defaultPrevented,
  changeAfterSubmit: choose('privateData', first.privateData ? 'no' : 'yes') }));
q('[data-audit-retry]').dispatch('click');
steps.push(capture('retry'));
answerAll({ privateData: !first.privateData, untrustedContent: first.untrustedContent, externalEgress: first.externalEgress });
q('form').dispatch('submit');
steps.push(capture('wrong'));
q('[data-audit-next]').dispatch('click');
steps.push(capture('next'));
answerAll({ privateData: true, untrustedContent: true, externalEgress: true });
q('form').dispatch('submit');
steps.push(capture('second-submitted'));
q('[data-audit-reset]').dispatch('click');
steps.push(capture('reset'));
process.stdout.write(JSON.stringify({ steps, violations, titles: scenarios.map(s => s.title),
  total: scenarios.length, firstPrivate: first.privateData }));
"""
    return node_json(probe, str(MODULE), json.dumps(serialize(auditor)))


class WeekEightTrifectaTests(unittest.TestCase):
    def test_markup_exposes_accessible_predict_then_check_contract(self) -> None:
        root = parse_page()
        auditors = root.find_all("div", "data-trifecta-auditor")
        self.assertEqual(1, len(auditors))
        auditor = auditors[0]
        self.assertEqual(3, len(auditor.find_all("fieldset")))
        self.assertEqual(3, len(auditor.find_all("legend")))
        labels = auditor.find_all("label")
        radios = [node for node in auditor.find_all("input") if node.attrs.get("type") == "radio"]
        self.assertEqual(6, len(labels))
        self.assertEqual(6, len(radios))
        self.assertEqual({"privateData", "untrustedContent", "externalEgress"}, {node.attrs.get("name") for node in radios})
        statuses = auditor.find_all(attr="data-audit-status")
        self.assertEqual("status", statuses[0].attrs.get("role"))
        self.assertEqual("polite", statuses[0].attrs.get("aria-live"))
        self.assertEqual(1, len(auditor.find_all(attr="data-audit-submit")))
        self.assertEqual(1, len(auditor.find_all(attr="data-audit-retry")))
        self.assertEqual(1, len(auditor.find_all(attr="data-audit-reset")))

    def test_placeholder_is_replaced_and_unique_module_is_loaded(self) -> None:
        root = parse_page()
        placeholders = [node for node in root.find_all("div") if "ix-future" in node.classes()]
        self.assertEqual(1, len(placeholders))
        scripts = [node.attrs.get("src") for node in root.find_all("script") if node.attrs.get("src")]
        self.assertEqual(1, scripts.count("../../assets/js/interactive-security.js"))

    def test_module_parses_and_all_fixture_verdicts_execute(self) -> None:
        subprocess.run(["node", "--check", str(MODULE)], check=True, capture_output=True, text=True)
        result = run_node_probe()
        actual = result["actual"]
        self.assertEqual(result["fixtures"], [
            {key: row[key] for key in ("id", "privateData", "untrustedContent", "externalEgress", "verdict")}
            for row in actual
        ])
        self.assertGreaterEqual(len(actual), 6)
        self.assertTrue(all(row["exact"] and row["rejectsWrong"] and row["explained"] for row in actual))
        self.assertGreaterEqual(sum(row["verdict"] == "near-miss" for row in actual), 3)

    def test_reset_retry_and_xss_safe_text_rendering_execute_without_io(self) -> None:
        result = run_node_probe()
        self.assertEqual({"beforeIndex": 1, "beforeAttempted": 2, "retryClearsResult": True,
                          "index": 0, "attempted": 0, "result": None}, result["reset"])
        poison = '<img src=x onerror="globalThis.pwned=true">'
        self.assertEqual(poison, result["xss"]["title"])
        self.assertEqual(poison, result["xss"]["description"])
        self.assertEqual([poison, poison, poison], result["xss"]["explanations"])
        self.assertEqual([], result["violations"])

    def test_mounted_auditor_drives_submit_retry_next_reset_without_io(self) -> None:
        result = run_mounted_probe()
        self.assertEqual([], result["violations"])
        steps = {step["label"]: step for step in result["steps"]}
        total = result["total"]
        first_title, second_title = result["titles"][0], result["titles"][1]
        unlocked = [False, False, False]
        locked = [True, True, True]

        initial = steps["initial"]
        self.assertEqual(first_title, initial["title"])
        self.assertEqual(f"Scenario 1 of {total} · 0 audited", initial["progress"])
        self.assertEqual("Choose Yes or No for all three properties, then submit your audit.", initial["status"])
        self.assertTrue(initial["feedbackHidden"] and initial["retryHidden"] and initial["nextHidden"])
        self.assertFalse(initial["submitDisabled"])
        self.assertEqual(unlocked, initial["fieldsetsDisabled"])
        self.assertEqual([], initial["checked"])

        incomplete = steps["incomplete"]
        self.assertTrue(incomplete["prevented"])
        self.assertEqual("Select Yes or No for all three properties before submitting.", incomplete["status"])
        self.assertEqual("audit-private-yes", incomplete["focus"])
        self.assertTrue(incomplete["feedbackHidden"])
        self.assertEqual(f"Scenario 1 of {total} · 0 audited", incomplete["progress"])

        submitted = steps["submitted"]
        self.assertTrue(submitted["prevented"])
        self.assertFalse(submitted["feedbackHidden"])
        self.assertFalse(submitted["retryHidden"] or submitted["nextHidden"])
        self.assertTrue(submitted["submitDisabled"])
        self.assertEqual(locked, submitted["fieldsetsDisabled"])
        self.assertFalse(submitted["changeAfterSubmit"])
        self.assertEqual("data-audit-feedback", submitted["focus"])
        self.assertTrue(submitted["summary"].startswith("Your audit matches."))
        self.assertEqual("Audit submitted. Your three classifications match.", submitted["status"])
        self.assertEqual(f"Scenario 1 of {total} · 1 audited", submitted["progress"])

        retry = steps["retry"]
        self.assertEqual([], retry["checked"])
        self.assertEqual(unlocked, retry["fieldsetsDisabled"])
        self.assertTrue(retry["feedbackHidden"] and retry["retryHidden"] and retry["nextHidden"])
        self.assertFalse(retry["submitDisabled"])
        self.assertEqual("data-scenario-title", retry["focus"])
        self.assertEqual("Retry ready. Reclassify all three properties.", retry["status"])
        self.assertEqual(f"Scenario 1 of {total} · 1 audited", retry["progress"])

        wrong = steps["wrong"]
        self.assertTrue(wrong["summary"].startswith("Not yet."))
        expected_private = "Yes" if result["firstPrivate"] else "No"
        self.assertEqual(f"Correction — {expected_private}", wrong["privateVerdict"])
        self.assertEqual(locked, wrong["fieldsetsDisabled"])

        nxt = steps["next"]
        self.assertEqual(second_title, nxt["title"])
        self.assertEqual(f"Scenario 2 of {total} · 1 audited", nxt["progress"])
        self.assertEqual([], nxt["checked"])
        self.assertEqual(unlocked, nxt["fieldsetsDisabled"])
        self.assertEqual("data-scenario-title", nxt["focus"])

        self.assertEqual(f"Scenario 2 of {total} · 2 audited", steps["second-submitted"]["progress"])

        reset = steps["reset"]
        self.assertEqual(first_title, reset["title"])
        self.assertEqual(f"Scenario 1 of {total} · 0 audited", reset["progress"])
        self.assertEqual("Exercise reset. Progress cleared; scenario one is ready.", reset["status"])
        self.assertEqual([], reset["checked"])
        self.assertEqual(unlocked, reset["fieldsetsDisabled"])
        self.assertTrue(reset["feedbackHidden"] and reset["retryHidden"] and reset["nextHidden"])
        self.assertFalse(reset["submitDisabled"])
        self.assertEqual("data-scenario-title", reset["focus"])

    def test_io_traps_detect_forbidden_egress_and_persistence(self) -> None:
        probe = r"""
const results = {};
for (const expr of ['navigator.sendBeacon', 'new Image()', 'new EventSource("x")', 'open("x")',
    'location.href', 'document.cookie', 'localStorage.getItem("x")', 'fetch("x")']) {
  const { violations } = loadModule('try { ' + expr + '; } catch (_) {}', {});
  results[expr] = violations.length > 0;
}
process.stdout.write(JSON.stringify(results));
"""
        results = node_json(probe)
        self.assertEqual({expr: True for expr in results}, results)
        self.assertEqual(8, len(results))


if __name__ == "__main__":
    unittest.main()
