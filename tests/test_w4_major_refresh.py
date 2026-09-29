"""Behavioral, safety, provenance, and accessibility contracts for Week 4."""

from __future__ import annotations

import ast
import json
import re
import subprocess
import sys
import textwrap
import unittest
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
W4_PAGES = sorted((ROOT / "weeks" / "w04").glob("*.html"))
W4_RESEARCH = sorted((ROOT / "docs" / "research" / "w04").glob("*.md"))
SIMULATOR = ROOT / "assets" / "js" / "interactive-w4-checkpoint.js"
W4_CSS = ROOT / "assets" / "css" / "w4-major-refresh.css"
CODEVIEWER = ROOT / "assets" / "js" / "codeviewer.js"
EVIDENCE_DATE = date(2026, 9, 25)
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
FORBIDDEN_PYTHON_NODES = (ast.Import, ast.ImportFrom, ast.While, ast.AsyncFor, ast.With, ast.AsyncWith)
FORBIDDEN_CALLS = {"open", "exec", "eval", "compile", "__import__", "input", "breakpoint"}
FORBIDDEN_ATTRIBUTES = {"environ", "getenv", "putenv", "system", "popen", "socket", "urlopen", "request", "write_text", "write_bytes"}
FORBIDDEN_CYPHER = {"CREATE", "MERGE", "SET", "DELETE", "DETACH", "REMOVE", "DROP", "LOAD", "FOREACH", "TERMINATE"}


class Element:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = dict(attrs)
        self.children: list[Element | str] = []

    def find_all(self, tag: str | None = None, class_name: str | None = None) -> list[Element]:
        classes = set((self.attrs.get("class") or "").split())
        matches = [self] if (tag is None or self.tag == tag) and (class_name is None or class_name in classes) else []
        for child in self.children:
            if isinstance(child, Element):
                matches.extend(child.find_all(tag, class_name))
        return matches

    def text(self) -> str:
        return "".join(child.text() if isinstance(child, Element) else child for child in self.children)


class CurriculumHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document", [])
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return
        raise AssertionError(f"closing tag </{tag}> has no matching open tag")

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


class ParsedPage:
    def __init__(self, path: Path) -> None:
        parser = CurriculumHTMLParser()
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
        if len(parser.stack) != 1:
            raise AssertionError(f"unclosed tags in {path}: {[node.tag for node in parser.stack[1:]]}")
        self.path = path
        self.root = parser.root

    @property
    def embedded_javascript(self) -> str:
        return "\n".join(script.text() for script in self.root.find_all("script") if not script.attrs.get("src"))


def published_example(path: Path) -> tuple[str, str]:
    page = ParsedPage(path)
    viewer = page.root.find_all("div", "cv")[0]
    raw = page.root.find_all("pre", "cv-raw")[0]
    return raw.text(), raw.attrs.get("data-lang") or viewer.attrs.get("data-lang") or "python"


def validate_python_example(source: str) -> None:
    """Parse authored examples without executing them and reject risky capabilities."""
    tree = ast.parse(source, filename="published-popup")
    for node in ast.walk(tree):
        if isinstance(node, FORBIDDEN_PYTHON_NODES):
            raise AssertionError(f"forbidden Python structure: {type(node).__name__}")
        if isinstance(node, ast.Attribute) and node.attr.lower() in FORBIDDEN_ATTRIBUTES:
            raise AssertionError(f"forbidden Python attribute: {node.attr}")
        if isinstance(node, ast.Name) and node.id.lower() in {"os", "sys", "socket", "subprocess", "pathlib", "urllib", "requests"}:
            raise AssertionError(f"forbidden Python capability name: {node.id}")
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
                raise AssertionError(f"forbidden Python call: {node.func.id}")
            if isinstance(node.func, ast.Attribute) and node.func.attr.lower() in FORBIDDEN_ATTRIBUTES:
                raise AssertionError(f"forbidden Python call: {node.func.attr}")


def isolated_python(source: str, *, optimized: bool = False, timeout: float = 3.0) -> subprocess.CompletedProcess[str]:
    """Execute already-validated fixture code with explicit builtins/env and resource caps."""
    runner = textwrap.dedent(
        """
        import resource
        import sys

        resource.setrlimit(resource.RLIMIT_CPU, (1, 1))
        resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
        source = sys.stdin.read()
        safe_builtins = {"len": len, "list": list, "print": print, "ValueError": ValueError}
        exec(compile(source, "published-popup", "exec"), {"__builtins__": safe_builtins})
        """
    )
    command = [sys.executable, "-I"]
    if optimized:
        command.append("-O")
    command.extend(["-c", runner])
    return subprocess.run(
        command,
        input=source,
        text=True,
        capture_output=True,
        timeout=timeout,
        env={"PYTHONHASHSEED": "0", "PYTHONIOENCODING": "utf-8"},
    )


def cypher_tokens(source: str) -> list[str]:
    without_comments = re.sub(r"/\*.*?\*/|//[^\n]*", " ", source, flags=re.DOTALL)
    without_strings = re.sub(r"'(?:''|[^'])*'|\"(?:\\.|[^\"\\])*\"|`(?:``|[^`])*`", " STRING ", without_comments)
    return re.findall(r"\$?[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[(){}.,:=]", without_strings)


