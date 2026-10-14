"""Public artifact and provenance contract for sanitized Week 6 Archify figures."""

from __future__ import annotations

import hashlib
import json
import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEK = ROOT / "weeks" / "w06"
PROVENANCE = ROOT / "docs" / "research" / "w06" / "archify-provenance.json"
LESSONS = tuple(f"w06d{day}" for day in range(1, 6))
FIGURE_RE = re.compile(rb'<figure class="fde-diagram"[^>]*data-archify-visual[^>]*>.*?</figure>', re.DOTALL)
SVG_RE = re.compile(rb"<svg\b.*?</svg>\n", re.DOTALL)
FORBIDDEN_RE = re.compile(
    rb"<script|foreignObject|<image|<(?:iframe|object|embed)|\s+on[a-z0-9_-]+\s*=|"
    rb"(?:@import|@font-face|JetBrains)|(?:href|src)\s*=|"
    rb"url\s*\(\s*[\"']?(?:https?:|//|data:)",
    re.IGNORECASE,
)
EXPECTED_SOURCE = {
    "version": "v3.0.1",
    "tag_object": "679f195584e4216fd582c073d8964b3a9f59107e",
    "peeled_commit": "2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c",
    "commit_tree": "b33243ebe2bd6878a9ae58417ff8597c94d31e12",
    "archify_subtree": "7dcd73a73672d5da4f85d4c612017b478547303b",
    "release_zip_sha256": "b0b23bd28db314f04ca8ab9620fe20f8c1ac6474a3546bd8fe4679508aa1b7f5",
}
EXPECTED_SANITIZER = "266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c"
EXPECTED_SANDBOX = "23661042fd8a9235ec664270d5ebec83c5d399bd0cd79f831277692754f42359"
PRESENTATION_STYLE = b".fde-diagram .c-grid{fill:none}"


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class DocumentContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.scripts: list[str] = []
        self.archify_figures = 0
        self.figcaption_depth = 0
        self.figcaption_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"] or "")
        if tag == "figure" and "fde-diagram" in (values.get("class") or "").split():
            self.archify_figures += 1
        if tag == "figcaption":
            self.figcaption_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "figcaption":
            self.figcaption_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.figcaption_depth:
            self.figcaption_parts.append(data)


