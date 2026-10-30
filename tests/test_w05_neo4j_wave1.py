"""Priority 1 Wave 1 contract for the source-authoritative Neo4j Week 5."""

from __future__ import annotations

import hashlib
import json
import html
import re
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    from test_curriculum_currency import Element, ParsedPage
except ModuleNotFoundError:  # direct module execution from the repository root
    from tests.test_curriculum_currency import Element, ParsedPage

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted((ROOT / "weeks" / "w05").glob("w05d*.html"))
WORD_BUDGET = 1800
WPM = 150
EXCLUDED_TAGS = {"pre", "script", "button", "svg", "noscript"}
EXCLUDED_CLASSES = {"reading-sources", "w5-lab"}
EXPECTED_SECTIONS = {"w05d1": 8, "w05d2": 8, "w05d3": 7, "w05d4": 8, "w05d5": 5}
EXPECTED_TITLES = {
    "w05d1": "Model the Client Domain as a Property Graph",
    "w05d2": "Design a Governed Graph Schema and Import",
    "w05d3": "Construct a Knowledge Graph and Choose a Retriever",
    "w05d4": "Engineer Production Context with Graph and Vector Retrieval",
    "w05d5": "Review the Graph Model and Defend the GraphRAG Service",
}
ARCHIFY_ROUTES = {"w05d3", "w05d4"}
ARCHIFY_MANIFEST = ROOT / "docs" / "research" / "w05" / "archify-provenance.json"
ARCHIFY_FORBIDDEN = re.compile(
    r"<script|foreignObject|<image|<(?:iframe|object|embed)|"
    r"\s+on[a-z0-9_-]+\s*=|@import|@font-face|JetBrains|"
    r"(?:href|src)\s*=|url\s*\(\s*[\"']?(?:https?:|//|data:)",
    re.I,
)


