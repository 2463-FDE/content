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

**Status: deferred, not live.** The shipped pages contain 14 `.ix-future` placeholders, all in W4. W3 has implemented client-side agent widgets. W5–W6 replaced their old placeholders with required local decision labs. Source-remapped W7–W8 each ship one required local decision interaction per route and no deferred placeholders. The entries below inventory only placeholder copy still present in shipped reading pages; they do not promise a backend, launch date, or live provider connection.

### Week 4

#### w04d1 — Multi-Agent Orchestration Patterns (3)

- **Swarm: peers hand off directly, no manager** — Planned: run the same three-agent support team as a supervisor and as a swarm on the same conversation, and diff the message traffic — every result round-tripping through the hub versus direct peer handoffs with the sticky active agent picking up turn two. Needs backend standup.
- **A handoff is just a tool call** — Planned: wire two OpenAI Agents SDK agents with a `transfer_to_refund_agent` handoff, send one message, and inspect the raw tool call — then re-run with an `input_filter` attached and diff exactly what history the receiving agent saw each time. Needs backend standup.
- **Orchestrator-worker: parallelism with a price tag** — Planned: fan a research question out to 1 vs 4 parallel subagents and watch a live token meter climb toward the ~15× multiple alongside the coverage gain — feel the economics, not just read them. Needs backend standup.

#### w04d2 — Durable Agents: State, Checkpointers & the Art of Not Losing Your Place (2)

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

_Week 4 subtotal: 14 deferred placeholders._

### Week 5

The source-authoritative Neo4j replacement ships one local, accessible decision lab per day. It needs no backend and is not represented as deferred work here.

#### w05d1 — Model the Client Domain as a Property Graph (0)

No deferred `.ix-future` placeholder.

#### w05d2 — Design a Governed Graph Schema and Import (0)

No deferred `.ix-future` placeholder.

#### w05d3 — Construct a Knowledge Graph and Choose a Retriever (0)

No deferred `.ix-future` placeholder.

#### w05d4 — Engineer Production Context with Graph and Vector Retrieval (0)

No deferred `.ix-future` placeholder.

#### w05d5 — Review the Graph Model and Defend the GraphRAG Service (0)

No deferred `.ix-future` placeholder.

_Week 5 subtotal: 0 deferred placeholders._

### Week 6

The former 12 AI-SDLC placeholders were retired when the source-authoritative Kafka week replaced those routes on 2026-10-14. Their reviewed source remains in `docs/research/w06/archive-ai-sdlc/` for supporting reuse.

Each Kafka day now has one required, deterministic decision interaction in `assets/js/kafka-lesson.js`: partitioning, poison-event recovery, token-budget backpressure, partial-side-effect replay, and delivery fallback. These are shipped interactions, not deferred placeholders.

#### w06d1 — Kafka foundations and event-driven judgement (0)

#### w06d2 — Delivery semantics, schemas, and managed Kafka economics (0)

#### w06d3 — Event-driven agents, backpressure, and streaming stores (0)

#### w06d4 — Build and operate the Kafka-to-agent pipeline (0)

#### w06d5 — Pipeline defense, measured readout, and fallback (0)

_Week 6 subtotal: 0 deferred placeholders._

### Week 7

The Terraform + Ansible & AI CI/CD replacement retires the former observability placeholders. Each route ships one required, deterministic decision interaction in `assets/js/platform-lesson.js`; no provider, host, CI service, model, or cloud action is required. The former trace/cost implementation is preserved unloaded in `assets/js/archive/interactive-w7-trace-observability-v1.js` for reviewed Week 8 reuse, not counted as shipped work.

#### w07d1 — Terraform foundations and plan discipline (0)
#### w07d2 — Modules, drift, and AI-assisted plan review (0)
#### w07d3 — Ansible configuration and idempotent change (0)
#### w07d4 — AI CI/CD gates and human-controlled delivery (0)
#### w07d5 — Project 2 infrastructure delivery and rebuild evidence (0)

_Week 7 subtotal: 0 deferred placeholders._

### Week 8

The AI Observability, SRE & Reliability Guardrails replacement retires the former security placeholders. Preserved security research moved to Week 9, while each Week 8 route ships one required, deterministic decision interaction over synthetic evidence. The former security practice is preserved unloaded in `assets/js/archive/interactive-w8-security-v1.js` for reviewed Week 9 reuse.

#### w08d1 — AI service signals and negotiated SLOs (0)
#### w08d2 — OTel signals, GenAI spans, and drift evidence (0)
#### w08d3 — Correlate agents, tools, models, and event flows (0)
#### w08d4 — Evaluations and reliability guardrails (0)
#### w08d5 — Incident response and reliability evidence (0)

_Week 8 subtotal: 0 deferred placeholders._

**Inventory total: 14 deferred placeholders.**

### Setup, expected output, and troubleshooting metadata gap

The 43 reading pages have canonical daily goals and deliverable lists, so shared reading chrome may reuse those fields for Learning objectives and Expected output. They do **not** have canonical setup or troubleshooting fields. This slice therefore does not generate generic setup/troubleshooting copy. Those fields remain deferred until source-authored, page-specific content exists; each future interactive will also need its own tested setup and failure guidance before its placeholder can be called live.
