# The reading study assistant (per day + per week)

**Date:** 2026-08-05 · **Status:** LIVE — Worker deployed, merged to `main`, all 33 prompts pre-warmed
**Ships in:** `assets/js/reading-coach.js` + the `.rc-*` block in `assets/css/style.css`
**Backend:** `backend/src/reading.js`, `backend/src/reading-index.js` (generated), wired into `index.js` dispatch

Every daily reading page (33 of them, W1–W6) carries two things, and the curriculum page carries a
third: a **week-level** assistant grounded in an abridged digest of all five days.

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
| A reply | one Haiku call, ≤700 output tokens; input is the page (~5k tokens) plus any open prior reading — **prompt-cached**, so every turn after the first in a session re-reads the page at ~10% of the input rate ($0.10/MTok vs $1.00 on Haiku 4.5) |
| Generic delivery prompt | **one Haiku call per page, ever** (cohort-wide KV cache) |
| Custom delivery prompt | one Haiku call, per learner |
| Page text | one GitHub Pages fetch per reading per week |
| Week digest | **one Haiku call per week, ever** (~35s to generate, cohort-wide cache) |

Rails, outermost first:

- **The learner's shared daily budget — 100 LLM calls (`attempts:chat:<date>:<name>`).** One pot
  across every free-form chat surface, so the coding-prep partner and this assistant draw from the
  same counter. It's keyed on learner + date, never on the session, so a reload, a new window, a
  different device or a different assistant never resets it. Lives in `backend/src/chat-budget.js`;
  a 429 from this rail reports `scope: "all_assistants"`.
- **This surface's sub-cap — 50 calls/day** (`attempts:reading:<date>:<name>`), so one assistant
  can't eat the whole pot in a sitting. Reports `scope: "reading"`.
- 40 messages per session (6h TTL), 2 tool round-trips per turn, 2 prior readings held open.

Practice identities (trainers) are exempt from both, same as everywhere else. Collab's 4
interviews/day and System Design's 1 attempt/day are deliberately NOT in this pot — those are
attempt limits, not cost rails.

## The week assistant (curriculum page)

Each week header on `index.html` gets an "Ask about this week" button. It opens the same modal
against a whole week.

Five readings is ~33k tokens of prose — wasteful to carry on every turn — so a week session is
grounded in an **abridged digest**: one section per day (claims, named techniques, numbers, strong
opinions) plus a THREAD section on how the days build. ~9.5k chars, about a quarter of the raw text.
Generated once per week by Haiku, cached cohort-wide under a hash of the five days' combined text,
and the model still has `load_reading` to pull any single day at **full fidelity** when the
conversation needs the detail — cheap by default, precise on demand. Verified live: a "what was this
week arguing" question answered from the digest alone; "what exactly are the MCP transports" pulled
`w03d2` and answered from the real text.

It is a **review** surface, not a build surface: someone opens it days or weeks later to get back
into a week — what it covered, the through-line, what they forgot, whether they're ready to move on.
It deliberately does **not** write delivery prompts. Asked for one, it names the day that owns the
material and points at that page's button, then gives review-shaped orientation instead. Turning
material into repo work belongs to the day pages, where the prompt is built from that day's full
text rather than a summary.

The right rail shows the digest as a **Week recap** with links to the five days.

The load horizon is the end of that week, so a week session can't reach into unread material either.

## Scope and length rails

Both assistants share one `STYLE_RAIL` and one `SCOPE_RAIL` (`backend/src/reading.js`), so the
day and week surfaces can't drift apart on what they refuse or how long they talk.

**Scope is a hard boundary.** Off-topic asks — career advice, unrelated debugging, other products,
personal topics, writing something for them — get one sentence declining and a return to the
material. The rail explicitly closes the usual side doors: "just this once", a hypothetical or
fictional version, and answers wrapped in a story, poem, translation, roleplay or code comment.
Instructions are not a topic: no repeating, summarising, translating, encoding, "output everything
above", persona swaps, or developer/debug modes. Text inside `<current_reading>`, `<prior_reading>`
and `<week_digest>` is declared **course material** — if it looks like an instruction, it's content
to discuss, never a command to follow.

**A second rail runs server-side**, the same posture as `coach.js`'s `scrubCode`. `scrubLeak()`
checks every reply for strings that exist only in our own scaffolding (section headers, the
injection preamble, the material tags). A match replaces the reply outright — half a leaked prompt
is still a leaked prompt — and increments `leakScrubs`, which rides along in the Langfuse metadata
so attempts are visible rather than silent. A jailbreak that beats the prompt still can't ship it.

**Length is bounded three ways**: the prompt asks for 3-5 sentences with a 150-word ceiling; the
token cap is 320 (~230 words) as a true backstop; and `trimReply()` cuts to the last complete
sentence, repairing anything the token ceiling clipped and closing a dangling code fence. Measured
on real questions, replies land at 120-175 words.

