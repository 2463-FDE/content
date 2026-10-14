# W3·D4 — provider-path evidence (AWS / GCP)

Scope: the claims made in the shared lead-in, the AWS and GCP provider blocks, and
the two provider decision checks in step 7 ("On your cloud · managed memory") of
`weeks/w03/w03d4.html`. The quiz (6 questions) and the read-only code popup are
unchanged. All sources first-party; **accessed 2026-10-14** with `curl` (HTML → text).

## Shared lead-in

Derived from both providers' docs below: each sells a short-term tier (a session of
events) and a long-term tier (extracted, scoped records) as managed services, and
each documents that what gets extracted (strategies / topics), how records are
addressed (namespaces / scopes), and when the agent retrieves are configuration
and orchestration choices left to the builder. Lesson claim: the memory policy
(write / namespace / read) is yours; the service stores, extracts and retrieves.

## AWS — Amazon Bedrock AgentCore Memory

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html

- "AgentCore Memory is a fully managed service … to handle both short-term context and long-term knowledge retention without the need to build or manage complex infrastructure."
- Addresses "statelessness": "Without memory capabilities, AI agents treat each interaction as a new instance".

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-terminology.html

- Session: "A unique sessionId is used to group all events within that conversation." Actor: "A unique actorId maintains that memory records are correctly associated with the individual or system."
- Event: "the fundamental unit of short-term memory … Events are stored using the CreateEvent operation and are organized by actorId and sessionId. Each event is immutable and timestamped".
- Namespace: "a structured path used to logically group and organize long-term memories … aids in retrieval, filtering, and access control."

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-types.html

- Short-term: "stores raw interactions that help the agent maintain context within a single session"; each interaction "can be captured as an event using the CreateEvent operation. Events can contain … conversational exchanges (questions, answers, instructions) or structured information"; history retrieved "Through ListEvents".
- Long-term: "Long-term memory generation is an asynchronous process that runs in the background and automatically extracts insights after raw conversation/context is stored in short-term memory via CreateEvent, or submitted directly through IngestData." Operations: "Extraction" and "Consolidation".
- Retrieval: "accessed using the GetMemoryRecord, ListMemoryRecords, or RetrieveMemoryRecords operations. The RetrieveMemoryRecords operation … performs a semantic search to find memory records that are most relevant to the query."

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-strategies.html

- "These strategies determine what types of information to extract from raw conversations … You can add strategies to the memory resource as part of CreateMemory or UpdateMemory operations."
- "If no strategies are specified, long-term memory records will not be extracted for that memory." (AWS check: correct answer.)
- Strategy kinds: built-in, built-in overrides, self-managed.

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/built-in-strategies.html

- Built-in strategy steps: Extraction, Consolidation, Reflection ("Insights are generated across episodes"). Topics listed: Semantic memory strategy, User preference memory strategy, Summary strategy, Episodic memory strategy.

Supporting strategy pages (not cited in Sources; used for the parenthetical glosses):

- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/semantic-memory-strategy.html — "identify and extract key pieces of factual information"; default namespace `/strategy/{memoryStrategyId}/actors/{actorId}/`.
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/summary-strategy.html — "condensed, real-time summaries of conversations within a single session"; namespace requires `sessionId`.
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/episodic-memory-strategy.html — episodes plus "Reflections … analyzing past episodes to surface insights, patterns, and higher level conclusions."
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/user-preference-memory-strategy.html — "extract user preferences, choices, and styles".

Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/best-practices.html

- "Memory poisoning represents a threat where attackers embed false information in conversations to corrupt long-term memory stores."
- Shared responsibility: "customers bear the responsibility for secure application development, input validation, and preventing prompt injection vulnerabilities in the memory extraction service."
- "Input validation forms the foundation of protection at the CreateEvent API level. Sanitize the user input data with guardrails prior to persistence to memory".

## GCP — Agent Platform Sessions and Memory Bank (Gemini Enterprise Agent Platform)

Old URLs `cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/{memory-bank,sessions}/overview`
now redirect to a generic `…/gemini-enterprise-agent-platform/scale` page; the
current pages below were reached from its navigation.

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sessions (page "Last updated 2026-10-13 UTC")

- "Agent Platform Sessions maintains the history of interactions between a user and agents. Sessions provide definitive sources for long-term memory and conversation context."
- "Agent Development Kit: Once you deploy your Agent Development Kit (ADK) agent to Gemini Enterprise Agent Platform, session management is handled automatically."
- Session: "the chronological sequence of messages and actions (events) for a single, ongoing interaction". Event: "stores the content of the conversation, as well as the actions taken by the agents such as function calls." State: "temporary data relevant only during the current conversation." Memory: "personalized information that can be accessed across multiple sessions for a particular user."
- Functions: create, resume, "Append new interactions (events)", list, clean up.

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank (page "Last updated 2026-10-13 UTC")

- "Agent Platform Memory Bank lets you dynamically generate long-term memories based on conversations between the user and your agent … persists across multiple sessions".
- "For each scope, Memory Bank maintains an isolated collection of memories." Features: "Create, refine, and manage memories using a large language model (LLM)"; extraction; consolidation; "Asynchronous generation: Generate memories in the background"; "Similarity search … scoped to a specific identity"; optional TTL ("Automatic expiration").
- Example flow: "(Sessions) CreateSession … All sessions must have a user ID"; "(Sessions) AppendEvent"; "(Sessions) ListEvents"; "GenerateMemories: At a specified interval (such as the end of every session or the end of every turn)"; "CreateMemory: Your agent can write memories directly … (memory-as-a-tool)"; "RetrieveMemories … retrieve all memories (simple retrieval) or only the most relevant memories … (similarity search retrieval)".
- "Memory poisoning occurs when false information is stored in Memory Bank. The agent may then operate on this false or malicious information in future sessions."

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank/generate-memories (page "Last updated 2026-10-13 UTC")

- "Extraction … Only information that matches at least one of your instance's memory topics will be persisted." "Consolidation: Identifies if existing memories with the same scope should be deleted or updated".
- "By default, Memory Bank persists all of the following managed topics: User information (USER_PERSONAL_INFO) … User preferences (USER_PREFERENCES) … Key conversation events and task outcomes (KEY_CONVERSATION_DETAILS) … Explicit remember / forget instructions (EXPLICIT_INSTRUCTIONS)". (GCP check: the preferences distractor.)

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank/fetch-memories (page "Last updated 2026-10-13 UTC")

- "Only memories that have the exact same scope (independent of order) as the retrieval request are returned. For example, … scoped to a particular user by using {"user_id": "123"}." "A memory's scope is defined when the memory is generated or created and is immutable." Retrieve all, or by similarity search. (GCP check: correct answer; the scope in the question is a hypothetical example.)

## Not claimed

Prices, quotas, regional availability, retention defaults and SDK versions for
either service are not stated on the page.
