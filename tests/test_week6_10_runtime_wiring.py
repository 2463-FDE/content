"""Direct signed-out runtime-wiring regressions for every Week 6–10 lesson."""

from __future__ import annotations

import http.server
import json
import shutil
import subprocess
import tempfile
import threading
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ROUTES = tuple(
    f"weeks/w{week:02}/w{week:02}d{day}.html"
    for week in range(6, 11)
    for day in range(1, 6)
)
SYNTHETIC_CODE = "SYNTHETIC-LEARNER"


def find_chrome() -> str | None:
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    candidates.extend(filter(None, (shutil.which(name) for name in ("google-chrome", "chromium"))))
    return next((item for item in candidates if Path(item).exists()), None)


class ScriptSources(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.sources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "script":
            return
        source = dict(attrs).get("src")
        if source:
            self.sources.append(source)


class LocalFixtureHandler(http.server.SimpleHTTPRequestHandler):
    auth_requests: list[dict[str, object]] = []
    config_requests: list[str] = []
    request_inventory: list[dict[str, str]] = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self) -> None:
        type(self).request_inventory.append({"method": "GET", "path": self.path})
        path = urlsplit(self.path).path
        if path == "/assets/js/roster.js":
            type(self).config_requests.append(self.path)
            body = (
                "window.FDE_RUN_URL = window.location.origin;\n"
                "window.FDE_TRACK_URL = window.location.origin + '/track';\n"
                "window.FDE_RAG_URL = window.location.origin;\n"
            ).encode()
            self.send_response(200)
            self.send_header("content-type", "application/javascript; charset=utf-8")
            self.send_header("cache-control", "no-store")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self) -> None:
        type(self).request_inventory.append({"method": "POST", "path": self.path})
        if urlsplit(self.path).path != "/auth/login":
            self.send_error(404)
            return
        length = int(self.headers.get("content-length", "0"))
        payload = json.loads(self.rfile.read(length) or b"{}")
        type(self).auth_requests.append(payload)
        if payload.get("code") != SYNTHETIC_CODE:
            body = b'{"ok":false}'
            self.send_response(401)
        else:
            body = json.dumps(
                {
                    "ok": True,
                    "name": "Synthetic Learner",
                    "role": "learner",
                    "token": "synthetic-session-token",
                }
            ).encode()
            self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        pass


BROWSER_RUNNER = r"""
const {spawn}=require('child_process'),net=require('net');
const [chrome,base,routesJson,profile]=process.argv.slice(1),routes=JSON.parse(routesJson);
const deny=net.createServer(socket=>socket.destroy());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let proc,ws,seq=0;const pending=new Map(),listeners=[];
const listen=()=>new Promise((resolve,reject)=>{deny.once('error',reject);deny.listen(0,'127.0.0.1',resolve)});
async function stopChrome(){
  try{if(ws&&ws.readyState===1)await send('Browser.close')}catch(e){}
  if(proc&&proc.exitCode===null&&proc.signalCode===null){
    await new Promise(resolve=>{const timer=setTimeout(()=>{try{proc.kill('SIGTERM')}catch(e){}resolve()},5000);proc.once('exit',()=>{clearTimeout(timer);resolve()})});
  }
  try{ws&&ws.close()}catch(e){}try{deny.close()}catch(e){}
}
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}))})}
async function evaluate(session,expression){
  const result=await session('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(session,expression){
  for(let i=0;i<240;i++){
    try{if(await evaluate(session,expression))return true}catch(e){}
    await sleep(50);
  }
  return false;
}
function isLocal(url){
  const parsed=new URL(url);
  if(['data:','about:','blob:'].includes(parsed.protocol))return true;
  return ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
}
async function main(){
  await listen();
  const denyOrigin=`http://127.0.0.1:${deny.address().port}`;
  const args=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
    '--no-first-run','--no-default-browser-check','--disable-gpu','--disable-background-networking',
    '--disable-component-update','--disable-default-apps','--disable-sync','--metrics-recording-only',
    '--no-pings','--disable-quic',`--proxy-server=${denyOrigin}`,
    '--proxy-bypass-list=localhost;127.0.0.1;[::1]',
    '--host-resolver-rules=MAP,*~NOTFOUND,EXCLUDE,127.0.0.1,EXCLUDE,localhost','about:blank'];
  proc=spawn(chrome,args,{stdio:['ignore','ignore','pipe']});
  const wsUrl=await new Promise((resolve,reject)=>{let buf='';proc.stderr.on('data',d=>{buf+=d;const m=buf.match(/DevTools listening on (ws:\/\/\S+)/);if(m)resolve(m[1])});proc.on('exit',code=>reject(new Error(`chrome exited ${code}: ${buf}`)));setTimeout(()=>reject(new Error('chrome start timeout: '+buf)),15000)});
  ws=new WebSocket(wsUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const waiter=pending.get(message.id);pending.delete(message.id);message.error?waiter.reject(new Error(JSON.stringify(message.error))):waiter.resolve(message.result)}else listeners.forEach(listener=>listener(message))};
  const out={};
  for(const route of routes){
    const {browserContextId}=await send('Target.createBrowserContext');
    const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const session=(method,params={})=>send(method,params,sessionId),requests=[],consoleErrors=[];
    const listener=message=>{
      if(message.sessionId!==sessionId)return;
      if(message.method==='Network.requestWillBeSent'&&/^https?:/.test(message.params.request.url))requests.push(message.params.request.url);
      if(message.method==='Runtime.exceptionThrown')consoleErrors.push(message.params.exceptionDetails.text);
      if(message.method==='Log.entryAdded'&&message.params.entry.level==='error')consoleErrors.push(message.params.entry.text);
    };
    listeners.push(listener);
    await session('Runtime.enable');await session('Network.enable');await session('Page.enable');await session('Log.enable');
    const navigation=await session('Page.navigate',{url:`${base}/${route}`});
    const dialogReady=await waitFor(session,"document.readyState==='complete' && !!document.querySelector('.login-overlay')");
    if(!dialogReady){
      let documentState;
      try{documentState=await evaluate(session,`(()=>({url:location.href,readyState:document.readyState,title:document.title,body:document.body?.innerText?.slice(0,1000)||'',dialog:!!document.querySelector('.login-overlay')}))()`)}catch(error){documentState={evaluationError:String(error)}}
      throw new Error('signed-out dialog timeout '+JSON.stringify({route,navigation,documentState,consoleErrors,requests}));
    }
    const before=await evaluate(session,`(()=>({
      signedOut:localStorage.getItem('fde_identity')===null,
      runUrl:globalThis.FDE_RUN_URL||null,
      error:document.querySelector('#login-error')?.textContent||'',
      scripts:Array.from(document.scripts,s=>s.src)
    }))()`);
    await evaluate(session,`(()=>{const input=document.querySelector('#fde-access-code');input.value=${JSON.stringify('SYNTHETIC-LEARNER')};input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.lc-go').click();return true})()`);
    if(!await waitFor(session,"localStorage.getItem('fde_identity')!==null && document.readyState==='complete' && !document.querySelector('.login-overlay')"))throw new Error('fixture sign-in timeout '+route);
    const after=await evaluate(session,`(()=>({
      identity:JSON.parse(localStorage.getItem('fde_identity')),
      error:document.querySelector('#login-error')?.textContent||'',
      loginVisible:!!document.querySelector('.login-overlay')
    }))()`);
    out[route]={before,after,
      configRequests:requests.filter(url=>url.includes('/assets/js/roster.js')).length,
      authRequests:requests.filter(url=>url.endsWith('/auth/login')).length,
      nonLocalRequests:requests.filter(url=>!isLocal(url))};
    listeners.splice(listeners.indexOf(listener),1);
    await send('Target.closeTarget',{targetId});
    await send('Target.disposeBrowserContext',{browserContextId});
  }
  return out;
}
main().then(async result=>{await stopChrome();process.stdout.write(JSON.stringify(result))},async error=>{console.error(error.stack||error);await stopChrome();process.exit(1)});
"""


