# Implementation plan — live RAG try-its on AWS Bedrock + Chroma Cloud

**Date:** 2026-07-06 · **Status:** Phase 0 done; Phases 1–5 pending go
**Related:** `rag-vector-store-decision.md` (store choice), `future-interactives.md` (widget inventory), vault `projects/2463-fde/notes/rag-vector-store-free-tier-research.md`

## Goal

Make the W2 "try it" sections run against a **real** retrieval pipeline (real embeddings, real vector search, real grounded answers) instead of the current client-side sims — while staying lightweight (the Cloudflare Worker orchestrates; nothing heavy runs on our server) and using **only AWS Bedrock models**.

## Hard constraints (read first)

- **Two layers, two model stories:**
  - **Production SHOWCASE (the code popups)** = **AWS Bedrock**: embeddings **Amazon Titan Text Embeddings V2** (`amazon.titan-embed-text-v2:0`), generation **Claude via Converse** (default **Haiku 4.5** `us.anthropic.claude-haiku-4-5-20251001-v1:0`, size up to **Sonnet 4.6** `us.anthropic.claude-sonnet-4-6-v1` only where quality demands it, e.g. the eval judge), rerank **Bedrock Rerank** (`amazon.rerank-v1:0`). Static, learner-facing reference; nothing executes. 3.5 is retired; current-gen needs a `us.`/`global.` inference-profile prefix.
  - **Running DEMO (the live Worker)** = **free, no Bedrock**: embeddings via **Cloudflare Workers AI `@cf/baai/bge-base-en-v1.5`** (768-dim, in-Worker, `env.AI.run`), store **Chroma Cloud free tier**, grounded answers reuse the **existing Claude proxy** (Haiku 4.5). Chosen so the demo costs $0 and the org's long-lived Bedrock token never sits in a public edge Worker. bge (768d) ≠ Titan (1024d) — same concept; the demo notes "production uses Titan."
- **No OpenAI anywhere** in either layer.
- **Same model at ingest and query.** The live Worker queries with `bge`, so the ingest script embeds with the **same** `bge` (via the Cloudflare Workers AI REST API), not Titan.
- **Sims stay as the fallback.** Widgets degrade to the baked-data sim when `FDE_RAG_URL` is unset (same pattern as `ix-run` / `FDE_RUN_URL`). No throwaway work.
- **Secrets never touch client JS.** Only the Chroma token is a Worker secret; Workers AI needs no key.

---

## Phase 0 — Content + code examples on Bedrock/Titan  ✅ DONE (2026-07-06)

The teaching surface no longer references OpenAI where it describes *our* stack.

- **5 production-code popups** (`codeviewer.js` modals) rewritten to boto3 + Bedrock:
  - `ingest.py` — Titan V2 `invoke_model` (one `inputText`/call) → pgvector.
  - `embed.py` — Titan V2 `dimensions` dial (1024/512/256).
  - `retrieve.py` — hybrid + **Bedrock Rerank** (`bedrock-agent-runtime.rerank`).
  - `evaluate.py` — Ragas judged by `ChatBedrockConverse` + `BedrockEmbeddings`.
  - `rag.py` — Titan embed → shortlist → **Converse** (Claude) grounded answer.
  - All annotate bearer-token auth (`AWS_BEARER_TOKEN_BEDROCK`, no IAM).
- **W2 reading prose, quizzes, diagrams, scrolly captions, and the `ix-dims` widget** re-anchored from OpenAI 3072/1536 to **Titan V2 1024/512/256** with AWS-documented accuracy retention (512 ≈ 99%, 256 ≈ 97%). The pgvector "high-dim exceeds the 2,000-dim HNSW cap" lesson is kept but reframed as a generic high-dim caution, noting Titan's 1024 default sidesteps it. Source links now point at the AWS Titan V2 docs.

**Still OpenAI-referenced (scoped for Phase 0b):** `index.html`, `alt-research.html`, and readings in **w01, w03, w04, w05** mention OpenAI/GPT as industry context. Decide per-mention: statements of *our* default → Titan/Claude; genuine external citations (MTEB, Anthropic guidance) → keep. Tracked as its own reviewable editorial sweep, not silently mass-replaced.

---

## Phase 1 — Accounts, secrets, access  (½ day)  ✅ mostly done

1. **Chroma Cloud.** Free-tier account → tenant → database → API key (WRITE access). Tenant `8c5dbd46-65ee-4e1a-8ed4-426b33c3b843`, DB `fde-base`. ✅
2. **Worker config.** `wrangler secret put CHROMA_API_KEY` ✅; `[ai] binding = "AI"` + `CHROMA_TENANT`/`CHROMA_DB` vars in `wrangler.toml` ✅. **No Bedrock token** — the live Worker embeds with free Workers AI. Grounded answers reuse the existing `ANTHROPIC_API_KEY` proxy.
3. **Cost guardrail.** Effectively $0 (Workers AI free tier + Chroma free tier + already-funded Claude proxy). Shared daily cap `RAG_GLOBAL_DAY` + existing per-trainee cap.

---

## Phase 2 — Worker backend (free-embed + Chroma bridge)  ✅ DONE (scaffolded)

In `backend/src/index.js`:

