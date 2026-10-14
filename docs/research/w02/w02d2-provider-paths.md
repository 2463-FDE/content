# W2·D2 — provider-path evidence (AWS / GCP)

Scope: the claims made in the AWS and GCP provider blocks, the provider decision
checks, the provider quiz questions, and the GCP code tab on `weeks/w02/w02d2.html`.
All sources first-party; **accessed 2026-10-14** with `curl` (HTML → text).
The shared spine (Titan V2 dimension dial, pgvector limits, Chroma spaces, HNSW/IVFFlat)
is backed by `docs/research/w02/w02d2.md` and is unchanged here; Chroma stays the
program's self-hosted store and the provider block is the managed alternative.

## AWS — Amazon Titan Text Embeddings V2

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html

- "The Amazon Titan Text Embedding v2 model (amazon.titan-embed-text-v2:0) can intake up to 8,192 tokens or 50,000 characters and outputs a vector of 1,024 dimensions."
- Spec list: "Output vector size – 1,024 (default), 512, 256"; "Supported use cases – RAG, document search, reranking, classification".
- "The actual similarity computation and retrieval are performed by your vector database, not by the embedding model."

## AWS — Amazon Bedrock Knowledge Bases (managed vs customer-managed)

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html

- Two types. **Managed Knowledge Base**: "Amazon Bedrock manages the underlying data ingestion, indexing, storage, and retrieval infrastructure"; "Amazon Bedrock manages embedding, re-ranking, and reasoning with service-managed models by default (with option to choose your own models)."
- **Customer-managed Knowledge Base**: "set up and manage your own RAG pipeline, including the vector store (such as Amazon OpenSearch Serverless, Amazon Aurora, and Amazon Neptune), and have full control over data ingestion, parsing, indexing and storage configurations."

## AWS — vector stores you bring, and what is locked at creation

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html

- Store tabs documented: Amazon OpenSearch Serverless, Amazon OpenSearch Service Managed Clusters, Amazon S3 Vectors, Amazon Aurora (RDS), Neptune Analytics graphs (GraphRAG), Pinecone, Redis Enterprise Cloud, MongoDB Atlas.
- "Your choice of embeddings model and vector dimensions can affect the available vector store choices."
- Dimension table (OpenSearch / S3 Vectors): "Titan V2 Embeddings - Text — 1,024, 512, and 256"; Titan G1 1,536; Cohere Embed English / Multilingual 1,024.
- OpenSearch Serverless: engine "faiss"; "We recommend using Euclidean for floating-point vector embeddings."
- S3 Vectors: "The dimensions must be a value between 1 and 4096"; distance metric "You can use Cosine or Euclidean"; "best suited for infrequent query workloads".
- Aurora (pgvector): table columns `id`, `embedding` (Vector), `chunks` (Text), `metadata` (JSON); "You must provide these fields before creating the knowledge base. They cannot be updated after the knowledge base is created." Required index: `CREATE INDEX ON bedrock_integration.bedrock_kb USING hnsw (embedding vector_cosine_ops);`.
- Lesson claim derived (AWS check): the vector column is sized to the model's dimensions and the field mapping is fixed at creation, so changing Titan V2 from 1,024 to 256 means a new vector field/knowledge base and a re-sync, not a query-time switch.

## GCP — text embeddings on Gemini Enterprise Agent Platform

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings (redirected from the former Vertex AI URL; "Last updated 2026-10-13 UTC")

- "All models produce a full-length embedding vector by default. For gemini-embedding-001, this vector has 3072 dimensions, and other models produce 768-dimensional vectors. However, by using the output_dimensionality parameter, users can control the size of the output embedding vector. Selecting a smaller output dimensionality can save storage space and increase computational efficiency … while sacrificing little in terms of quality."
- Model table: gemini-embedding-001 "up to 3072", 2048 tokens; text-embedding-005 "up to 768" (English and code); text-multilingual-embedding-002 "up to 768".
- Python sample: `pip install --upgrade google-genai`; env `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global`, `GOOGLE_GENAI_USE_ENTERPRISE=True`; `client.models.embed_content(model="gemini-embedding-001", contents=[…], config=EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT", output_dimensionality=3072))`; response `embeddings=[ContentEmbedding(values=[…])]`.
- "After you've generated your embedding you can add embeddings to a vector database, like Vector Search."
- Lesson claim derived: a 3,072-dim default exceeds the pgvector 2,000-dim index limit taught in the shared spine, so a learner bringing their own Postgres sets `output_dimensionality` below 2,000.

Source: https://ai.google.dev/gemini-api/docs/embeddings ("Last updated 2026-10-09 UTC")

- "Both gemini-embedding-001 and gemini-embedding-2 are trained using the Matryoshka Representation Learning (MRL) technique"; "We recommend using 768, 1536, or 3072 output dimensions."
- "While the default 3072-dimension embeddings are always normalized … If you are using gemini-embedding-001, you must manually normalize non-3072 dimensions" (numpy sample: divide by `np.linalg.norm`).

## GCP — Vector Search

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/overview

- "Leveraging the ScaNN algorithm, Vector Search lets you build next-generation search and recommendation systems as well as generative AI applications."

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/configuring-indexes ("Last updated 2026-10-13 UTC")

- `dimensions`: "Required. The number of dimensions of the input vectors."
- `distanceMeasureType`: SQUARED_L2_DISTANCE, L1_DISTANCE, DOT_PRODUCT_DISTANCE ("Default value … Note that a sparse index only supports dot product distance"), COSINE_DISTANCE ("We strongly suggest using DOT_PRODUCT_DISTANCE + UNIT_L2_NORM instead of the COSINE distance … it offers the same ranking and mathematical equivalence as the COSINE distance").
- `algorithmConfig`: tree-AH (approximate) or BruteForceConfig ("the standard linear search"). tree-AH `fractionLeafNodesToSearch` "The default value is 0.05 if not set."

## GCP — RAG Engine vector database choices

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/vector-db-choices ("Last updated 2026-10-13 UTC")

- "RAG Engine offers the enterprise-ready RagManagedDb as the default vector database, which requires no additional provisioning or managing." Distance metric: cosine; search: "KNN (default) and ANN".
- Bring-your-own options: Vector Search (cosine, dot-product; ANN; GA), Vertex AI Feature Store (Preview), Weaviate (Preview), Pinecone (GA). "In this case, you are responsible for the lifecycle and scalability of your vector database."

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/use-ragmanageddb-with-rag ("Last updated 2026-10-13 UTC")

- "RagManagedDb is used by default and uses Spanner."
- KNN (default): "Finds the exact nearest neighbors"; "perfect recall (1.0)"; "Great for small to medium-sized RAG corpora, which stores less than 10,000 RAG files"; latency grows with corpus size.
- ANN: "Reduces query latencies significantly on large RAG corpora. Recall slightly lowered"; effective above "approximately more than 10,000 RAG files".
- Vector DB choices page: "For optimal recall, the ANN feature requires that the index be rebuilt after major changes to your data."

## Not claimed

Prices, quotas, regional availability, and per-unit costs for either cloud are not stated on this page.
