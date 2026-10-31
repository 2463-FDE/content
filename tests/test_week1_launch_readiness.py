"""Week 1 authoritative-source, Core-30, fallback, and launch-surface contract.

Week 1 uses the same singular-topic hierarchy as every later week: one route
per program day (d1–d5). The former two-part days (d2a/d2b, d3a/d3b, d4a/d4b)
remain on disk only as moved-lesson alias stubs that forward old deep links to
the consolidated route.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

import core30


ROOT = core30.ROOT
WEEK1 = tuple(ROOT / "weeks" / "w01" / name for name in (
    "d1.html", "d2.html", "d3.html", "d4.html", "d5.html",
))
PROVIDER_ROUTES = {"d2.html", "d4.html"}
# Alias stub → consolidated target it must forward to.
ALIAS_STUBS = {
    "d2a.html": "d2.html", "d2b.html": "d2.html",
    "d3a.html": "d3.html", "d3b.html": "d3.html",
    "d4a.html": "d4.html", "d4b.html": "d4.html",
}
EXPECTED_SOURCE_COUNTS = {"MON": 7, "TUE": 9, "WED": 8, "THU": 9, "FRI": 7}
# Per-route required interactions and comprehension-check questions on the
# selected-provider path (None = no provider blocks on the route).
EXPECTED_SHAPE = {
    "d1.html": {"interactions": 1, "questions": 6},
    "d2.html": {"interactions": 2, "questions": 9},
    "d3.html": {"interactions": 2, "questions": 6},
    "d4.html": {"interactions": 3, "questions": 7},
    "d5.html": {"interactions": 1, "questions": 6},
}
# Advertised check minutes by question count (matches the authored labels).
CHECK_MINUTES = {6: 5, 7: 5, 9: 6}


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

    def test_week1_is_singular_topic_like_every_later_week(self) -> None:
        """One route per day, no multi-part presentation anywhere in the map."""
        map_text = (ROOT / "assets/js/curriculum-map.js").read_text(encoding="utf-8")
        self.assertNotIn("parts:", map_text, "the multi-part day format is retired")
        w01_hrefs = re.findall(r'href: "(weeks/w01/[^"]+\.html)"', map_text)
        self.assertEqual(w01_hrefs, [
            "weeks/w01/d1.html", "weeks/w01/d2.html", "weeks/w01/d3.html",
            "weeks/w01/d4.html", "weeks/w01/d5.html",
        ])
        hub = (ROOT / "index.html").read_text(encoding="utf-8")
        for stub in ALIAS_STUBS:
            self.assertNotIn(f"w01/{stub}", hub, "the hub launchpad lists only day routes")

    def test_old_part_deep_links_forward_to_the_consolidated_route(self) -> None:
        for stub, target in ALIAS_STUBS.items():
            path = ROOT / "weeks" / "w01" / stub
            with self.subTest(stub=stub):
                html = path.read_text(encoding="utf-8")
                self.assertIn(f'http-equiv="refresh" content="0; url={target}"', html)
                self.assertIn(f'<link rel="canonical" href="{target}"', html)
                self.assertIn(f'<a href="{target}"', html)
                self.assertIn("index.html#curriculum", html, "a no-refresh return path exists")
                self.assertIn("lesson moved", html.lower())

    def test_all_five_routes_meet_complete_core30_contract(self) -> None:
        totals = []
        for page in WEEK1:
            root = core30.parse(page)
            article = core30.reading_article(root)
            selections = core30.SELECTIONS if page.name in PROVIDER_ROUTES else (None,)
            shape = EXPECTED_SHAPE[page.name]
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
                    label = core30.label_for(article, selection or "aws")
                    read_minutes = round(words / core30.WPM)
                    total_minutes = (read_minutes + 3 + 4 * shape["interactions"]
                                     + CHECK_MINUTES[shape["questions"]])

                    self.assertGreaterEqual(words, 700)
                    self.assertLessEqual(words, core30.WORD_BUDGET)
                    self.assertEqual(len(interactions), shape["interactions"])
                    self.assertEqual(undeclared, [], "every live required widget must be counted")
                    self.assertEqual(questions, shape["questions"])
                    self.assertTrue(all(node.attrs.get("data-interaction-kind") for node in interactions))
                    self.assertIn(f"~{read_minutes} min read", label)
                    self.assertIn(f"{shape['interactions']} interaction", label)
                    self.assertIn(f"{shape['questions']}-Q check", label)
                    self.assertIn(f"~{total_minutes} min required", label)
                    self.assertLessEqual(total_minutes, 30)
                    label_nodes = [node for node in core30.labels(article)
                                   if node.attrs.get("data-cloud") in (selection, None)]
                    self.assertEqual(label_nodes[0].attrs.get("data-core-words"), str(words))
                    totals.append(total_minutes)
        self.assertEqual(len(totals), 7)
        self.assertEqual((min(totals), max(totals)), (21, 29))

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
        day_anchors = ("MON", "TUE", "WED", "THU", "FRI")
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

    def test_day_routes_chain_like_later_weeks(self) -> None:
        """The learner path d1→d2→d3→d4→d5 uses the shared crumb/nav grammar."""
        hrefs = [page.name for page in WEEK1]
        for index, page in enumerate(WEEK1):
            html = page.read_text(encoding="utf-8")
            with self.subTest(route=page.name):
                if index > 0:
                    self.assertIn(f'rel="prev" href="{hrefs[index - 1]}"', html)
                if index < len(WEEK1) - 1:
                    self.assertIn(f'rel="next" href="{hrefs[index + 1]}"', html)
                else:
                    self.assertIn('rel="next" href="../w02/w02d1.html"', html)
                for stub in ALIAS_STUBS:
                    self.assertNotIn(f'href="{stub}"', html, "day routes never navigate to a retired part page")

    def test_hub_and_trainer_have_honest_static_recovery_paths(self) -> None:
        hub = core30.parse(ROOT / "index.html")
        trainer = core30.parse(ROOT / "trainer.html")
        hub_text = core30.text_of(hub)
        trainer_text = core30.text_of(trainer)
        static_links = [node.attrs.get("href", "") for node in hub.find_all("a")
                        if "weeks/w01/" in node.attrs.get("href", "")]

        self.assertIn("Next batch: number not provided", hub_text)
        # The static launchpad now covers the full program (all ten weeks).
        self.assertIn("Full program static launchpad", hub_text)
        self.assertTrue(all("batch=2567" in href for href in static_links if "?" in href))
        self.assertIn("JavaScript is required for the private trainer dashboard", trainer_text)
        self.assertIn("authorization cannot be verified", trainer_text)
        self.assertNotIn("reference solution", trainer_text.lower())
        self.assertNotIn("answer key", trainer_text.lower())

    def test_week1_service_order_and_cloud_choices_are_preserved(self) -> None:
        hub = (ROOT / "index.html").read_text(encoding="utf-8")
        d2 = core30.text_of(core30.parse(ROOT / "weeks/w01/d2.html"))
        d5 = core30.text_of(core30.parse(ROOT / "weeks/w01/d5.html"))
        self.assertLess(d2.index("model access and inference profiles"), d2.index("Converse/streaming"))
        self.assertLess(d2.index("Converse/streaming"), d2.index("quotas and cross-region inference"))
        self.assertLess(d2.index("provisioned versus on-demand"), d2.index("bounded retry/backoff"))
        self.assertIn("Amazon Bedrock", d5)
        self.assertIn("Gemini/Model Garden", d5)
        self.assertNotIn("Terraform", "\n".join(core30.text_of(core30.parse(page)) for page in WEEK1))
        # Week titles live in the shared curriculum map consumed by the hub.
        self.assertIn(
            "Production LLM Engineering on Bedrock & Claude Code",
            (ROOT / "assets/js/curriculum-map.js").read_text(encoding="utf-8"),
        )
        self.assertIn("Production LLM Engineering on Bedrock &amp; Claude Code", hub)


if __name__ == "__main__":
    unittest.main()
