# W4·D3 — provider-path evidence (AWS / GCP)

Scope: the claims made in the shared lead-in, the AWS and GCP provider blocks, and
the two provider decision checks in the "The decision" step of `weeks/w04/w04d3.html`.
The framework comparison (LangGraph / CrewAI / Agent Framework) and its evidence stay
in `w04d3.md`; nothing here changes those claims. No quiz questions or code popup
changes (W4 contract). All sources first-party; **accessed 2026-10-14** with `curl`
(HTML → text).

## AWS — Strands Agents multi-agent patterns

Source: https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-frameworks/strands-agents.html

- "Strands Agents is an open-source SDK that was initially released by AWS".
- Key feature: "Multi-agent collaboration patterns – Built-in coordination models such as Swarm, Graph and Workflow patterns that enable scalable collaboration and governance across distributed agent networks."
- Lesson claim: Strands ships named Swarm / Graph / Workflow patterns. The lesson does **not** characterize how each pattern routes beyond its name.

## AWS — Amazon Bedrock AgentCore Runtime

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html

- "Framework agnostic — AgentCore Runtime lets you transform any local agent code to cloud-native deployments with a few lines of code no matter the underlying framework. Works seamlessly with popular frameworks like LangGraph, Strands, and CrewAI."
- "Protocol support — AgentCore Runtime lets agents communicate with other agents and tools via Model Context Protocol (MCP) or Agent to Agent (A2A)."
- "Session isolation — In AgentCore Runtime, each user session runs in a dedicated microVM with isolated CPU, memory, and filesystem resources."
- Describes Runtime as "a secure, serverless and purpose-built hosting environment for deploying and running AI agents or tools."

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html

- "AgentCore services work together or independently with any open-source framework such as CrewAI, LangGraph, LlamaIndex, and Strands Agents and with any foundation model".
- Runtime row: works with "CrewAI, LangGraph, LlamaIndex, Google ADK, OpenAI Agents SDK, and Strands Agents … and popular protocols like MCP and A2A."

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a.html (supporting; not cited on the page)

- AgentCore Runtime can "deploy and run Agent-to-Agent (A2A) servers"; preserves "agent discovery through Agent Cards at /.well-known/agent-card.json and JSON-RPC communication".

## AWS — multi-agent collaboration in Amazon Bedrock Agents (Agents Classic)

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html

- Note at the top of the page: "Amazon Bedrock Agents (now Amazon Bedrock Agents Classic) is no longer open to new customers. For capabilities similar to Bedrock Agents Classic, explore Amazon Bedrock AgentCore. Existing customers can continue to use the service as normal."
- "you can quickly designate an Amazon Bedrock Agent as the supervisor and then associate one or more collaborator agents with the supervisor."
- "When you invoke the supervisor agent, it automatically creates and executes a plan across a set of collaborator agents and routes relevant requests and tasks to the appropriate collaborator agent."

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/create-multi-agent-collaboration.html (supporting; not cited on the page)

- Collaboration modes `SUPERVISOR` (coordinate responses) vs `SUPERVISOR_ROUTER` (route to the appropriate collaborator). Not used on the page.

Lesson claims derived: supervisor + collaborators is real; Agents Classic is closed to new customers and AWS points to AgentCore; a new AWS client with a LangGraph supervisor keeps it and hosts it on AgentCore Runtime (check answer).

## GCP — ADK workflow agents, graph workflows, collaborative teams

ADK docs moved: `https://google.github.io/adk-docs/...` now redirects to `https://adk.dev/...`; final URLs cited.

Source: https://adk.dev/agents/workflow-agents/ (redirected from https://google.github.io/adk-docs/agents/workflow-agents/)

