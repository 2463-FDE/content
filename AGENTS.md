# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- AWS/GCP path work follows `docs/cloud-paths.md`: provider blocks hold Core 30 per selected provider (`tests/core30.py`, `tests/test_cloud_core30.py`), provider claims trace to `docs/research/<week>/<page>-provider-paths.md`, and certification facts live in `assets/js/cert-objectives.js` + `docs/research/certifications/`.
- Curriculum authoring is research-first; follow `docs/week-fanout-plan.md` and update the matching `docs/research/wWW/` artifact before changing a current technical claim in week HTML.
- Run static curriculum regressions with `python3 -m unittest discover -s tests -v` and shared-JS regressions with `node --test tests/*.test.cjs`. `tests/test_curriculum_currency.py` validates the public HTML/embedded-JS contract for the Week 3–4 currency slice.
- Read-only lesson code popups use `assets/js/codeviewer.js`, shared modal behavior in `assets/js/modals.js`, and the `.code-cta` / `.code-modal` styles in `assets/css/style.css`.
- Week 6, Week 7–8, and Week 9–10 routes are thin shells over shared lesson data/renderers (`curriculum-lessons-w06.js` + `kafka-lesson.js`, `curriculum-lessons-w07-w08.js` + `platform-lesson.js`, then `curriculum-lessons-w09-w10.js` + `capstone-lesson.js` under `assets/js/`); supported batch-to-content-model, client, and cloud-lane presentation config is single-source in `assets/js/curriculum-config.js`, with URL/storage restoration in `assets/js/batch-context.js`.
- Week 5 Archify SVGs and drift metadata live beside `docs/research/w05/archify-visual-brief.md`.
- Archify source/tool/output provenance and drift rules live in each scope's visual plan/manifest (`docs/research/w06/archify-*`, `docs/research/w07-w08-archify-*`, and `docs/research/system-blueprint/`); keep authoring inputs, raw viewers, caches, source checkouts, and all Archify runtime files disposable.
- `system-blueprint.html` is a standalone optional-depth program map (two Archify figures + local drills, provider-neutral, outside Core 30); its week copy is keyword-coupled to `index.html`'s `window.WEEKS` by `tests/test_system_blueprint.py`, so a week retheme fails that suite and demands a copy review there, never a silent baseline update.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
