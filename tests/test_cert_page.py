"""certifications.html: the cert-page node suite plus the page's static (no-JS) contract."""

from __future__ import annotations

import json
import shutil
import subprocess
import unittest

import core30

ROOT = core30.ROOT
PAGE = ROOT / "certifications.html"


@unittest.skipUnless(shutil.which("node"), "node is required for cert-page behavioural tests")
class CertPageBehavior(unittest.TestCase):
    def test_node_suite_passes(self) -> None:
        result = subprocess.run(["node", "--test", str(ROOT / "tests" / "cert-page.test.cjs")],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class CertPageStaticContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.root = core30.parse(PAGE)

    def by_id(self, ident: str):
        found = [e for e in self.root.find_all() if e.attrs.get("id") == ident]
        self.assertEqual(len(found), 1, ident)
        return found[0]

    def test_loads_data_before_the_renderer(self) -> None:
        srcs = [s.attrs["src"].split("?")[0] for s in self.root.find_all("script") if s.attrs.get("src")]
        order = ["assets/js/cert-objectives.js", "assets/js/cloud-map.js", "assets/js/cloud-path.js", "assets/js/cert-page.js"]
        self.assertEqual([s for s in srcs if s in order], order)

    def test_gcp_section_shows_only_its_target(self) -> None:
        gcp = self.by_id("cert-gcp")
        self.assertEqual(gcp.attrs.get("data-target"), "gaipc")
        cards = [e.attrs.get("data-cert") for e in gcp.find_all("article")]
        self.assertEqual(cards, ["gaipc"])
        text = core30.text_of(self.root)
        for superseded in ("Agentic Architect", "Professional Machine Learning Engineer"):
            self.assertNotIn(superseded, text)
        self.assertIn("lists eight courses but also says seven", text, "Google's own course-count discrepancy stays disclosed")

    def test_static_fallback_links_official_guides(self) -> None:
        hrefs = [a.attrs.get("href", "") for a in self.root.find_all("a")]
        for guide in (
            "https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01.html",
            "https://grow.google/enroll-certificates/ai-professional-certificate-mid/",
        ):
            self.assertIn(guide, hrefs)
        for a in self.root.find_all("a"):
            if a.attrs.get("target") == "_blank":
                self.assertEqual(a.attrs.get("rel"), "noopener")

    def test_static_lesson_list_matches_the_provider_pages(self) -> None:
        listed = [a.attrs["href"] for a in self.by_id("provider-pages").find_all("a")]
        script = "process.stdout.write(JSON.stringify(Object.keys(require('./assets/js/cloud-map.js').providerPages)))"
        pages = json.loads(subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
        self.assertEqual(listed, [f"weeks/{page}.html" for page in pages], "no-JS lesson list must match cloud-map providerPages")

    def test_picker_mount_and_access_date(self) -> None:
        self.by_id("cloud-path-mount")
        times = [t for t in self.root.find_all("time") if t.attrs.get("datetime") == "2026-10-14"]
        self.assertEqual(len(times), 1)


if __name__ == "__main__":
    unittest.main()
