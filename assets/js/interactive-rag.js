/* interactive-rag.js — Week-2 (RAG) inline "Try it" widgets.
   All client-side, no backend: each widget ships baked, pedagogically-tuned
   sample data (the same pattern as ix-temp's fixed logits / ix-cost's math).
   Declared via markup, auto-initialized on DOMContentLoaded.

   Components:
   1. Chunk splitter      <div class="ix-chunk" data-doc="sample" data-overlap="1" data-strategy="1"></div>
   2. Similarity / metric <div class="ix-sim" data-mode="dims|metric"></div>
   3. Retrieval engine    <div class="ix-retrieve" data-scenario="apikey" data-mode="hybrid|alpha|rerank|biencoder"></div>
   4. Dimensionality      <div class="ix-dims"></div>
   5. Precision@k         <div class="ix-precision"></div>
   6. Faithfulness        <div class="ix-faith" data-scenario="refund"></div>
   7. Ragas scorecard     <div class="ix-ragas"></div>
*/
(function () {
  const esc = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const norm = (a) => Math.sqrt(dot(a, a));
  const cosine = (a, b) => { const d = norm(a) * norm(b); return d ? dot(a, b) / d : 0; };
  const l2 = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) * (x - b[i]), 0));

  /* ---------- 1. CHUNK SPLITTER ------------------------------------------ */
  // A real (small) recursive/fixed splitter over a baked document. Shows where
  // each strategy cuts, and — with overlap on — how a fact split across a
  // boundary is recovered once overlap is large enough.
  const SAMPLE_DOC =
    "A retry is attempted with exponential backoff. The base delay doubles each " +
    "attempt and is capped at eight seconds. The maximum retry count is 5, after " +
    "which the job is marked failed and moved to the dead-letter queue. Operators " +
    "are paged only when the dead-letter queue depth exceeds fifty messages.";

  // char-based splitter; approximates tokens at ~4 chars/token for the labels.
  function splitFixed(text, size, overlap) {
    const out = []; let i = 0;
    while (i < text.length) { out.push(text.slice(i, i + size)); if (i + size >= text.length) break; i += Math.max(1, size - overlap); }
    return out;
  }
  function splitRecursive(text, size, overlap) {
    // hierarchical: sentences, then merge greedily up to size, keep overlap tail.
    const sents = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    const chunks = []; let cur = "";
    for (const s of sents) {
      if ((cur + s).length > size && cur) {
        chunks.push(cur.trim());
        const tail = overlap > 0 ? cur.slice(Math.max(0, cur.length - overlap)) : "";
        cur = tail + s;
      } else cur += s;
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks;
  }

  function chunkWidget(elist) {
    elist.forEach(el => {
      const doc = el.dataset.doc && el.dataset.doc !== "sample" ? el.dataset.doc : SAMPLE_DOC;
      const showStrat = el.dataset.strategy !== "0";
      const showOverlap = el.dataset.overlap !== "0";
      el.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">chunk the document · watch the boundaries move</span></div>` +
        (showStrat ? `<div class="rag-tabs">${["Fixed", "Recursive"].map((s, i) =>
          `<button type="button" class="rag-tab${i === 1 ? " on" : ""}" data-s="${i}">${s}</button>`).join("")}</div>` : "") +
        `<div class="ix-grid rag-controls">` +
        `<label>chunk size (chars) <b class="cz-v">160</b><input class="ix-range cz" type="range" min="60" max="300" value="160"></label>` +
        (showOverlap ? `<label>overlap (chars) <b class="ov-v">0</b><input class="ix-range ov" type="range" min="0" max="80" value="0"></label>` : "") +
        `</div>` +
        `<div class="rag-note cz-note"></div>` +
        `<div class="rag-chunks"></div>`;
      const czR = el.querySelector(".cz"), ovR = el.querySelector(".ov");
      const czV = el.querySelector(".cz-v"), ovV = el.querySelector(".ov-v");
      const box = el.querySelector(".rag-chunks"), note = el.querySelector(".cz-note");
      const tabs = Array.from(el.querySelectorAll(".rag-tab"));
      let strat = 0;
      const COLORS = ["#4c6ef5", "#12b886", "#f76707", "#ae3ec9", "#e8590c", "#1c7ed6", "#2f9e44"];
      // the two halves of the classic split fact, for the recovery check.
      const FACT_A = "maximum retry count is", FACT_B = "5, after which the job is marked failed";
      function render() {
        const size = +czR.value; czV.textContent = size;
        const ov = ovR ? +ovR.value : 0; if (ovV) ovV.textContent = ov;
        const chunks = strat === 0 ? splitFixed(doc, size, ov) : splitRecursive(doc, size, ov);
        box.innerHTML = chunks.map((c, i) =>
          `<div class="rag-chunk" style="border-left-color:${COLORS[i % COLORS.length]}">` +
          `<span class="rag-chunk-h" style="color:${COLORS[i % COLORS.length]}">chunk ${i + 1} · ~${Math.ceil(c.length / 4)} tok</span>` +
          `<div>${esc(c)}</div></div>`).join("");
        // recovery check: does any single chunk contain the full fact?
        const whole = chunks.some(c => c.includes(FACT_A) && c.includes(FACT_B));
        const split = chunks.some(c => c.includes(FACT_A)) && chunks.some(c => c.includes(FACT_B));
        if (ovR) {
          if (whole) note.innerHTML = `<span class="ok">✓ Recovered.</span> "…the maximum retry count is <b>5</b>…" now survives intact in one chunk — retrieval can answer it.`;
          else if (split) note.innerHTML = `<span class="bad">⚠ Split fact.</span> "the maximum retry count is" and "5, after which…" landed in different chunks. Raise overlap until one chunk holds both.`;
          else note.innerHTML = "";
        }
      }
      tabs.forEach(t => t.addEventListener("click", () => { strat = +t.dataset.s; tabs.forEach(x => x.classList.toggle("on", x === t)); render(); }));
      czR.addEventListener("input", render); if (ovR) ovR.addEventListener("input", render);
      render();
    });
  }

  /* ---------- 2. SIMILARITY / METRIC EXPLORER --------------------------- */
  // Baked 6-dim unit-ish vectors for a bank of phrases, hand-tuned so cosine
  // matches intuition. mode="dims" adds a truncation slider; mode="metric"
  // shows cosine / dot / L2 side by side.
  const PHRASES = {
    "how do I reset my password":        [0.62, 0.55, 0.10, 0.20, 0.05, 0.30],
    "steps to recover a forgotten login":[0.58, 0.60, 0.12, 0.18, 0.08, 0.28],
    "what is the refund policy":         [0.10, 0.12, 0.70, 0.55, 0.20, 0.15],
    "can I get my money back":           [0.12, 0.10, 0.66, 0.58, 0.18, 0.20],
    "the server room is on floor 3":     [0.15, 0.10, 0.10, 0.12, 0.72, 0.55],
    "where are the data-center machines": [0.18, 0.14, 0.12, 0.10, 0.68, 0.58],
  };
  const PAIRS = {
    metric: [
      ["what is the refund policy", "can I get my money back"],
      ["how do I reset my password", "the server room is on floor 3"],
    ],
    dims: [
      ["how do I reset my password", "steps to recover a forgotten login"],
      ["what is the refund policy", "can I get my money back"],
    ],
  };
  function simWidget(elist) {
    elist.forEach(el => {
      const mode = el.dataset.mode === "metric" ? "metric" : "dims";
      const pairs = PAIRS[mode];
      const sub = mode === "metric" ? "one pair · three distance metrics at once" : "cosine · then truncate the vector's dimensions";
      el.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">${sub}</span></div>` +
        `<div class="ix-grid">` +
        `<label>phrase A<select class="sim-a">${Object.keys(PHRASES).map(p => `<option>${p}</option>`).join("")}</select></label>` +
        `<label>phrase B<select class="sim-b">${Object.keys(PHRASES).map(p => `<option>${p}</option>`).join("")}</select></label>` +
        `</div>` +
        `<div class="rag-chips">${pairs.map((p, i) => `<button type="button" class="rag-chip" data-a="${esc(p[0])}" data-b="${esc(p[1])}">preset ${i + 1}</button>`).join("")}</div>` +
        (mode === "dims" ? `<label class="sim-dimwrap">keep dimensions <b class="dm-v">6</b> / 6<input class="ix-range dm" type="range" min="1" max="6" value="6"></label>` : "") +
        `<div class="sim-out"></div>`;
      const selA = el.querySelector(".sim-a"), selB = el.querySelector(".sim-b");
      const dmR = el.querySelector(".dm"), dmV = el.querySelector(".dm-v");
      const out = el.querySelector(".sim-out");
      selA.selectedIndex = Object.keys(PHRASES).indexOf(pairs[0][0]);
      selB.selectedIndex = Object.keys(PHRASES).indexOf(pairs[0][1]);
      function bar(label, val, pct, cls) {
        return `<div class="ix-bar-row"><span class="ix-bar-l">${label}</span>` +
          `<span class="ix-bar"><i class="${cls || ""}" style="width:${clamp(pct, 0, 100)}%"></i></span>` +
          `<span class="ix-bar-p">${val}</span></div>`;
      }
      function render() {
        let a = PHRASES[selA.value], b = PHRASES[selB.value];
        if (mode === "dims") {
          const k = +dmR.value; dmV.textContent = k;
          const full = cosine(a, b);
          const trunc = cosine(a.slice(0, k), b.slice(0, k));
          out.innerHTML =
            bar("cosine · full 6d", full.toFixed(3), full * 100, "acc-blue") +
            bar("cosine · " + k + "d", trunc.toFixed(3), trunc * 100, "acc-green") +
            `<p class="rag-foot">Truncating (Matryoshka) keeps most of the signal until you cut too far — smaller vectors, cheaper storage, slightly softer ranking. ${k <= 2 ? "<b class='bad'>At " + k + "d the score is drifting — you've cut past the useful signal.</b>" : ""}</p>`;
        } else {
          const cos = cosine(a, b), dp = dot(a, b), dist = l2(a, b);
          out.innerHTML =
            bar("cosine", cos.toFixed(3), cos * 100, "acc-blue") +
            bar("dot product", dp.toFixed(3), (dp / 2) * 100, "acc-green") +
            bar("L2 distance", dist.toFixed(3), (1 - dist) * 100, "acc-orange") +
            `<p class="rag-foot">Cosine is bounded [-1,1] (angle only). Dot rewards magnitude too. L2 is a distance — <b>smaller = closer</b>, so its ranking runs opposite to the other two.</p>`;
        }
      }
      el.querySelectorAll(".rag-chip").forEach(c => c.addEventListener("click", () => {
        selA.value = c.dataset.a; selB.value = c.dataset.b; render();
      }));
      selA.addEventListener("change", render); selB.addEventListener("change", render);
      if (dmR) dmR.addEventListener("input", render);
      render();
    });
  }

  /* ---------- 3. RETRIEVAL ENGINE (hybrid / alpha / rerank / biencoder) -- */
  // Baked scenarios: each doc carries a dense (semantic) score, a sparse (BM25/
  // lexical) score, and a rerank (cross-encoder) score, all 0..1, hand-tuned so
  // the pedagogy lands (exact-term queries reward sparse; paraphrases reward
  // dense; rerank fixes ordering).
  const SCENARIOS = {
    apikey: {
      query: "how do I rotate the API key",
      gold: "d2",
      docs: [
        { id: "d1", t: "Credential rotation runbook: replacing secrets on a schedule", dense: .82, sparse: .10, rerank: .74 },
        { id: "d2", t: "Rotate the API key: generate a new key, update the secret, revoke the old", dense: .74, sparse: .95, rerank: .97 },
        { id: "d3", t: "API rate limits and throttling behavior", dense: .55, sparse: .60, rerank: .28 },
        { id: "d4", t: "How authentication tokens are validated on each request", dense: .60, sparse: .22, rerank: .40 },
        { id: "d5", t: "Onboarding: getting your first API key issued", dense: .48, sparse: .70, rerank: .35 },
        { id: "d6", t: "Incident postmortem: leaked key forced an emergency rotation", dense: .66, sparse: .58, rerank: .62 },
        { id: "d7", t: "Billing FAQ: how usage is metered per key", dense: .30, sparse: .45, rerank: .12 },
        { id: "d8", t: "Deprecation notice for the v1 keys endpoint", dense: .35, sparse: .52, rerank: .20 },
      ],
    },
    partno: {
      query: "part number BX-4471 torque spec",
      gold: "p3",
      docs: [
        { id: "p1", t: "Fastener torque guidelines for structural bolts", dense: .78, sparse: .30, rerank: .55 },
        { id: "p2", t: "General assembly and tightening procedures", dense: .70, sparse: .12, rerank: .30 },
        { id: "p3", t: "BX-4471 flange bolt — torque 42 Nm, grade 10.9", dense: .40, sparse: .98, rerank: .96 },
        { id: "p4", t: "Corrosion handling for coastal installations", dense: .35, sparse: .08, rerank: .10 },
        { id: "p5", t: "BX-4470 spec sheet (superseded)", dense: .38, sparse: .80, rerank: .44 },
        { id: "p6", t: "Choosing the right torque wrench for the job", dense: .58, sparse: .40, rerank: .33 },
        { id: "p7", t: "Material properties of grade 10.9 steel", dense: .52, sparse: .34, rerank: .48 },
        { id: "p8", t: "Warranty terms for replacement hardware", dense: .22, sparse: .18, rerank: .08 },
      ],
    },
  };
  function retrieveWidget(elist) {
    elist.forEach(el => {
      const sc = SCENARIOS[el.dataset.scenario] || SCENARIOS.apikey;
      const mode = el.dataset.mode || "hybrid";
      const subs = { hybrid: "dense vs BM25 vs hybrid — same query, three rankings", alpha: "blend dense + sparse with α — watch the ranking reorder", rerank: "fused top-k, then a cross-encoder re-rank", biencoder: "the cheap wide net — did the gold chunk make the shortlist?" };
      const rank = (key) => sc.docs.slice().sort((a, b) => b[key] - a[key]);
      const chip = (d, score, extra) =>
        `<div class="rag-row${d.id === sc.gold ? " gold" : ""}">` +
        `<span class="rag-score">${score.toFixed(2)}</span>` +
        `<span class="rag-doc">${esc(d.t)}${d.id === sc.gold ? ' <span class="rag-tag">gold</span>' : ""}</span>${extra || ""}</div>`;

      el.innerHTML = `<div class="ix-k">▶ Try it <span class="ix-sub">${subs[mode]}</span></div>` +
        `<div class="rag-query">query: <b>“${esc(sc.query)}”</b></div><div class="rt-body"></div>`;
      const body = el.querySelector(".rt-body");

      if (mode === "hybrid") {
        const norm01 = (arr, k) => { const mx = Math.max(...arr.map(d => d[k])) || 1; return d => d[k] / mx; };
        const nd = norm01(sc.docs, "dense"), ns = norm01(sc.docs, "sparse");
        const cols = [
          { h: "Dense only", key: d => nd(d) },
          { h: "BM25 only", key: d => ns(d) },
          { h: "Hybrid (½+½)", key: d => .5 * nd(d) + .5 * ns(d) },
        ];
        body.innerHTML = `<div class="rag-cols">` + cols.map(c => {
          const top = sc.docs.slice().sort((a, b) => c.key(b) - c.key(a)).slice(0, 4);
          return `<div class="rag-col"><div class="rag-col-h">${c.h}</div>` +
            top.map(d => chip(d, c.key(d))).join("") + `</div>`;
        }).join("") + `</div>` +
          `<p class="rag-foot">Dense catches paraphrase; BM25 nails the exact term. Neither alone puts the <b>gold</b> chunk on top — the hybrid does. That's the whole argument for fusing them.</p>`;
      }

      else if (mode === "alpha") {
        body.innerHTML = `<label class="sim-dimwrap">α (dense weight) <b class="al-v">0.50</b><input class="ix-range al" type="range" min="0" max="100" value="50"></label>` +
          `<div class="al-hint"></div><div class="al-list"></div>`;
        const alR = body.querySelector(".al"), alV = body.querySelector(".al-v"), list = body.querySelector(".al-list"), hint = body.querySelector(".al-hint");
        const mxD = Math.max(...sc.docs.map(d => d.dense)), mxS = Math.max(...sc.docs.map(d => d.sparse));
        function render() {
          const a = alR.value / 100; alV.textContent = a.toFixed(2);
          hint.innerHTML = a >= .8 ? "→ dense-leaning: paraphrases float up, exact-term docs sink" : a <= .2 ? "→ sparse-leaning: exact keyword matches dominate" : "→ balanced blend";
          const scored = sc.docs.map(d => ({ d, s: a * (d.dense / mxD) + (1 - a) * (d.sparse / mxS) })).sort((x, y) => y.s - x.s).slice(0, 5);
          list.innerHTML = scored.map(x => chip(x.d, x.s)).join("");
        }
        alR.addEventListener("input", render); render();
      }

      else if (mode === "rerank") {
        const fused = sc.docs.map(d => ({ d, s: .5 * d.dense + .5 * d.sparse })).sort((a, b) => b.s - a.s).slice(0, 6);
        const reranked = fused.slice().sort((a, b) => b.d.rerank - a.d.rerank);
        const posBefore = {}; fused.forEach((x, i) => posBefore[x.d.id] = i);
        body.innerHTML = `<div class="rag-cols">` +
          `<div class="rag-col"><div class="rag-col-h">Fused top-6 (before)</div>` +
          fused.map(x => chip(x.d, x.s)).join("") + `</div>` +
          `<div class="rag-col"><div class="rag-col-h">After cross-encoder</div>` +
          reranked.map((x, i) => {
            const delta = posBefore[x.d.id] - i;
            const tag = delta > 0 ? `<span class="rag-delta up">▲${delta}</span>` : delta < 0 ? `<span class="rag-delta down">▼${-delta}</span>` : `<span class="rag-delta">–</span>`;
            return chip(x.d, x.d.rerank, tag);
          }).join("") + `</div></div>` +
          `<p class="rag-foot">The bi-encoder fuses fast but coarse. The cross-encoder reads query + doc <b>together</b>, so it pushes the truly-relevant <b>gold</b> chunk to the top and demotes keyword-lucky noise. Precision restored — at higher cost per candidate, which is why it only runs on the shortlist.</p>`;
      }

      else if (mode === "biencoder") {
        const shortlist = 5;
        const ranked = rank("dense");
        const goldPos = ranked.findIndex(d => d.id === sc.gold);
        body.innerHTML = ranked.slice(0, 6).map((d, i) =>
          `<div class="rag-row${d.id === sc.gold ? " gold" : ""}${i < shortlist ? " kept" : " cut"}">` +
          `<span class="rag-score">${d.dense.toFixed(2)}</span>` +
          `<span class="rag-doc">${esc(d.t)}${d.id === sc.gold ? ' <span class="rag-tag">gold</span>' : ""}</span>` +
          `<span class="rag-keep">${i < shortlist ? "in top-" + shortlist : "cut"}</span></div>`).join("") +
          `<p class="rag-foot">${goldPos < shortlist
            ? `✓ The <b>gold</b> chunk ranked #${goldPos + 1} — it survived the wide net, so the re-ranker still has a shot at it. The bi-encoder's only job is <b>recall</b>: get the answer into the shortlist cheaply.`
            : `⚠ The <b>gold</b> chunk ranked #${goldPos + 1}, below the top-${shortlist} cutoff. If it doesn't make the shortlist, no re-ranker downstream can save it — a recall failure that caps the whole pipeline.`}</p>`;
      }

      // LIVE panel — opt-in via data-live, only when the backend URL is set.
      // Additive: the sim above stays as the concept teacher; this runs a real
      // query against Workers AI bge + Chroma Cloud so learners see real feedback.
      const RAG = window.FDE_RAG_URL;
      if (el.dataset.live && RAG) {
        const live = document.createElement("div");
        live.className = "rag-live";
        live.innerHTML =
          `<div class="ix-k">▶ Try it · live <span class="ix-sub">real retrieval — your query vs the demo corpus</span></div>` +
          `<div class="rag-live-in"><input class="rag-q" type="text" placeholder="${esc(sc.query)}" value="${esc(sc.query)}">` +
          `<button type="button" class="btn rag-go">Search ▸</button></div>` +
          `<div class="rag-live-out"></div>` +
          `<p class="rag-foot rag-live-note" hidden>Real embeddings (Workers AI) + real vector search (Chroma). Production embeds with Titan on Bedrock — see the code.</p>`;
        el.appendChild(live);
        const inp = live.querySelector(".rag-q"), go = live.querySelector(".rag-go"),
          out = live.querySelector(".rag-live-out"), note = live.querySelector(".rag-live-note");
        go.addEventListener("click", async () => {
          const q = inp.value.trim(); if (!q) return;
          go.disabled = true; out.className = "rag-live-out"; out.textContent = "Searching…";
          try {
            const r = await fetch(RAG.replace(/\/$/, "") + "/rag-query", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: q, k: 5 }),
            });
            const d = await r.json();
            if (!r.ok || !d.ok) { out.className = "rag-live-out err"; out.textContent = d.error === "rag not configured" ? "Live search not enabled yet." : "Search unavailable — the sim above still works."; go.disabled = false; return; }
            const mx = Math.max(...d.hits.map(h => h.score), 0.0001);
            out.className = "rag-live-out";
            out.innerHTML = d.hits.map(h =>
              `<div class="rag-row"><span class="rag-score">${h.score.toFixed(2)}</span>` +
              `<span class="rag-doc">${esc(h.body)}</span>` +
              `<span class="ix-bar" style="max-width:70px"><i class="acc-green" style="width:${(h.score / mx * 100).toFixed(0)}%"></i></span></div>`).join("");
            note.hidden = false; go.disabled = false;
          } catch (e) { out.className = "rag-live-out err"; out.textContent = "Network error — the sim above still works."; go.disabled = false; }
        });
      }
    });
  }

  /* ---------- 4. DIMENSIONALITY (recall vs storage) --------------------- */
  function dimsWidget(elist) {
    elist.forEach(el => {
      // Amazon Titan Text Embeddings V2 selectable sizes + AWS-documented accuracy
      // retention (512 ≈ 99%, 256 ≈ 97% of the 1024-dim accuracy).
      const DIMS = [1024, 512, 256];
      const RECALL = { 1024: 1.00, 512: 0.99, 256: 0.97 };
      el.innerHTML = `<div class="ix-k">▶ Try it <span class="ix-sub">Titan V2 Matryoshka · accuracy vs storage</span></div>` +
        `<label class="sim-dimwrap">dimensions <b class="dz-v">1024</b><input class="ix-range dz" type="range" min="0" max="2" value="0"></label>` +
        `<div class="dz-out"></div>`;
      const r = el.querySelector(".dz"), v = el.querySelector(".dz-v"), out = el.querySelector(".dz-out");
      function render() {
        const d = DIMS[+r.value]; v.textContent = d;
        const recall = RECALL[d], store = d / 1024;
        const bytes = d * 4; // float32
        out.innerHTML =
          `<div class="ix-bar-row"><span class="ix-bar-l">accuracy</span><span class="ix-bar"><i class="acc-green" style="width:${recall * 100}%"></i></span><span class="ix-bar-p">${(recall * 100).toFixed(0)}%</span></div>` +
          `<div class="ix-bar-row"><span class="ix-bar-l">storage</span><span class="ix-bar"><i class="acc-blue" style="width:${store * 100}%"></i></span><span class="ix-bar-p">${(store * 100).toFixed(0)}%</span></div>` +
          `<p class="rag-foot">${bytes} bytes/vector. ${d === 1024 ? "Full quality — Titan V2's default, and it indexes directly in pgvector (under the 2,000-dim cap)." : d === 512 ? "Half the storage, ~99% of the accuracy — worth it at scale." : "Quarter the storage, still ~97% accuracy. Below this, Titan doesn't go — 256 is the floor."} Find the smallest vector that still clears your quality bar.</p>`;
      }
      r.addEventListener("input", render); render();
    });
  }

  /* ---------- 5. PRECISION@K (drag to reorder) -------------------------- */
  function precisionWidget(elist) {
    elist.forEach(el => {
      // baked retrieved list; learner toggles relevance + reorders.
      let items = [
        { t: "Refund window is 30 days from delivery", rel: true },
        { t: "Shipping and handling fees explained", rel: false },
        { t: "Refunds are issued to the original payment method", rel: true },
        { t: "How to track your order", rel: false },
        { t: "Damaged items qualify for a full refund", rel: true },
      ];
      el.innerHTML = `<div class="ix-k">▶ Try it <span class="ix-sub">context precision@k · rank matters, not just presence</span></div>` +
        `<p class="rag-foot" style="margin-top:0">Toggle which chunks are <b>relevant</b>, drag to reorder. Precision@k rewards relevant chunks near the <b>top</b>.</p>` +
        `<ol class="prec-list"></ol><div class="prec-out"></div>`;
      const list = el.querySelector(".prec-list"), out = el.querySelector(".prec-out");
      let dragI = null;
      function apAtK() {
        // average precision — position-sensitive.
        let hits = 0, sum = 0, relTotal = items.filter(i => i.rel).length;
        items.forEach((it, i) => { if (it.rel) { hits++; sum += hits / (i + 1); } });
        return relTotal ? sum / relTotal : 0;
      }
      function pAtK(k) { const top = items.slice(0, k); return top.filter(i => i.rel).length / k; }
      function render() {
        list.innerHTML = items.map((it, i) =>
          `<li class="prec-row${it.rel ? " rel" : ""}" draggable="true" data-i="${i}">` +
          `<span class="prec-rank">${i + 1}</span>` +
          `<button type="button" class="prec-toggle">${it.rel ? "✓ relevant" : "✗ not"}</button>` +
          `<span class="prec-doc">${esc(it.t)}</span><span class="prec-grip">⠿</span></li>`).join("");
        out.innerHTML = `<div class="prec-metrics">` +
          `<span>P@1 <b>${pAtK(1).toFixed(2)}</b></span><span>P@3 <b>${pAtK(3).toFixed(2)}</b></span>` +
          `<span>P@5 <b>${pAtK(5).toFixed(2)}</b></span><span>Avg-Precision <b>${apAtK().toFixed(3)}</b></span></div>` +
          `<p class="rag-foot">Move a relevant chunk down and Avg-Precision drops even though the same chunks are present — that position penalty is the point. The re-ranker exists to raise this number.</p>`;
        bind();
      }
      function bind() {
        list.querySelectorAll(".prec-toggle").forEach(b => b.addEventListener("click", e => {
          const i = +e.target.closest(".prec-row").dataset.i; items[i].rel = !items[i].rel; render();
        }));
        list.querySelectorAll(".prec-row").forEach(row => {
          row.addEventListener("dragstart", () => dragI = +row.dataset.i);
          row.addEventListener("dragover", e => e.preventDefault());
          row.addEventListener("drop", e => {
            e.preventDefault(); const to = +row.dataset.i;
            if (dragI === null || dragI === to) return;
            const [m] = items.splice(dragI, 1); items.splice(to, 0, m); dragI = null; render();
          });
        });
      }
      render();
    });
  }

  /* ---------- 6. FAITHFULNESS (claim decomposition) -------------------- */
  const FAITH = {
    refund: {
      answer: "You can return the item within 30 days for a full refund, and we'll also cover return shipping. Refunds are processed within 24 hours.",
      context: "Our return policy allows returns within 30 days of delivery for a full refund. Customers are responsible for return shipping costs. Refunds are processed within 5–7 business days.",
      claims: [
        { c: "Returns are allowed within 30 days for a full refund", ok: true, why: "Stated verbatim in the context." },
        { c: "The company covers return shipping", ok: false, why: "Context says the customer pays return shipping — contradicted." },
        { c: "Refunds are processed within 24 hours", ok: false, why: "Context says 5–7 business days — unsupported/contradicted." },
      ],
    },
  };
  function faithWidget(elist) {
    elist.forEach(el => {
      const sc = FAITH[el.dataset.scenario] || FAITH.refund;
      el.innerHTML = `<div class="ix-k">▶ Try it <span class="ix-sub">faithfulness · decompose the answer, check each claim</span></div>` +
        `<div class="faith-grid"><div class="faith-box"><div class="faith-h">Answer</div><p>${esc(sc.answer)}</p></div>` +
        `<div class="faith-box"><div class="faith-h">Retrieved context</div><p>${esc(sc.context)}</p></div></div>` +
        `<button type="button" class="ix-btn faith-go">Extract claims ▸</button><div class="faith-claims"></div><div class="faith-score"></div>`;
      const go = el.querySelector(".faith-go"), box = el.querySelector(".faith-claims"), score = el.querySelector(".faith-score");
      let step = 0;
      go.addEventListener("click", () => {
        if (step >= sc.claims.length) return;
        const cl = sc.claims[step];
        const row = document.createElement("div");
        row.className = "faith-claim " + (cl.ok ? "ok" : "bad");
        row.innerHTML = `<span class="faith-mark">${cl.ok ? "✓ supported" : "✗ unsupported"}</span>` +
          `<span class="faith-txt">“${esc(cl.c)}”<span class="faith-why">${esc(cl.why)}</span></span>`;
        box.appendChild(row);
        step++;
        if (step >= sc.claims.length) {
          const sup = sc.claims.filter(c => c.ok).length;
          score.innerHTML = `<div class="faith-final">Faithfulness = supported / total = <b>${sup}/${sc.claims.length} = ${(sup / sc.claims.length).toFixed(2)}</b></div>` +
            `<p class="rag-foot">A fluent answer scored well below 1.0 — two claims the sources don't back. This is the metric that catches confident hallucination, and why it's a first-priority signal in regulated settings.</p>`;
          go.disabled = true; go.textContent = "All claims checked";
        } else { go.textContent = `Next claim (${step}/${sc.claims.length}) ▸`; }
      });

      // LIVE panel — opt-in via data-live. Ask a real question → the model answers
      // ONLY from the retrieved corpus (/rag-answer), so learners see grounding in
      // action, including it declining when the answer isn't in the sources.
      const RAG = window.FDE_RAG_URL;
      if (el.dataset.live && RAG) {
        const live = document.createElement("div");
        live.className = "rag-live";
        live.innerHTML =
          `<div class="ix-k">▶ Try it · live <span class="ix-sub">grounded answer — the model may only use retrieved context</span></div>` +
          `<div class="rag-live-in"><input class="rag-q" type="text" placeholder="Ask about the demo corpus…" value="How do I rotate the API key?">` +
          `<button type="button" class="btn rag-go">Ask ▸</button></div>` +
          `<div class="rag-live-out"></div>` +
          `<p class="rag-foot rag-live-note" hidden></p>`;
        el.appendChild(live);
        const inp = live.querySelector(".rag-q"), go2 = live.querySelector(".rag-go"),
          out = live.querySelector(".rag-live-out"), note = live.querySelector(".rag-live-note");
        go2.addEventListener("click", async () => {
          const q = inp.value.trim(); if (!q) return;
          go2.disabled = true; out.className = "rag-live-out"; out.textContent = "Retrieving + answering…"; note.hidden = true;
          try {
            const r = await fetch(RAG.replace(/\/$/, "") + "/rag-answer", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: q }),
            });
            const d = await r.json();
            if (!r.ok || !d.ok) { out.className = "rag-live-out err"; out.textContent = "Live answer unavailable — the walkthrough above still works."; go2.disabled = false; return; }
            out.className = "rag-live-out";
            out.innerHTML = `<div class="faith-box"><div class="faith-h">Grounded answer</div><p>${esc(d.answer)}</p></div>`;
            note.textContent = "Sources: " + (d.hits || []).map(h => h.doc_id).join(", ") + ". The answer is constrained to these retrieved chunks — ask something outside the corpus and it says “I don't know.” Production judges faithfulness with Claude on Bedrock (see the code).";
            note.hidden = false; go2.disabled = false;
          } catch (e) { out.className = "rag-live-out err"; out.textContent = "Network error — the walkthrough above still works."; go2.disabled = false; }
        });
      }
    });
  }

  /* ---------- 7. RAGAS SCORECARD --------------------------------------- */
  function ragasWidget(elist) {
    elist.forEach(el => {
      // baked per-question metrics over a tiny labeled set.
      const Q = [
        { q: "What's the refund window?", recall: 1.0, precision: 0.83, faith: 1.0, noise: 0.10 },
        { q: "How is the API key rotated?", recall: 1.0, precision: 0.50, faith: 0.67, noise: 0.35 },
        { q: "Torque spec for BX-4471?", recall: 0.50, precision: 1.0, faith: 1.0, noise: 0.05 },
        { q: "What are the rate limits?", recall: 1.0, precision: 0.67, faith: 0.80, noise: 0.20 },
      ];
      const avg = (k) => Q.reduce((s, x) => s + x[k], 0) / Q.length;
      el.innerHTML = `<div class="ix-k">▶ Try it <span class="ix-sub">Ragas-style scorecard · retrieval vs generation</span></div>` +
        `<button type="button" class="ix-btn ragas-go">Run eval over ${Q.length} questions ▸</button>` +
        `<div class="ragas-card" hidden></div>`;
      const go = el.querySelector(".ragas-go"), card = el.querySelector(".ragas-card");
      function meter(label, val, invert) {
        const good = invert ? val <= 0.2 : val >= 0.8;
        const warn = invert ? val <= 0.35 : val >= 0.6;
        const cls = good ? "acc-green" : warn ? "acc-orange" : "acc-red";
        const pct = (invert ? 1 - val : val) * 100;
        return `<div class="ix-bar-row"><span class="ix-bar-l">${label}</span><span class="ix-bar"><i class="${cls}" style="width:${pct}%"></i></span><span class="ix-bar-p">${val.toFixed(2)}</span></div>`;
      }
      go.addEventListener("click", () => {
        card.hidden = false; go.disabled = true;
        card.innerHTML = `<div class="ragas-cols"><div class="ragas-col"><div class="ragas-col-h">Retrieval</div>` +
          meter("recall", avg("recall")) + meter("precision", avg("precision")) + `</div>` +
          `<div class="ragas-col"><div class="ragas-col-h">Generation</div>` +
          meter("faithfulness", avg("faith")) + meter("noise sensitivity", avg("noise"), true) + `</div></div>` +
          `<p class="rag-foot">Recall is high but precision/faithfulness lag → the retriever <b>finds</b> the answer but drags in noise and the generator drifts. The stage-split tells you to fix <b>generation</b> (re-ranking + grounding), not recall. That diagnosis is the whole reason to split the scorecard.</p>`;
      });
    });
  }

  /* ---------- init ------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    chunkWidget(document.querySelectorAll(".ix-chunk"));
    simWidget(document.querySelectorAll(".ix-sim"));
    retrieveWidget(document.querySelectorAll(".ix-retrieve"));
    dimsWidget(document.querySelectorAll(".ix-dims"));
    precisionWidget(document.querySelectorAll(".ix-precision"));
    faithWidget(document.querySelectorAll(".ix-faith"));
    ragasWidget(document.querySelectorAll(".ix-ragas"));
  });
})();
