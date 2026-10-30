# W10 D1 provider-path evidence — workload-placement memo

**Accessed 2026-10-14; rechecked 2026-10-27.** First-party sources only. This is a decision-input inventory, not a provider recommendation or client quote. No calculator, account, API, provisioning, or deployment is used.

## GCP-primary rows required by the source

- **Cloud Run:** https://cloud.google.com/run/pricing — billing depends on selected region/configuration and uses CPU, memory, requests, networking, minimum instances, and optional GPU dimensions. Record concurrency, active/idle time, minimum instances, request count, region, and egress.
- **BigQuery:** https://cloud.google.com/bigquery/pricing — query compute supports on-demand bytes processed or capacity/slot-hour models; storage and streaming are separate dimensions. Record bytes scanned, storage class/age, ingestion/read pattern, region, and reservation assumption.
- **Agent Search (formerly Vertex AI Search):** https://cloud.google.com/generative-ai-app-builder/pricing — General Pricing meters search queries and index storage, with edition/add-on differences. On the access date, Standard is `$1.50/1,000 queries`, Enterprise with Core Generative Answers is `$4.00/1,000 queries`, Advanced Generative Answers adds `$4.00/1,000 user-input queries`, and index storage is separately metered. Treat every number as dated.
- **Vector Search:** https://cloud.google.com/vertex-ai/pricing#vector-search — record deployed node/index capacity, build/update pattern, queries, replicas, and region rather than treating Agent Search and Vector Search as the same product.

## AWS-primary comparison rows

- **ECS:** https://aws.amazon.com/ecs/pricing/ — ECS itself has no additional charge for EC2 launch type; Fargate and related resources use their own dimensions. Record launch type, CPU/memory duration, desired count, load balancing, storage, networking, and region.
- **Amazon MSK:** https://aws.amazon.com/msk/pricing/ — record provisioned/serverless choice, broker or capacity dimensions, storage, data transfer, connectors, and region.
- **OpenSearch Service:** https://aws.amazon.com/opensearch-service/pricing/ — record instance/OCU mode, storage, replicas, ingestion/search workload, networking, and region.
- **Amazon Bedrock:** https://aws.amazon.com/bedrock/pricing/ — model tokens and Guardrails use distinct meters. Keep model, guardrail, evaluation, and agent/runtime rows separate.

## Shared memo rule

For the inherited synthetic banking/payments workload, every row needs workload unit, volume range, data boundary, service dependency, list-price URL/date, free-tier or commitment assumption, observability, egress, lock-in surface, migration/rollback path, confidence, and flip condition. Unknown client volumes and contracts remain variables. Personal reading selection determines which block is primary; the team's Week 6 ADR remains the implementation authority.
