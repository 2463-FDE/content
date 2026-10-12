"""Prevent the Week 4–8 deferred-interactive inventory from drifting."""

from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = ROOT / "docs" / "future-interactives.md"
WEEKS = range(4, 9)


class FutureInteractiveParser(HTMLParser):
    """Collect the nearest section heading for every ix-future placeholder."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self._sections = []
        self._heading_depth = 0
        self._heading_parts = []
        self.entries = []

    def handle_starttag(self, tag, attrs):
        if tag == "section":
            self._sections.append({"heading": ""})
        elif tag == "h2" and self._sections:
            self._heading_depth = 1
            self._heading_parts = []
        elif self._heading_depth:
            self._heading_depth += 1

        classes = dict(attrs).get("class", "").split()
        if "ix-future" in classes:
            if not self._sections or not self._sections[-1]["heading"]:
                raise AssertionError(".ix-future has no enclosing section h2")
            self.entries.append(self._sections[-1]["heading"])

    def handle_endtag(self, tag):
        if self._heading_depth:
            self._heading_depth -= 1
            if not self._heading_depth:
                self._sections[-1]["heading"] = " ".join(
                    "".join(self._heading_parts).split()
                )
        if tag == "section" and self._sections:
            self._sections.pop()

    def handle_data(self, data):
        if self._heading_depth:
            self._heading_parts.append(data)


def live_inventory():
    inventory = {}
    for week in WEEKS:
        pages = sorted((ROOT / "weeks" / f"w{week:02}").glob(f"w{week:02}d*.html"))
        if len(pages) != 5:
            raise AssertionError(f"Week {week} must have five shipped day pages")
        for page in pages:
            parser = FutureInteractiveParser()
            parser.feed(page.read_text(encoding="utf-8"))
            inventory[page.stem] = parser.entries
    return inventory


def documented_inventory():
    text = DOC_PATH.read_text(encoding="utf-8")
    inventory_section = text.split("## W3–W8 current inventory", 1)[1].split(
        "### Setup, expected output", 1
    )[0]

    days = {}
    day_pattern = re.compile(
        r"^#### (w(?:04|05|06|07|08)d[1-5]) — .*? \((\d+)\)\n"
        r"(.*?)(?=^#### |^_Week |\Z)",
        re.MULTILINE | re.DOTALL,
    )
    for match in day_pattern.finditer(inventory_section):
        day, declared_count, body = match.groups()
        entries = re.findall(r"^- \*\*(.+?)\*\* — ", body, re.MULTILINE)
        days[day] = (int(declared_count), entries)

    subtotals = {
        int(week): int(count)
        for week, count in re.findall(
            r"^_Week ([4-8]) subtotal: (\d+) deferred placeholders\._$",
            inventory_section,
            re.MULTILINE,
        )
    }
    headline = int(
        re.search(
            r"shipped pages contain (\d+) `\.ix-future` placeholders across W4–W8",
            inventory_section,
        ).group(1)
    )
    total = int(
        re.search(r"\*\*Inventory total: (\d+) deferred placeholders\.\*\*", inventory_section).group(1)
    )
    return days, subtotals, headline, total


class FutureInteractiveInventoryTest(unittest.TestCase):
    def test_document_matches_shipped_week_4_through_8_placeholders(self):
        live = live_inventory()
        documented, subtotals, headline, total = documented_inventory()

        self.assertEqual(set(live), set(documented))
        live_weekly = defaultdict(int)
        for day, live_entries in live.items():
            declared_count, documented_entries = documented[day]
            self.assertEqual(declared_count, len(live_entries), day)
            self.assertEqual(documented_entries, live_entries, day)
            live_weekly[int(day[1:3])] += len(live_entries)

        self.assertEqual(subtotals, dict(live_weekly))
        live_total = sum(live_weekly.values())
        self.assertEqual(headline, live_total)
        self.assertEqual(total, live_total)
        self.assertEqual(total, sum(subtotals.values()))


if __name__ == "__main__":
    unittest.main()
