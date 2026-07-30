# The FDE Mindset Paradigm: scoring your own AI usage

> For 2463-FDE learners. Companion to the [FDE Mindset Atlas](../atlas/index.html).
> Rubric sources: Vinoo Ganesh's six traits and four core moves (Atlas), and Galent's
> published delivery model (operating model, Grand Prix, Loop Engineering).

Claude Code ships a `/insights` command that reads your session history and tells you how you
work. It is honest and it is useful. It is also **generic**: it scores you as a developer, not
as a forward-deployed engineer.

This document turns that same report into an FDE self-assessment. You run `/insights` as
normal, then you paste one prompt. Nothing to install, nothing to clone, no skill to add.

---

## How to use it

**Step 1.** Run `/insights` in Claude Code. Wait for the report.

**Step 2.** In the *same session*, paste the prompt block below, followed by everything under
"The paradigm" in this file. That is it.

If you have this file on disk you can shorten step 2 to the prompt block plus
`@content/docs/fde-mindset-paradigm.md`.

If you come back later in a fresh session, the prompt still works. It tells Claude where your
report lives on disk.

**On thin reports.** `/insights` reads the sessions you have actually run. Early in the
program you will not have many, and the report will be correspondingly thin. That is a reason
to run this again in a few weeks and diff it, not a reason to distrust it. A thin report that
says "no evidence" for four of the six traits is telling you something real: you have not been
in situations that exercise them yet. Re-run it at the end of each block.

### One thing that does not work

You cannot write `/insights based on @fde-mindset-paradigm.md` and expect the lens to be
applied. `/insights` is a built-in pipeline, not a prompt. It compresses each of your sessions
into a fixed set of fields before any model reads them:

```
underlying_goal, goal_categories, outcome, user_satisfaction_counts, claude_helpfulness,
session_type, friction_counts, friction_detail, primary_success, brief_summary
```

By the time a model can read a file you referenced, the report is already written. You would
get an ordinary report and believe the FDE lens had been applied to it. That failure is worse
than no lens at all, and noticing it is itself the skill this document is about.

---

## Prompt 1: the baseline run

Use this the first time, and only the first time.

```
Score my Claude Code usage against the FDE mindset paradigm.

EVIDENCE, in this order of preference:
1. If an /insights report was produced in this conversation, use that data directly.
2. Otherwise, read the newest file matching ~/.claude/usage-data/report-*.html, and
   every file in ~/.claude/usage-data/facets/*.json.
If neither exists, stop and tell me to run /insights first. Do not guess.

RUBRIC: the paradigm document that follows this prompt.

PRODUCE, in this order:

A. OPERATING-MODEL SPREAD
   Galent's model is Scope -> Sequence -> Build -> Ship -> Measure.
   Bucket my goal_categories across those five stages. Name which stages I live in
   and which two are thin. Quote the counts.

B. TRAIT SCORECARD
   Score me on each of the six traits: strong / mixed / no evidence.
   Every score cites specific evidence from my report. If a trait has no evidence in
   the data, write "no evidence" rather than a guess. Do not pad.

C. ANTI-PATTERN HITS
   For each friction code in my report, name the FDE anti-pattern or mindset line it
   maps to, using the mapping table in the rubric. Rank by count. For the top two,
   quote the specific incident from my report that proves it.

D. LOOP CHECK
   For my most repeated workflow: does it have a trigger? Does it have a
   machine-verifiable stopping condition? If the second is missing, say so plainly
   and name what the stopping condition should be.

E. THE ONE CHANGE
   A single change, stated as something I would do differently on Monday morning.
   Not a list. Tie it to the thinnest stage from section A.

RULES:
- Cite evidence for every claim. No claim without a number, a quote, or an incident.
- "No evidence" is a valid and expected answer. Prefer it to a flattering guess.
- Do not soften the friction sections. I am reading this to find what is wrong.
- Be specific about what I did, not about what FDEs do in general.
- If a friction or success code in my report is not in the rubric's mapping table,
  list it under "unmapped" and say what you think it maps to. Never drop a code
  silently just because the table does not cover it.
- If I have very few sessions, say so and mark the report thin rather than
  extrapolating a personality from three data points.

FINALLY, create the file ./fde-progress.md with exactly this content, filled in.
Do not print it and ask me to save it. Write the file, then tell me the path.

If ./fde-progress.md already exists, STOP and do not touch it. Tell me it exists
and that I should be using the delta prompt instead. Never overwrite that file:
it is the only record of the earlier runs and it cannot be regenerated.

# FDE progress log

Weekly self-assessment against the FDE mindset paradigm.
https://2463-fde.github.io/content/fde-insights.html

## Run 1 · <date> · end of week 6
Spread:       Scope <n> / Sequence <n> / Build <n> / Ship <n> / Measure <n>
Traits:       1:<strong|mixed|none> 2:<> 3:<> 4:<> 5:<> 6:<>
Top friction: <code> x<n>, <code> x<n>, <code> x<n>
Loop:         trigger <yes|no> · stopping condition <yes|no>
One change:   <one line, something I do differently Monday>
Carried:      n/a (baseline)
```

