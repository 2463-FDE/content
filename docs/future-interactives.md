# Future Interactives — deferred "try it" examples

Each reading drops `.ix-future` placeholders where a live interactive belongs.
These need backend standup (an endpoint that runs the example against the tech being taught)
before they become functional `ix-run` blocks. Tracked here per the fan-out plan.

> **W2 status (2026-07-06): DONE, client-side.** All 15 W2 `.ix-future` stubs below were
> replaced with functional client-side widgets (`assets/js/interactive-rag.js`, baked/tuned
> demo data — no backend). Each W2 day also gained a read-only VS Code-style "production code"
> popup (`assets/js/codeviewer.js`) at its key concept. Making retrieval *actually live*
> (real embeddings + a real vector store) is scoped in `content/docs/rag-vector-store-decision.md`
> — recommendation: Cloudflare Workers AI bge-small embeddings + Chroma Cloud free tier,
> orchestrated by the Worker. The sims stay as the offline fallback. The W2 entries below are
> retained as the design record.

## w02d1
- **chunking-strategy** — Step 3: paste a document, pick fixed/recursive/semantic and a chunk size, watch the splitter draw chunk boundaries live.
- **chunk-overlap** — Step 4: slide chunk size and overlap and watch retrieved chunks change, including a fact split across two chunks recovered only once overlap is high enough.
- **embedding-dimensions** — Step 5: embed two phrases, see cosine similarity, plus how truncating dimensions changes the score.
- **hybrid-retrieval** — Step 7: run one query dense-only, BM25-only, and hybrid against a sample corpus and compare top-k chunks.

## w02d2
- **matryoshka-representation-learning** — Dimensionality slider: embed a fixed query and corpus once, then drag from 3072 down to 256 dims and watch recall and storage size move together to find the smallest vector that still hits the quality bar. Needs backend standup.
- **sparse-vs-dense-retrieval** — Dense-vs-sparse playground: run the same query through a dense embedding and a sparse lexical vector side by side, then blend into a hybrid score. Needs backend standup.
- **similarity-metrics** — Metric explorer: embed two phrases and score them under cosine, dot product, and L2 at once, watching ranking and score range change. Needs backend standup.

## w02d3
- **hybrid-retrieval / alpha weighting** — Query box with a live alpha slider (0 to 1): type a question, drag alpha, and watch the dense-leaning vs sparse-leaning result lists reorder in real time. Placed in the fusion/normalization step (data-step 3). Needs backend standup.
- **cross-encoder-reranking** — Side-by-side viewer showing the fused top-20 candidate list before re-ranking vs after a cross-encoder pass, with each document's rank change animated to visualize precision being restored. Placed in the re-ranking step (data-step 6). Needs backend standup.

## w02d4
- **context-precision** — Paste a question and ranked retrieved chunks, mark relevant ones, watch precision@k recompute live as chunks are reordered. Needs backend standup.
- **faithfulness** — Submit a response plus its retrieved context and watch faithfulness run: claims extracted, each marked supported/unsupported, then supported-over-total computed. Needs backend standup.
- **llm-as-judge-eval** — Run a Ragas-style eval over a small labeled question set; all four metrics populate a stage-split scorecard (retrieval vs generation). Needs backend standup.

## w02d5
- **recursive-character-splitting** — Paste a document and drag chunk_size / chunk_overlap sliders to watch the RecursiveCharacterTextSplitter redraw chunk boundaries live, seeing where a paragraph survives intact versus gets severed. Needs backend standup.
- **bi-encoder-retrieval** — Type a query and watch the bi-encoder return its top ~100 candidates with similarity scores, inspecting whether the gold/answer chunk made the shortlist (a Context Recall check). Needs backend standup.
- **faithfulness** — Run Ragas Faithfulness on a generated answer: see the answer decomposed into atomic claims and each claim marked supported or unsupported against the retrieved context, yielding the supported/total score. Needs backend standup.

## W3–W8 current inventory

**Status: deferred, not live.** The shipped pages contain 72 `.ix-future` placeholders across W4–W8. W3 has no placeholders because its client-side agent widgets are already implemented. The entries below inventory the placeholder copy already present in the reading pages; they do not promise a backend, launch date, or live provider connection.

