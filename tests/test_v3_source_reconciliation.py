"""Contracts for the captain-designated LTIM FDE v3 source reconciliation."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "docs/research/fde-ltim-v3-coverage.json"
RECONCILIATION = ROOT / "docs/research/fde-ltim-v3-source-reconciliation.md"
SOURCE = Path("/Users/jestercharles/Downloads/RevaturePro | LTIM FDE v3.pdf")
SHA256 = "1792ba5c20a62fdd1e83463d9032d129ee644e58b220129b2f736f5fb863ed7e"
BASELINE = "a971f2aeec2fc65d6d71c134eae52b2bb7889061"


class V3SourceReconciliationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.coverage = json.loads(MAP.read_text(encoding="utf-8"))
        cls.reconciliation = RECONCILIATION.read_text(encoding="utf-8")

    def test_recorded_artifact_identity_is_exact(self) -> None:
        authority = self.coverage["authority"]
        self.assertEqual(authority["filename"], SOURCE.name)
        self.assertEqual(authority["sha256"], SHA256)
        self.assertEqual(authority["pdfHeader"], "%PDF-1.3")
        self.assertEqual(authority["pages"], 8)
        self.assertEqual(authority["baseline"], BASELINE)
        for value in (SHA256, BASELINE, "%PDF-1.3", "Page count | 8"):
            self.assertIn(value, self.reconciliation)

    @unittest.skipUnless(SOURCE.is_file(), "captain-designated source is not mounted")
    def test_mounted_authoritative_bytes_still_match(self) -> None:
        self.assertEqual(hashlib.sha256(SOURCE.read_bytes()).hexdigest(), SHA256)
        with SOURCE.open("rb") as source:
            self.assertEqual(source.read(8), b"%PDF-1.3")
        pdfinfo = shutil.which("pdfinfo")
        if pdfinfo:
            result = subprocess.run(
                [pdfinfo, str(SOURCE)], text=True, capture_output=True, check=True
            )
            self.assertRegex(result.stdout, r"(?m)^Pages:\s+8$")

    def test_map_has_all_modules_days_routes_and_source_items(self) -> None:
        modules = self.coverage["modules"]
        self.assertEqual([module["week"] for module in modules], list(range(1, 11)))
        self.assertEqual([module["phase"] for module in modules], [1, 1, 1, 2, 2, 3, 3, 4, 4, 4])
        days = [day for module in modules for day in module["days"]]
        self.assertEqual(len(modules), self.coverage["denominator"]["modules"])
        self.assertEqual(len(days), self.coverage["denominator"]["days"])
        self.assertEqual(sum(day["sourceItems"] for day in days), 396)
        for module in modules:
            self.assertEqual([day["day"] for day in module["days"]], [1, 2, 3, 4, 5])
            for day in module["days"]:
                with self.subTest(week=module["week"], day=day["day"]):
                    self.assertGreater(day["sourceItems"], 0)
                    self.assertTrue(day["routes"])
                    for route in day["routes"]:
                        self.assertTrue((ROOT / route).is_file(), route)
                    if day["status"] == "covered":
                        self.assertIsNone(day["gap"])
                    else:
                        self.assertIn(day["status"], {"partial", "conflict"})
                        self.assertTrue(day["gap"])

    def test_denominator_and_baseline_metrics_reconcile(self) -> None:
        denominator = self.coverage["denominator"]
        self.assertEqual(
            denominator["standardTopicGroups"]
            + denominator["milestoneOrDeliveryGroups"]
            + denominator["feedbackLinks"],
            denominator["sourceItems"],
        )
        self.assertEqual(denominator["sourceItems"], 396)
        days = [day for module in self.coverage["modules"] for day in module["days"]]
        counts = Counter(day["status"] for day in days)
        metrics = self.coverage["baselineMetrics"]
        self.assertEqual(counts, {"covered": 34, "partial": 14, "conflict": 2})
        self.assertEqual(metrics["coveredDays"], counts["covered"])
        self.assertEqual(metrics["partialDays"], counts["partial"])
        self.assertEqual(metrics["conflictingDays"], counts["conflict"])
        weights = Counter()
        for day in days:
            weights[day["status"]] += day["sourceItems"]
        self.assertEqual(metrics["sourceItemsInCoveredDays"], weights["covered"])
        self.assertEqual(metrics["sourceItemsInPartialDays"], weights["partial"])
        self.assertEqual(metrics["sourceItemsInConflictingDays"], weights["conflict"])
        self.assertEqual(sum(weights.values()), denominator["sourceItems"])

    def test_all_eight_pages_and_parallel_lane_handoffs_are_documented(self) -> None:
        for page in range(1, 9):
            self.assertRegex(self.reconciliation, rf"(?m)^### Page {page}$")
        for lane in ("Week 1", "Weeks 2–4", "Weeks 5–7", "Weeks 8–10"):
            self.assertIn(f"| {lane} |", self.reconciliation)
        self.assertIn("34 covered, 14 partial, and 2 conflicting", self.reconciliation)
        self.assertIn("396 source items", self.reconciliation)

    def test_shared_cloud_and_certification_contract_is_integrated(self) -> None:
        probe = (
            "const cfg=require('./assets/js/curriculum-config.js');"
            "const cert=require('./assets/js/cert-objectives.js');"
            "console.log(JSON.stringify({cloud:cfg.cloudPath,paths:cert.paths,certs:cert.certs}));"
        )
        result = subprocess.run(
            ["node", "-e", probe], cwd=ROOT, text=True, capture_output=True, check=True
        )
        contract = json.loads(result.stdout)
        self.assertEqual(contract["cloud"]["status"], "evidence-lane-integrated")
        self.assertEqual(contract["cloud"]["label"], "AWS/GCP evidence integrated")
        self.assertTrue(contract["cloud"]["active"])
        self.assertEqual(contract["paths"]["aws"]["target"], "aip-c01")
        self.assertEqual(contract["certs"]["aip-c01"]["code"], "AIP-C01")
        self.assertEqual(contract["paths"]["gcp"]["target"], "gaipc")
        self.assertEqual(contract["certs"]["gaipc"]["name"], "Google AI Professional Certificate")
        hub = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("AWS/GCP evidence integrated", hub)
        self.assertNotIn("AWS/GCP evidence seam pending", hub)

    def test_shared_lesson_data_points_to_exact_source_authority(self) -> None:
        for relative in (
            "assets/js/curriculum-week5.js",
            "assets/js/curriculum-lessons-w06.js",
            "assets/js/curriculum-lessons-w07-w08.js",
            "assets/js/curriculum-lessons-w09-w10.js",
        ):
            text = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(path=relative):
                self.assertIn(SHA256, text)
                self.assertIn("fde-ltim-v3-source-reconciliation.md", text)
        self.assertNotIn("provisionally authoritative", (ROOT / "assets/js/curriculum-lessons-w06.js").read_text())


if __name__ == "__main__":
    unittest.main()