---

## The five-week cadence

One report is a snapshot. Five reports are a trajectory, and the trajectory is
the point. Run this at the end of each week from week 6 through week 10.

The prompts write the log for you. Run 1 creates `fde-progress.md` in whatever directory you
started Claude from, and runs 2 through 5 append to it, newest at the bottom. You never edit it
by hand. Start Claude from the same place each week so all five runs land in one file, and keep
that file somewhere you will find it again: it is what you bring to your week 10 defense.

| Run | Do it at the end of | That week covers | What to look hardest at |
|---|---|---|---|
| **1** baseline | **Week 6** · AI-Augmented SDLC | The SDLC loop itself | **Section D, the loop check.** You will have just built loops. Do yours have a stopping condition, or do they stop when the agent says so? |
| **2** | **Week 7** · Observability, SRE & Guardrails | Measuring running systems | **The Measure stage.** Observability is Measure wearing an engineering hat. If your spread is still empty there the week did not transfer. |
| **3** | **Week 8** · Security, Governance & Responsible AI | Hardening, phase 3 | **Trait 2, calibration.** Watch for `excessive_changes` appearing as you learn to harden. "Precision is the entry fee" is not the same as gold-plating. |
| **4** | **Week 9** · Client Specialization Track | Working a real client domain | **The Scope stage, and traits 1, 3 and 6.** This is the week the XY problem is available to you for the first time. Did `wrong_approach` fall? |
| **5** | **Week 10** · Project Work & Client Showcase | Shipping and defending | **The shelfware test.** Read your `outcome` counts. Did anyone adopt the thing, and can you defend the whole arc from Scope to Measure? |

Two rules that make this a cadence rather than five disconnected reports:

1. **Every run after the first must answer the previous run's "one change."** Did you do it?
   Did it move anything? That is the `Carried:` line, and it is the only line that cannot be
   answered by the report alone.
2. **Do not chase a good score.** A run where three traits read "no evidence" is more useful
   than one where you went looking for evidence to flatter yourself. The report reads your
   real sessions. You cannot revise it after the fact, which is exactly what makes it worth
   reading.

### Prompt 2: the delta run

Use this for runs 2 through 5, in place of prompt 1.

```
Score my Claude Code usage against the FDE mindset paradigm, as a DELTA.

EVIDENCE:
1. My progress log is at ./fde-progress.md (or tell me if you cannot find it).
   Read every prior run entry.
2. Fresh data: if an /insights report was produced in this conversation, use it.
   Otherwise read the newest ~/.claude/usage-data/report-*.html and every
   ~/.claude/usage-data/facets/*.json.
If either source is missing, stop and say which. Do not guess.

RUBRIC: the paradigm document that follows this prompt.

PRODUCE:

A. CARRIED. Quote the previous run's "One change." Using only evidence from the
   new sessions, judge it: done / partly done / not done / cannot tell. Cite the
   evidence. "Cannot tell" is an acceptable and useful answer.

B. MOVEMENT. For each of: the five-stage spread, the six traits, and my top
   three friction codes, state the direction against the last run. Up, down, or
   flat, with both numbers. Ignore anything that moved less than the noise in a
   sample this size, and say when you are ignoring something for that reason.

C. WHAT IS STUCK. Name the one thing that has not moved across every run so far.
   This is the most valuable section. Be blunt about it.

D. THIS WEEK'S LENS. My focus for this run is: <paste the "look hardest at"
   cell for this run from the cadence table>. Score that specifically and in
   more depth than the rest.

E. THE ONE CHANGE. A single change for next week. If the previous run's change
   was not done, say plainly whether to carry it forward or drop it, and why.

RULES:
- Cite evidence for every claim. No claim without a number, a quote, or an incident.
- Do not manufacture improvement. Flat is a finding. Regression is a finding.
- Never drop a friction or success code that is not in the rubric's mapping table.
  List it as unmapped and say what you think it maps to.
- End by APPENDING my log entry to ./fde-progress.md, in the same format as the
  earlier entries, incrementing the run number and filling the Carried: line
  from section A. Append only. Never rewrite or reformat the earlier entries,
  and never drop one, even if an earlier entry looks wrong or incomplete. Tell
  me the path once you have written it.
```

