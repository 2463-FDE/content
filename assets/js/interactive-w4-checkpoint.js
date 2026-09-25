/* Week 4 Day 2 checkpoint simulator.
   Local deterministic state only: no provider, database, credentials, storage, or network. */
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
  const PREDICTION_ANSWERS = Object.freeze({
    checkpoint: "cp-2",
    skipped: "validate_request,load_order",
    replayed: "calculate_refund",
    executionCount: "2",
  });
  const PREDICTION_MESSAGES = Object.freeze({
    checkpoint: "The crash happened after two commits, so cp-2 is the last durable checkpoint.",
    skipped: "validate_request and load_order are already covered by cp-2, so both are skipped.",
    replayed: "calculate_refund produced volatile output but never committed, so it must replay.",
    executionCount: "calculate_refund runs twice total: once before the crash and once during replay.",
  });

  function emptyPrediction() {
    return { attempts: 0, checked: false, answers: {}, feedback: [] };
  }

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
        prediction: emptyPrediction(),
        events: ["Ready. Commit two nodes, induce the crash, then predict the recovery plan."],
      };
      return snapshot();
    }

    function snapshot() {
      const next = NODES[state.cursor] || null;
      const prediction = {
        attempts: state.prediction.attempts,
        checked: state.prediction.checked,
        answers: { ...state.prediction.answers },
        feedback: state.prediction.feedback.map(item => ({ ...item })),
      };
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
        canResume: state.phase === "crashed" && prediction.checked,
        prediction,
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
      if (state.phase === "complete") state.events.push("Run complete. Every node is now durable.");
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
      state.prediction = emptyPrediction();
      state.events.push(`Crashed after ${node.id} produced volatile output, before its checkpoint could commit.`);
      state.events.push("Recovery details are locked until all four predictions are correct.");
      return { ok: true, state: snapshot() };
    }

    function submitPrediction(answers) {
      if (state.phase !== "crashed") {
        return { ok: false, kind: "invalid", reason: "Induce the crash before checking a prediction.", state: snapshot() };
      }
      const normalized = Object.fromEntries(
        Object.keys(PREDICTION_ANSWERS).map(key => [key, String((answers || {})[key] || "")])
      );
      const feedback = Object.keys(PREDICTION_ANSWERS).map(key => {
        if (!normalized[key]) {
          return { field: key, status: "missing", message: "Choose an answer for this concept before continuing." };
        }
        const correct = normalized[key] === PREDICTION_ANSWERS[key];
        return {
          field: key,
          status: correct ? "correct" : "incorrect",
          message: correct ? `Correct. ${PREDICTION_MESSAGES[key]}` : `Not yet. ${PREDICTION_MESSAGES[key]}`,
        };
      });
      const missing = feedback.some(item => item.status === "missing");
      const correct = feedback.every(item => item.status === "correct");
      state.prediction.answers = normalized;
      state.prediction.feedback = feedback;
      state.prediction.checked = correct;
      if (!missing) state.prediction.attempts += 1;
      if (correct) state.events.push("Prediction correct. The durable boundary and recovery plan are now revealed.");
      return {
        ok: correct,
        kind: missing ? "partial" : (correct ? "correct" : "incorrect"),
        reason: missing
          ? "Answer all four prediction prompts before checking."
          : (correct ? "Prediction correct. Resume is now available." : "Review each explanation, revise the answers, and check again."),
        feedback,
        state: snapshot(),
      };
    }

    function resume() {
      if (state.phase !== "crashed") {
        return { ok: false, reason: "Induce the crash before resuming.", state: snapshot() };
      }
      if (!state.prediction.checked) {
        return { ok: false, reason: "Submit a correct recovery prediction before resuming.", state: snapshot() };
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
    return { reset, snapshot, step, crash, submitPrediction, resume };
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
          <h3>Crash, predict the recovery plan, then resume</h3>
          <p>Commit two nodes and crash the third. Before recovery details are revealed, predict the checkpoint, skipped work, replayed work, and execution count.</p>
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
          <form class="cp-predict" data-cp-predict hidden>
            <h4>Predict before the reveal</h4>
            <p>All four concepts must be correct. Wrong answers get concept-specific feedback and can be retried.</p>
            <div class="cp-predict-grid">
              <label>Last durable checkpoint
                <select name="checkpoint" required>
                  <option value="">Choose…</option><option value="cp-1">cp-1</option><option value="cp-2">cp-2</option><option value="cp-3">cp-3</option>
                </select>
              </label>
              <label>Nodes skipped on resume
                <select name="skipped" required>
                  <option value="">Choose…</option><option value="none">none</option><option value="validate_request">validate_request only</option><option value="validate_request,load_order">validate_request + load_order</option><option value="validate_request,load_order,calculate_refund">first three nodes</option>
                </select>
              </label>
              <label>Node replayed after resume
                <select name="replayed" required>
                  <option value="">Choose…</option><option value="load_order">load_order</option><option value="calculate_refund">calculate_refund</option><option value="write_ledger">write_ledger</option>
                </select>
              </label>
              <label>Total calculate_refund executions
                <select name="executionCount" required>
                  <option value="">Choose…</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </label>
            </div>
            <button class="ix-btn" type="submit" data-cp-check>Check prediction</button>
            <div class="cp-predict-feedback" data-cp-feedback role="status" aria-live="polite" aria-atomic="true"></div>
          </form>
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
      <p class="cp-note"><strong>Scope:</strong> this simulator uses an embedded synthetic fixture. It does not run LangGraph, contact a provider, open a database, use browser storage, or read credentials.</p>`;

    const controls = Object.fromEntries(
      Array.from(container.querySelectorAll("[data-cp-action]")).map(button => [button.dataset.cpAction, button])
    );
    const graph = container.querySelector(".cp-graph");
    const status = container.querySelector(".cp-status");
    const checkpoint = container.querySelector(".cp-checkpoint");
    const skipped = container.querySelector("[data-cp-skipped]");
    const replayed = container.querySelector("[data-cp-replayed]");
    const log = container.querySelector(".cp-log ol");
    const predictionForm = container.querySelector("[data-cp-predict]");
    const predictionFields = Object.fromEntries(
      Array.from(predictionForm.querySelectorAll("select")).map(field => [field.name, field])
    );
    const predictionButton = predictionForm.querySelector("[data-cp-check]");
    const predictionFeedback = predictionForm.querySelector("[data-cp-feedback]");

    function list(items, emptyText, suffix) {
      if (!items.length) return `<li class="cp-empty">${escapeHTML(emptyText)}</li>`;
      return items.map(item => `<li><code>${escapeHTML(item)}</code>${suffix ? ` ${escapeHTML(suffix)}` : ""}</li>`).join("");
    }

    function statusText(view) {
      if (view.phase === "crashed" && !view.prediction.checked) return "Crash induced. Complete all four recovery predictions to unlock the evidence and Resume.";
      if (view.phase === "crashed") return "Prediction correct. The cp-2 evidence is revealed; resume when ready.";
      if (view.phase === "resumed") return `Resumed at ${view.nextNode.id}. Step once to replay its uncommitted work.`;
      if (view.phase === "complete") return "Run complete. Durable work was skipped and only volatile work replayed.";
      if (view.canCrash) return "Crash boundary reached. Induce the deterministic crash now.";
      return `Ready to run ${view.nextNode ? view.nextNode.id : "the graph"}.`;
    }

    function renderPrediction(view) {
      predictionForm.hidden = view.phase !== "crashed";
      if (predictionForm.hidden) {
        predictionFeedback.innerHTML = "";
        return;
      }
      Object.entries(predictionFields).forEach(([name, field]) => {
        field.value = view.prediction.answers[name] || field.value || "";
      });
      predictionButton.textContent = view.prediction.checked ? "Prediction correct" : (view.prediction.attempts ? "Check again" : "Check prediction");
      predictionButton.disabled = view.prediction.checked;
      predictionFeedback.innerHTML = view.prediction.feedback.length
        ? `<ul>${view.prediction.feedback.map(item =>
          `<li class="is-${escapeHTML(item.status)}"><strong>${escapeHTML(item.field)}:</strong> ${escapeHTML(item.message)}</li>`
        ).join("")}</ul>`
        : "";
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
      const predictionLocked = view.phase === "crashed" && !view.prediction.checked;
      checkpoint.innerHTML = predictionLocked
        ? `<div><dt>Last durable checkpoint</dt><dd>predict first</dd></div>
           <div><dt>Checkpoint boundary</dt><dd><code>locked until correct</code></dd></div>
           <div><dt>Recovery plan</dt><dd><code>not revealed</code></dd></div>`
        : `<div><dt>Last durable checkpoint</dt><dd>${escapeHTML(view.checkpoint ? `cp-${view.checkpoint}` : "none")}</dd></div>
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
      renderPrediction(view);
      container.dispatchEvent(new CustomEvent("w4checkpoint:change", { detail: view }));
    }

    function focusTarget(view) {
      if (view.canCrash) return "crash";
      if (view.phase === "crashed" && !view.prediction.checked) return null;
      if (view.canResume) return "resume";
      if (view.phase === "complete") return "reset";
      return "step";
    }

    function run(action) {
      const result = machine[action]();
      render();
      if (!result.ok) status.querySelector("span").textContent = result.reason;
      if (action === "crash" && result.ok) {
        predictionFields.checkpoint.focus();
      } else {
        const target = controls[focusTarget(result.state)];
        if (target && !target.disabled) target.focus();
      }
      return result;
    }

    controls.step.addEventListener("click", () => run("step"));
    controls.crash.addEventListener("click", () => run("crash"));
    controls.resume.addEventListener("click", () => run("resume"));
    controls.reset.addEventListener("click", () => {
      machine.reset();
      Object.values(predictionFields).forEach(field => { field.value = ""; });
      render();
      controls.step.focus();
    });
    predictionForm.addEventListener("submit", event => {
      event.preventDefault();
      const answers = Object.fromEntries(Object.entries(predictionFields).map(([name, field]) => [name, field.value]));
      const result = machine.submitPrediction(answers);
      render();
      status.querySelector("span").textContent = result.reason;
      if (result.ok) {
        controls.resume.focus();
      } else {
        const firstIssue = result.feedback && result.feedback.find(item => item.status !== "correct");
        if (firstIssue) predictionFields[firstIssue.field].focus();
      }
    });
    container.addEventListener("keydown", event => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      event.preventDefault();
      if (action === "reset") {
        machine.reset();
        Object.values(predictionFields).forEach(field => { field.value = ""; });
        render();
        controls.step.focus();
      } else if (!controls[action].disabled) {
        run(action);
      }
    });

    render();
    return { machine, render };
  }

  const api = { NODES, CRASH_INDEX, PREDICTION_ANSWERS, createMachine, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.W4CheckpointSimulator = api;
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("[data-checkpoint-sim]").forEach(mount);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
