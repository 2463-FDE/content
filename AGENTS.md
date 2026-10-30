# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- AWS/GCP path work follows `docs/cloud-paths.md`: provider blocks hold Core 30 per selected provider (`tests/core30.py`, `tests/test_cloud_core30.py`), provider claims trace to `docs/research/<week>/<page>-provider-paths.md`, and certification facts live in `assets/js/cert-objectives.js` + `docs/research/certifications/`.
- Curriculum scope traces to the exact LTIM FDE v3 artifact recorded in `docs/research/fde-ltim-v3-source-reconciliation.md`; its 396-item/50-day baseline and parallel-lane gaps are machine-readable in `docs/research/fde-ltim-v3-coverage.json`.
- Curriculum authoring is research-first; follow `docs/week-fanout-plan.md` and update the matching `docs/research/wWW/` artifact before changing a current technical claim in week HTML.
- Run static curriculum regressions with `python3 -m unittest discover -s tests -v` and shared-JS regressions with `node --test tests/*.test.cjs`. `tests/test_curriculum_currency.py` validates the public HTML/embedded-JS contract for the Week 3–4 currency slice.
- Read-only lesson code popups use `assets/js/codeviewer.js`, shared modal behavior in `assets/js/modals.js`, and the `.code-cta` / `.code-modal` styles in `assets/css/style.css`.
- Week 6, Week 7–8, and Week 9–10 routes are thin shells over shared lesson data/renderers (`curriculum-lessons-w06.js` + `kafka-lesson.js`, `curriculum-lessons-w07-w08.js` + `platform-lesson.js`, then `curriculum-lessons-w09-w10.js` + `capstone-lesson.js` under `assets/js/`); regenerate W9–10 shells and semantic no-JS articles with `node docs/workflows/build-capstone-routes.cjs`. Supported batch-to-content-model, client, and cloud-lane presentation config is single-source in `assets/js/curriculum-config.js`, with URL/storage restoration in `assets/js/batch-context.js`.
- Visual work follows `DESIGN.md` (normative tokens + named rules; "Dispatch Board" system). The token layer in `assets/css/style.css` `:root` (+ dark block) is the only propagation path for restyling the 50+ week pages — never restructure week HTML for visual change. `tests/design-system.test.cjs` pins the shell contracts (tokens in both themes, focus/reduced-motion/print, transform/opacity-only keyframes, the AA accent-fill rule, emoji-free chrome, hub anchors). After editing `style.css`, run `./bump-css.sh` so learners' caches pick it up.
- Local synthetic Riverbend/Meridian communication practice is documented in `docs/persona-communications.md`; shared scenario truth lives in `assets/js/persona-communications-fixtures.js` and must remain network-, grading-, progress-, and assessment-independent.
- Week 5 Archify SVGs and drift metadata live beside `docs/research/w05/archify-visual-brief.md`.
- Archify source/tool/output provenance and drift rules live in each scope's visual plan/manifest (`docs/research/w06/archify-*` and `docs/research/w07-w08-archify-*`); keep authoring inputs, raw viewers, caches, source checkouts, and all Archify runtime files disposable.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
