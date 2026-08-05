# Decision memo — making the W2 RAG try-its "real" (free cloud vector store)

**Date:** 2026-07-06 · **Status:** recommendation, no infra stood up yet · **Owner:** eng lead to approve
**Backed by:** web research, see `~/second-brain/projects/2463-fde/notes/rag-vector-store-free-tier-research.md`

## The question

The W2 try-its currently run on **hand-tuned baked data** (client-side sims in `assets/js/interactive-rag.js`). They teach the concept correctly but never touch a real index. Should we stand up a **free cloud vector store** so learners see real embeddings + real retrieval feedback — kept **lightweight** and **off our backend server** (the Cloudflare Worker orchestrates but doesn't host the DB)?

**Answer: yes, it's cheap and worth it — recommended path below. Not built yet; awaiting go.**

## Correction on the stack

The ask referenced MongoDB Atlas as our vector store. Verified against the curriculum: **W2 teaches pgvector (64 mentions), Chroma (34), Pinecone (21)** — MongoDB is **0** in W2 (the "atlas" hits are the *FDE Mindset Atlas* nav link). So "the systems we operate with in this training" = pgvector / Chroma / Pinecone + OpenAI embeddings, not Mongo. The recommendation stays inside that set.

## Recommendation

> **Update (2026-07-06):** the org standardized on **AWS Bedrock** and provided **Bedrock API keys (bearer tokens)** — no OpenAI, and **no IAM roles / service accounts**. The embeddings + generation picks below are updated accordingly; the vector-store analysis is unchanged.

**Embeddings — Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`) on Bedrock.** Selectable **1024 (default) / 512 / 256** dims (Matryoshka — 512 ≈ 99%, 256 ≈ 97% of 1024 accuracy), 8,192-token input, `normalize:true` by default. The Cloudflare Worker calls Bedrock over **HTTPS with `Authorization: Bearer <AWS_BEARER_TOKEN_BEDROCK>`** — **no SigV4 signing** and no AWS SDK needed at the edge, which is why the bearer-token key is a good fit for a Worker. Index dim must match the embedder (use `vector(1024)` in pgvector; 1024 stays under pgvector's 2,000-dim HNSW cap, so no `halfvec` workaround).

**Generation — Claude on Bedrock via the Converse API.** Default to **Claude Haiku 4.5** (`us.anthropic.claude-haiku-4-5-20251001-v1:0`) for cost; size up to **Claude Sonnet 4.6** (`us.anthropic.claude-sonnet-4-6-v1`) only where quality demands it (e.g. the Ragas judge). Claude 3.5 is retired on Bedrock. These current-gen models require an **inference-profile ID** (the `us.` / `global.` prefix), not the bare `anthropic.` id. Same bearer-token auth; keeps the Claude-centric framing under the all-Bedrock mandate.

**Vector store — Chroma Cloud free tier (primary pick).**
- Curriculum-taught (2nd most, 34 mentions).
- **Always-on** — serverless / object-store backed, **no idle-pause**. This is the differentiator: a teaching demo sits idle between cohorts, and the pause-happy free tiers (Supabase 1wk, Qdrant 1wk, Pinecone 3wk) would go cold.
- Free tier to **1M embeddings** — a few-hundred-chunk demo is a rounding error.
- HTTP-reachable from the Worker; ~30s setup; $0/mo.

**Runner-up — Pinecone Starter free.** The most curriculum-canonical "managed vector DB" name, clean REST, 2 GB. Downsides: ~3-week idle-pause, single region (AWS us-east-1). Pick it over Chroma only if brand-consistency with the readings outweighs always-on.

**Not recommended:** Supabase/pgvector (best curriculum fidelity but 500 MB + 1wk pause + SQL friction from a Worker); Cloudflare Vectorize (cleanest integration, off-curriculum, needs Workers Paid); MongoDB Atlas M0 (off-curriculum, and no clean edge path since the Atlas Data API sunset ~Sep 2025).

## Architecture (keeps load off the backend)

> **Production showcase vs running demo (decided 2026-07-06):** the code popups **showcase Bedrock + Titan** as the production stack (learner-facing reference — static, nothing executes). The **live try-it Worker deliberately does NOT call Bedrock** — it embeds with **free Cloudflare Workers AI `bge`** (in-Worker, no key) so (a) it costs $0 and (b) the org's long-lived Bedrock bearer token never sits in a public edge Worker. Grounded answers reuse the existing funded Claude proxy. Titan is 1024-dim, bge is 768-dim — different model, identical concept; the demo carries a one-line "production uses Titan" note.

1. **Build-time, one-off local script:** chunk the demo corpus → embed with **Workers AI `bge`** (the same model the Worker queries with, via the Cloudflare REST API) → upsert to Chroma Cloud (~hundreds of vectors). Run once, re-run only when the corpus changes.
2. **Runtime:** widget → Worker `POST /rag-query` → Worker embeds the query with **free in-Worker Workers AI `bge`** (`env.AI.run`) → queries Chroma over HTTP → returns real top-k → widget renders. The faithfulness widget hits `POST /rag-answer`, which grounds the answer via the **existing Claude proxy** (Haiku 4.5).
3. **Cost & load:** effectively **$0** — Workers AI embeddings are free (10k neurons/day), Chroma Cloud is free tier, answers reuse the already-funded Claude proxy. No org Bedrock token at the edge, no DB on our server. Reuse the existing per-trainee rate-limit cap. **Secret handling:** only the Chroma token is a Worker secret (`wrangler secret put CHROMA_API_KEY`); never in client JS.

## Suggested rollout (if approved)

- Phase 0 (this memo): decide store. **Chroma Cloud** unless brand-consistency wins → Pinecone.
- Phase 1: one flagship widget goes live (hybrid retrieval, w02d1) behind a `FDE_RAG_URL` flag; sims stay as the fallback when the flag is unset (mirrors how `ix-run` already degrades).
- Phase 2: wire the remaining vector widgets; keep sims as the offline fallback.

The client-side sims are **not throwaway** — they stay as the no-network fallback, exactly like `ix-run` degrades to an info note when `FDE_RUN_URL` is unset.
