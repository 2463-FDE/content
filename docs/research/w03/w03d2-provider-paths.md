# W3·D2 — provider-path evidence (AWS / GCP)

Scope: the claims made in the shared lead-in, the AWS and GCP provider blocks, and
the two provider decision checks in step 5 ("Transports") of `weeks/w03/w03d2.html`.
The protocol content of the page is unchanged and stays backed by `docs/research/w03/w03d2.md`.
All sources first-party; **accessed 2026-10-14** with `curl` (HTML → text). No quiz
questions were added (W3 keeps exactly 6) and the code popup is untouched.

Shared lead-in claim: the protocol is the same open standard on both clouds; only
hosting, identity and discovery differ. Backed by both clouds describing remote MCP
servers in protocol terms (`tools/list`, Streamable HTTP, MCP authorization spec) below.

## AWS — Amazon Bedrock AgentCore Gateway

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html

- "Amazon Bedrock AgentCore Gateway is a fully managed AI gateway that provides a single, secure entry point for agentic traffic—connecting agents to tools, to other agents, and to large language models (LLMs)."
- "it converts APIs, Lambda functions, and existing services into Model Context Protocol (MCP)-compatible tools".
- "Gateway supports OpenAPI, Smithy, and Lambda as tool input types".
- "Manage both inbound authentication (verifying agent identity) and outbound authentication (connecting to tools) in a single service."
- Translation capability: "Converts agent requests using protocols like Model Context Protocol (MCP) into API requests and Lambda invocations".

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-core-concepts.html

- "For MCP targets, the gateway operates in aggregation mode, acting as an MCP server that combines the capabilities of all its MCP targets into a unified virtual MCP server." / "Clients see one consolidated tools/list response that includes tools from all attached MCP targets."
- MCP target types include "Lambda functions, API Gateway REST APIs, OpenAPI specifications, Smithy models, MCP servers" (lesson: "it can front existing MCP servers too").
- "Each gateway must have an inbound authorization configuration to control client access. The gateway supports the following inbound authorization types: OAuth (JWT) for token-based authorization, IAM (AWS Signature Version 4) …, authenticate only …, and no authorization for development and testing scenarios." Lesson says "such as OAuth (JWT) or IAM (SigV4)".
- Credential providers: for OpenAPI or MCP server targets "you can attach an AgentCore credential provider which stores the API Key or OAuth credentials"; Smithy/Lambda targets use the attached execution role. Lesson: "credential providers handle outbound auth to each tool" (paraphrase of the outbound side).

## AWS — AgentCore Runtime hosting an MCP server

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html

- "Amazon Bedrock AgentCore Runtime lets you deploy and run Model Context Protocol (MCP) servers in the AgentCore Runtime."
- "When you configure a Amazon Bedrock AgentCore Runtime with the MCP protocol, the service expects MCP server containers to be available at the path 0.0.0.0:8000/mcp".
- "Amazon Bedrock AgentCore supports both stateless and stateful streamable-HTTP MCP servers. By default, stateless mode ( stateless_http=True ) is recommended for basic MCP servers." / "For MCP servers that require multi-turn interactions (elicitation), LLM-generated content (sampling), or progress notifications, stateful mode ( stateless_http=False ) enables these capabilities."
- Deployment example configures a `CUSTOM_JWT` authorizer (Cognito) before `agentcore deploy` — consistent with the AWS check's framing that Runtime is for servers you write yourself.

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html

- "AgentCore Runtime provides a secure, serverless and purpose-built hosting environment for deploying and running AI agents or tools."
- "AgentCore Runtime lets agents communicate with other agents and tools via Model Context Protocol (MCP) or Agent to Agent (A2A)."
- "each user session runs in a dedicated microVM with isolated CPU, memory, and filesystem resources."

## GCP — Google Cloud MCP servers (Google-managed remote MCP servers)

Source: https://docs.cloud.google.com/mcp/overview (page "Last updated 2026-10-13 UTC")

- "Remote Model Context Protocol (MCP) servers let you use Google and Google Cloud services in your AI applications with governance, security, and access control." / "Google Cloud remote MCP servers support MCP version 2026-07-28."
- "Remote MCP servers run on the service's infrastructure and offer an HTTP endpoint to AI applications".
- Stateless core: "With MCP version 2026-07-28, MCP changes from a bidirectional, stateful protocol to a stateless protocol. … You don't need the initialize/initialized handshake or Mcp-Session-Id".
- Discovery: "AI applications can discover the server's capabilities … by using MCP discovery methods like tools/list, prompts/list, and resources/list. You can manage MCP servers in Agent Registry."
- "Administrative controls: Control MCP use with Identity and Access Management (IAM) policies." / "Identity and Access Management (IAM) deny policies help you secure Google Cloud MCP servers."
- "Google and Google Cloud remote MCP servers are compliant with the MCP authorization specification."
- Toolsets: "some Google and Google Cloud MCP servers offer logical groups of MCP tools called toolsets. Each toolset has its own HTTP endpoint and functions as a virtual MCP server." Rationale: "Agents can become slow, confused, and expensive to run when you load too many tools into context."
- "Model Armor: Scan MCP calls and responses to help protect against security risks".
- Publishing: "Developers who want to create their own MCP server can host it on Cloud Run." (Apigee is the option for publishing an existing API; not used in the lesson.)

## GCP — hosting a custom MCP server on Cloud Run

Source: https://docs.cloud.google.com/run/docs/host-mcp-servers (page "Last updated 2026-10-13 UTC")

- "Cloud Run supports hosting MCP servers with streamable HTTP transport, but not MCP servers with stdio transport." (Backs the GCP check's correct answer.)
- Deploy as a container image (`gcloud run deploy --image IMAGE_URL --port PORT`) or from sources (`gcloud run deploy --source .`).
- "By default, the URL of Cloud Run services requires all requests to be authorized with the Cloud Run Invoker (roles/run.invoker) IAM role."
- Local clients: "IAM invoker permission" via `gcloud run services proxy` ("creates a local proxy … that forwards requests to the remote MCP server and injects your identity"), "OIDC ID token", or "Use IAP".

## GCP — Agent Registry

Source: https://docs.cloud.google.com/agent-registry/overview (page "Last updated 2026-10-13 UTC")

- "Agent Registry is a centralized catalog that lets you store, discover, and govern agentic components, such as Model Context Protocol (MCP) servers, tools, standalone skills, and AI agents, within Google Cloud."

## Provider decision checks

- AWS check (40 OpenAPI-described REST APIs → one MCP endpoint with OAuth inbound): correct = AgentCore Gateway with OpenAPI targets (conversion + aggregation + inbound authorizer, sources above). Distractors rely on: Runtime hosts custom servers (runtime-mcp); stdio is local (lesson step 5, spec); HTTP+SSE is deprecated (lesson step 5, `w03d2.md`).
- GCP check (stdio server deployed to Cloud Run unchanged): correct = must switch to Streamable HTTP first (Cloud Run page quote). Distractors rely on: Agent Registry is a catalog (Agent Registry overview); Cloud Run requires the Invoker role by default (Cloud Run page).

## Not claimed

No prices, quotas, regional availability, session-duration limits, or payload limits
are stated. AgentCore Gateway's semantic tool search and 1-click integrations, Apigee
MCP publishing, and MCP Apps are documented but not taught on this page.