---

## The paradigm

### The operating model

> **Scope → Sequence → Build → Ship → Measure**
> "Turning enterprise AI projects from long-cycle pilots into continuous value loops."

Most engineers, most of the time, live in Build and Ship. Those are the two stages where the
work feels like work. Scope and Measure are the two that get skipped, and they are the two that
decide whether the thing you built mattered.

Galent's four FDSE phases say the same thing in verbs:

1. **Problem Decomposition & Scoping.** Defining solvable technical challenges by asking the
   right questions. Note that it is first.
2. **Rapid Prototyping & Iteration.** Building side by side with users.
3. **Optimization & Hardening.** Performance, security, scale.
4. **Deployment & Feedback Loop.** Deploy, train, feed insights back.

When you bucket your own `goal_categories`, be honest about which bucket each one lands in.
`feature_implementation` and `bug_fixing` are Build. `deployment` is Ship. `code_review` and
`testing_verification` are Measure. If your Scope bucket is empty, that is the finding.

### The six traits

Memorize the order. It is the shape of every defense, retro, and review in this program.

1. **Relentlessly curious about the customer's world.** Surface the problem the customer gave
   up on or never articulated. Become a user before you become a builder.
2. **Calibrate engineering to the situation.** Know when to build a robust system and when to
   write a script that just works. Both over-engineering and under-engineering leave scars.
3. **Communicate across audiences.** Same problem, different language for the CTO and the eng
   lead. If you cannot explain it in one page without jargon, you do not understand it.
4. **Stay calm when things break.** Things will break. Crisis composure matters as much as the
   fix.
5. **Own outcomes without authority.** Get a team that does not report to you to act, by
   explaining the why.
6. **Know when to push back.** Do not just do what the customer asks. Push back with an
   alternative, not a no.

### The four core moves

The verbs, not the virtues.

- **Detect problems.** Separate what users say they want from what they actually need.
- **Demonstrate through action.** Build to show, do not tell.
- **Control the narrative.** Own how the work is understood across audiences.
- **Ship fast while maintaining production quality.**

### The anti-patterns

The wrong instinct that looks right.

| Anti-pattern | Why it is a trap |
|---|---|
| **Overengineering** | Two weeks on a configurable dedup engine when a one-time SQL query was needed. The customer cared about Friday. |
| **Solving the wrong problem** | Building Y, the literal ask, instead of X, the real need. The most expensive mistake. |
| **Retreating into code** | When a meeting gets tense, hiding behind the laptop. Stay present. |
| **Building without seeing the data** | Empty date, epoch 1970, 2.3M keyspaces, 14TB RAM to boot, OOM. They had never looked at the real data. |
| **Throwing it over the wall** | The old model the FDE role exists to correct. |
| **Cannot set boundaries** | FDE work expands to fill all available time. Saying no is a survival skill. |

### The principles worth quoting back

- **The XY problem.** Customers ask for Y when they need a solution to X. The single most
  important FDE question: *what are you trying to accomplish?*
- **Shelfware is the enemy.** Most enterprise software fails not because it is broken but
  because it is never adopted.
- **Underpromise, overdeliver.** "Done Wednesday, finished Tuesday" beats "done Monday,
  finished Wednesday."
- **Credibility is points you can spend.** You earn the right to disagree by being right and
  delivering.
- **Calm is preparation, not personality.**
- **The telephone game.** Every person a technical message passes through degrades it.

### Loop Engineering, and the line that matters most

> "Stop prompting your AI agent. Start designing the loop that prompts it for you."
> Traditional automation runs Step 1 → Step 2 → Step 3. A loop runs
> **Observe → Decide → Act → Verify → Repeat.**

Every loop needs exactly two things:

- **A trigger.** A pull request, a failed CI run, a Slack message, a scheduled job, a command.
- **A machine-verifiable stopping condition.** Tests pass. CI is green. A reviewer model
  confirms the UI matches the spec. A score clears a threshold.

> "Without a measurable stopping condition, you haven't built a loop. You've built a very
> confident token furnace."

And the line to tape to your monitor:

> **"Never let the agent decide it's finished simply because it says so."**

Almost everyone who runs long autonomous sessions has built the trigger half and skipped the
verification half. That is why `buggy_code` is the most common friction code in practice. The
agent said done, and nobody checked the delivered artifact.

The second named challenge is cost: hard limits on maximum iterations, no-progress detection,
and daily token budgets. If your report shows `resource_limit_hit`, you skipped this one.

### Where the discipline sits

Galent's Grand Prix framing: **Machine** (the AI stack), **Driver** (the FDE), **Crew** (the
delivery team).