def validate_tenant_safe_cypher(source: str) -> None:
    tokens = cypher_tokens(source)
    upper = [token.upper() for token in tokens]
    forbidden = FORBIDDEN_CYPHER.intersection(upper)
    if forbidden:
        raise AssertionError(f"forbidden Cypher token(s): {sorted(forbidden)}")
    if "CALL" in upper:
        call_at = upper.index("CALL")
        procedure = ".".join(upper[call_at + 1: call_at + 8])
        raise AssertionError(f"procedure calls are not allowed in this static query: {procedure}")
    required = {"CYPHER", "MATCH", "SEARCH", "VECTOR", "INDEX", "FOR", "WHERE", "LIMIT", "SCORE", "RETURN", "ORDER", "BY"}
    missing = required.difference(upper)
    if missing:
        raise AssertionError(f"missing Cypher structure: {sorted(missing)}")

    search_at = upper.index("SEARCH")
    try:
        open_at = upper.index("(", search_at)
    except ValueError as error:
        raise AssertionError("SEARCH must contain an index-search body") from error
    depth = 0
    close_at = None
    for index in range(open_at, len(upper)):
        if upper[index] == "(":
            depth += 1
        elif upper[index] == ")":
            depth -= 1
            if depth == 0:
                close_at = index
                break
    if close_at is None:
        raise AssertionError("SEARCH body is unbalanced")
    search_body = upper[open_at:close_at]
    if "WHERE" not in search_body or "TENANTID" not in search_body or "$TENANT_ID" not in search_body:
        raise AssertionError("tenantId must be filtered inside SEARCH before LIMIT")
    if search_body.index("WHERE") > search_body.index("LIMIT"):
        raise AssertionError("the in-search tenant filter must precede LIMIT")

    compact = re.sub(r"\s+", "", re.sub(r"//[^\n]*", "", source))
    if not re.search(r"\(system:System\{tenantId:\$tenant_id\}\)", compact, re.IGNORECASE):
        raise AssertionError("System traversal is not tenant-scoped")
    if not re.search(r"\(team:Team\{tenantId:\$tenant_id\}\)", compact, re.IGNORECASE):
        raise AssertionError("Team traversal is not tenant-scoped")


def parse_css_rules(source: str) -> list[tuple[tuple[str, ...], tuple[str, ...], dict[str, str]]]:
    """Parse stylesheet text into (at-rule context, selectors, declarations) tuples."""
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    rules: list[tuple[tuple[str, ...], tuple[str, ...], dict[str, str]]] = []
    context: list[str] = []
    prelude = ""
    index = 0
    while index < len(source):
        char = source[index]
        if char == "{":
            header = " ".join(prelude.split())
            prelude = ""
            if header.startswith("@"):
                context.append(header)
                index += 1
                continue
            close = source.index("}", index)
            declarations: dict[str, str] = {}
            for declaration in source[index + 1:close].split(";"):
                if ":" in declaration:
                    name, value = declaration.split(":", 1)
                    declarations[name.strip()] = " ".join(value.split())
            selectors = tuple(" ".join(part.split()) for part in header.split(","))
            rules.append((tuple(context), selectors, declarations))
            index = close + 1
            continue
        if char == "}":
            if not context:
                raise AssertionError("unbalanced CSS block")
            context.pop()
            prelude = ""
        else:
            prelude += char
        index += 1
    if context:
        raise AssertionError(f"unclosed CSS at-rule(s): {context}")
    return rules


def declarations_for(rules, selector: str, context: tuple[str, ...] = ()) -> dict[str, str]:
    merged: dict[str, str] = {}
    for rule_context, selectors, declarations in rules:
        if rule_context == context and selector in selectors:
            merged.update(declarations)
    return merged


def pixel_value(value: str) -> int:
    match = re.fullmatch(r"(\d+)px", value)
    if not match:
        raise AssertionError(f"expected a pixel length, got {value!r}")
    return int(match.group(1))


def shipped_contrast_pairs(w4_css: str, shared_css: str) -> list[tuple[str, str, str]]:
    """Derive checkpoint foreground/background pairs from the shipped light and dark tokens."""
    w4_rules = parse_css_rules(w4_css)
    shared_rules = parse_css_rules(shared_css)
    themes = {
        "light": (declarations_for(w4_rules, ".ix-checkpoint"), declarations_for(shared_rules, ":root")),
        "dark": (
            declarations_for(w4_rules, 'html[data-theme="dark"] .ix-checkpoint'),
            declarations_for(shared_rules, 'html[data-theme="dark"]'),
        ),
    }
    pairs: list[tuple[str, str, str]] = []
    for theme, (tokens, surfaces) in themes.items():
        foregrounds = [name for name in tokens if name.startswith("--cp-") and name not in {"--cp-disabled-bg", "--cp-disabled-line"}]
        if len(foregrounds) < 6:
            raise AssertionError(f"{theme} checkpoint palette is incomplete: {sorted(tokens)}")
        for surface in ("--surface", "--surface-2"):
            for name in foregrounds:
                pairs.append((f"{theme} {name} on {surface}", tokens[name], surfaces[surface]))
        for name in ("--cp-disabled-fg", "--cp-good"):
            pairs.append((f"{theme} {name} on --cp-disabled-bg", tokens[name], tokens["--cp-disabled-bg"]))
    dark_cta = declarations_for(w4_rules, 'html[data-theme="dark"] .code-cta')
    light_cta = declarations_for(w4_rules, ".code-cta")
    pairs.append(("light .code-cta on --surface", light_cta["color"], themes["light"][1]["--surface"]))
    pairs.append(("dark .code-cta", dark_cta["color"], dark_cta["background"]))
    return pairs


