"""Learning-experience regression contract (2026-10-30 correction).

Pins the four regression classes diagnosed in
docs/research/learning-experience-correction/diagnosis.md so green technical
gates can no longer mask them:

1. Every required day route carries at least two substantive interactions of
   at least two distinct kinds (state/output/evidence-changing practice, not
   MCQ checks alone), including on the committed no-JS path for shell routes.
2. Archify visuals are contextual support: never the first content a learner
   meets. Shell routes keep the SVG in an inert <template>; static routes
   place it after real lesson content.
3. Every required route carries static program -> week -> day orientation
   (crumbs, day position, previous/next) that works without JavaScript.
4. The only active client personas are the two new brownfields: Juniper Vale
   Mutual Loss Desk (Weeks 1-5) and Morrowfield Payment Control (Weeks 6-10).
   Retired Riverbend/Meridian material may surface only as the legacy-state
   disclosure for stored learner-authored v1 history.
"""

from __future__ import annotations

import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEKS_DIR = ROOT / "weeks"

# Substantive interaction affordances: each changes or inspects state, output,
# or evidence and returns explanatory feedback. MCQ comprehension checks and
# placeholder panels (ix-future) deliberately do not count.
WIDGET_CLASSES = (
    "ix-predict", "ix-spot", "ix-tokens", "ix-temp", "ix-cost", "ix-retry",
    "ix-run", "ix-agent", "ix-cloud", "ix-chunk", "ix-sim", "ix-retrieve",
    "ix-dims", "ix-precision", "ix-faith", "ix-ragas", "ix-compress",
    "ix-consent", "ix-frameworks", "ix-handoff", "ix-mcp", "ix-paging",
    "ix-sub", "ix-transport", "ix-checkpoint",
)
WIDGET_RE = re.compile(r'class="(' + "|".join(WIDGET_CLASSES) + r')[" ]')
ACTIVITY_MOUNT_RE = re.compile(r'data-activity="([a-z-]+)"')
FALLBACK_ACTIVITY_RE = re.compile(r'data-activity-fallback="([a-z-]+)"')

INSURANCE_PROJECT = "Juniper Vale Mutual"
PAYMENTS_PROJECT = "Morrowfield Payment Control"
RETIRED_PERSONAS = re.compile(r"Riverbend|Meridian")


