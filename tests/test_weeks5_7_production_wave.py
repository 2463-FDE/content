"""Production-wave regressions for the authoritative Week 5–7 handoff."""

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
    candidates.extend(filter(None, (shutil.which(name) for name in ("google-chrome", "chromium"))))
    return next((item for item in candidates if Path(item).exists()), None)


BROWSER_RUNNER = r"""
const {spawn}=require('child_process'),net=require('net');
const [chrome,harness,profile]=process.argv.slice(1);
const sink=net.createServer(socket=>socket.destroy());
const listen=()=>new Promise((resolve,reject)=>{sink.once('error',reject);sink.listen(0,'127.0.0.1',resolve)});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let proc,ws;
function cleanup(){try{ws&&ws.close()}catch(e){}try{proc&&proc.kill('SIGKILL')}catch(e){}try{sink.close()}catch(e){}}
async function main(){
 await listen();
 const denyOrigin=`http://127.0.0.1:${sink.address().port}`;
 const args=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
  '--no-first-run','--no-default-browser-check','--disable-gpu','--disable-background-networking',
  '--disable-component-update','--disable-sync','--metrics-recording-only','--no-pings',
  '--allow-file-access-from-files',`--proxy-server=${denyOrigin}`,
  '--host-resolver-rules=MAP * ~NOTFOUND','about:blank'];
 proc=spawn(chrome,args,{stdio:['ignore','ignore','pipe']});
 const wsUrl=await new Promise((resolve,reject)=>{let buf='';proc.stderr.on('data',d=>{buf+=d;const m=buf.match(/DevTools listening on (ws:\/\/\S+)/);if(m)resolve(m[1])});proc.on('exit',code=>reject(new Error(`chrome exited ${code}: ${buf}`)));setTimeout(()=>reject(new Error('chrome start timeout: '+buf)),30000)});
 ws=new WebSocket(wsUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 let seq=0;const pending=new Map(),listeners=[];
 ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const waiter=pending.get(message.id);pending.delete(message.id);message.error?waiter.reject(new Error(JSON.stringify(message.error))):waiter.resolve(message.result)}else listeners.forEach(listener=>listener(message))};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}))});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const session=(method,params={})=>send(method,params,sessionId);
 const requests=[];
 listeners.push(message=>{if(message.sessionId===sessionId&&message.method==='Network.requestWillBeSent')requests.push({url:message.params.request.url,type:message.params.type,frameId:message.params.frameId})});
 await session('Runtime.enable');await session('Network.enable');await session('Page.enable');
 const injection=await session('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(globalThis,'FDE_RUN_URL',{value:${JSON.stringify(denyOrigin)},writable:false,configurable:false});Object.defineProperty(globalThis,'__FDE_TEST_NETWORK_DENY__',{value:true,writable:false,configurable:false});`});
 const boundaryInstalledBeforeNavigation=Boolean(injection.identifier);
 await session('Page.navigate',{url:harness});
 const evaluate=async expression=>{const result=await session('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
 let raw='';for(let i=0;i<200;i++){raw=await evaluate("document.body&&document.body.dataset.result||''");if(raw)break;await sleep(100)}
 if(!raw)throw new Error('browser harness did not report');
 const isLocal=url=>{const parsed=new URL(url);if(['file:','data:','about:','blob:'].includes(parsed.protocol))return true;return ['localhost','127.0.0.1','::1'].includes(parsed.hostname)};
 return {rendered:JSON.parse(raw),requests,nonLocalRequests:requests.filter(item=>!isLocal(item.url)),boundaryInstalledBeforeNavigation,topBoundary:await evaluate('globalThis.__FDE_TEST_NETWORK_DENY__===true')};
}
main().then(result=>{process.stdout.write(JSON.stringify(result),()=>{cleanup();process.exit(0)})},error=>{console.error(error.stack||error);cleanup();process.exit(1)});
"""


