from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def node_json(source: str) -> dict:
    result = subprocess.run(
        ["node", "-e", source], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return json.loads(result.stdout)


def find_chrome() -> str | None:
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    candidates.extend(filter(None, (shutil.which(n) for n in ("google-chrome", "chromium"))))
    return next((candidate for candidate in candidates if Path(candidate).exists()), None)


class CurriculumHubTransferTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.lessons = node_json(
            "const d=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "const r=require('./assets/js/capstone-lesson.js');"
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(d).map(([k,v])=>[k,{"
            "week:v.week,day:v.day,sections:v.sections.length,checks:v.checks.length,"
            "words:r.pacingFor(v).words,minutes:r.pacingFor(v).readMinutes,"
            "requiredMinutes:r.pacingFor(v).requiredMinutes,optional:v.optional.length,"
            "concepts:v.concepts.length,nodes:r.diagramFor(v).nodes.length"
            "}]))));"
        )

    def test_all_ten_routes_are_published_and_use_the_shared_renderer(self) -> None:
        self.assertEqual(
            set(self.lessons),
            {f"w{week:02d}d{day}" for week in (9, 10) for day in range(1, 6)},
        )
        for lesson_id in self.lessons:
            route = ROOT / "weeks" / lesson_id[:3] / f"{lesson_id}.html"
            self.assertTrue(route.is_file(), route)

    def test_each_day_meets_the_core30_content_contract(self) -> None:
        for lesson_id, lesson in self.lessons.items():
            with self.subTest(lesson_id=lesson_id):
                self.assertEqual(lesson["sections"], 7)
                self.assertEqual(lesson["nodes"], lesson["sections"])
                self.assertEqual(lesson["checks"], 6)
                self.assertEqual(lesson["optional"], 2)
                self.assertGreaterEqual(lesson["concepts"], 5)
                self.assertLessEqual(lesson["words"], 1800)
                self.assertEqual(lesson["minutes"], round(lesson["words"] / 150))
                self.assertLessEqual(lesson["requiredMinutes"], 30)

    def test_batch_context_accepts_any_positive_number_and_has_one_default(self) -> None:
        result = node_json(
            "const api=require('./assets/js/batch-context.js');"
            "const cfg=require('./assets/js/curriculum-config.js');"
            "const m=new Map();const storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};"
            "const c=api.create(cfg,storage);"
            "console.log(JSON.stringify({fallback:c.read(),large:c.write('987654321'),read:c.read(),"
            "leading:api.normalize('00042'),bad:c.write('<img src=x>'),still:c.read()}));"
        )
        self.assertEqual(result["fallback"], "25" + "67")
        self.assertTrue(result["large"]["ok"])
        self.assertEqual(result["read"], "987654321")
        self.assertEqual(result["leading"], "42")
        self.assertFalse(result["bad"]["ok"])
        self.assertEqual(result["still"], "987654321")

    def test_identity_and_cloud_status_render_from_config(self) -> None:
        result = node_json(
            "const api=require('./assets/js/batch-context.js');"
            "const cfg=require('./assets/js/curriculum-config.js');"
            "function node(){const a={},c=new Set(['is-pending']);return {a,c,textContent:'',"
            "setAttribute:(k,v)=>{a[k]=v},classList:{toggle:(n,on)=>on?c.add(n):c.delete(n)}};}"
            "function render(config){const n={'[data-client-name]':[node()],'[data-cloud-path-status]':[node()]};"
            "api.mount({querySelectorAll:q=>n[q]||[]},config,null);"
            "const b=n['[data-cloud-path-status]'][0];"
            "return {client:n['[data-client-name]'][0].textContent,badge:b.textContent,"
            "status:b.a['data-cloud-path-status'],classes:[...b.c].sort()};}"
            "const active=Object.assign({},cfg,{cloudPath:{status:'evidence-lane-integrated',label:'AWS/GCP evidence integrated',active:true}});"
            "console.log(JSON.stringify({pending:render(cfg),active:render(active)}));"
        )
        self.assertEqual(result["pending"]["client"], "LTM, formerly LTIMindtree")
        self.assertEqual(result["pending"]["badge"], "AWS/GCP evidence seam pending")
        self.assertEqual(result["pending"]["status"], "evidence-lane-pending")
        self.assertEqual(result["pending"]["classes"], ["is-pending"])
        self.assertEqual(result["active"]["badge"], "AWS/GCP evidence integrated")
        self.assertEqual(result["active"]["status"], "evidence-lane-integrated")
        self.assertEqual(result["active"]["classes"], ["is-ready"])

    def test_comprehension_checks_use_question_specific_distractors(self) -> None:
        questions = node_json(
            "const d=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "console.log(JSON.stringify(Object.values(d).flatMap(v=>v.checks)));"
        )
        self.assertEqual(len(questions), 60)
        seen: dict[str, str] = {}
        for question in questions:
            with self.subTest(stem=question["stem"]):
                options = question["options"]
                self.assertEqual(len(options), 4)
                self.assertEqual(len(set(options)), 4)
                for distractor in options[: question["answer"]] + options[question["answer"] + 1 :]:
                    self.assertNotIn(distractor, seen, f"reused from: {seen.get(distractor)}")
                    seen[distractor] = question["stem"]

    def test_browser_renders_a_representative_route_and_essential_diagram(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        route = ROOT / "weeks/w10/w10d5.html"
        with tempfile.TemporaryDirectory() as profile:
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={profile}",
                    "--allow-file-access-from-files",
                    "--virtual-time-budget=2500",
                    "--dump-dom",
                    route.as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=30,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        dom = result.stdout
        self.assertIn("Client showcase and final handoff", dom)
        self.assertIn("capstone-drill", dom)
        self.assertIn("Core 30", dom)
        self.assertIn('data-core="optional"', dom)
        self.assertRegex(dom, r'class="[^"]*d-node')
        self.assertNotIn("Lesson unavailable", dom)

        with tempfile.TemporaryDirectory() as profile:
            hub_result = subprocess.run(
                [
                    chrome,
                    "--headless=new",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={profile}",
                    "--allow-file-access-from-files",
                    "--virtual-time-budget=2500",
                    "--dump-dom",
                    (ROOT / "index.html").as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=30,
            )
        self.assertEqual(hub_result.returncode, 0, hub_result.stderr[-1000:])
        hub = hub_result.stdout
        for lesson_id in self.lessons:
            self.assertIn(f'weeks/{lesson_id[:3]}/{lesson_id}.html', hub)
        self.assertIn('id="hub-week"', hub)
        self.assertIn('id="hub-day"', hub)
        self.assertIn("Weeks 1–10 routed", hub)


if __name__ == "__main__":
    unittest.main()