def channel(value: int) -> float:
    component = value / 255
    return component / 12.92 if component <= 0.04045 else ((component + 0.055) / 1.055) ** 2.4


def contrast(foreground: str, background: str) -> float:
    def luminance(color: str) -> float:
        raw = color.lstrip("#")
        red, green, blue = (int(raw[index:index + 2], 16) for index in (0, 2, 4))
        return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)

    first, second = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (first + 0.05) / (second + 0.05)


def validate_contrast_palette(pairs: list[tuple[str, str, str]]) -> None:
    for label, foreground, background in pairs:
        if contrast(foreground, background) < 4.5:
            raise AssertionError(f"contrast below 4.5:1 for {label}: {foreground} on {background}")


def validate_responsive_motion_css(source: str) -> None:
    if "@media (max-width: 420px)" not in source:
        raise AssertionError("missing narrow-layout breakpoint")
    if "@media (prefers-reduced-motion: reduce)" not in source:
        raise AssertionError("missing reduced-motion contract")
    for value in re.findall(r"min-width\s*:\s*(\d+)px", source):
        if int(value) > 350:
            raise AssertionError(f"fixed minimum width can overflow exact 390 layout: {value}px")
    for property_name, value in re.findall(r"\b(animation|transition)\s*:\s*([^;]+);", source):
        if "none" not in value:
            raise AssertionError(f"motion must not be required: {property_name}: {value}")


