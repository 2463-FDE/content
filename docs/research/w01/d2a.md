# w01d2a — Model selection

version-stamps:
  - Claude lineup/pricing: Fable 5.1, Opus 5.5, Sonnet 5, Haiku 4.5 (verified 2026-09-25)
  - OpenAI lineup/pricing: GPT-6 Astra, Sol, Luna (verified 2026-09-25)
  - Gemini lineup/pricing: Gemini 3.8 Flash GA introductory pricing through 2026-12-31 (verified 2026-09-25)
  - Amazon Bedrock Claude model IDs: Haiku 4.5 and Sonnet 5 model cards (verified 2026-09-25)
  - access date for every URL below: 2026-09-25

## Claims (each MUST carry a source)

- Anthropic's current lineup is Claude Fable 5.1, Opus 5.5, Sonnet 5, and Haiku 4.5, priced respectively at $10/$50, $4/$20, $2/$10, and $1/$5 per million input/output tokens. The same table lists 1M-token context windows for Fable, Opus, and Sonnet and 200K for Haiku. — [Anthropic — Models overview](https://platform.claude.com/docs/en/models/overview)
- OpenAI's current catalog presents GPT-6 Astra (`gpt-6-astra`) for the hardest work at $10/$50, GPT-6 Sol (`gpt-6-sol`) as the balanced tier at $2/$10, and GPT-6 Luna (`gpt-6-luna`) for high-volume work at $0.10/$0.50 per million input/output tokens. — [OpenAI — Models](https://developers.openai.com/api/docs/models)
- Gemini 3.8 Flash (`gemini-3.8-flash`) is GA with a 1M-token context window. Its paid introductory rate is $0.75/$3.75 per million input/output tokens through 2026-12-31, then $1.50/$7.50 from 2027-01-01. — [Google — What's new in Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/latest-model) and [Google — Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- The six-axis scorecard—capability, cost, latency, context window, tooling/ecosystem, and data residency/compliance—is a curriculum synthesis. Current catalogs support the durable lesson that each provider offers differently priced tiers rather than one universally correct model. — [Anthropic — Models overview](https://platform.claude.com/docs/en/models/overview), [OpenAI — Models](https://developers.openai.com/api/docs/models), and [Google — Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Prompt caching reuses matching prompt prefixes. For Sonnet 5 and Haiku 4.5, cache reads are 0.1× base input price; 5-minute writes are 1.25× and 1-hour writes are 2×. Anthropic documents lower read multipliers for Fable 5.1 and Opus 5.5, so the lesson must not claim 0.1× for every model. — [Anthropic — Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- AWS lists `us.anthropic.claude-haiku-4-5-20251001-v1:0` and `us.anthropic.claude-sonnet-5` as US geo inference-profile IDs for `bedrock-runtime`. AWS warns that geo/global profiles can route outside the source Region and do not provide single-Region residency. — [AWS — Claude Haiku 4.5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html) and [AWS — Claude Sonnet 5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5.html)

## Sources (canonical, stable URLs preferred)

- Anthropic — Models overview — https://platform.claude.com/docs/en/models/overview
- Anthropic — Prompt caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- OpenAI — Models — https://developers.openai.com/api/docs/models
- Google — What's new in Gemini 3.8 Flash — https://ai.google.dev/gemini-api/docs/latest-model
- Google — Gemini API pricing — https://ai.google.dev/gemini-api/docs/pricing
- AWS — Claude Haiku 4.5 model card — https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
- AWS — Claude Sonnet 5 model card — https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5.html