### Week 4

#### w04d1 — Multi-Agent Orchestration Patterns (3)

- **Swarm: peers hand off directly, no manager** — Planned: run the same three-agent support team as a supervisor and as a swarm on the same conversation, and diff the message traffic — every result round-tripping through the hub versus direct peer handoffs with the sticky active agent picking up turn two. Needs backend standup.
- **A handoff is just a tool call** — Planned: wire two OpenAI Agents SDK agents with a `transfer_to_refund_agent` handoff, send one message, and inspect the raw tool call — then re-run with an `input_filter` attached and diff exactly what history the receiving agent saw each time. Needs backend standup.
- **Orchestrator-worker: parallelism with a price tag** — Planned: fan a research question out to 1 vs 4 parallel subagents and watch a live token meter climb toward the ~15× multiple alongside the coverage gain — feel the economics, not just read them. Needs backend standup.

#### w04d2 — Durable Agents: State, Checkpointers & the Art of Not Losing Your Place (3)

- **Checkpoints: a save file for every step** — Planned: a crash-and-resume lab — start a five-node refund graph with a real `thread_id`, kill the process at step 3 with a big red button, then re-invoke the same thread and watch it resume from the last checkpoint (and watch a fresh `thread_id` start from nothing, for contrast). Needs backend standup.
- **interrupt(): pausing is just a checkpoint** — Planned: an approval-gate console — the refund agent hits `interrupt()` and its payload appears as a real approve/reject card; click approve and watch `Command(resume=True)` re-enter the node, or reject and watch the conditional edge route to a revision loop. Needs backend standup.
- **Replay and fork: the history is a data structure** — Planned: a time-travel explorer — scrub through a real thread's checkpoint history on a timeline, pick a `checkpoint_id` to replay (and watch the re-executed LLM step come back different ), then `update_state` a fork and see both branches side by side. Needs backend standup.

#### w04d3 — Alt Research: CrewAI & AutoGen vs LangGraph (3)

- **Handoffs are tools that return a Command** — Planned: a Command-handoff tracer — step through a two-agent LangGraph run, watch the handoff tool emit `Command(goto="billing_agent", graph=Command.PARENT)` with its state update, and toggle the paired `ToolMessage` off to see the malformed-history failure the docs warn about. Needs backend standup.
- **CrewAI: orchestration is an enum and a manager** — Planned: a crew-run inspector — define a three-agent crew, toggle between the sequential and hierarchical processes with a manager model, and watch the task-allocation decisions the manager makes, and re-makes, on the same input. Needs backend standup.
- **One axis, three positions — making the call like an FDE** — Planned: a pattern-translation board — describe a client workflow in one sentence and see it mapped side-by-side into all three stacks (LangGraph supervisor/swarm code sketch, CrewAI Process + delegation flags, MAF orchestration choice), with the explicitness tradeoff annotated on each. Needs backend standup.

#### w04d4 — Knowledge Graphs & Cypher: When Retrieval Needs Relationships (3)

- **Nouns become labels, verbs become relationships** — Planned: a schema-builder panel — paste three sentences describing a client domain, highlight the nouns and verbs, and watch them assemble into a labeled property-graph schema you can then test against sample use-case questions. Needs backend standup.
- **Neo4j's vector index: semantic search and traversal in one store** — Planned: a live Cypher console against a small seeded movie graph — create the vector index, run `db.index.vector.queryNodes` with a real embedded question, and inspect the returned nodes and similarity scores. Needs backend standup.
- **Text2Cypher: retrieval by writing the query** — Planned: a Text2Cypher playground — type a natural-language question, see the LLM-generated Cypher and the executed results side by side, then vandalize the schema (rename `ACTED_IN` to `RELATED_TO`) and watch the generated query degrade. Needs backend standup.

#### w04d5 — GraphRAG End-to-End: When Retrieval Grows a Graph (3)