- Template workflow agents "are specialized agents that control the execution flow of one or more sub-agents."
- "Template workflow agents operate based on predefined logic. They determine the execution sequence according to their type, such as sequential, parallel, or loop, without consulting an AI model for assistance with the orchestration."
- Sequential ("Executes sub-agents one after another"), Loop ("Repeatedly executes its sub-agents until a specific termination condition is met"), Parallel ("Executes multiple sub-agents in parallel").
- "Starting in ADK 2.0 for Python and Go, template workflows have been superseded by more flexible workflow structures, including graph-based workflows and dynamic workflows."

Source: https://adk.dev/graphs/

- "Graph-based workflows allow you to define your agent logic as a graph of execution nodes and edges, combining AI-powered agent reasoning with deterministic tools and code."
- "Define precise logic: Explicitly map out routing logic to manage transitions between different nodes." Supported in ADK Python/TypeScript/Go v2.0.0.

Source: https://adk.dev/workflows/collaboration/

- "In a collaborative agent team in ADK, a coordinator agent handles delegation of tasks to one or more subagents."
- Code sample: `root = Agent(name="travel_planner", sub_agents=[weather_agent, flight_agent])` with comment "Auto-injects delegation tools named after each subagent".
- Go text: "Declaring SubAgents on the coordinator agent causes ADK to automatically generate a delegation tool for each subagent, named after the subagent itself".

Source: https://adk.dev/workflows/ (supporting; not cited on the page)

- Lists graph-based, dynamic, collaborative (ADK 2.0+) and template workflows.

## GCP — Agent2Agent (A2A)

Source: https://adk.dev/a2a/intro/

- "Local Sub-Agents: These are agents that run within the same application process as your main agent."
- "Remote Agents (A2A): These are independent agents that run as separate services, communicating over a network."
- Use A2A when "The agent you need to talk to is a separate, standalone service", "The agent is maintained by a different team or organization", or "You need to connect agents written in different programming languages or agent frameworks."
- Consuming side: `RemoteA2aAgent` client to an exposed `A2AServer`.

Source: https://a2a-protocol.org/latest/topics/what-is-a2a/

- "A2A is a communication protocol for agents. It enables inter-agent communication regardless of the framework used to build each agent. … The protocol does not depend on, or favor, any single framework."
- "Agent discovery: The client fetches the server's Agent Card to learn its capabilities and endpoint." then messaging (SendMessage / SendStreamingMessage).
- "A2A crosses the boundary between agents; MCP stays within one agent".

Lesson claims derived: A2A is framework-neutral; a client reads the Agent Card then sends messages; ADK's rule is sub-agents in-process vs A2A across services/teams/frameworks; A2A is a protocol, not an orchestrator (used in the AWS distractor rationale too).

## GCP — Agent Runtime (formerly Agent Engine)

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale (the former `https://docs.cloud.google.com/agent-builder/agent-engine/overview` redirects here)

- "Utilizing a fully managed Agent Runtime to deploy and scale agents efficiently without the need to manage underlying infrastructure".
- Guides listed: "Use a custom agent", "Use a LangChain agent", "Use a LangGraph agent", "Use a LlamaIndex Query Pipeline agent", "Use an Agent2Agent agent", "Use an Agent Development Kit (ADK) agent", "Use an AG2 agent" — each "with Agent Platform Runtime".
- CrewAI is **not** in the listed guides, so the page does not claim Agent Runtime hosts CrewAI by name.

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview (supporting; not cited on the page)

- "Scale agents with Agent Runtime: High-performance, scalable runtime environment for deploying and managing agents". Agent Studio is listed as "A low-code visual canvas for designing, prototyping, and managing agent reasoning loops and workflows" — not used on the page (Gemini Enterprise agent designer not covered).

## Not claimed

- No prices, quotas (e.g. Bedrock Agents' collaborator limit), regional availability, or session-duration limits.
- No claim about AWS Step Functions orchestrating agents (only mentioned as an integration on the Strands page; not taught).
- No claim that Agent Runtime hosts CrewAI; no Gemini Enterprise low-code agent designer claim.
- strandsagents.com pattern pages were not used (outside the first-party host list for this task).
