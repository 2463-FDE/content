"""Per-provider Core-30 measurement for reading pages.

This generalizes the frozen W8·D2 contract (``test_w08d2_core30.py``) to pages
that carry AWS/GCP provider blocks. The frozen constants are unchanged:

  * Required path = every word of ``article.reading-col`` except content inside
    <pre>, <script>, <button>, <svg>, elements classed ``reading-sources`` /
    ``ix-future`` / ``trifecta-auditor``, any element marked
    ``data-core="optional"``, any required-interaction mount
    (``data-core-interaction``) and — for a provider selection — any element
    whose ``data-cloud`` names the other provider.
  * Required words must fit WORD_BUDGET; the visible label for that selection
    advertises round(words / WPM) minutes, the number of required interactions,
    and the comprehension check's question count for that selection.

A selection is ``"aws"`` or ``"gcp"``. ``"both"`` is outside the guarantee.
"""

from __future__ import annotations

import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

WORD_BUDGET = 1800
WPM = 150
SELECTIONS = ("aws", "gcp")
EXCLUDED_TAGS = {"pre", "script", "button", "svg"}
EXCLUDED_CLASSES = {"reading-sources", "ix-future", "trifecta-auditor"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

# Mount classes that the shared interactive scripts turn into live widgets.
# On a Core-30 page every one of these on the required path must be the
# declared required interaction; the rest live inside optional depth.
WIDGET_MOUNT_CLASSES = {
    "ix-predict", "ix-spot", "ix-retry", "ix-mcp", "ix-transport", "ix-consent",
    "ix-handoff", "ix-frameworks", "ix-compress", "ix-paging", "ix-agent",
    "ix-retrieve", "ix-sim", "ix-dims", "ix-chunk", "ix-precision", "ix-faith",
    "ix-ragas", "ix-cloud",
}


class Element:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = dict(attrs)
        self.children: list[Element | str] = []

    def find_all(self, tag: str | None = None, attr: str | None = None) -> list["Element"]:
        found: list[Element] = []
        if (tag is None or self.tag == tag) and (attr is None or attr in self.attrs):
            found.append(self)
        for child in self.children:
            if isinstance(child, Element):
                found.extend(child.find_all(tag, attr))
        return found

    def classes(self) -> set[str]:
        return set((self.attrs.get("class") or "").split())


class _Parser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document", [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.stack.pop()

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return
        raise AssertionError(f"unmatched closing tag: {tag}")

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse(path: Path) -> Element:
    parser = _Parser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()
    if len(parser.stack) != 1:
        raise AssertionError(f"{path.name}: unclosed tags {[n.tag for n in parser.stack[1:]]}")
    return parser.root


def text_of(element: Element) -> str:
    parts: list[str] = []

    def walk(node: Element) -> None:
        for child in node.children:
            if isinstance(child, str):
                parts.append(child)
            else:
                walk(child)

    walk(element)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def raw_text(element: Element) -> str:
    """Concatenated text with whitespace preserved (for executing scripts)."""
    parts: list[str] = []

    def walk(node: Element) -> None:
        for child in node.children:
            parts.append(child) if isinstance(child, str) else walk(child)

    walk(element)
    return "".join(parts)


def other_cloud(element: Element, selection: str | None) -> bool:
    cloud = element.attrs.get("data-cloud")
    return bool(selection and cloud and cloud != selection)


def is_optional(element: Element, selection: str | None) -> bool:
    if element.tag in EXCLUDED_TAGS or element.classes() & EXCLUDED_CLASSES:
        return True
    if element.attrs.get("data-core") == "optional":
        return True
    return other_cloud(element, selection)


def reading_article(root: Element) -> Element:
    articles = [e for e in root.find_all("article") if "reading-col" in e.classes()]
    assert len(articles) == 1, "expected exactly one article.reading-col"
    return articles[0]


def required_nodes(article: Element, selection: str | None) -> list[Element]:
    """Every element reachable on the required path for this selection."""
    out: list[Element] = []

    def walk(node: Element) -> None:
        for child in node.children:
            if isinstance(child, Element) and not is_optional(child, selection):
                out.append(child)
                walk(child)

    walk(article)
    return out


def required_words(article: Element, selection: str | None) -> int:
    texts: list[str] = []

    def walk(node: Element) -> None:
        for child in node.children:
            if isinstance(child, str):
                texts.append(child)
            elif not is_optional(child, selection) and "data-core-interaction" not in child.attrs:
                walk(child)

    walk(article)
    return len(" ".join(texts).split())


def labels(article: Element) -> list[Element]:
    return [e for e in article.find_all("span") if "core30-meta" in e.classes()]


def label_for(article: Element, selection: str) -> str:
    matches = [e for e in labels(article) if e.attrs.get("data-cloud") in (selection, None)]
    assert len(matches) == 1, f"expected exactly one Core-30 label for {selection}, found {len(matches)}"
    return text_of(matches[0])


def quiz_clouds(root: Element) -> list[str | None]:
    """Execute the page's embedded scripts and return each question's cloud tag."""
    embedded = "\n".join(
        raw_text(script) for script in root.find_all("script")
        if not script.attrs.get("src") and (script.attrs.get("type") in (None, "", "text/javascript"))
    )
    probe = """
const vm = require('vm');
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => source += c);
process.stdin.on('end', () => {
  const sandbox = { window: {}, document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } } };
  vm.runInNewContext(source, sandbox, { filename: 'embedded.js' });
  const q = sandbox.window.QUIZ && sandbox.window.QUIZ.questions;
  process.stdout.write(JSON.stringify(Array.isArray(q) ? q.map(x => x.cloud || null) : null));
});
"""
    result = subprocess.run(["node", "-e", probe], input=embedded, text=True, capture_output=True, check=True)
    clouds = json.loads(result.stdout)
    assert clouds is not None, "window.QUIZ.questions missing"
    return clouds


def measure(path: Path, selection: str) -> dict:
    root = parse(path)
    article = reading_article(root)
    nodes = required_nodes(article, selection)
    interactions = [n for n in nodes if "data-core-interaction" in n.attrs]
    stray_widgets = [
        n for n in nodes
        if (n.classes() & WIDGET_MOUNT_CLASSES) and "data-core-interaction" not in n.attrs
        and not any("data-core-interaction" in a.attrs for a in _ancestors(article, n))
    ]
    clouds = quiz_clouds(root)
    return {
        "words": required_words(article, selection),
        "label": label_for(article, selection),
        "interactions": len(interactions),
        "stray_widgets": [sorted(n.classes() & WIDGET_MOUNT_CLASSES) for n in stray_widgets],
        "questions": sum(1 for c in clouds if c in (None, selection)),
    }


def _ancestors(root: Element, target: Element) -> list[Element]:
    path: list[Element] = []

    def walk(node: Element) -> bool:
        for child in node.children:
            if isinstance(child, Element):
                if child is target:
                    return True
                path.append(child)
                if walk(child):
                    return True
                path.pop()
        return False

    walk(root)
    return path


def cloud_pages() -> list[Path]:
    """Reading pages that carry provider blocks (the per-provider contract applies)."""
    pages = []
    for path in sorted((ROOT / "weeks").glob("w*/*.html")):
        root = parse(path)
        articles = [e for e in root.find_all("article") if "reading-col" in e.classes()]
        if articles and any(e.attrs.get("data-cloud") in SELECTIONS for e in articles[0].find_all(attr="data-cloud")):
            pages.append(path)
    return pages
