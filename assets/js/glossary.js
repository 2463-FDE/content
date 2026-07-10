/* glossary.js — centralized technical-terminology glossary for every reading.
 *
 * ONE source of truth (FDE_GLOSSARY below). At load time this script:
 *   1. scans the reading prose for any glossary term that actually appears,
 *   2. underlines the FIRST occurrence of each and attaches a hover tooltip,
 *   3. builds a "Key terms" block in the left rail listing only the terms
 *      present on THIS page — each click opens a popup with the definition.
 *
 * Definitions are deliberately short: one plain-language sentence that paints
 * a clear picture. Add a term once here and it renders consistently across
 * W1–W6, so "corpus" (or any term) means the same thing every day it appears.
 *
 * To add a term: add an entry to FDE_GLOSSARY. `aka` lists extra surface forms
 * (plurals, acronyms, spellings) that should resolve to the same definition.
 * Simple trailing-"s" plurals are matched automatically; add irregulars to aka.
 */
(function () {
  "use strict";

  // ---- THE GLOSSARY (single source of truth) --------------------------------
  // { term: display form, def: one-sentence definition, aka?: [alt surface forms] }
  var FDE_GLOSSARY = [
    // — general terms that read as jargon —
    { term: "corpus", def: "The whole body of documents a system draws on — its complete source material.", aka: ["corpora"] },
    { term: "token", def: "A chunk of text (roughly a word-piece) that a model reads and counts one at a time." },
    { term: "tokenization", def: "Splitting text into tokens — the units a model actually processes.", aka: ["tokenize", "tokenizer"] },
    { term: "context window", def: "The fixed amount of text a model can hold in view at once — its working memory.", aka: ["context windows"] },
    { term: "latency", def: "How long you wait for a response — the delay between asking and answering." },
    { term: "throughput", def: "How much work a system finishes per unit of time." },
    { term: "inference", def: "Running a trained model to get an answer, as opposed to training it." },
    { term: "parameter", def: "One of the many internal numbers (weights) a model learns during training.", aka: ["parameters"] },
    { term: "weights", def: "The learned numbers inside a model that encode everything it knows." },
    { term: "parametric memory", def: "Knowledge baked into a model's weights during training — frozen until retrained." },
    { term: "non-parametric memory", def: "Knowledge kept outside the model, in a searchable store you can update anytime." },
    { term: "deterministic", def: "Always gives the same output for the same input — no randomness." },
    { term: "idempotency", def: "Doing the same operation twice has the same effect as doing it once.", aka: ["idempotent"] },
    { term: "schema", def: "A defined shape for data — which fields exist and what type each one is.", aka: ["schemas"] },
    { term: "pipeline", def: "A sequence of processing stages where each step's output feeds the next.", aka: ["pipelines"] },
    { term: "prompt", def: "The text instructions and context you give a model to steer its answer.", aka: ["prompts"] },
    { term: "grounding", def: "Tying a model's answer to real source text so it can't just make things up.", aka: ["grounded", "ground"] },
    { term: "hallucination", def: "When a model states something fluent and confident that is simply false.", aka: ["hallucinations", "hallucinate"] },

    // — models & APIs (W1) —
    { term: "LLM", def: "Large Language Model — an AI trained on huge text to predict and generate language.", aka: ["LLMs", "large language model", "large language models"] },
    { term: "attention", def: "The mechanism that lets a model weigh which earlier tokens matter most for the next one." },
    { term: "fine-tuning", def: "Continuing to train a model on your own data so new behavior lives in its weights.", aka: ["fine-tune", "fine-tuned", "finetuning"] },
    { term: "temperature", def: "A dial for randomness: low is focused and repeatable, high is varied and creative." },
    { term: "structured output", def: "Forcing a model to answer in a fixed machine-readable shape like JSON." },
    { term: "prompt engineering", def: "The craft of wording prompts and examples to get reliable, accurate answers." },
    { term: "system prompt", def: "The standing instructions that set a model's role and rules for the whole conversation." },
    { term: "few-shot", def: "Showing a model a handful of worked examples in the prompt to teach the pattern.", aka: ["few shot", "few-shot prompting"] },
    { term: "zero-shot", def: "Asking a model to do a task with no examples — just the instruction." },
    { term: "guardrails", def: "Checks around a model that catch or block bad output before it reaches users.", aka: ["guardrail"] },
    { term: "token optimization", def: "Trimming prompt and context tokens to cut cost and latency without losing meaning." },

    // — RAG, embeddings, retrieval (W2) —
    { term: "RAG", def: "Retrieval-Augmented Generation — fetch relevant documents, then answer using them.", aka: ["retrieval-augmented generation", "retrieval augmented generation"] },
    { term: "retrieval", def: "Finding the most relevant pieces of your corpus to feed a model at query time.", aka: ["retrieve", "retriever"] },
    { term: "chunking", def: "Cutting documents into pieces small enough to retrieve precisely yet still meaningful.", aka: ["chunk", "chunks"] },
    { term: "chunk overlap", def: "Repeating the tail of one chunk at the start of the next so facts don't get split.", aka: ["overlap"] },
    { term: "fixed-size chunking", def: "Cutting every N characters or tokens — fast and simple but blind to meaning." },
    { term: "recursive chunking", def: "Splitting on natural boundaries (paragraphs, then lines, then words) to keep text coherent.", aka: ["recursive character splitting", "RecursiveCharacterTextSplitter"] },
    { term: "semantic chunking", def: "Cutting where the topic shifts by grouping similar sentences, not by counting characters." },
    { term: "embedding", def: "A list of numbers that captures a text's meaning so similar texts land near each other.", aka: ["embeddings", "embed"] },
    { term: "vector", def: "An ordered list of numbers; here, the numeric form of a text's meaning.", aka: ["vectors"] },
    { term: "dimensions", def: "How many numbers are in a vector — more can hold more nuance but cost more.", aka: ["dimensionality", "dimension"] },
    { term: "Matryoshka representation", def: "An embedding trained so you can shorten the vector and keep most of its quality.", aka: ["matryoshka", "matryoshka representation learning"] },
    { term: "vector store", def: "A database built to find the stored vectors nearest a query vector, fast.", aka: ["vector database", "vector index", "vector stores"] },
    { term: "similarity", def: "How close two vectors are — the measure of how alike their meanings are.", aka: ["cosine similarity", "similarity metric", "similarity metrics"] },
    { term: "nearest-neighbour search", def: "Finding the stored vectors closest to a query vector.", aka: ["nearest neighbor", "nearest-neighbor", "nearest neighbour", "ANN", "approximate nearest neighbour", "approximate nearest neighbor"] },
    { term: "HNSW", def: "A fast approximate index for vector search with a strong speed-versus-accuracy tradeoff." },
    { term: "IVFFlat", def: "A vector index that groups vectors into buckets and searches only the closest ones." },
    { term: "pgvector", def: "An extension that turns Postgres into a vector store for similarity search." },
    { term: "dense retrieval", def: "Finding matches by meaning using embeddings, even when the words differ.", aka: ["dense", "bi-encoder", "bi-encoder retrieval"] },
    { term: "sparse retrieval", def: "Finding matches by exact words and phrases, like classic keyword search.", aka: ["sparse", "lexical search", "lexical retrieval"] },
    { term: "BM25", def: "A classic keyword-ranking formula that scores documents by exact term matches." },
    { term: "hybrid retrieval", def: "Combining meaning-based and keyword-based search so each covers the other's blind spots.", aka: ["hybrid search", "hybrid"] },
    { term: "reciprocal rank fusion", def: "A simple way to merge two ranked result lists into one combined ranking.", aka: ["RRF"] },
    { term: "re-ranking", def: "Re-scoring a shortlist of candidates with a heavier model to keep only the best few.", aka: ["reranking", "rerank", "re-rank", "cross-encoder", "cross-encoder rerank", "cross-encoder reranking"] },
    { term: "ColBERT", def: "A retrieval method that compares texts token-by-token for finer matching.", aka: ["late interaction", "late-interaction"] },
    { term: "contextual retrieval", def: "Prepending a short context blurb to each chunk before indexing to sharpen retrieval." },
    { term: "faithfulness", def: "Whether an answer actually follows from the retrieved source, without invented claims." },
    { term: "context precision", def: "Of the chunks retrieved, how many were actually relevant — signal over noise." },
    { term: "context recall", def: "Of the chunks that were needed, how many retrieval actually found." },
    { term: "LLM-as-judge", def: "Using a language model to grade another model's outputs against criteria.", aka: ["llm as judge", "llm-as-judge eval"] },

    // — agents, tools, MCP, memory (W3–W4) —
    { term: "agent", def: "An LLM that can plan, call tools, and act in a loop toward a goal, not just chat.", aka: ["agents", "agentic"] },
    { term: "ReAct loop", def: "An agent cycle of reason, act with a tool, observe the result, then repeat.", aka: ["react loop", "reason-act"] },
    { term: "tool calling", def: "Letting a model invoke real functions or APIs and use their results.", aka: ["tool call", "tool-calling", "tool use", "tool invocation"] },
    { term: "augmented LLM", def: "A base model given extras — tools, retrieval, memory — to extend what it can do." },
    { term: "MCP", def: "Model Context Protocol — a standard way to connect models to tools and data sources.", aka: ["model context protocol"] },
    { term: "orchestration", def: "Coordinating multiple agents or steps so they work together toward one outcome.", aka: ["orchestrator", "orchestrate", "multi-agent orchestration"] },
    { term: "supervisor", def: "A lead agent that routes work to specialist worker agents and combines results.", aka: ["supervisor orchestration"] },
    { term: "handoff", def: "One agent passing control (and context) to another better suited to the next step.", aka: ["handoffs", "swarm handoff"] },
    { term: "human-in-the-loop", def: "Pausing for a person to approve or correct before an agent takes a risky action.", aka: ["human in the loop", "human-in-loop", "HITL"] },
    { term: "working memory", def: "An agent's short-term scratchpad for the current task, cleared when it's done.", aka: ["short-term memory", "short term memory"] },
    { term: "long-term memory", def: "A durable store where an agent keeps facts to recall across many sessions.", aka: ["long term memory", "memory store"] },
    { term: "LangChain", def: "A popular framework of building blocks for LLM apps and agents." },
    { term: "LangGraph", def: "A framework for building agents as explicit graphs of steps with saved state." },
    { term: "CrewAI", def: "An agent framework that models work as a crew of role-playing agents." },
    { term: "AutoGen", def: "A framework for building apps where multiple agents converse to solve tasks." },
    { term: "state graph", def: "A model of an agent as nodes and edges, passing a shared state between steps.", aka: ["stategraph", "state reducer", "state reducers"] },
    { term: "checkpointer", def: "A component that saves an agent's state so a run can pause, resume, or rewind.", aka: ["checkpointing", "checkpoint", "checkpoints"] },
    { term: "durability", def: "A guarantee that saved progress survives crashes and restarts.", aka: ["durability modes"] },

    // — knowledge graphs (W4) —
    { term: "knowledge graph", def: "Facts stored as entities and the labeled relationships between them.", aka: ["knowledge graphs", "KG"] },
    { term: "GraphRAG", def: "RAG that retrieves from a knowledge graph, following relationships, not just text chunks." },
    { term: "Cypher", def: "The query language for reading and writing patterns in a Neo4j graph." },
    { term: "Neo4j", def: "A popular graph database that stores data as connected nodes and relationships." },
    { term: "property graph", def: "A graph where nodes and relationships can each carry named properties.", aka: ["property graph model"] },
    { term: "text2cypher", def: "Turning a plain-language question into a Cypher graph query automatically." },
    { term: "entity", def: "A distinct thing in a knowledge graph — a person, place, product, or concept.", aka: ["entities"] },
    { term: "community summarization", def: "Summarizing clusters of closely-linked graph nodes to answer big-picture questions." },

    // — spec-driven dev & coding agents (W5–W6) —
    { term: "spec-driven development", def: "Writing a precise spec first and treating it as the source of truth for the code.", aka: ["spec-driven", "SDD", "spec driven development"] },
    { term: "vibe coding", def: "Prompting an agent to code with no spec — fast at first, brittle as it grows.", aka: ["vibe-coding"] },
    { term: "requirements synthesis", def: "Turning messy stakeholder conversations into clear, testable requirements." },
    { term: "EARS notation", def: "A simple template for writing unambiguous requirements as trigger-and-response sentences.", aka: ["EARS"] },
    { term: "acceptance criteria", def: "The concrete conditions a feature must meet to count as done.", aka: ["gherkin"] },
    { term: "non-functional requirement", def: "A quality target like speed, uptime, or security — not a feature itself.", aka: ["non-functional requirements", "NFR", "NFRs"] },
    { term: "SLO", def: "Service Level Objective — a measurable target for a system's reliability or speed.", aka: ["SLOs", "service level objective"] },
    { term: "phased plan", def: "Breaking work into ordered phases with a check to pass before the next begins.", aka: ["phased plans", "phase gate", "phase gates"] },
    { term: "ADR", def: "Architecture Decision Record — a short note capturing a decision and why it was made.", aka: ["ADRs", "architecture decision record"] },
    { term: "Claude Code", def: "Anthropic's command-line coding agent that reads, writes, and runs code with you." },
    { term: "TDD", def: "Test-Driven Development — write a failing test first, then the code to pass it.", aka: ["test-driven development"] },
    { term: "characterization test", def: "A test that pins down what legacy code currently does before you change it.", aka: ["characterization tests"] },
    { term: "brownfield", def: "Working inside an existing, live codebase rather than starting from scratch." },
    { term: "greenfield", def: "Building fresh with no existing code or constraints to work around." },
    { term: "anti-corruption layer", def: "A translation layer that keeps a messy old system from polluting a clean new one.", aka: ["anti-corruption", "ACL"] },
    { term: "CI", def: "Continuous Integration — automatically building and testing every code change.", aka: ["continuous integration", "CI pipeline", "CI/CD"] },
    { term: "pull request", def: "A proposed set of code changes submitted for review before merging.", aka: ["pull requests", "PR", "PRs"] },
    { term: "merge gate", def: "An automated quality bar a change must clear before it can merge.", aka: ["merge quality gate", "quality gate"] },

    // — org-specific —
    { term: "forward-deployed engineer", def: "An engineer embedded with a client to build and ship solutions on-site.", aka: ["forward deployed engineer", "FDE", "FDEs"] }
  ];

  // ---- build lookup: every surface form → entry ------------------------------
  var BY_FORM = {};        // lowercased surface form → entry
  var FORMS = [];          // all surface forms, for regex (longest first)
  function addForm(form, entry) {
    var k = form.toLowerCase();
    if (!BY_FORM[k]) { BY_FORM[k] = entry; FORMS.push(form); }
  }
  FDE_GLOSSARY.forEach(function (e) {
    addForm(e.term, e);
    (e.aka || []).forEach(function (a) { addForm(a, e); });
  });
  // longest first so "context window" wins over "context"
  FORMS.sort(function (a, b) { return b.length - a.length; });

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  // optional trailing "s" for simple plurals; \b word boundaries
  var RE = new RegExp("\\b(" + FORMS.map(esc).join("|") + ")(s?)\\b", "gi");

  // ---- tooltip (hover) -------------------------------------------------------
  var tip;
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "gloss-tip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(el) {
    var t = ensureTip();
    t.innerHTML = '<b>' + el.dataset.glossTerm + '</b>' + el.dataset.glossDef;
    t.classList.add("show");
    var r = el.getBoundingClientRect();
    var tw = t.offsetWidth, th = t.offsetHeight;
    var left = r.left + r.width / 2 - tw / 2 + window.scrollX;
    left = Math.max(10 + window.scrollX, Math.min(left, window.scrollX + document.documentElement.clientWidth - tw - 10));
    var top = r.top + window.scrollY - th - 9;
    var below = false;
    if (top < window.scrollY + 6) { top = r.bottom + window.scrollY + 9; below = true; }
    t.style.left = left + "px";
    t.style.top = top + "px";
    t.classList.toggle("below", below);
  }
  function hideTip() { if (tip) tip.classList.remove("show"); }

  // ---- glossary modal (opened by the Key-terms block or any inline term) -----
  var modal;
  function buildModal(order, found) {
    modal = document.createElement("div");
    modal.className = "gloss-modal-overlay";
    var rows = order.map(function (t) {
      var e = found[t];
      return '<div class="gm-row" data-term="' + t.toLowerCase() + '">' +
        '<dt class="gm-term">' + t + '</dt><dd class="gm-def">' + e.def + '</dd></div>';
    }).join("");
    modal.innerHTML =
      '<div class="gloss-modal" role="dialog" aria-modal="true" aria-label="Glossary">' +
        '<button class="gloss-modal-x" aria-label="Close">✕</button>' +
        '<div class="gm-k">Glossary</div>' +
        '<h2 class="gm-h">Key terms in this reading</h2>' +
        '<p class="gm-sub">' + order.length + ' term' + (order.length === 1 ? '' : 's') +
          ' · plain-language definitions, shared across every reading.</p>' +
        '<dl class="gm-list">' + rows + '</dl>' +
        '<div class="gm-suggest">' +
          '<div class="gm-sug-k">Missing a term?</div>' +
          '<p class="gm-sug-sub">Suggest one for the glossary. Leave the definition blank and we’ll draft a simple one for you.</p>' +
          '<form class="gm-sug-form" novalidate>' +
            '<input class="gm-sug-term" type="text" autocomplete="off" maxlength="60" placeholder="Term (e.g. idempotent)" aria-label="Term to suggest">' +
            '<textarea class="gm-sug-def" rows="2" maxlength="300" placeholder="Definition (optional)" aria-label="Definition (optional)"></textarea>' +
            '<div class="gm-sug-row">' +
              '<button type="submit" class="gm-sug-btn">Suggest term</button>' +
              '<span class="gm-sug-msg" role="status" aria-live="polite"></span>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.classList.contains("gloss-modal-x")) closeModal();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
    wireSuggest(modal);
  }

  // ---- suggest-a-term form → POST to the backend, optional Haiku draft --------
  function backendBase() {
    var u = window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev";
    return String(u).replace(/\/$/, "");
  }
  function traineeCode() {
    try { var id = JSON.parse(localStorage.getItem("fde_identity") || "null"); return (id && (id.code || id.name)) || "anon"; }
    catch (e) { return "anon"; }
  }
  function wireSuggest(root) {
    var form = root.querySelector(".gm-sug-form");
    if (!form) return;
    var termEl = form.querySelector(".gm-sug-term");
    var defEl = form.querySelector(".gm-sug-def");
    var btn = form.querySelector(".gm-sug-btn");
    var msg = form.querySelector(".gm-sug-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var term = (termEl.value || "").trim();
      msg.className = "gm-sug-msg";
      if (term.length < 2) { msg.textContent = "Enter a term first."; msg.classList.add("err"); termEl.focus(); return; }
      btn.disabled = true;
      msg.textContent = "Sending…";
      fetch(backendBase() + "/glossary-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term, definition: (defEl.value || "").trim(), trainee: traineeCode() })
      }).then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          if (d && d.ok) {
            msg.classList.add("ok");
            if (d.generated && d.definition) {
              msg.textContent = "Thanks! Added for review with a draft: “" + d.definition + "”";
            } else {
              msg.textContent = "Thanks! “" + (d.term || term) + "” was sent for review.";
            }
            termEl.value = ""; defEl.value = "";
          } else {
            msg.classList.add("err");
            msg.textContent = "Couldn’t send that—try again in a moment.";
          }
        })
        .catch(function () {
          msg.classList.add("err");
          msg.textContent = "Couldn’t send that—try again in a moment.";
        })
        .then(function () { btn.disabled = false; });
    });
  }
  function openModal(highlight) {
    if (!modal) return;
    modal.querySelectorAll(".gm-row.on").forEach(function (r) { r.classList.remove("on"); });
    modal.classList.add("show");
    if (highlight) {
      var row = modal.querySelector('.gm-row[data-term="' + highlight.toLowerCase() + '"]');
      if (row) {
        row.classList.add("on");
        row.scrollIntoView({ block: "center" });
      }
    } else {
      modal.querySelector(".gloss-modal").scrollTop = 0;
    }
  }
  function closeModal() { if (modal) modal.classList.remove("show"); }

  function wire(el) {
    el.addEventListener("mouseenter", function () { showTip(el); });
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focus", function () { showTip(el); });
    el.addEventListener("blur", hideTip);
    el.addEventListener("click", function (e) {
      e.preventDefault();
      hideTip();
      openModal(el.dataset.glossTerm);
    });
  }

  // ---- scan the reading, wrap first occurrence of each term ------------------
  var SKIP = { CODE: 1, PRE: 1, A: 1, BUTTON: 1, H1: 1, H2: 1, H3: 1, SCRIPT: 1, STYLE: 1, SVG: 1 };
  function skipNode(node) {
    for (var p = node.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (SKIP[p.tagName]) return true;
      if (p.classList && (p.classList.contains("tag") ||
        p.classList.contains("reading-sources") ||
        p.classList.contains("gloss-term"))) return true;
    }
    return false;
  }

  function run() {
    var root = document.querySelector(".reading-col");
    if (!root) return;
    var found = {};   // canonical term → entry (order preserved via foundOrder)
    var foundOrder = [];

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (skipNode(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNodes = [];
    var tn;
    while ((tn = walker.nextNode())) textNodes.push(tn);

    textNodes.forEach(function (node) {
      var text = node.nodeValue;
      RE.lastIndex = 0;
      var m, hits = [];
      while ((m = RE.exec(text))) {
        var entry = BY_FORM[m[1].toLowerCase()];
        if (!entry) continue;
        // register presence for the Key-terms block
        if (!found[entry.term]) { found[entry.term] = entry; foundOrder.push(entry.term); }
        // underline EVERY occurrence, so a reader never has to hunt back for it
        hits.push({ start: m.index, end: m.index + m[0].length, entry: entry, text: m[0] });
      }
      if (!hits.length) return;
      // rebuild the node, splicing wrapper spans in
      var frag = document.createDocumentFragment();
      var cursor = 0;
      hits.forEach(function (h) {
        if (h.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, h.start)));
        var span = document.createElement("span");
        span.className = "gloss-term";
        span.tabIndex = 0;
        span.textContent = h.text;
        span.dataset.glossTerm = h.entry.term;
        span.dataset.glossDef = h.entry.def;
        wire(span);
        frag.appendChild(span);
        cursor = h.end;
      });
      if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(frag, node);
    });

    buildKeyTerms(foundOrder, found);
  }

  // ---- "Key terms" block (the green block) → opens the glossary modal --------
  function buildKeyTerms(order, found) {
    if (!order.length) return;
    order.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    buildModal(order, found);

    var block = document.createElement("button");
    block.type = "button";
    block.className = "gloss-block";
    block.innerHTML =
      '<span class="gb-k">Glossary</span>' +
      '<span class="gb-t">Key terms in this reading</span>' +
      '<span class="gb-n">' + order.length + ' term' + (order.length === 1 ? '' : 's') +
        ' · tap to define</span>';
    block.addEventListener("click", function () { openModal(); });

    var toc = document.querySelector(".toc");
    var tocVisible = toc && getComputedStyle(toc).display !== "none";
    if (tocVisible) {
      toc.appendChild(block);           // left rail, under the table of contents
    } else {
      // no rail (narrow screens hide .toc) — drop it before the sources list
      block.classList.add("gloss-block-inline");
      var src = document.querySelector(".reading-sources");
      if (src) src.parentNode.insertBefore(block, src);
      else document.querySelector(".reading-col").appendChild(block);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
