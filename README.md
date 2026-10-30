# 2463-FDE · Content Site

Reading content + live diagrams + comprehension checks for the **2463-FDE Forward Deployed Engineer** 10-week program. Served as a GitHub Pages site.

**Live:** https://2463-fde.github.io/content/

Learners pick an **AWS · GCP · Both** path on the hub (shareable as `?cloud=aws|gcp|both`); `certifications.html` maps each path to its certification target. Design and authoring contract: [`docs/cloud-paths.md`](docs/cloud-paths.md).

The exact LTIM FDE v3 curriculum authority, eight-page inventory, measurable 396-item coverage denominator, and current-main gap handoff live in [`docs/research/fde-ltim-v3-source-reconciliation.md`](docs/research/fde-ltim-v3-source-reconciliation.md) and [`docs/research/fde-ltim-v3-coverage.json`](docs/research/fde-ltim-v3-coverage.json). Current product behavior remains grounded by each week's dated first-party research.

## What's here

```
index.html              trainer-facing ten-week curriculum hub
trainer.html            cohort/report dashboard + curriculum launch routes
persona-communications.html local synthetic Riverbend/Meridian chat, inbox, and coaching
weeks/                   daily reading pages (scrollytelling + diagram + quiz)
atlas/                   FDE Mindset Atlas
assets/
  css/style.css          design tokens + shared styles (contract: DESIGN.md)
  js/diagram.js          declarative SVG diagram engine
  js/scrolly.js          scroll position -> diagram step
  js/quiz.js             comprehension checks + tracking seam
  js/curriculum-config.js single-source client, batch, and cloud-lane config
  js/persona-communications-fixtures.js shared synthetic scenario truth
  js/persona-communications.js deterministic local communication runtime
  js/batch-context.js    batch selector + URL/storage restore, model gating
  js/curriculum-lessons-w06.js authoritative Week 6 Kafka lesson data
  js/kafka-lesson.js     shared Week 6 route renderer + decision practice
  js/curriculum-lessons-w07-w08.js authoritative Week 7–8 IaC/reliability data
  js/platform-lesson.js  shared Week 7–8 Core-30 renderer + decision practice
  js/curriculum-lessons-w09-w10.js authoritative Week 9–10 transfer data
  js/capstone-lesson.js  shared Week 9–10 route renderer
```

Zero build step, zero dependencies. Edit HTML/CSS/JS, commit, Pages redeploys.

## Authoring a reading page

Legacy pages define two globals and include the shared scripts. Week 6, Week 7–8, and Week 9–10 routes instead consume their shared lesson-data files and renderers. Week 7 is Terraform + Ansible & AI CI/CD; Week 8 is AI Observability, SRE & Reliability Guardrails; Week 9 retains security/governance/hardening.

- `window.DIAGRAM = { width, height, nodes:[{id,step,x,y,w,h,label}], edges:[{id,step,from,to,label?,bend?}], captions:[...] }`
  Steps reveal in order as the reader scrolls; the matching `.step` section drives `Diagram.goTo(n)`.
- `window.QUIZ = { id, title, questions:[{stem, options:[...], answer:<idx>, explain}] }`
  Questions grade as they are answered. Results store to `localStorage` and POST to `window.FDE_TRACK_URL` if set.

Core-30 pages calculate required reading time as `round(words / 150)`, publish the pacing label, and keep optional depth in `details.deep[data-core="optional"]`.

Prose lives in `<section class="step" data-step="N">` blocks inside `.prose`; the diagram sits in the sticky `.stage` panel.

## Tracking

Per-trainee quiz results are kept in `localStorage` and, when `window.FDE_TRACK_URL` is set, beaconed to a central Cloudflare Worker + D1 store for the instructor dashboard.
