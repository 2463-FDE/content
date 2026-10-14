# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Curriculum authoring is research-first; follow `docs/week-fanout-plan.md` and update the matching `docs/research/wWW/` artifact before changing a current technical claim in week HTML.
- Run static curriculum regressions with `python3 -m unittest discover -s tests -v`. `tests/test_curriculum_currency.py` validates the public HTML/embedded-JS contract for the Week 3–4 currency slice.
- Read-only lesson code popups use `assets/js/codeviewer.js`, shared modal behavior in `assets/js/modals.js`, and the `.code-cta` / `.code-modal` styles in `assets/css/style.css`.
- Week 9–10 routes are thin shells over `assets/js/curriculum-lessons-w09-w10.js` and `assets/js/capstone-lesson.js`; batch/client/cloud-lane presentation config is single-source in `assets/js/curriculum-config.js`.
- Captain approved Archify `tt-a1i/archify` v3.0.1 for useful architecture/data-flow visuals, but do not install or execute it until the dedicated source-verification report confirms the pinned safe path. Required outputs must be inline, accessible, runtime-independent SVGs with recorded provenance.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
