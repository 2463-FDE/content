# w04d4 — Operating multi-agent systems (v3 production bridge)

Research date: 2026-10-27. The authoritative LTIM FDE v3 PDF assigns this day to cost/latency, parallelism, caching, per-agent token budgets, approval gates, trace correlation, cost dashboards, Claude Code subagents, and the `ChatBedrock` / `ChatAnthropicVertex` provider seam. The earlier Neo4j material remains preserved in `w04d4.md` and is now optional Week 5 preview/history.

## Current claims

- Parallel workers are appropriate only for independent work; orchestrator-worker is a named workflow in which a central LLM dynamically breaks down tasks, delegates to workers, and synthesizes results. — [Anthropic, Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- Prompt caching reduces repeated input processing, but cache behavior is provider-specific and must be measured rather than assumed across a provider swap. — [Amazon Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) · [Vertex AI context cache](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview)
- OpenTelemetry traces provide the portable correlation layer; GenAI semantic conventions describe model and agent spans while provider exporters determine where those spans land. — [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- A provider-swap seam is an adapter boundary, not a promise of behavioral parity. The architecture must normalize the message/tool contract and separately test model identity, tool-call shape, streaming, errors, usage fields, caching, and telemetry. — [LangChain chat-model integrations](https://docs.langchain.com/oss/python/integrations/chat)
- Human approval belongs before a high-impact side effect, with one named write owner and a durable decision record. — [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- Claude Code subagents have separate context windows, custom prompts, scoped tool access, and permissions; they can isolate high-volume work from the main conversation. — [Claude Code subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

## Safety and exercise boundary

The lesson uses arithmetic on a synthetic trace ledger and static adapter examples. It does not call a model, create cloud resources, read credentials, provision billing/IAM, or publish a dashboard. Any cost figures are learner-supplied scenario inputs, not provider prices.

## Sources

- https://www.anthropic.com/research/building-effective-agents
- https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview
- https://opentelemetry.io/docs/specs/semconv/gen-ai/
- https://docs.langchain.com/oss/python/integrations/chat
- https://docs.langchain.com/oss/python/langgraph/interrupts
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
