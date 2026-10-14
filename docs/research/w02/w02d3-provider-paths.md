# W2·D3 — provider-path evidence (AWS / GCP)

Scope: the claims made in the AWS and GCP provider blocks, the provider decision
checks, the provider quiz questions, the GCP code tab, and the AWS code-tab model fix on
`weeks/w02/w02d3.html`. All sources first-party; **accessed 2026-10-14** with `curl`
(HTML → text). The shared spine (dense vs sparse, alpha, RRF, two-stage pipeline, ColBERT,
pgvector hybrid) is backed by `docs/research/w02/w02d3.md` and is unchanged here.

## AWS — Knowledge Bases search type (hybrid vs semantic)

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html

- Search types: "Default – Amazon Bedrock decides the search strategy for you. Hybrid – Combines searching vector embeddings (semantic search) with searching through the raw text. Semantic – Only searches vector embeddings."
- "Hybrid search is only supported for Amazon RDS, Amazon OpenSearch Serverless, and MongoDB vector stores that contain a filterable text field. If you use a different vector store or your vector store doesn't contain a filterable text field, the query uses semantic search."
- API: in a Retrieve or RetrieveAndGenerate request, `"retrievalConfiguration": {"vectorSearchConfiguration": {"overrideSearchType": "HYBRID | SEMANTIC"}}`; "If you don't specify a value, Amazon Bedrock decides which search strategy is best suited for your vector store configuration."
- Reranking in the query config: "You can use a reranker model to rerank results from knowledge base query."

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html

- Aurora (pgvector) required indexes: `CREATE INDEX … USING hnsw (embedding vector_cosine_ops);` and `CREATE INDEX … USING gin (to_tsvector('simple', chunks));`; "For improving hybrid search accuracy and latency with English content, consider using the 'english' dictionary instead of 'simple'".
- Lesson claim derived: on Aurora the sparse half of hybrid is a Postgres full-text (GIN / `to_tsvector`) index on the chunk text, beside the dense HNSW index.

## AWS — reranker models

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/rerank.html

- "A reranker model calculates the relevance of chunks to a query and reorders the results based on the scores that it calculates." "With a reranker model, you can retrieve fewer, but more relevant, results." "You can use reranking for only textual data."
- Two ways: "Call the Rerank operation directly through the Amazon Bedrock API", or with Knowledge Bases "use a reranker model while calling the Retrieve or RetrieveAndGenerate operation … The results from reranking override the default ranking that Amazon Bedrock Knowledge Bases determines."

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-supported.html

- Models: Amazon Rerank 1.0 (`amazon.rerank-v1:0`), Cohere Rerank 3.5 (`cohere.rerank-v3-5:0`).
- "The Amazon Rerank 1.0 model is not supported in the US East (N. Virginia) AWS Region. You can only use the Cohere Rerank 3.5 model in this Region." → the AWS code tab (which pins `region_name="us-east-1"`) now uses `cohere.rerank-v3-5:0` instead of `amazon.rerank-v1:0`.

## GCP — Agent Search (formerly Vertex AI Search) as managed retrieval

Source: https://docs.cloud.google.com/generative-ai-app-builder/docs/builder-apis ("Last updated 2026-10-13 UTC")

- "Agent Search works as an out-of-the-box semantic & keyword search engine for RAG with the ability to process a variety of document types and with connectors to a variety of source systems including BigQuery and many third party systems."
- "Build your own retrieval: … APIs provide high-quality implementations for document parsing, embedding generation, vector search, and semantic ranking."

Source: https://docs.cloud.google.com/generative-ai-app-builder/docs/introduction ("Last updated 2026-04-22 UTC")

- Rename: "Some of the former names include Vertex AI Search, AI Applications, Agent Builder …". "Behind the scenes, Agent Search uses the Discovery Engine API."

Source: https://docs.cloud.google.com/generative-ai-app-builder/docs/parse-chunk-documents ("Last updated 2026-10-13 UTC")

- For RAG, "turn on document chunking, which indexes your data as chunks", and the layout parser "which detects document elements such as headings and lists, to improve how documents are chunked."

## GCP — Vector Search hybrid search (dense + sparse in one index)

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/about-hybrid-search ("Last updated 2026-10-13 UTC")

- "queries or datasets with arbitrary product numbers or SKUs, brand new product names … and corporate proprietary codenames don't work with semantic search … This is called 'out of domain' data."
- Sparse embeddings from "TF-IDF, BM25, or SPLADE"; "you can mix both dense and sparse embeddings into a single vector index and run queries with dense embeddings, sparse embeddings, or both."
- `HybridQuery(dense_embedding=…, sparse_embedding_dimensions=…, sparse_embedding_values=…, rrf_ranking_alpha=0.5)`.
- Fusion: "hybrid search uses Reciprocal Rank Fusion (RRF)"; "the dense distance and sparse distance are measured in different spaces and can't be directly compared to each other. Thus, RRF works effectively".
- `rrf_ranking_alpha`: "1, or not specified: Hybrid search uses only dense search results and ignores sparse search results. 0: … only sparse … 0 to 1: … merges both results … 0.5 means they will be merged with the same weight."
- Reranking: "Gemini Enterprise Agent Platform Ranking API provides a way to implement the ranking based on generic relevance between query text and the search result texts with the pre-trained model."

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/configuring-indexes

- DOT_PRODUCT_DISTANCE: "Note that a sparse index only supports dot product distance."

## GCP — ranking API

Source: https://docs.cloud.google.com/generative-ai-app-builder/docs/ranking ("Last updated 2026-10-13 UTC")

- "The ranking API takes a list of documents and reranks those documents based on how relevant the documents are to a query. Compared to embeddings, which look only at the semantic similarity … the ranking API can give you precise scores for how well a document answers a given query."
- "The ranking API is stateless so there's no need to index documents before calling the API … well suited for reranking documents from Vector Search and other search solutions."
- "You can include up to 1000 records per request." Default model `semantic-ranker-default@latest`; `topN` limits returned records; output "Score: a float value between 0 and 1".
- Python sample (code tab adapted from it): `from google.cloud import discoveryengine_v1 as discoveryengine`; `client = discoveryengine.RankServiceClient()`; `client.ranking_config_path(project=project_id, location="global", ranking_config="default_ranking_config")`; `discoveryengine.RankRequest(ranking_config=…, model="semantic-ranker-default@latest", top_n=10, query=…, records=[discoveryengine.RankingRecord(id=…, title=…, content=…)])`; `client.rank(request=request)`; auth via Application Default Credentials.

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/retrieval-and-ranking ("Last updated 2026-10-13 UTC")

- RAG Engine rerankers: "Agent Platform ranking API … standalone semantic reranker" with latency "Very low (less than 100 milliseconds)"; "LLM reranker uses a separate call to Gemini to assess relevance" with latency "High (1 to 2 seconds)".
- Config: `rag.RagRetrievalConfig(top_k=10, ranking=rag.Ranking(rank_service=rag.RankService(model_name=…)))`.

## Not claimed

Prices, quotas, and per-unit costs are not stated. The only regional statement used is the
documented Amazon Rerank 1.0 / us-east-1 restriction, applied to the AWS code tab.
