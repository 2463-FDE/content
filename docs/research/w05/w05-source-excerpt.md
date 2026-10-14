# Week 5 source record excerpt

- **Record:** LTIM Custom FDE Curriculum — 10 Weeks (Reverse Classroom), captain-approved Week 5
- **Record last modified:** 2026-09-25
- **Excerpted:** 2026-10-14
- **Map acceptance:** captain accepted the Week 1–10 target on 2026-10-14.

> **Use of this excerpt.** Topic names below are copied from the approved curriculum record. Product names, cloud topology labels, and `[GCP]`/`[CC]` slots are curriculum topics, not automatically current product, price, suitability, or certification claims. Each lesson grounds current behavior in its dated research record.

## Week 5 — Neo4j Knowledge Graphs & Context Engineering

*Agentic Systems → Context Engineering*

**MON** (8 topics)
> 🏁 **Milestone — Knowledge graph modeling begins** (Neo4j domain model of the client system)
- Property graph model: nodes, relationships, properties, labels
- Graph vs relational vs vector thinking
- Cypher fundamentals: MATCH, CREATE, MERGE
- Cypher filtering & aggregation
- Neo4j setup (Docker) & Neo4j Browser
- Knowledge modeling: entities
- Relationships
- Decision points & action surfaces

**TUE** (8 topics)
- Advanced Cypher: variable-length paths & traversals
- Indexes & constraints
- Data import pipelines
- Encoding business rules & standards in the graph
- Compliance as a governance layer
- ADRs: lock vs defer
- AI-native user stories & acceptance criteria
- Graph schema design workshop

**WED** (7 topics)
> 🏁 **Milestone — GraphRAG build begins** (graph-grounded retrieval for agents)
- GraphRAG concepts: why graphs ground LLMs
- neo4j-graphrag-python: SimpleKGPipeline (KG construction from documents — note: experimental namespace)
- Entity & relation extraction with LLMs
- Retrievers: VectorRetriever
- VectorCypherRetriever
- Text2CypherRetriever
- FDE Situation Session: context diagram & graph model of a client domain

**THU** (8 topics)
- Knowledge graph as institutional memory
- Combining Chroma (vector) + Neo4j (graph) retrieval
- Agent + KG integration: LangGraph node querying Neo4j
- Grounding evaluation for GraphRAG
- Context assembly strategies for agents
- Query cost & performance awareness
- **[CC]** Claude Code + MCP: Neo4j MCP server in your workflow
- **[GCP]** Graph deployment topology across clouds: self-managed on EC2/GCE vs Aura on the AWS/GCP marketplaces; VPC peering vs Private Service Connect; data-gravity consequences of graph placement

**FRI** (5 topics)
- Assessment: graph model review
- Brownfield delivery #5 — executive readout + simulated technical-team session: GraphRAG service over the client-system domain model
- **[CC]** Claude Code retro #5: MCP configurations share-out
- Text2Cypher quality review
- Weekly feedback form
