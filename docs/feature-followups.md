# Feature follow-ups (2026-06-29 session)

Big multi-feature session. Shipped 4.5 of 7; remaining 3 deferred to focused
follow-up turns (user's call — keep quality high, avoid late-session bugs).

## Shipped & live (verified)
- **SD explanation recording bug** — `stt.js` global single-recognition guard;
  the clarify-mic no longer blocks the Explain recorder. (gauntlet)
- **Try-it output persistence** — preset tabs run-only + cached (no budget burn),
  3 tries scoped to the editable tab, cached output shown when usage spent.
  Backend `/execute` per-variant cache + `/exec-cache`.
- **Langfuse tracing** — no-bundler JSON ingestion via `ctx.waitUntil`, wraps
  every Claude call (`content.try-it`, `interview.judge`, `interview.synthesis`,
  `design.judge/clarify/followup`, `content.concept-check`). Keys are Worker
  secrets. **Region gotcha: data is on US (`us.cloud.langfuse.com`), project "My
  Project" / "JesterCharles's Organization" — the EU `cloud.langfuse.com` view is
  a separate region and looks empty.**
- **Summarize Your Day** — completion gate: 90-120s summary + comprehension quiz
  both required; backend `/concept-check` grades the summary vs the day's
  concepts → revisit list; stored at `cc:<code>:<day>`.
- **SD judge hardening (#5a)** — reward reasoning over rehearsed fluency; design
  choices must tie to THIS brief's constraints; surface fluency never raises score.

## Remaining work

### #5 (rest) — SD weekly challenge + mastery scoring
Decisions locked: mastery bar on a ROTATING/novel brief (NOT best-of-week max);
daily attempts = ungraded practice; oral-defended; probing+hardened judge (judge
hardening already done). Author ~6 more FS-dev-framed scenarios.

**KEY INSIGHT (user, 2026-06-29): the weekly SD assignment must be CURRICULUM-AWARE.**
Don't assign an agentic/RAG challenge before those topics are taught. Match the
week's challenge to what's been covered by then:
- W1-2: foundational full-stack (the learners' home turf) — APIs, schemas, scale,
  multi-tenant, rate limiting.
- W2+: RAG scenarios become fair game (after RAG week).
- W3-4+: agentic / HITL / multi-agent (after agent weeks).
- Later: multi-tenant RAG + evals, observability-heavy designs.
So `weeklyChallenge(week)` maps week → a scenario whose prerequisites are taught
by that week, rotating within the eligible set to prevent memorization.

To build: more scenarios (curriculum-arc coverage); `weeklyChallenge(week)` map;
1/day attempt cap (`attempts:sd:<date>:<name>`); mastery threshold (e.g. best of
week's eligible attempts clears overall>=~75 on a rotating brief); a PREP/DETAILS
page (repurpose `system-design.html`) showing the week's assigned challenge,
research-ahead guidance, Friday deadline, "1 attempt/day, best clears the bar";
curriculum Tue/Fri SD chips link to that prep page (`system-design.html?w=N`)
instead of `gauntlet.html?sd=1`.

### #6 — Unified trainer platform + weekly reports
Dashboard aggregating: `uprog:` (progress), `weak:`/`ledger:` (interview weak
concepts), `cc:` (day concept-checks), `dbest:`/`dhist:` (system design),
`iv:`/`best:` (interviews), day-summaries (`/track`). Real-time stats view +
**weekly Claude-generated per-learner reports** (progress, weak points, action
items) via a Cloudflare Cron Trigger using the API key. Gate behind trainer auth
(ties to #7). Likely a new gated trainer page + a `/trainer/*` aggregation route.

### #7 — Server-side login + HMAC session
Move access codes out of public `roster.js` into Worker KV; Worker validates +
issues an HMAC-signed session token (Web Crypto), verified per request; signing
key as a wrangler secret; per-learner codes in KV (add/revoke). Strip the leaked
trainer-code comments from `roster.js` + rotate the trainer codes. (Research:
OWASP server-side validation; CF Workers Web Crypto HMAC.)

## Cross-cutting reminders
- Backend (`backend/src/index.js`, `design.js`) is NOT git — deploys via
  `npx wrangler deploy`. Frontend (`content/`) is git → GitHub Pages.
- Content assets have no `?v` cache-buster by design; gauntlet assets use
  `?v=YYYYMMDD-N` (bump on gauntlet changes).
- Everything new should be traced (logLangfuse) + observable.
