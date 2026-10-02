# w01d4a — Token optimization and cost engineering

version-stamps:
  - Claude lineup/pricing: Opus 5.5, Sonnet 5, Haiku 4.5 (verified 2026-09-25)
  - Claude prompt caching: current multipliers and TTLs verified 2026-09-25
  - Amazon Bedrock Claude Haiku 4.5 model card: programmatic IDs verified 2026-09-25
  - access date for every URL below: 2026-09-25

## Claims (each MUST carry a source)

- Claude Opus 5.5 costs $4/$20, Sonnet 5 costs $2/$10, and Haiku 4.5 costs $1/$5 per million input/output tokens. — [Anthropic — Models overview](https://platform.claude.com/docs/en/models/overview)
- At Sonnet 5 rates, a turn with 5,800 input tokens and 400 output tokens costs $0.0156; 40,000 turns cost $624/day. — [Anthropic — Models overview](https://platform.claude.com/docs/en/models/overview)
- Prompt caching is based on matching prompt prefixes. Changing content before a cache breakpoint changes the prefix and prevents a hit; volatile values belong after the stable prefix. — [Anthropic — Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- For Sonnet 5 and Haiku 4.5, a 5-minute cache write is 1.25× base input price and a cache read is 0.1×. Caching 4,500 of the 5,800 input tokens in the worked example reduces a steady-state call from $0.0156 to about $0.0075, saving about $0.0081/call or $324/day at 40,000 calls. — [Anthropic — Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) and [Anthropic — Models overview](https://platform.claude.com/docs/en/models/overview)
- Opus 5.5 cache reads are currently 0.05× and Fable 5.1 reads are 0.025×, exceptions to the general 0.1× rate. — [Anthropic — Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI also documents automatic prompt caching and recommends putting static content first and variable content later. — [OpenAI — Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- For `bedrock-runtime` in `us-east-1`, AWS lists `us.anthropic.claude-haiku-4-5-20251001-v1:0` as a US geo inference-profile ID. — [AWS — Claude Haiku 4.5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)

## Sources (canonical, stable URLs preferred)

- Anthropic — Models overview — https://platform.claude.com/docs/en/models/overview
- Anthropic — Pricing — https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic — Prompt caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- OpenAI — Prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching
- AWS — Claude Haiku 4.5 model card — https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
