# w01d4b — Output guardrails

version-stamps:
  - Claude tool-use and hallucination-reduction guidance: current docs verified 2026-09-25
  - OpenAI Structured Outputs guidance: current docs verified 2026-09-25
  - Pydantic validator guidance: current docs verified 2026-09-25
  - Amazon Bedrock Claude Haiku 4.5 model card: programmatic IDs verified 2026-09-25
  - access date for every URL below: 2026-09-25

## Claims (each MUST carry a source)

- Claude tool definitions use JSON Schema for tool inputs, and strict tool use can enforce schema-conformant tool calls. — [Anthropic — Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- OpenAI Structured Outputs constrain model output to a supplied schema, while applications must still handle refusal and incomplete-response paths. — [OpenAI — Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- Pydantic field and model validators provide a second application-side validation boundary for parsed output. — [Pydantic — Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- Valid JSON can still contain unsupported facts. Anthropic recommends source grounding, verifiable citations, and permission to say “I don't know” to reduce hallucinations. — [Anthropic — Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- For `bedrock-runtime` in `us-east-1`, AWS lists `us.anthropic.claude-haiku-4-5-20251001-v1:0` as a US geo inference-profile ID. — [AWS — Claude Haiku 4.5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)

## Sources (canonical, stable URLs preferred)

- Anthropic — Tool use — https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- OpenAI — Structured Outputs — https://developers.openai.com/api/docs/guides/structured-outputs
- Pydantic — Validators — https://docs.pydantic.dev/latest/concepts/validators/
- Anthropic — Reduce hallucinations — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- AWS — Claude Haiku 4.5 model card — https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
