# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary: mid-to-senior technical learners in the 2463-FDE (Forward Deployed Engineer) ten-week program, reading daily curriculum pages, completing comprehension checks, and tracking their own progress. [source: launch brief + repo]
- Secondary: trainers who run cohorts from the curriculum hub, launch lessons, manage access codes, and read per-learner reports on a role-gated dashboard. [source: repo `trainer.html`, `auth.js`]

## Product Purpose

A zero-build static GitHub Pages site that is the trainer-facing source of truth and the learner-facing daily surface for the ten-week FDE curriculum: reading pages with scrollytelling diagrams, comprehension checks, Core-30 pacing, cloud (AWS/GCP) paths, and cohort-scoped curriculum models. Success = launch-ready Week 1 and a truthful, accessible, responsive surface per the FDE launch-readiness program (2026-10-27).

## Positioning

Cohort-as-curriculum: a supported batch resolves to an explicit content model (`assets/js/curriculum-config.js`); unknown batches never inherit another cohort's curriculum. Content claims are research-backed and provenance-tracked (`docs/research/`), with Core-30 time contracts enforced by tests.

## Operating Context

- Served as static GitHub Pages; zero build step, zero runtime dependencies. Deep links, back/forward, reload, and a no-JavaScript static fallback are supported behavior.
- Learner identity via access code -> Cloudflare Worker session; trainer role gates `trainer.html` and trainer-only chrome. Server enforces trainer routes; client gating is convenience only.
- Quiz/progress tracking to `localStorage` and optional `window.FDE_TRACK_URL` beacon.
- Tests: `python3 -m unittest discover -s tests -v` (static curriculum regressions) and `node --test tests/*.test.cjs` (shared JS contracts).

## Capabilities and Constraints

- Shared design system is `assets/css/style.css` (plus `cloud-path.css`, `w4-major-refresh.css`); light + dark themes via `html[data-theme]`, print stylesheet, global reduced-motion collapse.
- Shared chrome: `theme.js` (head, pre-paint theme + favicon + toggle), `auth.js` (identity, trainer nav, batch context mount), `learning-chrome.js` (skip link, learning objectives), `batch-context.js` (URL/storage batch restore).
- Constraints (binding, from launch program): no new packages, no new network assets/remote fonts/images without approval; preserve every current workflow, route, truth contract, trainer/learner separation, static fallback; motion = transform/opacity only, honor `prefers-reduced-motion`; WCAG AA, 200% zoom, 320/390/768 widths, no horizontal overflow.
- PR branches 7, 8, 9, 12, 15 are held; do not touch.

## Brand Commitments

- Name/wordmark: "2463·FDE" with program name "Forward Deployed Engineer Program". Client identity string: "LTM, formerly LTIMindtree" (from curriculum-config; appears via `data-client-name`).
- Accent heritage: Revature-ish orange accent is the incumbent identity signal. [inference: treated as evolvable, not pinned — no explicit user pin exists]
- System font stack is a deliberate zero-dependency choice. [inference from "no new remote fonts" constraint]

## Evidence on Hand

- Full incumbent implementation in repo (50+ routed HTML pages, 38 JS modules, 1569-line design system).
- Program contract and metrics: kun-agent-workspace `data/fde-launch-readiness-program-2026-10-27.md` (external to repo; not committed).
- No marketing claims, testimonials, or pricing exist anywhere on the surface; none may be invented.

## Product Principles

1. Truth before polish: factual curriculum claims, Core-30 budgets, and provenance are never altered by presentation work.
2. Cohort isolation is sacred: no batch ever sees another cohort's model; trainer surfaces never leak to learners.
3. Progressive disclosure over deletion: reduce first-pass load; keep authoritative depth reachable.
4. Zero-dependency resilience: every page must degrade to readable static HTML without JavaScript.
5. Operate/Read first: scanability, state feedback, and task completion outrank visual expression.

## Accessibility & Inclusion

WCAG AA contrast, keyboard-only operability with visible focus, screen-reader landmarks/labels, 200% zoom, reduced-motion support, and no-JS fallback are program success metrics (metric 7), not aspirations.
