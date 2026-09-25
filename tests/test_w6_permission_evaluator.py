"""Behavior and page-contract tests for Week 6 permission-rule practice."""

from __future__ import annotations

import json
import subprocess
import textwrap
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "assets" / "js" / "interactive-w6-permissions.js"
PAGES = {
    "w06d2.html": ("all", 2),
    "w06d4.html": ("legacy", 2),
    "w06d5.html": ("delivery", 2),
}
EXPECTED = {
    "docs-guide": ("allow", "F-02"),
    "source-read": ("allow", "F-03"),
    "secret-file": ("deny", "F-01"),
    "sensitive-arg": ("deny", "S-01"),
    "unit-tests": ("allow", "T-01"),
    "deployment-tests": ("deny", "T-02"),
    "public-fetch": ("allow", "H-01"),
    "unknown-fetch": ("deny", "D-01"),
    "shell-command": ("deny", "D-01"),
}


class PageContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.widgets: list[dict[str, str | None]] = []
        self.future_count = 0
        self.scripts: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        classes = set((values.get("class") or "").split())
        if "ix-permission" in classes:
            self.widgets.append(values)
        if "ix-future" in classes:
            self.future_count += 1
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"] or "")
        if tag == "a" and values.get("href"):
            self.links.append(values["href"] or "")


def run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


