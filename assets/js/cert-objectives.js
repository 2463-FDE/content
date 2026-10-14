/* cert-objectives.js — first-party certification facts for the AWS/GCP paths.
   Every value here traces to docs/research/certifications/ (accessed 2026-10-14).
   The GCP path's alignment target is a pending captain decision
   (gcp-cert-alignment-target): both Google candidates are listed as evidence and
   `paths.gcp.target` stays null until that decision is recorded. */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.FDE_CERT_OBJECTIVES = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function freeze(value) {
    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }

  return freeze({
    accessed: "2026-10-14",
    research: "docs/research/certifications/README.md",
    paths: {
      aws: { target: "aip-c01" },
      gcp: { target: null, pendingDecision: "gcp-cert-alignment-target", candidates: ["paa", "pmle"] }
    },
    certs: {
      "aip-c01": {
        provider: "aws",
        name: "AWS Certified Generative AI Developer – Professional",
        code: "AIP-C01",
        level: "Professional",
        status: "ga",
        weightsExact: true,
        page: "https://aws.amazon.com/certification/certified-generative-ai-developer-professional/",
        guide: "https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01.html",
        learningPath: "https://skillbuilder.aws/category/exam-prep/generative-ai-developer-professional-AIP-C01",
        format: "180 min · 75 questions (65 scored) · 300 USD · pass 750/1000",
        domains: [
          { id: "1", title: "Foundation Model Integration, Data Management, and Compliance", weight: 31, objectives: [
            { id: "1.1", title: "Analyze requirements and design GenAI solutions" },
            { id: "1.2", title: "Select and configure FMs" },
            { id: "1.3", title: "Implement data validation and processing pipelines for FM consumption" },
            { id: "1.4", title: "Design and implement vector store solutions" },
            { id: "1.5", title: "Design retrieval mechanisms for FM augmentation" },
            { id: "1.6", title: "Implement prompt engineering strategies and governance for FM interactions" }
          ] },
          { id: "2", title: "Implementation and Integration", weight: 26, objectives: [
            { id: "2.1", title: "Implement agentic AI solutions and tool integrations" },
            { id: "2.2", title: "Implement model deployment strategies" },
            { id: "2.3", title: "Design and implement enterprise integration architectures" },
            { id: "2.4", title: "Implement FM API integrations" },
            { id: "2.5", title: "Implement application integration patterns and development tools" }
          ] },
          { id: "3", title: "AI Safety, Security, and Governance", weight: 20, objectives: [
            { id: "3.1", title: "Implement input and output safety controls" },
            { id: "3.2", title: "Implement data security and privacy controls" },
            { id: "3.3", title: "Implement AI governance and compliance mechanisms" },
            { id: "3.4", title: "Implement responsible AI principles" }
          ] },
          { id: "4", title: "Operational Efficiency and Optimization for GenAI Applications", weight: 12, objectives: [
            { id: "4.1", title: "Implement cost optimization and resource efficiency strategies" },
            { id: "4.2", title: "Optimize application performance" },
            { id: "4.3", title: "Implement monitoring systems for GenAI applications" }
          ] },
          { id: "5", title: "Testing, Validation, and Troubleshooting", weight: 11, objectives: [
            { id: "5.1", title: "Implement evaluation systems for GenAI" },
            { id: "5.2", title: "Troubleshoot GenAI applications" }
          ] }
        ]
      },
      "paa": {
        provider: "gcp",
        name: "Google Cloud Professional Agentic Architect",
        code: "PAA",
        level: "Professional",
        status: "beta",
        statusNote: "Beta on 2026-10-14; GA registration opens Nov 2; GA exam launches mid-November 2026. Re-verify the guide at GA.",
        weightsExact: false,
        page: "https://cloud.google.com/learn/certification/agentic-architect/",
        guide: "https://services.google.com/fh/files/misc/professional_agentic_architect_exam_guide_english.pdf",
        learningPath: "https://www.skills.google/paths/4525",
        format: "Beta: 3 h · ~80 multiple-choice · then hands-on labs in Google Skills",
        domains: [
          { id: "1", title: "Building agents using low-code tools", weight: 13, objectives: [
            { id: "1.1", title: "Configuring agentic workflows and behavior using low-code tools" },
            { id: "1.2", title: "Connecting enterprise data to Gemini Enterprise" }
          ] },
          { id: "2", title: "Using coding agents for application development", weight: 17, objectives: [
            { id: "2.1", title: "Using coding agents effectively" },
            { id: "2.2", title: "Customizing coding agents for enterprise workflows" }
          ] },
          { id: "3", title: "Developing custom agents", weight: 33, objectives: [
            { id: "3.1", title: "Designing and building agentic workflows in code" },
            { id: "3.2", title: "Integrating enterprise domain knowledge" },
            { id: "3.3", title: "Orchestrating and coordinating agentic workflows" }
          ] },
          { id: "4", title: "Evaluating and deploying agentic workflows", weight: 22, objectives: [
            { id: "4.1", title: "Evaluating agents in development and in production" },
            { id: "4.2", title: "Deploying and scaling production workloads" }
          ] },
          { id: "5", title: "Securing and governing agentic workflows", weight: 15, objectives: [
            { id: "5.1", title: "Configuring agent security and governance" },
            { id: "5.2", title: "Implementing secure agent behavior and execution" }
          ] }
        ]
      },
      "pmle": {
        provider: "gcp",
        name: "Google Cloud Professional Machine Learning Engineer",
        code: "PMLE",
        level: "Professional",
        status: "ga",
        statusNote: "Updated for the transition from Vertex AI to Gemini Enterprise Agent Platform.",
        weightsExact: false,
        page: "https://cloud.google.com/learn/certification/machine-learning-engineer",
        guide: "https://services.google.com/fh/files/misc/professional_machine_learning_engineer_exam_guide_english_new.pdf",
        learningPath: "https://www.skills.google/paths/17",
        format: "2 h · 50–60 multiple choice / multiple select · $200",
        domains: [
          { id: "1", title: "Architecting low-code AI solutions", weight: 13, objectives: [] },
          { id: "2", title: "Collaborating within and across teams to manage data and models", weight: 16, objectives: [] },
          { id: "3", title: "Scaling prototypes into ML models", weight: 21, objectives: [] },
          { id: "4", title: "Serving and scaling models", weight: 20, objectives: [] },
          { id: "5", title: "Automating and orchestrating ML pipelines", weight: 18, objectives: [] },
          { id: "6", title: "Monitoring AI solutions", weight: 13, objectives: [] }
        ]
      }
    },
    adjacent: [
      { provider: "aws", name: "AWS Certified Machine Learning Engineer – Associate", status: "MLA-C01 → MLA-C02 beta (English) since 2026-09-29; GA dates TBD", url: "https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/" },
      { provider: "aws", name: "AWS Certified AI Practitioner", status: "Foundational", url: "https://aws.amazon.com/certification/certified-ai-practitioner/" },
      { provider: "aws", name: "AWS Certified AI Business Strategist", status: "Business · beta registration open", url: "https://aws.amazon.com/certification/" },
      { provider: "aws", name: "AWS Certified Machine Learning – Specialty", status: "Retired — last exam date 2026-03-31", url: "https://aws.amazon.com/certification/certified-machine-learning-specialty/" },
      { provider: "gcp", name: "Google Cloud Generative AI Leader", status: "Foundational", url: "https://cloud.google.com/learn/certification/generative-ai-leader" }
    ]
  });
});