class WeekFourMajorRefreshTests(unittest.TestCase):
    def test_each_day_publishes_one_inert_read_only_worked_example(self) -> None:
        self.assertEqual(5, len(W4_PAGES))
        python_examples = 0
        cypher_examples = 0
        for path in W4_PAGES:
            with self.subTest(page=path.name):
                page = ParsedPage(path)
                buttons = page.root.find_all("button", "code-cta")
                modals = page.root.find_all("div", "code-modal")
                viewers = page.root.find_all("div", "cv")
                raw_blocks = page.root.find_all("pre", "cv-raw")
                self.assertEqual(1, len(buttons))
                self.assertEqual(1, len(modals))
                self.assertEqual(1, len(viewers))
                self.assertEqual(1, len(raw_blocks))
                self.assertEqual("dialog", buttons[0].attrs.get("aria-haspopup"))
                target_id = buttons[0].attrs.get("data-modal")
                overlays = [node for node in page.root.find_all("div", "modal-overlay") if node.attrs.get("id") == target_id]
                self.assertEqual(1, len(overlays))
                self.assertEqual(1, len(modals[0].find_all("button", "modal-close")))
                self.assertIn("Read-only", " ".join(modals[0].text().split()))
                self.assertIn("synthetic", modals[0].text().lower())
                self.assertEqual(1, len([script for script in page.root.find_all("script") if "codeviewer.js?v=20260925-w4" in (script.attrs.get("src") or "")]))
                self.assertEqual(1, len([link for link in page.root.find_all("link") if "w4-major-refresh.css" in (link.attrs.get("href") or "")]))

                code, language = published_example(path)
                if language == "python":
                    python_examples += 1
                    validate_python_example(code)
                else:
                    cypher_examples += 1
                    validate_tenant_safe_cypher(code)
        self.assertEqual(4, python_examples)
        self.assertEqual(1, cypher_examples)

    def test_single_file_viewer_is_a_label_and_close_target_is_44px(self) -> None:
        probe = r"""
const fs = require('fs');
const vm = require('vm');
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
function node(extra) {
  const listeners = {};
  return Object.assign({
    dataset: {}, innerHTML: '', textContent: '',
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    click() { (listeners.click || []).forEach(fn => fn({ type: 'click' })); },
  }, extra);
}
const viewers = cases.map(files => {
  const raws = files.map(file => node({ dataset: { file: file.file, lang: file.lang }, textContent: file.code }));
  const viewer = node({ tabs: [], body: node() });
  viewer.querySelectorAll = selector => {
    if (selector === '.cv-raw') return raws;
    if (selector === '.cv-tab') {
      viewer.tabs = [...viewer.innerHTML.matchAll(/<button[^>]*class="cv-tab([^"]*)"[^>]*data-i="(\d+)"/g)].map(match => {
        const classes = new Set(['cv-tab', ...match[1].split(' ').filter(Boolean)]);
        return node({ dataset: { i: match[2] }, classes, classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name) } });
      });
      return viewer.tabs;
    }
    return [];
  };
  viewer.querySelector = selector => selector === '.cv-body' ? viewer.body : null;
  return viewer;
});
const ready = [];
const document = {
  addEventListener: (type, fn) => type === 'DOMContentLoaded' && ready.push(fn),
  querySelectorAll: selector => selector === '.cv' ? viewers : [],
};
vm.runInNewContext(fs.readFileSync(process.argv[1], 'utf8'), { document }, { filename: 'codeviewer.js', timeout: 1000 });
ready.forEach(fn => fn());
process.stdout.write(JSON.stringify(viewers.map(viewer => {
  const before = viewer.innerHTML;
  const last = viewer.tabs[viewer.tabs.length - 1];
  if (last) last.click();
  return {
    html: before,
    switchedBody: last ? viewer.body.innerHTML : null,
    active: viewer.tabs.map(tab => tab.classes.has('on')),
  };
})));
"""
        cases = []
        for path in W4_PAGES:
            code, language = published_example(path)
            cases.append([{"file": path.stem + ".example", "lang": language, "code": code}])
        cases.append([
            {"file": "first.py", "lang": "python", "code": "first_value = 1"},
            {"file": "second.py", "lang": "python", "code": "second_value = 2"},
        ])
        result = subprocess.run(
            ["node", "-e", probe, str(CODEVIEWER)], input=json.dumps(cases), text=True, capture_output=True, check=True, timeout=3
        )
        rendered = json.loads(result.stdout)

        def tabs_of(html: str) -> list[Element]:
            parser = CurriculumHTMLParser()
            parser.feed(html)
            parser.close()
            return parser.root.find_all(class_name="cv-tab")

        for path, output in zip(W4_PAGES, rendered[:-1]):
            with self.subTest(page=path.name):
                tabs = tabs_of(output["html"])
                self.assertEqual(1, len(tabs))
                self.assertNotEqual("button", tabs[0].tag)
                self.assertIn("cv-file-label", tabs[0].attrs["class"].split())
                self.assertEqual(path.stem + ".example", tabs[0].text())
                self.assertEqual([], output["active"])

        multi = rendered[-1]
        tabs = tabs_of(multi["html"])
        self.assertEqual(["button", "button"], [tab.tag for tab in tabs])
        self.assertEqual(["button", "button"], [tab.attrs.get("type") for tab in tabs])
        self.assertEqual(["first.py", "second.py"], [tab.text() for tab in tabs])
        self.assertFalse(any("cv-file-label" in tab.attrs["class"].split() for tab in tabs))
        self.assertIn("second_value", multi["switchedBody"])
        self.assertEqual([False, True], multi["active"])

        rules = parse_css_rules(W4_CSS.read_text(encoding="utf-8"))
        close = declarations_for(rules, ".code-modal .modal-close")
        for prop in ("width", "min-width", "height", "min-height"):
            with self.subTest(prop=prop):
                self.assertGreaterEqual(pixel_value(close[prop]), 44)
        for context, selectors, declarations in rules:
            if ".code-modal .modal-close" in selectors and context:
                for prop in ("width", "min-width", "height", "min-height"):
                    if prop in declarations:
                        self.assertGreaterEqual(pixel_value(declarations[prop]), 44, (context, prop))

    def test_quizzes_and_embedded_javascript_are_executable_and_current(self) -> None:
        probe = r"""
const vm = require('vm');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => source += chunk);
process.stdin.on('end', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'w4-published-inline.js' });
  process.stdout.write(JSON.stringify({ captions: sandbox.window.DIAGRAM?.captions?.length || 0, quiz: sandbox.window.QUIZ || null }));
});
"""
        retired_model = re.compile(r"\bo3(?:-[\w.-]+)?\b|\bgpt-5(?:[\w.-]+)?\b", re.IGNORECASE)
        for path in W4_PAGES:
            with self.subTest(page=path.name):
                page = ParsedPage(path)
                result = subprocess.run(["node", "-e", probe], input=page.embedded_javascript, text=True, capture_output=True, check=True, timeout=3)
                contract = json.loads(result.stdout)
                self.assertGreater(contract["captions"], 0)
                self.assertEqual(6, len(contract["quiz"]["questions"]))
                self.assertIsNone(retired_model.search(json.dumps(contract["quiz"])))
                for question in contract["quiz"]["questions"]:
                    if isinstance(question.get("answer"), int) and question.get("options"):
                        self.assertIn(question["answer"], range(len(question["options"])))

    def test_utc_provenance_is_truthful_and_not_future_dated(self) -> None:
        self.assertLessEqual(EVIDENCE_DATE, datetime.now(timezone.utc).date())
        utc_today = datetime.now(timezone.utc).date()
        for path in [*W4_RESEARCH, *W4_PAGES]:
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=path):
                for match in re.finditer(r"2026-09-25", text):
                    self.assertEqual(" UTC", text[match.end():match.end() + 4], "evidence date must declare its UTC basis")
                declared_utc_dates = [date.fromisoformat(value) for value in re.findall(r"(\d{4}-\d{2}-\d{2}) UTC", text)]
                self.assertTrue(declared_utc_dates or "2026-09-25" not in text)
                self.assertTrue(all(access_date <= utc_today for access_date in declared_utc_dates))
        day3 = (ROOT / "weeks" / "w04" / "w04d3.html").read_text(encoding="utf-8")
        self.assertIn("rechecked September&nbsp;25,&nbsp;2026 UTC", day3)
        self.assertIn("Agent Framework\n        version remains a June snapshot", day3)

    def test_current_w4d4_research_and_tenant_safe_fixture(self) -> None:
        research = (ROOT / "docs" / "research" / "w04" / "w04d4.md").read_text(encoding="utf-8")
        self.assertIn("https://neo4j.com/docs/cypher-manual/25/clauses/search/", research)
        self.assertIn("filterable_properties", research)
        self.assertIn("2026-09-25 UTC", research)

        incidents = [
            {"id": "B-1", "tenant": "B", "distance": 0.01},
            {"id": "B-2", "tenant": "B", "distance": 0.02},
            {"id": "B-3", "tenant": "B", "distance": 0.03},
            {"id": "A-1", "tenant": "A", "distance": 0.04},
            {"id": "A-2", "tenant": "A", "distance": 0.05},
        ]
        unsafe = [row for row in sorted(incidents, key=lambda row: row["distance"])[:3] if row["tenant"] == "A"]
        safe = sorted((row for row in incidents if row["tenant"] == "A"), key=lambda row: row["distance"])[:3]
        self.assertEqual([], unsafe, "global top-k then tenant filtering loses valid same-tenant hits")
        self.assertEqual(["A-1", "A-2"], [row["id"] for row in safe], "in-search filtering preserves same-tenant recall")

        systems = [{"id": "SYS-A", "tenant": "A"}, {"id": "SYS-B", "tenant": "B"}]
        teams = [{"id": "TEAM-A", "tenant": "A"}, {"id": "TEAM-B", "tenant": "B"}]
        edges = [("A-1", "SYS-A", "TEAM-A"), ("A-1", "SYS-B", "TEAM-B")]
        isolated = [
            edge for edge in edges
            if next(row for row in systems if row["id"] == edge[1])["tenant"] == "A"
            and next(row for row in teams if row["id"] == edge[2])["tenant"] == "A"
        ]
        self.assertEqual([("A-1", "SYS-A", "TEAM-A")], isolated)

    def test_python_and_cypher_safety_mutations_are_rejected(self) -> None:
        for path in W4_PAGES:
            code, language = published_example(path)
            if language == "python":
                validate_python_example(code)
        mutations = {
            "environment read": "import os\nprint(os.environ['PR19_SENTINEL'])",
            "infinite loop": "while True:\n    pass",
            "storage write": "open('leak.txt', 'w').write('x')",
            "network import": "import socket\nsocket.socket()",
        }
        for label, mutation in mutations.items():
            with self.subTest(mutation=label), self.assertRaises(AssertionError):
                validate_python_example(mutation)

        cypher, _ = published_example(ROOT / "weeks" / "w04" / "w04d4.html")
        validate_tenant_safe_cypher(cypher)
        for mutation in (
            cypher + "\nCALL { CREATE (n:Leaked) RETURN n }",
            cypher + "\nCALL apoc.create.node(['Leaked'], {}) YIELD node RETURN node",
            cypher.replace("WHERE incident.tenantId = $tenant_id\n    LIMIT", "LIMIT"),
            cypher.replace("(system:System {tenantId: $tenant_id})", "(system:System)"),
        ):
            with self.assertRaises(AssertionError):
                validate_tenant_safe_cypher(mutation)

    def test_w4d3_owner_check_survives_optimized_python(self) -> None:
        source, _ = published_example(ROOT / "weeks" / "w04" / "w04d3.html")
        validate_python_example(source)
        self.assertIn("raise ValueError", source)
        self.assertNotIn("assert len(eligible)", source)
        harness = textwrap.dedent(
            """
            def check_case(label, capabilities):
                global CAPABILITIES
                CAPABILITIES = capabilities
                try:
                    result = bounded_manager_route("publish")
                    print(label + ":owner:" + result)
                except ValueError:
                    print(label + ":ValueError")

            check_case("zero", {"researcher": {"extract"}})
            check_case("one", {"manager": {"publish"}})
            check_case("multiple", {"manager": {"publish"}, "backup": {"publish"}})
            """
        )
        for optimized in (False, True):
            with self.subTest(optimized=optimized):
                result = isolated_python(source + "\n" + harness, optimized=optimized)
                self.assertEqual(0, result.returncode, result.stderr)
                self.assertEqual(["zero:ValueError", "one:owner:manager", "multiple:ValueError"], result.stdout.splitlines())
        with self.assertRaises(subprocess.TimeoutExpired):
            isolated_python("while True:\n    pass", timeout=0.2)

    def test_crash_resume_requires_prediction_and_matches_fixture(self) -> None:
        probe = r"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(process.argv[1], 'utf8');
