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
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/js/curriculum-lessons-w07-w08.js"
RENDERER = ROOT / "assets/js/platform-lesson.js"
DAY_IDS = [f"w{week:02}d{day}" for week in (7, 8) for day in range(1, 6)]


def node_json(source):
    result = subprocess.run(
        ["node", "-e", source], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return json.loads(result.stdout)


def find_chrome():
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    candidates.extend(filter(None, (shutil.which(name) for name in ("google-chrome", "chromium"))))
    return next((item for item in candidates if Path(item).exists()), None)


def run_iframe_harness(chrome, pages, probe, budget=9000):
    script = r"""
const pages = %s, out = {};
const probe = %s;
function load(entries, i) {
  if (i >= entries.length) { document.body.dataset.result = JSON.stringify(out); return; }
  const [key, url] = entries[i], frame = document.createElement('iframe');
  frame.style.width = '1440px'; frame.style.height = '1000px';
  frame.onload = () => setTimeout(() => {
    try { out[key] = probe(frame.contentDocument, frame.contentWindow); }
    catch (error) { out[key] = {error: String(error)}; }
    frame.remove(); load(entries, i + 1);
  }, 300);
  frame.src = url; document.body.appendChild(frame);
}
load(Object.entries(pages), 0);
""" % (json.dumps(pages), probe)
    with tempfile.TemporaryDirectory() as tmp:
        harness = Path(tmp) / "harness.html"
        harness.write_text(
            f"<!doctype html><html><body><script>{script}</script></body></html>",
            encoding="utf-8",
        )
        result = subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
             "--no-default-browser-check", "--allow-file-access-from-files",
             f"--user-data-dir={Path(tmp) / 'profile'}", f"--virtual-time-budget={budget}",
             "--dump-dom", harness.as_uri()],
            text=True, capture_output=True, timeout=60,
        )
    if result.returncode != 0:
        raise AssertionError(result.stderr[-1000:])
    match = re.search(r'data-result="([^"]*)"', result.stdout)
    if not match:
        raise AssertionError("iframe harness did not report")
    return json.loads(html.unescape(match.group(1)))