class Week610RuntimeWiringTest(unittest.TestCase):
    def test_all_routes_load_the_tracked_nonsecret_config_before_consumers(self) -> None:
        self.assertEqual(len(ROUTES), 25)
        for route in ROUTES:
            parser = ScriptSources()
            parser.feed((ROOT / route).read_text(encoding="utf-8"))
            names = [Path(urlsplit(source).path).name for source in parser.sources]
            with self.subTest(route=route):
                self.assertEqual(names.count("roster.js"), 1)
                self.assertNotIn("run-config.js", names)
                self.assertLess(names.index("roster.js"), names.index("progress.js"))
                self.assertLess(names.index("roster.js"), names.index("auth.js"))

    def test_all_routes_complete_fresh_signed_out_local_fixture_login(self) -> None:
        chrome = find_chrome()
        if not chrome:
            self.skipTest("Chrome/Chromium is unavailable")

        LocalFixtureHandler.auth_requests = []
        LocalFixtureHandler.config_requests = []
        LocalFixtureHandler.request_inventory = []
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), LocalFixtureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with tempfile.TemporaryDirectory() as tmp:
                result = subprocess.run(
                    [
                        "node",
                        "-e",
                        BROWSER_RUNNER,
                        chrome,
                        base,
                        json.dumps(ROUTES),
                        str(Path(tmp) / "profile"),
                    ],
                    cwd=ROOT,
                    text=True,
                    capture_output=True,
                    timeout=120,
                )
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

        diagnostic = json.dumps({"candidate_fixture_requests": LocalFixtureHandler.request_inventory}, indent=2)
        self.assertEqual(result.returncode, 0, result.stderr[-4000:] + "\n" + diagnostic)
        rendered = json.loads(result.stdout)
        self.assertEqual(set(rendered), set(ROUTES))
        self.assertEqual(
            LocalFixtureHandler.auth_requests,
            [{"code": SYNTHETIC_CODE}] * len(ROUTES),
        )
        self.assertGreaterEqual(len(LocalFixtureHandler.config_requests), len(ROUTES) * 2)

        for route, state in rendered.items():
            with self.subTest(route=route):
                before = state["before"]
                after = state["after"]
                self.assertTrue(before["signedOut"])
                self.assertEqual(before["runUrl"], base)
                self.assertEqual(before["error"], "")
                self.assertTrue(any("/assets/js/roster.js" in source for source in before["scripts"]))
                self.assertEqual(state["authRequests"], 1)
                self.assertGreaterEqual(state["configRequests"], 2)
                self.assertEqual(state["nonLocalRequests"], [])
                self.assertEqual(
                    after["identity"],
                    {"code": SYNTHETIC_CODE, "name": "Synthetic Learner", "role": "learner"},
                )
                self.assertEqual(after["error"], "")
                self.assertFalse(after["loginVisible"])


if __name__ == "__main__":
    unittest.main()
