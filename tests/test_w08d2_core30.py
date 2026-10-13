"""Frozen Core-30 contract for the converted W8·D2 page.

Timing contract (frozen — change requires a deliberate curriculum decision):
  * The required path is every word of ``article.reading-col`` EXCEPT content
    inside <pre>, <script>, <button>, <svg>, elements classed
    ``reading-sources`` / ``ix-future`` / ``trifecta-auditor``, and any element
    marked ``data-core="optional"`` (progressive-disclosure depth).
  * Required-path prose must fit WORD_BUDGET words.
  * The pacing label advertises round(words / WPM) minutes at WPM = 150 wpm,
    one required interaction, and the comprehension check's true question count.
"""

from __future__ import annotations

import json
import re
import subprocess
import unittest
from pathlib import Path

from test_w8_trifecta import Element, parse_page

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "weeks" / "w08" / "w08d2.html"

WORD_BUDGET = 1800
WPM = 150
EXCLUDED_TAGS = {"pre", "script", "button", "svg"}
EXCLUDED_CLASSES = {"reading-sources", "ix-future", "trifecta-auditor"}


def is_optional(element: Element) -> bool:
    if element.tag in EXCLUDED_TAGS:
        return True
    if element.classes() & EXCLUDED_CLASSES:
        return True
    return element.attrs.get("data-core") == "optional"


def required_text(element: Element, out: list[str]) -> None:
    for child in element.children:
        if isinstance(child, str):
            out.append(child)
        elif not is_optional(child):
            required_text(child, out)


def reading_article(root: Element) -> Element:
    articles = [e for e in root.find_all("article") if "reading-col" in e.classes()]
    assert len(articles) == 1, "expected exactly one article.reading-col"
    return articles[0]


def text_of(element: Element) -> str:
    parts: list[str] = []

    def walk(node: Element) -> None:
        for child in node.children:
            if isinstance(child, str):
                parts.append(child)
            else:
                walk(child)

    walk(element)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


class Core30Contract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.root = parse_page()
        cls.article = reading_article(cls.root)
        texts: list[str] = []
        required_text(cls.article, texts)
        cls.required_words = len(" ".join(texts).split())
        metas = [
            e for e in cls.article.find_all("span")
            if "core30-meta" in e.classes()
        ]
        assert len(metas) == 1, "expected exactly one .core30-meta span"
        cls.meta_text = text_of(metas[0])

    def test_required_path_fits_word_budget(self) -> None:
        self.assertLessEqual(
            self.required_words, WORD_BUDGET,
            f"required path is {self.required_words} words; budget {WORD_BUDGET}",
        )
        # A near-empty required path would mean the exclusions ate the page.
        self.assertGreater(self.required_words, 500, "required path implausibly small")

    def test_pacing_label_minutes_are_true(self) -> None:
        advertised = re.search(r"~(\d+) min read", self.meta_text)
        self.assertIsNotNone(advertised, f"no '~N min read' in meta: {self.meta_text!r}")
        self.assertEqual(
            int(advertised.group(1)), round(self.required_words / WPM),
            f"label minutes must equal round({self.required_words}/{WPM})",
        )
        self.assertTrue(self.meta_text.startswith("Core 30 ·"), self.meta_text)

    def test_pacing_label_interaction_count_is_true(self) -> None:
        auditors = self.article.find_all(attr="data-trifecta-auditor")
        self.assertEqual(len(auditors), 1, "exactly one required interaction")
        self.assertIn("· 1 interaction ·", self.meta_text)

    def test_required_interaction_is_on_required_path(self) -> None:
        def on_required_path(node: Element) -> bool:
            if "data-trifecta-auditor" in node.attrs:
                return True
            return any(
                isinstance(child, Element)
                # the auditor itself is allowed its excluded class
                and (on_required_path(child) if "trifecta-auditor" in child.classes()
                     or "data-trifecta-auditor" in child.attrs
                     else (not is_optional(child) and on_required_path(child)))
                for child in node.children
            )

        self.assertTrue(
            on_required_path(self.article),
            "the lethal-trifecta auditor must not sit inside optional depth",
        )

    def test_pacing_label_check_count_is_true(self) -> None:
        embedded = "\n".join(
            text_of(script) for script in self.root.find_all("script")
            if not script.attrs.get("src")
        )
        probe = """
const vm = require('vm');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => source += chunk);
process.stdin.on('end', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'w08d2-embedded.js' });
  const questions = sandbox.window.QUIZ && sandbox.window.QUIZ.questions;
  process.stdout.write(JSON.stringify({ questions: Array.isArray(questions) ? questions.length : null }));
});
"""
        result = subprocess.run(
            ["node", "-e", probe], input=embedded, text=True, capture_output=True, check=True,
        )
        questions = json.loads(result.stdout)["questions"]
        self.assertIsNotNone(questions, "window.QUIZ.questions missing")
        self.assertGreater(questions, 0)
        check = re.search(r"· (\d+)-Q check", self.meta_text)
        self.assertIsNotNone(check, f"no 'N-Q check' in meta: {self.meta_text!r}")
        self.assertEqual(int(check.group(1)), questions)

    def test_optional_depth_is_preserved_not_deleted(self) -> None:
        deep = [
            e for e in self.article.find_all("details")
            if "deep" in e.classes()
        ]
        self.assertGreaterEqual(len(deep), 6, "progressive-disclosure depth went missing")
        for block in deep:
            self.assertEqual(
                block.attrs.get("data-core"), "optional",
                "every details.deep must be marked data-core=optional",
            )
            summaries = block.find_all("summary")
            self.assertTrue(summaries and text_of(summaries[0]), "deep block needs a summary")
        sources = [
            e for e in self.article.find_all(attr="data-core")
            if "reading-sources" in e.classes()
        ]
        self.assertEqual(len(sources), 1, "sources section must be marked optional")


if __name__ == "__main__":
    unittest.main()
