"""Contract tests for the System Blueprint page.

Covers: Archify figure provenance/drift against the committed manifest,
forbidden-content rules, accessibility semantics, the optional-depth and
provider-neutral contract, the drill interaction contract, hub navigation
integration, and week-theme currency coupling to the curriculum hub.
"""

from __future__ import annotations

import hashlib
import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "system-blueprint.html"
INDEX = ROOT / "index.html"
SCRIPT = ROOT / "assets" / "js" / "system-blueprint.js"
PROVENANCE = ROOT / "docs" / "research" / "system-blueprint" / "archify-provenance.json"

FIGURE_RE = re.compile(
    rb'<figure class="fde-diagram"[^>]*data-archify-visual[^>]*>.*?</figure>', re.DOTALL
)
SVG_RE = re.compile(rb"<svg\b.*?</svg>\n", re.DOTALL)
FORBIDDEN_RE = re.compile(
    rb"<script|foreignObject|<image|<(?:iframe|object|embed)|\s+on[a-z0-9_-]+\s*=|"
    rb"(?:@import|@font-face|JetBrains)|(?:href|src)\s*=|"
    rb"url\s*\(\s*[\"']?(?:https?:|//|data:)",
    re.IGNORECASE,
)
INDEX_TITLE_RE = re.compile(r'\{ w:(\d+), phase:"[a-z]+", title:"([^"]+)"')

