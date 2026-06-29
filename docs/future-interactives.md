# Future Interactives — deferred "try it" examples

Each reading drops `.ix-future` placeholders where a live interactive belongs.
These need backend standup (an endpoint that runs the example against the tech being taught)
before they become functional `ix-run` blocks. Tracked here per the fan-out plan.

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
