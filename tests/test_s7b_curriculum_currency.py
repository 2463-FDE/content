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


_VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}


class _StrictNestingParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, tuple[int, int]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag not in _VOID_TAGS:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag: str) -> None:
        if not self.stack:
            raise ValueError(f"unexpected closing </{tag}> at {self.getpos()}")
        open_tag, open_pos = self.stack[-1]
        if open_tag != tag:
            raise ValueError(
                f"mismatched </{tag}> at {self.getpos()}; "
                f"expected </{open_tag}> for <{open_tag}> at {open_pos}"
            )
        self.stack.pop()

    def close(self) -> None:
        super().close()
        if self.stack:
            tag, position = self.stack[-1]
            raise ValueError(f"unclosed <{tag}> at {position}")


def _page_text(relative: str) -> str:
    return " ".join((ROOT / relative).read_text().split())


_QUIZ_VALIDATOR = r"""
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
const text = value => typeof value === 'string' && value.trim().length > 0;
const optionsAndAnswer = (q, index, multiple) => {
  if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(text)) {
    throw new Error(`question ${index} has invalid options`);
  }
  const answers = multiple ? q.answer : [q.answer];
  if (!Array.isArray(answers) || answers.length === 0 ||
      answers.some(a => !Number.isInteger(a) || a < 0 || a >= q.options.length)) {
    throw new Error(`question ${index} answer out of range`);
  }
};
for (const [index, q] of quiz.questions.entries()) {
  if (!text(q.stem) || !text(q.type)) throw new Error(`question ${index} missing stem/type`);
  switch (q.type) {
    case 'scq':
      optionsAndAnswer(q, index, false);
      if (!text(q.explain)) throw new Error(`question ${index} missing explanation`);
      break;
    case 'tf':
      if (typeof q.answer !== 'boolean' || !text(q.explain)) {
        throw new Error(`question ${index} has invalid true/false schema`);
      }
      break;
    case 'mcq':
      optionsAndAnswer(q, index, true);
      if (!text(q.explain)) throw new Error(`question ${index} missing explanation`);
      break;
    case 'match':
      if (!Array.isArray(q.pairs) || q.pairs.length === 0 ||
          !q.pairs.every(pair => pair && text(pair.l) && text(pair.r)) || !text(q.explain)) {
        throw new Error(`question ${index} has invalid match schema`);
      }
      break;
    case 'open':
      if (!text(q.hint) || !text(q.model)) {
        throw new Error(`question ${index} has invalid open-response schema`);
      }
      break;
    default:
      throw new Error(`question ${index} has unsupported type ${q.type}`);
  }
}
process.stdout.write(JSON.stringify({count: quiz.questions.length}));
"""


class S7bCurrencyTests(unittest.TestCase):
    def test_html_and_inline_javascript_parse(self) -> None:
        for page in WEEK_PAGES:
            source = page.read_text()
            with self.subTest(page=page):
                parser = _StrictNestingParser()
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

    def test_malformed_html_nesting_is_rejected(self) -> None:
        parser = _StrictNestingParser()
        with self.assertRaisesRegex(ValueError, "mismatched"):
            parser.feed("<main><section></main></section>")

    def test_quiz_configuration_and_answer_ranges(self) -> None:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js") as script_file:
            script_file.write(_QUIZ_VALIDATOR)
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

    def test_broken_quiz_schemas_are_rejected(self) -> None:
        invalid_questions = {
            "scq": '{type:"scq",stem:"broken",answer:0,explain:"why"}',
            "tf": '{type:"tf",stem:"broken",answer:"false",explain:"why"}',
            "match": '{type:"match",stem:"broken",pairs:[{l:"left"}],explain:"why"}',
            "open": '{type:"open",stem:"broken",hint:"hint"}',
        }
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js") as script_file:
            script_file.write(_QUIZ_VALIDATOR)
            script_file.flush()
            for question_type, question in invalid_questions.items():
                with self.subTest(question_type=question_type):
                    with tempfile.NamedTemporaryFile(mode="w", suffix=".html") as page:
                        page.write(
                            f"<script>window.QUIZ={{questions:[{question}]}};</script>"
                        )
                        page.flush()
                        result = subprocess.run(
                            ["node", script_file.name, page.name],
                            capture_output=True,
                            text=True,
                        )
                        self.assertNotEqual(result.returncode, 0, result.stdout)

    def test_current_and_historical_labels(self) -> None:
        d1 = _page_text("weeks/w07/w07d1.html")
        d2 = _page_text("weeks/w07/w07d2.html")
        d3 = _page_text("weeks/w07/w07d3.html")
        d5 = _page_text("weeks/w07/w07d5.html")
        w8d3 = _page_text("weeks/w08/w08d3.html")

        for page in (d1, d3):
            self.assertIn("course platform itself uses Langfuse", page)
            self.assertIn("transferable object", page)
        self.assertIn("landmark 2023 judge study", d2)
        self.assertIn("not a current model recommendation", d2)
        self.assertIn(
            "2023 historical study by Wang et al., \"Large Language Models are not Fair Evaluators,\" "
            "with the then-current ChatGPT as evaluator",
            d2,
        )
        self.assertIn("LLM-AS-JUDGE · 2023\\n>80% agreement", d2)
        self.assertIn("position bias · 2023\\n66/80 flipped", d2)
        self.assertIn("2023 historical study</b> reported ~80% agreement", d2)
        self.assertIn("the 2023 study flipped 66/80 verdicts", d2)
        self.assertIn("A 2023 historical study finding ~80% judge agreement", d2)
        self.assertIn("In that 2023 result, ~80% was the level of agreement", d2)
        self.assertIn("accessed August 6, 2026", d5)
        self.assertIn("not current-model recommendations", d5)
        self.assertIn("November 23, 2023 historical fact-checking evaluation", w8d3)
        self.assertIn("January 8, 2024 historical evaluation", w8d3)
        self.assertIn("not current app-model recommendations", w8d3)

    def test_no_retired_api_or_unlabelled_o3_recommendation(self) -> None:
        corpus = "\n".join(page.read_text() for page in WEEK_PAGES)
        self.assertIsNone(re.search(r"\bo3(?:-[\w.-]+)?\b", corpus, flags=re.IGNORECASE))
        self.assertNotIn("Assistants API", corpus)
        self.assertIn("Responses API", (ROOT / "weeks/w07/w07d5.html").read_text())

    def test_owasp_2026_list_is_preserved(self) -> None:
        page = _page_text("weeks/w08/w08d1.html")
        expected = (
            "LLM01 Prompt Injection · LLM02 Sensitive Information Disclosure · LLM03 "
            "Excessive Agency · LLM04 Supply Chain · LLM05 Data and Model Poisoning · LLM06 Unbounded Consumption · LLM07 "
            "Misinformation · LLM08 Hidden Context Exposure · LLM09 Vector and Embedding Weaknesses · LLM10 Improper Output "
            "Handling."
        )
        self.assertIn(expected, page)
        self.assertNotIn("two days before this page was written", page)


if __name__ == "__main__":
    unittest.main()
