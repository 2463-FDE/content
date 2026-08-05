# The per-reading study assistant

**Date:** 2026-08-05 · **Status:** built on `feat/reading-assistant`, not deployed
**Ships in:** `assets/js/reading-coach.js` + the `.rc-*` block in `assets/css/style.css`
**Backend:** `backend/src/reading.js`, `backend/src/reading-index.js` (generated), wired into `index.js` dispatch

Every daily reading page (33 of them, W1–W6) now carries two things.

## 1. The delivery prompt — "use this today"

A highlighted block at the end of the reading column, just above **Summarize Your Day**, with one
big button. Behind it is a paste-ready Claude Code prompt that turns the day's material into work
the learner can start in a repo they already have open.

Every generated prompt follows the same six-part shape, so a learner who used yesterday's knows how
to read today's:

1. orient in the repo first, ask before assuming a stack
2. name the specific patterns from **this** reading, by their real names
3. what to inspect or measure in their existing project
4. a concrete artifact to produce — a file, a test, a doc, a diff (never "consider")
5. a checkable stopping condition
6. ask clarifying questions before sweeping changes

**Generic version.** Generated server-side from the page's own text, then cached in KV under a hash
of that text. The first learner in the cohort to press the button pays one Haiku call; everyone
after reads KV. Rewriting a reading invalidates its prompt automatically.

**Custom version.** In the assistant panel: the learner describes their project and gets the same
prompt aimed at their stack, written from the conversation. Per-learner, so it's billable each time
and sits under the daily cap.

**Offline template.** If the Worker is unreachable the button still works — the client builds a
prompt from the page's title, its `fde-concepts` meta and its section headings, in the same shape.
Less sharp, still today-specific, no network. (Reading pages sit behind the login overlay, so
"signed out" isn't a state that reaches this code; "Worker down" is.)

## 2. The assistant

Same modal grammar as the coding-prep thinking partner (`coding-coach.js`), and the same posture:

- **Page context is server-side only.** The client sends a reading id (`w05d3`) and nothing else.
  The Worker looks it up in the generated catalog, fetches the published page off GitHub Pages,
  strips it to prose, and caches the text in KV for a week. There is no field for pasting page
  content, so the only learner-authored text reaching the model is their chat turns.
- **The quiz never reaches the model.** Extraction stops at `</article>`, so the trailing
  `window.QUIZ` / `window.DIAGRAM` globals — including every answer key — are never in context. The
  system prompt also refuses to answer the comprehension check.
- **Prior weeks are pulled, not preloaded.** Every reading up to today appears as a one-line catalog
  entry. When a question genuinely reaches back, the model calls `load_reading(id)` and the Worker
  feeds it the real text. Loads are **backward-only** — asking for a future day is refused at the
  Worker, so a learner can't talk the assistant into spoiling next week. Up to two prior readings
  stay open per session; the UI says which ones were pulled, because this cohort is being taught
  exactly that mechanism and silent retrieval wastes the teaching moment.
- **It may write code.** Unlike the coding-prep partner, this is a tutor on material we wrote — code
  and worked examples are often the fastest answer. There is no `scrubCode` rail here, by design.

## Cost

| Thing | Cost |
|---|---|
| Opening the assistant | **$0** — the opening line is composed server-side from the catalog |
| A reply | one Haiku call, ≤700 output tokens; input is the page (~5k tokens) plus any open prior reading |
| Generic delivery prompt | **one Haiku call per page, ever** (cohort-wide KV cache) |
| Custom delivery prompt | one Haiku call, per learner |
| Page text | one GitHub Pages fetch per reading per week |

Rails: 40 messages per session (6h TTL), **50 billable calls per learner per day**
(`attempts:reading:<date>:<name>`), 2 tool round-trips per turn, 2 prior readings held open.
Practice identities (trainers) are exempt from the daily cap, same as everywhere else.

## Routes

| Route | Body | Notes |
|---|---|---|
| `POST /reading/start` | `{passcode, reading}` | mints the session, returns the curated opening. No model call. |
| `POST /reading/message` | `{sessionId, text}` | one reply, including any `load_reading` round-trips |
| `POST /reading/prompt` | `{passcode, reading}` | the generic prompt; cache hit is free and bypasses the cap |
| `POST /reading/prompt/custom` | `{sessionId, note}` | written from the conversation |

## Regenerating the catalog

`backend/src/reading-index.js` is generated. After adding, retitling or resummarizing a reading:

```bash
node backend/tools/reading-index/gen_reading_index.js
```

Ids follow the page path: the filename stem, prefixed with its week directory when the stem doesn't
already carry one (`w01/d2a.html` → `w01d2a`; `w05/w05d3.html` → `w05d3`). The client derives the
same id from `location.pathname`, so the two can't drift.

## Tests

```bash
node backend/tools/reading-index/test_reading.mjs        # extraction, catalog, prompts, rails
node backend/tools/reading-index/test_reading_loop.mjs   # the tool-use loop, stubbed model
```

Browser QA (serves this repo, stubs the Worker, drives both the healthy and Worker-down paths, and
screenshots light/dark/mobile):

```bash
python3 -m http.server 8123 &
npm i playwright && node docs/reading-assistant-qa.mjs
```

## Rollout

1. Deploy the Worker from `backend/` (`npx wrangler deploy`) — the routes are inert until then, and
   the button falls back to the offline template.
2. Merge `feat/reading-assistant` and let Pages redeploy.
3. Optionally pre-warm: pressing the button once per reading fills the cohort-wide prompt cache, so
   no learner is ever the one who waits for a generation.
