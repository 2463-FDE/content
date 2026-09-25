/* Week 4 Day 2 checkpoint simulator.
   Local deterministic state only: no provider, database, credentials, or network. */
(function (root) {
  "use strict";

  const NODES = Object.freeze([
    Object.freeze({ id: "validate_request", label: "Validate request", output: "Request schema accepted" }),
    Object.freeze({ id: "load_order", label: "Load synthetic order", output: "Fixture order SYN-204 loaded" }),
    Object.freeze({ id: "calculate_refund", label: "Calculate refund", output: "Synthetic refund = $84" }),
    Object.freeze({ id: "write_ledger", label: "Write ledger entry", output: "Fixture ledger row prepared" }),
    Object.freeze({ id: "notify_customer", label: "Notify customer", output: "Synthetic notice rendered" }),
  ]);
  const CRASH_INDEX = 2;
  const KEY_ACTIONS = Object.freeze({ KeyS: "step", KeyC: "crash", KeyR: "resume", Digit0: "reset", Numpad0: "reset" });

  function createMachine() {
    let state;

    function reset() {
      state = {
        phase: "ready",
        cursor: 0,
        checkpoint: 0,
        crashCount: 0,
        executions: Object.fromEntries(NODES.map(node => [node.id, 0])),
        skipped: [],
        replayQueue: [],
        replayed: [],
        events: ["Ready. Step through two nodes, then induce the deterministic crash."],
      };
      return snapshot();
    }

    function snapshot() {
      const next = NODES[state.cursor] || null;
      return {
        phase: state.phase,
        cursor: state.cursor,
        checkpoint: state.checkpoint,
        crashCount: state.crashCount,
        checkpointLabel: state.checkpoint ? `after ${NODES[state.checkpoint - 1].id}` : "none yet",
        nextNode: next ? { ...next } : null,
        crashNode: { ...NODES[CRASH_INDEX] },
        canStep: ["ready", "running", "resumed"].includes(state.phase) && state.cursor < NODES.length,
        canCrash: ["ready", "running"].includes(state.phase) && state.cursor === CRASH_INDEX && state.crashCount === 0,
        canResume: state.phase === "crashed",
        nodes: NODES.map((node, index) => ({
          ...node,
          executionCount: state.executions[node.id],
          durable: index < state.checkpoint,
          current: index === state.cursor && state.phase !== "complete",
          volatileCrash: state.phase === "crashed" && index === CRASH_INDEX,
        })),
        skipped: [...state.skipped],
        replayQueue: [...state.replayQueue],
        replayed: [...state.replayed],
        events: [...state.events],
        dataSource: "embedded synthetic fixture",
      };
    }

    function step() {
      if (!["ready", "running", "resumed"].includes(state.phase)) {
        return { ok: false, reason: "Resume the crashed run before stepping.", state: snapshot() };
      }
      if (state.cursor >= NODES.length) {
        return { ok: false, reason: "The graph is already complete.", state: snapshot() };
      }
      if (state.cursor === CRASH_INDEX && state.crashCount === 0) {
        return { ok: false, reason: "This node is the crash boundary. Use Induce crash.", state: snapshot() };
      }

      const node = NODES[state.cursor];
      state.executions[node.id] += 1;
      const replayed = state.replayQueue.includes(node.id);
      if (replayed) {
        state.replayed.push(node.id);
        state.replayQueue = state.replayQueue.filter(id => id !== node.id);
      }
      state.cursor += 1;
      state.checkpoint = state.cursor;
      state.phase = state.cursor === NODES.length ? "complete" : "running";
      state.events.push(
        `${replayed ? "Replayed" : "Ran"} ${node.id}; committed durable checkpoint cp-${state.checkpoint}.`
      );
      if (state.phase === "complete") {
        state.events.push("Run complete. Every node is now durable.");
      }
      return { ok: true, state: snapshot() };
    }

    function crash() {
      if (!snapshot().canCrash) {
        return { ok: false, reason: "The deterministic crash is available only at calculate_refund.", state: snapshot() };
      }
      const node = NODES[CRASH_INDEX];
      state.executions[node.id] += 1;
      state.crashCount += 1;
      state.phase = "crashed";
      state.events.push(
        `Crashed after ${node.id} produced volatile output, before cp-${CRASH_INDEX + 1} could commit.`
      );
      state.events.push(`Last durable checkpoint remains cp-${state.checkpoint} (${snapshot().checkpointLabel}).`);
      return { ok: true, state: snapshot() };
    }

    function resume() {
      if (state.phase !== "crashed") {
        return { ok: false, reason: "Induce the crash before resuming.", state: snapshot() };
      }
      state.cursor = state.checkpoint;
      state.skipped = NODES.slice(0, state.checkpoint).map(node => node.id);
      state.replayQueue = [NODES[state.cursor].id];
      state.phase = "resumed";
      state.events.push(
        `Resumed from cp-${state.checkpoint}: skipped ${state.skipped.join(", ")}; ${state.replayQueue[0]} must replay.`
      );
      return { ok: true, state: snapshot() };
    }

    reset();
    return { reset, snapshot, step, crash, resume };
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mount(container) {
    if (!container || container.dataset.checkpointMounted === "true") return null;
    container.dataset.checkpointMounted = "true";
    const machine = createMachine();

    container.innerHTML = `
      <div class="cp-head">
        <div>
          <div class="ix-k">Interactive practice · synthetic state machine</div>
          <h3>Crash, inspect the checkpoint, then resume</h3>
          <p>Advance two durable nodes. Crash the third before its checkpoint commits, then resume and compare skipped work with replayed work.</p>
        </div>
        <div class="cp-thread" aria-label="Synthetic thread identifier">thread <code>demo-refund-204</code></div>
      </div>
      <div class="cp-layout">
        <div>
          <ol class="cp-graph" aria-label="Synthetic graph nodes"></ol>
          <div class="cp-controls" aria-label="Simulator controls">
            <button class="ix-btn" type="button" data-cp-action="step" aria-keyshortcuts="Alt+S">Step graph <span>Alt+S</span></button>
            <button class="ix-btn cp-danger" type="button" data-cp-action="crash" aria-keyshortcuts="Alt+C">Induce crash <span>Alt+C</span></button>
            <button class="ix-btn" type="button" data-cp-action="resume" aria-keyshortcuts="Alt+R">Resume <span>Alt+R</span></button>
            <button class="btn-soft" type="button" data-cp-action="reset" aria-keyshortcuts="Alt+0">Reset <span>Alt+0</span></button>
          </div>
        </div>
        <div class="cp-inspector">
          <div class="cp-status" role="status" aria-live="polite" aria-atomic="true"></div>
          <dl class="cp-checkpoint"></dl>
          <div class="cp-work">
            <section><h4>Skipped after resume</h4><ul data-cp-skipped></ul></section>
            <section><h4>Replayed after resume</h4><ul data-cp-replayed></ul></section>
          </div>
          <details class="cp-log"><summary>Event log</summary><ol></ol></details>
        </div>
      </div>
      <p class="cp-note"><strong>Scope:</strong> this simulator uses an embedded synthetic fixture. It does not run LangGraph, contact a provider, open a database, or read credentials.</p>`;

    const controls = Object.fromEntries(
      Array.from(container.querySelectorAll("[data-cp-action]")).map(button => [button.dataset.cpAction, button])
    );
    const graph = container.querySelector(".cp-graph");
    const status = container.querySelector(".cp-status");
    const checkpoint = container.querySelector(".cp-checkpoint");
    const skipped = container.querySelector("[data-cp-skipped]");
    const replayed = container.querySelector("[data-cp-replayed]");
    const log = container.querySelector(".cp-log ol");

    function list(items, emptyText, suffix) {
      if (!items.length) return `<li class="cp-empty">${escapeHTML(emptyText)}</li>`;
      return items.map(item => `<li><code>${escapeHTML(item)}</code>${suffix ? ` ${escapeHTML(suffix)}` : ""}</li>`).join("");
    }

    function statusText(view) {
      if (view.phase === "crashed") return "Crash induced. Inspect the durable checkpoint, then resume.";
      if (view.phase === "resumed") return `Resumed at ${view.nextNode.id}. Step once to replay its uncommitted work.`;
      if (view.phase === "complete") return "Run complete. Durable work was skipped and only volatile work replayed.";
      if (view.canCrash) return "Crash boundary reached. Induce the deterministic crash now.";
      return `Ready to run ${view.nextNode ? view.nextNode.id : "the graph"}.`;
    }

    function render() {
      const view = machine.snapshot();
      graph.innerHTML = view.nodes.map((node, index) => {
        const classes = [
          node.durable ? "is-durable" : "",
          node.current ? "is-current" : "",
          node.volatileCrash ? "is-crashed" : "",
        ].filter(Boolean).join(" ");
        let badge = "waiting";
        if (node.durable) badge = `durable · ran ${node.executionCount}×`;
        else if (node.volatileCrash) badge = "volatile · not checkpointed";
        else if (node.current) badge = "next";
        return `<li class="${classes}" aria-current="${node.current ? "step" : "false"}">
          <span class="cp-index">${index + 1}</span>
          <span class="cp-node"><strong>${escapeHTML(node.label)}</strong><small>${escapeHTML(node.output)}</small></span>
          <span class="cp-badge">${escapeHTML(badge)}</span>
        </li>`;
      }).join("");
      status.className = `cp-status is-${view.phase}`;
      status.innerHTML = `<strong>${escapeHTML(view.phase.toUpperCase())}</strong><span>${escapeHTML(statusText(view))}</span>`;
      checkpoint.innerHTML = `
        <div><dt>Last durable checkpoint</dt><dd>${escapeHTML(view.checkpoint ? `cp-${view.checkpoint}` : "none")}</dd></div>
        <div><dt>Checkpoint boundary</dt><dd><code>${escapeHTML(view.checkpointLabel)}</code></dd></div>
        <div><dt>Next node</dt><dd><code>${escapeHTML(view.nextNode ? view.nextNode.id : "END")}</code></dd></div>`;
      skipped.innerHTML = list(view.skipped, "Nothing skipped yet.", "came from the checkpoint");
      const replayItems = [...view.replayed, ...view.replayQueue];
      replayed.innerHTML = replayItems.length
        ? replayItems.map(id => `<li><code>${escapeHTML(id)}</code> ${view.replayed.includes(id) ? "replayed" : "queued to replay"}</li>`).join("")
        : `<li class="cp-empty">Nothing replayed yet.</li>`;
      log.innerHTML = view.events.map(event => `<li>${escapeHTML(event)}</li>`).join("");
      controls.step.disabled = !view.canStep || view.canCrash;
      controls.crash.disabled = !view.canCrash;
      controls.resume.disabled = !view.canResume;
      container.dispatchEvent(new CustomEvent("w4checkpoint:change", { detail: view }));
    }

    function focusTarget(view) {
      if (view.canCrash) return "crash";
      if (view.canResume) return "resume";
      if (view.phase === "complete") return "reset";
      return "step";
    }

    function run(action) {
      const result = machine[action]();
      render();
      if (!result.ok) status.querySelector("span").textContent = result.reason;
      const target = controls[focusTarget(result.state)];
      if (target && !target.disabled) target.focus();
      return result;
    }

    controls.step.addEventListener("click", () => run("step"));
    controls.crash.addEventListener("click", () => run("crash"));
    controls.resume.addEventListener("click", () => run("resume"));
    controls.reset.addEventListener("click", () => {
      machine.reset();
      render();
      controls.step.focus();
    });
    container.addEventListener("keydown", event => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      event.preventDefault();
      if (action === "reset") {
        machine.reset();
        render();
        controls.step.focus();
      } else if (!controls[action].disabled) {
        run(action);
      }
    });

    render();
    return { machine, render };
  }

  const api = { NODES, CRASH_INDEX, createMachine, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.W4CheckpointSimulator = api;
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("[data-checkpoint-sim]").forEach(mount);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
