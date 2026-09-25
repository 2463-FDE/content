"""Public curriculum contract tests for the Week 3–4 currency slice."""

from __future__ import annotations

import json
import re
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
W3_PAGES = sorted((ROOT / "weeks" / "w03").glob("*.html"))
W4_PAGES = sorted((ROOT / "weeks" / "w04").glob("*.html"))
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Element:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = dict(attrs)
        self.children: list[Element | str] = []

    def find_all(self, tag: str | None = None, class_name: str | None = None) -> list[Element]:
        matches = []
        classes = set((self.attrs.get("class") or "").split())
        if (tag is None or self.tag == tag) and (class_name is None or class_name in classes):
            matches.append(self)
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
        self.path = path
        parser = CurriculumHTMLParser()
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
        if len(parser.stack) != 1:
            raise AssertionError(f"unclosed tags in {path}: {[node.tag for node in parser.stack[1:]]}")
        self.root = parser.root

    @property
    def normalized_text(self) -> str:
        return " ".join(self.root.text().split())

    @property
    def embedded_javascript(self) -> str:
        return "\n".join(
            script.text()
            for script in self.root.find_all("script")
            if not script.attrs.get("src")
        )

    @property
    def links(self) -> set[str]:
        return {node.attrs.get("href", "") for node in self.root.find_all("a")}


class CurriculumCurrencyTests(unittest.TestCase):
    def test_mcp_revision_contract_distinguishes_latest_from_baseline(self) -> None:
        page = ParsedPage(ROOT / "weeks" / "w03" / "w03d2.html")
        text = page.normalized_text
        self.assertIn("latest published revision is 2026-07-28", text)
        self.assertIn("2025-11-25 as a widely deployed", text)
        self.assertIn(
            "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports",
            page.links,
        )
        self.assertNotIn("2026-07-28 RC (not yet stable)", text)
        self.assertIn("Streamable HTTP replaced the deprecated HTTP+SSE", text)

    def test_current_sonnet_example_does_not_use_unlabelled_legacy_alias(self) -> None:
        page = ParsedPage(ROOT / "weeks" / "w03" / "w03d5.html")
        public_contract = f"{page.normalized_text}\n{page.embedded_javascript}"
        self.assertIn("anthropic:claude-sonnet-5", public_contract)
        self.assertNotRegex(public_contract, r"claude-sonnet-4-5(?:-\d+)?")
        self.assertIn(
            "https://platform.claude.com/docs/en/about-claude/models/overview",
            page.links,
        )

    def test_each_week_three_day_has_one_inert_accessible_code_popup(self) -> None:
        self.assertEqual(5, len(W3_PAGES))
        forbidden_code_paths = re.compile(
            r"boto3|\.converse\s*\(|openai|requests\.|urllib|os\.environ|AWS_(?:SECRET|ACCESS|BEARER)",
            re.IGNORECASE,
        )
        for path in W3_PAGES:
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
                close_buttons = modals[0].find_all("button", "modal-close")
                self.assertEqual(1, len(close_buttons))
                self.assertTrue(close_buttons[0].attrs.get("aria-label"))
                code = raw_blocks[0].text()
                self.assertIn("Synthetic", code)
                self.assertIsNone(forbidden_code_paths.search(code), code)
                compile(code, f"{path.name}:popup", "exec")
                codeviewer_scripts = [
                    script for script in page.root.find_all("script")
                    if "codeviewer.js" in (script.attrs.get("src") or "")
                ]
                self.assertEqual(1, len(codeviewer_scripts))

    def test_week_three_and_four_diagrams_quizzes_and_embedded_js_remain_executable(self) -> None:
        for path in W3_PAGES + W4_PAGES:
            with self.subTest(page=path.relative_to(ROOT).as_posix()):
                page = ParsedPage(path)
                probe = """
const vm = require('vm');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => source += chunk);
process.stdin.on('end', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'embedded-curriculum.js' });
  process.stdout.write(JSON.stringify({
    captions: sandbox.window.DIAGRAM?.captions?.length || 0,
    questions: sandbox.window.QUIZ?.questions?.length || 0
  }));
});
"""
                result = subprocess.run(
                    ["node", "-e", probe],
                    input=page.embedded_javascript,
                    text=True,
                    capture_output=True,
                    check=True,
                )
                contract = json.loads(result.stdout)
                self.assertGreater(contract["captions"], 0)
                self.assertEqual(6, contract["questions"])

    def test_week_four_future_interactives_stay_deferred(self) -> None:
        for path in W4_PAGES:
            with self.subTest(page=path.name):
                page = ParsedPage(path)
                self.assertEqual(3, len(page.root.find_all("div", "ix-future")))


if __name__ == "__main__":
    unittest.main()