class Weeks57ProductionWaveTest(unittest.TestCase):
    def test_published_inventory_accounts_for_all_121_source_items(self) -> None:
        """The production inventory is the owned source-reconciliation contract."""
        inventory = (ROOT / "docs/research/w05-w07-production-inventory.md").read_text(
            encoding="utf-8"
        )
        counts: dict[int, list[int]] = {}
        current_week: int | None = None
        for line in inventory.splitlines():
            heading = re.fullmatch(r"## Week (\d+) — (\d+) source items", line)
            if heading:
                current_week = int(heading.group(1))
                counts[current_week] = []
                continue
            if current_week and re.match(r"\| [1-5] \| \d+ \|", line):
                counts[current_week].append(int(line.split("|")[2].strip()))
        self.assertEqual({week: sum(days) for week, days in counts.items()}, {5: 39, 6: 39, 7: 43})
        self.assertTrue(all(len(days) == 5 for days in counts.values()))
        self.assertEqual(sum(map(sum, counts.values())), 121)

    def test_shared_catalogs_publish_complete_handoff_and_core30_behavior(self) -> None:
        result = node_json(
            "const w6=require('./assets/js/curriculum-lessons-w06.js');"
            "const k=require('./assets/js/kafka-lesson.js');"
            "const p=require('./assets/js/curriculum-lessons-w07-w08.js');"
            "const r=require('./assets/js/platform-lesson.js');"
            "const c=require('./assets/js/cloud-path.js');"
            "const six=Object.fromEntries(Object.entries(w6).map(([id,l])=>[id,{"
            "p:k.pacingFor(l),project:l.project,fallback:k.staticFallbackHtml(l,'Synthetic visual alternative')} ]));"
            "const seven=Object.fromEntries(Object.entries(p).filter(([id])=>id.startsWith('w07')).map(([id,l])=>[id,{"
            "p:r.pacingFor(l),project:l.project,fallback:r.staticFallbackHtml(l,'Synthetic visual alternative')} ]));"
            "console.log(JSON.stringify({six,seven,aws:c.describe('aws'),gcp:c.describe('gcp'),both:c.describe('both')}));"
        )
        self.assertEqual(set(result["six"]), {f"w06d{day}" for day in range(1, 6)})
        self.assertEqual(set(result["seven"]), {f"w07d{day}" for day in range(1, 6)})
        for week in ("six", "seven"):
            for lesson_id, lesson in result[week].items():
                with self.subTest(lesson=lesson_id):
                    self.assertLessEqual(lesson["p"]["words"], 1800)
                    self.assertEqual(lesson["p"]["readMinutes"], round(lesson["p"]["words"] / 150))
                    self.assertLessEqual(lesson["p"]["requiredMinutes"], 30)
                    self.assertEqual(
                        lesson["project"]["label"],
                        "Project 2 · team of 2–3 · regional banking/payments",
                    )
                    self.assertIn("ADR-P2-001", lesson["project"]["context"])
                    self.assertIn("personal AWS, GCP, or Both", lesson["project"]["context"])
                    self.assertIn("text alternative", lesson["fallback"])
                    self.assertIn("Defensible response", lesson["fallback"])
                    self.assertIn("Comprehension check", lesson["fallback"])
                    self.assertIn("Return to the curriculum hub", lesson["fallback"])
        self.assertEqual(result["aws"]["primary"], "aws")
        self.assertEqual(result["gcp"]["primary"], "gcp")
        self.assertIsNone(result["both"]["primary"])
        self.assertIn("team's recorded primary cloud", result["aws"]["summary"])

    def test_generated_static_routes_are_current(self) -> None:
        result = subprocess.run(
            ["node", "docs/workflows/render-week-static-fallbacks.js"],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("current", result.stdout)

    def test_browser_exposes_project_progression_and_ordered_navigation(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")
        pages = {
            "w5start": (ROOT / "weeks/w05/w05d1.html").as_uri(),
            "w5close": (ROOT / "weeks/w05/w05d5.html").as_uri(),
            "w6start": (ROOT / "weeks/w06/w06d1.html").as_uri(),
            "w6close": (ROOT / "weeks/w06/w06d5.html").as_uri(),
            "w7start": (ROOT / "weeks/w07/w07d1.html").as_uri(),
            "w7close": (ROOT / "weeks/w07/w07d5.html").as_uri(),
            "hub": (ROOT / "index.html").as_uri(),
            "trainer": (ROOT / "trainer.html").as_uri(),
        }
        script = r"""
const pages=%s,out={};
localStorage.setItem('fde_identity',JSON.stringify({code:'T',name:'Trainer Test',role:'trainer'}));
function load(entries,i){
  if(i>=entries.length){document.body.dataset.result=JSON.stringify(out);return;}
  const [key,url]=entries[i],frame=document.createElement('iframe');
  frame.onload=()=>setTimeout(()=>{
    const d=frame.contentDocument;
    out[key]={
      text:d.body.innerText.replace(/\s+/g,' ').trim(),
      project:d.querySelector('.project-context')?.innerText.replace(/\s+/g,' ').trim()||'',
      adr:d.querySelector('.project-context a')?.getAttribute('href')||'',
      links:Array.from(d.querySelectorAll('a[href]')).map(a=>[a.innerText.trim(),a.getAttribute('href')]),
      networkDeny:frame.contentWindow.__FDE_TEST_NETWORK_DENY__===true
    };
    frame.remove();load(entries,i+1);
  },350);
  frame.src=url;document.body.appendChild(frame);
}
load(Object.entries(pages),0);
""" % json.dumps(pages)
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "wave.html"
            harness.write_text(f"<!doctype html><html><body><script>{script}</script></body></html>", encoding="utf-8")
            result = subprocess.run(
                ["node", "-e", BROWSER_RUNNER, chrome, harness.as_uri(), str(Path(tmp) / "profile")],
                text=True,
                capture_output=True,
                timeout=60,
            )
        self.assertEqual(result.returncode, 0, result.stderr[-1000:])
        browser = json.loads(result.stdout)
        rendered = browser["rendered"]
        self.assertTrue(browser["boundaryInstalledBeforeNavigation"])
        self.assertTrue(browser["topBoundary"])
        self.assertTrue(all(page["networkDeny"] for page in rendered.values()))
        self.assertEqual(browser["nonLocalRequests"], [])
        captured_urls = {request["url"] for request in browser["requests"]}
        self.assertTrue(set(pages.values()).issubset(captured_urls))

        for key in ("w5start", "w5close"):
            self.assertIn("solo", rendered[key]["project"])
            self.assertIn("insurance brownfield", rendered[key]["project"])
            self.assertNotIn("team of 2–3", rendered[key]["project"])
        for key in ("w6start", "w6close", "w7start", "w7close"):
            self.assertIn("team of 2–3", rendered[key]["project"])
            self.assertIn("regional banking/payments", rendered[key]["project"])
            self.assertIn("docs/templates/team-primary-cloud-adr.md", rendered[key]["adr"])
        self.assertIn("Form the Project 2 banking/payments team", rendered["w6start"]["text"])
        self.assertIn("Apply the Week 6 Project 2 infrastructure ADR", rendered["w7start"]["text"])

        hub_text = rendered["hub"]["text"]
        positions = [
            hub_text.index("Neo4j Knowledge Graphs & Context Engineering"),
            hub_text.index("Kafka & Event-Driven AI Pipelines"),
            hub_text.index("Terraform + Ansible & AI CI/CD"),
        ]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("Team handover + Kafka foundations", hub_text)
        trainer_text = rendered["trainer"]["text"]
        self.assertIn("Week 5 solo insurance", trainer_text)
        self.assertIn("Week 6 banking/payments team handover + Kafka", trainer_text)
        self.assertIn("Week 7 Terraform + Ansible", trainer_text)
        trainer_links = dict(rendered["trainer"]["links"])
        self.assertIn("Demo team handover + Kafka", trainer_links)
        self.assertTrue(trainer_links["Demo team handover + Kafka"].endswith("weeks/w06/w06d1.html?batch=2567"))


if __name__ == "__main__":
    unittest.main()
