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


if __name__ == "__main__":
    unittest.main()