- **SimpleKGPipeline: docs in, graph out** — Planned: paste a short incident report and run a live `SimpleKGPipeline` pass — watch the splitter, embedder, and extractor stages fire and the extracted entity graph render node by node. Needs backend standup.
- **The retriever ladder: vector entry, graph expansion** — Planned: fire the same question at a `VectorRetriever` and a `VectorCypherRetriever` side by side and diff the retrieved context — see exactly what the graph hop added. Needs backend standup.
- **Local vs global search: match the mode to the question's shape** — Planned: ask one entity question and one "top themes" question against the same indexed corpus, toggling local vs global mode — watch local fan out from entities while global map-reduces over community summaries. Needs backend standup.

_Week 4 subtotal: 15 deferred placeholders._

### Week 5

#### w05d1 — Spec Before Code: Architecture Before Implementation (3)

- **Phase gates: Specify → Plan → Tasks → Implement** — Planned: walk one real feature request through all four Spec Kit gates live — draft the spec, watch the plan and the task list get generated from it, reject one artifact at a gate, and see the correction ripple forward instead of surfacing as broken code three phases later. Needs backend standup.
- **Current state → target state (and the parity trap)** — Planned: a target-state worksheet — feed in a legacy module's real behavior, mark each feature keep / drop / redesign with a one-line justification, and watch the generated spec shrink as you cut the unused half. Needs backend standup.
- **The rigor spectrum: when SDD is overkill** — Planned: a triage drill — ten real work items (typo fix, schema migration, payment flow, demo script…) sorted onto the spec-first / spec-anchored / spec-as-source / no-spec spectrum, with instant feedback arguing the placements you got wrong. Needs backend standup.

#### w05d2 — Requirements Synthesis: Reframe, Then Specify (3)

- **Dig where the evidence is, on a coverage checklist** — Planned: a live interview-practice widget — you play the FDE against an AI stakeholder holding this week's hidden problem; it scores your coverage of the four NN/g areas, flags closed-ended questions, and tells you whether you reached the reframe before the call ended. Needs backend standup.
- **EARS: five sentence shapes that remove interpretation** — Planned: an EARS rewriting drill — you're dealt vague stakeholder quotes ("it should handle errors gracefully"), pick the right EARS pattern, and rewrite; an AI grader checks clause order, singularity, and verifiability against 29148. Needs backend standup.
- **Acceptance criteria: the rule, instantiated as examples** — Planned: a reframe-to-spec sandbox — feed in this week's client ask plus its handover artifacts and watch an agent propose a reframe, draft EARS requirements with `[NEEDS CLARIFICATION]` markers, and regenerate the Gherkin as you answer its questions. Needs backend standup.

#### w05d3 — The Spec-Driven Tooling Landscape (3)

- **Spec-kit: a fixed artifact pipeline of slash commands** — Planned: a live spec-kit sandbox — type a one-line feature ask, watch the specify → plan → tasks commands generate the three artifacts side by side, then edit the spec and see the downstream artifacts regenerate. Needs backend standup.
- **Kiro specs: three files, approval gates, EARS** — Planned: an EARS rewriting drill — you get five mushy client requirements ("it should be fast", "handle bad input sensibly") and rewrite each as WHEN/SHALL; an LLM grader scores testability and traceability against a rubric. Needs backend standup.
- **ADRs: lock the decision, keep the receipt** — Planned: an ADR writing exercise — given a scenario (team must choose between Postgres and DynamoDB under stated constraints), draft a Nygard-format ADR in the browser and get LLM review against the format: is Context neutral? are negative Consequences present? is exactly one decision captured? Needs backend standup.

#### w05d4 — Decomposition: From Spec to Phased Plans (3)

- **Every task ends in a check that passes or fails** — Planned: a decomposition workbench — paste a short spec, draft the phase breakdown and per-task checks yourself, then have the harness run each task statement through a "pass/fail-able?" linter and the Phase −1 gates, flagging any task whose completion is a matter of opinion. Needs backend standup.
- **Performance targets must be SLO-shaped** — Planned: an SLO target workbench — pick SLIs for a sample multi-tenant API, set target values per phase, then replay a simulated week of traffic and watch which phases' gates would have passed or blown their error budget. Needs backend standup.
- **Security NFRs: pick an ASVS level, cite requirement IDs** — Planned: an ASVS level picker — describe a fictional client system (data sensitivity, exposure, compliance context), choose L1/L2/L3 and defend it, then get a generated security-NFR section with real chapter-level ASVS citations to compare against your reasoning. Needs backend standup.

