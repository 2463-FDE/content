# W3·D3 — provider-path evidence (AWS / GCP)

Scope: the claims made in the shared lead-in, the AWS and GCP provider blocks, and
the two provider decision checks in the new step "On your cloud · the provider SDK"
of `weeks/w03/w03d3.html`. The framework-landscape content stays backed by
`docs/research/w03/w03d3.md`. All sources first-party; **accessed 2026-10-14** with
`curl` (HTML → text). No quiz questions were added (W3 keeps exactly 6) and the code
popup is untouched.

Shared lead-in: the program builds on LangChain v1 `create_agent` (existing lesson
step 1, backed by `w03d3.md`); each cloud ships its own open-source agent SDK and a
managed runtime (both below).

## AWS — Strands Agents

Source: https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-frameworks/strands-agents.html

- "Strands Agents is an open-source SDK that was initially released by AWS … designed for building autonomous AI agents with a model-first approach".
- "Multi-agent collaboration patterns – Built-in coordination models such as Swarm, Graph and Workflow patterns".
- "MCP integration – Native support for the Model Context Protocol (MCP)".
- "AWS service integration – Seamless connection to Amazon Bedrock, AWS Lambda, AWS Step Functions, and other AWS services" (lesson: "Strands buys tight AWS-service integration").

Source: https://aws.amazon.com/blogs/opensource/introducing-strands-agents-an-open-source-ai-agents-sdk/ (AWS Open Source Blog, 16 May 2025)

- "The simplest definition of an agent is a combination of three things: 1) a model, 2) tools, and 3) a prompt." / "In a model-driven approach, the agent uses the model to dynamically direct its own steps".
- Loop: "In each loop, Strands invokes the LLM with the prompt and agent context, along with a description of your agent's tools. … When the LLM selects a tool, Strands takes care of executing the tool and providing the result back to the LLM. When the LLM completes its task, Strands returns the agent's final result." (Lesson: "the same loop `create_agent` runs" — comparison to lesson step 1's description of `create_agent`.)
- "You can easily use any Python function as a tool, by simply using the Strands @tool decorator." / "You can choose from thousands of published Model Context Protocol (MCP) servers to use as tools".
- "Strands can run anywhere and can support any model with reasoning and tool use capabilities, including models in Amazon Bedrock, Anthropic, Ollama, Meta, and other providers through LiteLLM."

## AWS — deploying to Amazon Bedrock AgentCore Runtime

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/using-any-agent-framework.html

- "You can use open source AI frameworks to create an agent or tool. This topic shows examples for a variety of frameworks, including Strands Agents, LangGraph, and Google ADK." Topics: Strands Agents, LangGraph, Google Agent Development Kit (ADK), OpenAI Agents SDK.
- Each example: `from bedrock_agentcore.runtime import BedrockAgentCoreApp`, `app = BedrockAgentCoreApp()`, an `@app.entrypoint` handler that invokes the agent (Strands `agent(...)`, LangGraph `graph.invoke(...)`), then `app.run()`.

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html

- "Framework agnostic … Works seamlessly with popular frameworks like LangGraph, Strands, and CrewAI."
- "Model flexibility: AgentCore Runtime works with any Large Language Model, such as models offered by Amazon Bedrock, Anthropic Claude, Google Gemini, and OpenAI." (Backs the AWS-check distractor about switching to a Bedrock model.)
- "each user session runs in a dedicated microVM with isolated CPU, memory, and filesystem resources."

LangChain fact used in the AWS comparison ("a LangGraph-based agent — which is what `create_agent` builds"): lesson step 1 states "LangChain agents are built on LangGraph", backed by `w03d3.md` (LangChain v1 announcement).

## GCP — Agent Development Kit (ADK)

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk (page "Last updated 2026-10-13 UTC")

- "Agent Development Kit (ADK) is an open-source agent development framework that lets you build, debug, and deploy reliable AI agents at enterprise scale."
- "Users can leverage flexible orchestration to define predictable pipelines using workflow agents or rely on agent-coordinated dynamic routing for more adaptive behavior. It natively supports multi-agent architectures, allowing developers to compose specialized teams of agents that can collaborate and delegate tasks."
- "Apply built-in and partner evaluation tools to test execution trajectories."
- "Run agents locally or scale them globally using Runtime, Cloud Run, or Google Kubernetes Engine." / "ADK is available in Python, TypeScript, Go, and Java."

Note: `https://google.github.io/adk-docs/` now redirects to `adk.dev`, which is outside the allowed host list, so ADK claims are taken only from docs.cloud.google.com.

## GCP — Agent Runtime (formerly Agent Engine) on Gemini Enterprise Agent Platform

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime (page "Last updated 2026-10-13 UTC")

- "Agent Runtime is a fully-managed, opinionated runtime that you can use to deploy, operate, and scale agentic applications."
- "Agent Runtime supports deploying agents written in any programming language and agent framework, as long as the agent application can be containerized and conforms to the runtime contract".
- Support levels table: "Custom template … CrewAI, custom frameworks"; "Agent Platform SDK integration: Agent Runtime provides managed templates per framework in the Agent Platform SDK and documentation. LangChain, LangGraph, AG2, LlamaIndex"; "Full integration … Agent Development Kit (ADK) — Python: Deploy using the adk CLI."
- API resource still named `ReasoningEngine` "Because the name of Agent Runtime changed over time".

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/create-a-langchain-agent

- "Agent Runtime lets you develop and deploy agents using the framework-specific LangChain template. By using the LangchainAgent class in the Agent Platform SDK …"

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/create-an-adk-agent

- "Agent Runtime lets you develop and deploy agents using the Agent Development Kit (ADK) template. By using the AdkApp class in the Agent Platform SDK for Python …" (lesson: "wrap the agent in `AdkApp`").

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes

- "Agent Builder is now part of Gemini Enterprise Agent Platform. Features have been renamed as follows: Agent Engine is now Agent Runtime." (Backs "Agent Runtime (formerly Agent Engine)".) The former URL `https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview` redirects into `docs.cloud.google.com/gemini-enterprise-agent-platform/scale`.

## Provider decision checks

- AWS check (Strands-standardized client; must the LangChain agent be rewritten?): correct = it runs via a `BedrockAgentCoreApp` entrypoint, as documented for LangGraph. Distractors rely on: framework-agnostic Runtime; any-LLM model flexibility; Gateway converts APIs/services into tools (see `w03d2-provider-paths.md`) rather than hosting agents.
- GCP check (ADK-standardized client; same question): correct = LangChain has a managed template, ADK the deepest (full) integration. Distractors rely on: any containerized framework is supported; A2A is one supported option ("Deploy agents built using different languages and frameworks and the Agent2Agent open protocol"), not a prerequisite; ADK page lists Cloud Run as another target.

## Not claimed

No prices, quotas, regional availability, session-duration limits, or SDK version
numbers. AgentCore Runtime instance types, Agents CLI, Memory Bank and Sessions are
documented but not taught on this page.