- **`POST /rag-query`** `{query, k}` — Workers AI `bge` embed → Chroma query → top-k `{body, score, doc_id}`. Powers the retrieval widgets. ✅
- **`POST /rag-answer`** `{query}` — retrieve → grounded answer via the existing Claude proxy (Haiku 4.5). Powers faithfulness / assembled-pipeline widgets. ✅
- **`POST /rag-embed`** `{texts}` — batch `bge` embed (same model as query), used by the ingest script so it needs no separate Cloudflare token; optional `INGEST_TOKEN` gate. ✅
- Inert (503) until `CHROMA_COLLECTION` is set. `RAG_GLOBAL_DAY` daily cap.
- *Optional later:* `/rag-rerank` via Bedrock Rerank, and migrating `/execute` — deferred, not needed for the free demo.

**Embedding call (in-Worker):** `env.AI.run("@cf/baai/bge-base-en-v1.5", { text })` → `{ data: [[...768 floats...]] }`. Free, no key.

---

## Phase 3 — Build-time ingest  ✅ DONE (scaffolded; needs a run)

- **Demo corpus** `scripts/rag/demo_corpus.json` — 14 docs matching the widgets' apikey / part-number scenarios so retrieval feels real and the "gold chunk" story holds. ✅
- **`scripts/rag/ingest_demo.py`** — chunk → embed via the Worker's `/rag-embed` (same `bge` model as query, no separate Cloudflare token) → upsert to Chroma with `{doc_id}` metadata; prints the collection ID. ✅
- **To run:** deploy the Worker (so `/rag-embed` is live), then `CHROMA_API_KEY`/`CHROMA_TENANT`/`CHROMA_DB` in the shell → `python scripts/rag/ingest_demo.py` → paste the printed `CHROMA_COLLECTION` into `wrangler.toml` → redeploy.

---

## Phase 4 — Wire widgets live (flagged)  (1–2 days)

- Add `window.FDE_RAG_URL` (set in `roster.js`, like `FDE_RUN_URL`). When unset, widgets keep the current sim — zero regression.
- **Flagship first:** hybrid retrieval on `w02d1` → `/rag-query` (+ `/rag-rerank`). Validate end-to-end before expanding.
- Then map the rest: `ix-retrieve` (all modes) → `/rag-query`(+rerank); `ix-faith` → `/rag-answer`; `ix-sim`/`ix-dims` → `/rag-query` with a `dimensions` param to show Titan truncation live; `ix-precision`/`ix-ragas` can stay sims (they teach scoring, not live retrieval) or use a small labeled fixture.
- Keep each widget's sim as the `catch`/no-flag fallback.

---

## Phase 5 — QA, cost, rollout  (½ day)

- Browser QA each live widget (gstack `browse`), verify graceful fallback when the Worker is unreachable.
- Watch Bedrock spend for the first cohort; confirm the rate cap holds.
- Roll out to the active cohort; leave sims as the permanent offline fallback.

---

## Appendix — verified API reference (2026)

- **Titan Text Embeddings V2** `amazon.titan-embed-text-v2:0`: body `{inputText, dimensions:1024|512|256, normalize:true}` → `{embedding, inputTextTokenCount}`. One `inputText` per call. 512d ≈ 99%, 256d ≈ 97% of 1024d accuracy. Max 8,192 tokens. [AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html)
- **Bedrock API keys (bearer):** env `AWS_BEARER_TOKEN_BEDROCK`; header `Authorization: Bearer <key>`; endpoint `bedrock-runtime.<region>.amazonaws.com/model/<id>/invoke`. boto3 and `langchain_aws` (`bedrock_api_key`) both read the env var; the key takes precedence over AWS creds. [AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)
- **Converse (Claude):** `bedrock-runtime.converse(modelId, system=[{text}], messages=[{role, content:[{text}]}], inferenceConfig={maxTokens})`; reply at `output.message.content[0].text`. Current-gen model IDs need an inference-profile prefix: `us.anthropic.claude-haiku-4-5-20251001-v1:0` (default, cost) and `us.anthropic.claude-sonnet-4-6-v1` (size-up); 3.5 is retired. [AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- **Rerank:** `bedrock-agent-runtime.rerank(queries=[{type:"TEXT",textQuery:{text}}], sources=[{type:"INLINE",inlineDocumentSource:{type:"TEXT",textDocument:{text}}}], rerankingConfiguration={type:"BEDROCK_RERANKING_MODEL", bedrockRerankingConfiguration:{numberOfResults, modelConfiguration:{modelArn:"arn:aws:bedrock:<region>::foundation-model/amazon.rerank-v1:0"}}})` → `results:[{index, relevanceScore}]`. [AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-use.html)
- **Chroma Cloud:** HTTP API, tenant/database scoped, API-key auth. Free tier to ~1M embeddings, serverless/no idle-pause. [Chroma pricing](https://www.trychroma.com/pricing)

## Open decisions

- Confirm the region inference-profile prefix (`us.` assumed; use `global.` if the account is set up for global CRIS). Haiku 4.5 default / Sonnet 4.6 size-up is set.
- Demo corpus content + size (Phase 3).
- Whether `ix-precision` / `ix-ragas` go live or stay sims (they teach metrics, not retrieval).
