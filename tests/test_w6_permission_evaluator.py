"""Behavior and page-contract tests for Week 6 permission-rule practice."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import textwrap
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "assets" / "js" / "interactive-w6-permissions.js"
SCRIPT_URL = "../../assets/js/interactive-w6-permissions.js?v=20260924"
PAGES = {
    "w06d2.html": ("all", 2),
    "w06d4.html": ("legacy", 2),
    "w06d5.html": ("delivery", 2),
}
EXPECTED = {
    "docs-guide": ("allow", "F-02"),
    "source-read": ("allow", "F-03"),
    "restricted-read": ("deny", "F-01"),
    "sensitive-arg": ("deny", "S-01"),
    "unit-tests": ("allow", "T-01"),
    "deployment-tests": ("deny", "T-02"),
    "public-fetch": ("allow", "H-01"),
    "unknown-fetch": ("deny", "D-01"),
    "shell-command": ("deny", "D-01"),
    "outside-source": ("deny", "D-01"),
    "case-variant": ("deny", "D-01"),
}


class PageContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.widgets: list[dict[str, str | None]] = []
        self.future_count = 0
        self.scripts: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        classes = set((values.get("class") or "").split())
        if "ix-permission" in classes:
            self.widgets.append(values)
        if "ix-future" in classes:
            self.future_count += 1
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"] or "")
        if tag == "a" and values.get("href"):
            self.links.append(values["href"] or "")


def find_chrome() -> str | None:
    candidates = [
        os.environ.get("CHROME_BIN"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    candidates += [shutil.which(name) for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")]
    return next((path for path in candidates if path and os.access(path, os.X_OK)), None)


CHROME = find_chrome()


def run_node(script: str) -> dict:
    result = subprocess.run(["node", "-e", script], cwd=ROOT, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


class Week6PermissionEvaluatorTests(unittest.TestCase):
    def test_seeded_fixture_verdicts_and_exact_deciding_rules(self) -> None:
        contract = run_node(textwrap.dedent("""
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const results = {};
            for (const item of policy.fixtures()) {
              const result = policy.evaluateCall(item.call);
              results[item.id] = { verdict: result.verdict, decidingRule: result.decidingRule };
            }
            process.stdout.write(JSON.stringify({ results, rules: policy.rules(), sets: policy.sets() }));
        """))
        self.assertGreaterEqual(len(contract["results"]), 8)
        self.assertEqual(set(EXPECTED), set(contract["results"]))
        for case_id, (verdict, rule_id) in EXPECTED.items():
            with self.subTest(case=case_id):
                self.assertEqual({"verdict": verdict, "decidingRule": rule_id}, contract["results"][case_id])
        self.assertEqual("src/**", next(rule["target"] for rule in contract["rules"] if rule["id"] == "F-03"))
        self.assertNotIn("**", [rule["target"] for rule in contract["rules"] if rule["tool"] == "file.read"])

    def test_precedence_trace_covers_specific_wildcard_and_sensitive_rules(self) -> None:
        result = run_node(textwrap.dedent("""
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const cases = Object.fromEntries(policy.fixtures().map(item => [item.id, item]));
            const inspect = id => {
              const result = policy.evaluateCall(cases[id].call);
              return { decidingRule: result.decidingRule, matched: result.trace.filter(row => row.matched) };
            };
            process.stdout.write(JSON.stringify({
              restricted: inspect('restricted-read'), unit: inspect('unit-tests'), sensitive: inspect('sensitive-arg')
            }));
        """))
        self.assertEqual("F-01", result["restricted"]["decidingRule"])
        self.assertEqual(["F-01", "D-01"], [row["id"] for row in result["restricted"]["matched"]])
        self.assertTrue(result["restricted"]["matched"][1]["precedence"])
        self.assertEqual(["T-01", "T-02", "D-01"], [row["id"] for row in result["unit"]["matched"]])
        self.assertEqual("S-01", result["sensitive"]["decidingRule"])
        self.assertIn("args.api_token", result["sensitive"]["matched"][0]["reason"])

    def test_bounded_posix_relative_path_grammar_and_surprising_reads(self) -> None:
        result = run_node(textwrap.dedent("""
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const paths = [
              'docs/guide.md', 'src/app.js', 'restricted/x', 'vendor/x', 'Docs/guide.md',
              '/restricted/x', String.raw`\\restricted\\x`, './restricted/x', 'docs/./x',
              'docs/../restricted/x', 'docs//x', 'docs/x/', ' docs/x', 'docs/x ',
              String.raw`docs\\x`, 'docs/' + String.fromCharCode(0) + 'x', ''
            ];
            const rows = paths.map(path => {
              const result = policy.evaluateCall({tool:'file.read', args:{path}});
              return {path, ok:result.ok, verdict:result.verdict, rule:result.decidingRule || null, error:result.error || null};
            });
            process.stdout.write(JSON.stringify(rows));
        """))
        rows = {row["path"]: row for row in result}
        self.assertEqual((True, "allow", "F-02"), (rows["docs/guide.md"]["ok"], rows["docs/guide.md"]["verdict"], rows["docs/guide.md"]["rule"]))
        self.assertEqual((True, "allow", "F-03"), (rows["src/app.js"]["ok"], rows["src/app.js"]["verdict"], rows["src/app.js"]["rule"]))
        for path, rule in [("restricted/x", "F-01"), ("vendor/x", "D-01"), ("Docs/guide.md", "D-01")]:
            self.assertTrue(rows[path]["ok"], path)
            self.assertEqual(("deny", rule), (rows[path]["verdict"], rows[path]["rule"]))
        malformed = set(rows) - {"docs/guide.md", "src/app.js", "restricted/x", "vendor/x", "Docs/guide.md"}
        for path in malformed:
            with self.subTest(path=repr(path)):
                self.assertFalse(rows[path]["ok"])
                self.assertEqual("deny", rows[path]["verdict"])
                self.assertTrue(rows[path]["error"])

    def test_sensitive_rule_has_bounded_positive_and_negative_controls(self) -> None:
        result = run_node(textwrap.dedent("""
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const check = args => policy.evaluateCall({tool:'file.read', args:{path:'docs/setup.md', ...args}});
            const positive = [
              {api_token:'synthetic'}, {meta:{' Private-Key ':'synthetic'}},
              {path:'docs/setup.md', note:' .ENV.local '}, {header:'Bearer abcdefgh'},
              {nested:{PASSWORD:'synthetic'}}, {material:'-----BEGIN PRIVATE KEY-----'},
              {apiKey:'synthetic'}, {APIKey:'synthetic'}, {nested:{privateKey:'synthetic'}}, {'API-Token':'synthetic'}
            ].map(check);
            const negative = [
              {max_tokens:4096}, {file:'src/tokenizer.py'}, {topic:'docs/secrets-management.md'},
              {role:'secretary'}, {note:'tokenization'}, {header:'Bearer short'},
              {maxTokens:4096}, {tokenizerName:'bpe'}, {secretsDoc:'docs/secrets.md'}
            ].map(check);
            process.stdout.write(JSON.stringify({positive, negative}));
        """))
        self.assertEqual(10, len(result["positive"]))
        for item in result["positive"]:
            self.assertEqual(("deny", "S-01"), (item["verdict"], item["decidingRule"]))
            self.assertIn("args.", item["trace"][0]["reason"])
        for item in result["negative"]:
            self.assertEqual(("allow", "F-02"), (item["verdict"], item["decidingRule"]))

    def test_public_evaluator_rejects_prototypes_accessors_cycles_and_excess_depth(self) -> None:
        result = run_node(textwrap.dedent("""
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const inherited = Object.create({tool:'file.read', args:{path:'docs/x'}});
            const accessor = {}; Object.defineProperty(accessor, 'tool', {get(){throw new Error('read getter')}});
            Object.defineProperty(accessor, 'args', {value:{path:'docs/x'}, enumerable:true});
            const cyclicArgs = {}; cyclicArgs.self = cyclicArgs;
            let deep = {}; let cursor = deep; for(let i=0;i<8;i++){cursor.next={}; cursor=cursor.next;}
            const hostile = {getPrototypeOf(){throw new Error('trap')}, ownKeys(){throw new Error('trap')}, getOwnPropertyDescriptor(){throw new Error('trap')}};
            const values = [inherited, accessor, {tool:'file.read',args:cyclicArgs}, {tool:'file.read',args:deep},
              {tool:'unknown',args:{}}, {tool:' file.read',args:{path:'docs/x'}},
              new Proxy({tool:'file.read',args:{path:'docs/x'}}, hostile),
              {tool:'file.read',args:new Proxy({path:'docs/x'}, hostile)}];
            const results = values.map(value => { try { return policy.evaluateCall(value); } catch(error) { return {threw:error.message}; } });
            const fixtures = policy.fixtures(); const rules = policy.rules();
            let fixtureFrozen = Object.isFrozen(fixtures) && Object.isFrozen(fixtures[0]) && Object.isFrozen(fixtures[0].call.args);
            let rulesFrozen = Object.isFrozen(rules) && Object.isFrozen(rules[0]);
            process.stdout.write(JSON.stringify({results, fixtureFrozen, rulesFrozen}));
        """))
        self.assertTrue(result["fixtureFrozen"])
        self.assertTrue(result["rulesFrozen"])
        self.assertFalse(any("threw" in item for item in result["results"]))
        for item in result["results"][:4] + result["results"][5:]:
            self.assertFalse(item["ok"])
            self.assertEqual("deny", item["verdict"])
        self.assertEqual(("deny", "D-01"), (result["results"][4]["verdict"], result["results"][4]["decidingRule"]))

    def test_predict_check_retry_reset_and_changed_prediction_session_state(self) -> None:
        result = run_node(textwrap.dedent("""
            const policy = require('./assets/js/interactive-w6-permissions.js');
            const session = policy.createSession(['docs-guide','deployment-tests']);
            const before=session.check(); session.predict('deny'); const wrong=session.check();
            session.predict('allow'); const changed=session.state(); const right=session.check();
            session.next(); session.predict('deny'); const second=session.check(); session.retry(); const retried=session.state();
            session.reset();
            process.stdout.write(JSON.stringify({before,wrong,changed,right,second,retried,reset:session.state(),current:session.current()}));
        """))
        self.assertFalse(result["before"]["ok"])
        self.assertFalse(result["wrong"]["correct"])
        self.assertFalse(result["changed"]["checked"])
        self.assertTrue(result["right"]["correct"])
        self.assertTrue(result["second"]["correct"])
        self.assertEqual({"index": 1, "prediction": None, "checked": False, "total": 2}, result["retried"])
        self.assertEqual({"index": 0, "prediction": None, "checked": False, "total": 2}, result["reset"])
        self.assertNotIn("verdict", result["current"])

    def test_pages_replace_placeholders_and_load_exact_script_url(self) -> None:
        for filename, (case_set, future_count) in PAGES.items():
            with self.subTest(page=filename):
                parser = PageContractParser()
                parser.feed((ROOT / "weeks" / "w06" / filename).read_text(encoding="utf-8"))
                self.assertEqual(1, len(parser.widgets))
                self.assertEqual(case_set, parser.widgets[0].get("data-case-set"))
                self.assertEqual(future_count, parser.future_count)
                self.assertEqual(1, parser.scripts.count(SCRIPT_URL))
        primary = PageContractParser()
        primary.feed((ROOT / "weeks" / "w06" / "w06d2.html").read_text(encoding="utf-8"))
        self.assertIn("w06d4.html#permission-evaluator-legacy", primary.links)
        self.assertIn("w06d5.html#permission-evaluator-delivery", primary.links)

    def test_module_executes_without_network_storage_credentials_or_broad_browser_api(self) -> None:
        subprocess.run(["node", "--check", str(MODULE)], cwd=ROOT, check=True, capture_output=True, text=True)
        result = run_node(textwrap.dedent("""
            const fs=require('fs'), vm=require('vm'); let calls=0;
            const forbidden=()=>{calls++;throw new Error('external API accessed')};
            const sandbox={module:{exports:{}},exports:{},fetch:forbidden,XMLHttpRequest:function(){forbidden()}};
            for(const name of ['localStorage','sessionStorage','indexedDB','process']) Object.defineProperty(sandbox,name,{get:forbidden});
            sandbox.globalThis=sandbox;
            vm.runInNewContext(fs.readFileSync('./assets/js/interactive-w6-permissions.js','utf8'),sandbox,{filename:'interactive-w6-permissions.js'});
            const testing=sandbox.module.exports;
            const verdicts=testing.fixtures().map(item=>testing.evaluateCall(item.call).verdict);
            process.stdout.write(JSON.stringify({calls,verdicts,browserKeys:Object.keys(sandbox.Week6Permissions),testingKeys:Object.keys(testing)}));
        """))
        self.assertEqual(0, result["calls"])
        self.assertEqual(len(EXPECTED), len(result["verdicts"]))
        self.assertEqual(["init"], result["browserKeys"])
        self.assertNotIn("CASES", result["testingKeys"])
        self.assertNotIn("RULES", result["testingKeys"])

    def test_widget_dom_has_no_presubmit_leak_and_clears_stale_feedback(self) -> None:
        result = run_node(DOM_TEST_SCRIPT)
        self.assertEqual(0, result["calls"])
        structure = result["structure"]
        self.assertEqual(structure["selectId"], structure["selectLabelFor"])
        self.assertEqual("LEGEND", structure["legendFirst"])
        self.assertEqual({"live": "polite", "atomic": "true"}, structure["statusAttrs"])
        self.assertEqual(["perm-verdict"], structure["liveNodes"])
        self.assertFalse(structure["hasTextInput"])
        self.assertTrue(all(kind == "button" for kind in structure["buttonTypes"]))
        self.assertTrue(all(class_name == "perm-check" for class_name in structure["checkClasses"]))
        for surface in result["preSubmit"] + result["subsetSurfaces"]:
            lowered = surface.lower()
            for _, rule in EXPECTED.values():
                self.assertNotIn(rule.lower(), lowered)
            self.assertNotIn("focus:", lowered)
            self.assertNotIn("specific allow", lowered)
            self.assertNotIn("wildcard deny", lowered)
            self.assertNotIn("least-privilege fallback", lowered)
            self.assertNotIn("data-verdict", lowered)
            self.assertNotIn('value="allow"', lowered)
            self.assertNotIn('value="deny"', lowered)
        self.assertIn("Choose allow or deny", result["missing"]["status"])
        self.assertEqual([], result["missing"]["trace"])
        self.assertIn("deciding rule F-02", result["checked"]["status"])
        self.assertEqual(8, len(result["checked"]["trace"]))
        self.assertEqual("Prediction changed—check again.", result["changed"]["status"])
        self.assertEqual([], result["changed"]["trace"])
        self.assertIn("deciding rule F-02", result["rechecked"]["status"])
        self.assertEqual("", result["reset"]["status"])
        self.assertEqual([], result["reset"]["trace"])
        self.assertEqual([False, False], result["reset"]["checked"])
        self.assertTrue(result["resetFocus"])
        self.assertIn("Real permission engines vary", result["boundary"])
        self.assertTrue(result["retryFocus"])
        self.assertTrue(result["nextFocus"])
        self.assertEqual(1, result["afterNext"]["index"])
        self.assertEqual("", result["afterNext"]["status"])
        self.assertTrue(all(kind == "radio" for kind in structure["radioTypes"]))
        self.assertEqual([], structure["negativeTabIndex"])
        hint_words = ("unlisted", "unknown", "credential", "secret", "token", "restricted", "case-variant",
                      "public", "deployment", "unit", "shell", "allow", "deny", "default")
        for title in result["optionTitles"]:
            with self.subTest(title=title):
                for word in hint_words:
                    self.assertNotIn(word, title.lower())

    def test_check_button_contrast_and_narrow_layout_in_injected_styles(self) -> None:
        styles = run_node(DOM_TEST_SCRIPT)["styleText"]
        rules: dict[str, dict[str, str]] = {}
        media: dict[str, dict[str, dict[str, str]]] = {}

        def parse_block(text: str, target: dict[str, dict[str, str]]) -> None:
            for selector, body in re.findall(r"([^{}]+)\{([^{}]*)\}", text):
                declarations = dict(
                    (name.strip(), value.strip())
                    for name, value in (item.split(":", 1) for item in body.split(";") if ":" in item)
                )
                for part in selector.split(","):
                    target.setdefault(part.strip(), {}).update(declarations)

        for query, inner in re.findall(r"@media\(([^)]*)\)\{((?:[^{}]*\{[^{}]*\})*)\}", styles):
            parse_block(inner, media.setdefault(query, {}))
        parse_block(re.sub(r"@media\([^)]*\)\{(?:[^{}]*\{[^{}]*\})*\}", "", styles), rules)

        def luminance(color: str) -> float:
            value = color.lstrip("#")
            if len(value) == 3:
                value = "".join(ch * 2 for ch in value)
            channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
            linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

        def ratio(a: str, b: str) -> float:
            light, dark = sorted((luminance(a), luminance(b)), reverse=True)
            return (light + 0.05) / (dark + 0.05)

        check = rules[".perm-check"]
        hover = rules[".perm-check:hover"]
        for declared in (check["color"], check["background"], hover["background"]):
            self.assertRegex(declared, r"^#[0-9a-fA-F]{3,6}$")
        self.assertGreaterEqual(ratio(check["color"], check["background"]), 4.5)
        self.assertGreaterEqual(ratio(check["color"], hover["background"]), 4.5)
        narrow = media["max-width:560px"]
        self.assertEqual("1fr", narrow[".perm-layout"]["grid-template-columns"])
        self.assertEqual("minmax(0,1fr) minmax(0,1fr)", rules[".perm-layout"]["grid-template-columns"])
        self.assertEqual("anywhere", rules[".perm-call"]["overflow-wrap"])
        self.assertEqual("100%", rules[".perm-case-select"]["width"])


    @unittest.skipUnless(CHROME, "Chrome/Chromium not found; set CHROME_BIN to run real-browser regressions")
    def test_real_browser_390px_overflow_keyboard_and_live_region_in_both_themes(self) -> None:
        result = subprocess.run(
            ["node", "-e", BROWSER_TEST_SCRIPT, CHROME, str(ROOT)],
            cwd=ROOT, text=True, capture_output=True, timeout=180,
        )
        self.assertEqual(0, result.returncode, result.stderr)
        runs = json.loads(result.stdout)
        self.assertEqual(len(PAGES) * 2 * 2, len(runs))
        for run in runs:
            label = f"{run['page']} {run['theme']} {run['width']}px"
            with self.subTest(run=label):
                self.assertEqual(run["theme"], run["appliedTheme"])
                self.assertEqual(run["width"], run["viewport"])
                self.assertEqual([], run["overflow"])
                self.assertLessEqual(run["widgetScrollWidth"], run["widgetClientWidth"])
                self.assertGreaterEqual(run["checkContrast"], 4.5)
                self.assertEqual("", run["preSubmitStatus"])
                self.assertEqual("SELECT", run["tabOrder"][0])
                self.assertEqual("INPUT:radio", run["tabOrder"][1])
                self.assertEqual("BUTTON:Check prediction", run["tabOrder"][2])
                self.assertEqual("deny", run["arrowPrediction"])
                self.assertEqual("allow", run["spacePrediction"])
                self.assertIn("Choose allow or deny", run["missingStatus"])
                self.assertRegex(run["enterStatus"], r"^(Correct|Not yet): (ALLOW|DENY) — deciding rule [A-Z]-\d{2}\.$")
                self.assertEqual("polite", run["liveAttr"])
                self.assertEqual(1, run["liveRegionCount"])
                self.assertTrue(run["announced"])
                self.assertEqual("Prediction changed—check again.", run["changedStatus"])
                self.assertEqual("SELECT", run["focusAfterReset"])
                self.assertEqual([], run["pageErrors"])
                self.assertEqual([], run["externalRequests"])


DOM_TEST_SCRIPT = textwrap.dedent(r"""
const fs=require('fs'),vm=require('vm');let calls=0;const forbidden=()=>{calls++;throw new Error('forbidden API')};
class TextNode{constructor(data){this.nodeType=3;this.data=String(data)}get textContent(){return this.data}}
class Element{
 constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.className='';this.id='';this.value='';this.checked=false;this.type='';this.name=''}
 get textContent(){return this.children.map(c=>c.textContent).join('')}set textContent(v){this.children=v===''?[]:[new TextNode(v)]}
 set innerHTML(v){forbidden()}get innerHTML(){return forbidden()}appendChild(c){this.children.push(c);c.parentNode=this;return c}
 setAttribute(n,v){this.attributes[n]=String(v)}getAttribute(n){return Object.prototype.hasOwnProperty.call(this.attributes,n)?this.attributes[n]:null}
 addEventListener(t,h){(this.listeners[t]=this.listeners[t]||[]).push(h)}dispatch(t){(this.listeners[t]||[]).forEach(h=>h({type:t,target:this}))}focus(){document.activeElement=this}
}
const all=n=>[n].concat((n.children||[]).filter(c=>c.nodeType===1).flatMap(all));
const head=new Element('head'),body=new Element('body'),widget=new Element('div');widget.className='ix-permission';widget.id='perm';widget.setAttribute('data-case-set','all');body.appendChild(widget);
const document={readyState:'complete',head,body,activeElement:null,createElement:t=>new Element(t),createTextNode:t=>new TextNode(t),getElementById:id=>all(head).concat(all(body)).find(n=>n.id===id)||null,querySelectorAll:s=>s==='.ix-permission'?[widget]:[],addEventListener(){},write:forbidden};
const sandbox={module:{exports:{}},exports:{},document,fetch:forbidden,XMLHttpRequest:function(){forbidden()},WebSocket:function(){forbidden()},EventSource:function(){forbidden()}};
for(const name of ['localStorage','sessionStorage','indexedDB','process'])Object.defineProperty(sandbox,name,{get:forbidden});sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync('./assets/js/interactive-w6-permissions.js','utf8'),sandbox,{filename:'interactive-w6-permissions.js'});
const policy=sandbox.module.exports,nodes=()=>all(widget),byTag=t=>nodes().filter(n=>n.tagName===t.toUpperCase()),button=t=>byTag('button').find(n=>n.textContent===t),select=byTag('select')[0],radios=byTag('input'),status=nodes().find(n=>n.getAttribute('role')==='status');
const snap=()=>({status:status.textContent,trace:byTag('li').map(n=>n.textContent),checked:radios.map(r=>r.checked)});
const preSubmit=[];for(const option of byTag('option')){select.value=option.value;select.dispatch('change');const progress=nodes().find(n=>n.className==='perm-progress').textContent,call=nodes().find(n=>n.className==='perm-call').textContent;preSubmit.push(JSON.stringify({option:{text:option.textContent,value:option.value,className:option.className,attributes:option.attributes},progress,call,status:status.textContent}));}
select.value='case-1';select.dispatch('change');button('Check prediction').dispatch('click');const missing=snap();radios[0].checked=true;radios[0].dispatch('change');button('Check prediction').dispatch('click');const checked=snap();radios[0].checked=false;radios[1].checked=true;radios[1].dispatch('change');const changed=snap();button('Check prediction').dispatch('click');const rechecked=snap();button('Reset drill').dispatch('click');const reset=snap();const resetFocus=document.activeElement===select;
button('Retry case').dispatch('click');const retryFocus=document.activeElement===radios[0];button('Next case').dispatch('click');const nextFocus=document.activeElement===select;const afterNext={index:Number(select.value.replace('case-',''))-1,status:status.textContent};
const optionTitles=byTag('option').map(n=>n.textContent);
const structure={selectLabelFor:byTag('label').find(n=>n.getAttribute('for'))?.getAttribute('for'),selectId:select.id,legendFirst:byTag('fieldset')[0].children[0].tagName,statusAttrs:{live:status.getAttribute('aria-live'),atomic:status.getAttribute('aria-atomic')},liveNodes:nodes().filter(n=>n.getAttribute('aria-live')).map(n=>n.className),hasTextInput:radios.some(n=>n.type!=='radio')||byTag('textarea').length>0,buttonTypes:byTag('button').map(n=>n.type),checkClasses:byTag('button').filter(n=>n.textContent==='Check prediction').map(n=>n.className),radioTypes:radios.map(n=>n.type),negativeTabIndex:nodes().filter(n=>Number(n.getAttribute('tabindex'))<0).map(n=>n.tagName)};
const subsetSurfaces=[];for(const set of ['legacy','delivery']){widget.setAttribute('data-case-set',set);policy.init(document);const subsetSelect=byTag('select')[0];for(const option of byTag('option')){subsetSelect.value=option.value;subsetSelect.dispatch('change');subsetSurfaces.push(JSON.stringify({set,option:{text:option.textContent,value:option.value,className:option.className,attributes:option.attributes},progress:nodes().find(n=>n.className==='perm-progress').textContent,call:nodes().find(n=>n.className==='perm-call').textContent,status:nodes().find(n=>n.getAttribute('role')==='status').textContent}));}}
console.log(JSON.stringify({calls,structure,preSubmit,subsetSurfaces,missing,checked,changed,rechecked,reset,resetFocus,retryFocus,nextFocus,afterNext,optionTitles,styleText:document.getElementById('w6-permission-styles').textContent,boundary:nodes().find(n=>n.className==='perm-boundary').textContent}));
""")


BROWSER_TEST_SCRIPT = textwrap.dedent(r"""
const {spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path'),{pathToFileURL}=require('url');
const [chrome,root]=process.argv.slice(1);
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'w6-perm-'));
const proc=spawn(chrome,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-gpu','--allow-file-access-from-files','about:blank'],{stdio:['ignore','ignore','pipe']});
const cleanup=()=>{try{proc.kill('SIGKILL')}catch(e){}try{fs.rmSync(profile,{recursive:true,force:true})}catch(e){}};
const wsUrl=new Promise((resolve,reject)=>{let buf='';proc.stderr.on('data',d=>{buf+=d;const m=buf.match(/DevTools listening on (ws:\S+)/);if(m)resolve(m[1])});proc.on('exit',()=>reject(new Error('chrome exited: '+buf)));setTimeout(()=>reject(new Error('chrome start timeout')),30000)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const ws=new WebSocket(await wsUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let seq=0;const pending=new Map(),listeners=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}else listeners.forEach(l=>l(m))};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}))});
 const runs=[];
 for(const page of ['w06d2.html','w06d4.html','w06d5.html'])for(const theme of ['light','dark'])for(const width of [1280,390]){
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const s=(m,p)=>send(m,p,sessionId);
  const pageErrors=[],externalRequests=[];
  const listener=m=>{if(m.sessionId!==sessionId)return;
   if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;const where=(d.url||'')+' '+JSON.stringify(d.stackTrace||{});if(where.includes('interactive-w6-permissions'))pageErrors.push(d.exception?.description||d.text)}
   if(m.method==='Network.requestWillBeSent'){const url=m.params.request.url;if(!/^(file|data|about|blob):/.test(url)&&JSON.stringify(m.params.initiator||{}).includes('interactive-w6-permissions'))externalRequests.push(url)}
   if(m.method==='Fetch.requestPaused')s('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{})};
  listeners.push(listener);
  await s('Runtime.enable');await s('Network.enable');await s('Page.enable');
  await s('Fetch.enable',{patterns:[{urlPattern:'http://*'},{urlPattern:'https://*'}]});
  await s('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await s('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});
  await s('Page.navigate',{url:pathToFileURL(path.join(root,'weeks','w06',page)).href});
  const evaluate=async expr=>{const r=await s('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
  for(let i=0;i<100&&!(await evaluate("document.readyState==='complete'&&!!document.querySelector('.ix-permission .perm-check')"));i++)await sleep(100);
  await evaluate("document.querySelectorAll('.login-overlay').forEach(n=>n.remove());true");
  const key=async(k,code,keyCode,text,shift)=>{const base={key:k,code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode,modifiers:shift?8:0};await s('Input.dispatchKeyEvent',Object.assign({type:text?'keyDown':'rawKeyDown',text},base));await s('Input.dispatchKeyEvent',Object.assign({type:'keyUp'},base));await sleep(30)};
  const Tab=()=>key('Tab','Tab',9),Space=()=>key(' ','Space',32,' '),Enter=()=>key('Enter','Enter',13,'\r'),Down=()=>key('ArrowDown','ArrowDown',40);
  const active="(()=>{const a=document.activeElement;return a.tagName+(a.type==='radio'?':radio':a.tagName==='BUTTON'?':'+a.textContent:'')})()";
  const W="document.querySelector('.ix-permission')";
  const layout=await evaluate(`(()=>{const w=${W};w.scrollIntoView();const wr=w.getBoundingClientRect();const overflow=[];for(const n of w.querySelectorAll('*')){const r=n.getBoundingClientRect();if(r.width&&(r.right>wr.right+0.5||r.left<wr.left-0.5||n.scrollWidth>n.clientWidth+1&&getComputedStyle(n).overflowX!=='visible'))overflow.push(n.tagName+'.'+n.className+':'+Math.round(r.left)+'-'+Math.round(r.right))}if(wr.right>innerWidth+0.5)overflow.push('widget:'+Math.round(wr.right));
   const lum=c=>{const v=c.match(/[\\d.]+/g).slice(0,3).map(x=>x/255).map(x=>x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4);return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};const cs=getComputedStyle(w.querySelector('.perm-check'));const a=lum(cs.color),b=lum(cs.backgroundColor);
   return {overflow,viewport:innerWidth,widgetScrollWidth:w.scrollWidth,widgetClientWidth:w.clientWidth,appliedTheme:document.documentElement.getAttribute('data-theme'),checkContrast:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),preSubmitStatus:w.querySelector('[role=status]').textContent,liveAttr:w.querySelector('[role=status]').getAttribute('aria-live'),liveRegionCount:w.querySelectorAll('[aria-live]').length}})()`);
  await evaluate(`${W}.querySelector('select').focus();true`);
  const tabOrder=[await evaluate(active)];for(let i=0;i<2;i++){await Tab();tabOrder.push(await evaluate(active))}
  await Enter();const missingStatus=await evaluate(`${W}.querySelector('[role=status]').textContent`);
  await key('Tab','Tab',9,undefined,true);await Down();const arrowPrediction=await evaluate(`(${W}.querySelector('input:checked')||{}).value||null`);
  await key('ArrowUp','ArrowUp',38);await Space();const spacePrediction=await evaluate(`(${W}.querySelector('input:checked')||{}).value||null`);
  await Tab();await Enter();const enterStatus=await evaluate(`${W}.querySelector('[role=status]').textContent`);
  const {root:{nodeId:docId}}=await s('DOM.getDocument',{depth:0});const {nodeId}=await s('DOM.querySelector',{nodeId:docId,selector:'.ix-permission [role=status]'});
  const {nodes}=await s('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false});const ax=nodes[0]||{};
  const announced=ax.role?.value==='status'&&(ax.properties||[]).some(p=>p.name==='live'&&p.value.value==='polite')&&enterStatus.length>0;
  await key('Tab','Tab',9,undefined,true);await key('ArrowDown','ArrowDown',40);const changedStatus=await evaluate(`${W}.querySelector('[role=status]').textContent`);
  await evaluate(`${W}.querySelectorAll('button')[3].focus();true`);await Enter();const focusAfterReset=await evaluate("document.activeElement.tagName");
  runs.push(Object.assign({page,theme,width,tabOrder,missingStatus,arrowPrediction,spacePrediction,enterStatus,announced,changedStatus,focusAfterReset,pageErrors,externalRequests},layout));
  listeners.splice(listeners.indexOf(listener),1);await send('Target.closeTarget',{targetId});
 }
 ws.close();return runs;
}
main().then(r=>{process.stdout.write(JSON.stringify(r));cleanup();process.exit(0)},e=>{console.error(e.stack||e);cleanup();process.exit(1)});
""")


if __name__ == "__main__":
    unittest.main()
