/* cert-objectives.js — first-party certification facts for the AWS/GCP paths.
   Every value here traces to docs/research/certifications/ (accessed 2026-10-14).
   Alignment targets (captain decision gcp-cert-alignment-target, corrected
   2026-10-14): AWS → AIP-C01; GCP → Google AI Professional Certificate.
   No alignment is claimed to Google's Professional Agentic Architect or
   Professional Machine Learning Engineer (superseded candidates; their dated
   evidence stays in docs/research/certifications/ for the record). */
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
      gcp: { target: "gaipc", decision: "gcp-cert-alignment-target", decided: "2026-10-14" }
    },
    certs: {
      "aip-c01": {
        provider: "aws",
        name: "AWS Certified Generative AI Developer – Professional",
        code: "AIP-C01",
        level: "Professional",
        status: "ga",
        weightsPublished: true,
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
      "gaipc": {
        provider: "gcp",
        name: "Google AI Professional Certificate",
        code: null,
        level: "Career Certificate · no previous experience required",
        status: "available",
        statusNote: "Open for enrollment on 2026-10-14. Google publishes its courses, not exam domains or weights.",
        weightsPublished: false,
        page: "https://grow.google/enroll-certificates/ai-professional-certificate-mid/",
        guide: null,
        learningPath: null,
        format: "20+ hands-on activities and graded assessments · self-paced, about an hour per module · US$49/month subscription in the U.S. and Canada · on Coursera, Google Skills, and Udemy",
        domains: [
          { id: "1", title: "AI Fundamentals", weight: null, objectives: [] },
          { id: "2", title: "AI for Brainstorming and Planning", weight: null, objectives: [] },
          { id: "3", title: "AI for Research and Insights", weight: null, objectives: [] },
          { id: "4", title: "AI for Writing and Communicating", weight: null, objectives: [] },
          { id: "5", title: "AI for Content Creation", weight: null, objectives: [] },
          { id: "6", title: "AI for Data Analysis", weight: null, objectives: [] },
          { id: "7", title: "AI for App Building", weight: null, objectives: [] },
          { id: "8", title: "AI for App Deployment", weight: null, objectives: [] }
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
