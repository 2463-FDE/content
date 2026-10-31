from __future__ import annotations

import html
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
            "const pending=Object.assign({},cfg,{cloudPath:{status:'evidence-lane-pending',label:'AWS/GCP evidence seam pending',active:false}});"
            "console.log(JSON.stringify({integrated:render(cfg),pending:render(pending)}));"
        )
        self.assertEqual(result["integrated"]["client"], "LTM, formerly LTIMindtree")
        self.assertEqual(result["integrated"]["badge"], "AWS/GCP evidence integrated")
        self.assertEqual(result["integrated"]["status"], "evidence-lane-integrated")
        self.assertEqual(result["integrated"]["classes"], ["is-ready"])
        self.assertEqual(result["pending"]["badge"], "AWS/GCP evidence seam pending")
        self.assertEqual(result["pending"]["status"], "evidence-lane-pending")
        self.assertEqual(result["pending"]["classes"], ["is-pending"])

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

    DRILL_OPTION = re.compile(
        r'<input type="radio" name="(w\d\dd\d)-decision" value="(\d+)"> <span>([^<]*)</span>'
    )

    def test_decision_drill_shuffles_once_per_render_and_keeps_answer_mapping(self) -> None:
        result = node_json(
            "const d=require('./assets/js/curriculum-lessons-w09-w10.js');"
            "const r=require('./assets/js/capstone-lesson.js');"
            "function seq(vals){let i=0;return()=>vals[i++%vals.length];}"
            "const seeds=[[0,0],[0.99,0.99],[0.5,0.2],[0.1,0.9],[0.7,0.4],[0.34,0.6]];"
            "function renderRoute(id,random){const root={innerHTML:''},overlays={innerHTML:''};"
            "const doc={title:'',body:{getAttribute:()=>id},head:{appendChild(){}},createElement:()=>({}),"
            "querySelector:()=>null,getElementById:k=>k==='lesson-root'?root:k==='lesson-overlays'?overlays:null};"
            "globalThis.window={};r.render(doc,{random});return root.innerHTML;}"
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(d).map(([id,v])=>[id,{"
            "authored:v.drill.options,answer:v.drill.answer,"
            "renders:seeds.map(s=>{const o=r.drillOrder(v.drill.options.length,seq(s));return {"
            "order:o,repeat:r.drillOrder(v.drill.options.length,seq(s)),html:r.interactionHtml(v,id,o),"
            "routed:renderRoute(id,seq(s)),"
            "assessed:v.drill.options.map((_,i)=>r.assessDrill(v,String(i)))};})"
            "}]))));"
        )
        for lesson_id, lesson in result.items():
            authored = lesson["authored"]
            answer_positions = set()
            for render in lesson["renders"]:
                with self.subTest(lesson_id=lesson_id, order=render["order"]):
                    self.assertEqual(render["order"], render["repeat"])
                    self.assertEqual(sorted(render["order"]), list(range(len(authored))))
                    options = self.DRILL_OPTION.findall(render["html"])
                    self.assertEqual(self.DRILL_OPTION.findall(render["routed"]), options)
                    self.assertEqual([int(value) for _, value, _ in options], render["order"])
                    self.assertEqual({name for name, _, _ in options}, {lesson_id})
                    self.assertCountEqual([text for _, _, text in options], authored)
                    for position, (_, value, text) in enumerate(options):
                        self.assertEqual(text, authored[int(value)])
                        verdict = render["assessed"][int(value)]
                        self.assertEqual(verdict["correct"], int(value) == lesson["answer"])
                        self.assertTrue(verdict["message"].startswith(
                            "Defensible decision. " if verdict["correct"] else "Reconsider"
                        ))
                        if int(value) == lesson["answer"]:
                            answer_positions.add(position)
            self.assertEqual(answer_positions, set(range(len(authored))), lesson_id)

    def test_browser_renders_a_representative_route_and_essential_diagram(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        route = ROOT / "weeks/w10/w10d5.html"
        with tempfile.TemporaryDirectory() as profile:
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
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
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
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

    def test_batch_selection_swaps_model_and_survives_navigation_history(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        hub = (ROOT / "index.html").as_uri()
        week5 = (ROOT / "weeks/w05/w05d1.html").as_uri()
        week6 = (ROOT / "weeks/w06/w06d1.html").as_uri()
        script = """
const routes = %s;
const frame = document.createElement('iframe');
frame.style.cssText = 'width:1280px;height:800px;border:0';
let stage = 0;
const out = {};
function state(doc) {
  const visibleTitles = [...doc.querySelectorAll('.cal-week .wt')]
    .filter(node => node.offsetParent !== null).map(node => node.textContent);
  return {
    url: doc.defaultView.location.href,
    batch: doc.querySelector('[data-batch-context] input')?.value || null,
    model: doc.body.dataset.curriculumModel || null,
    empty: doc.getElementById('curriculum-model-status')?.textContent || '',
    calendarHidden: doc.getElementById('cal')?.hidden ?? null,
    mainHidden: doc.querySelector('main')?.hidden ?? null,
    h1: doc.querySelector('main h1')?.textContent || '',
    visibleTitles,
    stored: doc.defaultView.localStorage.getItem('fde_batch_context'),
    hubBack: doc.querySelector('.snav-btn')?.href || '',
  };
}
function finish() { document.body.setAttribute('data-result', JSON.stringify(out)); }
frame.onload = () => setTimeout(() => {
  const doc = frame.contentDocument;
  if (stage === 0) {
    out.other = state(doc);
    const input = doc.querySelector('[data-batch-context] input');
    input.value = '2567';
    doc.querySelector('[data-batch-context] button').click();
    setTimeout(() => {
      out.selected = state(doc);
      frame.contentWindow.history.back();
      setTimeout(() => {
        out.back = state(doc);
        frame.contentWindow.history.forward();
        setTimeout(() => {
          out.forward = state(doc);
          stage = 1;
          frame.contentWindow.location.reload();
        }, 160);
      }, 160);
    }, 160);
  } else if (stage === 1) {
    out.reload = state(doc);
    stage = 2;
    frame.src = routes.week5 + '?batch=2567';
  } else if (stage === 2) {
    out.week5 = state(doc);
    frame.contentWindow.localStorage.setItem('fde_batch_context', '2463');
    stage = 3;
    frame.src = routes.week6 + '?batch=2567';
  } else if (stage === 3) {
    out.week6 = state(doc);
    stage = 4;
    frame.src = routes.week6 + '?batch=2463';
  } else {
    out.unrelatedDeepLink = state(doc);
    finish();
  }
}, 450);
frame.src = routes.hub + '?batch=2463';
document.body.appendChild(frame);
""" % json.dumps({"hub": hub, "week5": week5, "week6": week6})
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "batch-model-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{script}</script></body></html>"
            )
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={Path(tmp) / 'profile'}",
                    "--allow-file-access-from-files",
                    "--window-size=1400,900",
                    "--virtual-time-budget=20000",
                    "--dump-dom",
                    harness.as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=60,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "batch harness did not report state")
        states = json.loads(html.unescape(match.group(1)))

        self.assertEqual(states["other"]["model"], "unavailable")
        self.assertTrue(states["other"]["calendarHidden"])
        self.assertEqual(states["other"]["visibleTitles"], [])
        self.assertIn("No curriculum is configured", states["other"]["empty"])

        for key in ("selected", "forward", "reload"):
            with self.subTest(state=key):
                self.assertEqual(states[key]["batch"], "2567")
                self.assertEqual(states[key]["model"], "ltm-2567")
                self.assertFalse(states[key]["calendarHidden"])
                self.assertIn("Neo4j Knowledge Graphs & Context Engineering", states[key]["visibleTitles"])
                self.assertIn("Kafka & Event-Driven AI Pipelines", states[key]["visibleTitles"])
        self.assertEqual(states["back"]["model"], "unavailable")
        self.assertTrue(states["back"]["calendarHidden"])

        self.assertEqual(states["week5"]["model"], "ltm-2567")
        self.assertEqual(states["week5"]["h1"], "Model the Client Domain as a Property Graph")
        self.assertIn("batch=2567", states["week5"]["hubBack"])
        self.assertEqual(states["week6"]["model"], "ltm-2567")
        self.assertEqual(states["week6"]["stored"], "2567", "deep link must beat stale storage")
        self.assertEqual(states["week6"]["h1"], "Kafka foundations and event-driven judgement")
        self.assertIn("batch=2567", states["week6"]["hubBack"])

        self.assertEqual(states["unrelatedDeepLink"]["model"], "unavailable")
        self.assertTrue(states["unrelatedDeepLink"]["mainHidden"])
        self.assertEqual(states["unrelatedDeepLink"]["h1"], "Kafka foundations and event-driven judgement")

    def test_batch_and_cloud_selection_stay_paired_across_history_and_reload(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        hub = (ROOT / "index.html").as_uri()
        script = """
const hub = %s, out = {};
const frame = document.createElement('iframe');
frame.style.cssText = 'width:1280px;height:800px;border:0';
let stage = 0;
function state(doc) {
  const url = new URL(doc.defaultView.location.href);
  return {
    batchParam: url.searchParams.get('batch'),
    cloudParam: url.searchParams.get('cloud'),
    batch: doc.querySelector('[data-batch-context] input')?.value || null,
    model: doc.body.dataset.curriculumModel || null,
    cloudView: doc.documentElement.getAttribute('data-cloud-view'),
    checked: doc.querySelector('input[data-cloud-path-option]:checked')?.value || null,
    calendarHidden: doc.getElementById('cal')?.hidden ?? null,
  };
}
frame.onload = () => setTimeout(() => {
  const doc = frame.contentDocument, win = frame.contentWindow;
  if (stage === 0) {
    out.initial = state(doc);
    doc.querySelector('[data-batch-context] input').value = '2567';
    doc.querySelector('[data-batch-context] button').click();
    setTimeout(() => {
      out.batchSelected = state(doc);
      doc.querySelector('input[data-cloud-path-option][value="aws"]').click();
      setTimeout(() => {
        out.cloudSelected = state(doc);
        win.history.back();
        setTimeout(() => {
          out.back = state(doc);
          win.history.forward();
          setTimeout(() => {
            out.forward = state(doc);
            stage = 1;
            win.location.reload();
          }, 160);
        }, 160);
      }, 160);
    }, 160);
  } else {
    out.reload = state(doc);
    document.body.setAttribute('data-result', JSON.stringify(out));
  }
}, 450);
frame.src = hub + '?batch=2463&cloud=gcp';
document.body.appendChild(frame);
""" % json.dumps(hub)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "batch-cloud-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{script}</script></body></html>"
            )
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={Path(tmp) / 'profile'}",
                    "--allow-file-access-from-files",
                    "--window-size=1400,900",
                    "--virtual-time-budget=15000",
                    "--dump-dom",
                    harness.as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=60,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "batch/cloud harness did not report state")
        states = json.loads(html.unescape(match.group(1)))

        expected = {
            "initial": ("2463", "unavailable", "gcp"),
            "batchSelected": ("2567", "ltm-2567", "gcp"),
            "cloudSelected": ("2567", "ltm-2567", "aws"),
            "back": ("2463", "unavailable", "gcp"),
            "forward": ("2567", "ltm-2567", "aws"),
            "reload": ("2567", "ltm-2567", "aws"),
        }
        for key, (batch, model, cloud) in expected.items():
            with self.subTest(state=key):
                observed = states[key]
                self.assertEqual(observed["batchParam"], batch)
                self.assertEqual(observed["batch"], batch)
                self.assertEqual(observed["model"], model)
                self.assertEqual(observed["calendarHidden"], model == "unavailable")
                self.assertEqual(observed["cloudParam"], cloud)
                self.assertEqual(observed["cloudView"], cloud)
                self.assertEqual(observed["checked"], cloud)

    def test_unsupported_batch_cannot_render_2567_client_delivery_packets(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        delivery = (ROOT / "client-delivery.html").as_uri() + "?w=5&p=healthcare"
        script = """
const base = %s, out = {};
const cases = [['unsupported', '2463'], ['supported', '2567']];
function run(i) {
  if (i >= cases.length) { document.body.setAttribute('data-result', JSON.stringify(out)); return; }
  const frame = document.createElement('iframe');
  frame.style.cssText = 'width:1280px;height:800px;border:0';
  frame.onload = () => setTimeout(() => {
    const doc = frame.contentDocument;
    const status = doc.getElementById('curriculum-model-status');
    out[cases[i][0]] = {
      model: doc.body.dataset.curriculumModel || null,
      text: doc.body.innerText,
      status: status && !status.hidden ? status.textContent : '',
    };
    frame.remove(); run(i + 1);
  }, 600);
  frame.src = base + '&batch=' + cases[i][1];
  document.body.appendChild(frame);
}
run(0);
""" % json.dumps(delivery)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "delivery-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{script}</script></body></html>"
            )
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={Path(tmp) / 'profile'}",
                    "--allow-file-access-from-files",
                    "--window-size=1400,900",
                    "--virtual-time-budget=10000",
                    "--dump-dom",
                    harness.as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=60,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "client-delivery harness did not report state")
        states = json.loads(html.unescape(match.group(1)))

        self.assertEqual(states["supported"]["model"], "ltm-2567")
        self.assertIn("Neo4j Knowledge Graphs", states["supported"]["text"])
        self.assertEqual(states["supported"]["status"], "")

        self.assertEqual(states["unsupported"]["model"], "unavailable")
        self.assertNotIn("Neo4j", states["unsupported"]["text"])
        self.assertNotIn("How the client-work arc runs", states["unsupported"]["text"])
        self.assertIn("No curriculum is configured for Batch 2463", states["unsupported"]["status"])

    def test_no_javascript_preserves_the_static_hub_fallback(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        with tempfile.TemporaryDirectory() as profile:
            default = Path(profile) / "Default"
            default.mkdir()
            (default / "Preferences").write_text(
                json.dumps({"profile": {"default_content_setting_values": {"javascript": 2}}})
            )
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={profile}",
                    "--allow-file-access-from-files",
                    "--virtual-time-budget=1000",
                    "--dump-dom",
                    (ROOT / "index.html").as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=30,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        self.assertIn('<h1 id="hub-title">Curriculum hub</h1>', result.stdout)
        self.assertIn('<div class="cal" id="cal" data-curriculum-surface=""></div>', result.stdout)
        self.assertNotIn('<section id="curriculum-model-status"', result.stdout)

    def test_signed_in_topbar_keeps_batch_apply_clear_of_theme_toggle(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        widths = [390, 768, 1024, 1280, 1440, 1600]
        harness_script = """
const widths = %s, hub = %s, out = {};
localStorage.setItem('fde_identity', JSON.stringify({code:'T', name:'Trainer Test', role:'trainer'}));
function measure(i) {
  if (i >= widths.length) { document.body.setAttribute('data-result', JSON.stringify(out)); return; }
  const frame = document.createElement('iframe');
  frame.style.cssText = 'width:' + widths[i] + 'px;height:800px;border:0';
  frame.onload = () => setTimeout(() => {
    const doc = frame.contentDocument;
    const apply = doc.querySelector('.batch-context button');
    const toggle = doc.querySelector('.theme-toggle');
    if (!apply || !toggle) { out[widths[i]] = {missing: !apply ? 'apply' : 'theme'}; }
    else {
      const a = apply.getBoundingClientRect(), t = toggle.getBoundingClientRect();
      const ox = Math.min(a.right, t.right) - Math.max(a.left, t.left);
      const oy = Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top);
      out[widths[i]] = {overlap: ox > 0.5 && oy > 0.5 ? ox : 0,
        applyInView: a.left >= 0 && a.right <= widths[i],
        signedIn: doc.body.textContent.includes('Trainer Test')};
    }
    frame.remove(); measure(i + 1);
  }, 400);
  frame.src = hub;
  document.body.appendChild(frame);
}
measure(0);
""" % (json.dumps(widths), json.dumps((ROOT / "index.html").as_uri()))
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "topbar-harness.html"
            harness.write_text(
                f"<!doctype html><html><body><script>{harness_script}</script></body></html>"
            )
            result = subprocess.run(
                [
                    chrome,
                    "--headless=new", "--disable-background-networking", "--no-pings", "--disable-quic", "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--user-data-dir={Path(tmp) / 'profile'}",
                    "--allow-file-access-from-files",
                    "--window-size=1700,900",
                    "--virtual-time-budget=15000",
                    "--dump-dom",
                    harness.as_uri(),
                ],
                text=True,
                capture_output=True,
                timeout=60,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        match = re.search(r'data-result="([^"]*)"', result.stdout)
        self.assertIsNotNone(match, "harness did not report measurements")
        measured = json.loads(match.group(1).replace("&quot;", '"'))
        for width in widths:
            with self.subTest(width=width):
                row = measured[str(width)]
                self.assertNotIn("missing", row)
                self.assertTrue(row["signedIn"], "trainer identity did not render")
                self.assertEqual(row["overlap"], 0, "theme toggle overlaps batch Apply")
                self.assertTrue(row["applyInView"], "batch Apply clipped by viewport")


if __name__ == "__main__":
    unittest.main()
