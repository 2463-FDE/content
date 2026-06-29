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
items) via a Cloudflare Cron Trigger using the API key.

**Access model (user, 2026-06-29): TRAINERS ONLY.** A trainer-only nav link
renders in the navbar (shown only when the session role === "trainer"), routing to
the reports/dashboard page. The trainer's LOGIN CODE is the access — no separate
auth. So this rides entirely on #7's role-bearing session: the navbar reads the
session token's role; learners never see the link; the `/trainer/*` aggregation
routes require a trainer token (reject non-trainers server-side too, not just
hidden in UI). Build AFTER #7 (needs the role-bearing session). A `/trainer/*`
read-aggregation route + a weekly-report cron complete it.

### #7 — Server-side login + HMAC session (DESIGN LOCKED 2026-06-29)
Goal (user): NO codes on the page at all; trainer generates a passcode + shares it.
- **roster.js gutted** — no learner codes, no trainer hashes shipped. (Interim:
  leaked trainer-code comments already stripped; full removal here.) Login
  validation moves entirely to the Worker.
- **KV store:** `login:<sha256(code)>` -> `{name, role, createdAt}`. Validation:
  user enters code -> Worker hashes -> KV lookup -> if found, issue session token.
- **Session:** HMAC-signed token (Web Crypto, signing key = wrangler secret
  `SESSION_SECRET`), stored in **localStorage** (bearer; GitHub Pages + Worker is
  cross-origin so no cookie). Sent on API calls; Worker verifies + expiry (~30d).
- **Routes:** `POST /auth/login {code}` -> {ok, token, name, role}; `POST
  /auth/add {name, role}` (TRAINER token required) -> generates a random passcode,
  stores `login:<hash>`, returns plaintext ONCE; `POST /auth/revoke {code|name}`
  (trainer); `GET /auth/list` (trainer) -> roster (names/roles, NO codes).
- **Bootstrap:** seed the first trainer login into KV via a one-time wrangler
  command (generate a trainer passcode, store `login:<hash>` role=trainer). Give
  the code to the human; they log in, then add everyone from the trainer page.
- **Trainer "add login" UI:** a trainer-gated panel (in the trainer view / a
  content page) — enter name + role -> shows the generated passcode once to copy
  + share. Revoke = delete KV entry.
- **Migration:** could optionally seed the existing 4 learner codes into KV so they
  don't re-onboard; user chose bootstrap-trainer-only, so learners get fresh
  trainer-generated codes (rotates the leaked ones automatically).
- `auth.js` (+ gauntlet gate) rework to call `/auth/login` instead of validating
  against roster.js; store/send the token. (Research: OWASP server-side
  validation; CF Workers Web Crypto HMAC + timingSafeEqual.)
- NOTE: `/auth/*` routes live in `backend/src/index.js` — build AFTER #5 deploys
  to avoid clobbering the same file.

## Cross-cutting reminders
- Backend (`backend/src/index.js`, `design.js`) is NOT git — deploys via
  `npx wrangler deploy`. Frontend (`content/`) is git → GitHub Pages.
- Content assets have no `?v` cache-buster by design; gauntlet assets use
  `?v=YYYYMMDD-N` (bump on gauntlet changes).
- Everything new should be traced (logLangfuse) + observable.
