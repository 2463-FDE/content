"""Focused current-model, arithmetic, routing, and narrow-layout contracts for Week 1."""

from __future__ import annotations

import re
import subprocess
import unittest
from pathlib import Path

import core30

ROOT = Path(__file__).resolve().parents[1]
W1 = sorted((ROOT / "weeks" / "w01").glob("d*.html"))


class Week1CurrencyTests(unittest.TestCase):
    def test_current_catalog_snapshot_replaces_obsolete_labels(self) -> None:
        contract = "\n".join(path.read_text(encoding="utf-8") for path in W1)
        for stale in (
            "GPT-5.5", "Opus 4.8", "Sonnet 4.6", "Gemini 3.5 Flash",
            "claude-sonnet-4-6-v1", "claude-haiku-4-5-20251001",
        ):
            self.assertNotIn(stale, contract)
        for current in (
            "Fable 5.1", "Opus 5.5", "Sonnet 5.5", "Haiku 5.5",
            "GPT-6 Astra", "GPT-6.1 Sol", "GPT-6.1 Terra", "GPT-6 Luna",
            "Gemini 3.8 Flash",
        ):
            self.assertIn(current, contract)

        page = core30.parse(ROOT / "weeks" / "w01" / "d2a.html")
        tables = [node for node in page.find_all("table") if "w1-model-table" in node.classes()]
        self.assertEqual(2, len(tables))
        rendered_rows = {
            " ".join(" ".join(core30.text_of(cell).split())
                     for cell in row.find_all("th") + row.find_all("td"))
            for row in tables[0].find_all("tr")
        }
        for row in (
            "Anthropic Fable 5.1 $10 $50 current",
            "Anthropic Opus 5.5 $4 $20 current",
            "Anthropic Sonnet 5.5 $2 $10 current",
            "Anthropic Haiku 5.5 from $0.10 from $0.50 current",
            "OpenAI GPT-6 Astra $10 $50 standard",
            "OpenAI GPT-6.1 Sol $2 $10 standard",
            "OpenAI GPT-6.1 Terra $1 $5 standard",
            "OpenAI GPT-6 Luna $0.10 $0.50 standard",
            "Google Gemini 3.8 Flash $0.75 $3.75 through 2026-12-31",
        ):
            self.assertIn(row, rendered_rows)

    def test_worked_costs_and_cache_math_are_internally_consistent(self) -> None:
        d1 = (ROOT / "weeks" / "w01" / "d1.html").read_text(encoding="utf-8")
        d4 = (ROOT / "weeks" / "w01" / "d4a.html").read_text(encoding="utf-8")
        input_rate, output_rate = 2 / 1_000_000, 10 / 1_000_000

        d1_call = 4_800 * input_rate + 400 * output_rate
        self.assertAlmostEqual(0.0136, d1_call)
        self.assertIn("$0.0136 per turn", d1)
        self.assertIn(f"${d1_call * 50_000:,.0f}/day", d1)
        self.assertIn(f"${1_200 * input_rate * 50_000:,.0f}/day", d1)

        d4_call = 5_800 * input_rate + 400 * output_rate
        cached = ((5_800 - 4_500) + 4_500 * 0.05) * input_rate + 400 * output_rate
        savings = (d4_call - cached) * 40_000
        self.assertIn(f"${d4_call:.4f} / turn", d4)
        self.assertIn(f"${d4_call * 40_000:,.0f}/day", d4)
        self.assertAlmostEqual(0.00705, cached)
        self.assertIn("$0.0071", d4)
        self.assertIn(f"${savings:,.0f}/day saved", d4)
        self.assertIn("1.25×) + 9 reads (0.05× each = 0.45) = <b>1.70", d4)
        self.assertIn("<b>83%</b> cut", d4)

    def test_widget_defaults_and_raw_value_contract_match_dated_math(self) -> None:
        script = (ROOT / "assets" / "js" / "interactive.js").read_text(encoding="utf-8")
        for selector, value in (("c-in", "4800"), ("c-out", "400"), ("c-pin", "2"),
                                ("c-pout", "10"), ("c-n", "50000")):
            self.assertRegex(script, rf'class="{selector}"[^>]+value="{value}"')
        self.assertIn('output.dataset.value = String(amount)', script)
        self.assertIn("new Intl.NumberFormat(undefined", script)

    def test_bedrock_ids_are_endpoint_scoped_and_not_overclaimed(self) -> None:
        d2b = (ROOT / "weeks" / "w01" / "d2b.html").read_text(encoding="utf-8")
        all_w1 = "\n".join(path.read_text(encoding="utf-8") for path in W1)
        self.assertIn("us.anthropic.claude-haiku-5-5", all_w1)
        self.assertIn("us.anthropic.claude-sonnet-5-5", all_w1)
        self.assertIn("can route across US Regions", d2b)
        self.assertIn("not single-Region promises", d2b)
        self.assertIn("bare in-Region IDs", d2b)
        self.assertIn("bedrock-mantle", d2b)
        self.assertIn("Do not guess a", d2b)
        self.assertIn("made no AWS account call", d2b)
        self.assertIn("model-card-anthropic-claude-haiku-5-5.html", d2b)
        self.assertIn("model-card-anthropic-claude-sonnet-5-5.html", d2b)

    def test_price_and_scorecard_tables_and_topbar_are_narrow_safe(self) -> None:
        d2a = (ROOT / "weeks" / "w01" / "d2a.html").read_text(encoding="utf-8")
        css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
        self.assertEqual(2, d2a.count('class="w1-table-wrap"'))
        self.assertNotIn("AXIS (weight)", d2a)
        self.assertRegex(css, r"\.w1-table-wrap\s*\{[^}]*overflow-x:auto")
        self.assertRegex(css, r"@media \(max-width:380px\)\s*\{[^}]*\.topbar-right")
        self.assertRegex(css, r"@media print\s*\{\s*\.w1-table-wrap\s*\{[^}]*overflow:visible")

    def test_reverification_record_and_inline_scripts_are_present_and_valid(self) -> None:
        research = (ROOT / "docs" / "research" / "w01" / "w01-currency-2026-10-27.md").read_text(encoding="utf-8")
        self.assertIn("PR 15 and its divergent local-only head remain untouched", research)
        self.assertIn("facts deliberately not ported", research)
        self.assertGreaterEqual(research.count("https://"), 12)
        self.assertIn("2026-10-27", research)

        for path in W1:
            with self.subTest(page=path.name):
                html = path.read_text(encoding="utf-8")
                scripts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>", html, re.I)
                probe = "const vm=require('vm');let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>new vm.Script(s));"
                for script in scripts:
                    subprocess.run(["node", "-e", probe], input=script, text=True, check=True)


if __name__ == "__main__":
    unittest.main()
