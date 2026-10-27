"""Week 1 authoritative-source, Core-30, fallback, and launch-surface contract."""

from __future__ import annotations

import re
import unittest
from pathlib import Path

import core30


ROOT = core30.ROOT
WEEK1 = tuple(ROOT / "weeks" / "w01" / name for name in (
    "d1.html", "d2a.html", "d2b.html", "d3a.html",
    "d3b.html", "d4a.html", "d4b.html", "d5.html",
))
PROVIDER_ROUTES = {"d2b.html", "d4b.html"}
EXPECTED_SOURCE_COUNTS = {"MON": 7, "TUE": 9, "WED": 8, "THU": 9, "FRI": 7}


def elements(root: core30.Element, *, tag: str | None = None, cls: str | None = None):
    found = root.find_all(tag)
    return [node for node in found if cls is None or cls in node.classes()]


class Week1LaunchReadinessTests(unittest.TestCase):
    def test_authoritative_source_record_has_exact_40_line_denominator(self) -> None:
        record = (ROOT / "docs/research/w01/w01-v3-source-coverage.md").read_text(encoding="utf-8")
        rows = re.findall(r"^\| (\d+) \| p\.1 (MON|TUE|WED|THU|FRI) \|", record, re.MULTILINE)
        self.assertEqual([int(number) for number, _ in rows], list(range(1, 41)))
        for day, expected in EXPECTED_SOURCE_COUNTS.items():
            self.assertEqual(sum(anchor == day for _, anchor in rows), expected)
        self.assertIn("40/40", record)
        self.assertIn("0 unexplained omissions", record)
        self.assertIn("No batch number appears", record)

    def test_all_eight_routes_meet_complete_core30_contract(self) -> None:
        measured = []
        for page in WEEK1:
            root = core30.parse(page)
            article = core30.reading_article(root)
            selections = core30.SELECTIONS if page.name in PROVIDER_ROUTES else (None,)
            for selection in selections:
                with self.subTest(route=page.name, cloud=selection):
                    words = core30.required_words(article, selection)
                    nodes = core30.required_nodes(article, selection)
                    interactions = [node for node in nodes if "data-core-interaction" in node.attrs]
                    live_mounts = core30.WIDGET_MOUNT_CLASSES | {"ix-run", "ix-cost", "ix-temp", "ix-tokens"}
                    undeclared = [node for node in nodes
                                  if node.classes() & live_mounts and "data-core-interaction" not in node.attrs]
                    clouds = core30.quiz_clouds(root)
                    questions = sum(cloud in (None, selection) for cloud in clouds)
                    expected_interactions = 2 if selection else 1
                    expected_questions = 7 if selection else 6
                    label = core30.label_for(article, selection or "aws")
                    read_minutes = round(words / core30.WPM)
                    total_minutes = read_minutes + 3 + (4 * expected_interactions) + 5

                    self.assertGreaterEqual(words, 700)
                    self.assertLessEqual(words, core30.WORD_BUDGET)
                    self.assertEqual(len(interactions), expected_interactions)
                    self.assertEqual(undeclared, [], "every live required widget must be counted")
                    self.assertEqual(questions, expected_questions)
                    self.assertTrue(all(node.attrs.get("data-interaction-kind") for node in interactions))
                    self.assertIn(f"~{read_minutes} min read", label)
                    self.assertIn(f"{expected_interactions} interaction", label)
                    self.assertIn(f"{expected_questions}-Q check", label)
                    self.assertIn(f"~{total_minutes} min required", label)
                    self.assertLessEqual(total_minutes, 30)
                    label_nodes = [node for node in core30.labels(article)
                                   if node.attrs.get("data-cloud") in (selection, None)]
                    self.assertEqual(label_nodes[0].attrs.get("data-core-words"), str(words))
                    measured.append(total_minutes)
        self.assertEqual(len(measured), 10)
        self.assertEqual((min(measured), max(measured)), (19, 22))

    def test_long_form_depth_is_progressive_disclosure_not_deleted(self) -> None:
        for page in WEEK1:
            root = core30.parse(page)
            article = core30.reading_article(root)
            optional = [node for node in elements(article, tag="details", cls="deep")
                        if node.attrs.get("data-core") == "optional"]
            sources = elements(article, tag="section", cls="reading-sources")
            with self.subTest(route=page.name):
                self.assertGreaterEqual(len(optional), 2)
                self.assertEqual(len(sources), 1)
                self.assertEqual(sources[0].attrs.get("data-core"), "optional")
                moved_depth = [details for details in optional if "w1-optional" in details.classes()]
                summaries = [core30.text_of(node) for details in moved_depth
                             for node in details.children if isinstance(node, core30.Element) and node.tag == "summary"]
                self.assertGreaterEqual(len(summaries), 2)
                self.assertTrue(all("outside Core 30" in summary for summary in summaries))

    def test_each_route_exposes_source_anchor_static_diagram_fallback_and_navigation(self) -> None:
        day_anchors = ("MON", "TUE", "TUE", "WED", "WED", "THU", "THU", "FRI")
        for page, day in zip(WEEK1, day_anchors):
            root = core30.parse(page)
            anchors = [node for node in root.find_all(attr="data-source-anchor")]
            noscripts = root.find_all("noscript")
            static_diagrams = elements(root, cls="static-diagram")
            next_links = [node for node in elements(root, tag="a", cls="snav-next") if node.attrs.get("href")]
            with self.subTest(route=page.name):
                self.assertEqual(len(anchors), 1)
                self.assertEqual(anchors[0].attrs.get("data-source-anchor"), f"PDF p.1 · {day}")
                self.assertTrue(any("Static Core 30 fallback" in core30.text_of(node) for node in noscripts))
                self.assertEqual(len(static_diagrams), 1)
                self.assertEqual(static_diagrams[0].attrs.get("role"), "img")
                self.assertEqual(len(next_links), 1)
                self.assertEqual(len(elements(root, tag="a", cls="skip-link")), 1)

    def test_hub_and_trainer_have_honest_static_recovery_paths(self) -> None:
        hub = core30.parse(ROOT / "index.html")
        trainer = core30.parse(ROOT / "trainer.html")
        hub_text = core30.text_of(hub)
        trainer_text = core30.text_of(trainer)
        static_links = [node.attrs.get("href", "") for node in hub.find_all("a")
                        if "weeks/w01/" in node.attrs.get("href", "")]

        self.assertIn("Next batch: number not provided", hub_text)
        self.assertIn("Week 1 static launchpad", hub_text)
        self.assertTrue(all("batch=2567" in href for href in static_links if "?" in href))
        self.assertIn("JavaScript is required for the private trainer dashboard", trainer_text)
        self.assertIn("authorization cannot be verified", trainer_text)
        self.assertNotIn("reference solution", trainer_text.lower())
        self.assertNotIn("answer key", trainer_text.lower())

    def test_week1_service_order_and_cloud_choices_are_preserved(self) -> None:
        hub = (ROOT / "index.html").read_text(encoding="utf-8")
        d2b = core30.text_of(core30.parse(ROOT / "weeks/w01/d2b.html"))
        d5 = core30.text_of(core30.parse(ROOT / "weeks/w01/d5.html"))
        self.assertLess(d2b.index("model access and inference profiles"), d2b.index("Converse/streaming"))
        self.assertLess(d2b.index("Converse/streaming"), d2b.index("quotas and cross-region inference"))
        self.assertLess(d2b.index("provisioned versus on-demand"), d2b.index("bounded retry/backoff"))
        self.assertIn("Amazon Bedrock", d5)
        self.assertIn("Gemini/Model Garden", d5)
        self.assertNotIn("Terraform", "\n".join(core30.text_of(core30.parse(page)) for page in WEEK1))
        self.assertIn("Production LLM Engineering on Bedrock & Claude Code", hub)


if __name__ == "__main__":
    unittest.main()
