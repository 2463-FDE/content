"""Focused contracts for the authoritative Weeks 8–10 production wave."""
from pathlib import Path
import json
import re
import subprocess
import tempfile
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
import core30  # noqa: E402
DAYS = [f"w{week:02}d{day}" for week in (8, 9, 10) for day in range(1, 6)]
CAPSTONE_DAYS = [f"w{week:02}d{day}" for week in (9, 10) for day in range(1, 6)]
PROVIDER_DAYS = ("w09d3", "w09d4", "w09d5", "w10d1", "w10d5")


def node_json(source: str):
    result = subprocess.run(
        ["node", "-e", source], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return json.loads(result.stdout)


class WeeksEightToTenProductionWave(unittest.TestCase):
    def test_inventory_preserves_authority_denominator_and_week8_identity(self):
        inventory = (ROOT / "docs/research/w08-w10-production-wave.md").read_text()
        rows = {}
        for line in inventory.splitlines():
            match = re.match(r"^\| W(\d+) D(\d) \| (\d+) \| (.+?) \| (.+?) \| (.+?) \|$", line)
            if match:
                day = f"w{int(match.group(1)):02}d{match.group(2)}"
                rows[day] = {"items": int(match.group(3)), "groups": match.group(4), "disposition": match.group(6)}
        self.assertEqual(list(rows), DAYS)
        totals = {week: sum(r["items"] for d, r in rows.items() if d.startswith(week)) for week in ("w08", "w09", "w10")}
        self.assertEqual(totals, {"w08": 38, "w09": 39, "w10": 33})
        self.assertEqual(sum(totals.values()), 110)
        for day, row in rows.items():
            with self.subTest(day=day):
                self.assertGreaterEqual(len([g for g in row["groups"].split(";") if g.strip()]), 1)
                self.assertTrue(row["disposition"].strip())
        lessons = node_json(
            "const a=require('./assets/js/curriculum-lessons-w07-w08.js');"
            "const b=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "const out={};for(const id of " + json.dumps(DAYS) + ") out[id]=(a[id]||b[id]).week;"
            "console.log(JSON.stringify(out));"
        )
        self.assertEqual(lessons, {day: int(day[1:3]) for day in DAYS})

    def test_every_day_has_owned_measurable_team_evidence(self):
        records = node_json(
            "const a=require('./assets/js/curriculum-lessons-w07-w08.js');"
            "const b=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "const out={};for(const id of " + json.dumps(DAYS) + ") out[id]=(a[id]||b[id]).teamEvidence;"
            "console.log(JSON.stringify(out));"
        )
        self.assertEqual(set(records), set(DAYS))
        for day, record in records.items():
            with self.subTest(day=day):
                self.assertRegex(record["artifact"], r"^(SRE|SEC|GOV|REL|OPS|HANDOFF)-")
                self.assertTrue(record["owner"].endswith("owner") or record["owner"] in {"Release integrator", "Release authority"})
                self.assertGreaterEqual(len(record["acceptance"].split()), 10)
                self.assertRegex(record["review"].lower(), r"review|replay|reproduce|rerun|run|trace|perform|challenge|follow|complete|compute")

    def test_capstone_routes_have_complete_semantic_no_javascript_access(self):
        for day in CAPSTONE_DAYS:
            page = (ROOT / "weeks" / day[:3] / f"{day}.html").read_text()
            nojs = re.search(r"<noscript>(.*?)</noscript>", page, re.S)
            with self.subTest(day=day):
                self.assertIsNotNone(nojs)
                static = nojs.group(1)
                self.assertNotIn("JavaScript is required", static)
                self.assertIn("Decision and evidence path · text alternative", static)
                self.assertIn("data-core-interaction", static)
                self.assertIn("Team delivery evidence", static)
                self.assertIn("Comprehension check", static)
                self.assertGreaterEqual(static.count("<section"), 10)
                self.assertIn("data-core=\"optional\"", static)

    def test_provider_days_keep_personal_path_separate_from_team_adr(self):
        data = node_json(
            "const d=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "console.log(JSON.stringify(Object.fromEntries(" + json.dumps(PROVIDER_DAYS) + ".map(id=>[id,d[id].cloud]))));"
        )
        for day, cloud in data.items():
            with self.subTest(day=day):
                self.assertIn("aws", cloud)
                self.assertIn("gcp", cloud)
                page = (ROOT / "weeks" / day[:3] / f"{day}.html").read_text()
                self.assertIn('data-cloud="aws"', page)
                self.assertIn('data-cloud="gcp"', page)
                self.assertIn("team’s single Week 6 primary-cloud ADR", page)
                self.assertIn("interactive-cloud.js", page)

    def test_cloud_lane_is_integrated_and_provider_claims_are_traceable(self):
        config = node_json("console.log(JSON.stringify(require('./assets/js/curriculum-config.js').cloudPath));")
        self.assertTrue(config["active"])
        self.assertEqual(config["status"], "evidence-lane-integrated")
        evidence = {
            "w09d3": "docs/research/w09/w09d3-provider-paths.md",
            "w09d4": "docs/research/w09/w09d4-provider-paths.md",
            "w09d5": "docs/research/w09/w09d5-provider-paths.md",
            "w10d1": "docs/research/w10/w10d1-provider-paths.md",
            "w10d5": "docs/research/w10/w10d5-provider-paths.md",
        }
        sources = node_json(
            "const d=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "console.log(JSON.stringify(Object.fromEntries(" + json.dumps(PROVIDER_DAYS) + ".map(id=>[id,d[id].cloud.sources.map(s=>s.href)]))));"
        )
        self.assertEqual(set(sources), set(evidence))
        first_party = re.compile(r"^https://([a-z0-9-]+\.)*(aws\.amazon\.com|cloud\.google\.com|grow\.google)/")
        for day, relative in evidence.items():
            text = (ROOT / relative).read_text()
            cited = {url.rstrip(".,)") for url in re.findall(r"https://[^\s)`>]+", text)}
            with self.subTest(day=day):
                self.assertTrue(sources[day])
                for href in sources[day]:
                    self.assertRegex(href, first_party)
                    self.assertIn(href, cited, f"{day} renders {href} without a research citation")

    def test_navigation_and_banking_project_continue_through_handoff(self):
        index = (ROOT / "index.html").read_text()
        for day in CAPSTONE_DAYS:
            self.assertIn(f"weeks/{day[:3]}/{day}.html", index)
        trainer = (ROOT / "trainer.html").read_text()
        self.assertIn("weeks/w08/w08d1.html", trainer)
        self.assertIn("weeks/w09/w09d1.html", trainer)
        self.assertIn("weeks/w10/w10d5.html", trainer)
        delivery = (ROOT / "client-delivery.html").read_text()
        for artifact in ("SRE-08-01", "SEC-09-01", "GOV-09-03", "REL-10-01", "HANDOFF-10-05"):
            self.assertIn(artifact, delivery)

    def test_generator_output_matches_committed_routes_and_loads_run_config(self):
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(
                ["node", "docs/workflows/build-capstone-routes.cjs", tmp], cwd=ROOT, check=True, capture_output=True
            )
            for day in CAPSTONE_DAYS:
                relative = Path("weeks") / day[:3] / f"{day}.html"
                generated = (Path(tmp) / relative).read_text()
                with self.subTest(day=day):
                    self.assertEqual(generated, (ROOT / relative).read_text())
                    scripts = [Path(src.split("?")[0]).name for src in re.findall(r'<script src="([^"]+)"', generated)]
                    self.assertIn("run-config.js", scripts)
                    self.assertLess(scripts.index("run-config.js"), scripts.index("auth.js"))
                    self.assertLess(scripts.index("run-config.js"), scripts.index("capstone-lesson.js"))

    def test_rendered_route_has_one_team_evidence_step_bound_to_the_diagram(self):
        result = node_json(
            "const lessons=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "const r=require('./assets/js/capstone-lesson.js');"
            "globalThis.FDE_CAPSTONE_LESSONS=lessons;const out={};"
            "for(const id of " + json.dumps(CAPSTONE_DAYS) + "){"
            "const root={innerHTML:''},overlays={innerHTML:''};"
            "const doc={title:'',body:{getAttribute:()=>id},head:{appendChild(){}},"
            "getElementById:k=>k==='lesson-root'?root:k==='lesson-overlays'?overlays:null,"
            "querySelector:()=>null,createElement:()=>({})};"
            "globalThis.window={};r.render(doc,{random:()=>0});"
            "out[id]={main:root.innerHTML,overlays:overlays.innerHTML,steps:lessons[id].sections.length};}"
            "console.log(JSON.stringify(out));"
        )
        for day, rendered in result.items():
            html = rendered["main"] + rendered["overlays"]
            with self.subTest(day=day):
                self.assertEqual(html.count('id="team-evidence-title"'), 1)
                ids = re.findall(r'\sid="([^"]+)"', html)
                self.assertEqual(len(ids), len(set(ids)))
                evidence_steps = re.findall(r'<section class="step team-evidence"([^>]*)>', rendered["main"])
                self.assertEqual(len(evidence_steps), 1)
                self.assertIn(f'data-step="{rendered["steps"] - 1}"', evidence_steps[0])
                self.assertIn('data-diagram="0"', evidence_steps[0])
                self.assertNotRegex(rendered["overlays"], r'class="[^"]*\bstep\b')
                self.assertIn("team-evidence", rendered["overlays"])

    def test_pacing_derives_reading_minutes_from_required_words(self):
        pacing = node_json(
            "const d=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "const r=require('./assets/js/capstone-lesson.js');"
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(d).map(([id,v])=>[id,[r.pacingFor(v),r.pacingFor(v,'aws'),r.pacingFor(v,'gcp')]]))));"
        )
        self.assertEqual(set(pacing), set(CAPSTONE_DAYS))
        for day, paths in pacing.items():
            for record in paths:
                with self.subTest(day=day):
                    self.assertLessEqual(record["words"], 1800)
                    self.assertEqual(record["readMinutes"], round(record["words"] / 150))
                    allowances = record["allowances"]
                    self.assertEqual(
                        record["requiredMinutes"],
                        record["readMinutes"] + allowances["diagram"] + allowances["interaction"] + allowances["check"],
                    )
                    self.assertLessEqual(record["requiredMinutes"], 30)
        for day in CAPSTONE_DAYS:
            article = core30.reading_article(core30.parse(ROOT / "weeks" / day[:3] / f"{day}.html"))
            selections = (None, "aws", "gcp") if day in PROVIDER_DAYS else (None,)
            for index, selection in enumerate(selections):
                with self.subTest(day=day, selection=selection):
                    self.assertEqual(pacing[day][index]["words"], core30.required_words(article, selection))
        for day in PROVIDER_DAYS:
            page = (ROOT / "weeks" / day[:3] / f"{day}.html").read_text()
            nojs = re.search(r"<noscript>(.*?)</noscript>", page, re.S).group(1)
            for index, cloud in ((1, "aws"), (2, "gcp")):
                label = re.search(r'<span class="core30-meta" data-cloud="' + cloud + r'">.*?~(\d+) min read.*?~(\d+) min required', nojs)
                with self.subTest(day=day, cloud=cloud):
                    self.assertIsNotNone(label)
                    self.assertEqual(int(label.group(1)), pacing[day][index]["readMinutes"])
                    self.assertEqual(int(label.group(2)), pacing[day][index]["requiredMinutes"])

if __name__ == "__main__":
    unittest.main()
