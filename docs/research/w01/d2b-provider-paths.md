# W1·D2·Part 2 — provider-path evidence (AWS / GCP)

Scope: the claims made in the AWS and GCP provider blocks, the provider decision
checks, the provider quiz questions, and the GCP code tab on `weeks/w01/d2b.html`.
All sources first-party; **accessed 2026-10-14** with `curl` (HTML → text).

Shared lead-in claim: the provider call surface, throttling errors and SDK retry
knobs differ; the integration pattern on the page (stream, throttle, retry only
transient errors with bounded backoff + jitter, idempotency, deadline, fallback)
does not. Both providers' own guidance below recommends exponential backoff with
jitter and bounded attempts.

## AWS — Converse / ConverseStream (call + streaming surface)

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html

- "To use the Converse API, you use the Converse or ConverseStream (for streaming responses) operations to send messages to a model."
- "the Converse API provides a consistent API that works with all Amazon Bedrock models that support messages. This means you can write code once and use it with different models."

Source: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html

- "Sends messages to the specified Amazon Bedrock model and returns the response in a stream."
- `modelId`: "If you use an inference profile, specify the inference profile ID or its ARN."
- Response stream events include `contentBlockDelta` ("The messages output content block delta") and `metadata` ("Metadata for the converse output stream").
- The response stream itself can carry exceptions: `throttlingException` (HTTP 429), `serviceUnavailableException` (503), and `modelStreamErrorException` ("A streaming error occurred. Retry your request." HTTP 424). Lesson claim derived: on Bedrock a failure can arrive mid-stream, after tokens have already been shown.
- Operation errors include `ThrottlingException` (429, "exceeding the account quotas for Amazon Bedrock"), `ServiceUnavailableException` (503), `ModelTimeoutException` (408), `ValidationException` (400).

## AWS — throttling and capacity errors

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html

- **ThrottlingException**, HTTP 429: "The request was denied due to exceeding the account quotas for Amazon Bedrock." Solution: "retries with exponential backoff … and random jitter"; for "predictable, sustained throughput requirements, consider Reserved Tier or Provisioned Throughput, depending on what your model supports"; request a quota increase.
- **ServiceUnavailable**, HTTP 503: "the service is experiencing high demand or temporary capacity constraints. This is not related to your account-level quotas or rate limits (which return 429 ThrottlingException)." Solution: retries with exponential backoff and random jitter; "Consider switching to a different AWS Region"; "Use Cross-Region inference to route your requests by using compute across different AWS Regions."
- **ValidationError**, HTTP 400: input fails constraints — review the request (not a retry case).
- (Not used on the page: Reserved Tier, `overloaded_error` 529, TCP keep-alive guidance.)

## AWS — SDK retry modes (botocore / all AWS SDKs)

Source: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html

- Caveat on the page: "The behavior described on this page requires opting in until it becomes the default behavior. Set AWS_NEW_RETRIES_2026=true". The lesson therefore claims only the mode concepts, not base delays or defaults.
- Modes: "standard, adaptive, and legacy." "Standard mode retries failed requests using exponential backoff with jitter. It uses shorter delays for transient errors … and longer delays for throttling errors (such as ThrottlingException)." Standard mode "includes a retry quota … When the available tokens are exhausted, the SDK returns the error without retrying, so your application fails fast".
- "Adaptive mode includes everything in standard mode, plus a client-side rate limiter." Recommended for a client targeting a single resource with frequent throttling (e.g. "AI workloads that call a single API operation at high volume"); "not recommended as a general default."
- Settings: `AWS_RETRY_MODE` / `retry_mode`; `AWS_MAX_ATTEMPTS` / `max_attempts` = "Total attempts including the initial request".
- "Non-retryable errors (such as AccessDeniedException, ValidationException, ResourceNotFoundException) are returned to your code immediately."

Source: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

- Existing Pattern 4 reference (kept). Update note: "Most AWS SDKs now support exponential backoff and jitter as part of their retry behavior when using standard or adaptive modes."

## AWS — cross-Region inference and Provisioned Throughput

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html

- "you can choose a cross-Region inference profile tied to a specific geography (such as US or EU), or a global inference profile." "Both types of cross-Region inference work through inference profiles, which define a foundation model (FM) and the AWS Regions to which requests can be routed."
- "Inference profiles currently don't support Provisioned Throughput."
- Geographic profiles keep processing within the geography (choose for data residency); global routes worldwide. (Cost figures on the page are not used.)

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html

- "You can purchase Provisioned Throughput to provision a higher level of throughput for a model at a fixed cost." Billed hourly per Model Units (MUs); an MU specifies input and output tokens per minute. Lesson contrast: on-demand (shared, quota-limited) vs Provisioned Throughput (purchased capacity). No prices claimed.

## GCP — Google Gen AI SDK call + streaming surface

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/sdks/overview (redirected from the former Vertex AI SDK overview URL; "Last updated 2026-10-13 UTC")