> "There is no 'good enough' in AI-native delivery. Precision is not a feature. It's the entry
> fee."

Useful when reading your own report, because it tells you which failures are yours. A flaky
API or a tool limitation is a machine failure. Choosing to build the wrong thing is a driver
failure. Do not take credit for the machine and do not blame it for your scoping.

### HITL is your own direction-check

Human-in-the-loop is not only a feature you ship. It is the FDE's discipline of periodically
zooming out from the code:

- What are the finalized deliverables?
- Am I crossing them off?
- Where is the discrepancy?
- What is too rigid to survive the customer's real constraints?

Build that checkpoint into your own cadence. Do not wait for a review to run it for you.

---

## The mapping table

This is what makes the scoring falsifiable instead of a vibe. Each code is a real field value
from your own report.

### Friction codes → mindset failures

| Report code | What it maps to |
|---|---|
| `buggy_code` | A loop with no verifiable stopping condition. "Never let the agent decide it's finished simply because it says so." Often also *building without seeing the data*. |
| `wrong_approach` | The XY problem. *Solving the wrong problem.* Phase 1 scoping was skipped. |
| `misunderstood_request` | Scope failure, your side. The telephone game, with you as a link in the chain. |
| `stale_or_incorrect_prior_artifacts` | Trusting a document over the system. Trust nothing, trace everything. |
| `resource_limit_hit` | Loop Engineering cost control missing: no max iterations, no no-progress detection, no budget. |
| `excessive_changes` | **Overengineering.** Trait 2, calibration, in the expensive direction. |
| `incomplete_task` / `incomplete_work` | Underpromise and overdeliver, inverted. |
| `user_rejected_action` | Direction drift caught late. Your HITL check should have fired first. |
| `blocked_on_external_dependency` | Trait 5, owning outcomes without authority. Who did you need, and did you go get them? |
| `api_error` / `tooling_failure` / `tool_limitation` | Machine layer, not driver layer. Do not score yourself down for these. |

### Success codes → traits demonstrated

| Report code | What it demonstrates |
|---|---|
| `proactive_help` | **Detect problems.** Core move 1. |
| `multi_file_changes` | **Ship fast at production quality.** Core move 4, if outcome held. |
| `good_debugging` | Calm is preparation, not personality. Trait 4. |
| `correct_code_edits` | Precision is the entry fee. |
| `good_explanations` | Communicate across audiences. Trait 3. |
| `fast_accurate_search` | Curiosity about the system you are in. Trait 1, junior form. |

### Signals that need interpretation, not scoring

- **`iterative_refinement` sessions.** Healthy if it is phase 2, rapid prototyping with a user
  in the loop. Unhealthy if `wrong_approach` or `misunderstood_request` appear in the same
  sessions, because then it is rework paying down scoping debt.
- **`dissatisfied` counts.** Look at what you rejected. Rejecting weak work is trait 6 and it
  is good. Rejecting work you scoped badly is a Scope failure wearing a trait-6 costume. The
  difference is whether you could have said it up front.
- **`mostly_achieved` vs `fully_achieved`.** A wall of "mostly" is the shelfware warning. Ask
  what the missing slice was every time, because that slice is usually the part a user would
  have touched.

---

## The three questions

Whatever the report says, answer these in your own words before you close it.

1. **Where did I start?** Did I start at the problem, or did I start at the ask? If every
   session opens at Build, you are being handed Y and building Y.
2. **How did I know I was done?** Name the machine-verifiable condition. If the answer is
   "Claude said it was finished," you have a token furnace, not a loop.
3. **Who adopted it?** Not "did it merge." Did anyone use it. Shelfware is the enemy.

---

## Sources

- FDE Mindset Atlas, `content/atlas/` (six traits, four core moves, anti-patterns, principles,
  HITL direction-check). Primary citations: Vinoo Ganesh, *Forward Deployed Engineering*
  (Project Frontline) and *Build Products Like a Forward Deployed Engineer*.
- Galent, *Beyond the Build: Why Forward-Deployed Engineers Are the New Face of Tech*
  (role definition, four phases, Scope → Sequence → Build → Ship → Measure).
- Galent, *The Grand Prix Model of AI Delivery* (machine / driver / crew, spec-driven
  development, "precision is not a feature").
- Galent, *Loop Engineering: Why the Next Leap in AI Development Isn't a Better Prompt*
  (trigger plus verifiable stopping condition, cost control, the token-furnace line).
- Week 5 alignment review, `content/docs/w05-fde-alignment-review.md`, for how this same
  paradigm was applied to the curriculum itself.

Galent is a sister company, not this cohort's client. It is used here as a consistency
reference so that an engineer moving between orgs hears one vocabulary rather than two.
