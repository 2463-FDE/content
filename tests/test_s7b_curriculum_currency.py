"""Regression checks for the Week 7–8 S7b currency restamp."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEK_PAGES = sorted((ROOT / "weeks/w07").glob("*.html")) + sorted(
    (ROOT / "weeks/w08").glob("*.html")
)


class _Parser(HTMLParser):
    pass


class S7bCurrencyTests(unittest.TestCase):
    def test_html_and_inline_javascript_parse(self) -> None:
        for page in WEEK_PAGES:
            source = page.read_text()
            with self.subTest(page=page):
                parser = _Parser(convert_charrefs=True)
                parser.feed(source)
                parser.close()
                inline_scripts = re.findall(
                    r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>",
                    source,
                    flags=re.DOTALL | re.IGNORECASE,
                )
                self.assertTrue(inline_scripts)
                for script in inline_scripts:
                    with tempfile.NamedTemporaryFile(suffix=".js") as handle:
                        handle.write(script.encode())
                        handle.flush()
                        subprocess.run(
                            ["node", "--check", handle.name],
                            check=True,
                            capture_output=True,
                            text=True,
                        )

    def test_quiz_configuration_and_answer_ranges(self) -> None:
        validator = r"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(process.argv[2], 'utf8');
const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(m => m[1]);
const quizScript = scripts.find(s => s.includes('window.QUIZ'));
if (!quizScript) throw new Error('missing window.QUIZ');
const context = {window: {}};
vm.runInNewContext(quizScript, context);
const quiz = context.window.QUIZ;
if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
  throw new Error('quiz has no questions');
}
for (const [index, q] of quiz.questions.entries()) {
  if (!q.stem || !q.type) throw new Error(`question ${index} missing stem/type`);
  if (q.type === 'mcq' && Array.isArray(q.options)) {
    const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (answers.some(a => !Number.isInteger(a) || a < 0 || a >= q.options.length)) {
      throw new Error(`question ${index} answer out of range`);
    }
  }
}
process.stdout.write(JSON.stringify({count: quiz.questions.length}));
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js") as script_file:
            script_file.write(validator)
            script_file.flush()
            for page in WEEK_PAGES:
                with self.subTest(page=page):
                    result = subprocess.run(
                        ["node", script_file.name, str(page)],
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                    self.assertGreater(json.loads(result.stdout)["count"], 0)

    def test_current_and_historical_labels(self) -> None:
        d1 = (ROOT / "weeks/w07/w07d1.html").read_text()
        d2 = (ROOT / "weeks/w07/w07d2.html").read_text()
        d3 = (ROOT / "weeks/w07/w07d3.html").read_text()
        d5 = (ROOT / "weeks/w07/w07d5.html").read_text()
        w8d3 = (ROOT / "weeks/w08/w08d3.html").read_text()

        for page in (d1, d3):
            self.assertIn("course platform itself uses\n        Langfuse", page)
            self.assertIn("transferable object", page)
        self.assertIn("landmark\n        2023 judge study", d2)
        self.assertIn("not a\n        current model recommendation", d2)
        self.assertIn("accessed August 6, 2026", d5)
        self.assertIn("not current-model recommendations", d5)
        self.assertIn("November 23, 2023 historical fact-checking evaluation", w8d3)
        self.assertIn("January 8, 2024 historical\n        evaluation", w8d3)
        self.assertIn("not current app-model\n        recommendations", w8d3)

    def test_no_retired_api_or_unlabelled_o3_recommendation(self) -> None:
        corpus = "\n".join(page.read_text() for page in WEEK_PAGES)
        self.assertIsNone(re.search(r"\bo3(?:-[\w.-]+)?\b", corpus, flags=re.IGNORECASE))
        self.assertNotIn("Assistants API", corpus)
        self.assertIn("Responses API", (ROOT / "weeks/w07/w07d5.html").read_text())

    def test_owasp_2026_list_is_preserved(self) -> None:
        page = (ROOT / "weeks/w08/w08d1.html").read_text()
        expected = (
            "LLM01 Prompt Injection · LLM02 Sensitive Information Disclosure · LLM03\n"
            "        Excessive Agency · LLM04 Supply Chain · LLM05 Data and Model Poisoning · LLM06 Unbounded Consumption · LLM07\n"
            "        Misinformation · LLM08 Hidden Context Exposure · LLM09 Vector and Embedding Weaknesses · LLM10 Improper Output\n"
            "        Handling."
        )
        self.assertIn(expected, page)
        self.assertNotIn("two days before this page was written", page)


if __name__ == "__main__":
    unittest.main()
