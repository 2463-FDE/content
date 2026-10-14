# w06d4 — Brownfield & Legacy Modernization with Agents (LEGMOD)

> Research brief for authoring. Verify-first; every claim is backed by a primary/official source fetched and confirmed. Scope: agent-driven legacy comprehension, characterization tests, strangler-fig + transitional architecture, incremental modernization with validation. (E2E feature delivery is d5; observability is W7 — out of scope here.)

**Version stamps (verified 2026-07-01):**
- **Strangler Fig (Fowler bliki)** — term coined 2001; the bliki entry was substantially rewritten **2024-08-22** and retitled from "Strangler Application" to "Strangler Fig Application."
- **Azure Architecture Center — Strangler Fig pattern** — current revision dated **2026-05-29**; now includes an explicit database-decomposition example (ETL + CDC sync + validated cutover) and cross-references the Anti-corruption Layer pattern.
- **GitHub Copilot app modernization** — **GA for Java and .NET since 2025-09-22** (changelog); official docs describe a four-phase assess → plan → upgrade → validate agent workflow with build/test/CVE validation loops.
- **AlphaTrans** (arXiv 2410.24117) — v5 **2025-06-19**, published at FSE 2025; repository-level neuro-symbolic code translation with test-based validation.
- **Claude Code docs** — `code.claude.com/docs/en/common-workflows` has first-class "Understand new codebases" and "Refactor code" recipes (broad→narrow questioning, trace execution flows, refactor "in small, testable increments," delegate exploration to subagents).

---

## Claims