class Week6PermissionEvaluatorTests(unittest.TestCase):
    def test_seeded_fixture_verdicts_and_exact_deciding_rules(self) -> None:
        script = textwrap.dedent(
            """
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const results = {};
            for (const item of policy.CASES) {
              const evaluated = policy.evaluateCall(item.call);
              results[item.id] = {
                verdict: evaluated.verdict,
                decidingRule: evaluated.decidingRule,
                fixtureVerdict: item.verdict
              };
            }
            process.stdout.write(JSON.stringify({ count: policy.CASES.length, results }));
            """
        )
        contract = run_node(script)
        self.assertGreaterEqual(contract["count"], 8)
        self.assertEqual(set(EXPECTED), set(contract["results"]))
        for case_id, (verdict, rule_id) in EXPECTED.items():
            with self.subTest(case=case_id):
                result = contract["results"][case_id]
                self.assertEqual(verdict, result["verdict"])
                self.assertEqual(verdict, result["fixtureVerdict"])
                self.assertEqual(rule_id, result["decidingRule"])

    def test_precedence_trace_explains_specific_wildcard_and_sensitive_matches(self) -> None:
        script = textwrap.dedent(
            """
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const byId = Object.fromEntries(policy.CASES.map(item => [item.id, item]));
            const inspect = id => {
              const result = policy.evaluateCall(byId[id].call);
              return {
                decidingRule: result.decidingRule,
                matched: result.trace.filter(row => row.matched).map(row => ({
                  id: row.id, decision: row.decision, precedence: row.precedence
                }))
              };
            };
            process.stdout.write(JSON.stringify({
              restricted: inspect('secret-file'),
              unit: inspect('unit-tests'),
              sensitive: inspect('sensitive-arg')
            }));
            """
        )
        result = run_node(script)
        self.assertEqual("F-01", result["restricted"]["decidingRule"])
        self.assertEqual(["F-01", "F-03", "D-01"], [row["id"] for row in result["restricted"]["matched"]])
        self.assertTrue(result["restricted"]["matched"][1]["precedence"])
        self.assertEqual("T-01", result["unit"]["decidingRule"])
        self.assertEqual(["T-01", "T-02", "D-01"], [row["id"] for row in result["unit"]["matched"]])
        self.assertEqual("S-01", result["sensitive"]["decidingRule"])
        self.assertIn("F-02", [row["id"] for row in result["sensitive"]["matched"]])

    def test_malformed_and_nested_sensitive_inputs_are_handled_deterministically(self) -> None:
        script = textwrap.dedent(
            """
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const malformed = [null, {}, {tool: ''}, {tool: 'file.read', args: []}]
              .map(value => policy.evaluateCall(value));
            const nested = policy.evaluateCall({
              tool: 'file.read',
              args: { path: 'docs/setup.md', metadata: { private_key: 'synthetic-only' } }
            });
            process.stdout.write(JSON.stringify({ malformed, nested }));
            """
        )
        result = run_node(script)
        self.assertTrue(all(not item["ok"] and item["error"] for item in result["malformed"]))
        self.assertEqual("deny", result["nested"]["verdict"])
        self.assertEqual("S-01", result["nested"]["decidingRule"])

    def test_predict_check_retry_and_reset_session_behavior(self) -> None:
        script = textwrap.dedent(
            """
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const session = policy.createSession(['docs-guide', 'deployment-tests']);
            const before = session.check();
            session.predict('deny');
            const wrong = session.check();
            session.retry();
            const retried = session.state();
            session.predict('allow');
            const right = session.check();
            session.next();
            session.predict('deny');
            const second = session.check();
            session.reset();
            process.stdout.write(JSON.stringify({
              before, wrong, retried, right, second,
              reset: session.state(), resetCase: session.current().id
            }));
            """
        )
        result = run_node(script)
        self.assertFalse(result["before"]["ok"])
        self.assertFalse(result["wrong"]["correct"])
        self.assertIsNone(result["retried"]["prediction"])
        self.assertFalse(result["retried"]["checked"])
        self.assertTrue(result["right"]["correct"])
        self.assertTrue(result["second"]["correct"])
        self.assertEqual({"index": 0, "prediction": None, "checked": False, "total": 2}, result["reset"])
        self.assertEqual("docs-guide", result["resetCase"])

    def test_pages_replace_one_placeholder_and_load_the_matching_drill(self) -> None:
        for filename, (case_set, future_count) in PAGES.items():
            with self.subTest(page=filename):
                parser = PageContractParser()
                parser.feed((ROOT / "weeks" / "w06" / filename).read_text(encoding="utf-8"))
                parser.close()
                self.assertEqual(1, len(parser.widgets))
                widget = parser.widgets[0]
                self.assertTrue(widget.get("id"))
                self.assertEqual(case_set, widget.get("data-case-set"))
                self.assertEqual(future_count, parser.future_count)
                self.assertEqual(1, sum("interactive-w6-permissions.js" in src for src in parser.scripts))
        primary = PageContractParser()
        primary.feed((ROOT / "weeks" / "w06" / "w06d2.html").read_text(encoding="utf-8"))
        self.assertIn("w06d4.html#permission-evaluator-legacy", primary.links)
        self.assertIn("w06d5.html#permission-evaluator-delivery", primary.links)

    def test_module_parses_and_executes_without_network_storage_or_host_credentials(self) -> None:
        subprocess.run(["node", "--check", str(MODULE)], cwd=ROOT, check=True, capture_output=True, text=True)
        script = textwrap.dedent(
            """
            const fs = require('fs');
            const vm = require('vm');
            let calls = 0;
            const forbidden = () => { calls += 1; throw new Error('external API accessed'); };
            const sandbox = {
              module: { exports: {} }, exports: {}, fetch: forbidden,
              XMLHttpRequest: function () { forbidden(); }
            };
            Object.defineProperty(sandbox, 'localStorage', { get: forbidden });
            Object.defineProperty(sandbox, 'sessionStorage', { get: forbidden });
            Object.defineProperty(sandbox, 'process', { get: forbidden });
            sandbox.globalThis = sandbox;
            vm.runInNewContext(
              fs.readFileSync('./assets/js/interactive-w6-permissions.js', 'utf8'),
              sandbox,
              { filename: 'interactive-w6-permissions.js' }
            );
            const policy = sandbox.module.exports;
            const verdicts = policy.CASES.map(item => policy.evaluateCall(item.call).verdict);
            console.log(JSON.stringify({ calls, verdicts, initialized: typeof policy.init === 'function' }));
            """
        )
        result = run_node(script)
        self.assertEqual(0, result["calls"])
        self.assertEqual(len(EXPECTED), len(result["verdicts"]))
        self.assertTrue(result["initialized"])

    def test_traversal_segments_are_rejected_before_path_rules(self) -> None:
        script = textwrap.dedent(
            """
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const paths = ['docs/../restricted/x', 'docs\\\\..\\\\restricted\\\\x', '../restricted/x', 'docs/..'];
            const rejected = paths.map(path => policy.evaluateCall({ tool: 'file.read', args: { path } }));
            const dotted = policy.evaluateCall({ tool: 'file.read', args: { path: 'docs/v1..v2-notes.md' } });
            process.stdout.write(JSON.stringify({ rejected, dotted }));
            """
        )
        result = run_node(script)
        for item in result["rejected"]:
            self.assertFalse(item["ok"])
            self.assertIn("traversal", item["error"])
        self.assertEqual("F-02", result["dotted"]["decidingRule"])

    def test_widget_renders_accessible_text_only_ui_and_handles_events_offline(self) -> None:
        script = textwrap.dedent(
            """
            const fs = require('fs');
            const vm = require('vm');
            let calls = 0;
            const forbidden = () => { calls += 1; throw new Error('forbidden API accessed'); };

            class TextNode {
              constructor(data) { this.nodeType = 3; this.data = String(data); }
              get textContent() { return this.data; }
            }
            class Element {
              constructor(tag) {
                this.nodeType = 1; this.tagName = tag.toUpperCase(); this.children = [];
                this.attributes = {}; this.listeners = {}; this.className = ''; this.id = '';
                this.value = ''; this.checked = false; this.type = ''; this.name = '';
              }
              get textContent() { return this.children.map(child => child.textContent).join(''); }
              set textContent(value) { this.children = value === '' ? [] : [new TextNode(value)]; }
              set innerHTML(value) { forbidden(); }
              get innerHTML() { return forbidden(); }
              set outerHTML(value) { forbidden(); }
              insertAdjacentHTML() { forbidden(); }
              appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
              setAttribute(name, value) { this.attributes[name] = String(value); }
              getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
              addEventListener(type, handler) { (this.listeners[type] = this.listeners[type] || []).push(handler); }
              dispatch(type) { (this.listeners[type] || []).forEach(handler => handler({ type, target: this })); }
              focus() { document.activeElement = this; }
            }
            const all = node => [node].concat((node.children || []).filter(c => c.nodeType === 1).flatMap(all));
            const body = new Element('body');
            const head = new Element('head');
            const widget = new Element('div');
            widget.className = 'ix-permission';
            widget.id = 'perm';
            widget.setAttribute('data-case-set', 'all');
            body.appendChild(widget);
            const document = {
              readyState: 'complete', head, body, activeElement: null,
              createElement: tag => new Element(tag),
              createTextNode: text => new TextNode(text),
              getElementById: id => all(head).concat(all(body)).find(node => node.id === id) || null,
              querySelectorAll: selector => selector === '.ix-permission' ? all(body).filter(n => n.className.split(' ').includes('ix-permission')) : [],
              addEventListener() {},
              write: forbidden
            };
            const sandbox = {
              module: { exports: {} }, exports: {}, document, fetch: forbidden,
              XMLHttpRequest: function () { forbidden(); },
              WebSocket: function () { forbidden(); },
              EventSource: function () { forbidden(); }
            };
            Object.defineProperty(sandbox, 'localStorage', { get: forbidden });
            Object.defineProperty(sandbox, 'sessionStorage', { get: forbidden });
            Object.defineProperty(sandbox, 'indexedDB', { get: forbidden });
            Object.defineProperty(sandbox, 'process', { get: forbidden });
            sandbox.globalThis = sandbox;
            vm.runInNewContext(
              fs.readFileSync('./assets/js/interactive-w6-permissions.js', 'utf8'),
              sandbox,
              { filename: 'interactive-w6-permissions.js' }
            );
            const policy = sandbox.module.exports;
            const nodes = () => all(widget);
            const byTag = tag => nodes().filter(n => n.tagName === tag.toUpperCase());
            const button = label => byTag('button').find(n => n.textContent === label);
            const select = byTag('select')[0];
            const fieldset = byTag('fieldset')[0];
            const radios = byTag('input').filter(n => n.type === 'radio');
            const status = nodes().find(n => n.getAttribute('role') === 'status');
            const feedback = nodes().find(n => n.className === 'perm-feedback');
            const liveNodes = nodes().filter(n => n.getAttribute('aria-live')).map(n => n.className);
            const snapshot = () => ({
              status: status.textContent,
              traceItems: byTag('li').map(li => ({ text: li.textContent, className: li.className })),
              selected: select.value,
              progress: nodes().find(n => n.className === 'perm-progress').textContent,
              checked: radios.map(r => r.checked)
            });

            const structure = {
              styleCount: head.children.filter(n => n.id === 'w6-permission-styles').length,
              selectLabelFor: byTag('label').find(n => n.getAttribute('for'))?.getAttribute('for'),
              selectId: select.id,
              optionCount: byTag('option').length,
              ruleRows: nodes().filter(n => n.className === 'perm-rule').length,
              legendFirst: fieldset.children[0].tagName,
              legendText: fieldset.children[0].textContent,
              radioLabels: radios.map(r => ({ parent: r.parentNode.tagName, label: r.parentNode.textContent, name: r.name, value: r.value })),
              statusAttrs: { live: status.getAttribute('aria-live'), atomic: status.getAttribute('aria-atomic') },
              feedbackLive: [feedback.getAttribute('role'), feedback.getAttribute('aria-live')],
              liveNodes,
              buttonTypes: byTag('button').map(b => b.type),
              hasTextInput: byTag('input').some(n => n.type !== 'radio') || byTag('textarea').length > 0
            };

            button('Check prediction').dispatch('click');
            const missing = snapshot();
            radios[0].checked = true;
            radios[0].dispatch('change');
            button('Check prediction').dispatch('click');
            const checkedCase = snapshot();
            button('Retry case').dispatch('click');
            const retried = snapshot();
            button('Next case').dispatch('click');
            radios[1].checked = true;
            radios[1].dispatch('change');
            button('Check prediction').dispatch('click');
            const second = snapshot();
            select.value = 'sensitive-arg';
            select.dispatch('change');
            const chosen = snapshot();
            button('Reset drill').dispatch('click');
            const reset = snapshot();
            const resetFocus = document.activeElement === select;

            console.log(JSON.stringify({
              calls, structure, missing, checkedCase, retried, second, chosen, reset, resetFocus,
              ruleCount: policy.RULES.length, caseCount: policy.CASES.length
            }));
            """
        )
        result = run_node(script)
        self.assertEqual(0, result["calls"])
        structure = result["structure"]
        self.assertEqual(1, structure["styleCount"])
        self.assertEqual(structure["selectId"], structure["selectLabelFor"])
        self.assertEqual(result["caseCount"], structure["optionCount"])
        self.assertEqual(result["ruleCount"], structure["ruleRows"])
        self.assertEqual("LEGEND", structure["legendFirst"])
        self.assertEqual("Your prediction", structure["legendText"])
        self.assertEqual(
            [
                {"parent": "LABEL", "label": "Allow", "name": "perm-prediction", "value": "allow"},
                {"parent": "LABEL", "label": "Deny", "name": "perm-prediction", "value": "deny"},
            ],
            structure["radioLabels"],
        )
        self.assertEqual({"live": "polite", "atomic": "true"}, structure["statusAttrs"])
        self.assertEqual([None, None], structure["feedbackLive"])
        self.assertEqual(["perm-verdict"], structure["liveNodes"])
        self.assertTrue(all(kind == "button" for kind in structure["buttonTypes"]))
        self.assertFalse(structure["hasTextInput"])

        self.assertIn("Choose allow or deny", result["missing"]["status"])
        self.assertEqual([], result["missing"]["traceItems"])

        checked = result["checkedCase"]
        self.assertEqual("Correct: ALLOW — deciding rule F-02.", checked["status"])
        self.assertEqual(result["ruleCount"], len(checked["traceItems"]))
        deciding = [item for item in checked["traceItems"] if item["className"] == "deciding"]
        self.assertEqual(1, len(deciding))
        self.assertTrue(deciding[0]["text"].startswith("F-02: matched."))
        self.assertIn("Exact deciding rule → ALLOW", deciding[0]["text"])
        self.assertNotIn("deciding rule", checked["traceItems"][0]["text"].lower())

        self.assertEqual("", result["retried"]["status"])
        self.assertEqual([], result["retried"]["traceItems"])
        self.assertEqual([False, False], result["retried"]["checked"])

        second = result["second"]
        self.assertEqual("source-read", second["selected"])
        self.assertTrue(second["progress"].startswith("Case 2 of 9"))
        self.assertEqual("Not yet: ALLOW — deciding rule F-03.", second["status"])

        self.assertEqual("sensitive-arg", result["chosen"]["selected"])
        self.assertTrue(result["chosen"]["progress"].startswith("Case 4 of 9"))

        reset = result["reset"]
        self.assertEqual("docs-guide", reset["selected"])
        self.assertTrue(reset["progress"].startswith("Case 1 of 9"))
        self.assertEqual([False, False], reset["checked"])
        self.assertEqual("", reset["status"])
        self.assertEqual([], reset["traceItems"])
        self.assertTrue(result["resetFocus"])


if __name__ == "__main__":
    unittest.main()
