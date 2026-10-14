# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Curriculum authoring is research-first; follow `docs/week-fanout-plan.md` and update the matching `docs/research/wWW/` artifact before changing a current technical claim in week HTML.
- Run static curriculum regressions with `python3 -m unittest discover -s tests -v`. `tests/test_curriculum_currency.py` validates the public HTML/embedded-JS contract for the Week 3–4 currency slice.
- AWS/GCP path work follows `docs/cloud-paths.md`: provider blocks hold Core 30 per selected provider (`tests/core30.py`, `tests/test_cloud_core30.py`), provider claims trace to `docs/research/<week>/<page>-provider-paths.md`, and certification facts live in `assets/js/cert-objectives.js` + `docs/research/certifications/`.
- Read-only lesson code popups use `assets/js/codeviewer.js`, shared modal behavior in `assets/js/modals.js`, and the `.code-cta` / `.code-modal` styles in `assets/css/style.css`.
- Week 6 and Week 9–10 routes are thin shells over their shared lesson data/renderers (`assets/js/curriculum-lessons-w06.js` + `assets/js/kafka-lesson.js`, then `assets/js/curriculum-lessons-w09-w10.js` + `assets/js/capstone-lesson.js`); batch/client/cloud-lane presentation config is single-source in `assets/js/curriculum-config.js`.
- Week 5 Archify SVGs and drift metadata live beside `docs/research/w05/archify-visual-brief.md`.
- Week 6 Archify source/tool/output provenance and drift rules live in `docs/research/w06/archify-visual-plan.md` and `archify-provenance.json`; keep authoring inputs, raw viewers, caches, source checkouts, and all Archify runtime files disposable.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
