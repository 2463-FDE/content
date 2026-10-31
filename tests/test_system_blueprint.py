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
CURRICULUM_MAP = ROOT / "assets" / "js" / "curriculum-map.js"
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
INDEX_TITLE_RE = re.compile(r'\{ w: ?(\d+), phase: ?"[a-z]+", title: ?"([^"]+)"')

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


VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
MOTION_PROPERTIES = ("transition", "animation")


def parse_css(text: str) -> list[tuple[tuple[str, ...], str, dict[str, str]]]:
    """Parse CSS into (at-rule context, selector, declarations) triples."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    rules: list[tuple[tuple[str, ...], str, dict[str, str]]] = []

    def walk(pos: int, context: tuple[str, ...]) -> int:
        prelude_start = pos
        while pos < len(text):
            char = text[pos]
            if char == "{":
                prelude = " ".join(text[prelude_start:pos].split())
                if prelude.startswith("@"):
                    pos = walk(pos + 1, context + (prelude,))
                else:
                    end = text.index("}", pos)
                    declarations: dict[str, str] = {}
                    for item in text[pos + 1 : end].split(";"):
                        if ":" in item:
                            name, value = item.split(":", 1)
                            declarations[name.strip().lower()] = " ".join(value.split())
                    for selector in prelude.split(","):
                        rules.append((context, " ".join(selector.split()), declarations))
                    pos = end + 1
                prelude_start = pos
                continue
            if char == "}":
                return pos + 1
            if char == ";":
                prelude_start = pos + 1
            pos += 1
        return pos

    walk(0, ())
    return rules


def normalize_media(prelude: str) -> str:
    return re.sub(r"\s*([():])\s*", r"\1", prelude.lower())


def padding_sides(value: str) -> tuple[str, str, str, str]:
    parts = value.split()
    top = parts[0]
    right = parts[1] if len(parts) > 1 else top
    bottom = parts[2] if len(parts) > 2 else top
    left = parts[3] if len(parts) > 3 else right
    return top, right, bottom, left


def px(value: str) -> float:
    if value == "0":
        return 0.0
    match = re.fullmatch(r"(-?[\d.]+)px", value)
    if match is None:
        raise AssertionError(f"expected a px length, got {value!r}")
    return float(match.group(1))


def selector_matches(selector: str, element_classes: set[str], html_classes: set[str]) -> bool:
    """Match `.a`, `.x .a`, or `html.x .a` against an element under <html>."""
    parts = selector.split()
    if not parts or len(parts) > 2:
        return False
    subject = parts[-1]
    if not re.fullmatch(r"(\.[\w-]+)+", subject):
        return False
    if not set(subject[1:].split(".")) <= element_classes:
        return False
    if len(parts) == 1:
        return True
    ancestor = re.fullmatch(r"(html)?((?:\.[\w-]+)+)", parts[0])
    return ancestor is not None and set(ancestor.group(2)[1:].split(".")) <= html_classes


def specificity(selector: str) -> tuple[int, int]:
    return selector.count("."), len(re.findall(r"(?:^|\s)[a-z]+", selector))


def computed_display(
    rules: list[tuple[tuple[str, ...], str, dict[str, str]]],
    element_classes: set[str],
    html_classes: set[str],
) -> str:
    """Cascade unconditioned `display` declarations for one element."""
    winner: tuple[tuple[int, int], int, str] | None = None
    for order, (context, selector, declarations) in enumerate(rules):
        if context or "display" not in declarations:
            continue
        if not selector_matches(selector, element_classes, html_classes):
            continue
        candidate = (specificity(selector), order, declarations["display"])
        if winner is None or candidate[:2] > winner[:2]:
            winner = candidate
    return winner[2] if winner else "block"


class PageParser(HTMLParser):
    """Collects ids, script srcs, flagged attributes, page CSS, and drill structure."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.scripts: list[str] = []
        self.core_attrs: list[str] = []
        self.cloud_attrs: list[str] = []
        self.figcaption_depth = 0
        self.figcaption_text: list[str] = []
        self.styles: list[str] = []
        self.style_depth = 0
        self.score_regions: list[dict[str, str | None]] = []
        self.drills: list[dict] = []
        self.drill: dict | None = None
        self.drill_stack: list[str] = []
        self.details_depth = 0
        self.summary_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "style":
            self.style_depth += 1
            self.styles.append("")
        if "data-score" in values:
            self.score_regions.append(values)
        if tag == "fieldset" and "data-drill" in values and self.drill is None:
            self.drill = {
                "attrs": values,
                "radios": [],
                "checks": [],
                "statuses": [],
                "details": [],
                "weekrefs": 0,
            }
            self.drill_stack = []
        if self.drill is not None:
            self._drill_start(tag, values)
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

    def _drill_start(self, tag: str, values: dict[str, str | None]) -> None:
        drill = self.drill
        assert drill is not None
        if tag == "input" and values.get("type") == "radio":
            drill["radios"].append(values)
        if tag == "button" and "data-check" in values:
            drill["checks"].append(values)
        if "data-status" in values:
            drill["statuses"].append(values)
        if "sb-weekref" in (values.get("class") or "").split():
            drill["weekrefs"] += 1
        if tag == "details":
            if self.details_depth == 0:
                drill["details"].append({"summary": "", "body": ""})
            self.details_depth += 1
        if tag == "summary" and self.details_depth:
            self.summary_depth += 1
        if tag not in VOID_TAGS:
            self.drill_stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag == "figcaption" and self.figcaption_depth:
            self.figcaption_depth -= 1
        if tag == "style" and self.style_depth:
            self.style_depth -= 1
        if self.drill is not None and tag not in VOID_TAGS:
            while self.drill_stack:
                opened = self.drill_stack.pop()
                if opened == "details" and self.details_depth:
                    self.details_depth -= 1
                if opened == "summary" and self.summary_depth:
                    self.summary_depth -= 1
                if opened == tag:
                    break
            if not self.drill_stack:
                self.drills.append(self.drill)
                self.drill = None

    def handle_data(self, data: str) -> None:
        if self.figcaption_depth:
            self.figcaption_text.append(data)
        if self.style_depth:
            self.styles[-1] += data
        if self.drill is not None and self.details_depth:
            key = "summary" if self.summary_depth else "body"
            self.drill["details"][-1][key] += data


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
        # window.WEEKS moved to the shared curriculum map (consumed by the hub
        # and the lesson-crumbs generator); the keyword coupling follows it.
        cls.map_text = CURRICULUM_MAP.read_text(encoding="utf-8")
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
        titles = {int(num): title for num, title in INDEX_TITLE_RE.findall(self.map_text)}
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
        drills = self.parser.drills
        self.assertEqual(len(drills), 10)
        for index, drill in enumerate(drills, start=1):
            with self.subTest(drill=index):
                self.assertTrue((drill["attrs"].get("data-feedback") or "").strip())
                radios = drill["radios"]
                self.assertGreaterEqual(len(radios), 2)
                correct = [r for r in radios if r.get("data-correct") == "1"]
                self.assertEqual(len(correct), 1)
                for radio in radios:
                    if radio.get("data-correct") != "1":
                        self.assertTrue((radio.get("data-why") or "").strip(), radio)
                self.assertEqual(len(drill["checks"]), 1)
                self.assertEqual(drill["checks"][0].get("type"), "button")
                self.assertEqual(len(drill["statuses"]), 1)
                self.assertEqual(drill["statuses"][0].get("role"), "status")
                self.assertEqual(len(drill["details"]), 1)
                fallback = drill["details"][0]
                self.assertTrue(fallback["summary"].strip())
                self.assertTrue(fallback["body"].strip())
                self.assertEqual(drill["weekrefs"], 1)

    def test_scores_are_live_regions(self) -> None:
        self.assertEqual(len(self.parser.score_regions), 2)
        for region in self.parser.score_regions:
            self.assertEqual(region.get("aria-live"), "polite")

    def test_drill_names_are_unique_per_fieldset(self) -> None:
        per_drill_names = []
        for drill in self.parser.drills:
            names = {radio.get("name") for radio in drill["radios"]}
            self.assertEqual(len(names), 1)
            name = next(iter(names))
            self.assertTrue(name)
            per_drill_names.append(name)
        self.assertEqual(len(per_drill_names), 10)
        self.assertEqual(len(per_drill_names), len(set(per_drill_names)))

    def test_hub_navigation_links_to_blueprint(self) -> None:
        self.assertIn(
            '<a class="topnav" href="system-blueprint.html">System Blueprint</a>',
            self.index_text,
        )


class SystemBlueprintPageCssTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        parser = PageParser()
        parser.feed(PAGE.read_text(encoding="utf-8"))
        cls.rules = parse_css(parser.styles[0])

    def test_parser_reads_page_stylesheet(self) -> None:
        selectors = {selector for context, selector, _ in self.rules if not context}
        self.assertIn(".sb-wrap", selectors)
        self.assertIn(".sb-actions", selectors)

    def test_motion_only_under_no_preference(self) -> None:
        motion = [
            (context, selector, name)
            for context, selector, declarations in self.rules
            for name, value in declarations.items()
            if name.startswith(MOTION_PROPERTIES) and value != "none"
        ]
        self.assertTrue(motion)
        for context, selector, name in motion:
            media = [normalize_media(c) for c in context]
            self.assertTrue(
                any("prefers-reduced-motion:no-preference" in m for m in media),
                f"{selector} {{ {name} }} runs outside a reduced-motion guard",
            )

    def test_narrow_viewport_tightens_wrap_gutter(self) -> None:
        base = [d["padding"] for c, s, d in self.rules if not c and s == ".sb-wrap" and "padding" in d]
        self.assertEqual(len(base), 1)
        base_left, base_right = padding_sides(base[0])[3], padding_sides(base[0])[1]
        narrow = [
            (normalize_media(c[0]), d["padding"])
            for c, s, d in self.rules
            if len(c) == 1 and "max-width" in c[0] and s == ".sb-wrap" and "padding" in d
        ]
        self.assertEqual(len(narrow), 1)
        media, padding = narrow[0]
        width = re.search(r"max-width:(\d+)px", media)
        assert width is not None
        self.assertLessEqual(int(width.group(1)), 600)
        _, right, _, left = padding_sides(padding)
        self.assertEqual(px(left), px(right))
        self.assertGreater(px(left), 0)
        self.assertLess(px(left), px(base_left))
        self.assertLess(px(right), px(base_right))

    def test_drill_checks_hidden_without_js(self) -> None:
        self.assertEqual(computed_display(self.rules, {"sb-actions"}, set()), "none")

    def test_drill_checks_visible_once_script_marks_document(self) -> None:
        self.assertEqual(computed_display(self.rules, {"sb-actions"}, {"sb-js"}), "flex")

    def test_no_js_hiding_is_scoped_to_check_controls(self) -> None:
        for element in ({"sb-drill"}, {"sb-status"}, {"sb-check"}):
            self.assertNotEqual(computed_display(self.rules, element, set()), "none", element)


if __name__ == "__main__":
    unittest.main()