#### w05d5 — Spec-to-Implementation Handoff, End to End (3)

- **Analyze: the last defense before code exists** — Planned: a seeded spec/plan/tasks bundle with three planted inconsistencies (a dropped requirement, a plan that contradicts the spec, an orphan task). You hunt them by hand, then run the checklist + analyze gates and compare your findings against the tool's. Needs backend standup.
- **Give the implementer a check it can run** — Planned: two agent transcripts for the same task — one asserting "done, everything works," one showing the failing check, the fix, and the passing rerun. You mark which one you'd trust and why, then write the one-line verification step you'd add to the spec. Needs backend standup.
- **A fresh context reviews the diff — gaps, not style** — Planned: paste a diff plus its plan; a fresh-context reviewer agent returns findings, and you triage each one — real gap vs. over-engineering bait — against the "correctness or stated requirements" bar. Needs backend standup.

_Week 5 subtotal: 15 deferred placeholders._

### Week 6

#### w06d1 — Coding Agents: the Landscape, and Claude Code Up Close (3)

- **The CLI is Unix-composable — and CI-ready** — Planned: a sandboxed terminal that runs `claude -p` against a tiny demo repo — pipe a log file in, watch a headless answer come back, then chain two calls in a script. Needs backend standup.
- **Deny → ask → allow, first match wins** — Planned: a permission-rule evaluator — paste a deny/ask/allow ruleset plus a candidate command, and step through which rule matches first and why the broad deny beats the narrow allow. Needs backend standup.
- **Hooks: deterministic code at lifecycle events** — Planned: a hook playground — attach a PreToolUse hook to a sample tool call, toggle its exit code between 0, 1, and 2, and watch the call pass, warn, or block with stderr fed back to the model. Needs backend standup.

#### w06d2 — The Agentic SDLC: Plan, TDD & Review Loops (3)

- **Explore → Plan → Implement → Commit** — Planned: a plan-mode sandbox — the same seeded ticket run twice against a demo repo, once straight-to-code and once through Explore → Plan → Implement, with the two diffs side by side so you can see the wrong-problem failure happen live. Needs backend standup.
- **Give the agent a check it can run — or you become the check** — Planned: a verification-ladder simulator — the same flaky task run at each rung (prompt-only, /goal, Stop hook, verification subagent), showing where "looks done" slips through and where the loop mechanically closes. Needs backend standup.
- **Pipeline citizens: @claude, headless mode, and guardrails** — Planned: a headless fan-out lab — point a headless run at a batch of seeded files with JSON output and scoped tool permissions, watch OK and FAIL results stream back, and tighten the prompt until the batch goes clean. Needs backend standup.

#### w06d3 — Alt Research: Cursor, Aider & Copilot vs Claude Code (3)

- **Aider: the terminal OG and the repo-map idea** — Planned: a repo-context strategy lab — point it at a sample repo and see the three strategies side by side: the graph-ranked ~1k-token repo map aider would build, the chunks an embedding index would retrieve for a query, and the grep/read trail an agentic search takes — with token cost and freshness annotated for each. Needs backend standup.
- **Copilot: from autocomplete brand to agent platform** — Planned: a delegation drill — write the issue description you'd hand to a cloud agent for a small real task, then an LLM grader reviews it against a delegation rubric (acceptance criteria present? scope bounded? test expectations stated?) and shows the draft PR a vague version would likely have produced. Needs backend standup.
- **Benchmarks: what SWE-bench and the polyglot board actually measure** — Planned: a benchmark-claims workbench — paste a vendor's "X% on SWE-bench" quote and it extracts variant, scaffold, and date, flags what's missing, and shows how the same model's score moves across variants and harnesses. Needs backend standup.

#### w06d4 — Brownfield: Modernizing Legacy Systems with Agents (3)

