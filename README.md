# 2463-FDE · Content Site

Reading content + live diagrams + comprehension checks for the **2463-FDE Forward Deployed Engineer** 10-week program. Served as a GitHub Pages site.

**Live:** https://2463-fde.github.io/content/

## What's here

```
index.html              10-week navigation grid
weeks/w01/d1.html       daily reading page (scrollytelling + diagram + quiz)
atlas/                  FDE Mindset Atlas (ported, de-Karsun'd) [coming]
assets/
  css/style.css         single stylesheet
  js/diagram.js         declarative SVG diagram engine — hand-drawn (Excalidraw-style)
                        wobble + per-step draw-in animation
  js/scrolly.js         IntersectionObserver: scroll position -> diagram step
  js/quiz.js            end-of-reading comprehension check, on-page result,
                        per-trainee tracking (localStorage + central POST seam)
```

Zero build step, zero dependencies. Edit HTML/CSS/JS, commit, Pages redeploys.

## Authoring a reading page

Each page defines two globals then includes the three scripts:

- `window.DIAGRAM = { width, height, nodes:[{id,step,x,y,w,h,label}], edges:[{id,step,from,to,label?,bend?}], captions:[...] }`
  Steps reveal in order as the reader scrolls; the matching `.step` section drives `Diagram.goTo(n)`.
- `window.QUIZ = { id, title, pass, questions:[{stem, options:[...], answer:<idx>, explain}] }`
  2–5 questions, answered on-page, ≥`pass` to clear. Results store to `localStorage` and POST to `window.FDE_TRACK_URL` if set.

Prose lives in `<section class="step" data-step="N">` blocks inside `.prose`; the diagram sits in the sticky `.stage` panel.

## Tracking

Per-trainee quiz results are kept in `localStorage` and, when `window.FDE_TRACK_URL` is set, beaconed to a central Cloudflare Worker + D1 store for the instructor dashboard.
