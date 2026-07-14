/* interactive.js — reusable inline learning widgets for reading pages.
   Declared via markup; auto-initialized on DOMContentLoaded. Each replaces
   passive prose with an active beat. All self-contained, no deps.

   Components:
   1. Predict-then-reveal:  <div class="ix-predict" data-q="..." data-a="..."></div>
   2. Spot-the-problem:     <div class="ix-spot" data-snippet="..." data-q="..." data-a="..."></div>
   3. Token counter:        <div class="ix-tokens" data-sample="..."></div>
   4. Temperature slider:   <div class="ix-temp"></div>
   5. Cost calculator:      <div class="ix-cost"></div>
   6. Retry/backoff sim:    <div class="ix-retry"></div>
*/
(function () {
  const esc = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function predict(elist) {
    elist.forEach(el => {
      const q = el.dataset.q || el.getAttribute("data-q") || "";
      const a = el.dataset.a || "";
      el.innerHTML =
        `<div class="ix-k">Predict</div><p class="ix-q">${q}</p>` +
        `<button class="ix-btn" type="button">Reveal answer</button>` +
        `<div class="ix-a">${a}</div>`;
      const btn = el.querySelector(".ix-btn"), ans = el.querySelector(".ix-a");
      btn.addEventListener("click", () => { ans.classList.add("show"); btn.style.display = "none"; });
    });
  }

  function spot(elist) {
    elist.forEach(el => {
      const snip = el.dataset.snippet || "", q = el.dataset.q || "What's the latent problem here?", a = el.dataset.a || "";
      el.innerHTML =
        `<div class="ix-k spot">🔍 Spot the problem</div>` +
        `<pre class="ix-snippet">${esc(snip)}</pre>` +
        `<p class="ix-q">${q}</p>` +
        `<button class="ix-btn" type="button">Reveal the problem</button>` +
        `<div class="ix-a">${a}</div>`;
      const btn = el.querySelector(".ix-btn"), ans = el.querySelector(".ix-a");
      btn.addEventListener("click", () => { ans.classList.add("show"); btn.style.display = "none"; });
    });
  }

  function tokenCounter(elist) {
    elist.forEach(el => {
      const sample = el.dataset.sample || "Summarize this RFP for a non-technical reader.";
      el.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">token counter · ≈ chars ÷ 4</span></div>` +
        `<textarea class="ix-ta" rows="3"></textarea>` +
        `<div class="ix-out"><b class="t-tok">0</b> tokens · <span class="t-ch">0</span> chars · <span class="t-wd">0</span> words</div>`;
      const ta = el.querySelector(".ix-ta");
      const tok = el.querySelector(".t-tok"), ch = el.querySelector(".t-ch"), wd = el.querySelector(".t-wd");
      function upd() {
        const s = ta.value; const chars = s.length;
        ch.textContent = chars; wd.textContent = s.trim() ? s.trim().split(/\s+/).length : 0;
        tok.textContent = Math.ceil(chars / 4);
      }
      ta.addEventListener("input", upd); ta.value = sample; upd();
    });
  }

  function tempSlider(elist) {
    const logits = [3.2, 2.4, 1.9, 1.2, 0.6]; // fixed candidate "scores"
    const labels = ["approve", "review", "deny", "escalate", "defer"];
    elist.forEach(el => {
      el.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">temperature · how the next token is picked</span></div>` +
        `<input class="ix-range" type="range" min="0" max="150" value="20">` +
        `<div class="ix-temp-val">temperature = <b>0.20</b> · <span class="ix-temp-desc"></span></div>` +
        `<div class="ix-bars"></div>`;
      const range = el.querySelector(".ix-range"), val = el.querySelector("b"), desc = el.querySelector(".ix-temp-desc"), bars = el.querySelector(".ix-bars");
      function softmax(t) {
        const T = Math.max(0.05, t);
        const ex = logits.map(z => Math.exp(z / T));
        const s = ex.reduce((a, b) => a + b, 0);
        return ex.map(e => e / s);
      }
      function upd() {
        const t = range.value / 100; val.textContent = t.toFixed(2);
        desc.textContent = t < 0.3 ? "near-deterministic — picks the top token (extraction, code, classification)"
          : t < 0.8 ? "balanced" : "creative / varied — less repeatable";
        const p = softmax(t);
        bars.innerHTML = p.map((pr, i) =>
          `<div class="ix-bar-row"><span class="ix-bar-l">${labels[i]}</span>` +
          `<span class="ix-bar"><i style="width:${(pr * 100).toFixed(1)}%"></i></span>` +
          `<span class="ix-bar-p">${(pr * 100).toFixed(0)}%</span></div>`).join("");
      }
      range.addEventListener("input", upd); upd();
    });
  }

  function costCalc(elist) {
    elist.forEach(el => {
      el.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">cost calculator</span></div>` +
        `<div class="ix-grid">` +
        `<label>Input tokens<input class="c-in" type="number" value="4800"></label>` +
        `<label>Output tokens<input class="c-out" type="number" value="400"></label>` +
        `<label>$ / M input<input class="c-pin" type="number" step="0.1" value="3"></label>` +
        `<label>$ / M output<input class="c-pout" type="number" step="0.1" value="15"></label>` +
        `<label>Calls / day<input class="c-n" type="number" value="50000"></label>` +
        `</div>` +
        `<div class="ix-out">Per call <b class="c-call">$0</b> · Per day <b class="c-day">$0</b> · Per month <b class="c-mo">$0</b></div>`;
      const g = (s) => parseFloat(el.querySelector(s).value) || 0;
      function upd() {
        const per = g(".c-in") / 1e6 * g(".c-pin") + g(".c-out") / 1e6 * g(".c-pout");
        const day = per * g(".c-n"); const mo = day * 30;
        el.querySelector(".c-call").textContent = "$" + per.toFixed(4);
        el.querySelector(".c-day").textContent = "$" + day.toLocaleString(undefined, { maximumFractionDigits: 0 });
        el.querySelector(".c-mo").textContent = "$" + mo.toLocaleString(undefined, { maximumFractionDigits: 0 });
      }
      el.querySelectorAll("input").forEach(i => i.addEventListener("input", upd)); upd();
    });
  }

  function retrySim(elist) {
    elist.forEach(el => {
      el.innerHTML =
        `<div class="ix-k">▶ Try it <span class="ix-sub">retry with backoff + jitter</span></div>` +
        `<div class="ix-out">base 0.5s · ×2 each attempt · cap 8s · full jitter · max 5 tries</div>` +
        `<button class="ix-btn" type="button">▶ Simulate a flaky call</button>` +
        `<div class="ix-retry-log"></div>`;
      const btn = el.querySelector(".ix-btn"), log = el.querySelector(".ix-retry-log");
      btn.addEventListener("click", () => {
        const succeedAt = 2 + Math.floor(Math.random() * 3); // succeeds on attempt 3-5
        let html = "", t = 0;
        for (let n = 0; n < 5; n++) {
          const base = Math.min(8, 0.5 * Math.pow(2, n));
          const wait = n === 0 ? 0 : +(Math.random() * base).toFixed(2);
          t += wait;
          const ok = n === succeedAt;
          html += `<div class="rl-row ${ok ? "ok" : "fail"}">attempt ${n + 1}: ${n === 0 ? "immediate" : "wait " + wait + "s (≤" + base + "s)"} → ${ok ? "200 ✓ ship" : "429/5xx — back off"}</div>`;
          if (ok) break;
        }
        html += `<div class="rl-tot">total added latency ≈ ${t.toFixed(2)}s — bounded, never an infinite hammer</div>`;
        log.innerHTML = html;
      });
    });
  }

  // LIVE "Try it" — actually calls Claude via the backend Worker, with hard
  // limits enforced server-side (3 tries/user, low max_tokens). Degrades
  // gracefully to an info note until window.FDE_RUN_URL is set.
  function runWidget(elist) {
    elist.forEach(el => {
      const id = el.dataset.id || "run";
      const sys = el.dataset.system || "";
      let examples = []; try { examples = JSON.parse(el.dataset.examples || "[]"); } catch (e) {}
      let labels = []; try { labels = JSON.parse(el.dataset.labels || "[]"); } catch (e) {}
      const yourTurn = el.dataset.yourturn || "";
      const yourTurnLabel = el.dataset.yourturnLabel || "✎ Your turn";
      const url = window.FDE_RUN_URL;
      // tabs: the example prompts (ready to run) + a "Your turn" one the learner edits.
      // data-labels (parallel to data-examples) and data-yourturn-label let each
      // widget name its own tabs — e.g. "① Lazy practice" / "② Best practice".
      // Preset example tabs are run-only (variant e0,e1,…) and their outputs are
      // CACHED server-side; the editable "Your turn" tab (variant "edit") keeps the
      // 3-try cap. Outputs persist, so a learner returning with usage spent still
      // sees their last result.
      const tabs = examples.map((x, i) => ({ label: labels[i] || ("Example " + (i + 1)), text: x, edit: false, variant: "e" + i }));
      if (yourTurn) {
        // The authoring "✎ Your turn …" instruction was being buried INSIDE the
        // textarea (where the learner edits over it and can't read it). Split it
        // out: the text before the ✎ marker is the editable starter prompt; the
        // ✎ part becomes a highlighted instruction block above the box.
        const mark = yourTurn.indexOf("✎");
        const starter = mark >= 0 ? yourTurn.slice(0, mark).trim() : yourTurn;
        const note = mark >= 0 ? yourTurn.slice(mark).replace(/^✎\s*/, "").trim() : "";
        tabs.push({ label: yourTurnLabel, text: starter, note: note, edit: true, variant: "edit" });
      }
      el.innerHTML =
        `<div class="ix-k">▶ Try it · live <span class="ix-sub">calls Claude · <b class="run-left">3</b> edit-tries</span></div>` +
        `<p class="run-guide">Run the example${examples.length > 1 ? "s" : ""} (saved — revisit any time), then ${yourTurn ? "open <b>Your turn</b>, edit the prompt," : "tweak the prompt"} and run it — watch the answer change.</p>` +
        `<div class="run-tabs">${tabs.map((t, i) => `<button type="button" class="run-tab${i === 0 ? " on" : ""}" data-i="${i}">${t.label}</button>`).join("")}</div>` +
        `<div class="run-note" hidden></div>` +
        `<textarea class="ix-ta run-in" rows="3"></textarea>` +
        `<button type="button" class="btn run-go">Run ▸</button>` +
        `<div class="run-out"></div>`;
      const ta = el.querySelector(".run-in"), out = el.querySelector(".run-out"), go = el.querySelector(".run-go"), left = el.querySelector(".run-left");
      const note = el.querySelector(".run-note");
      const tabEls = Array.from(el.querySelectorAll(".run-tab"));
      const cache = {};   // variant -> last output (server-backed, loaded below)
      let cur = 0;
      function showOut(v) {
        if (cache[v] != null) { out.className = "run-out ok saved"; out.textContent = cache[v]; }
        else { out.className = "run-out"; out.textContent = ""; }
      }
      function pick(i) {
        cur = i;
        tabEls.forEach((t, j) => t.classList.toggle("on", j === i));
        const t = tabs[i] || { text: "", edit: false, variant: "e0" };
        ta.value = t.text;
        ta.readOnly = !t.edit;                 // presets: executable, not editable
        el.classList.toggle("is-locked", !t.edit);
        if (note) {                            // visible "what to do" block (your-turn tab)
          if (t.note) { note.textContent = t.note; note.hidden = false; }
          else { note.hidden = true; note.textContent = ""; }
        }
        go.disabled = false;
        if (t.edit) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
        showOut(t.variant);
      }
      tabEls.forEach((t, i) => t.addEventListener("click", () => pick(i)));
      if (tabs.length) pick(0);
      if (!url) { go.disabled = true; out.className = "run-out info"; out.textContent = "Live demo not enabled yet — backend pending. (Everything else on the page works.)"; return; }
      // Load saved outputs + remaining edit-tries so a returning learner sees results.
      (function () {
        const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
        const trainee = idt ? idt.code : "anon";
        fetch(url + "/exec-cache?trainee=" + encodeURIComponent(trainee) + "&id=" + encodeURIComponent(id))
          .then(r => r.ok ? r.json() : null).then(d => {
            if (!d || !d.ok) return;
            Object.assign(cache, d.outputs || {});
            if (typeof d.remaining === "number") left.textContent = d.remaining;
            showOut(tabs[cur] ? tabs[cur].variant : "e0");
          }).catch(() => {});
      })();
      go.addEventListener("click", async () => {
        const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
        const trainee = idt ? idt.code : "anon";
        const t = tabs[cur] || { variant: "edit", edit: true };
        const prompt = ta.value.trim(); if (!prompt) return;
        go.disabled = true; out.className = "run-out"; out.textContent = "Running…";
        try {
          const r = await fetch(url + "/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trainee, id, prompt, system: sys, variant: t.variant }) });
          const d = await r.json();
          if (r.status === 429) {
            if (d.text != null) { cache[t.variant] = d.text; out.className = "run-out ok saved"; out.textContent = d.text; }
            else { out.className = "run-out info"; out.textContent = "You've used all 3 edit-tries for this demo."; }
            left.textContent = "0"; go.disabled = false; return;
          }
          if (!r.ok) { out.className = "run-out err"; out.textContent = d.error || "error"; go.disabled = false; return; }
          cache[t.variant] = d.text;
          out.className = "run-out ok" + (d.cached ? " saved" : "");
          out.textContent = d.text;
          if (typeof d.remaining === "number") left.textContent = d.remaining;
          go.disabled = false;
        } catch (e) { out.className = "run-out err"; out.textContent = "network error"; go.disabled = false; }
      });
    });
  }

  // LIVE agent loop — runs a REAL bounded ReAct loop server-side (POST /agent)
  // and renders the full trajectory as a LangSmith-style trace tree: each Thought,
  // the Action (tool + input), the Observation (tool_result), a live iteration +
  // token HUD, and the terminating stop_reason. Presets are run-only and cached;
  // the "Steer it" tab lets the learner edit the goal + flip tool_choice and re-run
  // the real loop (3 tries). Degrades to an info note until FDE_RUN_URL is set.
  const TC_OPTS = [
    ["auto", "auto — model decides each turn"],
    ["any", "any — must call some tool"],
    ["tool:lookup_order", "tool — force lookup_order"],
    ["none", "none — no tools (answer from memory)"],
  ];
  // Compact tool_choice options for the inline code editor (value shown as-is).
  const TC_CODE = [["auto", "auto"], ["any", "any"], ["tool:lookup_order", "tool:lookup_order"], ["none", "none"]];
  // The safe, server-defined tool allowlist the learner may toggle (never extend).
  const AGENT_TOOLS_UI = [
    { name: "lookup_order", desc: "fetch an order" },
    { name: "lookup_customer", desc: "fetch a customer" },
    { name: "calculator", desc: "arithmetic" },
  ];
  // Read-only view of the real loop mechanics — shown locked under the editable
  // config so learners SEE what executes but can't touch it (the prod safety lesson).
  const LOCKED_CODE =
    'messages = [{"role": "user", "content": user_message}]\n' +
    'while True:\n' +
    '    resp = client.messages.create(          # the model call\n' +
    '        model=model, tools=tools,\n' +
    '        tool_choice=tool_choice, messages=messages,\n' +
    '        max_tokens=500,\n' +
    '    )\n' +
    '    if resp.stop_reason != "tool_use":       # exit: model is done\n' +
    '        break\n' +
    '    for call in resp.tool_use_blocks:\n' +
    '        result = TOOLS[call.name](**call.input)   # allowlisted dispatch\n' +
    '        messages.append(tool_result(call, result))\n' +
    '    if iterations >= 6:                      # guardrail: hard iteration cap\n' +
    '        break';
  function agentWidget(elist) {
    elist.forEach(el => {
      const id = el.dataset.id || "agent";
      let presets = []; try { presets = JSON.parse(el.dataset.presets || "[]"); } catch (e) {}
      const steer = el.dataset.steer === "1" || el.dataset.steer === "true";
      const steerSystem = el.dataset.steerSystem === "1"; // expose an editable system-prompt field on the steer tab
      const toolsLine = el.dataset.tools || "lookup_order · lookup_customer · calculator";
      const sysDefault = el.dataset.system || "";
      const url = window.FDE_RUN_URL;

      const tabs = presets.map((p, i) => ({
        label: p.label || ("Run " + (i + 1)), goal: p.goal || "", tc: p.tool_choice || "auto",
        system: p.system || "", edit: false, variant: "e" + i,
      }));
      if (steer) tabs.push({ label: "✎ Steer it", goal: (presets[0] && presets[0].goal) || "", tc: "auto", system: sysDefault, edit: true, variant: "steer" });

      el.innerHTML =
        `<div class="ix-k">▶ Try it · live agent <span class="ix-sub">real ReAct loop · <b class="ag-left">3</b> steer-tries</span></div>` +
        `<p class="run-guide">Run the loop and watch the <b>Thought → Action → Observation</b> trajectory unfold — the same loop the reading describes, executed for real against safe demo tools.</p>` +
        `<div class="ag-tools">tools available: <code>${toolsLine}</code></div>` +
        `<div class="run-tabs">${tabs.map((t, i) => `<button type="button" class="run-tab${i === 0 ? " on" : ""}" data-i="${i}">${t.label}</button>`).join("")}</div>` +
        `<label class="ag-goal-l">Goal<textarea class="ix-ta ag-goal" rows="2"></textarea></label>` +
        `<div class="ag-steer" hidden>` +
          `<div class="ce">` +
            `<div class="ce-bar"><span class="ce-dots"><i></i><i></i><i></i></span><span class="ce-file">configure_agent.py</span><span class="ce-badge">✎ edit the highlighted values</span></div>` +
            `<div class="ce-code">` +
              `<div class="ce-ln"><span class="cek">from</span> langchain.agents <span class="cek">import</span> create_agent</div>` +
              `<div class="ce-ln"> </div>` +
              `<div class="ce-ln">agent = create_agent(</div>` +
              `<div class="ce-ln ce-i">model=<span class="ces">"claude-haiku-4-5"</span>,</div>` +
              `<div class="ce-ln ce-i">system_prompt=<span class="ces">"</span><textarea class="ag-sys ce-ed" rows="1" spellcheck="false"></textarea><span class="ces">"</span>,</div>` +
              `<div class="ce-ln ce-i">tools=[<span class="ce-tools">${AGENT_TOOLS_UI.map(t => `<label class="ce-tool" title="${t.desc}"><input type="checkbox" class="ce-toolbox" value="${t.name}" checked><span>${t.name}</span></label>`).join('<span class="cep">, </span>')}</span>],</div>` +
              `<div class="ce-ln ce-i">tool_choice=<span class="ces">"</span><select class="ag-tc ce-ed ce-sel">${TC_CODE.map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select><span class="ces">"</span>,</div>` +
              `<div class="ce-ln">)</div>` +
              `<div class="ce-ln">result = agent.run(user_message)  <span class="cec"># ← the goal you typed above</span></div>` +
            `</div>` +
          `</div>` +
          `<details class="ce-lock"><summary><span class="ce-lockic">🔒</span> what actually runs this — fixed on the server</summary>` +
            `<pre class="ce-locked">${esc(LOCKED_CODE)}</pre>` +
            `<p class="ce-lock-note"><b>Why you can't edit this:</b> the loop, the tools' code, and the guardrails run on the server — you only change validated <em>inputs</em> (message, system prompt, which tools, tool_choice). That's how you safely expose an agent in production: a bounded, checked surface — <b>never</b> raw code execution.</p>` +
          `</details></div>` +
        `<button type="button" class="btn ag-go">Run loop ▸</button>` +
        `<div class="ag-result" hidden>` +
          `<div class="ag-view" role="tablist">` +
            `<button type="button" class="ag-vbtn on" data-v="traj" role="tab">Trajectory</button>` +
            `<button type="button" class="ag-vbtn" data-v="trace" role="tab">Trace</button>` +
            `<div class="ag-hud"><span class="ag-iter">iteration 0</span><span class="ag-tok">0 tok</span><span class="ag-stop"></span></div>` +
          `</div>` +
          `<div class="ag-panel">` +
            `<div class="ag-trajview"><div class="ag-trace"></div><div class="ag-final"></div></div>` +
            `<div class="ag-lfpanel" hidden></div>` +
          `</div>` +
        `</div>` +
        `<a class="ag-tracelink" target="_blank" rel="noopener" hidden>View this run's trace in Langfuse ↗</a>`;

      const goalEl = el.querySelector(".ag-goal"), goalL = el.querySelector(".ag-goal-l");
      const steerBox = el.querySelector(".ag-steer"), tcEl = el.querySelector(".ag-tc"), sysEl = el.querySelector(".ag-sys");
      const toolboxEls = Array.from(el.querySelectorAll(".ce-toolbox"));
      const go = el.querySelector(".ag-go"), left = el.querySelector(".ag-left");
      const hud = el.querySelector(".ag-hud"), iterEl = el.querySelector(".ag-iter"), tokEl = el.querySelector(".ag-tok"), stopEl = el.querySelector(".ag-stop");
      const trace = el.querySelector(".ag-trace"), finalEl = el.querySelector(".ag-final"), traceLink = el.querySelector(".ag-tracelink");
      const resultEl = el.querySelector(".ag-result"), trajView = el.querySelector(".ag-trajview"), lfpanel = el.querySelector(".ag-lfpanel");
      const vbtns = Array.from(el.querySelectorAll(".ag-vbtn"));
      const tabEls = Array.from(el.querySelectorAll(".run-tab"));
      const cache = {}; let cur = 0, view = "traj";

      function setView(v) {
        view = v; vbtns.forEach(b => b.classList.toggle("on", b.dataset.v === v));
        trajView.hidden = v !== "traj"; lfpanel.hidden = v !== "trace";
      }
      vbtns.forEach(b => b.addEventListener("click", () => setView(b.dataset.v)));

      function autoGrow(ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 130) + "px"; }
      if (sysEl) sysEl.addEventListener("input", () => autoGrow(sysEl));

      function showTraceLink(d) {
        if (d && d.traceUrl) { traceLink.href = d.traceUrl; traceLink.hidden = false; }
        else { traceLink.hidden = true; traceLink.removeAttribute("href"); }
      }
      const dur = (a, b) => { const ms = new Date(b) - new Date(a); return ms >= 0 && ms < 1 ? "<1ms" : (ms >= 1000 ? (ms / 1000).toFixed(2) + "s" : ms + "ms"); };
      const pj = (x) => esc(JSON.stringify(x, null, 2));
      // A Langfuse-style trace panel rendered inline from the SAME record we log to
      // Langfuse (Langfuse's app can't be iframed — it sends frame-ancestors 'none').
      function renderLf(d) {
        const spans = d.trace || [];
        if (!spans.length) { lfpanel.innerHTML = `<div class="lf-empty">No trace spans for this run.</div>`; return; }
        const totalTok = (d.usage && (d.usage.input + d.usage.output)) || 0;
        const t0 = spans[0].start, t1 = spans[spans.length - 1].end;
        const rows = spans.map(s => {
          if (s.kind === "llm") {
            return `<div class="lf-span lf-llm"><div class="lf-hd"><span class="lf-ic">◆</span>` +
              `<span class="lf-name">GENERATION · llm · iter ${s.iter}</span>` +
              `<span class="lf-badge">${dur(s.start, s.end)}</span>` +
              `<span class="lf-badge tok">${(s.usage && s.usage.input) || 0}→${(s.usage && s.usage.output) || 0} tok</span>` +
              `<span class="lf-model">${esc(s.model || "")}</span></div>` +
              `<details class="lf-io"><summary>input · output${s.stop_reason ? " · stop: " + esc(s.stop_reason) : ""}</summary>` +
              `<div class="lf-iolab">input (messages sent)</div><pre>${pj(s.input)}</pre>` +
              `<div class="lf-iolab">output (assistant blocks)</div><pre>${pj(s.output)}</pre></details></div>`;
          }
          return `<div class="lf-span lf-tool"><div class="lf-hd"><span class="lf-ic tool">▸</span>` +
            `<span class="lf-name">SPAN · tool · ${esc(s.tool)}</span>` +
            `<span class="lf-badge">${dur(s.start, s.end)}</span></div>` +
            `<details class="lf-io"><summary>input · output</summary>` +
            `<div class="lf-iolab">input</div><pre>${pj(s.toolInput)}</pre>` +
            `<div class="lf-iolab">output</div><pre>${esc(typeof s.output === "string" ? s.output : JSON.stringify(s.output, null, 2))}</pre></details></div>`;
        }).join("");
        lfpanel.innerHTML =
          `<div class="lf-head"><span class="lf-h-name">TRACE · content.agent</span>` +
          `<span class="lf-h-meta">${dur(t0, t1)} · ${totalTok} tokens · ${spans.filter(s => s.kind === "llm").length} generations · ${spans.filter(s => s.kind === "tool").length} tool spans</span></div>` +
          `<div class="lf-note">The observability record for this run — the same trace stored in Langfuse (open the full tool below).</div>` +
          `<div class="lf-tree">${rows}</div>`;
      }
      function pick(i) {
        cur = i; tabEls.forEach((t, j) => t.classList.toggle("on", j === i));
        const t = tabs[i]; goalEl.value = t.goal; goalEl.readOnly = !t.edit;
        el.classList.toggle("is-locked", !t.edit);
        steerBox.hidden = !t.edit;
        goalL.hidden = false;
        if (t.edit) {
          tcEl.value = t.tc;
          if (sysEl) { sysEl.value = t.system || sysDefault || "You are a support agent. Use the tools to ground every fact; never guess an order, customer, or number you can look up."; autoGrow(sysEl); }
          toolboxEls.forEach(b => { b.checked = true; });
        }
        trace.innerHTML = ""; finalEl.innerHTML = ""; finalEl.classList.remove("show"); showTraceLink(null);
        lfpanel.innerHTML = ""; resultEl.hidden = true; setView("traj");
        if (cache[t.variant]) render(cache[t.variant], false);
      }
      tabEls.forEach((t, i) => t.addEventListener("click", () => pick(i)));

      const esc2 = (s) => esc(typeof s === "string" ? s : JSON.stringify(s));
      function stepNode(s) {
        if (s.type === "thought") return `<div class="ag-step ag-thought"><span class="ag-tag">Thought<span class="ag-it">iter ${s.iter}</span></span><div class="ag-body">${esc(s.text)}</div></div>`;
        if (s.type === "action") return `<div class="ag-step ag-action"><span class="ag-tag">Action<span class="ag-it">iter ${s.iter}</span></span><div class="ag-body"><code>${esc(s.tool)}(${esc2(s.input)})</code></div></div>`;
        if (s.type === "observation") return `<div class="ag-step ag-obs"><span class="ag-tag">Observation</span><div class="ag-body"><code>${esc(s.output)}</code></div></div>`;
        if (s.type === "capped") return `<div class="ag-step ag-warn"><span class="ag-tag">Guardrail</span><div class="ag-body">${esc(s.text)}</div></div>`;
        if (s.type === "error") return `<div class="ag-step ag-warn"><span class="ag-tag">Error</span><div class="ag-body">${esc(s.text)}</div></div>`;
        return "";
      }
      function render(d, animate) {
        resultEl.hidden = false;
        const steps = d.steps || [];
        const nodes = steps.map(stepNode).filter(Boolean);
        tokEl.textContent = ((d.usage && (d.usage.input + d.usage.output)) || 0) + " tok";
        stopEl.textContent = "stop: " + (d.stopReason || "—");
        stopEl.className = "ag-stop " + (d.stopReason === "end_turn" ? "ok" : d.stopReason === "tool_use" || d.stopReason === "error" ? "warn" : "");
        finalEl.innerHTML = d.final ? `<span class="ag-tag ag-ans">Answer</span><div class="ag-body">${esc(d.final)}</div>` : "";
        renderLf(d);
        if (!animate) {
          trace.innerHTML = nodes.join("");
          iterEl.textContent = "iteration " + (d.iterations || 0);
          finalEl.classList.toggle("show", !!d.final);
          showTraceLink(d);
          return;
        }
        trace.innerHTML = ""; finalEl.classList.remove("show"); showTraceLink(null);
        let k = 0;
        (function reveal() {
          if (k >= nodes.length) {
            iterEl.textContent = "iteration " + (d.iterations || 0);
            finalEl.classList.add("show"); showTraceLink(d); return;
          }
          trace.insertAdjacentHTML("beforeend", nodes[k]);
          const s = steps[k]; if (s && s.iter) iterEl.textContent = "iteration " + s.iter;
          k++; setTimeout(reveal, 420);
        })();
      }

      if (steer && tabs.length) { /* steer default off — start on first preset */ }
      if (tabs.length) pick(0);
      if (!url) { go.disabled = true; finalEl.innerHTML = `<div class="run-out info">Live agent loop not enabled yet — backend pending.</div>`; return; }

      go.addEventListener("click", async () => {
        const t = tabs[cur]; const goal = goalEl.value.trim(); if (!goal) return;
        const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
        const trainee = idt ? idt.code : "anon";
        const tc = t.edit ? tcEl.value : t.tc;
        const sys = t.edit && sysEl ? sysEl.value.trim() : (t.system || "");
        const body = { trainee, id, goal, tool_choice: tc, system: sys, variant: t.variant };
        if (t.edit) body.tools = toolboxEls.filter(b => b.checked).map(b => b.value);   // safe allowlist subset
        go.disabled = true; resultEl.hidden = false; setView("traj");
        iterEl.textContent = "running…"; tokEl.textContent = ""; stopEl.textContent = ""; stopEl.className = "ag-stop";
        trace.innerHTML = `<div class="ag-running">running the loop…</div>`; finalEl.innerHTML = ""; finalEl.classList.remove("show"); showTraceLink(null);
        try {
          const r = await fetch(url + "/agent", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const d = await r.json();
          if (r.status === 429) {
            left.textContent = "0";
            if (d.steps) { cache[t.variant] = d; render(d, false); } else { trace.innerHTML = `<div class="run-out info">You've used all 3 steer-tries for this demo.</div>`; }
            go.disabled = false; return;
          }
          if (!r.ok || !d.ok) { trace.innerHTML = `<div class="run-out err">${esc(d.error || "error")}</div>`; go.disabled = false; return; }
          cache[t.variant] = d;
          render(d, true);
          if (typeof d.remaining === "number") left.textContent = d.remaining;
          go.disabled = false;
        } catch (e) { trace.innerHTML = `<div class="run-out err">network error</div>`; go.disabled = false; }
      });
    });
  }

  // consistent interaction key — the same vocabulary on every reading
  function legend(elist) {
    elist.forEach(el => {
      el.innerHTML =
        `<span class="ixl-lead">This reading is interactive —</span>` +
        `<span class="ixl-chip">Predict</span>` +
        `<span class="ixl-chip">🔍 Spot the problem</span>` +
        `<span class="ixl-chip">▶ Try it</span>` +
        `<span class="ixl-chip">✓ Check</span>` +
        `<span class="ixl-chip">click diagram nodes</span>`;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    legend(document.querySelectorAll(".ix-legend"));
    predict(document.querySelectorAll(".ix-predict"));
    spot(document.querySelectorAll(".ix-spot"));
    tokenCounter(document.querySelectorAll(".ix-tokens"));
    tempSlider(document.querySelectorAll(".ix-temp"));
    costCalc(document.querySelectorAll(".ix-cost"));
    retrySim(document.querySelectorAll(".ix-retry"));
    runWidget(document.querySelectorAll(".ix-run"));
    agentWidget(document.querySelectorAll(".ix-agent"));
  });
})();
