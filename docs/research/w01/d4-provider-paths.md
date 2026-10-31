# W1·D4 — provider-path evidence (AWS / GCP)

Scope: the claims made in the AWS and GCP provider blocks, the provider decision
checks, the provider quiz questions, and the GCP code tab on `weeks/w01/d4.html` (the consolidated single-topic Day 4 route; this material formerly lived on `d4b.html`).
All sources first-party; **accessed 2026-10-14** with `curl` (HTML → text).

## AWS — Amazon Bedrock Guardrails

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html

- Safeguards listed: **content filters** (Hate, Insults, Sexual, Violence, Misconduct and **Prompt Attack**, with configurable strength), **denied topics**, **word filters**, **sensitive information filters** ("block or mask sensitive information, such as personally identifiable information (PII), in user inputs and model responses"; custom regex supported), **contextual grounding checks** ("detect hallucinations in model responses if they are not grounded … in the source or are irrelevant to the user's query"; e.g. RAG applications), and **Automated Reasoning checks** ("validate the accuracy of foundation model responses against a set of logical rules").
- Guardrails apply to user inputs and model responses ("excluding reasoning content blocks").

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html

- "You can use the ApplyGuardrail API to assess any text using your pre-configured Amazon Bedrock Guardrails, without invoking the foundation models." User inputs and FM outputs can be evaluated independently.

## AWS — current code-example model ID

Source (accessed 2026-10-27): https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html

The model card lists `us.anthropic.claude-haiku-5-5` as a US geo inference-profile ID for `bedrock-runtime`. A geo profile may route across Regions in its geography and is not a single-Region guarantee. This static review made no account call and does not claim organization-specific enablement.

## GCP — Model Armor

Source: https://docs.cloud.google.com/model-armor/overview (page "Last updated 2026-10-13 UTC")

- "Model Armor is a Google Cloud service designed to enhance the security and safety of your AI applications. It works by proactively screening LLM prompts and responses … Whether you are deploying AI in Google Cloud or other cloud providers".
- Data flow: inspect prompt → (sanitized) prompt to the LLM → inspect response → (sanitized) response returned, with "a detailed description of triggered and untriggered filters".
- **Templates** configure filters and thresholds; documented practice: separate input and output templates.
- Filters documented: **responsible AI safety** (hate speech, harassment, sexually explicit, dangerous content; CSAM applied by default), **prompt injection and jailbreak detection**, **Sensitive Data Protection** (PII and other infoTypes), and **malicious URL** detection (use-case list; output template guidance mentions malicious URLs).
- The overview's filter list contains **no source-grounding / hallucination check** (searched the page for "grounding" and "hallucinat": no matches). Lesson claim derived: on the GCP path, Guardrail 3 (grounding) stays in application code; Model Armor covers safety, injection, sensitive data and URLs.

Source: https://cloud.google.com/security/products/model-armor

- Product page: "Screens AI prompts, responses, and agent interactions"; "Blocks prompt injection, jailbreaking, and malware"; usable "with any cloud or infrastructure" via REST API.

## GCP — structured output (code tab)

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/control-generated-output (redirected from the former Vertex AI URL; "Last updated 2026-10-13 UTC")

- Python sample: `pip install --upgrade google-genai`; env `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global`, `GOOGLE_GENAI_USE_ENTERPRISE=True`; `genai.Client(http_options=HttpOptions(api_version="v1"))`; `client.models.generate_content(model="gemini-3.5-flash", contents=…, config={"response_mime_type": "application/json", "response_schema": …})`.
- "To ensure 100% valid JSON objects, requests must include both a response_schema and response_mime_type: "application/json"." JSON mode without a schema "acts only as a strong hint". The lesson keeps its own validation layer regardless (shape ≠ facts).

## Not claimed

Prices, quotas, regional availability, and per-unit costs for either service are not stated on this page.
