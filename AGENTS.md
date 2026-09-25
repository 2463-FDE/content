# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Curriculum authoring is research-first; follow `docs/week-fanout-plan.md` and update the matching `docs/research/wWW/` artifact before changing a current technical claim in week HTML.
- Run static curriculum regressions with `python3 -m unittest discover -s tests -v`. `tests/test_curriculum_currency.py` validates the public HTML/embedded-JS contract for the Week 3–4 currency slice.
- Run `node docs/curriculum-currency-qa.mjs` for the focused Week 1–2 model/cost/research regression checks.
- Read-only lesson code popups use `assets/js/codeviewer.js`, shared modal behavior in `assets/js/modals.js`, and the `.code-cta` / `.code-modal` styles in `assets/css/style.css`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
