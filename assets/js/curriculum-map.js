/* curriculum-map.js — single source for program structure and wayfinding.
   Defines window.PHASES + window.WEEKS (moved verbatim from index.html so the
   hub, the trainer launcher, and every lesson route share one map) and a
   flattened per-page index used to generate the static lesson-crumbs nav
   (docs/workflows/build-lesson-crumbs.js). Week copy stays keyword-coupled to
   system-blueprint.html via tests/test_system_blueprint.py. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDE_CURRICULUM_MAP = api;
  root.PHASES = api.phases;
  root.WEEKS = api.weeks;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var phases = {
    found:  { label: "Foundation AI Engineering", c: "#e8590c" },
    agent:  { label: "Agentic Systems",           c: "#1c7ed6" },
    sdlc:   { label: "AI-Native SDLC",            c: "#7048e8" },
    prod:   { label: "Production AI Systems",     c: "#0b7285" },
    obs:    { label: "AI Observability",          c: "#0ca678" },
    sec:    { label: "Production & Security",      c: "#e03131" },
    cap:    { label: "Delivery & Handover",       c: "#f08c00" }
  };

  /* The two active client projects. Weeks 1-5 are solo on the P&C insurance
     brownfield; Weeks 6-10 are teams of 2-3 on the payments brownfield.
     Starters are trainer-provided/local; there is no public repository link. */
  var projects = {
    insurance: {
      label: "Juniper Vale Mutual · Loss Desk",
      id: "fde-pc-insurance-modernization",
      mode: "solo · Weeks 1–5",
      domain: "P&C insurance claims modernization"
    },
    payments: {
      label: "Morrowfield Payment Control",
      id: "fde-payments-service-platform",
      mode: "team of 2–3 · Weeks 6–10",
      domain: "payments service platform modernization"
    }
  };

  var weeks = [
    { w: 1, phase: "found", title: "Production LLM Engineering on Bedrock & Claude Code", days: [
      { t: "LLM fundamentals", s: "context windows · tokens · sampling · hallucination · AI coding", href: "weeks/w01/d1.html" },
      { t: "Model selection & API patterns", s: "Claude/GPT/Gemini · streaming · retries", parts: [{ t: "1 · Model selection", href: "weeks/w01/d2a.html" }, { t: "2 · API patterns", href: "weeks/w01/d2b.html" }] },
      { t: "Prompt engineering & FDE Situation", s: "prompting · requirements synthesis", parts: [{ t: "1 · Prompt engineering", href: "weeks/w01/d3a.html" }, { t: "2 · Requirements synthesis", href: "weeks/w01/d3b.html" }] },
      { t: "Token optimization & guardrails", s: "caching · compression · validation", parts: [{ t: "1 · Token optimization", href: "weeks/w01/d4a.html" }, { t: "2 · Output guardrails", href: "weeks/w01/d4b.html" }] },
      { t: "Code review + LLM API Client", s: "prompt library · project milestone", star: true, href: "weeks/w01/d5.html" } ] },
    { w: 2, phase: "found", title: "RAG & Knowledge Retrieval", days: [
      { t: "RAG fundamentals + chunking", s: "retrieval vs fine-tuning · ingestion", href: "weeks/w02/w02d1.html" },
      { t: "Embeddings + vector stores", s: "dimensionality · pgvector/Chroma/Pinecone", href: "weeks/w02/w02d2.html" },
      { t: "Retrieval strategies", s: "dense · sparse · hybrid · re-ranking", href: "weeks/w02/w02d3.html" },
      { t: "RAG evaluation", s: "faithfulness · recall · failure modes", href: "weeks/w02/w02d4.html" },
      { t: "E2E RAG + evidence readout", s: "harness submission · skills retro · two-audience delivery", star: true, href: "weeks/w02/w02d5.html" } ] },
    { w: 3, phase: "agent", title: "Single-Agent Design & Memory", days: [
      { t: "Agent architectures + ReAct loop", s: "tool-calling agents · provider-native tool use", href: "weeks/w03/w03d1.html" },
      { t: "Tools & MCP", s: "Model Context Protocol · tool/context interface", href: "weeks/w03/w03d2.html" },
      { t: "Agent framework landscape", s: "alt: LangChain v1 · CrewAI · AutoGen · OpenAI Agents SDK", href: "weeks/w03/w03d3.html" },
      { t: "Agent memory", s: "working vs long-term · memory stores", href: "weeks/w03/w03d4.html" },
      { t: "Production single agent", s: "end-to-end · LangChain v1 + MCP · milestone", star: true, href: "weeks/w03/w03d5.html" } ] },
    { w: 4, phase: "agent", title: "Multi-Agent Systems & Architecture Defense", days: [
      { t: "Multi-agent orchestration patterns", s: "supervisor · swarm · handoffs", href: "weeks/w04/w04d1.html" },
      { t: "LangGraph state & persistence", s: "checkpointers · interrupts · time travel", href: "weeks/w04/w04d2.html" },
      { t: "Multi-agent framework landscape", s: "alt: CrewAI · Agent Framework vs LangGraph", href: "weeks/w04/w04d3.html" },
      { t: "Operating multi-agent systems", s: "cost · approval · traces · provider seam", href: "weeks/w04/w04d4.html" },
      { t: "Multi-agent architecture defense", s: "handoffs · mock MCP · brownfield readout", star: true, href: "weeks/w04/w04d5.html" } ] },
    { w: 5, phase: "agent", title: "Neo4j Knowledge Graphs & Context Engineering", days: [
      { t: "Property-graph domain model", s: "Cypher · Docker · entities · decision surfaces", href: "weeks/w05/w05d1.html" },
      { t: "Governed graph schema", s: "traversal · integrity · import · ADR lock/defer", href: "weeks/w05/w05d2.html" },
      { t: "GraphRAG construction", s: "experimental pipeline · extraction · retriever choice", href: "weeks/w05/w05d3.html" },
      { t: "Production context engineering", s: "Chroma + Neo4j · LangGraph · evaluation · NFRs", href: "weeks/w05/w05d4.html" },
      { t: "GraphRAG model review", s: "executive + technical readout · Text2Cypher quality", star: true, href: "weeks/w05/w05d5.html" } ] },
    { w: 6, phase: "prod", title: "Kafka & Event-Driven AI Pipelines", days: [
      { t: "Team handover + Kafka foundations", s: "banking/payments · team-primary ADR · topics · partitions · KRaft", href: "weeks/w06/w06d1.html" },
      { t: "Delivery semantics, schemas & economics", s: "lag · retries/DLQ · transactions · Python · managed Kafka", href: "weeks/w06/w06d2.html" },
      { t: "Event-driven agents & streaming stores", s: "MSK judgement · async agents · backpressure · Chroma/Neo4j", href: "weeks/w06/w06d3.html" },
      { t: "Build, fail & operate the pipeline", s: "rebalance · lag alerts · OTel headers · runbooks · static egress", href: "weeks/w06/w06d4.html" },
      { t: "Pipeline defense & measured readout", s: "throughput/lag · synthetic egress · fallback · retrospective", star: true, href: "weeks/w06/w06d5.html" } ] },
    { w: 7, phase: "prod", title: "Terraform + Ansible & AI CI/CD", days: [
      { t: "Terraform foundations & plan discipline", s: "IaC judgement · providers · resources · state · lifecycle", href: "weeks/w07/w07d1.html" },
      { t: "Modules, drift & AI plan review", s: "environments · secrets · drift · human control", href: "weeks/w07/w07d2.html" },
      { t: "Ansible configuration & idempotence", s: "inventory · playbooks · roles · handlers · promotion estimate", href: "weeks/w07/w07d3.html" },
      { t: "AI CI/CD gates", s: "quality · security · drift · evals · approval · rollback", href: "weeks/w07/w07d4.html" },
      { t: "Project 2 infrastructure delivery", s: "primary-cloud ADR · rebuild evidence · two-audience defense", href: "weeks/w07/w07d5.html", star: true } ] },
    { w: 8, phase: "obs", title: "AI Observability, SRE & Reliability Guardrails", days: [
      { t: "AI service signals & SLOs", s: "latency · quality · cost · negotiated error budgets", href: "weeks/w08/w08d1.html" },
      { t: "OTel signals & GenAI spans", s: "traces · metrics · logs · Collector · drift evidence", href: "weeks/w08/w08d2.html" },
      { t: "Cross-system correlation", s: "agents · tools · models · Kafka · bad-answer root cause", href: "weeks/w08/w08d3.html" },
      { t: "Evaluations & reliability guardrails", s: "offline/online evals · circuits · graceful degradation", href: "weeks/w08/w08d4.html" },
      { t: "Incident response & reliability evidence", s: "runbooks · rollback · tradeoffs · client readout", href: "weeks/w08/w08d5.html", star: true } ] },
    { w: 9, phase: "sec", title: "AI Security, Governance & System Hardening", days: [
      { t: "Threat-model the delivered system", s: "prompt injection · leakage · poisoning · tool misuse", href: "weeks/w09/w09d1.html" },
      { t: "Least privilege across agents & MCP", s: "RBAC · auth boundaries · PII · secrets", href: "weeks/w09/w09d2.html" },
      { t: "Obligations → control evidence", s: "audit trails · explainability · human oversight", href: "weeks/w09/w09d3.html" },
      { t: "Security audit + peer red team", s: "CI checks · safe fixtures · remediation evidence", href: "weeks/w09/w09d4.html" },
      { t: "Hardening readout", s: "audit package · remediation · two-audience defense", href: "weeks/w09/w09d5.html", star: true } ] },
    { w: 10, phase: "cap", title: "Production Rollout, Showcase & Client Handoff", days: [
      { t: "Plan a reversible rollout", s: "NFR evidence · risk · estimation · placement memo", href: "weeks/w10/w10d1.html" },
      { t: "Execute the release rehearsal", s: "regression · performance · integration · sign-off", href: "weeks/w10/w10d2.html" },
      { t: "Verify rollback + build handoff", s: "smoke tests · failure drill · docs · runbooks", href: "weeks/w10/w10d3.html" },
      { t: "Freeze + rehearse the full story", s: "readiness review · narrative · peer dry run", href: "weeks/w10/w10d4.html" },
      { t: "Client showcase + final handoff", s: "executive readout · architecture defense · sign-off", href: "weeks/w10/w10d5.html", star: true } ] }
  ];

  function projectFor(weekNumber) {
    return weekNumber <= 5 ? projects.insurance : projects.payments;
  }

  /* Flattened per-page index in program order. dayPosition counts program
     days 1..50; part pages share their day's position. */
  function pages() {
    var list = [];
    var position = 0;
    weeks.forEach(function (week) {
      week.days.forEach(function (day, dayIndex) {
        position += 1;
        var entries = day.parts
          ? day.parts.map(function (part) { return { href: part.href, part: part.t }; })
          : [{ href: day.href, part: null }];
        entries.forEach(function (entry) {
          list.push({
            href: entry.href,
            week: week.w,
            weekTitle: week.title,
            day: dayIndex + 1,
            dayTitle: day.t,
            part: entry.part,
            dayPosition: position,
            project: projectFor(week.w)
          });
        });
      });
    });
    list.forEach(function (page, index) {
      page.prev = index > 0 ? list[index - 1] : null;
      page.next = index < list.length - 1 ? list[index + 1] : null;
    });
    return list;
  }

  return { phases: phases, weeks: weeks, projects: projects, pages: pages, projectFor: projectFor };
});
