# w01d2b — Production API integration patterns

version-stamps:
  - Claude streaming, Message Batches, and API error guidance: current docs verified 2026-09-25
  - Amazon Bedrock Claude Haiku 4.5 model card: programmatic IDs verified 2026-09-25
  - access date for every URL below: 2026-09-25

## Claims (each MUST carry a source)

- Claude streaming uses server-sent events and can surface an error after the initial HTTP response succeeds, so clients must handle mid-stream failures. — [Anthropic — Streaming Messages](https://platform.claude.com/docs/en/build-with-claude/streaming)
- Message Batches are asynchronous, return results matched by `custom_id` rather than input order, and are priced at a 50% discount from standard API rates. — [Anthropic — Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- A production client should distinguish request errors from transient rate-limit and server errors; Anthropic documents status codes and request IDs for correlation. — [Anthropic — API errors](https://platform.claude.com/docs/en/api/errors)
- Exponential backoff with jitter spreads retries instead of creating synchronized retry spikes against a recovering service. — [AWS Architecture Blog — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- For `bedrock-runtime` in `us-east-1`, AWS lists `us.anthropic.claude-haiku-4-5-20251001-v1:0` as a US geo inference-profile ID. — [AWS — Claude Haiku 4.5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)

## Sources (canonical, stable URLs preferred)

- Anthropic — Streaming Messages — https://platform.claude.com/docs/en/build-with-claude/streaming
- Anthropic — Message Batches — https://platform.claude.com/docs/en/build-with-claude/batch-processing
- Anthropic — API errors — https://platform.claude.com/docs/en/api/errors
- AWS Architecture Blog — Exponential Backoff and Jitter — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- AWS — Claude Haiku 4.5 model card — https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
