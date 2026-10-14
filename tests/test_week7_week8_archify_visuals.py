"""Offline provenance, safety, and accessibility contracts for Week 7–8 SVGs."""

from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROVENANCE = ROOT / "docs/research/w07-w08-archify-provenance.json"
FORBIDDEN = re.compile(
    rb"<script|foreignObject|<image|<(?:iframe|object|embed)|"
    rb"\s+on[a-z0-9_-]+\s*=|(?:@import|@font-face|JetBrains)|"
    rb"(?:href|src)\s*=|url\s*\(\s*[\"']?(?:https?:|//|data:)",
    re.IGNORECASE,
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class ScriptSources(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sources = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "link"}:
            self.sources.append((attrs.get("src") or attrs.get("href") or "").lower())


def extract(pattern, page, label):
    match = re.search(pattern, page, re.DOTALL)
    if not match:
        raise AssertionError(f"missing {label}")
    return match.group(0)


class Week78ArchifyVisualTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(PROVENANCE.read_text(encoding="utf-8"))

    def test_pinned_source_tool_and_sandbox_identity(self):
        source = self.manifest["archify_source"]
        tooling = self.manifest["tooling"]
        controls = self.manifest["controls"]
        self.assertEqual(source["version"], "v3.0.1")
        self.assertEqual(source["tag_object"], "679f195584e4216fd582c073d8964b3a9f59107e")
        self.assertEqual(source["peeled_commit"], "2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c")
        self.assertEqual(source["commit_tree"], "b33243ebe2bd6878a9ae58417ff8597c94d31e12")
        self.assertEqual(source["archify_subtree"], "7dcd73a73672d5da4f85d4c612017b478547303b")
        self.assertEqual(source["release_zip_sha256"], "b0b23bd28db314f04ca8ab9620fe20f8c1ac6474a3546bd8fe4679508aa1b7f5")
        self.assertEqual(tooling["node"], "v24.2.0")
        self.assertEqual(tooling["sanitizer_sha256"], "266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c")
        self.assertEqual(tooling["presentation_style_sha256"], sha(b".fde-diagram .c-grid{fill:none}"))
        self.assertEqual(controls["network"], "denied")
        self.assertEqual(controls["user_files_outside_scratch"], "denied")
        self.assertEqual(controls["npm"], "unused")
        self.assertEqual(controls["runtime_dependency"], "none")

    def test_double_render_double_sanitize_and_review_gates_are_recorded(self):
        for week, visual in self.manifest["visuals"].items():
            self.assertEqual(visual["raw_render_1_sha256"], visual["raw_render_2_sha256"], week)
            self.assertEqual(visual["raw_render_1_bytes"], visual["raw_render_2_bytes"], week)
            self.assertEqual(visual["sanitized_1_sha256"], visual["sanitized_2_sha256"], week)
            self.assertEqual(visual["sanitized_1_bytes"], visual["sanitized_2_bytes"], week)
            for gate in ("raw_cmp", "sanitized_cmp", "forbidden_content_scan", "xml_aria_id_checks", "human_review"):
                self.assertEqual(visual[gate], "pass", (week, gate))

    def test_each_route_contains_one_safe_hash_pinned_accessible_svg(self):
        for route, record in self.manifest["routes"].items():
            week = route[:3]
            page_path = ROOT / "weeks" / week / f"{route}.html"
            page = page_path.read_bytes()
            figure = extract(rb'<figure class="fde-diagram"[^>]*data-archify-visual[^>]*>.*?</figure>', page, "figure")
            svg = extract(rb'<svg\b.*?</svg>', figure, "svg")
            self.assertEqual(page.count(b"data-archify-visual"), 1, route)
            self.assertEqual(len(figure), record["figure_fragment_bytes"], route)
            self.assertEqual(sha(figure), record["figure_fragment_sha256"], route)
            self.assertEqual(sha(svg), record["inline_svg_sha256"], route)
            self.assertEqual(sha(svg), self.manifest["visuals"][week]["inline_import_sha256"], route)
            self.assertIsNone(FORBIDDEN.search(figure), route)
            scripts = ScriptSources()
            scripts.feed(page.decode("utf-8"))
            for source in scripts.sources:
                self.assertNotIn("archify", source, route)
                self.assertNotIn("node_modules", source, route)
            root = ET.fromstring(svg)
            ids = [node.get("id") for node in root.iter() if node.get("id")]
            self.assertEqual(len(ids), len(set(ids)), route)
            labels = root.get("aria-labelledby", "").split()
            self.assertEqual(len(labels), 2, route)
            self.assertTrue(all(label in ids for label in labels), route)
            self.assertEqual(root.get("role"), "img", route)
            self.assertEqual(root.get("tabindex"), "0", route)
            self.assertEqual(root.get("focusable"), "true", route)
            self.assertIn(b"<figcaption>", figure)
            self.assertIn(b"diagram-scroll-hint", figure)

    def test_no_runtime_or_disposable_render_artifacts_are_committed(self):
        tracked_like = [
            path for path in ROOT.rglob("*")
            if path.is_file() and any(part in {"node_modules", ".archify-scratch-w78"} for part in path.parts)
        ]
        self.assertEqual(tracked_like, [])
        for suffix in ("w07-input.json", "w08-input.json", "w07-render-1.html", "w08-render-1.html"):
            self.assertFalse(any(ROOT.rglob(suffix)), suffix)


if __name__ == "__main__":
    unittest.main()