### Agents flip the legacy bottleneck: comprehension, not code generation
- Thoughtworks (Ferri, Coggrave, Sheth — martinfowler.com, Sep 2024): GenAI's biggest modernization value is understanding existing systems, because "developers spend a lot more time reading code than writing it." Their CodeConcise accelerator parses the codebase into an AST-derived **knowledge graph**, letting LLM traversal "reduce noise (i.e. unnecessary code) from the context provided to LLMs." Measured result: reverse-engineering a mainframe module went **from 6 weeks to 2 weeks**, projected at ~240 FTE-years saved across the client's program. Caveat from the same article: dead-code detection stays with static analysis — "GenAI offers minimal value here." [Legacy Modernization meets GenAI — martinfowler.com](https://martinfowler.com/articles/legacy-modernization-gen-ai.html)
- Empirical support for LLM comprehension of genuinely dead languages: MITRE et al. evaluated LLM-generated line-by-line documentation for **MUMPS** (EHR system) and **IBM mainframe Assembly (ALC)** — comments were largely accurate and useful, but "no automated metrics strongly correlate with comment quality," so human review of generated legacy documentation remains essential. [Leveraging LLMs for Legacy Code Modernization — arXiv 2411.14971](https://arxiv.org/abs/2411.14971)
- Day-to-day agent workflow for brownfield entry: Claude Code's official recipe is broad→narrow ("give me an overview of this codebase" → "how is authentication handled?" → "trace the login process from front-end to database"), plus "find deprecated API usage in our codebase" for refactor targeting, and "use a subagent to investigate…" so exploration reads don't pollute the main context. Refactors should "maintain the same behavior" and go "in small, testable increments." [Common workflows — Claude Code Docs](https://code.claude.com/docs/en/common-workflows)

### Characterization tests: pin down actual behavior before an agent touches anything
- Feathers (who coined the term in *Working Effectively with Legacy Code*): "the purpose of characterization testing is to document your system's actual behavior, not check for the behavior you wish your system had." Once code is in production "it becomes its own specification. We need to know when we are changing existing behavior regardless of whether we think it's right or not." Mechanics: write a test with a dummy expectation (e.g. `null`), run it, record the actual value as the assertion, rename the test to describe what you learned; repeat across inputs. The hard part is breaking dependencies enough to get the code into a harness. [Characterization Testing — Michael Feathers](https://michaelfeathers.silvrback.com/characterization-testing)
- Teaching angle for agents: this is the single highest-leverage pre-agent step in brownfield work — generating characterization tests is mechanical (agents are good at it), and the resulting suite is the tripwire that catches an agent's silent behavior changes during refactoring/translation. The legacy system is the oracle; the agent must never be.

### Strangler fig: incremental replacement behind a façade, never big-bang
- Fowler's 2024 rewrite frames it as four activities: understand the outcomes you want, identify parts that can be **independently replaced**, deliver replacements in manageable pieces, and drive the organizational change to sustain it. New work is "small additions, often new features, that are built on top of, yet separate to the legacy code base." Replacing small components at a time cuts risk, and early value from new components justifies the **transitional architecture** — temporary code that exists only so old and new can coexist. [Strangler Fig Application — martinfowler.com](https://martinfowler.com/bliki/StranglerFigApplication.html)
- Azure Architecture Center (rev. 2026-05-29) gives the operational shape: a façade (proxy) intercepts requests and routes each to legacy or new; routing shifts incrementally until the legacy system has no traffic, then it's decommissioned and the façade removed. Considerations that matter in practice: keep the façade from becoming a single point of failure or bottleneck; structure the *new* services so they can themselves be strangled later; the pattern doesn't fit when requests can't be intercepted or when you can't modify legacy source. [Strangler Fig pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
- Cross-system dependencies during coexistence go through an **Anti-corruption Layer**: "an adapter that translates requests between the two systems… protects the new system's design from legacy semantics." Without it, "cross-system dependencies can break components or force the new system to adopt legacy conventions." [Strangler Fig pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)

### Data migrates incrementally too, with validation gates and a rollback window
- The Azure doc's database example is the template for stateful strangling: (1) new domain service still reads/writes the monolith DB; (2) stand up an isolated domain DB — ETL for history, **CDC sync** for ongoing changes, and "validate consistency between both databases before cutover"; (3) cut over, then remove domain tables from the monolith. Rollback stays cheap through phase 2 and early phase 3; deleting legacy objects is "a deliberate final step… only after the new system is validated." [Strangler Fig pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)

### Agent-driven translation/modernization works repository-scale — but validation is the product
- **AlphaTrans** (FSE 2025) does neuro-symbolic, compositional repository-level translation of "both source and test code," validating syntactic correctness, runtime behavior via translated test execution, and functional correctness via assertions. On 10 projects (836 classes, 8,575 methods, 2,719 tests): **96.4% syntactic correctness** of 17,874 fragments — but only **~25–27%** passed runtime/functional validation, and developers still needed ~20 hours per project to reach full test passage. The gap between "compiles" and "behaves the same" is the whole lesson. [AlphaTrans — arXiv 2410.24117](https://arxiv.org/abs/2410.24117)
- **GitHub Copilot app modernization** (GA Java + .NET, Sep 22 2025) is the shipped version of this loop: **assess** (code, config, dependency analysis) → **plan** (customizable modernization path, saved as plan.md/tasks) → **upgrade** (code changes, build files, deprecated-API refactors) → **validate** (build patching, test validation after each step, CVE checks, generated reports). Human-in-the-loop is explicit: "you may frequently be prompted by Copilot cloud agent for confirmation before it performs specific actions," and docs direct teams to review architectural fit and testing gaps before deployment. [Modernizing Java applications with GitHub Copilot — GitHub Docs](https://docs.github.com/en/copilot/tutorials/modernize-java-applications) · [GA announcement — GitHub Changelog](https://github.blog/changelog/2025-09-22-github-copilot-app-modernization-is-now-generally-available-for-java-and-net/)

---

## Concept IDs

Scoped to this day (brownfield/LEGMOD with agents). d5 E2E delivery, W7 observability, and W5 spec/planning excluded.

- **`agent-legacy-comprehension`** — Using agents to read, not write: broad→narrow codebase Q&A, execution-flow tracing, subagent-delegated exploration, and AST/knowledge-graph context (CodeConcise) to reverse-engineer legacy behavior; human review stays mandatory because comment/doc quality has no reliable automated metric.
- **`characterization-tests`** — Feathers' pin-down technique: dummy expectation → run → record actual value; documents actual (not desired) behavior so production code becomes its own spec, and forms the tripwire that catches agent-introduced behavior drift.
- **`strangler-fig-migration`** — Façade/proxy intercepts requests and shifts routing from legacy to new in increments; replace independently-identifiable pieces, decommission legacy at zero traffic, remove façade last; not applicable when requests can't be intercepted or legacy source can't change.
- **`transitional-architecture-acl`** — Temporary coexistence scaffolding: the façade itself plus an anti-corruption layer that translates between old and new semantics so the new system isn't polluted by legacy conventions; deliberately built to be thrown away.
- **`incremental-data-cutover`** — Strangling stateful pieces: ETL history load + CDC sync, consistency validation before cutover, and preserving a cheap rollback window until the new store is validated as system of record.
- **`agentic-modernization-pipelines`** — Productized assess → plan → transform → validate loops (Copilot app modernization GA, AlphaTrans): translation is repo-scale and fast, but the validation gap (96% compiles vs ~25% behaves) makes test-based verification and HITL confirmation the real deliverable.

---

## Sources

All fetched and verified 2026-07-01.

1. [Strangler Fig Application — martinfowler.com (bliki, rev. 2024-08-22)](https://martinfowler.com/bliki/StranglerFigApplication.html)
2. [Strangler Fig pattern — Azure Architecture Center (rev. 2026-05-29)](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
3. [Legacy Modernization meets GenAI — Ferri, Coggrave, Sheth, martinfowler.com (2024-09-24)](https://martinfowler.com/articles/legacy-modernization-gen-ai.html)
4. [Characterization Testing — Michael Feathers](https://michaelfeathers.silvrback.com/characterization-testing)
5. [Leveraging LLMs for Legacy Code Modernization (MUMPS / IBM ALC) — arXiv 2411.14971](https://arxiv.org/abs/2411.14971)
6. [AlphaTrans: Repository-Level Compositional Code Translation and Validation — arXiv 2410.24117 (FSE 2025)](https://arxiv.org/abs/2410.24117)
7. [Modernizing Java applications with GitHub Copilot — GitHub Docs](https://docs.github.com/en/copilot/tutorials/modernize-java-applications)
8. [GitHub Copilot app modernization GA for Java and .NET — GitHub Changelog (2025-09-22)](https://github.blog/changelog/2025-09-22-github-copilot-app-modernization-is-now-generally-available-for-java-and-net/)
9. [Common workflows (Understand new codebases, Refactor code) — Claude Code Docs](https://code.claude.com/docs/en/common-workflows)
