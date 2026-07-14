/* interactive-agents.js — Week-3 agent-topic sims (deterministic, no backend).
   Protocol + decision demos for MCP (D2), the framework landscape (D3), and
   agent memory (D4). Same declare-in-markup + auto-init-on-DOMContentLoaded
   pattern as interactive.js / interactive-rag.js. Baked data only — every
   widget is genuinely functional offline. Widget kinds:
     ix-mcp        tool inspector: tools/list → form → tools/call round-trip
     ix-transport  stdio vs Streamable HTTP raw JSON-RPC frames
     ix-consent    HITL consent gate + trusted/untrusted server annotations
     ix-handoff    triage → transfer_to_* → specialist handoff
     ix-frameworks 4-question framework-selector wizard (ranked)
     ix-compress   context compaction: trim vs summarize at a token ceiling
     ix-paging     MemGPT-style evict/recall between main context & archival store
*/
(function () {
  const esc = (s) => (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const j = (o) => JSON.stringify(o, null, 2);

  /* ================= D2·1 — MCP tool inspector ================= */
  const MCP_TOOLS = [
    { name: "get_order", title: "Get order", desc: "Fetch an order by its id.",
      schema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] },
      annotations: { readOnlyHint: true, destructiveHint: false },
      run: (a) => ({ order_id: (a.order_id || "A1002"), item: "Solar Inverter", status: "delayed", amount: 1850 }) },
    { name: "issue_refund", title: "Issue refund", desc: "Refund money against an order.",
      schema: { type: "object", properties: { order_id: { type: "string" }, amount: { type: "number" } }, required: ["order_id", "amount"] },
      annotations: { readOnlyHint: false, destructiveHint: true },
      run: (a) => ({ refunded: true, order_id: (a.order_id || "A1002"), amount: Number(a.amount) || 0 }) },
  ];
  function mcpInspector(nodes) {
    nodes.forEach((root) => {
      let id = 1;
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">MCP tool inspector · one request/response round-trip</span></div>` +
        `<div class="mcp-cols">` +
          `<div class="mcp-list"><div class="mcp-h">tools/list</div></div>` +
          `<div class="mcp-detail"><div class="mcp-h">Tool object &amp; call</div><div class="mcp-body">Pick a tool on the left.</div></div>` +
        `</div>` +
        `<div class="mcp-wire"><div class="mcp-h">JSON-RPC round-trip</div><pre class="mcp-frame">—</pre></div>`;
      const listEl = root.querySelector(".mcp-list"), detail = root.querySelector(".mcp-body"), wire = root.querySelector(".mcp-frame");
      MCP_TOOLS.forEach((t, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "mcp-tool"; b.innerHTML = `<code>${t.name}</code><span>${t.desc}</span>` +
          (t.annotations.destructiveHint ? `<em class="mcp-danger">destructive</em>` : `<em class="mcp-safe">read-only</em>`);
        b.addEventListener("click", () => { root.querySelectorAll(".mcp-tool").forEach(x => x.classList.remove("on")); b.classList.add("on"); showTool(t); });
        listEl.appendChild(b);
        if (i === 0) setTimeout(() => b.click(), 0);
      });
      function showTool(t) {
        const props = Object.keys(t.schema.properties);
        detail.innerHTML =
          `<div class="mcp-annot">annotations: ${Object.entries(t.annotations).map(([k, v]) => `<code>${k}=${v}</code>`).join(" ")}</div>` +
          `<div class="mcp-form">${props.map(p => `<label>${p} <input data-p="${p}" placeholder="${t.schema.properties[p].type}" value="${p === "order_id" ? "A1002" : p === "amount" ? "1850" : ""}"></label>`).join("")}</div>` +
          `<button type="button" class="btn mcp-send">Send tools/call ▸</button>`;
        detail.querySelector(".mcp-send").addEventListener("click", () => {
          const args = {}; detail.querySelectorAll("input").forEach(inp => { args[inp.dataset.p] = t.schema.properties[inp.dataset.p].type === "number" ? Number(inp.value) : inp.value; });
          const req = { jsonrpc: "2.0", id: id, method: "tools/call", params: { name: t.name, arguments: args } };
          const res = { jsonrpc: "2.0", id: id, result: { content: [{ type: "text", text: j(t.run(args)) }], isError: false } };
          id++;
          wire.innerHTML = `<span class="wire-lbl">→ request</span>\n${esc(j(req))}\n\n<span class="wire-lbl in">← response</span>\n${esc(j(res))}`;
        });
      }
    });
  }

  /* ================= D2·2 — transport wire viewer ================= */
  function transportViewer(nodes) {
    nodes.forEach((root) => {
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">MCP transports · same exchange, different envelope</span></div>` +
        `<div class="tp-tabs"><button type="button" class="tp-tab on" data-t="stdio">stdio (local)</button><button type="button" class="tp-tab" data-t="http">Streamable HTTP (remote)</button></div>` +
        `<pre class="tp-frame"></pre>`;
      const frame = root.querySelector(".tp-frame");
      const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "demo", version: "1.0" } } };
      const call = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_order", arguments: { order_id: "A1002" } } };
      function render(t) {
        if (t === "stdio") {
          const b1 = j(init), b2 = j(call);
          frame.innerHTML =
            `<span class="wire-lbl">stdin →</span>  process spawned; newline-delimited JSON on the pipe\n` +
            `<span class="tp-hl">Content-Length: ${b1.length}</span>\r\n\r\n${esc(b1)}\n\n` +
            `<span class="wire-lbl">stdin →</span>\n<span class="tp-hl">Content-Length: ${b2.length}</span>\r\n\r\n${esc(b2)}\n\n` +
            `<span class="tp-note">No network, no auth, no session id — the process boundary IS the security boundary.</span>`;
        } else {
          frame.innerHTML =
            `<span class="wire-lbl">POST /mcp</span>\n` +
            `Content-Type: application/json\n<span class="tp-hl">Accept: application/json, text/event-stream</span>\n<span class="tp-hl">MCP-Protocol-Version: 2025-06-18</span>\n\n${esc(j(init))}\n\n` +
            `<span class="wire-lbl in">← 200 OK</span>\n<span class="tp-hl">MCP-Session-Id: 1a9f…c7</span>\nContent-Type: application/json\n\n${esc(j({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} } } }))}\n\n` +
            `<span class="wire-lbl">POST /mcp</span>\n<span class="tp-hl">MCP-Session-Id: 1a9f…c7</span>\n\n${esc(j(call))}\n\n` +
            `<span class="wire-lbl in">← 200 OK · <span class="tp-hl">text/event-stream</span> (SSE upgrade)</span>\nevent: message\ndata: ${esc(j({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "…" }] } }))}\n\n` +
            `<span class="tp-note">Now it's HTTP: a session id to correlate turns, a negotiated protocol version, and an SSE stream for server→client messages.</span>`;
        }
      }
      root.querySelectorAll(".tp-tab").forEach(b => b.addEventListener("click", () => { root.querySelectorAll(".tp-tab").forEach(x => x.classList.remove("on")); b.classList.add("on"); render(b.dataset.t); }));
      render("stdio");
    });
  }

  /* ================= D2·3 — consent gate ================= */
  function consentGate(nodes) {
    nodes.forEach((root) => {
      let trusted = false;
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">human-in-the-loop consent · you are the gate</span></div>` +
        `<div class="cg-server">Server: <b class="cg-tag">untrusted</b> <button type="button" class="cg-toggle">toggle trust</button></div>` +
        `<div class="cg-prompt"><div class="cg-h">The model wants to call:</div>` +
          `<pre class="cg-call">issue_refund({ "order_id": "A1002", "amount": 1850 })</pre>` +
          `<div class="cg-annot"></div>` +
          `<div class="cg-btns"><button type="button" class="btn cg-approve">✓ Approve</button><button type="button" class="btn cg-deny">✕ Deny</button></div></div>` +
        `<div class="cg-out"></div>`;
      const tag = root.querySelector(".cg-tag"), annot = root.querySelector(".cg-annot"), out = root.querySelector(".cg-out");
      function refreshAnnot() {
        tag.textContent = trusted ? "trusted" : "untrusted"; tag.className = "cg-tag " + (trusted ? "ok" : "bad");
        annot.innerHTML = trusted
          ? `The server advertises <code>destructiveHint: false</code>. Because you marked it <b>trusted</b>, the client believes that hint and could auto-approve.`
          : `The server advertises <code>destructiveHint: false</code> — but it's <b>untrusted</b>, so that annotation is just a claim. A malicious server lies. Treat the call as destructive and gate it.`;
      }
      root.querySelector(".cg-toggle").addEventListener("click", () => { trusted = !trusted; refreshAnnot(); });
      root.querySelector(".cg-approve").addEventListener("click", () => {
        out.className = "cg-out ok"; out.innerHTML = trusted
          ? `✓ Executed. $1,850 refunded. You trusted the server's annotation.`
          : `✓ Executed. $1,850 refunded — <b>on an untrusted server's word.</b> If that annotation was a lie, you just let a hostile tool move money. This is why the human gate exists.`;
      });
      root.querySelector(".cg-deny").addEventListener("click", () => {
        out.className = "cg-out"; out.innerHTML = `✕ Blocked. No refund issued. The tool_result returned to the model is an explicit denial — the loop continues, safely, without the side effect.`;
      });
      refreshAnnot();
    });
  }

  /* ================= D3·1 — handoff visualizer ================= */
  const HANDOFF_ROUTES = [
    { re: /(refund|money back|charge|billing|invoice)/i, agent: "refund_agent", tool: "transfer_to_refund_agent" },
    { re: /(broken|error|not working|bug|crash|install)/i, agent: "tech_agent", tool: "transfer_to_tech_agent" },
    { re: /.*/, agent: "general_agent", tool: "transfer_to_general_agent" },
  ];
  function handoffViz(nodes) {
    nodes.forEach((root) => {
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">agent handoff · a transfer is just a tool call</span></div>` +
        `<div class="ho-in"><input class="ho-msg" value="I want my money back for order 412"><button type="button" class="btn ho-go">Route ▸</button></div>` +
        `<div class="ho-chips">try: <button type="button" class="ho-ex">my app keeps crashing on install</button> <button type="button" class="ho-ex">how do I change my email?</button></div>` +
        `<div class="ho-flow"></div>`;
      const msg = root.querySelector(".ho-msg"), flow = root.querySelector(".ho-flow");
      root.querySelectorAll(".ho-ex").forEach(b => b.addEventListener("click", () => { msg.value = b.textContent; run(); }));
      function run() {
        const r = HANDOFF_ROUTES.find(x => x.re.test(msg.value)) || HANDOFF_ROUTES[2];
        const args = { reason: msg.value.slice(0, 60), order_id: (msg.value.match(/\d{3,}/) || [""])[0] };
        flow.innerHTML =
          `<div class="ho-node ho-user">👤 user → <span>${esc(msg.value)}</span></div>` +
          `<div class="ho-arrow">↓</div>` +
          `<div class="ho-node ho-triage">🧭 triage_agent<div class="ho-sub">reads intent, picks a specialist</div></div>` +
          `<div class="ho-arrow">↓ emits tool call</div>` +
          `<div class="ho-node ho-call"><code>${r.tool}(${esc(JSON.stringify(args))})</code></div>` +
          `<div class="ho-arrow">↓ control transfers</div>` +
          `<div class="ho-node ho-spec">🎧 ${r.agent}<div class="ho-sub">now owns the conversation — same loop, new system prompt + tools</div></div>`;
        requestAnimationFrame(() => flow.querySelectorAll(".ho-node,.ho-arrow").forEach((n, i) => { n.style.animationDelay = (i * 90) + "ms"; n.classList.add("ho-in-anim"); }));
      }
      root.querySelector(".ho-go").addEventListener("click", run); run();
    });
  }

  /* ================= D3·2 — framework selector wizard ================= */
  const FW = ["LangChain / LangGraph", "OpenAI Agents SDK", "CrewAI", "Microsoft Agent Framework"];
  const FW_Q = [
    { q: "Control model", a: ["Autonomous loop (let the model drive)", "Explicit graph (I author the control flow)"],
      score: [[1, 2, 2, 1], [3, 0, 1, 3]], why: ["LangGraph & MS Agent Framework are graph-first — you draw the state machine.", "OpenAI Agents SDK & CrewAI lean autonomous — the model drives, you define roles/handoffs."] },
    { q: "Provider stance", a: ["Provider-agnostic (swap models freely)", "OpenAI-first is fine"],
      score: [[3, 0, 2, 2], [1, 3, 1, 1]], why: ["LangChain, CrewAI & MS abstract the provider.", "OpenAI Agents SDK is tightest with OpenAI models/hosted tools."] },
    { q: "Enterprise state & type-safety", a: ["Critical — durable state, typed contracts", "Light — a prototype"],
      score: [[3, 1, 0, 3], [1, 2, 3, 1]], why: ["LangGraph checkpointers + MS Agent Framework target durable, typed, enterprise state.", "CrewAI & the OpenAI SDK optimize for fast, readable prototypes."] },
    { q: "Ecosystem maturity appetite", a: ["Want the biggest ecosystem / most integrations", "Fine with newer / leaner"],
      score: [[3, 2, 1, 0], [0, 2, 2, 3]], why: ["LangChain has the largest integration surface today.", "MS Agent Framework is newest; CrewAI & the OpenAI SDK sit in between."] },
  ];
  function frameworkWizard(nodes) {
    nodes.forEach((root) => {
      const picks = new Array(FW_Q.length).fill(null);
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">framework selector · four axes → a ranked recommendation</span></div>` +
        `<div class="fw-qs">${FW_Q.map((x, qi) => `<div class="fw-q"><div class="fw-ql">${qi + 1}. ${x.q}</div>${x.a.map((opt, ai) => `<button type="button" class="fw-opt" data-q="${qi}" data-a="${ai}">${opt}</button>`).join("")}</div>`).join("")}</div>` +
        `<div class="fw-out"></div>`;
      const out = root.querySelector(".fw-out");
      root.querySelectorAll(".fw-opt").forEach(b => b.addEventListener("click", () => {
        const qi = +b.dataset.q, ai = +b.dataset.a; picks[qi] = ai;
        root.querySelectorAll(`.fw-opt[data-q="${qi}"]`).forEach(x => x.classList.remove("on")); b.classList.add("on");
        if (picks.every(p => p != null)) score();
      }));
      function score() {
        const totals = FW.map((_, fi) => picks.reduce((s, ai, qi) => s + FW_Q[qi].score[ai][fi], 0));
        const ranked = FW.map((name, fi) => ({ name, pts: totals[fi] })).sort((a, b) => b.pts - a.pts);
        const max = Math.max(...totals);
        out.innerHTML =
          `<div class="fw-rank-h">Ranked for your answers</div>` +
          ranked.map((r, i) => `<div class="fw-row${i === 0 ? " win" : ""}"><span class="fw-name">${i === 0 ? "★ " : ""}${r.name}</span><span class="fw-bar"><i style="width:${Math.round(r.pts / (max || 1) * 100)}%"></i></span><span class="fw-pts">${r.pts}</span></div>`).join("") +
          `<div class="fw-why"><b>Why:</b> ${picks.map((ai, qi) => FW_Q[qi].why[ai]).join(" ")}</div>` +
          `<div class="fw-caveat">There's no universal winner — the "best" framework is the one that matches these axes for <em>this</em> client. That reasoning is the deliverable, not the logo.</div>`;
      }
    });
  }

  /* ================= D4·1 — context compaction ================= */
  function compaction(nodes) {
    nodes.forEach((root) => {
      const CEIL = 100;
      const turns = [
        { who: "user", t: "Pull up account 8842 and its open tickets", tok: 12 },
        { who: "tool", t: "get_account → {tier:'enterprise', open:3}", tok: 22 },
        { who: "asst", t: "3 open tickets; the oldest is a refund dispute", tok: 14 },
        { who: "tool", t: "get_ticket(T-1) → {status:'stuck', amount:1850}", tok: 24 },
        { who: "asst", t: "Ticket T-1 is stuck on a refund of $1850", tok: 13 },
        { who: "user", t: "ok, now what's their current shipping address?", tok: 12 },
        { who: "tool", t: "get_address → {city:'Reno', zip:'89501'}", tok: 20 },
      ];
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">context compaction · trim vs summarize at the ceiling</span></div>` +
        `<div class="cp-ctrl">strategy: <button type="button" class="cp-s on" data-s="summarize">summarize</button><button type="button" class="cp-s" data-s="trim">trim</button><button type="button" class="btn cp-run">Hit the ceiling ▸</button></div>` +
        `<div class="cp-meter"><i></i><span class="cp-num"></span></div>` +
        `<div class="cp-turns"></div><div class="cp-note"></div>`;
      let strat = "summarize";
      const meterI = root.querySelector(".cp-meter i"), num = root.querySelector(".cp-num"), list = root.querySelector(".cp-turns"), note = root.querySelector(".cp-note");
      function total(ts) { return ts.reduce((s, x) => s + (x.tok || 0), 0); }
      function draw(ts, tag) {
        const tot = total(ts); const pct = Math.min(100, Math.round(tot / CEIL * 100));
        meterI.style.width = pct + "%"; meterI.className = tot >= CEIL ? "over" : ""; num.textContent = `${tot} / ${CEIL} tokens`;
        list.innerHTML = ts.map(x => `<div class="cp-turn cp-${x.who}${x.summary ? " cp-sum" : ""}"><span class="cp-who">${x.who}</span>${esc(x.t)}<span class="cp-tok">${x.tok}</span></div>`).join("");
        if (tag) note.innerHTML = tag;
      }
      root.querySelectorAll(".cp-s").forEach(b => b.addEventListener("click", () => { root.querySelectorAll(".cp-s").forEach(x => x.classList.remove("on")); b.classList.add("on"); strat = b.dataset.s; draw(turns, ""); }));
      root.querySelector(".cp-run").addEventListener("click", () => {
        if (strat === "trim") {
          const kept = turns.slice(-3);
          draw(kept, `<b>Trim</b> dropped the oldest 4 turns wholesale — cheap and instant, but the refund-dispute context (T-1, $1850) is <span class="cp-lost">gone</span>. Ask about it now and the agent has amnesia.`);
        } else {
          const summary = { who: "sys", t: "[summary] Account 8842 = enterprise, 3 open tickets; T-1 is a stuck $1850 refund.", tok: 18, summary: true };
          const kept = [summary].concat(turns.slice(-2));
          draw(kept, `<b>Summarize</b> collapsed the middle turns into one line — costs a model call, but the load-bearing fact (stuck $1850 refund) <span class="cp-kept">survives</span> in compressed form. Slower, lossy at the margins, but keeps continuity.`);
        }
      });
      draw(turns, "Running total is near the ceiling. Pick a strategy and hit it.");
    });
  }

  /* ================= D4·2 — MemGPT paging ================= */
  function paging(nodes) {
    nodes.forEach((root) => {
      const SLOTS = 4;
      let main = [
        { id: "m1", t: "user: set up onboarding for Reno site" },
        { id: "m2", t: "asst: created checklist, 6 items" },
        { id: "m3", t: "tool: create_tasks → 6 ids" },
        { id: "m4", t: "user: what's the wifi policy again?" },
      ];
      let archive = [{ id: "a1", t: "user (earlier): our wifi policy is WPA3, rotate keys quarterly" }];
      const steps = [
        { label: "1 · window full → evict oldest", act: () => { const ev = main.shift(); ev.t = ev.t; archive.push(ev); note = `<code>memory_evict("${ev.id}")</code> — oldest turn paged out to <b>archival storage</b> to make room. It's not lost, just off-context (like RAM → disk).`; } },
        { label: "2 · need old fact → recall", act: () => { const rec = archive.find(a => a.id === "a1"); archive = archive.filter(a => a !== rec); main.push({ id: rec.id, t: rec.t, hot: true }); note = `<code>memory_recall("wifi policy")</code> — the agent issued a function call to page the WPA3 fact <b>back into main context</b> on demand. This is the agent managing its own memory.`; } },
      ];
      let step = 0, note = "The agent's <b>main context</b> holds a few turns. Watch it page memory in and out with function calls.";
      root.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">MemGPT-style paging · the agent moves its own memory</span></div>` +
        `<div class="pg-cols"><div class="pg-main"><div class="pg-h">main context <span class="pg-cap"></span></div><div class="pg-slots"></div></div>` +
        `<div class="pg-arch"><div class="pg-h">archival storage</div><div class="pg-slots pg-astore"></div></div></div>` +
        `<div class="pg-note"></div><button type="button" class="btn pg-step">Next step ▸</button> <button type="button" class="pg-reset">reset</button>`;
      const mainEl = root.querySelector(".pg-main .pg-slots"), archEl = root.querySelector(".pg-astore"), noteEl = root.querySelector(".pg-note"), cap = root.querySelector(".pg-cap"), btn = root.querySelector(".pg-step");
      function draw() {
        cap.textContent = `${main.length}/${SLOTS}` + (main.length >= SLOTS ? " · FULL" : "");
        cap.className = "pg-cap" + (main.length >= SLOTS ? " full" : "");
        mainEl.innerHTML = main.map(m => `<div class="pg-slot${m.hot ? " hot" : ""}">${esc(m.t)}</div>`).join("");
        archEl.innerHTML = archive.length ? archive.map(a => `<div class="pg-slot arch">${esc(a.t)}</div>`).join("") : `<div class="pg-empty">(empty)</div>`;
        noteEl.innerHTML = note;
        btn.textContent = step < steps.length ? steps[step].label.replace(/^\d+ · /, "Next: ") + " ▸" : "done — reset to replay";
        btn.disabled = step >= steps.length;
      }
      btn.addEventListener("click", () => { if (step < steps.length) { steps[step].act(); step++; draw(); } });
      root.querySelector(".pg-reset").addEventListener("click", () => {
        main = [{ id: "m1", t: "user: set up onboarding for Reno site" }, { id: "m2", t: "asst: created checklist, 6 items" }, { id: "m3", t: "tool: create_tasks → 6 ids" }, { id: "m4", t: "user: what's the wifi policy again?" }];
        archive = [{ id: "a1", t: "user (earlier): our wifi policy is WPA3, rotate keys quarterly" }];
        step = 0; note = "The agent's <b>main context</b> holds a few turns. Watch it page memory in and out with function calls."; draw();
      });
      draw();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    mcpInspector(document.querySelectorAll(".ix-mcp"));
    transportViewer(document.querySelectorAll(".ix-transport"));
    consentGate(document.querySelectorAll(".ix-consent"));
    handoffViz(document.querySelectorAll(".ix-handoff"));
    frameworkWizard(document.querySelectorAll(".ix-frameworks"));
    compaction(document.querySelectorAll(".ix-compress"));
    paging(document.querySelectorAll(".ix-paging"));
  });
})();