class Week6ArchifyVisualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = json.loads(PROVENANCE.read_text(encoding="utf-8"))

    def test_verified_source_tooling_and_isolation_identity_are_pinned(self) -> None:
        self.assertEqual(self.manifest["schema_version"], 1)
        self.assertEqual(self.manifest["reviewed_date"], "2026-10-14")
        source = self.manifest["archify_source"]
        for key, value in EXPECTED_SOURCE.items():
            self.assertEqual(source[key], value)
        tooling = self.manifest["tooling"]
        self.assertEqual(tooling["node"], "v24.2.0")
        self.assertEqual(tooling["sanitizer_sha256"], EXPECTED_SANITIZER)
        self.assertEqual(tooling["sandbox_profile_sha256"], EXPECTED_SANDBOX)
        self.assertEqual(tooling["presentation_style"].encode(), PRESENTATION_STYLE)
        self.assertEqual(tooling["presentation_style_sha256"], sha256(PRESENTATION_STYLE))
        self.assertEqual(
            self.manifest["controls"],
            {
                "network": "denied",
                "user_files_outside_scratch": "denied",
                "update_check": "disabled",
                "npm": "unused",
                "raw_outputs": "disposed",
                "input_json": "disposed",
                "brands_repository_sources": "absent",
                "runtime_dependency": "none",
            },
        )

    def test_committed_public_figures_match_every_recorded_hash(self) -> None:
        self.assertEqual(set(self.manifest["lessons"]), set(LESSONS))
        for lesson in LESSONS:
            with self.subTest(lesson=lesson):
                record = self.manifest["lessons"][lesson]
                page = (WEEK / f"{lesson}.html").read_bytes()
                figure_matches = FIGURE_RE.findall(page)
                self.assertEqual(len(figure_matches), 1)
                figure = figure_matches[0]
                svg_matches = SVG_RE.findall(figure)
                self.assertEqual(len(svg_matches), 1)
                svg = svg_matches[0]
                self.assertEqual(len(figure), record["figure_fragment_bytes"])
                self.assertEqual(sha256(figure), record["figure_fragment_sha256"])
                self.assertEqual(len(svg), record["sanitized_1_bytes"])
                self.assertEqual(len(svg), record["sanitized_2_bytes"])
                self.assertEqual(sha256(svg), record["sanitized_1_sha256"])
                self.assertEqual(sha256(svg), record["sanitized_2_sha256"])
                self.assertEqual(sha256(svg), record["inline_svg_sha256"])
                self.assertEqual(record["raw_render_1_bytes"], record["raw_render_2_bytes"])
                self.assertEqual(record["raw_render_1_sha256"], record["raw_render_2_sha256"])
                self.assertEqual(record["raw_cmp"], "pass")
                self.assertEqual(record["sanitized_cmp"], "pass")
                self.assertRegex(record["input_sha256"], r"^[0-9a-f]{64}$")
                self.assertGreater(record["raw_render_1_bytes"], 700_000)
                self.assertLess(record["sanitized_1_bytes"], 20_000)

    def test_each_inline_svg_is_standalone_sanitized_and_accessible(self) -> None:
        for lesson in LESSONS:
            with self.subTest(lesson=lesson):
                page = (WEEK / f"{lesson}.html").read_bytes()
                figure = FIGURE_RE.search(page).group(0)  # type: ignore[union-attr]
                svg = SVG_RE.search(figure).group(0)  # type: ignore[union-attr]
                self.assertIsNone(FORBIDDEN_RE.search(figure))
                self.assertNotIn(b"/Users/", figure)
                self.assertNotIn(b"archify/renderers", figure.lower())
                self.assertIn(b"<style>" + PRESENTATION_STYLE + b"</style>", figure)

                root = ET.fromstring(svg.decode("utf-8"))
                ids = [element.get("id") for element in root.iter() if element.get("id")]
                self.assertEqual(len(ids), len(set(ids)))
                self.assertEqual(root.get("role"), "img")
                self.assertEqual(root.get("tabindex"), "0")
                self.assertEqual(root.get("focusable"), "true")
                labels = (root.get("aria-labelledby") or "").split()
                self.assertEqual(len(labels), 2)
                self.assertTrue(all(label in ids for label in labels))
                names = [element.tag.rsplit("}", 1)[-1] for element in root]
                self.assertIn("title", names)
                self.assertIn("desc", names)
                groups = [element for element in root.iter() if element.get("role") == "group"]
                self.assertGreaterEqual(len(groups), 7)
                self.assertTrue(all(element.get("tabindex") == "0" for element in groups))
                self.assertFalse(any(element.get("role") == "button" for element in root.iter()))
                text = " ".join("".join(root.itertext()).split())
                record = self.manifest["lessons"][lesson]
                self.assertIn(record["title"], text)
                self.assertIn(record["description"], text)

    def test_final_documents_have_one_visible_caption_unique_ids_and_no_runtime(self) -> None:
        for lesson in LESSONS:
            with self.subTest(lesson=lesson):
                page = (WEEK / f"{lesson}.html").read_text(encoding="utf-8")
                parser = DocumentContractParser()
                parser.feed(page)
                self.assertEqual(parser.archify_figures, 1)
                self.assertEqual(len(parser.ids), len(set(parser.ids)))
                caption = " ".join("".join(parser.figcaption_parts).split())
                self.assertEqual(caption, self.manifest["lessons"][lesson]["figcaption"])
                self.assertFalse(any("archify" in src.lower() for src in parser.scripts))
                self.assertFalse(any(src.endswith("/diagram.js") for src in parser.scripts))

    def test_provenance_contains_no_disposable_absolute_path(self) -> None:
        serialized = PROVENANCE.read_text(encoding="utf-8")
        self.assertNotIn("/Users/", serialized)
        self.assertNotIn(".archify-scratch", serialized)


if __name__ == "__main__":
    unittest.main()
