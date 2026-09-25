"""Behavioral contracts for the Week 4 major-refresh lane."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import textwrap
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
W4_PAGES = sorted((ROOT / "weeks" / "w04").glob("*.html"))
SIMULATOR = ROOT / "assets" / "js" / "interactive-w4-checkpoint.js"
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Element:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = dict(attrs)
        self.children: list[Element | str] = []

    def find_all(self, tag: str | None = None, class_name: str | None = None) -> list[Element]:
        classes = set((self.attrs.get("class") or "").split())
        matches = [self] if (tag is None or self.tag == tag) and (class_name is None or class_name in classes) else []
        for child in self.children:
            if isinstance(child, Element):
                matches.extend(child.find_all(tag, class_name))
        return matches

    def text(self) -> str:
        return "".join(child.text() if isinstance(child, Element) else child for child in self.children)


class CurriculumHTMLParser(HTMLParser):
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
        raise AssertionError(f"closing tag </{tag}> has no matching open tag")

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


class ParsedPage:
    def __init__(self, path: Path) -> None:
        parser = CurriculumHTMLParser()
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
        if len(parser.stack) != 1:
            raise AssertionError(f"unclosed tags in {path}: {[node.tag for node in parser.stack[1:]]}")
        self.path = path
        self.root = parser.root

    @property
    def embedded_javascript(self) -> str:
        return "\n".join(
            script.text() for script in self.root.find_all("script") if not script.attrs.get("src")
        )


class WeekFourMajorRefreshTests(unittest.TestCase):
    def test_each_day_publishes_one_inert_read_only_worked_example(self) -> None:
        self.assertEqual(5, len(W4_PAGES))
        python_examples = 0
        cypher_examples = 0
        audit_runner = textwrap.dedent(
            """
            import sys

            def deny_capabilities(event, args):
                if event == "open" or event.startswith(("socket.", "subprocess.", "http.client", "urllib.")):
                    raise RuntimeError(f"forbidden capability used: {event}")

            sys.addaudithook(deny_capabilities)
            source = sys.stdin.read()
            exec(compile(source, "published-popup", "exec"), {"__name__": "__main__"})
            """
        )

        for path in W4_PAGES:
            with self.subTest(page=path.name):
                page = ParsedPage(path)
                buttons = page.root.find_all("button", "code-cta")
                modals = page.root.find_all("div", "code-modal")
                viewers = page.root.find_all("div", "cv")
                raw_blocks = page.root.find_all("pre", "cv-raw")
                self.assertEqual(1, len(buttons))
                self.assertEqual(1, len(modals))
                self.assertEqual(1, len(viewers))
                self.assertEqual(1, len(raw_blocks))
                self.assertEqual("dialog", buttons[0].attrs.get("aria-haspopup"))
                target_id = buttons[0].attrs.get("data-modal")
                overlays = [
                    node for node in page.root.find_all("div", "modal-overlay")
                    if node.attrs.get("id") == target_id
                ]
                self.assertEqual(1, len(overlays))
                self.assertEqual(1, len(modals[0].find_all("button", "modal-close")))
                self.assertIn("Read-only", " ".join(modals[0].text().split()))
                self.assertIn("synthetic", modals[0].text().lower())
                self.assertEqual(
                    1,
                    len([
                        script for script in page.root.find_all("script")
                        if "codeviewer.js" in (script.attrs.get("src") or "")
                    ]),
                )

                code = raw_blocks[0].text()
                language = raw_blocks[0].attrs.get("data-lang") or viewers[0].attrs.get("data-lang")
                if language == "python":
                    python_examples += 1
                    result = subprocess.run(
                        [sys.executable, "-I", "-c", audit_runner],
                        input=code,
                        text=True,
                        capture_output=True,
                    )
                    self.assertEqual(0, result.returncode, result.stderr)
                else:
                    cypher_examples += 1
                    clauses = {
                        line.strip().split(maxsplit=1)[0].upper()
                        for line in code.splitlines()
                        if line.strip() and not line.strip().startswith("//")
                    }
                    self.assertTrue({"CALL", "MATCH", "WHERE", "RETURN", "ORDER"}.issubset(clauses))
                    self.assertTrue(clauses.isdisjoint({"CREATE", "MERGE", "SET", "DELETE", "REMOVE", "DROP"}))

        self.assertEqual(4, python_examples)
        self.assertEqual(1, cypher_examples)

    def test_quizzes_and_embedded_javascript_are_executable_and_current(self) -> None:
        probe = r"""