RENDERED_ROUTE_PROBE = r"""
(doc, win) => {
  const BLACK = 'rgb(0, 0, 0)';
  const meta = doc.querySelector('#lesson-root .core30-meta');
  const drill = doc.querySelectorAll('#lesson-root [data-platform-drill]');
  const svgs = doc.querySelectorAll('#lesson-root svg.fde-archify');
  const paint = [];
  const svg = svgs[0];
  if (svg) {
    svg.querySelectorAll('[class]').forEach(el => {
      const style = win.getComputedStyle(el);
      for (const name of el.classList) {
        const kind = name.slice(0, 2);
        if (!['c-', 'a-', 'm-', 't-'].includes(kind)) continue;
        if (name === 'c-grid') {
          if (style.fill !== 'none') paint.push([name, 'fill', style.fill]);
        } else if (name === 'c-mask') {
          continue;
        } else if (kind === 'a-') {
          if (style.stroke === 'none') paint.push([name, 'stroke', style.stroke]);
          if (style.fill !== 'none') paint.push([name, 'fill', style.fill]);
        } else {
          if (style.fill === 'none' || style.fill === BLACK) paint.push([name, 'fill', style.fill]);
          if (kind === 'c-' && style.stroke === 'none') paint.push([name, 'stroke', style.stroke]);
        }
      }
    });
    svg.querySelectorAll('[stroke="var(--mask)"]').forEach(el => {
      const stroke = win.getComputedStyle(el).stroke;
      if (stroke !== 'rgb(255, 255, 255)') paint.push(['mask-halo', 'stroke', stroke]);
    });
  }
  doc.documentElement.dataset.theme = 'dark';
  const darkCanvas = svg ? win.getComputedStyle(svg).backgroundColor : null;
  const lessons = win.FDE_PLATFORM_LESSONS || {};
  const lesson = lessons[doc.body.getAttribute('data-lesson')];
  const result = {};
  if (drill[0] && lesson) {
    const host = drill[0];
    const status = host.querySelector('.capstone-drill-status');
    const pick = value => host.querySelector('input[value="' + value + '"]').click();
    const wrong = [0, 1, 2].find(value => value !== lesson.drill.answer);
    pick(wrong); host.querySelector('[data-drill-check]').click();
    result.wrong = status.classList.contains('is-correct');
    host.querySelector('[data-drill-reset]').click();
    pick(lesson.drill.answer); host.querySelector('[data-drill-check]').click();
    result.right = status.classList.contains('is-correct');
  }
  return {
    meta: meta ? meta.innerText.replace(/\s+/g, ' ').trim() : '',
    drills: drill.length,
    options: drill[0] ? drill[0].querySelectorAll('input[type=radio]').length : 0,
    future: doc.querySelectorAll('.ix-future').length,
    svgs: svgs.length,
    shapes: svg ? svg.querySelectorAll('[class^="c-"]').length : 0,
    paint: paint,
    darkCanvas: darkCanvas,
    drillResult: result,
    unavailable: !!doc.querySelector('#lesson-root .lesson-load-error')
  };
}
"""


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts = []
        self.links = []
        self.noscript_depth = 0
        self.noscript_text = []
        self.meta = {}
        self.archify_visuals = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "data-archify-visual" in attrs:
            self.archify_visuals += 1
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
            parser = PageParser()
            parser.feed(page.read_text(encoding="utf-8"))
            self.assertEqual(parser.meta["fde-day"], day_id)
            self.assertIn("../../assets/js/curriculum-lessons-w07-w08.js", parser.scripts)
            self.assertIn("../../assets/js/platform-lesson.js", parser.scripts)
            self.assertNotIn("../../assets/js/interactive-w7-trace.js", parser.scripts)
            self.assertNotIn("../../assets/js/interactive-security.js", parser.scripts)
            self.assertEqual(parser.archify_visuals, 1, day_id)

    def test_rendered_routes_expose_pacing_drill_and_readable_visual(self):
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        pages = {
            day_id: (ROOT / "weeks" / f"w{lesson['week']:02}" / f"{day_id}.html").as_uri()
            for day_id, lesson in self.lessons.items()
        }
        rendered = run_iframe_harness(chrome, pages, RENDERED_ROUTE_PROBE, budget=15000)
        self.assertEqual(set(rendered), set(DAY_IDS))
        for day_id, page in rendered.items():
            with self.subTest(day=day_id):
                self.assertNotIn("error", page)
                self.assertFalse(page["unavailable"])
                lesson = self.lessons[day_id]
                self.assertIn("Core 30", page["meta"])
                self.assertIn("1 interaction", page["meta"])
                self.assertIn("6-Q check", page["meta"])
                self.assertIn(f"~{lesson['_pacing']['requiredMinutes']} min required", page["meta"])
                self.assertEqual(page["drills"], 1)
                self.assertEqual(page["options"], 3)
                self.assertEqual(page["drillResult"], {"wrong": False, "right": True})
                self.assertEqual(page["future"], 0)
                self.assertEqual(page["svgs"], 1)
                self.assertGreater(page["shapes"], 0)
                self.assertEqual(page["paint"], [])
                self.assertEqual(page["darkCanvas"], "rgb(255, 255, 255)")

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
        chrome = find_chrome()
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
        chrome = find_chrome()
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
        links = [urlparse(link).path for link in rendered["week9"]["links"]]
        for day in (1, 5):
            archive = f"docs/research/w09/archive-week8-security/w08d{day}.md"
            self.assertTrue(any(path.endswith("/" + archive) for path in links), archive)
        self.assertFalse((ROOT / "assets/js/interactive-w7-trace.js").exists())
        self.assertFalse((ROOT / "assets/js/interactive-security.js").exists())
        self.assertTrue((ROOT / "assets/js/archive/interactive-w7-trace-observability-v1.js").exists())
        self.assertTrue((ROOT / "assets/js/archive/interactive-w8-security-v1.js").exists())


if __name__ == "__main__":
    unittest.main()
