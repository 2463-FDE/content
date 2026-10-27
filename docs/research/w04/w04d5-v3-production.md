# w04d5 — Multi-agent architecture defense and delivery

Research date: 2026-10-27. The LTIM FDE v3 authority assigns this day to explicit agent boundaries and structural handoffs, a Claude Code subagent retrospective, Gemini Enterprise Agent Platform practice, ServiceNow/Jira mock MCP boundaries, architecture and code defense, brownfield orchestration delivery, two-audience readout, and feedback. The former GraphRAG lesson remains preserved in repository history and as an optional Week 5 bridge.

## Current claims

- MCP tools are schema-described capabilities. Hosts must obtain user consent before tool invocation and must treat tool annotations as untrusted unless the server is trusted. This supports a static mock of ticket-system boundaries without contacting ServiceNow or Jira. — [MCP tools specification, 2025-11-25 deployed baseline](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- Gemini Enterprise Agent Platform's managed runtime is now named Agent Runtime (formerly Agent Engine); its documentation supports ADK and other frameworks. The lesson treats it as a placement option to defend, not as an account-provisioning lab. — [Google Cloud Agent Runtime overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)
- Agent2Agent uses an Agent Card for discovery and task/message exchange across agent boundaries. It can describe a cross-runtime handoff but does not replace application-level authorization or domain policy. — [A2A protocol documentation](https://a2a-protocol.org/latest/)
- Clear handoffs require an explicit owner, typed input/output, allowed tools, stop/escalation conditions, and an evidence trail. LangGraph's `Command` combines state updates with routing, while MCP tool schemas define integration boundaries. — [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) · [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- Claude Code subagents isolate work in separate contexts with scoped tools and permissions; the retrospective should evaluate boundary quality and evidence, not celebrate agent count. — [Claude Code subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

## Exercise boundary

All exercises use synthetic ticket summaries and inert schemas. Learners do not authenticate to Gemini, ServiceNow, Jira, or any MCP endpoint; they do not deploy, provision, send email, or use client data. The readout separates an executive outcome/risk statement from a technical architecture/evidence defense.

## Sources

- https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview
- https://a2a-protocol.org/latest/
- https://docs.langchain.com/oss/python/langgraph/graph-api
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
