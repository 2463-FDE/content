"""Authoritative LTIM FDE v3 production contracts for Weeks 2–4."""

from __future__ import annotations

import re
import unittest
from pathlib import Path

import core30

ROOT = Path(__file__).resolve().parents[1]
PAGES = [ROOT / "weeks" / f"w{week:02d}" / f"w{week:02d}d{day}.html"
         for week in range(2, 5) for day in range(1, 6)]


class WeeksTwoToFourProductionWave(unittest.TestCase):
    def _inventory_rows(self) -> list[dict[str, object]]:
        inventory = (ROOT / "docs" / "research" / "w02-w04-v3-production-wave.md").read_text(encoding="utf-8")
        rows = []
        for line in inventory.splitlines():
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            match = re.fullmatch(r"W(\d) D(\d)", cells[0]) if len(cells) == 6 else None
            if not match:
                continue
            routes = re.findall(r"`([^`]+\.html)`", cells[3])
            rows.append({"week": int(match.group(1)), "day": int(match.group(2)),
                         "items": int(cells[1]), "route": routes[0] if routes else None})
        return rows

    def test_inventory_reconciles_124_items_across_15_owned_routes(self) -> None:
        rows = self._inventory_rows()
        self.assertEqual(15, len(rows))
        self.assertEqual(124, sum(row["items"] for row in rows))
        per_week = {week: sum(row["items"] for row in rows if row["week"] == week) for week in (2, 3, 4)}
        self.assertEqual({2: 40, 3: 42, 4: 42}, per_week)
        expected = [page.relative_to(ROOT).as_posix() for page in PAGES]
        self.assertEqual(expected, [row["route"] for row in rows])
        self.assertEqual([(week, day) for week in range(2, 5) for day in range(1, 6)],
                         [(row["week"], row["day"]) for row in rows])
        for page in PAGES:
            self.assertTrue(page.is_file())

    def test_every_route_has_truthful_core30_interaction_and_check(self) -> None:
        for page in PAGES:
            root = core30.parse(page)
            article = core30.reading_article(root)
            cloud_blocks = [node for node in article.find_all("details") if "cloud-block" in node.classes()]
            for selection in core30.SELECTIONS:
                with self.subTest(page=page.relative_to(ROOT), selection=selection):
                    measured = core30.measure(page, selection)
                    self.assertGreaterEqual(measured["words"], 500)
                    self.assertLessEqual(measured["words"], core30.WORD_BUDGET)
                    # 2026-10-30 correction: up to two shipped activities join the base practice.
                    self.assertIn(measured["interactions"], (1, 2, 3, 4))
                    self.assertGreaterEqual(measured["questions"], 5)
                    self.assertEqual([], measured["stray_widgets"])
                    label = measured["label"]
                    self.assertEqual(round(measured["words"] / core30.WPM), int(re.search(r"~(\d+) min read", label).group(1)))
                    self.assertEqual(measured["interactions"], int(re.search(r"· (\d+) interactions? ·", label).group(1)))
                    self.assertEqual(measured["questions"], int(re.search(r"· (\d+)-Q check", label).group(1)))
                    if cloud_blocks:
                        self.assertIn(f"· {selection.upper()} ·", label)
            self.assertGreaterEqual(len([node for node in article.find_all("section") if "step" in node.classes()]), 7)

    def test_optional_depth_and_no_javascript_fallbacks_are_semantic(self) -> None:
        for page in PAGES:
            article = core30.reading_article(core30.parse(page))
            with self.subTest(page=page.relative_to(ROOT)):
                deep = [node for node in article.find_all("details") if "deep" in node.classes()]
                self.assertTrue(deep)
                self.assertTrue(all(node.attrs.get("data-core") == "optional" for node in deep))
                fallbacks = [node for node in article.find_all("section") if "core30-fallback" in node.classes()]
                self.assertTrue(fallbacks)
                self.assertTrue(fallbacks[0].find_all("details"))
                self.assertTrue(fallbacks[0].find_all("summary"))

    def test_solo_insurance_project_advances_every_day_without_client_claims(self) -> None:
        for page in PAGES:
            article = core30.reading_article(core30.parse(page))
            projects = [node for node in article.find_all() if "project-progress" in node.classes()]
            with self.subTest(page=page.relative_to(ROOT)):
                self.assertEqual(1, len(projects))
                text = core30.text_of(projects[0]).lower()
                self.assertIn("solo insurance brownfield", text)
                self.assertTrue(any(word in text for word in ("advance", "submit", "complete")))
        d5 = core30.text_of(core30.reading_article(core30.parse(ROOT / "weeks" / "w04" / "w04d5.html")))
        self.assertIn("still solo this week", d5)
        self.assertIn("do not create a Project 2 team cloud yet", d5)

    def test_source_gaps_are_restored_on_the_owned_routes(self) -> None:
        expected = {
            "weeks/w02/w02d5.html": ("Claude Code skills retro", "executive version", "technical version", "feedback"),
            "weeks/w03/w03d1.html": ("Plan-and-Execute", "Reflexion", "deterministic workflow"),
            "weeks/w03/w03d2.html": ("confidence bands", "escalation", "inert Python MCP lab", "idempotency"),
            "weeks/w03/w03d3.html": ("stack-onboarding", "tool/MCP boundary", "assumption"),
            "weeks/w03/w03d5.html": ("eval suite", "structured logs", "Replay", "failure-attribution", "hooks retro"),
            "weeks/w04/w04d2.html": ("typed envelope", "merge policy", "conflict", "interoperate"),
            "weeks/w04/w04d4.html": ("token", "approval", "trace", "cost", "ChatBedrock", "ChatAnthropicVertex", "Claude Code subagents"),
            "weeks/w04/w04d5.html": ("structural handoff", "ServiceNow", "Jira", "Agent Runtime", "architecture defense", "executive readout"),
        }
        for relative, terms in expected.items():
            article = core30.reading_article(core30.parse(ROOT / relative))
            rendered_text = core30.text_of(article).lower()
            with self.subTest(page=relative):
                for term in terms:
                    self.assertIn(term.lower(), rendered_text)

    def test_trainer_navigation_reaches_daily_evidence_routes(self) -> None:
        root = core30.parse(ROOT / "trainer.html")
        hrefs = {node.attrs.get("href") for node in root.find_all("a")}
        for route in ("weeks/w02/w02d5.html", "weeks/w03/w03d5.html", "weeks/w04/w04d5.html"):
            self.assertIn(route, hrefs)


if __name__ == "__main__":
    unittest.main()
