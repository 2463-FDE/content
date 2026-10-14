"""Contracts for the source-remapped Week 7–8 Core-30 curriculum."""

import html
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/js/curriculum-lessons-w07-w08.js"
RENDERER = ROOT / "assets/js/platform-lesson.js"
DAY_IDS = [f"w{week:02}d{day}" for week in (7, 8) for day in range(1, 6)]


def node_json(source):
    result = subprocess.run(
        ["node", "-e", source], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return json.loads(result.stdout)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts = []
        self.links = []
        self.noscript_depth = 0
        self.noscript_text = []
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"].split("?", 1)[0])
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "meta" and attrs.get("name"):
            self.meta[attrs["name"]] = attrs.get("content", "")
        if tag == "noscript":
            self.noscript_depth += 1

    def handle_endtag(self, tag):
        if tag == "noscript":
            self.noscript_depth -= 1

    def handle_data(self, data):
        if self.noscript_depth:
            self.noscript_text.append(data)


class PlatformCore30Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lessons = node_json(
            "const d=require('./assets/js/curriculum-lessons-w07-w08.js');"
            "const r=require('./assets/js/platform-lesson.js');"
            "for(const [k,v] of Object.entries(d)){v._pacing=r.pacingFor(v)};"
            "console.log(JSON.stringify(d));"
        )

    def test_authoritative_data_has_all_ten_days_and_source_topics(self):
        self.assertEqual(list(self.lessons), DAY_IDS)
        expected = {
            "w07d1": ("Terraform", "state", "plan"),
            "w07d2": ("Modules", "drift", "AI"),
            "w07d3": ("Ansible", "inventory", "idempotence"),
            "w07d4": ("CI/CD", "security", "rollback"),
            "w07d5": ("Project 2", "primary-cloud", "rebuild"),
            "w08d1": ("SLO", "quality", "cost"),
            "w08d2": ("OTel", "traces", "drift"),
            "w08d3": ("Correlate", "Kafka", "root cause"),
            "w08d4": ("Evaluations", "circuit", "degradation"),
            "w08d5": ("Incident", "runbook", "readout"),
        }
        for day_id, needles in expected.items():
            lesson = self.lessons[day_id]
            blob = json.dumps(lesson)
            for needle in needles:
                self.assertIn(needle.lower(), blob.lower(), (day_id, needle))
            self.assertEqual(len(lesson["sections"]), 7)
            self.assertEqual(len(lesson["checks"]), 6)
            self.assertGreaterEqual(len(lesson["concepts"]), 4)
            self.assertRegex(lesson["sources"][0]["href"], rf"docs/research/w{lesson['week']:02}/w{lesson['week']:02}d{lesson['day']}\.md$")

    def test_core_30_pacing_and_checks_are_honest(self):
        for day_id, lesson in self.lessons.items():
            pacing = lesson["_pacing"]
            self.assertGreaterEqual(pacing["words"], 550, day_id)
            self.assertLessEqual(pacing["words"], 1800, day_id)
            self.assertLessEqual(pacing["requiredMinutes"], 30, day_id)
            self.assertEqual(len(lesson["drill"]["options"]), 3)
            answers = [q["answer"] for q in lesson["checks"]]
            self.assertGreater(len(set(answers)), 2, day_id)
            for question in lesson["checks"]:
                self.assertEqual(question["type"], "scq")
                self.assertEqual(len(question["options"]), 4)
                self.assertIn(question["answer"], range(4))
                self.assertTrue(question["explain"].strip())

    def test_route_shells_load_shared_assets_and_no_retired_runtime(self):
        for day_id, lesson in self.lessons.items():
            page = ROOT / "weeks" / f"w{lesson['week']:02}" / f"{day_id}.html"
            text = page.read_text(encoding="utf-8")
            parser = PageParser()
            parser.feed(text)
            self.assertEqual(parser.meta["fde-day"], day_id)
            self.assertIn("../../assets/js/curriculum-lessons-w07-w08.js", parser.scripts)
            self.assertIn("../../assets/js/platform-lesson.js", parser.scripts)
            self.assertNotIn("../../assets/js/interactive-w7-trace.js", parser.scripts)
            self.assertNotIn("../../assets/js/interactive-security.js", parser.scripts)
            self.assertIn("Core 30", text)
            self.assertIn("1 interaction", text)
            self.assertIn("6-Q check", text)
            self.assertNotIn("ix-future", text)
            self.assertEqual(text.count("data-archify-visual"), 1)

    def test_no_javascript_path_contains_every_required_section_and_check(self):
        for day_id, lesson in self.lessons.items():
            page = ROOT / "weeks" / f"w{lesson['week']:02}" / f"{day_id}.html"
            parser = PageParser()
            parser.feed(page.read_text(encoding="utf-8"))
            fallback = " ".join("".join(parser.noscript_text).split())
            self.assertIn(lesson["title"], fallback)
            self.assertIn("text alternative", fallback)
            self.assertIn("Comprehension check", fallback)
            for title, _ in lesson["sections"]:
                self.assertIn(title, fallback, (day_id, title))
            for question in lesson["checks"]:
                self.assertIn(question["stem"], fallback, (day_id, question["stem"]))
                self.assertIn(question["options"][question["answer"]], fallback)

    def test_local_route_links_exist(self):
        for day_id, lesson in self.lessons.items():
            page = ROOT / "weeks" / f"w{lesson['week']:02}" / f"{day_id}.html"
            parser = PageParser()
            parser.feed(page.read_text(encoding="utf-8"))
            for href in parser.links:
                if href.startswith(("http:", "https:", "#")):
                    continue
                target = (page.parent / href.split("?", 1)[0].split("#", 1)[0]).resolve()
                self.assertTrue(target.exists(), (day_id, href))

    def test_renderer_routes_and_shuffle_preserve_answer_identity(self):
        result = node_json(
            "const d=require('./assets/js/curriculum-lessons-w07-w08.js');"
            "const r=require('./assets/js/platform-lesson.js');"
            "console.log(JSON.stringify({"
            "a:r.route('w07d5'),b:r.route('w08d5'),"
            "order:r.drillOrder(3,()=>0),"
            "ok:r.assessDrill(d.w07d1,1),bad:r.assessDrill(d.w07d1,0)}));"
        )
        self.assertEqual(result["a"], "../w08/w08d1.html")
        self.assertEqual(result["b"], "../w09/w09d1.html")
        self.assertEqual(sorted(result["order"]), [0, 1, 2])
        self.assertTrue(result["ok"]["correct"])
        self.assertFalse(result["bad"]["correct"])

    def test_browser_renders_desktop_mobile_dark_reduced_and_no_javascript(self):
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
        candidates.extend(filter(None, (shutil.which(name) for name in ("google-chrome", "chromium"))))
        chrome = next((item for item in candidates if Path(item).exists()), None)
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        cases = [
            (ROOT / "weeks/w07/w07d4.html", "desktop-light", ["--window-size=1440,1000"]),
            (ROOT / "weeks/w07/w07d4.html", "mobile-light", ["--window-size=390,844"]),
            (ROOT / "weeks/w08/w08d3.html", "desktop-dark", ["--window-size=1440,1000", "--force-dark-mode"]),
            (ROOT / "weeks/w08/w08d3.html", "reduced-motion", ["--window-size=1440,1000", "--force-prefers-reduced-motion"]),
        ]
        for route, mode, flags in cases:
            with self.subTest(route=route.stem, mode=mode), tempfile.TemporaryDirectory() as profile:
                result = subprocess.run(
                    [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                     "--no-default-browser-check", f"--user-data-dir={profile}",
                     "--allow-file-access-from-files", "--virtual-time-budget=2000",
                     *flags, "--dump-dom", route.as_uri()],
                    text=True, capture_output=True, timeout=40,
                )
                self.assertEqual(result.returncode, 0, result.stderr[-1000:])
                dom = result.stdout
                self.assertIn("Core 30", dom)
                self.assertIn('data-platform-drill=""', dom)
                self.assertIn('data-core="optional"', dom)
                self.assertIn('class="fde-archify"', dom)
                self.assertIn("<figcaption>", dom)
                self.assertNotIn("Lesson unavailable", dom)
                self.assertNotIn("data-answer", dom)
        with tempfile.TemporaryDirectory() as profile:
            route = ROOT / "weeks/w08/w08d5.html"
            result = subprocess.run(
                [chrome, "--headless=new", "--disable-gpu", "--disable-javascript",
                 "--no-first-run", "--no-default-browser-check", f"--user-data-dir={profile}",
                 "--allow-file-access-from-files", "--dump-dom", route.as_uri()],
                text=True, capture_output=True, timeout=40,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        self.assertIn("Incident response and reliability evidence", result.stdout)
        self.assertIn("text alternative", result.stdout)
        self.assertIn("Defensible response", result.stdout)
        self.assertIn("Comprehension check", result.stdout)

    def test_learner_trainer_client_and_week9_continuity_surfaces(self):
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
        candidates.extend(filter(None, (shutil.which(name) for name in ("google-chrome", "chromium"))))
        chrome = next((item for item in candidates if Path(item).exists()), None)
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        pages = {
            "hub": (ROOT / "index.html").as_uri(),
            "trainer": (ROOT / "trainer.html").as_uri(),
            "client7": (ROOT / "client-delivery.html").as_uri() + "?w=7&p=healthcare",
            "client8": (ROOT / "client-delivery.html").as_uri() + "?w=8&p=finance",
            "client9h": (ROOT / "client-delivery.html").as_uri() + "?w=9&p=healthcare",
            "client9f": (ROOT / "client-delivery.html").as_uri() + "?w=9&p=finance",
            "alt7": (ROOT / "alt-research.html").as_uri() + "?w=7",
            "alt8": (ROOT / "alt-research.html").as_uri() + "?w=8",
            "alt9": (ROOT / "alt-research.html").as_uri() + "?w=9",
            "week9": (ROOT / "weeks/w09/w09d1.html").as_uri(),
        }
        harness_script = r"""
const pages = %s, out = {};
localStorage.setItem('fde_identity', JSON.stringify({code:'T', name:'Trainer Test', role:'trainer'}));
function load(entries, i) {
  if (i >= entries.length) { document.body.dataset.result = JSON.stringify(out); return; }
  const [key, url] = entries[i], frame = document.createElement('iframe');
  frame.onload = () => setTimeout(() => {
    out[key] = {
      text: frame.contentDocument.body.innerText.replace(/\s+/g, ' ').trim(),
      links: Array.from(frame.contentDocument.querySelectorAll('a[href]')).map(a => a.getAttribute('href'))
    };
    frame.remove(); load(entries, i + 1);
  }, 300);
  frame.src = url; document.body.appendChild(frame);
}
load(Object.entries(pages), 0);
""" % json.dumps(pages)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "platform-surfaces.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{harness_script}</script></body></html>",
                encoding="utf-8",
            )
            result = subprocess.run(
                [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                 "--no-default-browser-check", "--allow-file-access-from-files",
                 f"--user-data-dir={Path(tmp) / 'profile'}", "--virtual-time-budget=9000",
                 "--dump-dom", harness.as_uri()],
                text=True, capture_output=True, timeout=50,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "surface harness did not report")
        rendered = json.loads(html.unescape(match.group(1)))
        for surface in ("hub", "trainer", "client7", "alt7"):
            self.assertIn("Terraform + Ansible", rendered[surface]["text"], surface)
        for surface in ("hub", "trainer", "client8", "alt8"):
            self.assertIn("AI Observability", rendered[surface]["text"], surface)
        self.assertNotIn("Week 7 Observability, SRE & Guardrails", rendered["hub"]["text"])
        self.assertNotIn("Week 8 Security, Governance & Responsible AI", rendered["hub"]["text"])
        self.assertIn("Safe-Harbor", rendered["client9h"]["text"])
        self.assertIn("adverse-action-reason gap", rendered["client9f"]["text"])
        self.assertIn("Security, Governance & Responsible AI", rendered["alt9"]["text"])
        self.assertIn("Week 8 made the inherited system operable", rendered["week9"]["text"])
        links = rendered["week9"]["links"]
        self.assertIn("../../docs/research/w09/archive-week8-security/w08d1.md", links)
        self.assertIn("../../docs/research/w09/archive-week8-security/w08d5.md", links)
        self.assertFalse((ROOT / "assets/js/interactive-w7-trace.js").exists())
        self.assertFalse((ROOT / "assets/js/interactive-security.js").exists())
        self.assertTrue((ROOT / "assets/js/archive/interactive-w7-trace-observability-v1.js").exists())
        self.assertTrue((ROOT / "assets/js/archive/interactive-w8-security-v1.js").exists())


if __name__ == "__main__":
    unittest.main()