- **Broad → narrow: the comprehension workflow** — Planned: a legacy comprehension console — a seeded, undocumented legacy repo you interrogate broad→narrow ("overview" → "how does billing work?" → "trace one invoice"), with a live view of what each question cost in context and what the subagent actually read. Needs backend standup.
- **Characterization tests: the code is its own spec** — Planned: a characterization workbench — a mystery legacy function behind an API; you probe it with inputs, record actual outputs into a pin-suite, then an agent "refactors" it and your suite either catches the behavior drift or doesn't. Needs backend standup.
- **Data strangles last: ETL, CDC, and the rollback window** — Planned: a cutover simulator — drive a strangler migration's routing table and DB phases yourself (ETL load, CDC lag, consistency checks), inject a failure mid-cutover, and see what rollback costs before vs. after the legacy tables are dropped. Needs backend standup.

#### w06d5 — AI-Augmented Feature Delivery, End to End (3)

- **"Looks done" is not a gate — build one** — Planned: a stop-gate sandbox — run the same seeded feature task twice, once with "looks done" as the stop signal and once with a Stop hook wired to the test suite, and diff what each session ships. Needs backend standup.
- **Agents can run inside the gate, too** — Planned: a live headless run — paste a small diff, we pipe it through `claude -p --bare --output-format json` with a lint prompt, and you inspect the structured verdict and the `total_cost_usd` it reports. Needs backend standup.
- **Blocking on AI findings is a decision you build** — Planned: a severity-gate builder — paste a check run's `bughunter-severity:` JSON, choose your blocking policy (block on `normal`? on nit volume? fail closed on missing runs?), and watch the merge button allow or refuse a set of sample PRs. Needs backend standup.

_Week 6 subtotal: 15 deferred placeholders._

### Week 7

#### w07d1 — Observability for LLM Systems: Traces, Spans, and LangSmith (3)

- **Which span owns the twenty minutes** — Planned: a waterfall reader over a seeded intake trace — hover a span for its duration and share of the parent, then find the child that owns the 19m48s. Needs backend standup.
- **Cost rolls up three levels — and metadata does not roll anywhere** — Planned: a cost-rollup sandbox — toggle a metadata key at root and child level and watch the per-tenant dollars-per-request number shift under you. Needs backend standup.
- **A URL instead of an adjective** — Planned: a pre-share scrub preview — mark PHI-bearing fields on a seeded intake trace and diff what a public viewer sees before versus after redaction-at-emission. Needs backend standup.

#### w07d2 — Evals in Production: Online and Offline (2)

- **Grading live traffic is a budget decision too** — Planned: a sampling-cost calculator — set trace volume, filter, sampling rate, and judge model, then watch judge spend, retention storage, and caught-incidents-per-week move together. Needs backend standup.
- **Turn a score into a build-breaking control** — Planned: a gate simulator — load a labeled gold set, move the groundedness threshold, and watch pass/fail counts, false-block rate, and which past incidents get caught flip in real time. Needs backend standup.

#### w07d3 — Alt Research: Langfuse, Phoenix & Helicone against LangSmith (2)

- **"We support OpenTelemetry" tells you nothing** — Planned: a Collector fanout sandbox — emit one instrumented span stream, route it to two backends simultaneously, and diff what each one actually stored from the same trace. Needs backend standup.
- **Four incompatible meters — which is exactly the point** — Planned: a meter calculator — enter monthly traces, spans per trace, and payload size, and watch the same workload priced in units, requests, spans+GB, and LCU/LSU side by side. Needs backend standup.

#### w07d4 — SRE for AI Systems: SLOs, Error Budgets, and the OTel GenAI Conventions (3)

- **Alert on the rate you're spending, not the spike** — Planned: a burn-rate calculator — set an SLO, a window and an outage duration, and watch which of the 14.4× / 6× / 1× rules fire and how much budget is gone. Needs backend standup.
- **Low traffic breaks the table outright** — Planned: a low-traffic simulator — dial requests/hour from 10,000 down to 10 and watch one failure swing from invisible to a 1,000× page. Needs backend standup.
- **Cost is a reliability signal, and nobody emits it** — Planned: a cost-burn panel — toggle the cache-hit ratio on a week of token usage and watch derived spend cross its budget while latency and errors stay flat green. Needs backend standup.

#### w07d5 — Guardrails and Observability, End to End (3)

