/* curriculum-week5.js — Neo4j Week 5 diagrams, checks, and accessible decision labs.
   The lesson prose is static HTML so the required path survives without JavaScript. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDE_WEEK5 = api;
  if (root.document) api.activate(root.document);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function checks(items) {
    return items.map(function (item) {
      return { type: "scq", stem: item[0], options: item[1], answer: item[2], explain: item[3] };
    });
  }

  var lessons = {
    w05d1: {
      next: { label: "Day 2 — Schema, integrity & decisions →", href: "w05d2.html" },
      lab: { answer: "relationship", feedback: "A claim that one case cites one policy is connection-shaped. Model the case and policy as nodes and CITES as a relationship; keep the source passage as provenance rather than turning it into another business entity." },
      diagram: {
        title: "From client question to action surface", width: 500, height: 610,
        nodes: [
          { id:"q", step:0, kind:"example", x:25, y:20, w:450, h:62, label:"QUESTION  Which policy supports this case decision?" },
          { id:"case", step:1, x:25, y:126, w:150, h:62, label:"Case\ncase_id · status" },
          { id:"policy", step:1, x:325, y:126, w:150, h:62, label:"Policy\npolicy_id · version" },
          { id:"rel", step:2, x:174, y:236, w:152, h:62, label:"CITES\nsource · observed_at" },
          { id:"decision", step:5, x:25, y:350, w:190, h:70, label:"Decision point\napprove · review · refuse" },
          { id:"action", step:7, x:285, y:350, w:190, h:70, label:"Action surface\nshow evidence · escalate" },
          { id:"query", step:6, kind:"example", x:25, y:482, w:450, h:68, label:"MATCH path → filter current policy → aggregate evidence" }
        ],
        edges: [
          { id:"e1", step:2, from:"case", to:"rel", label:"makes" },
          { id:"e2", step:2, from:"rel", to:"policy", label:"supported by" },
          { id:"e3", step:5, from:"rel", to:"decision", label:"grounds" },
          { id:"e4", step:7, from:"decision", to:"action", label:"controls" },
          { id:"e5", step:6, from:"query", to:"rel", label:"reads", dir:"-" }
        ],
        captions: [
          "Begin with a <b>decision question</b>, not a fashionable graph-shaped diagram.",
          "Nodes carry stable identity; properties describe them. The relationship is not a foreign-key footnote—it is part of the question.",
          "A typed relationship can carry provenance and time, making the connection reviewable.",
          "Use <b>MATCH</b> to describe the pattern you need to read; the diagram is a query contract.",
          "Use <b>CREATE</b> for an intentionally new pattern and <b>MERGE</b> only around stable identity.",
          "Filtering decides which evidence is eligible; aggregation summarizes after eligibility is clear.",
          "Relational tables, vectors, and graphs answer different questions. Choose from the access pattern.",
          "The graph supports a decision and action surface; it does not make the business decision by itself."
        ]
      },
      checks: checks([
        ["Which property-graph element best represents ‘Case C-17 cites Policy P-4’?", ["A property on Case", "A CITES relationship between two nodes", "A label shared by both nodes", "A vector embedding"], 1, "The connection is part of the question, so it should be traversable and able to carry provenance."],
        ["What does MATCH do in Cypher?", ["Creates every missing node in a pattern", "Declares a uniqueness rule", "Describes a graph pattern to read", "Calculates an embedding"], 2, "MATCH describes patterns in the stored graph."],
        ["When is CREATE the clearer choice?", ["When the application intends to create a new pattern", "Whenever duplicate prevention matters", "Whenever a query contains a relationship", "When importing mutable identifiers"], 0, "CREATE states the intention to create; duplicate prevention needs stable keys and constraints."],
        ["What is unsafe to assume about MERGE?", ["It can include a relationship", "It can match an existing pattern", "It can create when no full pattern matches", "It guarantees business-key uniqueness without a constraint"], 3, "MERGE is not a substitute for a uniqueness constraint, especially under concurrency."],
        ["Which question most strongly suggests graph retrieval?", ["Which passages are semantically similar to this paragraph?", "What is the average amount by month?", "Which rule version, owner, and exception path connect to this decision?", "How many rows have a null date?"], 2, "The path and relationship semantics are first-class in the third question."],
        ["What should determine the first domain model slice?", ["The client decision and action the model must support", "Every noun found in the source corpus", "The layout of the existing SQL schema", "The labels shown in Neo4j Browser"], 0, "Start from a bounded decision question and model only what it needs."]
      ])
    },

    w05d2: {
      next: { label: "Day 3 — Build GraphRAG →", href: "w05d3.html" },
      lab: { answer: "defer", feedback: "Direction affects query readability and downstream contracts, but this packet lacks the representative queries needed to choose. Defer with an owner and flip condition; do not disguise a guess as a locked ADR." },
      diagram: {
        title: "Governed graph import", width: 500, height: 620,
        nodes: [
          { id:"src", step:2, kind:"example", x:25, y:20, w:450, h:62, label:"SYNTHETIC CSV  case_id · policy_id · rule_version · source" },
          { id:"norm", step:2, x:25, y:126, w:190, h:64, label:"Normalize\nvalidate required fields" },
          { id:"key", step:1, x:285, y:126, w:190, h:64, label:"Constraint\nstable key is unique" },
          { id:"merge", step:2, x:25, y:244, w:190, h:64, label:"Idempotent merge\nidentity first" },
          { id:"rule", step:3, x:285, y:244, w:190, h:64, label:"Rule + provenance\nowner · version · source" },
          { id:"adr", step:5, x:25, y:366, w:190, h:72, label:"ADR register\nLOCK or DEFER" },
          { id:"story", step:6, x:285, y:366, w:190, h:72, label:"AI-native story\noutcome · evidence · control" },
          { id:"test", step:7, kind:"example", x:25, y:496, w:450, h:68, label:"VALIDATE  duplicate keys · bounded paths · stale rule · denial case" }
        ],
        edges: [
          { id:"e1", step:2, from:"src", to:"norm" }, { id:"e2", step:2, from:"norm", to:"merge" },
          { id:"e3", step:2, from:"key", to:"merge" }, { id:"e4", step:3, from:"merge", to:"rule" },
          { id:"e5", step:5, from:"rule", to:"adr" }, { id:"e6", step:6, from:"adr", to:"story" },
          { id:"e7", step:7, from:"story", to:"test" }
        ],
        captions: [
          "A traversal needs bounds and selective predicates that match a real client question.",
          "Indexes accelerate eligible lookups; constraints enforce declared integrity. Do not confuse their jobs.",
          "A reviewable import separates source validation, stable identity, merge, and post-load checks.",
          "Rules stored in a graph need provenance and lifecycle. Storage is not enforcement.",
          "Compliance is a governed evidence layer, not an automatic conclusion produced by a label.",
          "Lock evidence-backed decisions. Defer unresolved ones with owner, gap, and flip condition.",
          "An AI-native story names human outcome, machine action, evidence, and human control.",
          "The workshop closes on executable acceptance cases, including ambiguity, staleness, and denial."
        ]
      },
      checks: checks([
        ["What is the safest default for a variable-length traversal?", ["Leave both ends unbounded", "Bound it and add predicates tied to the question", "Return every path and filter in the model", "Replace relationship types with labels"], 1, "Bounds and selectivity control search expansion and make intent reviewable."],
        ["Which statement correctly separates indexes and constraints?", ["Indexes enforce business rules; constraints only improve speed", "Both guarantee identical integrity", "Indexes aid eligible lookup; constraints enforce declared rules", "Constraints are needed only for CSV imports"], 2, "Performance and integrity are different responsibilities."],
        ["What makes a repeated CSV load defensibly idempotent?", ["Stable keys, matching constraints, deliberate MERGE patterns, and validation", "A larger transaction timeout", "Creating all nodes before relationships", "Using Browser instead of a driver"], 0, "Idempotence comes from identity and validation, not the interface used."],
        ["What does storing a compliance rule node prove?", ["The system is compliant", "The rule applies in every jurisdiction", "Runtime authorization is enforced", "Only that the rule representation exists in the graph"], 3, "Applicability and enforcement require separate owned evidence."],
        ["When should a graph-schema choice be deferred?", ["Whenever the team disagrees", "When needed evidence is missing and an owner plus flip condition can be recorded", "After implementation starts", "Only when no ADR template exists"], 1, "Defer is an explicit evidence state, not avoidance."],
        ["Which acceptance case belongs in an AI-native graph story?", ["The graph contains many relationship types", "Browser renders an attractive visualization", "The service abstains when supporting evidence is stale or absent", "The LLM always generates the same wording"], 2, "Grounded failure and abstention behavior are part of the contract."]
      ])
    },

    w05d3: {
      next: { label: "Day 4 — Production context engineering →", href: "w05d4.html" },
      lab: { answer: "vector-cypher", feedback: "The language varies, so vector search is useful for finding a candidate policy. The question also needs an explicit owner/version/exception path, so a controlled Cypher traversal should enrich that candidate." },
      diagram: {
        title: "GraphRAG construction and retrieval", width: 500, height: 640,
        nodes: [
          { id:"docs", step:1, kind:"example", x:25, y:20, w:450, h:58, label:"DOCUMENTS  synthetic policies · cases · source IDs" },
          { id:"chunk", step:1, x:25, y:118, w:180, h:62, label:"Chunk + metadata\nsource · version" },
          { id:"extract", step:2, x:295, y:118, w:180, h:62, label:"LLM extraction\ncandidate entities + links" },
          { id:"validate", step:2, x:25, y:224, w:180, h:68, label:"Schema validation\nallowlist · provenance" },
          { id:"graph", step:2, x:295, y:224, w:180, h:68, label:"Neo4j graph\nconstraints · evidence" },
          { id:"v", step:3, x:15, y:354, w:145, h:74, label:"VectorRetriever\nsemantic candidates" },
          { id:"vc", step:4, x:178, y:354, w:145, h:74, label:"VectorCypher\ncandidate + path" },
          { id:"t2c", step:5, x:340, y:354, w:145, h:74, label:"Text2Cypher\nquestion → query" },
          { id:"ctx", step:6, kind:"example", x:25, y:500, w:450, h:76, label:"BOUNDED CONTEXT  claims · paths · source IDs · freshness · limits" }
        ],
        edges: [
          { id:"e1", step:1, from:"docs", to:"chunk" }, { id:"e2", step:2, from:"chunk", to:"extract" },
          { id:"e3", step:2, from:"extract", to:"validate" }, { id:"e4", step:2, from:"validate", to:"graph" },
          { id:"e5", step:3, from:"graph", to:"v" }, { id:"e6", step:4, from:"graph", to:"vc" },
          { id:"e7", step:5, from:"graph", to:"t2c" }, { id:"e8", step:6, from:"vc", to:"ctx" }
        ],
        captions: [
          "GraphRAG adds explicit relationships to the retrieval path; it does not make model output true automatically.",
          "<b>SimpleKGPipeline is experimental.</b> Preserve source IDs and pin/test the package before adoption.",
          "Extraction creates candidates. Validate allowed labels, relationships, identity, and provenance before merge.",
          "VectorRetriever is the narrow semantic-candidate path.",
          "VectorCypherRetriever follows semantic candidates with developer-supplied graph expansion.",
          "Text2Cypher adds a generated-query surface: constrain schema, access, validation, and evaluation.",
          "The situation session joins the context diagram to one graph slice and one client decision."
        ]
      },
      checks: checks([
        ["What does a graph add to a GraphRAG retrieval path?", ["A guarantee that generated prose is correct", "Explicit connected structure that can be traversed and cited", "A replacement for source provenance", "Unlimited context for the model"], 1, "Graph structure can expose connected evidence; grounding still requires provenance and checks."],
        ["How should SimpleKGPipeline be described today?", ["A stable core API with long-term compatibility", "A database-native stored procedure", "An experimental-namespace pipeline that must be pinned and tested", "A Chroma ingestion primitive"], 2, "Its current namespace explicitly signals experimental status."],
        ["What is LLM extraction output?", ["Candidate entities and relations requiring validation", "Authoritative domain truth", "An enforceable authorization policy", "A guaranteed duplicate-free graph"], 0, "Extraction is probabilistic and must retain provenance and pass schema/integrity checks."],
        ["When is VectorRetriever the best fit among today's three choices?", ["The question requires an arbitrary multi-hop aggregation", "Users ask any question and no schema is available", "A generated Cypher query must be audited", "Semantic candidates alone answer the bounded question"], 3, "Use the least complex retriever that satisfies the access pattern."],
        ["What distinguishes VectorCypherRetriever?", ["It replaces vector search with keyword search", "It enriches vector candidates through developer-supplied Cypher", "It lets the model generate unrestricted writes", "It builds the knowledge graph from documents"], 1, "The explicit traversal is the distinguishing step."],
        ["What is the minimum safety posture for Text2Cypher in this lesson?", ["Administrator credentials and a high timeout", "Prompt instructions alone", "Read-only scope, schema context, validation/limits, fixtures, and evaluation", "Execution against the client production graph"], 2, "Generated queries need deterministic boundaries and evaluation; this lesson uses no live database."]
      ])
    },

    w05d4: {
      next: { label: "Day 5 — Model review & client readout →", href: "w05d5.html" },
      lab: { answer: "hybrid", feedback: "The request mixes semantic language with an explicit exception/owner path. Retrieve semantic candidates, traverse only the required relationships, then assemble source IDs, freshness, conflict notes, and limits into a bounded context pack." },
      diagram: {
        title: "Production context assembly", width: 500, height: 630,
        nodes: [
          { id:"q", step:0, kind:"example", x:25, y:20, w:450, h:60, label:"QUESTION  What exception applies, who owns it, and is it current?" },
          { id:"chroma", step:1, x:25, y:126, w:190, h:66, label:"Chroma\nsemantic candidates" },
          { id:"neo", step:1, x:285, y:126, w:190, h:66, label:"Neo4j\nexplicit path + provenance" },
          { id:"node", step:2, x:25, y:246, w:190, h:72, label:"LangGraph node\ntimeout · read scope · limit" },
          { id:"eval", step:3, x:285, y:246, w:190, h:72, label:"Grounding checks\nrelevance · support · abstain" },
          { id:"asm", step:4, x:25, y:382, w:190, h:76, label:"Context assembler\ndedupe · freshness · budget" },
          { id:"ops", step:5, x:285, y:382, w:190, h:76, label:"NFR review\nlatency · fan-out · cost" },
          { id:"agent", step:6, kind:"example", x:25, y:520, w:450, h:66, label:"AGENT INPUT  claims + paths + sources + conflicts + limits" }
        ],
        edges: [
          { id:"e1", step:1, from:"q", to:"chroma" }, { id:"e2", step:1, from:"q", to:"neo" },
          { id:"e3", step:2, from:"neo", to:"node" }, { id:"e4", step:3, from:"node", to:"eval" },
          { id:"e5", step:4, from:"chroma", to:"asm" }, { id:"e6", step:4, from:"eval", to:"asm" },
          { id:"e7", step:5, from:"asm", to:"ops" }, { id:"e8", step:6, from:"asm", to:"agent" }
        ],
        captions: [
          "Institutional memory is trustworthy only when ownership, provenance, freshness, and correction are explicit.",
          "Use vectors for semantic candidates and graph traversal for connected evidence when the question needs both.",
          "An agent node returns a bounded evidence object; database authorization, timeout, and failure remain explicit.",
          "Evaluate retrieval, path support, answer support, and abstention separately.",
          "Assemble context by question: deduplicate, surface conflicts, preserve provenance, and obey a budget.",
          "Inspect query plans and NFRs. More traversal and context are not free accuracy.",
          "MCP is a tool surface, not authorization. Keep operations allowlisted and policy application-controlled.",
          "Topology is an evidence-based tradeoff among ownership, private connectivity, data gravity, and dated cost—not a cloud badge."
        ]
      },
      checks: checks([
        ["What is a defensible role split in hybrid retrieval?", ["Chroma enforces graph integrity; Neo4j generates embeddings", "Chroma finds semantic candidates; Neo4j traverses explicit connected evidence", "Both stores must return identical records", "The model chooses whichever store is cheaper at runtime"], 1, "The split follows access patterns, not product loyalty."],
        ["What should a LangGraph Neo4j node return?", ["A bounded evidence object with provenance and limits", "The entire matching subgraph", "A database session for the model to continue using", "Only generated prose"], 0, "A bounded object makes context, errors, and policy reviewable."],
        ["Which evaluation separates useful failure behavior from unsupported confidence?", ["Average relationship count", "Browser render time", "Abstention when evidence is absent or conflicting", "Number of model tokens requested"], 2, "Abstention is a distinct behavior worth testing."],
        ["What belongs in a production context pack?", ["Every semantically similar chunk", "Claims, source IDs, graph paths, freshness, conflicts, and limits", "Only a natural-language summary", "Raw database credentials for tool use"], 1, "The pack carries evidence and its boundaries, not an unbounded dump."],
        ["What does EXPLAIN do compared with PROFILE?", ["EXPLAIN plans without executing; PROFILE executes and measures", "EXPLAIN creates indexes; PROFILE creates constraints", "EXPLAIN is for reads; PROFILE is for writes", "They are aliases"], 0, "PROFILE executes the query, so use it deliberately."],
        ["What does marketplace availability establish?", ["The best placement for every graph workload", "Price parity across providers", "That an offering can be acquired there, subject to dated eligibility and configuration checks", "Private connectivity is configured automatically"], 2, "Availability is not a recommendation, price quote, or networking guarantee."]
      ])
    },

    w05d5: {
      next: { label: "Next: Week 6 ▸", href: "../w06/w06d1.html" },
      lab: { answer: "block", feedback: "A confident answer without a traceable source/path undermines the GraphRAG claim and can mislead the client. Block the readout, preserve the evidence gap, and either fix retrieval or demonstrate honest abstention." },
      diagram: {
        title: "Evidence-backed client readout", width: 500, height: 610,
        nodes: [
          { id:"outcome", step:0, kind:"example", x:25, y:20, w:450, h:62, label:"CLIENT OUTCOME  faster decision with traceable policy evidence" },
          { id:"model", step:0, x:25, y:126, w:190, h:66, label:"Graph model review\nidentity · semantics · time" },
          { id:"trace", step:1, x:285, y:126, w:190, h:66, label:"Retrieval trace\nquery · path · source" },
          { id:"t2c", step:3, x:25, y:256, w:190, h:72, label:"Text2Cypher review\nsafe query · correct result" },
          { id:"adr", step:1, x:285, y:256, w:190, h:72, label:"Decision record\nlocked · deferred · risk" },
          { id:"exec", step:1, x:25, y:396, w:190, h:74, label:"Executive cut\noutcome · evidence · ask" },
          { id:"tech", step:1, x:285, y:396, w:190, h:74, label:"Technical cut\nmodel · trace · failure" },
          { id:"close", step:4, kind:"example", x:25, y:526, w:450, h:54, label:"LOCAL EVIDENCE PACK  reviewed · committed · not deployed or sent" }
        ],
        edges: [
          { id:"e1", step:0, from:"outcome", to:"model" }, { id:"e2", step:1, from:"model", to:"trace" },
          { id:"e3", step:3, from:"trace", to:"t2c" }, { id:"e4", step:1, from:"trace", to:"adr" },
          { id:"e5", step:1, from:"adr", to:"exec" }, { id:"e6", step:1, from:"adr", to:"tech" },
          { id:"e7", step:4, from:"exec", to:"close" }, { id:"e8", step:4, from:"tech", to:"close" }
        ],
        captions: [
          "The review begins with question fit, identity, relationship semantics, time, and provenance.",
          "Use the same evidence for two rooms: outcome and decision first for executives; model, trace, failure, and tradeoff for engineers.",
          "MCP configuration is reviewed as a scoped tool surface; it grants no external-action authority.",
          "Text2Cypher quality means safe query shape and correct results across representative cases—not exact-string matching.",
          "Close with repository-local evidence and feedback. This lesson authorizes no merge, deployment, publication, provisioning, or external message."
        ]
      },
      checks: checks([
        ["What should open the executive GraphRAG readout?", ["The package and database versions", "The client outcome, decision, evidence, and remaining risk", "A tour of every node label", "The generated Cypher prompt"], 1, "Lead with value and evidence; implementation detail supports questions."],
        ["What should the technical-team session demonstrate?", ["The model, representative retrieval trace, failure/abstention case, and tradeoffs", "Only the successful chat transcript", "Every query used during development", "A live production database"], 0, "The technical room needs reproducible evidence and honest limits."],
        ["How should semantically equivalent Text2Cypher outputs be reviewed?", ["Reject every query that differs from the reference string", "Accept any query that parses", "Review read safety and result correctness over representative fixtures", "Let the model score its own query"], 2, "Exact-string comparison is brittle; behavior and safety are the contract."],
        ["What is the right status for a schema issue with no owner or flip condition?", ["Locked", "Accepted risk", "Closed because it is documented", "Open evidence gap"], 3, "Deferral needs an owner, missing evidence, and a condition for revisiting."],
        ["What does the MCP retrospective establish?", ["Which scoped configuration helped and which boundaries remain application-enforced", "That MCP authorizes production access", "That one server is certified for the client", "That external tools were invoked during the lesson"], 0, "The retrospective is about workflow and boundaries, not authority or certification."],
        ["Which action is authorized by Friday's lesson?", ["Merge the GraphRAG branch", "Send the readout to the client", "Commit local review artifacts to the approved project branch", "Provision an Aura instance"], 2, "The delivery is simulated and repository-local."]
      ])
    }
  };

  function shuffle(nodes, random) {
    var rand = typeof random === "function" ? random : Math.random;
    for (var i = nodes.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = nodes[i]; nodes[i] = nodes[j]; nodes[j] = tmp;
    }
    return nodes;
  }

  function assess(id, choice) {
    var lesson = lessons[id];
    if (!lesson) return { correct:false, message:"Lesson configuration unavailable." };
    var correct = choice === lesson.lab.answer;
    return { correct:correct, message:(correct ? "Defensible decision. " : "Reconsider the evidence boundary. ") + lesson.lab.feedback };
  }

  function mountLab(doc, id, options) {
    var host = doc.querySelector("[data-w5-lab]");
    if (!host || !lessons[id]) return false;
    var group = host.querySelector("[data-w5-options]");
    if (group) shuffle(Array.prototype.slice.call(group.querySelectorAll("label")), options && options.random).forEach(function (label) { group.appendChild(label); });
    var check = host.querySelector("[data-w5-check]");
    var reset = host.querySelector("[data-w5-reset]");
    var status = host.querySelector("[data-w5-status]");
    check.addEventListener("click", function () {
      var selected = host.querySelector("input:checked");
      if (!selected) { status.textContent = "Choose one response before checking."; return; }
      var result = assess(id, selected.value);
      status.textContent = result.message;
      status.classList.toggle("is-correct", result.correct);
      host.querySelectorAll("input").forEach(function (input) { input.disabled = true; });
      check.disabled = true;
      reset.hidden = false;
    });
    reset.addEventListener("click", function () {
      host.querySelectorAll("input").forEach(function (input) { input.checked = false; input.disabled = false; });
      status.textContent = "";
      status.classList.remove("is-correct");
      check.disabled = false;
      reset.hidden = true;
      var first = host.querySelector("input");
      if (first) first.focus();
    });
    return true;
  }

  function activate(doc, options) {
    var id = doc.body && doc.body.getAttribute("data-lesson");
    var lesson = lessons[id];
    if (!lesson) return false;
    var target = typeof globalThis !== "undefined" ? globalThis : window;
    target.DIAGRAM = lesson.diagram;
    target.QUIZ = { id:id + "-check", title:"Check your understanding", questions:lesson.checks };
    target.FDE_NEXT = lesson.next;
    mountLab(doc, id, options);
    return true;
  }

  return { lessons:lessons, shuffle:shuffle, assess:assess, mountLab:mountLab, activate:activate };
});
