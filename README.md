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

## Curriculum resolution (dark rollout)

`index.html` keeps the committed `window.PHASES` / `window.WEEKS` ten-week calendar as the immediate and authoritative fallback. After `assets/js/roster.js` and `assets/js/auth.js` expose the existing backend URL and session helper, `assets/js/curriculum-loader.js` may request `GET /curriculum/resolved` with the current bearer. It swaps the grid only after strict whole-response validation. A missing session, disabled/404 endpoint, 401 after one refresh, timeout, network error, or malformed response leaves the static calendar fully usable.

The backend contract was merged in `2463-FDE/fde-backend#7` (main squash `c17215a744509354cb7a0ad8d1c301c666e30e38`) but is **not deployed**. Its code-level `CURR_ENABLED` default remains `false`. This content change modifies no backend, binding, configuration, secret, data store, or deployment and cannot enable dynamic curriculum resolution. No curriculum response or provenance is persisted by the page.

Seed-v1 renders with the same phase/week/day order, stable `wNNdN` progress keys, curriculum copy, content/part links, stars, progress controls, and ritual links as the static source. Intentional presentation-only DOM differences are: calendar content is now built with text nodes instead of HTML strings; cards carry `data-unit-key` for focus restoration; and a future `availability="missing"` unit gets an explicit **Unavailable** badge, `aria-disabled`, muted/dashed styling, and no curriculum/progress link. The narrow mobile rules wrap the navigation and calendar at 320 px without changing curriculum meaning.

Focused checks use committed synthetic fixtures only and make no live endpoint calls:

```bash
node --test tests/curriculum-loader.test.cjs
```

## Authoring a reading page

Each page defines two globals then includes the three scripts:

- `window.DIAGRAM = { width, height, nodes:[{id,step,x,y,w,h,label}], edges:[{id,step,from,to,label?,bend?}], captions:[...] }`
  Steps reveal in order as the reader scrolls; the matching `.step` section drives `Diagram.goTo(n)`.
- `window.QUIZ = { id, title, pass, questions:[{stem, options:[...], answer:<idx>, explain}] }`
  2–5 questions, answered on-page, ≥`pass` to clear. Results store to `localStorage` and POST to `window.FDE_TRACK_URL` if set.

Prose lives in `<section class="step" data-step="N">` blocks inside `.prose`; the diagram sits in the sticky `.stage` panel.

## Tracking

Per-trainee quiz results are kept in `localStorage` and, when `window.FDE_TRACK_URL` is set, beaconed to a central Cloudflare Worker + D1 store for the instructor dashboard.