# One stable keyword per week. Each must appear BOTH in the hub's window.WEEKS
# title for that week AND inside this page's matching week entry; a merged
# upstream retheme of any week therefore fails this suite and forces a review
# of the blueprint copy (never an automatic baseline update).
WEEK_KEYWORDS = {
    1: "llm",
    2: "rag",
    3: "agent",
    4: "multi-agent",
    5: "neo4j",
    6: "kafka",
    7: "terraform",
    8: "observability",
    9: "security",
    10: "rollout",
}


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class PageParser(HTMLParser):
    """Collects ids, script srcs, and flagged attributes document-wide."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.scripts: list[str] = []
        self.core_attrs: list[str] = []
        self.cloud_attrs: list[str] = []
        self.figcaption_depth = 0
        self.figcaption_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"] or "")
        for name in values:
            if name in {"data-core", "data-core-interaction"}:
                self.core_attrs.append(name)
            if name == "data-cloud":
                self.cloud_attrs.append(name)
        if tag == "figcaption":
            self.figcaption_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "figcaption" and self.figcaption_depth:
            self.figcaption_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.figcaption_depth:
            self.figcaption_text.append(data)


class SystemBlueprintArchifyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page_bytes = PAGE.read_bytes()
        cls.page_text = cls.page_bytes.decode("utf-8")
        cls.manifest = json.loads(PROVENANCE.read_text(encoding="utf-8"))
        cls.figures = FIGURE_RE.findall(cls.page_bytes)
        cls.parser = PageParser()
        cls.parser.feed(cls.page_text)

    def test_two_archify_figures_present(self) -> None:
        self.assertEqual(len(self.figures), 2)

    def test_inline_svg_bytes_match_manifest(self) -> None:
        expected = [
            self.manifest["figures"]["serving-path"],
            self.manifest["figures"]["operations-path"],
        ]
        for fragment, entry in zip(self.figures, expected):
            svgs = SVG_RE.findall(fragment)
            self.assertEqual(len(svgs), 1)
            self.assertEqual(sha256(svgs[0]), entry["inline_svg_sha256"])
            self.assertEqual(len(svgs[0]), entry["sanitized_1_bytes"])
            self.assertEqual(sha256(fragment), entry["figure_fragment_sha256"])
            self.assertEqual(len(fragment), entry["figure_fragment_bytes"])

    def test_manifest_pins_approved_source_and_tooling(self) -> None:
        source = self.manifest["archify_source"]
        self.assertEqual(source["version"], "v3.0.1")
        self.assertEqual(source["peeled_commit"], "2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c")
        self.assertEqual(
            self.manifest["tooling"]["sanitizer_sha256"],
            "266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c",
        )
        for figure in self.manifest["figures"].values():
            self.assertEqual(figure["raw_cmp"], "pass")
            self.assertEqual(figure["sanitized_cmp"], "pass")
            self.assertEqual(figure["human_review"], "pass")

    def test_figures_contain_no_forbidden_content(self) -> None:
        for fragment in self.figures:
            # The scoped <style> grid shim is the one reviewed exception.
            stripped = fragment.replace(
                b'<style>.fde-diagram .c-grid{fill:none}</style>', b""
            )
            inner_styles = re.findall(rb"<style[^>]*>.*?</style>", stripped, re.DOTALL)
            for style in inner_styles:
                stripped = stripped.replace(style, b"")
                self.assertNotIn(b"@import", style)
                self.assertNotIn(b"url(", style)
            self.assertIsNone(FORBIDDEN_RE.search(stripped))

    def test_svg_accessibility_contract(self) -> None:
        for fragment in self.figures:
            svg = SVG_RE.findall(fragment)[0].decode("utf-8")
            self.assertIn('role="img"', svg)
            self.assertIn('tabindex="0"', svg)
            labelled = re.search(r'aria-labelledby="([^"]+)"', svg)
            self.assertIsNotNone(labelled)
            assert labelled is not None
            for ref in labelled.group(1).split():
                self.assertIn(f'id="{ref}"', svg)
            self.assertRegex(svg, r"<title[^>]*>\S")
            self.assertRegex(svg, r"<desc[^>]*>\S")

    def test_figcaptions_restate_relationships(self) -> None:
        text = " ".join(self.parser.figcaption_text)
        for phrase in ("grounding gate", "guardrails", "Kafka", "audit trail", "no live cloud account"):
            self.assertIn(phrase, text)

    def test_document_ids_unique(self) -> None:
        self.assertEqual(len(self.parser.ids), len(set(self.parser.ids)))

    def test_no_archify_runtime_or_extra_scripts(self) -> None:
        allowed = {"assets/js/theme.js", "assets/js/system-blueprint.js"}
        for src in self.parser.scripts:
            self.assertIn(src.split("?")[0], allowed)


class SystemBlueprintPageContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page_text = PAGE.read_text(encoding="utf-8")
        cls.index_text = INDEX.read_text(encoding="utf-8")
        cls.parser = PageParser()
        cls.parser.feed(cls.page_text)

    def test_optional_depth_outside_core30(self) -> None:
        self.assertIn("Optional depth — outside the Core 30 required path", self.page_text)
        self.assertEqual(self.parser.core_attrs, [])
        self.assertNotIn("data-core-interaction", self.page_text)
        self.assertNotIn('name="fde-day"', self.page_text)

    def test_provider_neutral_no_cloud_blocks(self) -> None:
        self.assertEqual(self.parser.cloud_attrs, [])
        # The only AWS/GCP mention is the pointer to per-lesson lanes.
        mentions = [m.start() for m in re.finditer(r"AWS|GCP", self.page_text)]
        self.assertEqual(len(mentions), 2)
        self.assertIn("AWS / GCP lane lives on each lesson", self.page_text)

    def test_team_structure_claims(self) -> None:
        self.assertIn("Solo · Weeks 1–5", self.page_text)
        self.assertIn("Teams of 2–3 · Weeks 6–10", self.page_text)

    def test_week_entries_and_strip_cover_all_ten_weeks(self) -> None:
        for week in range(1, 11):
            self.assertIn(f'id="sb-w{week:02d}"', self.page_text)
            self.assertIn(f'href="#sb-w{week:02d}"', self.page_text)

    def test_week_theme_currency_against_hub(self) -> None:
        titles = {int(num): title for num, title in INDEX_TITLE_RE.findall(self.index_text)}
        self.assertEqual(sorted(titles), list(range(1, 11)))
        for week, keyword in WEEK_KEYWORDS.items():
            self.assertIn(
                keyword,
                titles[week].lower(),
                f"hub Week {week} title no longer matches keyword '{keyword}'; "
                "review system-blueprint.html copy for this week",
            )
            entry = re.search(
                rf'<details class="sb-week" id="sb-w{week:02d}".*?</details>',
                self.page_text,
                re.DOTALL,
            )
            self.assertIsNotNone(entry, f"missing week entry for Week {week}")
            assert entry is not None
            self.assertIn(
                keyword,
                entry.group(0).lower(),
                f"blueprint Week {week} entry no longer matches keyword '{keyword}'",
            )

    def test_drill_interaction_contract(self) -> None:
        drills = re.findall(
            r"<fieldset class=\"sb-drill\" data-drill.*?</fieldset>",
            self.page_text,
            re.DOTALL,
        )
        self.assertEqual(len(drills), 10)
        for drill in drills:
            self.assertIn('data-feedback="', drill)
            self.assertEqual(drill.count('data-correct="1"'), 1)
            radios = re.findall(r"<input type=\"radio\"[^>]*>", drill)
            self.assertGreaterEqual(len(radios), 2)
            for radio in radios:
                self.assertTrue(
                    'data-correct="1"' in radio or 'data-why="' in radio,
                    f"radio without authored feedback: {radio}",
                )
            self.assertIn("data-check", drill)
            self.assertIn('data-status role="status"', drill)
            self.assertIn("<details>", drill)
            self.assertIn("<summary>", drill)
            self.assertIn('class="sb-weekref"', drill)

    def test_scores_are_live_regions(self) -> None:
        self.assertEqual(self.page_text.count('data-score aria-live="polite"'), 2)

    def test_drill_names_are_unique_per_fieldset(self) -> None:
        drills = re.findall(
            r"<fieldset class=\"sb-drill\" data-drill.*?</fieldset>",
            self.page_text,
            re.DOTALL,
        )
        per_drill_names = []
        for drill in drills:
            drill_names = set(re.findall(r'<input type="radio" name="([a-z0-9]+)"', drill))
            self.assertEqual(len(drill_names), 1)
            per_drill_names.append(next(iter(drill_names)))
        self.assertEqual(len(per_drill_names), len(set(per_drill_names)))

    def test_reduced_motion_and_mobile_gutter(self) -> None:
        self.assertIn("prefers-reduced-motion: no-preference", self.page_text)
        self.assertIn("padding: 0 16px 56px", self.page_text)

    def test_hub_navigation_links_to_blueprint(self) -> None:
        self.assertIn(
            '<a class="topnav" href="system-blueprint.html">System Blueprint</a>',
            self.index_text,
        )

    def test_page_script_is_defensive_umd(self) -> None:
        script = SCRIPT.read_text(encoding="utf-8")
        self.assertIn("module.exports", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)
        self.assertNotIn("fetch(", script)
        self.assertNotIn("localStorage", script)


if __name__ == "__main__":
    unittest.main()
