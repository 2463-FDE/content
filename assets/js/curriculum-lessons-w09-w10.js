/* Week 9–10 transfer data.
   Curriculum scope authority: the exact 8-page LTIM FDE v3 PDF identified by
   SHA-256 1792ba5c20a62fdd1e83463d9032d129ee644e58b220129b2f736f5fb863ed7e;
   inventory: docs/research/fde-ltim-v3-source-reconciliation.md. Preserved
   security research and dated week evidence support current claims. Verified
   certification mapping is shared through FDE_CERT_OBJECTIVES. */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.FDE_CAPSTONE_LESSONS = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function checks(items) {
    return items.map(function (item) {
      if (!Array.isArray(item[3]) || item[3].length !== 3) throw new Error("Check needs three distractors: " + item[0]);
      return {
        type: "scq",
        stem: item[0],
        options: [item[1]].concat(item[3]),
        answer: 0,
        explain: item[2]
      };
    });
  }

  var shared = {
    securitySources: [
      { label: "Authoritative W9 transfer record", href: "../../docs/research/w09/w09-evidence-index.md" },
      { label: "Preserved OWASP LLM Top 10 2026 security research", href: "../../docs/research/w09/archive-week8-security/w08d1.md" },
      { label: "Preserved prompt-injection architecture research", href: "../../docs/research/w09/archive-week8-security/w08d2.md" },
      { label: "Preserved guardrail-framework evidence", href: "../../docs/research/w09/archive-week8-security/w08d3.md" },
      { label: "Preserved governance and privacy evidence", href: "../../docs/research/w09/archive-week8-security/w08d4.md" },
      { label: "Preserved red-team and deployment-gate evidence", href: "../../docs/research/w09/archive-week8-security/w08d5.md" }
    ],
    rolloutSources: [
      { label: "Authoritative W10 transfer record", href: "../../docs/research/w10/w10-evidence-index.md" },
      { label: "Core-30 authoring contract", href: "../../docs/week-fanout-plan.md" },
      { label: "Client-delivery packets and handoff expectations", href: "../../client-delivery.html?w=10" }
    ]
  };

  var lessons = {
    w09d1: {
      week: 9, day: 1, phase: "AI Security, Governance & System Hardening", title: "Threat-model the system you actually built",
      concepts: ["system-threat-model", "prompt-injection", "data-leakage", "model-poisoning", "tool-misuse"],
      summary: "Week 8 made the inherited system operable; Week 9 applies preserved security research to harden it. Build one threat model from real data flows, agent capabilities, memory, tools, and telemetry boundaries; then choose the first hardening decision from evidence rather than from a generic checklist.",
      sections: [
        ["Start from the delivered system", "A threat model begins with the system on main, not an ideal architecture. Mark the user entry points, retrieved content, memories, model calls, tools, and outbound sinks. Reuse the diagrams and findings from Weeks 2–8 so every boundary has an artifact behind it. Anything not observed is an assumption and belongs in a separate column."],
        ["Name assets and consequences", "List what the client would lose: confidential data, correct decisions, service availability, audit evidence, and stakeholder trust. Connect each asset to a concrete client consequence. This keeps a technical finding from becoming an isolated severity score and gives the Friday readout a reason the client can act on."],
        ["Trace attacker-controlled input", "Follow direct user text, retrieved records, tool responses, issue content, uploaded files, and persistent memory. Preserved security research establishes that instructions and data can share one model context; Week 8 adds telemetry and incident boundaries. The hardening move is to identify where untrusted content enters and which later capability could turn it into an action."],
        ["Map capability and privilege", "For each tool, record read, write, external communication, credential, and approval scope. A tool name is not a permission boundary. The application or downstream service must enforce the decision. Highlight any session that combines private data, untrusted content, and external communication."],
        ["Separate prevention from containment", "Classifiers, filters, and input rules can reduce attack volume. They do not replace least privilege, deterministic mediation, sink controls, bounded memory, or human approval for irreversible actions. Put each proposed control in a prevent, contain, detect, or recover column so the architecture does not overclaim what a filter guarantees."],
        ["Choose one hardening slice", "The day ends with one bounded decision: remove a capability, narrow a permission, gate a sink, or isolate a context. Record the owner, affected path, evidence, and verification method. Do not open five security workstreams because the list contains five threat names."],
        ["Prepare the security readout", "State the client asset, attack path, removed capability, and residual risk in four sentences. Show the changed boundary on the diagram. The Week 9 milestone begins when another engineer can reproduce the threat path and verify the control without relying on the author’s explanation."]
      ],
      optional: ["Optional depth — revisit the preserved threat taxonomy", "Open the archived security sources and attach current risk IDs only where they improve traceability. A framework label is evidence routing, not proof that a control works."],
      drill: { prompt: "The agent reads customer-uploaded documents, can query private case data, and can render model-supplied external links. Which first change most directly removes the high-impact combination?", options: ["Add a stronger system prompt", "Block or require approval for external link rendering after untrusted content enters context", "Increase the model context window"], answer: 1, feedback: "Gate the sink. It removes the external-communication leg with an enforceable application control; prompt wording does not create that boundary." },
      demoNote: "Show the diagram at section 4, run the decision drill, then open Daily goals. Emphasize that W9 applies preserved security research and Week 8 reliability evidence rather than repeating either one.",
      checks: checks([
        ["What is the authoritative starting point for the threat model?", "The system and artifacts currently delivered on main.", "The exercise models the real brownfield system, with assumptions labeled.", ["A reference architecture for the target-state system.", "The OWASP LLM Top 10 list, applied category by category.", "The original Week 1 design document."]],
        ["What makes a tool boundary enforceable?", "Application or downstream authorization independent of model judgement.", "A model choosing a tool is not authorization.", ["A system prompt that tells the model which tools it may call.", "A descriptive tool name and docstring that state its intended scope.", "A classifier that scores each tool request before the model runs it."]],
        ["How should filters be represented?", "As risk-reduction controls, separate from containment boundaries.", "This avoids promising prevention where only detection exists.", ["As the primary prevention boundary for untrusted input.", "As a replacement for least privilege on low-risk tools.", "As a detection control that also guarantees containment."]],
        ["What should each threat connect to?", "A client asset and consequence.", "The client decides from consequence, not taxonomy alone.", ["A CVSS-style severity score.", "The OWASP category it belongs to.", "The engineer who first reported it."]],
        ["What is the day’s implementation scope?", "One bounded hardening decision with owner and verification.", "Narrow scope is what makes the control demonstrable.", ["One remediation workstream for each threat category found.", "A full enterprise security audit of the brownfield system.", "A ranked backlog of every finding, with no change made today."]],
        ["What closes the day?", "A reproducible threat path and a changed boundary another engineer can verify.", "Reproducibility converts a concern into delivery evidence.", ["A completed threat taxonomy covering every OWASP category.", "A signed attestation from the author that the system is safe.", "A list of recommended tools for the next sprint."]]
      ]),
      sources: shared.securitySources
    },

    w09d2: {
      week: 9, day: 2, phase: "AI Security, Governance & System Hardening", title: "Least privilege across agents, tools, and MCP",
      concepts: ["agent-least-privilege", "mcp-auth-boundary", "pii-minimization", "secrets-hygiene", "permission-guardrails"],
      summary: "Turn yesterday’s threat path into enforceable identity, authorization, data-minimization, and secrets boundaries. The target is not a more obedient model; it is a system where model output cannot grant itself power.",
      sections: [
        ["Write the capability inventory", "For every model-facing tool and MCP server, record the caller identity, allowed operation, resource scope, credential owner, network destination, and approval rule. If the inventory says only ‘can call tickets,’ it is not precise enough to review or test."],
        ["Authentication is not authorization", "A server can know who called and still allow the wrong action. Separate connection authentication from per-operation authorization. The current user’s scope must survive agent and tool handoffs; a shared privileged service identity silently expands every learner request."],
        ["Make permissions operation-sized", "Split broad tools into narrow operations and use resource constraints the application validates. Read and write should not share a default permission. Irreversible or externally visible changes require an independent policy check or explicit human approval with the exact action rendered."],
        ["Minimize data before the model", "Send only fields required for the task. Detect and mask sensitive values before they enter prompts, traces, memory, or tool arguments. A downstream output filter cannot retract data already copied to a provider, log, embedding, or retained transcript."],
        ["Keep secrets outside model context", "Credentials belong in application-controlled stores and execution environments, never prompts, examples, memory, repositories, or learner-visible configuration. Logs should identify which credential class was used without revealing the secret itself. Treat tool descriptions and returned text as untrusted content."],
        ["Use coding-agent controls as defense in depth", "Permission modes, hooks, sandboxing, and scoped working directories can narrow what a coding agent attempts. They supplement repository review, tests, and policy enforcement; they do not authorize production changes or replace downstream access controls."],
        ["Prove denial, not only success", "The deliverable includes positive and negative tests: the allowed read works; a cross-tenant read, undeclared network call, write with a read credential, and secret-shaped output are refused. A least-privilege claim without denial evidence is still a design intention."]
      ],
      optional: ["Optional depth — provider control mapping", "The later dual-cloud lane will map verified AWS and GCP controls into these neutral rows. Do not insert certification-objective names or provider-specific claims until that evidence lands."],
      drill: { prompt: "An MCP-backed ticket tool uses one service token that can read and update every customer. What is the first defensible redesign?", options: ["Hide the token in the system prompt", "Propagate the user and resource scope, split read from update, and enforce both at execution", "Ask the model to confirm customer ownership"], answer: 1, feedback: "Identity and resource scope must be enforced by the tool or downstream service. Model confirmation is not authorization." },
      demoNote: "Use the decision drill to distinguish auth from authorization. Point out the provider-neutral optional block as the explicit integration seam for the dual-cloud lane.",
      checks: checks([
        ["What must an MCP capability inventory include?", "Identity, operation, resource, credential, destination, and approval scope.", "Those fields expose privilege and trust boundaries.", ["Tool names, descriptions, and example prompts.", "Server version, latency, and uptime.", "The model that calls each tool and its temperature setting."]],
        ["What must survive a handoff?", "The original user and authorization scope.", "A shared service identity must not erase caller context.", ["The intermediate agent’s service identity.", "The full conversation transcript.", "The last tool response, cached for reuse."]],
        ["Where should sensitive data be reduced?", "Before prompts, tools, traces, memory, and external calls.", "Later filtering cannot undo disclosure.", ["In the model response, before it is shown to the user.", "In the nightly log-retention job.", "In the observability dashboard, by masking fields."]],
        ["Where do credentials belong?", "Application-controlled secret storage and execution boundaries.", "Model context is not a secret boundary.", ["In the system prompt, so the agent can authenticate tool calls.", "In agent memory, scoped to the session.", "In tool descriptions, so the model passes them correctly."]],
        ["What are coding-agent permissions?", "Defense in depth, not authority for production action.", "The task authorizes no real external changes.", ["Approval to make production changes once hooks pass.", "A replacement for code review on agent-authored changes.", "A model-level guarantee that unsafe commands are refused."]],
        ["What evidence proves least privilege?", "Negative tests showing forbidden actions are denied.", "Success-only tests do not test the boundary.", ["A passing happy-path test for each allowed action.", "A permission list in the design document.", "A model evaluation showing the agent declines risky requests."]]
      ]),
      sources: shared.securitySources
    },

    w09d3: {
      week: 9, day: 3, phase: "AI Security, Governance & System Hardening", title: "Map obligations to evidence, not slogans",
      concepts: ["control-evidence-map", "audit-trail", "explainability-artifact", "human-oversight", "federated-trust-boundary"],
      summary: "Translate security and governance obligations into a control-evidence map for the client system. Keep legal and provider claims scoped to verified sources, and make every row point to an owner, artifact, and review date.",
      sections: [
        ["Begin with the client context", "SOX, HIPAA, GDPR, and the EU AI Act appear in the authoritative curriculum as comparison topics, not as a claim that every rule applies to every project. Record jurisdiction, role, data class, system purpose, and counsel-owned interpretation before assigning an obligation."],
        ["Use a control-evidence table", "Each row needs the obligation or policy, system boundary, control, test, evidence location, owner, and review date. ‘We use encryption’ is not a row. A reproducible configuration check, test result, access review, or signed decision can be evidence."],
        ["Design audit trails for reconstruction", "A useful trail connects who requested an action, what identity and policy authorized it, which model or component participated, what tool changed state, and what result returned. Minimize sensitive payloads while retaining enough identifiers to reconstruct the decision."],
        ["Explain decisions at the right layer", "Model prose is not the only explanation. Capture input provenance, retrieved evidence, policy decisions, tool arguments, human approvals, and final outcomes. The explanation artifact should let a reviewer distinguish model recommendation from deterministic application enforcement."],
        ["Make oversight operational", "Human oversight needs a trigger, named role, exact decision surface, response time, and fallback. ‘A human is in the loop’ is incomplete if the reviewer cannot see the real action or if the system proceeds when the review times out."],
        ["Mark the cross-cloud trust seam", "The authoritative plan includes federated identity between provider-hosted components using short-lived credentials and auditable calls. This page records the boundary and required evidence only. Exact AWS/GCP service mappings and certification objectives remain reserved for the parallel evidence lane."],
        ["Run the situation session", "Give the trainer one control row with missing evidence. The learner must ask which fact is absent, identify the owner, and choose a safe interim state. The goal is a defensible next decision, not an improvised legal conclusion."]
      ],
      optional: ["Optional depth — evidence-gap register", "Keep unresolved applicability, provider mapping, and legal interpretation in a dated gap register. A visible gap is safer than a polished but unsupported control claim."],
      drill: { prompt: "A row says ‘human review enabled’ but has no trigger, reviewer, timeout, or fallback. What should the team do?", options: ["Mark it complete because a UI button exists", "Treat it as an evidence gap and define the operating rule before rollout", "Ask the model when review is necessary"], answer: 1, feedback: "Oversight is an operating control only when its trigger, authority, timing, and failure path are explicit." },
      demoNote: "Open the optional evidence-gap register and explain why provider objectives are not guessed. This is the honest seam the parallel AWS/GCP lane will fill.",
      checks: checks([
        ["How are named regulations used on this page?", "As scoped comparison topics whose applicability must be verified.", "The curriculum does not turn a topic list into legal advice.", ["As a confirmed list of regulations that apply to the client.", "As legal conclusions the client can rely on.", "As a checklist that certifies compliance once each row is filled."]],
        ["What fields make a control row reviewable?", "Boundary, control, test, evidence, owner, and review date.", "These convert a claim into an auditable artifact.", ["Regulation name, article number, and status color.", "Risk category, severity, and likelihood.", "Owner name and a free-text description."]],
        ["What should an audit trail reconstruct?", "Requester, authority, component, action, and result.", "The chain matters more than raw prompt retention.", ["Every raw prompt and completion, retained indefinitely.", "Model latency and token usage per call.", "The final answer the user saw, and nothing else."]],
        ["What can explainability include?", "Provenance, policy decisions, tool arguments, approvals, and outcome.", "A model-generated narrative is only one layer.", ["Only the model’s own explanation of its answer.", "The model weights and training data.", "A confidence score attached to each response."]],
        ["When is human oversight real?", "When trigger, authority, exact action, timing, and fallback are defined.", "A vague review promise is not a control.", ["When a reviewer is named in the project charter.", "When every output is logged for later review.", "When users can flag answers they disagree with."]],
        ["What is intentionally deferred?", "Verified provider-specific mappings and certification objectives.", "That prevents duplication and invented cloud claims.", ["The threat model for the delivered system.", "Audit-trail design for agent actions.", "Human-oversight triggers for irreversible actions."]]
      ]),
      sources: shared.securitySources
    },

    w09d4: {
      week: 9, day: 4, phase: "AI Security, Governance & System Hardening", title: "Audit and red-team the delivered system",
      concepts: ["security-ci-gate", "secret-scanning", "control-coverage-matrix", "red-team-scope", "remediation-evidence"],
      summary: "Turn hardening into repeatable evidence: automated checks in CI, a provider-neutral control matrix, a bounded audit of Weeks 1–8, and a peer red-team exercise that produces a fix instead of theater.",
      sections: [
        ["Choose checks that can fail", "A security check belongs in CI only when its scope, fixture, threshold, output, and failure behavior are explicit. Start with the path identified on Day 1. Avoid a dashboard of warnings that nobody owns and that cannot stop a regression."],
        ["Scan without publishing secrets", "Use synthetic secret fixtures and redacted findings in learner-visible evidence. A scan result should identify file, rule, and remediation without echoing a credential. Real credentials, cloud accounts, and external sends remain outside this curriculum task."],
        ["Build the control matrix", "Rows are risks and attack paths; columns are prevent, contain, detect, and recover. Add the evidence produced by each control and its enforcement layer. Leave provider-specific product and price cells explicitly pending until the dual-cloud evidence lane supplies verified data."],
        ["Scope the audit to the system arc", "Review the learner’s own Weeks 1–8 artifacts: prompts and retrieval, agents and tools, handoffs, observability, security, and client decisions. Select one high-consequence path. A full enterprise audit is not credible inside one lesson."],
        ["Red-team with permission and safe fixtures", "The peer exercise uses the agreed scope, synthetic data, a controlled sink, and a stop condition. Notify the author first. Demonstrate the minimum needed to reproduce the issue, then pair on the control and test."],
        ["Normalize provider comparisons honestly", "The authoritative curriculum reserves a comparison between provider guardrail layers. This page supplies a blank coverage-and-cost method, not current service claims: normalize units, declare workload assumptions, compare coverage, and record the source date when the evidence lane fills each provider column."],
        ["Exit with remediation evidence", "A finding closes only when the changed control is linked to a test or repeat run. Record residual risk, owner, and date for anything deferred. The Thursday milestone is an audit and red-team package that Friday can defend."]
      ],
      optional: ["Optional depth — blank dual-cloud matrix", "Columns reserved for AWS and GCP: control surface, unit, workload assumption, normalized cost, coverage, evidence URL, retrieval date. Empty cells are labeled pending, never inferred."],
      drill: { prompt: "A peer finds a prompt-injection path in a demo. Which next step makes the exercise delivery work?", options: ["Add the exploit screenshot to the showcase", "Pair on one enforceable control, rerun the scoped test, and link the evidence", "Run broader attacks until the count looks impressive"], answer: 1, feedback: "The purpose is remediation evidence. Counts and screenshots do not show that the system boundary changed." },
      demoNote: "Show the optional blank cloud matrix as the integration seam, then use the drill to move from finding to fix. No provider claim is invented here.",
      checks: checks([
        ["When does a check belong in CI?", "When scope, fixture, threshold, output, and failure behavior are explicit.", "That makes the gate actionable and repeatable.", ["When it catches at least one issue in a manual trial.", "When the security team requests it.", "When it runs in under a minute, whatever its output."]],
        ["What data should secret-scanning demos use?", "Synthetic fixtures and redacted findings.", "The curriculum must not expose real credentials.", ["A rotated production key, so the scanner sees a real format.", "A teammate’s personal access token, revoked after the demo.", "Real credentials from a non-production account."]],
        ["What are the control-matrix columns?", "Prevent, contain, detect, recover, plus evidence and enforcement layer.", "The matrix distinguishes control purpose.", ["Low, medium, high, and critical severity.", "AWS, GCP, and on-premises provider products.", "Owner, due date, and status."]],
        ["How broad is today’s audit?", "One high-consequence path across the Weeks 1–8 system arc.", "Bounded scope can be completed and defended.", ["Every component and integration in the Weeks 1–8 system.", "Only the Week 8 observability changes.", "Whatever the red team reaches before the session ends."]],
        ["How is a peer red team run safely?", "Agreed scope, synthetic data, controlled sink, author notice, and stop condition.", "The exercise must reduce harm.", ["Against the peer’s live deployment, unannounced, for realism.", "Using real customer data, so the findings are representative.", "With no stop condition, so every path is explored."]],
        ["What closes a finding?", "A changed control linked to a passing test or repeat run.", "Remediation evidence is the exit condition.", ["A ticket marked resolved by its owner.", "A merged pull request that mentions the finding.", "A reviewer’s agreement that the risk is low."]]
      ]),
      sources: shared.securitySources
    },

    w09d5: {
      week: 9, day: 5, phase: "AI Security, Governance & System Hardening", title: "Security audit, remediation, and client readout",
      concepts: ["security-audit-package", "compliance-traceability", "residual-risk", "executive-readout", "evidence-gated-certification-seam"],
      summary: "Close the hardening week with one reproducible audit package, one shipped remediation, a scoped compliance map, and a two-audience readout. Certification selection remains evidence-gated until the parallel AWS/GCP objective research lands.",
      sections: [
        ["Assemble the audit package", "Package the system boundary, attack path, test case, evidence, consequence, control, retest result, residual risk, owner, and date. Every item points to a repository artifact or generated report. The package should survive the author leaving the room."],
        ["Separate fixed, accepted, and deferred", "Fixed means the control changed and the test passed. Accepted means an authorized stakeholder recorded the residual risk and review date. Deferred means a named owner and dated condition exist. ‘Known issue’ without one of those states is not a decision."],
        ["Map obligations without overclaiming", "Use Day 3’s control-evidence rows to show which client obligations or policies the artifact supports. Keep directional mappings directional. A security framework reference does not certify compliance, and the trainer should challenge any row that lacks applicability evidence."],
        ["Read out to executives", "Lead with the client consequence, decision, and outcome. Show one before-and-after signal and the remaining exposure. Keep implementation details available for questions rather than opening with tool names or severity numbers."],
        ["Defend with the technical team", "Then switch register: reproduce the path, show the changed boundary, run the negative test, and name tradeoffs. The same facts support both rooms; only sequencing and vocabulary change."],
        ["Hold the certification seam", "The source curriculum includes certification selection. This hub does not list exam objectives because the current AWS/GCP evidence belongs to the parallel research lane. Until it lands, the trainer may discuss learner goals and prerequisites but must label objective mapping unavailable."],
        ["Close Week 9", "Commit the audit package, the shipped control, the test evidence, and the two versions of the readout. Week 10 begins from this frozen evidence set; any new security scope needs a release-blocking reason and an owner."]
      ],
      optional: ["Optional depth — trainer certification prompt", "Ask which provider path the learner expects to pursue, what evidence they already have, and where confidence is low. Do not map answers to exam domains until verified objective data lands."],
      drill: { prompt: "The audit has one fixed issue, one accepted residual risk, and one item with no owner or date. How should the last item be labeled?", options: ["Accepted", "Open evidence gap that blocks closure", "Fixed because it is documented"], answer: 1, feedback: "Documentation alone is not disposition. Without authority, owner, and date, the item remains open." },
      demoNote: "Show the visible certification evidence-gap note. Consequence: trainers can coach provider choice now, but cannot claim objective coverage yet.",
      checks: checks([
        ["What must an audit package survive?", "The author leaving the room.", "Artifacts and links must carry the evidence.", ["A single executive read-through.", "Export to a slide deck.", "A rerun of the scanner on the next commit."]],
        ["What does fixed mean?", "The control changed and the test passed.", "A code change without verification is not closure.", ["A pull request that addresses the finding was merged.", "The owner reports the issue is no longer reproducible.", "The finding was moved to accepted risk."]],
        ["What does accepted risk require?", "Authorized stakeholder, recorded rationale, and review date.", "Risk acceptance is an authority decision.", ["The engineer’s judgement that the risk is low.", "A ticket left open in the backlog.", "A severity label below high."]],
        ["How does the executive readout begin?", "Client consequence, decision, and outcome.", "Tools and severity labels come later.", ["The tool stack and its architecture diagram.", "Severity counts by OWASP category.", "A live demo of the red-team attack."]],
        ["What does the technical defense show?", "Reproduction, changed boundary, negative test, and tradeoff.", "The technical room needs verification details.", ["The executive summary and its business case.", "The full list of scanner findings.", "A comparison of security vendors."]],
        ["What certification content is available now?", "Learner-goal discussion only; objective mapping is pending verified evidence.", "This keeps the later cloud lane authoritative.", ["A complete mapping of lessons to AWS and GCP certification objectives.", "Provider-specific practice questions for each certification.", "A recommended certification for each learner, based on their cloud choice."]]
      ]),
      sources: shared.securitySources
    },

    w10d1: {
      week: 10, day: 1, phase: "Project Wrap-Up, Production Rollout & Client Handoff", title: "Plan a reversible rollout",
      concepts: ["cutover-plan", "nfr-verification", "decision-log", "rollout-risk", "workload-placement-memo"],
      summary: "Start the final week by turning the engagement into a release decision: cutover sequence, non-functional evidence, consolidated decisions, risk controls, ownership, and an evidence-gated workload-placement memo.",
      sections: [
        ["Restate the client outcome", "Open with the outcome the engagement promised and the evidence currently on main. A rollout plan is not a task list; it is the sequence that makes that outcome available while preserving a safe return path."],
        ["Choose the cutover shape", "Define what changes, who is affected, the order of steps, entry criteria, pause points, success signals, and rollback trigger. Use a simulated or local execution plan only. This task authorizes no deployment, account, infrastructure, or external publication."],
        ["Verify non-functional requirements", "For availability, latency, cost, security, privacy, and operability, link each requirement to a current test or observation. Label missing evidence. ‘Production ready’ is a conclusion earned by rows, not a milestone name."],
        ["Consolidate decisions", "Index the ADRs and decision log. Mark superseded choices without deleting history. Every open decision has an owner and date; every closed decision links to the evidence that changed it."],
        ["Build the rollout risk register", "For each risk, record trigger, likelihood or uncertainty, client consequence, mitigation, owner, and rollback or containment step. Keep the highest-consequence unknowns visible even when their probability is hard to estimate."],
        ["Assign work and confidence", "Estimate the remaining tasks, name dependencies, and state confidence. Compare against Week 9 actuals instead of resetting estimates. Team work is split by real ownership boundaries, with one integrator accountable for the final release evidence."],
        ["Reserve the placement decision seam", "The authoritative plan requires a two-cloud workload-placement memo. Build its evidence schema now: workload, volume, data boundary, service dependency, cost assumption, portability, egress, lock-in, confidence, and flip conditions. Provider facts remain pending the verified dual-cloud lane."]
      ],
      optional: ["Optional depth — placement memo blank", "Use neutral workload rows now. Empty AWS/GCP cells remain pending with owner and retrieval date; they are not filled from memory or certification study guides."],
      drill: { prompt: "A rollout plan lists steps and owners but no rollback trigger. What is the highest-value correction?", options: ["Add more implementation detail", "Define the observable condition that pauses or reverses cutover", "Increase the estimate buffer"], answer: 1, feedback: "A reversible rollout needs an objective trigger tied to a tested recovery path." },
      demoNote: "Point to the explicit no-deployment boundary, then open the placement memo optional block to show where the later dual-cloud data lands.",
      checks: checks([
        ["What makes a rollout plan more than a task list?", "A sequence with entry, pause, success, and rollback conditions.", "The plan governs a decision, not only work.", ["A Gantt chart with owners and dates.", "A list of every ticket in the release.", "Effort estimates for each task."]],
        ["What external action is authorized?", "None; the plan and exercises remain local or simulated.", "Deployment and infrastructure are excluded.", ["A production deployment after the readiness review.", "Provisioning a staging environment in the client account.", "Sending the rollout plan to client stakeholders."]],
        ["How is production readiness shown?", "Each NFR links to current test or observation evidence.", "The label itself proves nothing.", ["A 'production-ready' label on the release.", "A checklist the team ticks off from memory.", "Agreement in the stand-up that the system is ready."]],
        ["How are superseded decisions handled?", "Retained in history and marked superseded.", "Traceability requires the decision path.", ["Deleted, so the log shows only current decisions.", "Overwritten in place with the new decision.", "Moved to a personal notes file."]],
        ["What does a risk row need?", "Trigger, consequence, mitigation, owner, and recovery action.", "Those fields make the risk operational.", ["A severity color and a description.", "Likelihood and impact scores only.", "The name of the person who raised it."]],
        ["What stays pending in the placement memo?", "Provider facts and objective mapping awaiting verified dual-cloud evidence.", "The shared schema can land before provider claims.", ["The memo’s field schema and decision structure.", "Workload volume and data-boundary assumptions.", "The flip conditions that would change the recommendation."]]
      ]),
      sources: shared.rolloutSources
    },

    w10d2: {
      week: 10, day: 2, phase: "Project Wrap-Up, Production Rollout & Client Handoff", title: "Execute the release rehearsal",
      concepts: ["release-rehearsal", "regression-gate", "performance-validation", "merge-integration", "signoff-evidence"],
      summary: "Rehearse release execution against the frozen candidate. Run regression and performance evidence, resolve integration conflicts deliberately, verify operational signals, and collect security sign-off without touching a real client environment.",
      sections: [
        ["Freeze the candidate", "Name the commit or artifact under review. New work does not enter while validation runs. A moving target turns every test result into stale evidence and makes sign-off ceremonial."],
        ["Run the full regression set", "Execute the repository’s complete local checks and capture command, environment, result, and timestamp. Failed checks block the rehearsal until fixed or explicitly dispositioned by the authorized owner."],
        ["Validate hot paths", "Select paths from the client outcome and risk register rather than testing everything equally. Compare current measurements to the declared requirement and baseline. Synthetic values are labeled; unknown production conditions remain unknown."],
        ["Resolve integration conflicts", "A merge conflict is a decision collision. Identify both intents, preserve the accepted contract, run the affected checks, and record the resolution. Do not choose the version that merely compiles."],
        ["Verify observability", "Confirm that the release’s success and rollback signals are visible in the rehearsal: health, errors, latency, cost or usage, and the client-specific outcome. A dashboard screenshot without an alert or owner is not operational evidence."],
        ["Collect security sign-off", "Link Week 9’s audit disposition and retest evidence. Sign-off names the reviewer, scope, residual risk, and expiry or next review. It never implies zero risk."],
        ["Run the client check-in", "Report what is ready, what is blocked, what changed since the estimate, and the next decision. Use the same source-of-truth candidate and evidence links the technical team sees."]
      ],
      optional: ["Optional depth — conflict record", "Capture one resolved conflict as: competing intents, chosen contract, rejected alternative, tests rerun, and downstream communication."],
      drill: { prompt: "A regression report passed, but it was run before the final conflict resolution. What is its status?", options: ["Current because the conflict was small", "Stale for the affected contract; rerun the relevant checks", "Valid if the author approves it"], answer: 1, feedback: "Evidence belongs to a specific candidate. A changed candidate invalidates affected results." },
      demoNote: "Use the drill to explain candidate-to-evidence traceability. Remind the trainer that release execution is a rehearsal only, with no cloud or deployment action.",
      checks: checks([
        ["What identifies the release candidate?", "A specific commit or immutable artifact.", "Evidence must bind to one candidate.", ["The branch name at release time.", "The sprint number.", "The date of the readiness review."]],
        ["What happens on a failed regression?", "The rehearsal blocks until fix or authorized disposition.", "A failing gate cannot be waved through silently.", ["The rehearsal continues and the failure is logged for later.", "The failing test is skipped for this release.", "The threshold is lowered until the gate passes."]],
        ["How are hot paths selected?", "From client outcomes and the risk register.", "This focuses limited validation effort.", ["The endpoints with the most lines of code.", "Every endpoint, tested equally.", "Whichever paths the newest feature touched."]],
        ["What is a merge conflict?", "A collision of intent that needs a recorded contract decision.", "Compilation alone is not resolution.", ["A textual overlap that git resolves by picking the newer side.", "A build failure caused by a dependency upgrade.", "A formatting difference between two branches."]],
        ["What must operational evidence include?", "Signal, threshold or interpretation, and owner.", "A picture without response ownership is weak evidence.", ["A screenshot of a green dashboard.", "Total request count for the release window.", "The full list of configured alerts."]],
        ["What does security sign-off state?", "Reviewer, scope, residual risk, and next review.", "It never means zero risk.", ["That the system has no remaining vulnerabilities.", "That every scanner passed with zero findings.", "That the security team has approved all future changes."]]
      ]),
      sources: shared.rolloutSources
    },

    w10d3: {
      week: 10, day: 3, phase: "Project Wrap-Up, Production Rollout & Client Handoff", title: "Verify rollback and build the handoff package",
      concepts: ["rollback-readiness", "smoke-test", "failure-drill", "operations-runbook", "access-inventory"],
      summary: "Prove the system can be verified, observed, and recovered by someone else. Run smoke and failure drills locally, curate operating views, and assemble docs, runbooks, decisions, environment facts, and access responsibilities.",
      sections: [
        ["Define verification after cutover", "List the smallest checks that prove the release is serving the intended users, processing the intended data, and producing the intended client outcome. Keep these distinct from the full regression suite so operators can run them quickly."],
        ["Prove rollback readiness", "A rollback plan names the previous candidate, data compatibility, command or procedure, owner, trigger, verification, and time expectation. Rehearse the decision and local procedure; do not touch real infrastructure."],
        ["Run a failure drill", "Choose one realistic failure from the risk register. Observe the signal, follow the runbook, contain impact, recover, and note what was ambiguous. The drill tests the operating system around the software as much as the code."],
        ["Write a runbook that runs", "Use prerequisites, symptoms, checks, exact local or simulated actions, expected results, escalation, and recovery verification. Remove steps that depend on the original author’s memory or access."],
        ["Curate the operating view", "Select the few dashboards or reports that answer: is it working, is the client outcome moving, and who acts when it is not? Link each to an owner and response path. More panels do not equal more readiness."],
        ["Document environment and access", "Record required environments, configuration classes, identity owners, approval paths, and credential rotation responsibilities without publishing secrets. Mark unavailable external accounts as prerequisites, not as completed setup."],
        ["Prepare knowledge transfer", "Build a short session around one normal operation, one failure, one decision history, and one open risk. The receiver performs the task while the author observes. Questions become handoff defects or documented follow-ups."]
      ],
      optional: ["Optional depth — handoff completeness review", "Ask a reviewer unfamiliar with the project to locate the current candidate, start path, smoke test, rollback trigger, on-call owner, and decision index. Time the search; fix missing routes."],
      drill: { prompt: "A rollback document says ‘redeploy the previous version’ but does not identify it or address data compatibility. What should happen?", options: ["Accept it as a high-level runbook", "Block readiness until the candidate and compatibility check are explicit", "Ask the model to select the prior version during an incident"], answer: 1, feedback: "Rollback is an executable decision path. Ambiguous versions and data state make it unsafe." },
      demoNote: "Navigate from the diagram to the handoff completeness optional block. The core demonstration is that a new operator, not the author, can find and run the path.",
      checks: checks([
        ["How do smoke tests differ from regressions?", "They are the smallest fast checks proving service and outcome after change.", "Operators need a rapid verification path.", ["They run the full eval suite more often.", "They are manual checks performed by the client.", "They replace regression tests after the first release."]],
        ["What identifies rollback?", "Previous candidate, trigger, procedure, compatibility, owner, and verification.", "‘Go back’ is not executable.", ["A runbook line that says 'revert the deploy'.", "The on-call engineer’s judgement at the time.", "Restoring the most recent backup, whatever its age."]],
        ["What does a failure drill test?", "Signals, runbook, containment, recovery, and operating ambiguity.", "It tests the whole operating system.", ["Whether the service can be restarted.", "Whether the alerting tool sends email.", "The speed of the most experienced engineer."]],
        ["What should a runbook remove?", "Dependence on the original author’s memory or access.", "Handoff must survive team change.", ["The need for monitoring dashboards.", "Every manual step, by requiring full automation.", "Reviews by the receiving team."]],
        ["How are dashboards selected?", "By service health, client outcome, and response ownership.", "Panel volume is not readiness.", ["By including every metric the system emits.", "By the panels the original author found useful.", "By how they look in the showcase."]],
        ["How are secrets handled in access docs?", "Responsibilities and classes are documented; secret values are not.", "The handoff must not create a new leak.", ["Listed in a protected appendix of the handoff package.", "Shared in the handoff meeting chat.", "Omitted entirely, along with who owns access."]]
      ]),
      sources: shared.rolloutSources
    },

    w10d4: {
      week: 10, day: 4, phase: "Project Wrap-Up, Production Rollout & Client Handoff", title: "Hold the freeze and rehearse the full story",
      concepts: ["release-freeze", "readiness-review", "handoff-narrative", "capstone-rehearsal", "peer-review"],
      summary: "Protect the release candidate, run the production-readiness review, and rehearse the capstone against the Friday rubric. Peer review targets proof, transitions, failure recovery, and handoff clarity rather than presentation polish alone.",
      sections: [
        ["Define the freeze", "State the frozen candidate, start time, exception authority, and what counts as a demo-blocking defect. New scope, cleanup, and speculative improvements wait. Every exception restarts the affected evidence."],
        ["Run the readiness review", "Walk outcome, candidate, tests, performance, security, observability, rollback, runbooks, access responsibilities, open risks, and approvals. Each item is ready, blocked, or accepted by named authority; there is no ‘mostly green’ state."],
        ["Build the narrative from decisions", "Tell the engagement as client ask, discovered constraint, decision, delivered change, evidence, and remaining risk. This structure keeps the story grounded in repository artifacts instead of a feature tour."],
        ["Write the planned failure", "Choose one safe, synthetic failure in the demo. Script the signal, sentence, recovery path, and transition back to value. The planned failure demonstrates operating maturity; it is not staged to imply a real external environment exists."],
        ["Rehearse the executive cut", "In the opening minutes, state the before condition, delivered outcome, evidence number, and decision requested. Keep architecture detail available but subordinate. The executive readout is scored on clarity and traceability, not hype."],
        ["Rehearse the technical cut", "Show the architecture boundary, one representative interaction, one essential diagram, a key test, rollback, and handoff path. Let the technical team challenge tradeoffs and open risks."],
        ["Exchange peer review", "The reviewer follows every claim to evidence and every handoff instruction to a runnable step. Findings become either a demo-blocking fix under the exception rule or a dated handoff item. Presentation preferences do not break freeze."]
      ],
      optional: ["Optional depth — Friday rubric rehearsal", "Score: outcome clarity, evidence traceability, architecture defense, failure recovery, handoff usability, residual-risk honesty, and response to questions. Coaching remains formative unless the trainer’s approved rubric says otherwise."],
      drill: { prompt: "A reviewer requests a visual cleanup during freeze; it does not block understanding or the demo. What is the correct disposition?", options: ["Merge it because it improves the showcase", "Defer it; freeze exceptions are limited to the defined authority and blocking criteria", "Let the presenter decide without recording it"], answer: 1, feedback: "Freeze protects the evidence set. Non-blocking polish waits unless the agreed exception authority decides otherwise." },
      demoNote: "Demonstrate the executive/technical switch: first summarize the outcome, then jump to an essential diagram and one interaction. Show the rubric optional block last.",
      checks: checks([
        ["What defines the release freeze?", "Candidate, time, exception authority, and blocking criteria.", "Those facts prevent informal scope drift.", ["A calendar date announced in the team chat.", "The point at which tests stop being run.", "The moment the client approves the demo."]],
        ["What states does readiness use?", "Ready, blocked, or accepted by named authority.", "Ambiguous green states hide decisions.", ["Green, amber, and red.", "Percent complete per workstream.", "Done and not done."]],
        ["What is the narrative sequence?", "Ask, constraint, decision, change, evidence, residual risk.", "It keeps the story traceable.", ["Tools, architecture, features, then demo.", "Timeline of the ten weeks in order.", "Team introductions, then a feature tour."]],
        ["Why include a planned failure?", "To demonstrate detection, recovery, and communication safely.", "It shows operating maturity.", ["To make the demo more dramatic.", "To show that tests can be skipped safely.", "To fill time if the main demo runs short."]],
        ["What opens the executive cut?", "Before, outcome, evidence, and requested decision.", "Implementation detail follows value.", ["The architecture diagram and stack choices.", "A walkthrough of the codebase.", "The team’s velocity metrics."]],
        ["What does peer review verify?", "Claims reach evidence and instructions reach runnable steps.", "The review tests delivery, not taste.", ["Slide design and presentation style.", "That the code follows the reviewer’s preferred conventions.", "That the demo runs faster than last week."]]
      ]),
      sources: shared.rolloutSources
    },

    w10d5: {
      week: 10, day: 5, phase: "Project Wrap-Up, Production Rollout & Client Handoff", title: "Client showcase and final handoff",
      concepts: ["client-showcase", "architecture-defense", "cloud-placement-defense", "final-signoff", "toolkit-export"],
      summary: "Deliver the capstone executive readout, defend the system with the technical team, hand off the evidence and operating package, and close the engagement honestly. The showcase uses simulated/local artifacts only; merge, deployment, and publication remain separate decisions.",
      sections: [
        ["Open with the outcome", "State what changed for the client, the before and after evidence, and the decision the room needs to make. Name the scope and the evidence date. Do not imply production deployment, real cloud resources, or external sends where none exist."],
        ["Walk the engagement arc", "Connect Weeks 1–5 solo discovery and build work to the Weeks 6–10 team engagement that inherited it. Show how decisions, tests, risks, and client artifacts survived the handover rather than resetting at Week 6."],
        ["Demonstrate the system", "Use a representative interaction and essential diagram to show one high-value path. The demo script names the data, expected result, failure signal, and recovery sentence. Keep synthetic fixtures visibly labeled."],
        ["Defend the architecture", "Explain boundaries, tradeoffs, least privilege, observability, security controls, and rollback. Answer what would change under different scale, risk, or provider assumptions. Point to decisions and tests rather than claiming certainty."],
        ["Defend workload placement carefully", "Present portability, lock-in surfaces, exit costs, assumptions, and the conditions that would flip the recommendation. Provider-specific facts remain evidence-gated until the dual-cloud lane lands. A blank provider cell is an acknowledged gap, not permission to infer."],
        ["Complete sign-off and handoff", "Give the client the candidate reference, README, runbook, ADR index, evidence bundle, open-risk register, roadmap, owner list, and knowledge-transfer record. Sign-off states what was reviewed and what remains outside scope."],
        ["Close the program", "Export the personal engineering toolkit as reviewed configuration and practices, excluding credentials and client secrets. Run the retrospective: keep, change, stop. The trainer records follow-ups separately; no deployment, publication, or merge occurs without the captain’s explicit later decision."]
      ],
      optional: ["Optional depth — exact evidence gap and consequence", "Current provider certification objectives and provider-specific workload facts are not in this lane. Consequence: the showcase can defend the shared decision method and known assumptions, but must not claim AWS/GCP objective coverage or a final provider recommendation until the parallel evidence lane integrates."],
      drill: { prompt: "A showcase slide has a confident provider recommendation, but its cost and objective cells are still pending verified evidence. What should the presenter do?", options: ["Present it as final and update sources later", "State the shared method, assumptions, gap, and flip conditions; withhold the final provider claim", "Remove all workload-placement discussion"], answer: 1, feedback: "The shared decision method is demonstrable now. The provider conclusion is not, so the gap and consequence stay visible." },
      demoNote: "This is the trainer’s capstone demo route. Show the batch context, the interaction, the diagram, the evidence-gap disclosure, and the final handoff list.",
      checks: checks([
        ["What must the opening avoid implying?", "Real deployment, resources, sends, or publication that did not occur.", "The showcase must preserve scope truth.", ["That the team made tradeoffs.", "That residual risks remain.", "That assumptions were used in the placement memo."]],
        ["What proves the two-project arc?", "Decisions, tests, risks, and artifacts survive the Week 6 handover.", "Inheritance distinguishes the arc from two unrelated projects.", ["Two separate demos shown back to back.", "A shared repository name across both projects.", "The same team members on both projects."]],
        ["What does the representative demo name?", "Data, expected result, failure signal, and recovery sentence.", "A script makes the demonstration reproducible.", ["Every feature built over ten weeks.", "Only the happy-path output.", "The tools used to build it."]],
        ["How is architecture defended?", "With boundaries, tradeoffs, tests, decisions, and changed-assumption analysis.", "Confidence comes from evidence, not absolutes.", ["By stating that the chosen stack is industry standard.", "By listing every component in the system.", "By asserting that the design has no weaknesses."]],
        ["What happens when provider facts are pending?", "The method and assumptions are shown; the provider conclusion is withheld.", "This protects the parallel evidence lane’s authority.", ["The team picks the provider it knows best and states it as final.", "Provider facts are estimated from older pricing pages.", "The placement section is removed from the showcase."]],
        ["What does final sign-off state?", "Reviewed scope, delivered package, residual risks, owners, and exclusions.", "Sign-off is bounded, not a claim of completeness everywhere.", ["That the system is complete and needs no further work.", "That every original requirement was delivered unchanged.", "That the client accepts all future maintenance."]]
      ]),
      sources: shared.rolloutSources
    }
  };

  return Object.freeze(lessons);
});
