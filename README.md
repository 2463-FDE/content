# 2463-FDE · Content Site

Reading content + live diagrams + comprehension checks for the **2463-FDE Forward Deployed Engineer** 10-week program. Served as a GitHub Pages site.

**Live:** https://2463-fde.github.io/content/

## What's here

```
index.html              trainer-facing ten-week curriculum hub
trainer.html            cohort/report dashboard + curriculum launch routes
weeks/                   daily reading pages (scrollytelling + diagram + quiz)
atlas/                   FDE Mindset Atlas
assets/
  css/style.css          incumbent design system
  js/diagram.js          declarative SVG diagram engine
  js/scrolly.js          scroll position -> diagram step
  js/quiz.js             comprehension checks + tracking seam
  js/curriculum-config.js single-source client, batch, and cloud-lane config
  js/batch-context.js    reusable viewer-local batch selector
  js/curriculum-lessons-w09-w10.js authoritative Week 9–10 transfer data
  js/capstone-lesson.js  shared Week 9–10 route renderer
```

Zero build step, zero dependencies. Edit HTML/CSS/JS, commit, Pages redeploys.

## Authoring a reading page

Legacy pages define two globals and include the shared scripts. Week 9–10 routes instead consume the single shared transfer data file and renderer:

- `window.DIAGRAM = { width, height, nodes:[{id,step,x,y,w,h,label}], edges:[{id,step,from,to,label?,bend?}], captions:[...] }`
  Steps reveal in order as the reader scrolls; the matching `.step` section drives `Diagram.goTo(n)`.
- `window.QUIZ = { id, title, questions:[{stem, options:[...], answer:<idx>, explain}] }`
  Questions grade as they are answered. Results store to `localStorage` and POST to `window.FDE_TRACK_URL` if set.

Core-30 pages calculate required reading time as `round(words / 150)`, publish the pacing label, and keep optional depth in `details.deep[data-core="optional"]`.

Prose lives in `<section class="step" data-step="N">` blocks inside `.prose`; the diagram sits in the sticky `.stage` panel.

## Tracking

Per-trainee quiz results are kept in `localStorage` and, when `window.FDE_TRACK_URL` is set, beaconed to a central Cloudflare Worker + D1 store for the instructor dashboard.
