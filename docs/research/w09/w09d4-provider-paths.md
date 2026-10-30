# W9 D4 provider-path evidence — guardrail coverage and normalized cost

**Accessed 2026-10-14; rechecked 2026-10-27.** First-party sources only. Prices are dated public list prices, not client quotes. No API, provider account, or paid service is used.

## AWS — Amazon Bedrock Guardrails

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html

- Bedrock Guardrails supports content filters, denied topics, word filters, sensitive-information filters, contextual grounding checks, and Automated Reasoning checks. `ApplyGuardrail` can assess text independently of a model invocation.

Source: https://aws.amazon.com/bedrock/pricing/

- The published list prices on the access date are per enabled safeguard: text content filters and denied topics `$0.15 / 1,000 text units`; sensitive-information filters and contextual grounding `$0.10 / 1,000 text units`; Automated Reasoning `$0.17 / 1,000 text units per policy`; regex-sensitive-information and word filters are free. A text unit contains up to 1,000 characters and partial units round up.
- A defensible normalization uses observed characters and requests, rounds text units per billable rule, and reports enabled safeguards separately. It must not convert text units to tokens using an invented universal ratio.

## GCP — Model Armor

Source: https://cloud.google.com/security-command-center/docs/model-armor-overview

- Model Armor screens prompts and responses and can use filters for prompt injection/jailbreak, sensitive data, malicious URLs, and safety risks. It can run inspect-only or inspect-and-block and can publish findings to Security Command Center depending on tier/configuration.

Source: https://cloud.google.com/security-command-center/pricing

- Model Armor meters the total tokens in screened prompts and responses using four UTF-8 characters excluding whitespace per token. Standalone use includes 2 million tokens/month at no cost; use above that is `$0.10 per 1 million tokens`. Security Command Center Premium/Enterprise subscriptions include 3 billion tokens/month; applicable overage is `$0.10 per additional 1 million tokens` on the access date. Subscription economics are separate from the screening overage.

## Comparison rule

Normalize to the **same synthetic workload**, not merely the same displayed unit: direction, request count, input/output characters, whitespace assumption, enabled AWS safeguards/policies, GCP screened tokens, included allowance, and subscription assumption. Report coverage differences separately. Bedrock Automated Reasoning/contextual grounding and Model Armor's screening filters are not interchangeable controls. Keep deterministic authorization, output-schema validation, least privilege, and negative tests outside either vendor layer.