const vm = require('vm');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => source += chunk);
process.stdin.on('end', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'w4-published-inline.js' });
  process.stdout.write(JSON.stringify({
    captions: sandbox.window.DIAGRAM?.captions?.length || 0,
    quiz: sandbox.window.QUIZ || null
  }));
});
"""
        retired_model = re.compile(r"\bo3(?:-[\w.-]+)?\b|\bgpt-5(?:[\w.-]+)?\b", re.IGNORECASE)
        for path in W4_PAGES:
            with self.subTest(page=path.name):
                page = ParsedPage(path)
                result = subprocess.run(
                    ["node", "-e", probe],
                    input=page.embedded_javascript,
                    text=True,
                    capture_output=True,
                    check=True,
                )
                contract = json.loads(result.stdout)
                self.assertGreater(contract["captions"], 0)
                self.assertEqual(6, len(contract["quiz"]["questions"]))
                self.assertIsNone(retired_model.search(json.dumps(contract["quiz"])))
                for question in contract["quiz"]["questions"]:
                    if isinstance(question.get("answer"), int) and question.get("options"):
                        self.assertIn(question["answer"], range(len(question["options"])))

    def test_crash_resume_state_machine_matches_the_fixture(self) -> None:
        probe = r"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(process.argv[1], 'utf8');
const networkEvents = [];
const deny = name => () => { networkEvents.push(name); throw new Error(name); };
const sandbox = {
  module: { exports: {} },
  exports: {},
  globalThis: {},
  fetch: deny('fetch'),
  XMLHttpRequest: deny('XMLHttpRequest'),
  WebSocket: deny('WebSocket'),
  EventSource: deny('EventSource'),
  console
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'interactive-w4-checkpoint.js' });
const machine = sandbox.module.exports.createMachine();
const states = [machine.snapshot()];
states.push(machine.step().state);
states.push(machine.step().state);
states.push(machine.crash().state);
states.push(machine.resume().state);
states.push(machine.step().state);
states.push(machine.step().state);
states.push(machine.step().state);
process.stdout.write(JSON.stringify({states, networkEvents}));
"""
        result = subprocess.run(
            ["node", "-e", probe, str(SIMULATOR)],
            text=True,
            capture_output=True,
            check=True,
        )
        contract = json.loads(result.stdout)
        states = contract["states"]
        self.assertEqual([0, 1, 2, 2, 2, 3, 4, 5], [state["checkpoint"] for state in states])
        self.assertEqual("crashed", states[3]["phase"])
        self.assertEqual("after load_order", states[3]["checkpointLabel"])
        self.assertEqual(["validate_request", "load_order"], states[4]["skipped"])
        self.assertEqual(["calculate_refund"], states[4]["replayQueue"])
        self.assertEqual(["calculate_refund"], states[5]["replayed"])
        calculate = next(node for node in states[5]["nodes"] if node["id"] == "calculate_refund")
        self.assertEqual(2, calculate["executionCount"])
        self.assertEqual("complete", states[-1]["phase"])
        self.assertEqual("embedded synthetic fixture", states[-1]["dataSource"])
        self.assertEqual([], contract["networkEvents"])

    def test_w4d2_replaces_one_placeholder_with_the_real_simulator(self) -> None:
        counts: dict[str, int] = {}
        for path in W4_PAGES:
            page = ParsedPage(path)
            counts[path.name] = len(page.root.find_all("div", "ix-future"))
        self.assertEqual(2, counts["w04d2.html"])
        self.assertEqual(14, sum(counts.values()))
        self.assertEqual(1, len(ParsedPage(ROOT / "weeks" / "w04" / "w04d2.html").root.find_all("div", "ix-checkpoint")))

    def test_w4d2_publishes_keyboard_hook_and_reset_restores_initial_state(self) -> None:
        page = ParsedPage(ROOT / "weeks" / "w04" / "w04d2.html")
        roots = [node for node in page.root.find_all("div", "ix-checkpoint") if "data-checkpoint-sim" in node.attrs]
        self.assertEqual(1, len(roots))
        self.assertEqual("0", roots[0].attrs.get("tabindex"))
        self.assertEqual("Alt+S Alt+C Alt+R Alt+0", roots[0].attrs.get("data-keyboard-shortcuts"))
        scripts = [script.attrs.get("src", "") for script in page.root.find_all("script")]
        self.assertEqual(1, len([src for src in scripts if "interactive-w4-checkpoint.js" in src]))

        module_probe = r"""
const api = require(process.argv[1]);
const machine = api.createMachine();
machine.step();
machine.step();
machine.crash();
machine.resume();
const reset = machine.reset();
process.stdout.write(JSON.stringify(reset));
"""
        result = subprocess.run(
            ["node", "-e", module_probe, str(SIMULATOR)],
            text=True,
            capture_output=True,
            check=True,
        )
        reset = json.loads(result.stdout)
        self.assertEqual("ready", reset["phase"])
        self.assertEqual(0, reset["checkpoint"])
        self.assertEqual([], reset["skipped"])
        self.assertEqual([], reset["replayed"])


if __name__ == "__main__":
    unittest.main()
