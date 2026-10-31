"""Source, Core-30, interaction, navigation, and accessibility contract for Week 6."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEK_DIR = ROOT / "weeks" / "w06"
EXPECTED_TITLES = {
    "w06d1": "Kafka foundations and event-driven judgement",
    "w06d2": "Delivery semantics, schemas, and managed Kafka economics",
    "w06d3": "Event-driven agents, backpressure, and streaming stores",
    "w06d4": "Build and operate the Kafka-to-agent pipeline",
    "w06d5": "Pipeline defense, measured readout, and fallback",
}


def node_json(source: str) -> dict | list:
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


class Week6KafkaCore30Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.lessons = node_json(
            "const d=require('./assets/js/curriculum-lessons-w06.js');"
            "const r=require('./assets/js/kafka-lesson.js');"
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(d).map(([k,v])=>[k,{"
            "week:v.week,day:v.day,phase:v.phase,title:v.title,summary:v.summary,"
            "sections:v.sections.length,checks:v.checks.length,words:r.pacingFor(v).words,"
            "minutes:r.pacingFor(v).readMinutes,requiredMinutes:r.pacingFor(v).requiredMinutes,"
            "fullRequiredWords:r.wordCount(JSON.stringify({summary:v.summary,sections:v.sections,drill:v.drill,checks:v.checks,goals:v.goals,deliverable:v.deliverable})),optional:v.optional.length,concepts:v.concepts.length,"
            "sources:v.sources,answerPositions:v.checks.map(q=>q.answer),drillAnswer:v.drill.answer,"
            "goals:v.goals.length,deliverable:v.deliverable,conceptsList:v.concepts}]))));"
        )

    def test_lesson_catalog_exposes_five_core_routes(self) -> None:
        self.assertEqual(set(self.lessons), set(EXPECTED_TITLES))
        for lesson_id, title in EXPECTED_TITLES.items():
            with self.subTest(lesson_id=lesson_id):
                lesson = self.lessons[lesson_id]
                self.assertEqual(lesson["title"], title)
                self.assertEqual(lesson["week"], 6)
                self.assertEqual(lesson["day"], int(lesson_id[-1]))
                self.assertEqual(lesson["phase"], "Production AI Systems")

    def test_each_day_meets_complete_core30_contract(self) -> None:
        for lesson_id, lesson in self.lessons.items():
            with self.subTest(lesson_id=lesson_id):
                self.assertEqual(lesson["sections"], 7)
                self.assertEqual(lesson["checks"], 6)
                self.assertGreaterEqual(lesson["optional"], 2)
                self.assertGreaterEqual(lesson["concepts"], 5)
                self.assertGreaterEqual(lesson["goals"], 3)
                self.assertTrue(lesson["deliverable"])
                self.assertGreater(lesson["words"], 700)
                self.assertLessEqual(lesson["words"], 1800)
                self.assertLessEqual(lesson["fullRequiredWords"], 1800)
                self.assertEqual(lesson["minutes"], round(lesson["words"] / 150))
                self.assertLessEqual(lesson["requiredMinutes"], 30)

    def test_daily_scope_covers_the_authoritative_week_map(self) -> None:
        expected_concepts = {
            "w06d1": {"event-driven-architecture", "kafka-topics-partitions-offsets", "kafka-kraft", "kafka-producers-consumers", "kafka-cli-literacy"},
            "w06d2": {"kafka-delivery-semantics", "event-schema-evolution", "consumer-lag-rebalancing", "kafka-idempotence-transactions", "managed-kafka-economics"},
            "w06d3": {"msk-self-managed-decision", "event-triggered-agents", "async-llm-backpressure", "streaming-chroma-neo4j", "pipeline-lag-throughput"},
            "w06d4": {"kafka-agent-pipeline", "broker-failure-rebalance", "lag-alert-runbook", "otel-kafka-propagation", "cross-cloud-egress-identity"},
            "w06d5": {"pipeline-architecture-defense", "throughput-lag-egress-readout", "brownfield-event-delivery", "pipeline-fallback", "weekly-retrospective"},
        }
        for lesson_id, concepts in expected_concepts.items():
            self.assertEqual(concepts, set(self.lessons[lesson_id]["conceptsList"]))

    def test_assessments_have_stable_varied_mapping_and_unique_distractors(self) -> None:
        questions = node_json(
            "const d=require('./assets/js/curriculum-lessons-w06.js');"
            "console.log(JSON.stringify(Object.values(d).flatMap(v=>v.checks)));"
        )
        self.assertEqual(len(questions), 30)
        positions = set()
        seen_distractors: dict[str, str] = {}
        for question in questions:
            with self.subTest(stem=question["stem"]):
                options = question["options"]
                answer = question["answer"]
                positions.add(answer)
                self.assertEqual(len(options), 4)
                self.assertEqual(len(set(options)), 4)
                self.assertIn(answer, range(4))
                self.assertTrue(question["explain"])
                for index, distractor in enumerate(options):
                    if index == answer:
                        continue
                    self.assertNotIn(distractor, seen_distractors)
                    seen_distractors[distractor] = question["stem"]
        self.assertEqual(positions, {0, 1, 2, 3})

    def test_decision_interaction_shuffles_display_without_changing_authored_answer(self) -> None:
        result = node_json(
            "const d=require('./assets/js/curriculum-lessons-w06.js');"
            "const r=require('./assets/js/kafka-lesson.js');"
            "function seq(a){let i=0;return()=>a[i++%a.length];}"
            "const seeds=[[0,0],[.99,.99],[.4,.2],[.1,.8]];"
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(d).map(([id,v])=>[id,{"
            "answer:v.drill.answer,options:v.drill.options,renders:seeds.map(s=>{const o=r.drillOrder(3,seq(s));"
            "return {order:o,html:r.interactionHtml(v,id,o),assessed:v.drill.options.map((_,i)=>r.assessDrill(v,String(i)))};})}]))));"
        )
        pattern = re.compile(r'<input type="radio" name="(w06d\d)-decision" value="(\d)"> <span>([^<]+)</span>')
        for lesson_id, lesson in result.items():
            correct_positions = set()
            for rendered in lesson["renders"]:
                found = pattern.findall(rendered["html"])
                self.assertEqual([int(value) for _, value, _ in found], rendered["order"])
                self.assertNotIn("data-answer", rendered["html"])
                for position, (_, value, text) in enumerate(found):
                    index = int(value)
                    self.assertEqual(text, lesson["options"][index])
                    self.assertEqual(rendered["assessed"][index]["correct"], index == lesson["answer"])
                    if index == lesson["answer"]:
                        correct_positions.add(position)
            self.assertEqual(correct_positions, {0, 1, 2})

    def test_lessons_publish_attributed_https_sources(self) -> None:
        for lesson_id, lesson in self.lessons.items():
            with self.subTest(lesson_id=lesson_id):
                self.assertGreaterEqual(len(lesson["sources"]), 3)
                for source in lesson["sources"]:
                    self.assertTrue(source["label"].strip())
                    href = source["href"]
                    if href.startswith("https://"):
                        continue
                    self.assertTrue((WEEK_DIR / href).resolve().is_file())

    def test_navigation_and_adjacent_routes_are_preserved(self) -> None:
        result = node_json(
            "const r=require('./assets/js/kafka-lesson.js');"
            "console.log(JSON.stringify(Object.fromEntries([1,2,3,4,5].map(d=>['w06d'+d,r.route('w06d'+d)]))));"
        )
        self.assertEqual(result["w06d1"], "w06d2.html")
        self.assertEqual(result["w06d4"], "w06d5.html")
        self.assertEqual(result["w06d5"], "../w07/w07d1.html")
    def test_browser_renders_desktop_mobile_dark_reduced_and_no_javascript(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        route = WEEK_DIR / "w06d4.html"
        modes = [
            ("desktop-light", ["--window-size=1440,1000"]),
            ("mobile-light", ["--window-size=390,844"]),
            ("desktop-dark", ["--window-size=1440,1000", "--force-dark-mode"]),
            ("reduced-motion", ["--window-size=1440,1000", "--force-prefers-reduced-motion"]),
        ]
        for name, flags in modes:
            with self.subTest(mode=name), tempfile.TemporaryDirectory() as profile:
                result = subprocess.run(
                    [chrome, "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                     f"--user-data-dir={profile}", "--allow-file-access-from-files", "--virtual-time-budget=3000",
                     *flags, "--dump-dom", route.as_uri()],
                    text=True, capture_output=True, timeout=40,
                )
                self.assertEqual(result.returncode, 0, result.stderr[-1000:])
                dom = result.stdout
                self.assertIn(EXPECTED_TITLES["w06d4"], dom)
                self.assertIn("Core 30", dom)
                self.assertIn('data-core="optional"', dom)
                self.assertIn('data-kafka-drill=""', dom)
                self.assertIn('data-archify-visual=""', dom)
                self.assertIn('class="fde-archify"', dom)
                self.assertIn('<figcaption>', dom)
                self.assertNotIn("Lesson unavailable", dom)
                self.assertNotIn("data-answer", dom)

        for lesson_id, title in EXPECTED_TITLES.items():
            with self.subTest(route=lesson_id), tempfile.TemporaryDirectory() as profile:
                result = subprocess.run(
                    [chrome, "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                     f"--user-data-dir={profile}", "--allow-file-access-from-files", "--virtual-time-budget=3000",
                     "--dump-dom", (WEEK_DIR / f"{lesson_id}.html").as_uri()],
                    text=True, capture_output=True, timeout=40,
                )
                self.assertEqual(result.returncode, 0, result.stderr[-1000:])
                self.assertIn(title, result.stdout)
                self.assertIn('data-core="optional"', result.stdout)
                self.assertIn('data-kafka-drill=""', result.stdout)
                self.assertNotIn("interactive-w6-permissions.js", result.stdout)

        with tempfile.TemporaryDirectory() as profile:
            result = subprocess.run(
                [chrome, "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-gpu", "--disable-javascript", "--no-first-run",
                 "--no-default-browser-check", f"--user-data-dir={profile}", "--allow-file-access-from-files",
                 "--dump-dom", route.as_uri()], text=True, capture_output=True, timeout=30,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        self.assertIn(EXPECTED_TITLES["w06d4"], result.stdout)
        self.assertIn("text alternative", result.stdout)
        self.assertIn("Defensible response", result.stdout)
        self.assertIn("Comprehension check", result.stdout)
        self.assertIn("Project 2 · Morrowfield Payment Control · team of 2–3 · fde-payments-service-platform", result.stdout)
        self.assertNotIn("accessible static export", result.stdout)


if __name__ == "__main__":
    unittest.main()