const sideEffects = [];
const deny = name => () => { sideEffects.push(name); throw new Error(name); };
const storage = { getItem: deny('storage.get'), setItem: deny('storage.set'), removeItem: deny('storage.remove') };
const sandbox = {
  module: { exports: {} }, exports: {}, globalThis: {}, fetch: deny('fetch'),
  XMLHttpRequest: deny('XMLHttpRequest'), WebSocket: deny('WebSocket'), EventSource: deny('EventSource'),
  localStorage: storage, sessionStorage: storage, indexedDB: { open: deny('indexedDB') }, console
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'interactive-w4-checkpoint.js', timeout: 1000 });
const machine = sandbox.module.exports.createMachine();
const log = [];
const take = (label, result) => log.push({ label, ok: result.ok, kind: result.kind || null, reason: result.reason || '', state: result.state });
take('resume-too-early', machine.resume());
take('crash-too-early', machine.crash());
take('step-1', machine.step());
take('step-2', machine.step());
take('step-at-boundary', machine.step());
take('crash', machine.crash());
take('resume-before-prediction', machine.resume());
take('partial', machine.submitPrediction({ checkpoint: 'cp-2' }));
take('wrong', machine.submitPrediction({ checkpoint: 'cp-1', skipped: 'none', replayed: 'write_ledger', executionCount: '1' }));
take('correct', machine.submitPrediction({ checkpoint: 'cp-2', skipped: 'validate_request,load_order', replayed: 'calculate_refund', executionCount: '2' }));
take('resume', machine.resume());
take('replay', machine.step());
take('step-4', machine.step());
take('complete', machine.step());
const reset = machine.reset();
process.stdout.write(JSON.stringify({ log, reset, sideEffects }));
"""
        result = subprocess.run(["node", "-e", probe, str(SIMULATOR)], text=True, capture_output=True, check=True, timeout=3)
        contract = json.loads(result.stdout)
        log = {entry["label"]: entry for entry in contract["log"]}
        for label in ("resume-too-early", "crash-too-early", "step-at-boundary", "resume-before-prediction"):
            self.assertFalse(log[label]["ok"], label)
        self.assertEqual("partial", log["partial"]["kind"])
        self.assertFalse(log["partial"]["state"]["prediction"]["checked"])
        self.assertEqual("incorrect", log["wrong"]["kind"])
        self.assertEqual(1, log["wrong"]["state"]["prediction"]["attempts"])
        self.assertEqual({"incorrect"}, {item["status"] for item in log["wrong"]["state"]["prediction"]["feedback"]})
        self.assertTrue(log["correct"]["ok"])
        self.assertTrue(log["correct"]["state"]["canResume"])
        self.assertEqual(2, log["correct"]["state"]["prediction"]["attempts"])
        self.assertEqual(["validate_request", "load_order"], log["resume"]["state"]["skipped"])
        self.assertEqual(["calculate_refund"], log["resume"]["state"]["replayQueue"])
        calculate = next(node for node in log["replay"]["state"]["nodes"] if node["id"] == "calculate_refund")
        self.assertEqual(2, calculate["executionCount"])
        self.assertEqual("complete", log["complete"]["state"]["phase"])
        self.assertEqual("embedded synthetic fixture", log["complete"]["state"]["dataSource"])
        self.assertEqual("ready", contract["reset"]["phase"])
        self.assertFalse(contract["reset"]["prediction"]["checked"])
        self.assertEqual([], contract["sideEffects"])

    def run_trapped_mount(self, appended_source: str = "") -> list[str]:
        probe = r"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(process.argv[1], 'utf8') + process.argv[2];
const sideEffects = [];
const trap = name => () => { sideEffects.push(name); throw new Error('blocked ' + name); };
const ready = [];
const document = {
  activeElement: null,
  addEventListener: (type, fn) => type === 'DOMContentLoaded' && ready.push(fn),
  querySelectorAll: selector => selector === '[data-checkpoint-sim]' ? [container] : [],
};
Object.defineProperty(document, 'cookie', { get: trap('document.cookie:get'), set: trap('document.cookie:set') });
const navigator = {};
Object.defineProperty(navigator, 'sendBeacon', { get: trap('navigator.sendBeacon') });
function el(extra) {
  const listeners = {};
  return Object.assign({
    dataset: {}, disabled: false, hidden: false, innerHTML: '', textContent: '', className: '', value: '', name: '',
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach(fn => fn(event)); return true; },
    focus() { document.activeElement = this; },
    fire(type, props) {
      const event = Object.assign({ type, preventDefault() {} }, props);
      this.dispatchEvent(event); return event;
    },
  }, extra);
}
const buttons = ['step', 'crash', 'resume', 'reset'].map(action => { const button = el(); button.dataset.cpAction = action; return button; });
const selects = ['checkpoint', 'skipped', 'replayed', 'executionCount'].map(name => el({ name }));
const check = el();
const feedback = el();
const prediction = el({
  querySelectorAll: selector => selector === 'select' ? selects : [],
  querySelector: selector => selector === '[data-cp-check]' ? check : feedback,
});
const statusSpan = el();
const parts = {
  '.cp-graph': el(), '.cp-status': el({ querySelector: () => statusSpan }), '.cp-checkpoint': el(),
  '[data-cp-skipped]': el(), '[data-cp-replayed]': el(), '.cp-log ol': el(), '[data-cp-predict]': prediction,
};
const container = el({ querySelectorAll: () => buttons, querySelector: selector => parts[selector] });
const sandbox = { module: { exports: {} }, document, navigator, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB']) {
  Object.defineProperty(sandbox, name, { get: trap(name) });
}
let phases = [];
try {
  vm.runInNewContext(source, sandbox, { filename: 'interactive-w4-checkpoint.js', timeout: 1000 });
  ready.forEach(fn => fn());
  container.addEventListener('w4checkpoint:change', event => phases.push(event.detail.phase));
  const [step, crash, resume, reset] = buttons;
  step.fire('click'); step.fire('click'); crash.fire('click');
  selects[0].value = 'cp-1'; prediction.fire('submit');
  selects[0].value = 'cp-2'; selects[1].value = 'validate_request,load_order';
  selects[2].value = 'calculate_refund'; selects[3].value = '2'; prediction.fire('submit');
  resume.fire('click'); step.fire('click'); step.fire('click'); step.fire('click');
  container.fire('keydown', { altKey: true, ctrlKey: false, metaKey: false, code: 'Digit0' });
  reset.fire('click');
} catch (error) {
  if (!sideEffects.length) throw error;
}
process.stdout.write(JSON.stringify({ sideEffects, mounted: container.dataset.checkpointMounted === 'true', phases }));
"""
        result = subprocess.run(
            ["node", "-e", probe, str(SIMULATOR), appended_source], text=True, capture_output=True, check=True, timeout=3
        )
        return json.loads(result.stdout)

    def test_mounted_simulator_has_no_storage_or_network_side_effects(self) -> None:
        clean = self.run_trapped_mount()
        self.assertTrue(clean["mounted"])
        self.assertIn("crashed", clean["phases"])
        self.assertIn("complete", clean["phases"])
        self.assertEqual("ready", clean["phases"][-1])
        self.assertEqual([], clean["sideEffects"])
        for mutation, expected in (
            ("\nfetch('/leak');", "fetch"),
            ("\nlocalStorage.setItem('checkpoint', 'x');", "localStorage"),
            ("\nsessionStorage.getItem('checkpoint');", "sessionStorage"),
            ("\nnavigator.sendBeacon('/leak', 'x');", "navigator.sendBeacon"),
            ("\ndocument.cookie = 'x=y';", "document.cookie:set"),
            ("\ndocument.addEventListener('DOMContentLoaded', () => document.cookie);", "document.cookie:get"),
        ):
            with self.subTest(mutation=expected):
                self.assertIn(expected, self.run_trapped_mount(mutation)["sideEffects"])

    def test_w4d2_mounted_simulator_handles_prediction_keyboard_focus_and_reset(self) -> None:
        page = ParsedPage(ROOT / "weeks" / "w04" / "w04d2.html")
        roots = [node for node in page.root.find_all("div", "ix-checkpoint") if "data-checkpoint-sim" in node.attrs]
        self.assertEqual(1, len(roots))
        self.assertEqual("0", roots[0].attrs.get("tabindex"))
        self.assertEqual("group", roots[0].attrs.get("role"))

        probe = r"""
const api = require(process.argv[1]);
const doc = { activeElement: null };
function el(extra) {
  const listeners = {};
  return Object.assign({
    dataset: {}, disabled: false, hidden: false, innerHTML: '', textContent: '', className: '', value: '', name: '',
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach(fn => fn(event)); return true; },
    focus() { doc.activeElement = this; },
    fire(type, props) {
      const event = Object.assign({ type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, props);
      this.dispatchEvent(event); return event;
    },
  }, extra);
}
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const buttons = ['step', 'crash', 'resume', 'reset'].map(action => { const button = el(); button.dataset.cpAction = action; return button; });
const selects = ['checkpoint', 'skipped', 'replayed', 'executionCount'].map(name => el({ name }));
const check = el();
const feedback = el();
const prediction = el({
  querySelectorAll: selector => selector === 'select' ? selects : [],
  querySelector: selector => selector === '[data-cp-check]' ? check : feedback,
});
const statusSpan = el();
const parts = {
  '.cp-graph': el(), '.cp-status': el({ querySelector: () => statusSpan }), '.cp-checkpoint': el(),
  '[data-cp-skipped]': el(), '[data-cp-replayed]': el(), '.cp-log ol': el(), '[data-cp-predict]': prediction,
};
const container = el({ querySelectorAll: () => buttons, querySelector: selector => parts[selector] });
let view = null;
container.addEventListener('w4checkpoint:change', event => { view = event.detail; });
const [step, crash, resume, reset] = buttons;
const name = node => node ? (node.dataset.cpAction || node.name || (node === check ? 'check' : 'other')) : null;
const record = (label, event) => ({
  label, phase: view.phase, checkpoint: view.checkpoint, focus: name(doc.activeElement), canResume: view.canResume,
  prediction: view.prediction, status: parts['.cp-status'].innerHTML, feedbackHtml: feedback.innerHTML,
  disabled: { step: step.disabled, crash: crash.disabled, resume: resume.disabled }, prevented: event ? event.defaultPrevented : null,
});
api.mount(container);
const log = [record('mounted')];
const alt = (key, code) => container.fire('keydown', { altKey: true, ctrlKey: false, metaKey: false, key, code });
log.push(record('alt-s', alt('ß', 'KeyS')));
step.fire('click');
log.push(record('boundary'));
log.push(record('alt-c', alt('ç', 'KeyC')));
log.push(record('blocked-alt-r', alt('®', 'KeyR')));
selects[0].value = 'cp-2';
prediction.fire('submit');
log.push(record('partial'));
selects[1].value = 'none'; selects[2].value = 'write_ledger'; selects[3].value = '1';
prediction.fire('submit');
log.push(record('wrong'));
selects[1].value = 'validate_request,load_order'; selects[2].value = 'calculate_refund'; selects[3].value = '2';
prediction.fire('submit');
log.push(record('correct'));
log.push(record('alt-r', alt('®', 'KeyR')));
step.fire('click'); step.fire('click'); step.fire('click');
log.push(record('complete'));
log.push(record('alt-0', alt('º', 'Digit0')));
log.push(record('plain-s', container.fire('keydown', { altKey: false, key: 's', code: 'KeyS' })));
process.stdout.write(JSON.stringify(log));
"""
        result = subprocess.run(["node", "-e", probe, str(SIMULATOR)], text=True, capture_output=True, check=True, timeout=3)
        log = {entry["label"]: entry for entry in json.loads(result.stdout)}
        self.assertEqual(1, log["alt-s"]["checkpoint"])
        self.assertEqual("crash", log["boundary"]["focus"])
        self.assertEqual("checkpoint", log["alt-c"]["focus"])
        self.assertFalse(log["alt-c"]["canResume"])
        self.assertEqual("crashed", log["blocked-alt-r"]["phase"])
        self.assertTrue(log["blocked-alt-r"]["prevented"])
        self.assertEqual("skipped", log["partial"]["focus"])
        self.assertEqual("incorrect", log["wrong"]["prediction"]["feedback"][1]["status"])
        rules = parse_css_rules(W4_CSS.read_text(encoding="utf-8"))
        expected_colors = {"missing": "var(--cp-bad)", "incorrect": "var(--cp-bad)", "correct": "var(--cp-good)"}
        for label in ("partial", "wrong", "correct"):
            parser = CurriculumHTMLParser()
            parser.feed(log[label]["feedbackHtml"])
            parser.close()
            items = parser.root.find_all("li")
            self.assertEqual(4, len(items), label)
            for item in items:
                status = item.attrs["class"].removeprefix("is-")
                color = declarations_for(rules, f".cp-predict-feedback .{item.attrs['class']}").get("color")
                with self.subTest(label=label, status=status):
                    self.assertEqual(expected_colors[status], color)
        self.assertEqual("resume", log["correct"]["focus"])
        self.assertTrue(log["correct"]["canResume"])
        self.assertEqual("resumed", log["alt-r"]["phase"])
        self.assertEqual("step", log["alt-r"]["focus"])
        self.assertEqual("complete", log["complete"]["phase"])
        self.assertEqual("reset", log["complete"]["focus"])
        self.assertEqual("ready", log["alt-0"]["phase"])
        self.assertEqual("step", log["alt-0"]["focus"])
        self.assertFalse(log["plain-s"]["prevented"])

    def test_contrast_responsive_and_reduced_motion_guards_reject_mutations(self) -> None:
        css = W4_CSS.read_text(encoding="utf-8")
        validate_responsive_motion_css(css)
        shared_css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
        pairs = shipped_contrast_pairs(css, shared_css)
        self.assertGreaterEqual(len(pairs), 30)
        validate_contrast_palette(pairs)
        with self.assertRaises(AssertionError):
            validate_contrast_palette(shipped_contrast_pairs(css.replace("--cp-muted: #d7dce4;", "--cp-muted: #69707b;"), shared_css))
        with self.assertRaises(AssertionError):
            validate_contrast_palette([("dark muted mutation", "#69707b", "#1d2027")])
        with self.assertRaises(AssertionError):
            validate_responsive_motion_css(css + "\n.cp-mutation { min-width: 600px; }")
        with self.assertRaises(AssertionError):
            validate_responsive_motion_css(css + "\n.cp-mutation { transition: opacity .2s; }")

    def test_w4d2_replaces_one_placeholder_with_the_real_simulator(self) -> None:
        counts: dict[str, int] = {}
        for path in W4_PAGES:
            page = ParsedPage(path)
            counts[path.name] = len(page.root.find_all("div", "ix-future"))
        self.assertEqual(2, counts["w04d2.html"])
        self.assertEqual(14, sum(counts.values()))
        self.assertEqual(1, len(ParsedPage(ROOT / "weeks" / "w04" / "w04d2.html").root.find_all("div", "ix-checkpoint")))


if __name__ == "__main__":
    unittest.main()