- **Three vendors, three shapes of "is this true?"** — Planned: a threshold dial — score a seeded summary against a chart, drag the threshold, and watch pass flip to block (and benign answers start getting declined). Needs backend standup.
- **Publish your own attribute contract** — Planned: a trace inspector — fire a seeded ungrounded summary and watch the guardrail span appear beside the model call, with its five attributes, `Unset` status, and the counter incrementing. Needs backend standup.
- **Shadow first, enforce second** — Planned: a shadow-mode replay — run 200 seeded summaries in inspect-only, watch the ungrounded rate accumulate into a before-number, then flip to enforce. Needs backend standup.

_Week 7 subtotal: 13 deferred placeholders._

### Week 8

#### w08d1 — The OWASP LLM Top 10 (2026) as a Working Framework (3)

- **Why this edition can answer "says who?"** — Planned: a ranking explorer — slide the vote/incident weighting from 100/0 to 0/100 and watch the ten entries reorder. Needs backend standup.
- **LLM02, LLM08, LLM09: three ways the same data gets out** — Planned: an inversion demo — embed a short PHI-bearing sentence, run a Vec2Text-style reconstruction, and diff the recovered text against the original. Needs backend standup.
- **The crosswalk is the part that makes it a framework** — Planned: a crosswalk lookup — pick an entry, see its ●/○/— row across all nine pinned frameworks, and export it as markdown for a risk register. Needs backend standup.

#### w08d2 — Prompt Injection and Jailbreaks (2)

- **Three legs, and you only need to remove one** — Planned: a trifecta auditor — paste a tool manifest and a data-source list, see which sessions hold all three legs. Needs backend standup.
- **What survives an attacker who moves second** — Planned: a pattern picker — describe an agent's tools and data, step through the six patterns, see what each costs. Needs backend standup.

#### w08d3 — Guardrail Frameworks: Pricing the Control (3)

- **A latency number without an instance type is fiction** — Planned: a latency-budget calculator — pick a scanner set, an instance type, and ONNX on/off, and watch the serial p99 ceiling and the sum-of-averages central estimate move against a stated turn budget. Needs backend standup.
- **Precision is a staffing number** — Planned: a false-positive economics widget — set precision, recall, base rate and daily volume, and read out wrongly-blocked humans per day plus the accuracy consistency check. Needs backend standup.
- **Detection method predicts where the errors live** — Planned: a recognizer coverage prober — paste a synthetic note, toggle the active recognizer set and threshold, and see which spans get caught, by which method, and what survives into the prompt. Needs backend standup.

#### w08d4 — Governance, PII and Responsible AI in a Regulated Deployment (3)

- **"The vendor is HIPAA-ready" is not a row you can write** — Planned: a coverage-table lookup — pick a vendor surface and retention setting, get covered/not-covered plus the clause and its retrieval date as a data-flow row's agreement cell. Needs backend standup.
- **A redactor is a test suite, not a promise** — Planned: a redactor bench — paste a clinical note, run the (A)–(R) suite, see per-category recall with leaked spans highlighted and a pass/block verdict. Needs backend standup.
- **Say no with a date attached** — Planned: a gate builder — pick your levers, draft two conditions, have them linted for the three required parts plus a binary acceptance test. Needs backend standup.

#### w08d5 — Red-Teaming and Secure Agent Deployment, End to End (3)

- **Evidence is a rate, not an anecdote** — Planned: a garak console against a demo summarizer — pick a probe family, watch the hit log fill, read the rate move. Needs backend standup.
- **The score is not the decision** — Planned: an SSVC deployer-tree walker — set the four decision points and watch the outcome and timeline resolve, tree path highlighted. Needs backend standup.
- **A medium in an agent is not a medium** — Planned: an AIVSS calculator — enter a CVSS base, slide the ten agentic factors, watch the score, the agent class and the emitted SSVC outcome JSON move together. Needs backend standup.

_Week 8 subtotal: 14 deferred placeholders._

**Inventory total: 72 deferred placeholders.**

### Setup, expected output, and troubleshooting metadata gap

The 43 reading pages have canonical daily goals and deliverable lists, so shared reading chrome may reuse those fields for Learning objectives and Expected output. They do **not** have canonical setup or troubleshooting fields. This slice therefore does not generate generic setup/troubleshooting copy. Those fields remain deferred until source-authored, page-specific content exists; each future interactive will also need its own tested setup and failure guidance before its placeholder can be called live.
