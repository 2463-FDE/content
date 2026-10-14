"""Certification facts and the objective → lesson map, loaded through their public JS modules.

Contract: every certification fact traces to a first-party source with an access date;
the AWS path aligns to AIP-C01 and the GCP path to the Google AI Professional
Certificate (captain decision gcp-cert-alignment-target, corrected 2026-10-14) — with no
alignment claimed to the superseded Google candidates; every mapped anchor is a real
lesson, and provider anchors only point at pages that actually carry provider blocks.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from urllib.parse import urlparse

import core30

ROOT = core30.ROOT
FIRST_PARTY = {
    "aws.amazon.com", "docs.aws.amazon.com", "skillbuilder.aws",
    "cloud.google.com", "docs.cloud.google.com", "services.google.com", "www.skills.google",
    "grow.google",
}


def load(module: str) -> dict:
    script = f"process.stdout.write(JSON.stringify(require({json.dumps(str(ROOT / 'assets' / 'js' / module))})))"
    return json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)


class CertificationFacts(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = load("cert-objectives.js")
        cls.map = load("cloud-map.js")

    def test_access_date_and_research_pointer(self) -> None:
        self.assertEqual(self.data["accessed"], "2026-10-14")
        self.assertTrue((ROOT / self.data["research"]).is_file())

    def test_aws_path_targets_aip_c01(self) -> None:
        target = self.data["paths"]["aws"]["target"]
        self.assertEqual(target, "aip-c01")
        cert = self.data["certs"][target]
        self.assertEqual((cert["provider"], cert["level"], cert["status"]), ("aws", "Professional", "ga"))

    def test_gcp_path_targets_the_google_ai_professional_certificate(self) -> None:
        gcp = self.data["paths"]["gcp"]
        self.assertEqual(gcp["target"], "gaipc")
        self.assertEqual(gcp["decision"], "gcp-cert-alignment-target")
        cert = self.data["certs"]["gaipc"]
        self.assertEqual(cert["name"], "Google AI Professional Certificate")
        self.assertEqual(cert["page"], "https://grow.google/enroll-certificates/ai-professional-certificate-mid/")
        self.assertFalse(cert["weightsPublished"], "a career certificate publishes courses, not exam weights")
        self.assertEqual([d["title"] for d in cert["domains"]], [
            "AI Fundamentals", "AI for Brainstorming and Planning", "AI for Research and Insights",
            "AI for Writing and Communicating", "AI for Content Creation", "AI for Data Analysis",
            "AI for App Building", "AI for App Deployment",
        ])

    def test_superseded_google_candidates_are_not_claimed(self) -> None:
        names = [c["name"] for c in self.data["certs"].values()] + [a["name"] for a in self.data["adjacent"]]
        for superseded in ("Professional Agentic Architect", "Professional Machine Learning Engineer"):
            self.assertFalse(any(superseded in n for n in names), superseded)
        self.assertEqual(set(self.map["objectives"]), {"aip-c01", "gaipc"})

    def test_weights_match_the_official_outline(self) -> None:
        for cid, cert in self.data["certs"].items():
            with self.subTest(cert=cid):
                if cert["weightsPublished"]:
                    self.assertEqual(sum(d["weight"] for d in cert["domains"]), 100)
                else:
                    self.assertTrue(all(d["weight"] is None for d in cert["domains"]), "no invented weights")
        aip = [d["weight"] for d in self.data["certs"]["aip-c01"]["domains"]]
        self.assertEqual(aip, [31, 26, 20, 12, 11])
        self.assertEqual(sum(len(d["objectives"]) for d in self.data["certs"]["aip-c01"]["domains"]), 20)

    def test_every_link_is_first_party_https(self) -> None:
        urls = []
        for cert in self.data["certs"].values():
            urls += [u for u in (cert["page"], cert["guide"], cert["learningPath"]) if u]
        urls += [a["url"] for a in self.data["adjacent"]]
        for url in urls:
            with self.subTest(url=url):
                parsed = urlparse(url)
                self.assertEqual(parsed.scheme, "https")
                self.assertIn(parsed.netloc, FIRST_PARTY)


class ObjectiveMap(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = load("cert-objectives.js")
        cls.map = load("cloud-map.js")
        cls.cloud_pages = {p.relative_to(ROOT / "weeks").with_suffix("").as_posix() for p in core30.cloud_pages()}

    def objective_ids(self, cid: str) -> set[str]:
        cert = self.data["certs"][cid]
        ids = {o["id"] for d in cert["domains"] for o in d["objectives"]}
        return ids or {d["id"] for d in cert["domains"]}

    def test_map_keys_are_exactly_the_published_objectives(self) -> None:
        for cid, objectives in self.map["objectives"].items():
            with self.subTest(cert=cid):
                self.assertEqual(set(objectives), self.objective_ids(cid))

    def test_every_anchor_is_a_real_lesson(self) -> None:
        for cid, objectives in self.map["objectives"].items():
            for oid, anchors in objectives.items():
                for anchor in anchors:
                    with self.subTest(cert=cid, objective=oid, page=anchor["page"]):
                        self.assertTrue((ROOT / "weeks" / f"{anchor['page']}.html").is_file())
                        self.assertIn(anchor["via"], ("lesson", "provider"))

    def test_provider_anchors_point_at_pages_with_provider_blocks(self) -> None:
        listed = set(self.map["providerPages"])
        self.assertEqual(listed, self.cloud_pages, "providerPages must list exactly the pages carrying AWS/GCP blocks")
        for cid, objectives in self.map["objectives"].items():
            for oid, anchors in objectives.items():
                for anchor in anchors:
                    if anchor["via"] == "provider":
                        with self.subTest(cert=cid, objective=oid):
                            self.assertIn(anchor["page"], listed)

    def test_every_aws_target_objective_is_taught(self) -> None:
        for oid, anchors in self.map["objectives"]["aip-c01"].items():
            with self.subTest(objective=oid):
                self.assertTrue(anchors, f"AIP-C01 {oid} has no lesson anchor")


if __name__ == "__main__":
    unittest.main()