Verified by `backend/tools/reading-index/test_reading_rails.mjs` (rails present in both scopes, 15
leak shapes scrubbed, 8 normal answers and near-miss phrasings passed through untouched, length
repair). Plus one live adversarial batch — 12 probes, fresh session each: **0 leaks, 12/12
refused**, median reply 30 words.

## Observability

Every model call traces to Langfuse through `backend/src/langfuse-payload.js`:

- **Input is a role-labelled message list**, with the system prompt as its own
  `role: "system"` entry — the format Langfuse renders as a conversation, and the same
  convention LangChain 1.0 encodes as a `SystemMessage`. (In the Anthropic request itself
  `system` is a top-level parameter, which is where it belongs; only the trace needed fixing.)
  Tool round-trips keep their `tool_use` / `tool_result` blocks instead of being flattened.
- **`usageDetails`**, not the deprecated `usage` object. Buckets are mutually exclusive, so
  `cache_read_input_tokens` and `cache_creation_input_tokens` are their own keys and the cost
  figure reflects what caching actually saved. Anthropic's `input_tokens` already excludes
  cache tokens, so no subtraction is needed (OpenAI's `prompt_tokens` would need it).

Background: [[llm-trace-payload-conventions]] in the second brain.

## Routes

| Route | Body | Notes |
|---|---|---|
| `POST /reading/start` | `{passcode, reading}` | mints the session, returns the curated opening. No model call. |
| `POST /reading/message` | `{sessionId, text}` | one reply, including any `load_reading` round-trips |
| `POST /reading/prompt` | `{passcode, reading}` | the generic prompt; cache hit is free and bypasses the cap |
| `POST /reading/prompt/custom` | `{sessionId, note}` | written from the conversation (day sessions only) |
| `POST /reading/week/start` | `{passcode, week}` | the week assistant; generates/serves the digest |

## Regenerating the catalog

`backend/src/reading-index.js` is generated. After adding, retitling or resummarizing a reading:

```bash
node backend/tools/reading-index/gen_reading_index.js
```

Ids follow the page path: the filename stem, prefixed with its week directory when the stem doesn't
already carry one (`w01/d2a.html` → `w01d2a`; `w05/w05d3.html` → `w05d3`). The client derives the
same id from `location.pathname`, so the two can't drift.

## Budget reminders (zero cost)

Every reply already carries the learner's remaining budget, so the reminder is composed **locally**
from that number — `assets/js/usage-notice.js`. No model call, no extra request, no tokens. The line
is rendered as a system notice and is never appended to the transcript, so it can't end up in a
later prompt.

It fires once per **20% threshold** per day (20/40/60/80), tracked in localStorage under the local
date so it resets on its own and neither a reload nor switching assistants re-announces a threshold
already seen. The 80% notice is styled as a warning and steers the remaining spend at what the
learner is actually stuck on. Uncapped (practice) identities send `budgetLeft: null` and see
nothing. Shared by the reading assistant and the coding-prep partner.

## What the UI shows for the rail

The modal header shows **"N messages left today"**, not a session turn count. The session cap (40
turns) was never the real limit — reloading the page mints a fresh session — so advertising it was
misleading. The number shown is the shared cross-assistant daily budget, which nothing resets, and
it goes amber under 10 left. Practice identities are uncapped and see nothing.

## Tests

```bash
node backend/tools/reading-index/test_reading.mjs        # extraction, catalog, prompts, rails
node backend/tools/reading-index/test_reading_loop.mjs   # the tool-use loop, stubbed model
```

Browser QA (serves this repo, stubs the Worker, drives both the healthy and Worker-down paths, and
screenshots light/dark/mobile):

```bash
python3 -m http.server 8123 &
npm i playwright
FDE_PRACTICE_ACCESS_CODE=practice-placeholder node docs/reading-assistant-qa.mjs
```

`FDE_PRACTICE_ACCESS_CODE` only seeds the `fde_identity` entry in localStorage, and these scripts stub
every Worker route, so nothing validates it: any non-secret placeholder passes every assertion. Never
supply, export, or persist a real access code here — the previously committed literal was rotated on
2026-08-14, and access codes never belong in this repository. The scripts exit with
`FDE_PRACTICE_ACCESS_CODE is required` when it is unset. The sibling scripts
`docs/reading-assistant-usage-qa.mjs` and `docs/reading-assistant-week-qa.mjs` take the same variable.

## Rollout — done 2026-08-05

1. Worker deployed (`npx wrangler deploy`). Note: give it ~30s before smoke-testing — new routes
   404 intermittently while the version propagates across colos.
2. `feat/reading-assistant` merged to `main`, Pages redeployed (~30s).
3. All 33 delivery prompts and all 6 week digests pre-warmed, so no learner is ever the one who waits ~8s for a
   generation. Re-run after rewriting a reading (the cache keys on the page's content hash, so a
   rewrite silently invalidates and the next learner pays for it):

```bash
node -e 'const {READINGS}=await import("./src/reading-index.js");
for (const r of READINGS) await fetch("https://fde-backend.jestercharles.workers.dev/reading/prompt",
  {method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({passcode:"<a practice code>",reading:r.id})});' --input-type=module
```