def node_json(script: str):
    result = subprocess.run(
        ["node", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout)


def required_pages():
    """The 50 required day routes, from the authoritative curriculum map's
    pages() index.

    Week 1's former a/b part pages remain on disk only as moved-lesson alias
    stubs for old deep links; they are not day routes."""
    hrefs = node_json(
        "const map = require('./assets/js/curriculum-map.js');"
        "console.log(JSON.stringify(map.pages().map((page) => page.href)));"
    )
    return [ROOT / href for href in hrefs]


def week_number(path: Path) -> int:
    return int(path.parent.name[1:])


def is_shell(html: str) -> bool:
    return 'id="lesson-root"' in html


def noscript_block(html: str) -> str:
    match = re.search(r"<noscript>[\s\S]*?</noscript>", html)
    return match.group(0) if match else ""


class InteractionDepth(unittest.TestCase):
    """Class 1: >=2 substantive interactions of >=2 kinds on every route."""

    def test_pages_discovered(self):
        pages = required_pages()
        self.assertEqual(len(pages), 50, sorted(p.name for p in pages))
        for page in pages:
            self.assertTrue(page.is_file(), page)

    def test_every_route_has_two_varied_interactions(self):
        failures = []
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            kinds = [m.group(1) for m in WIDGET_RE.finditer(html)]
            kinds += ACTIVITY_MOUNT_RE.findall(html)
            if is_shell(html):
                kinds += FALLBACK_ACTIVITY_RE.findall(noscript_block(html))
            if len(kinds) < 2 or len(set(kinds)) < 2:
                failures.append(
                    f"{page.relative_to(ROOT)}: {len(kinds)} interactions "
                    f"({sorted(set(kinds))})"
                )
        self.assertEqual(failures, [])

    def test_shell_no_js_path_keeps_two_activities(self):
        """The committed no-JS article must carry the practice, not only the
        JS renderer: at least two distinct activity fallbacks per shell."""
        failures = []
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            if not is_shell(html):
                continue
            kinds = set(FALLBACK_ACTIVITY_RE.findall(noscript_block(html)))
            if len(kinds) < 2:
                failures.append(f"{page.relative_to(ROOT)}: {sorted(kinds)}")
        self.assertEqual(failures, [])

    def test_no_placeholder_interactions_remain(self):
        offenders = [
            str(p.relative_to(ROOT))
            for p in required_pages()
            if 'class="ix-future"' in p.read_text(encoding="utf-8")
        ]
        self.assertEqual(offenders, [])


class ArchifyContextual(unittest.TestCase):
    """Class 2: the Archify visual supports the lesson, it never leads it."""

    def test_shell_visuals_are_inert_templates(self):
        failures = []
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            if not is_shell(html) or "data-archify-visual" not in html:
                continue
            for match in re.finditer(r"data-archify-visual", html):
                before = html[: match.start()]
                opens = len(re.findall(r"<template\b", before))
                closes = len(re.findall(r"</template>", before))
                if opens <= closes:
                    failures.append(
                        f"{page.relative_to(ROOT)}: visual outside <template>"
                    )
                    break
        self.assertEqual(failures, [])

    def test_static_visuals_follow_lesson_content(self):
        failures = []
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            if is_shell(html) or "data-archify-visual" not in html:
                continue
            visual_at = html.index("data-archify-visual")
            sections = [m.start() for m in re.finditer(r'<section class="step"', html)]
            if len(sections) < 2 or visual_at < sections[1]:
                failures.append(
                    f"{page.relative_to(ROOT)}: visual precedes lesson content"
                )
        self.assertEqual(failures, [])


class ProgramOrientation(unittest.TestCase):
    """Class 3: static program -> week -> day wayfinding on all 53 routes."""

    def test_every_route_has_static_crumbs(self):
        failures = []
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            crumbs = re.search(
                r'<nav class="lesson-crumbs"[\s\S]*?</nav>', html
            )
            if not crumbs:
                failures.append(f"{page.relative_to(ROOT)}: no lesson-crumbs nav")
                continue
            block = crumbs.group(0)
            week = week_number(page)
            checks = [
                ("hub link", 'href="../../index.html#curriculum"' in block),
                ("week label", f"Week {week}" in block),
                ("day position", 'data-day-position="' in block),
                ("next action", 'rel="next"' in block or "showcase" in block),
            ]
            if week > 1 or page.name != "d1.html":
                checks.append(("previous link", 'rel="prev"' in block))
            for name, ok in checks:
                if not ok:
                    failures.append(f"{page.relative_to(ROOT)}: missing {name}")
        self.assertEqual(failures, [])

    def test_day_positions_cover_program(self):
        positions = set()
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            match = re.search(r'data-day-position="(\d+) of 50"', html)
            if match:
                positions.add(int(match.group(1)))
        self.assertEqual(positions, set(range(1, 51)))


class PersonaBinding(unittest.TestCase):
    """Class 4: new-brownfield personas exclusively."""

    ACTIVE_SURFACES = (
        "persona-communications.html",
        "client-delivery.html",
    )

    def test_retired_personas_absent_from_week_routes(self):
        offenders = []
        for page in required_pages():
            if RETIRED_PERSONAS.search(page.read_text(encoding="utf-8")):
                offenders.append(str(page.relative_to(ROOT)))
        self.assertEqual(offenders, [])

    def test_retired_personas_absent_from_active_surfaces(self):
        offenders = []
        for rel in self.ACTIVE_SURFACES:
            text = (ROOT / rel).read_text(encoding="utf-8")
            if RETIRED_PERSONAS.search(text):
                offenders.append(rel)
        self.assertEqual(offenders, [])

    def test_persona_scenarios_are_the_two_active_engagements(self):
        """The executed fixture book exposes only the active engagements, and
        nothing it can render to a learner names a retired client."""
        book = node_json(
            "const fixtures = require('./assets/js/persona-communications-fixtures.js');"
            "console.log(JSON.stringify(fixtures));"
        )
        self.assertEqual(sorted(book["scenarios"]), ["juniper-vale", "morrowfield"])
        self.assertIsNone(RETIRED_PERSONAS.search(json.dumps(book["scenarios"])))

    def test_legacy_disclosure_requires_stored_v1_history(self):
        """Retired-scenario history keeps its honest old name only through the
        legacy-state lookup: it is detected solely by a stored v1 key for the
        same identity/scope, and active state never uses the v1 prefix."""
        probe = node_json(
            "const comms = require('./assets/js/persona-communications.js');"
            "const identity = { code: 'L-1', name: 'Learner', role: 'learner' };"
            "const store = (entries) => ({ getItem: (key) => (key in entries ? entries[key] : null) });"
            "const v2 = comms.storageKeyForIdentity(identity, 'accelerated');"
            "const v1 = comms.storageKeyForIdentity(identity, 'accelerated', 'fde_local_synthetic_persona_v1:');"
            "console.log(JSON.stringify({"
            " v2, v1,"
            " empty: comms.hasLegacyState(store({}), identity, 'accelerated'),"
            " activeOnly: comms.hasLegacyState(store({ [v2]: '{}' }), identity, 'accelerated'),"
            " legacy: comms.hasLegacyState(store({ [v1]: '{}' }), identity, 'accelerated'),"
            " otherScope: comms.hasLegacyState(store({ [v1]: '{}' }), identity, ''),"
            " noStorage: comms.hasLegacyState(null, identity, 'accelerated')"
            "}));"
        )
        self.assertNotEqual(probe["v1"], probe["v2"])
        self.assertTrue(probe["v1"].startswith("fde_local_synthetic_persona_v1:"))
        self.assertFalse(probe["v2"].startswith("fde_local_synthetic_persona_v1:"))
        self.assertFalse(probe["empty"])
        self.assertFalse(probe["activeOnly"])
        self.assertTrue(probe["legacy"])
        self.assertFalse(probe["otherScope"])
        self.assertFalse(probe["noStorage"])

    def test_week_routes_bind_to_active_projects(self):
        failures = []
        for page in required_pages():
            html = page.read_text(encoding="utf-8")
            expected = INSURANCE_PROJECT if week_number(page) <= 5 else PAYMENTS_PROJECT
            if expected not in html:
                failures.append(f"{page.relative_to(ROOT)}: missing {expected}")
        self.assertEqual(failures, [])

    def test_no_fabricated_starter_links(self):
        """Starter availability is trainer-provided/local until separately
        authorized: the new project repo identities never render as GitHub
        URLs anywhere on the learner surface."""
        pattern = re.compile(
            r"github\.com/[^\"'\s]*(fde-pc-insurance-modernization|"
            r"fde-payments-service-platform)"
        )
        offenders = []
        for path in list(ROOT.glob("*.html")) + list(WEEKS_DIR.glob("w*/*.html")) + list(
            (ROOT / "assets/js").glob("*.js")
        ):
            if pattern.search(path.read_text(encoding="utf-8")):
                offenders.append(str(path.relative_to(ROOT)))
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
