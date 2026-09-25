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


def run_node_probe() -> dict:
    probe = r"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(process.argv[1], 'utf8');
const fixtures = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let ready;
const documentStub = {
  addEventListener(type, callback) { if (type === 'DOMContentLoaded') ready = callback; },
  querySelectorAll() { return []; }
};
const sandbox = { module: { exports: {} }, document: documentStub };
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket']) {
  Object.defineProperty(sandbox, name, { get() { throw new Error('forbidden network access: ' + name); } });
}
for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
  Object.defineProperty(sandbox, name, { get() { throw new Error('forbidden storage access: ' + name); } });
}
Object.defineProperty(sandbox, 'credentials', { get() { throw new Error('forbidden credential access'); } });
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'interactive-security.js' });
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
process.stdout.write(JSON.stringify({ fixtures, actual,
  reset: { beforeIndex: beforeReset.index, beforeAttempted: beforeReset.attempted,
    retryClearsResult: retryState.result === null, index: afterReset.index,
    attempted: afterReset.attempted, result: afterReset.result },
  xss: { title: scenarioView.title.textContent, description: scenarioView.description.textContent,
    explanations: Object.values(resultView.components).map(x => x.explanation.textContent) }
}));
"""
    completed = subprocess.run(
        ["node", "-e", probe, str(MODULE), str(FIXTURE)],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


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


if __name__ == "__main__":
    unittest.main()