- "The Google Gen AI SDK provides a unified interface to Gemini models through both the Gemini Developer API and the Gemini API on Gemini Enterprise Agent Platform. With a few exceptions, code that runs on one platform will run on both."
- Setup: `pip install --upgrade google-genai`; `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global`, `GOOGLE_GENAI_USE_ENTERPRISE=True`; `genai.Client(http_options=HttpOptions(api_version="v1"))`; `client.models.generate_content(model="gemini-3.5-flash", contents=…)`.

Source: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-txt-stream (sample page "Generate streaming text content with Generative Model")

- Python sample: `for chunk in client.models.generate_content_stream(model="gemini-3.5-flash", contents="Why is the sky blue?"): print(chunk.text, end="")`. The GCP code tab is adapted from this sample plus the retry-options sample below.

## GCP — retries, retryable errors, idempotency

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/retry-strategy ("Last updated 2026-10-13 UTC")

- "The Google Gen AI SDK client libraries include automatic retry logic with exponential backoff for handling transient errors like timeouts, network issues, and rate limits (HTTP 429 and 5xx status codes)." Configurable "through client parameters or HttpRetryOptions" with `initial_delay`, `attempts`, `exp_base`, `max_delay`, `jitter`, `http_status_codes`.
- Client-level sample: `types.HttpOptions(retry_options=types.HttpRetryOptions(initial_delay=1.0, attempts=5, http_status_codes=[408, 429, 500, 502, 503, 504]), timeout=120 * 1000)`; the Flex sample comments `timeout = 30 * 60 * 1000 # Increase to 30 minutes` (timeout is in milliseconds).
- Endpoint: "Global endpoint: Recommended for availability … can reduce the need for client-side retries caused by regional capacity issues." "Regional endpoints … If a region is overloaded, immediate retries may fail; consider failover strategies instead."
- Payment model: Standard pay-as-you-go "Uses shared resources. Use exponential backoff to handle transient rate limit errors (429s)". Provisioned Throughput "Uses reserved capacity. Frequent errors usually indicate you have exceeded your purchased capacity, so adding retries may not solve the underlying issue."
- Latency: "Real-time (for example, chat): Fail fast. Limit the number of retry attempts". Batch: "Do not retry individual items."
- Retryable: "408 (Request Timeout), 429 (Too Many Requests), and 5xx"; "Permanent errors (e.g., 401 Authorization, 400 Bad Request) … shouldn't be retried without changes."
- Idempotency: "While generateContent is not strictly idempotent due to the stochastic nature of generative models, it is generally safe to retry for transient errors as it does not modify server-side state." Anti-pattern: "Unconditionally retrying non-idempotent operations … can lead to side effects".
- Best practices: exponential backoff, add jitter, retry only transient errors, set maximum retries.

## GCP — 429 / resource exhausted

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/deploy/error-code-429 ("Last updated 2026-10-13 UTC")

- Pay-as-you-go message: "Resource exhausted, please try again later." Provisioned Throughput message: "Too many requests. Exceeded the Provisioned Throughput."
- Pay-as-you-go remedies: "Use the global endpoint instead of a regional endpoint whenever possible." "Implement a retry strategy by using truncated exponential backoff." "smoothing traffic and reducing large spikes can help." "Subscribe to Provisioned Throughput for a more consistent level of service."
- PT: exceeding purchased amount → overage processed on-demand as pay-as-you-go (default behaviour).

## GCP — locations: global vs regional vs multi-region

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations ("Deployments and endpoints"; "Last updated 2026-10-13 UTC")

- Models "are exposed as specific regional endpoints and a global endpoint. Global endpoints cover the entire world and provide higher availability and reliability than single regions."
- "Selecting a global endpoint for your requests can improve overall availability and reduce resource exhausted (429) errors. Don't use the global endpoint if you have ML processing requirements, because you can't control or know which region your ML processing requests are sent to".
- Multi-region endpoints (`us`, `eu`) keep ML processing within a jurisdictional boundary. Location is set on the client (`genai.Client(enterprise=True, project=…, location=…)`) or via `GOOGLE_CLOUD_LOCATION`.

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/standard-paygo (redirected from the former dynamic-shared-quota URL; "Last updated 2026-10-13 UTC")

- "Standard PayGo runs on shared resources and doesn't reserve dedicated capacity or provide assured throughput during periods of high contention."
- "Using the global endpoint is a best practice because it provides access to a worldwide pool of throughput capacity". Multi-region endpoints "operate from separate regional capacity pools and don't share the global endpoint's worldwide throughput capacity." Single-region endpoints "have the lowest capacity headroom."
- "smooth your traffic as evenly as possible throughout each minute and avoid sending requests in sharp, second-level spikes. High instantaneous traffic can lead to throttling even if your average per-minute usage is within your tier's TPM threshold." (Tier numbers and spend thresholds on the page are not used.)

Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/provisioned-throughput ("Last updated 2026-10-13 UTC")

- "Provisioned Throughput is a fixed-cost, fixed-term subscription available in several term-lengths that reserves throughput for supported generative AI models on Gemini Enterprise Agent Platform."

## Not claimed

Prices, per-tier TPM numbers, quota values, base retry delays, SDK default attempt
counts, regional/model availability, and whether either SDK resumes an interrupted
stream are not stated on the page. No Bedrock idempotency-key parameter is claimed.