def node_json(source: str) -> dict:
    result = subprocess.run(
        ["node", "-e", source], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return json.loads(result.stdout)


def classes(element: Element) -> set[str]:
    return set((element.attrs.get("class") or "").split())


def optional(element: Element) -> bool:
    return (
        element.tag in EXCLUDED_TAGS
        or bool(classes(element) & EXCLUDED_CLASSES)
        or element.attrs.get("data-core") == "optional"
    )


def required_words(article: Element) -> int:
    text: list[str] = []

    def walk(node: Element) -> None:
        for child in node.children:
            if isinstance(child, str):
                text.append(child)
            elif not optional(child):
                walk(child)

    walk(article)
    return len(re.findall(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*", " ".join(text)))


def text_of(element: Element) -> str:
    return " ".join(element.text().split())


def find_chrome() -> str | None:
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    candidates.extend(filter(None, (shutil.which(n) for n in ("google-chrome", "chromium"))))
    return next((candidate for candidate in candidates if Path(candidate).exists()), None)


class Week5Neo4jWave1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = node_json(
            "const w=require('./assets/js/curriculum-week5.js');"
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(w.lessons).map(([id,x])=>[id,{"
            "checks:x.checks,lab:x.lab,captionCount:x.diagram.captions.length,nodeCount:x.diagram.nodes.length,"
            "assessment:['relationship','defer','vector-cypher','hybrid','block'].map(v=>w.assess(id,v))"
            "}]))));"
        )

    def test_all_five_routes_keep_the_lesson_structure(self) -> None:
        self.assertEqual([p.stem for p in PAGES], list(EXPECTED_TITLES))
        for path in PAGES:
            with self.subTest(route=path.stem):
                page = ParsedPage(path)
                self.assertEqual(1, len(page.root.find_all("article", "reading-col")))
                self.assertEqual(EXPECTED_SECTIONS[path.stem], len(page.root.find_all("section", "step")))

    def test_browser_renders_the_accepted_daily_scope(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        required_terms = {
            "w05d1": ["property graph", "MATCH", "CREATE", "MERGE", "Docker", "Browser", "decision point"],
            "w05d2": ["Variable-length", "Indexes", "constraints", "LOAD CSV", "Compliance", "Lock", "AI-native story"],
            "w05d3": ["GraphRAG", "SimpleKGPipeline", "experimental", "VectorRetriever", "VectorCypherRetriever", "Text2CypherRetriever"],
            "w05d4": ["institutional memory", "Chroma", "LangGraph", "Evaluate grounding", "performance", "MCP", "topology"],
            "w05d5": ["Assessment", "executive", "technical-team", "MCP", "Text2Cypher", "feedback"],
        }
        routes = {path.stem: path.as_uri() for path in PAGES}
        harness_script = r"""
const routes = %s, out = {};
function load(entries, i) {
  if (i >= entries.length) { document.body.dataset.result = JSON.stringify(out); return; }
  const [id, url] = entries[i], frame = document.createElement('iframe');
  frame.onload = () => setTimeout(() => {
    const d = frame.contentDocument;
    d.querySelectorAll('details').forEach(el => el.open = true);
    out[id] = {
      title: d.querySelector('h1')?.innerText.trim() || '',
      text: d.body.innerText.replace(/\s+/g, ' ').trim()
    };
    frame.remove(); load(entries, i + 1);
  }, 250);
  frame.src = url; document.body.appendChild(frame);
}
load(Object.entries(routes), 0);
""" % json.dumps(routes)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "w5-scope-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{harness_script}</script></body></html>",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                    "--no-default-browser-check", "--allow-file-access-from-files",
                    f"--user-data-dir={Path(tmp) / 'profile'}", "--virtual-time-budget=7000",
                    "--dump-dom", harness.as_uri(),
                ],
                text=True, capture_output=True, timeout=40,
            )
        self.assertEqual(0, result.returncode, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "scope harness did not report")
        rendered = json.loads(html.unescape(match.group(1)))
        for lesson_id, terms in required_terms.items():
            text = rendered[lesson_id]["text"]
            with self.subTest(route=lesson_id):
                self.assertEqual(EXPECTED_TITLES[lesson_id], rendered[lesson_id]["title"])
                self.assertIn("Neo4j Knowledge Graphs & Context Engineering", text)
                self.assertNotIn("Spec-Driven Dev & Problem Scoping", text)
                self.assertNotIn("JavaScript is required for this lesson", text)
            for term in terms:
                with self.subTest(route=lesson_id, term=term):
                    self.assertIn(term.casefold(), text.casefold())

    def test_each_day_meets_core30_pacing_and_optional_depth_contract(self) -> None:
        for path in PAGES:
            page = ParsedPage(path)
            article = page.root.find_all("article", "reading-col")[0]
            words = required_words(article)
            metas = page.root.find_all("span", "core30-meta")
            with self.subTest(route=path.stem, words=words):
                self.assertGreater(words, 450)
                self.assertLessEqual(words, WORD_BUDGET)
                self.assertEqual(1, len(metas))
                meta = text_of(metas[0])
                advertised = re.search(r"~(\d+) min read", meta)
                total = re.search(r"~(\d+) min required", meta)
                self.assertIsNotNone(advertised)
                self.assertIsNotNone(total)
                self.assertEqual(round(words / WPM), int(advertised.group(1)))
                self.assertEqual(round(words / WPM) + 3 + 6 + 5, int(total.group(1)))
                self.assertIn("3 min diagram", meta)
                self.assertIn("1 interaction", meta)
                self.assertIn("6-Q check", meta)
                self.assertLessEqual(int(total.group(1)), 30)

                labs = article.find_all("div", "w5-lab")
                self.assertEqual(1, len(labs))
                self.assertIsNone(labs[0].attrs.get("data-core"), "interaction must remain required")
                deep = article.find_all("details", "deep")
                self.assertGreaterEqual(len(deep), 3)
                self.assertTrue(all(d.attrs.get("data-core") == "optional" for d in deep))
                sources = article.find_all("section", "reading-sources")
                self.assertEqual(1, len(sources))
                self.assertEqual("optional", sources[0].attrs.get("data-core"))

    def test_diagrams_and_checks_match_each_static_route(self) -> None:
        for lesson_id, cfg in self.config.items():
            with self.subTest(route=lesson_id):
                self.assertEqual(EXPECTED_SECTIONS[lesson_id], cfg["captionCount"])
                self.assertGreaterEqual(cfg["nodeCount"], 7)
                self.assertEqual(6, len(cfg["checks"]))
                for question in cfg["checks"]:
                    self.assertEqual(4, len(question["options"]))
                    self.assertEqual(4, len(set(question["options"])))
                    self.assertIn(question["answer"], range(4))
                    self.assertTrue(question["explain"])
        answer_positions = {
            question["answer"] for cfg in self.config.values() for question in cfg["checks"]
        }
        self.assertEqual({0, 1, 2, 3}, answer_positions)

    def test_decision_labs_keep_stable_nonleaking_answer_mapping(self) -> None:
        expected_answers = {
            "w05d1": "relationship", "w05d2": "defer", "w05d3": "vector-cypher",
            "w05d4": "hybrid", "w05d5": "block",
        }
        for path in PAGES:
            page = ParsedPage(path)
            lab = page.root.find_all("div", "w5-lab")[0]
            radios = lab.find_all("input")
            values = [radio.attrs.get("value") for radio in radios]
            with self.subTest(route=path.stem):
                self.assertEqual(4, len(values))
                self.assertEqual(4, len(set(values)))
                self.assertFalse(
                    any("data-correct" in node.attrs for node in lab.find_all())
                )
                correct = expected_answers[path.stem]
                self.assertIn(correct, values)
                for value in values:
                    result = node_json(
                        "const w=require('./assets/js/curriculum-week5.js');"
                        f"console.log(JSON.stringify(w.assess({json.dumps(path.stem)},{json.dumps(value)})));"
                    )
                    self.assertEqual(value == correct, result["correct"])
                    self.assertTrue(result["message"])
                status = lab.find_all("p", "w5-status")[0]
                self.assertEqual("status", status.attrs.get("role"))
                self.assertEqual("polite", status.attrs.get("aria-live"))

    def test_code_examples_are_inert_synthetic_and_accessible(self) -> None:
        forbidden = re.compile(r"boto3|requests\.|urllib|os\.environ|AWS_(?:SECRET|ACCESS)|neo4j\+s?://", re.I)
        for path in PAGES:
            page = ParsedPage(path)
            with self.subTest(route=path.stem):
                buttons = page.root.find_all("button", "code-cta")
                viewers = page.root.find_all("div", "cv")
                raws = page.root.find_all("pre", "cv-raw")
                self.assertEqual((1, 1, 1), (len(buttons), len(viewers), len(raws)))
                self.assertEqual("dialog", buttons[0].attrs.get("aria-haspopup"))
                code = raws[0].text()
                self.assertIn("Synthetic", code)
                self.assertIsNone(forbidden.search(code))
                self.assertEqual(1, sum("codeviewer.js" in (s.attrs.get("src") or "") for s in page.root.find_all("script")))

    def test_archify_svgs_match_provenance_and_safe_import_contract(self) -> None:
        manifest = json.loads(ARCHIFY_MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual("v3.0.1", manifest["source"]["version"])
        self.assertEqual(
            "2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c",
            manifest["source"]["commit"],
        )
        self.assertEqual(
            "266e2da15149921f0a95aa52e4a1837240ca9d171be8bd041553642fb1ba925c",
            manifest["tooling"]["sanitizerSha256"],
        )
        self.assertEqual(ARCHIFY_ROUTES, set(manifest["diagrams"]))

        for lesson_id in ARCHIFY_ROUTES:
            path = ROOT / "weeks" / "w05" / f"{lesson_id}.html"
            source = path.read_text(encoding="utf-8")
            matches = re.findall(
                r'(<svg\b(?=[^>]*class="fde-archify")[\s\S]*?</svg>\n)', source
            )
            with self.subTest(route=lesson_id):
                self.assertEqual(1, len(matches))
                svg_bytes = matches[0].encode("utf-8")
                evidence = manifest["diagrams"][lesson_id]
                self.assertEqual(evidence["sanitizedBytes"], len(svg_bytes))
                self.assertEqual(
                    evidence["sanitizedSha256"], hashlib.sha256(svg_bytes).hexdigest()
                )
                self.assertIsNone(ARCHIFY_FORBIDDEN.search(matches[0]))

                root = ET.fromstring(matches[0])
                ids = [node.get("id") for node in root.iter() if node.get("id")]
                self.assertEqual(len(ids), len(set(ids)))
                self.assertEqual("img", root.get("role"))
                self.assertEqual("0", root.get("tabindex"))
                labels = (root.get("aria-labelledby") or "").split()
                self.assertEqual(2, len(labels))
                self.assertTrue(all(label in ids for label in labels))
                title = next(
                    node for node in root if node.tag.rsplit("}", 1)[-1] == "title"
                )
                desc = next(
                    node for node in root if node.tag.rsplit("}", 1)[-1] == "desc"
                )
                self.assertEqual(evidence["title"], (title.text or "").strip())
                self.assertTrue((desc.text or "").strip())
                focus_order = [
                    (node.get("aria-label") or "").split(",", 1)[0]
                    for node in root.iter()
                    if node.get("role") == "group" and node.get("tabindex") == "0"
                ]
                expected_order = {
                    "w05d3": ["Documents", "LLM Extract", "Schema Gate", "Neo4j Graph", "Retriever"],
                    "w05d4": ["Question", "Chroma", "Neo4j", "Context Pack", "Grounding Gate", "Agent"],
                }
                self.assertEqual(expected_order[lesson_id], focus_order)

                page = ParsedPage(path)
                all_ids = [
                    node.attrs["id"] for node in page.root.find_all() if node.attrs.get("id")
                ]
                self.assertEqual(len(all_ids), len(set(all_ids)))
                figures = page.root.find_all("figure", "fde-diagram")
                self.assertEqual(1, len(figures))
                self.assertTrue(text_of(figures[0].find_all("figcaption")[0]))
                self.assertFalse(
                    any(
                        "archify" in (script.attrs.get("src") or "").casefold()
                        for script in page.root.find_all("script")
                    )
                )

        non_archify = set(EXPECTED_TITLES) - ARCHIFY_ROUTES
        for lesson_id in non_archify:
            page = ParsedPage(ROOT / "weeks" / "w05" / f"{lesson_id}.html")
            self.assertEqual([], page.root.find_all("svg", "fde-archify"))

    def test_browser_renders_week5_across_hub_trainer_and_delivery_surfaces(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        pages = {
            "hub": (ROOT / "index.html").as_uri(),
            "trainer": (ROOT / "trainer.html").as_uri(),
            "delivery": (ROOT / "delivery-track.html").as_uri(),
            "atlas": (ROOT / "atlas/index.html").as_uri(),
            "healthcare": (ROOT / "client-delivery.html").as_uri() + "?w=5&p=healthcare",
            "finance": (ROOT / "client-delivery.html").as_uri() + "?w=5&p=finance",
            "research": (ROOT / "alt-research.html").as_uri() + "?w=5",
        }
        harness_script = r"""
const pages = %s, out = {};
localStorage.setItem('fde_identity', JSON.stringify({code:'T', name:'Trainer Test', role:'trainer'}));
function load(keys, i) {
  if (i >= keys.length) { document.body.dataset.result = JSON.stringify(out); return; }
  const key = keys[i], frame = document.createElement('iframe');
  frame.onload = () => setTimeout(() => {
    const d = frame.contentDocument;
    if (key === 'hub') {
      const week = [...d.querySelectorAll('.cal-week')].find(el => el.querySelector('.ww')?.textContent.trim() === 'Week 5');
      const days = [];
      let cell = week && week.nextElementSibling;
      for (let n = 0; cell && n < 5; n++, cell = cell.nextElementSibling) {
        days.push({title: cell.querySelector('.ct-link')?.textContent.trim() || '', href: cell.querySelector('.ct-link')?.getAttribute('href') || ''});
      }
      out[key] = {title: week?.querySelector('.wt')?.textContent.trim() || '', days};
    } else if (key === 'trainer') {
      const link = [...d.querySelectorAll('.tr-curriculum-actions a')].find(el => el.textContent.trim() === 'Demo Neo4j');
      out[key] = {text: d.querySelector('.tr-curriculum')?.textContent.replace(/\s+/g, ' ').trim() || '', href: link?.getAttribute('href') || ''};
    } else if (key === 'delivery') {
      out[key] = {text: d.body.textContent.replace(/\s+/g, ' ').trim()};
    } else if (key === 'atlas') {
      out[key] = {content: JSON.stringify(frame.contentWindow.FDE?.BRANCHES || [])};
    } else {
      out[key] = {title: d.querySelector('#panel h2')?.textContent.trim() || ''};
    }
    frame.remove(); load(keys, i + 1);
  }, 350);
  frame.src = pages[key]; document.body.appendChild(frame);
}
load(Object.keys(pages), 0);
""" % json.dumps(pages)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "w5-surface-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{harness_script}</script></body></html>",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                    "--no-default-browser-check", "--allow-file-access-from-files",
                    f"--user-data-dir={Path(tmp) / 'profile'}", "--virtual-time-budget=9000",
                    "--dump-dom", harness.as_uri(),
                ],
                text=True, capture_output=True, timeout=40,
            )
        self.assertEqual(0, result.returncode, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "surface harness did not report")
        rendered = json.loads(html.unescape(match.group(1)))
        title = "Neo4j Knowledge Graphs & Context Engineering"
        self.assertEqual(title, rendered["hub"]["title"])
        self.assertEqual(
            [
                "Property-graph domain model",
                "Governed graph schema",
                "GraphRAG construction",
                "Production context engineering",
                "GraphRAG model review",
            ],
            [day["title"] for day in rendered["hub"]["days"]],
        )
        for day, rendered_day in enumerate(rendered["hub"]["days"], 1):
            route = urlparse(rendered_day["href"])
            self.assertTrue(route.path.endswith(f"/weeks/w05/w05d{day}.html"), route.path)
            self.assertEqual(parse_qs(route.query).get("batch"), ["2567"])
        self.assertIn("Week 5 solo insurance Neo4j/context engineering", rendered["trainer"]["text"])
        trainer_route = urlparse(rendered["trainer"]["href"])
        self.assertTrue(trainer_route.path.endswith("/weeks/w05/w05d1.html"))
        self.assertEqual(parse_qs(trainer_route.query).get("batch"), ["2567"])
        self.assertIn("XY reframe, live", rendered["delivery"]["text"])
        self.assertNotIn("W5 · XY", rendered["delivery"]["text"])
        self.assertNotIn("XY reframe from W5", rendered["delivery"]["text"])
        self.assertIn("Loop Engineering", rendered["atlas"]["content"])
        self.assertIn("Scope &rarr; Sequence &rarr; Build &rarr; Ship &rarr; Measure", rendered["atlas"]["content"])
        self.assertNotIn("Loop Engineering in Week 5", rendered["atlas"]["content"])
        self.assertNotIn("Taught in Week 5 Day 5", rendered["atlas"]["content"])
        self.assertEqual(title, rendered["healthcare"]["title"])
        self.assertEqual(title, rendered["finance"]["title"])
        self.assertEqual(title, rendered["research"]["title"])

    def test_browser_keeps_idempotency_as_prior_client_context(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        pages = {
            "delivery": (ROOT / "client-delivery.html").as_uri() + "?w=7&p=finance",
            "lesson": (ROOT / "weeks/w07/w07d1.html").as_uri(),
        }
        harness_script = r"""
const pages = %s, out = {};
localStorage.setItem('fde_identity', JSON.stringify({code:'T', name:'Trainer Test', role:'trainer'}));
function load(entries, i) {
  if (i >= entries.length) { document.body.dataset.result = JSON.stringify(out); return; }
  const [key, url] = entries[i], frame = document.createElement('iframe');
  frame.onload = () => setTimeout(() => {
    out[key] = frame.contentDocument.body.innerText.replace(/\s+/g, ' ').trim();
    frame.remove(); load(entries, i + 1);
  }, 350);
  frame.src = url; document.body.appendChild(frame);
}
load(Object.entries(pages), 0);
""" % json.dumps(pages)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "w7-attribution-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{harness_script}</script></body></html>",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                    "--no-default-browser-check", "--allow-file-access-from-files",
                    f"--user-data-dir={Path(tmp) / 'profile'}", "--virtual-time-budget=5000",
                    "--dump-dom", harness.as_uri(),
                ],
                text=True, capture_output=True, timeout=40,
            )
        self.assertEqual(0, result.returncode, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "attribution harness did not report")
        rendered = json.loads(html.unescape(match.group(1)))
        for surface, text in rendered.items():
            with self.subTest(surface=surface):
                self.assertIn("prior client-system idempotency gap", text)
                self.assertNotIn("W5 idempotency gap", text)

    def test_browser_renders_diagram_and_meaningful_no_js_fallback(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        route = ROOT / "weeks/w05/w05d3.html"
        base_args = [
            chrome, "--headless=new", "--disable-gpu", "--no-first-run",
            "--no-default-browser-check", "--allow-file-access-from-files",
            "--window-size=390,844", "--virtual-time-budget=2500", "--dump-dom",
        ]
        with tempfile.TemporaryDirectory() as profile:
            result = subprocess.run(
                base_args[:-2] + [f"--user-data-dir={profile}"] + base_args[-2:] + [route.as_uri()],
                text=True, capture_output=True, timeout=30,
            )
        self.assertEqual(0, result.returncode, result.stderr[-1000:])
        self.assertIn(EXPECTED_TITLES["w05d3"], result.stdout)
        self.assertRegex(result.stdout, r'class="[^"]*d-node')
        self.assertIn('data-w5-lab=""', result.stdout)

        with tempfile.TemporaryDirectory() as profile:
            nojs = subprocess.run(
                base_args[:-2] + ["--disable-javascript", f"--user-data-dir={profile}"] + base_args[-2:] + [route.as_uri()],
                text=True, capture_output=True, timeout=30,
            )
        self.assertEqual(0, nojs.returncode, nojs.stderr[-1000:])
        self.assertIn(EXPECTED_TITLES["w05d3"], nojs.stdout)
        self.assertIn("Diagram key:", nojs.stdout)
        self.assertIn("GraphRAG construction from reviewed sources", nojs.stdout)
        self.assertIn('class="fde-archify"', nojs.stdout)
        self.assertIn("JavaScript is off. Record your choice", nojs.stdout)
        self.assertNotIn("JavaScript is required for this lesson", nojs.stdout)

        with tempfile.TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "w05d3.pdf"
            printed = subprocess.run(
                [
                    chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                    "--no-default-browser-check", "--allow-file-access-from-files",
                    f"--user-data-dir={Path(tmp) / 'profile'}",
                    f"--print-to-pdf={pdf}", "--no-pdf-header-footer", route.as_uri(),
                ],
                text=True, capture_output=True, timeout=40,
            )
            self.assertEqual(0, printed.returncode, printed.stderr[-1000:])
            self.assertTrue(pdf.read_bytes().startswith(b"%PDF"))
            self.assertGreater(pdf.stat().st_size, 20_000)

    def test_responsive_theme_keyboard_and_reduced_motion_contract(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        widths = [390, 768, 1024, 1440]
        route = (ROOT / "weeks/w05/w05d4.html").as_uri()
        harness_script = r"""
const widths = %s, route = %s, out = {};
function overlap(a,b) {
  const x = Math.min(a.right,b.right)-Math.max(a.left,b.left);
  const y = Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
  return x > .5 && y > .5;
}
function run(i) {
  if (i >= widths.length) { document.body.dataset.result = JSON.stringify(out); return; }
  const frame = document.createElement('iframe');
  frame.style.cssText = 'width:' + widths[i] + 'px;height:900px;border:0';
  frame.onload = () => setTimeout(() => {
    const d = frame.contentDocument, w = frame.contentWindow;
    // This harness measures lesson layout rather than the separately tested auth
    // dialog. Remove that modal and its intentional inert background first.
    d.querySelector('.login-overlay')?.remove();
    [...d.body.children].forEach((node) => { node.inert = false; node.removeAttribute('aria-hidden'); });
    d.documentElement.setAttribute('data-theme','light');
    const light = getComputedStyle(d.documentElement).getPropertyValue('--bg').trim();
    d.documentElement.setAttribute('data-theme','dark');
    const dark = getComputedStyle(d.documentElement).getPropertyValue('--bg').trim();
    const article = d.querySelector('.reading-col'), side = d.querySelector('.side');
    const input = d.querySelector('[data-w5-lab] input'), check = d.querySelector('[data-w5-check]');
    const diagram = d.querySelector('.fde-archify'), viewport = d.querySelector('.fde-diagram-viewport');
    diagram.focus();
    const diagramFocusWorks = d.activeElement === diagram;
    input.focus();
    const ar = article.getBoundingClientRect(), sr = side.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    const motionProbe = d.querySelector('.step');
    out[widths[i]] = {
      overflow: d.documentElement.scrollWidth > d.documentElement.clientWidth + 1,
      articleVisible: ar.width >= 250 && ar.left >= -1 && ar.right <= widths[i] + 1,
      overlaps: overlap(ar,sr),
      focusWorks: d.activeElement === input,
      diagramFocusWorks,
      diagramContained: vr.left >= ar.left - 10 && vr.right <= ar.right + 10,
      narrowDiagramScrolls: widths[i] > 560 || viewport.scrollWidth > viewport.clientWidth,
      gridHasNoFill: getComputedStyle(diagram.querySelector('.c-grid')).fill === 'none',
      semanticControls: input.tagName === 'INPUT' && check.tagName === 'BUTTON' && input.tabIndex === 0 && check.tabIndex === 0,
      themeDiffers: light && dark && light !== dark,
      reduced: w.matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionMs: parseFloat(getComputedStyle(motionProbe).transitionDuration) * 1000
    };
    frame.remove(); run(i+1);
  }, 450);
  frame.src = route;
  document.body.appendChild(frame);
}
run(0);
""" % (json.dumps(widths), json.dumps(route))
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "w5-layout-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{harness_script}</script></body></html>",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                    "--no-default-browser-check", "--allow-file-access-from-files",
                    "--force-prefers-reduced-motion", f"--user-data-dir={Path(tmp) / 'profile'}",
                    "--window-size=1500,1000", "--virtual-time-budget=12000", "--dump-dom",
                    harness.as_uri(),
                ],
                text=True, capture_output=True, timeout=50,
            )
        self.assertEqual(0, result.returncode, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "layout harness did not report")
        measured = json.loads(match.group(1).replace("&quot;", '"'))
        for width in widths:
            row = measured[str(width)]
            with self.subTest(width=width):
                self.assertFalse(row["overflow"])
                self.assertTrue(row["articleVisible"])
                self.assertFalse(row["overlaps"])
                self.assertTrue(row["focusWorks"])
                self.assertTrue(row["diagramFocusWorks"])
                self.assertTrue(row["diagramContained"])
                self.assertTrue(row["narrowDiagramScrolls"])
                self.assertTrue(row["gridHasNoFill"])
                self.assertTrue(row["semanticControls"])
                self.assertTrue(row["themeDiffers"])
                self.assertTrue(row["reduced"])
                self.assertLessEqual(row["transitionMs"], 1)


if __name__ == "__main__":
    unittest.main()
