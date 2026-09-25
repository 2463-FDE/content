# w01d3b — Requirements synthesis

version-stamps:
  - Claude hallucination-reduction guidance: current docs verified 2026-09-25
  - JSON Schema getting-started reference: current docs verified 2026-09-25
  - Amazon Bedrock Claude Haiku 4.5 model card: programmatic IDs verified 2026-09-25
  - access date for every URL below: 2026-09-25

## Claims (each MUST carry a source)

- A machine-consumable output contract can express required fields, types, enums, and nested object rules as JSON Schema. — [JSON Schema — Getting started](https://json-schema.org/learn/getting-started-step-by-step)
- To reduce hallucinations, Anthropic recommends grounding responses in supplied source material, allowing the model to say it does not know, and requiring citations that can be verified. — [Anthropic — Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- A written functional specification makes behavior reviewable before implementation and gives stakeholders a concrete artifact to correct. — [Joel Spolsky — Painless Functional Specifications, Part 1](https://www.joelonsoftware.com/2000/10/02/painless-functional-specifications-part-1-why-bother/)
- For `bedrock-runtime` in `us-east-1`, AWS lists `us.anthropic.claude-haiku-4-5-20251001-v1:0` as a US geo inference-profile ID. — [AWS — Claude Haiku 4.5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)

## Sources (canonical, stable URLs preferred)

- JSON Schema — Getting started — https://json-schema.org/learn/getting-started-step-by-step
- Anthropic — Reduce hallucinations — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- Joel Spolsky — Painless Functional Specifications, Part 1 — https://www.joelonsoftware.com/2000/10/02/painless-functional-specifications-part-1-why-bother/
- AWS — Claude Haiku 4.5 model card — https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
