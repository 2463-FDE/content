"""Core 30 per selected provider, for every reading page that carries AWS/GCP blocks.

Frozen rules (see core30.py): required words ≤ 1,800 for each provider path; the
path's label advertises round(words/150) minutes, the true count of required
interactions, and that path's question count. Other-cloud blocks are optional
comparison depth. Without JavaScript every provider block is open and labelled.
"""

from __future__ import annotations

import re
import unittest

import core30

PAGES = core30.cloud_pages()


class CloudCore30(unittest.TestCase):
    def test_there_are_provider_pages(self) -> None:
        self.assertTrue(PAGES, "no page carries AWS/GCP provider blocks")

    def test_each_path_fits_core30_and_labels_are_true(self) -> None:
        for page in PAGES:
            for selection in core30.SELECTIONS:
                with self.subTest(page=page.name, selection=selection):
                    m = core30.measure(page, selection)
                    self.assertLessEqual(m["words"], core30.WORD_BUDGET)
                    self.assertGreater(m["words"], 500, "required path implausibly small")
                    label = m["label"]
                    self.assertTrue(label.startswith("Core 30 ·"), label)
                    self.assertIn(f"· {selection.upper()} ·", label)
                    minutes = re.search(r"~(\d+) min read", label)
                    self.assertIsNotNone(minutes, label)
                    self.assertEqual(int(minutes.group(1)), round(m["words"] / core30.WPM))
                    count = re.search(r"· (\d+) interactions? ·", label)
                    self.assertIsNotNone(count, label)
                    self.assertEqual(int(count.group(1)), m["interactions"])
                    # The 2026-10-30 learning-experience correction adds up to
                    # two substantive activities per day beside the base
                    # practice(s); depth >=2 per route is enforced by
                    # test_learning_experience.py.
                    self.assertGreaterEqual(m["interactions"], 1)
                    self.assertLessEqual(m["interactions"], 4)
                    self.assertEqual(m["stray_widgets"], [], "live widgets on the required path must be the declared interaction")
                    check = re.search(r"· (\d+)-Q check", label)
                    self.assertIsNotNone(check, label)
                    self.assertEqual(int(check.group(1)), m["questions"])

    def test_both_paths_exist_and_degrade_without_javascript(self) -> None:
        for page in PAGES:
            with self.subTest(page=page.name):
                article = core30.reading_article(core30.parse(page))
                blocks = [e for e in article.find_all("details") if "cloud-block" in e.classes()]
                self.assertEqual({b.attrs.get("data-cloud") for b in blocks}, {"aws", "gcp"})
                for block in blocks:
                    self.assertIn("open", block.attrs, "provider blocks are open in static markup")
                    summary = block.find_all("summary")
                    self.assertTrue(summary and core30.text_of(summary[0]), "provider block needs a visible summary")
                    tags = [e for e in summary[0].find_all("span") if "cloud-tag" in e.classes()]
                    self.assertEqual([core30.text_of(t) for t in tags], [block.attrs["data-cloud"].upper()])
                stray = [e for e in article.find_all(attr="data-cloud")
                         if "cloud-block" not in e.classes() and "core30-meta" not in e.classes()
                         and not any(e in b.find_all() for b in blocks)]
                self.assertEqual(stray, [], "provider content must sit inside a provider block")
                labels = {e.attrs.get("data-cloud") for e in core30.labels(article)}
                self.assertEqual(labels, {"aws", "gcp"}, "one static Core-30 label per path")

    def test_optional_depth_and_sources_are_marked(self) -> None:
        for page in PAGES:
            with self.subTest(page=page.name):
                article = core30.reading_article(core30.parse(page))
                for block in [e for e in article.find_all("details") if "deep" in e.classes()]:
                    self.assertEqual(block.attrs.get("data-core"), "optional")
                sources = [e for e in article.find_all("section") if "reading-sources" in e.classes()]
                self.assertEqual(len(sources), 1)
                self.assertEqual(sources[0].attrs.get("data-core"), "optional")

    def test_provider_interactions_belong_to_their_block(self) -> None:
        for page in PAGES:
            with self.subTest(page=page.name):
                article = core30.reading_article(core30.parse(page))
                for block in [e for e in article.find_all("details") if "cloud-block" in e.classes()]:
                    for node in block.find_all(attr="data-cloud"):
                        if node is not block:
                            self.assertEqual(node.attrs["data-cloud"], block.attrs["data-cloud"])

    def test_code_popups_offer_each_path(self) -> None:
        for page in PAGES:
            root = core30.parse(page)
            raws = [e for e in root.find_all("pre") if "cv-raw" in e.classes() and e.attrs.get("data-cloud")]
            if not raws:
                continue
            with self.subTest(page=page.name):
                self.assertEqual(sorted(r.attrs["data-cloud"] for r in raws), ["aws", "gcp"])
                for raw in raws:
                    self.assertTrue(raw.attrs.get("data-file", "").startswith(raw.attrs["data-cloud"] + " · "))

    def test_provider_sources_trace_to_a_research_artifact(self) -> None:
        for page in PAGES:
            with self.subTest(page=page.name):
                artifact = core30.ROOT / "docs" / "research" / page.parent.name / f"{page.stem}-provider-paths.md"
                self.assertTrue(artifact.is_file(), f"missing {artifact.relative_to(core30.ROOT)}")
                evidence = artifact.read_text(encoding="utf-8")
                self.assertIn("accessed 2026-10-14", evidence.lower())
                article = core30.reading_article(core30.parse(page))
                sources = [e for e in article.find_all("section") if "reading-sources" in e.classes()][0]
                provider_links = [a.attrs["href"] for a in sources.find_all("a")
                                  if any(host in a.attrs.get("href", "") for host in ("aws.amazon.com", "cloud.google.com"))]
                self.assertTrue(provider_links, "provider blocks must cite first-party provider sources")
                for href in provider_links:
                    self.assertIn(href, evidence, f"{href} is cited on the page but not in the research artifact")


if __name__ == "__main__":
    unittest.main()
