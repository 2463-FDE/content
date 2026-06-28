/* quiz.js — non-punitive formative check, rendered in a modal.
   Launched by #quiz-fab or the lesson's final "Take the check" button.
   Evidence-based: immediate per-item feedback on commit, no pass/fail gate,
   unlimited retries, zero stakes (see research/quiz-pedagogy-brief.md).

   Page defines window.QUIZ (id, title, questions[]) and optionally
   window.FDE_NEXT = { label, href } for the "next" CTA after completion. */
(function () {
  const LSID = "fde_trainee_id";
  const LSRES = "fde_results";

  function getResults() { try { return JSON.parse(localStorage.getItem(LSRES) || "{}"); } catch (e) { return {}; } }
  function record(rec) {
    try { const all = getResults(); all[rec.id] = rec; localStorage.setItem(LSRES, JSON.stringify(all)); } catch (e) {}
    const url = window.FDE_TRACK_URL;
    if (url && navigator.sendBeacon) { try { navigator.sendBeacon(url, new Blob([JSON.stringify(rec)], { type: "application/json" })); } catch (e) {} }
    else if (url) { try { fetch(url, { method: "POST", body: JSON.stringify(rec), headers: { "Content-Type": "application/json" }, keepalive: true }); } catch (e) {} }
  }
  function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

  function render(host, Q) {
    const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
    const trainee = idt ? idt.code : (localStorage.getItem(LSID) || "anon");
    host.innerHTML = "";

    const h = document.createElement("h2"); h.textContent = Q.title || "Check your understanding"; host.appendChild(h);
    const sub = document.createElement("p"); sub.className = "quiz-sub";
    sub.textContent = "Practice, not a grade. Answer each one to lock the idea in — instant feedback, retry as much as you like.";
    host.appendChild(sub);

    const state = Q.questions.map(() => ({ committed: false, correct: null, selfRate: null }));

    function finishCheck() {
      if (!state.every(s => s.committed)) return;
      const firstTry = state.filter(s => s.correct === true || s.selfRate === "got").length;
      const summary = host.querySelector(".quiz-summary");
      summary.innerHTML = `<b>Nice — all done.</b> You locked in ${firstTry}/${Q.questions.length} this pass. ` +
        `No grade here; retry any time to make it stick. <button class="btn-link retry">Try again ↻</button>`;
      summary.classList.add("show");
      summary.querySelector(".retry").addEventListener("click", () => render(host, Q));
      record({
        id: Q.id, trainee, type: "quiz", firstTry, total: Q.questions.length,
        items: state.map((s, i) => ({ q: i, correct: s.correct, selfRate: s.selfRate })),
        ts: new Date().toISOString(), page: location.pathname
      });
      const next = document.querySelector(".modal-next");
      if (next) {
        const n = window.FDE_NEXT || { label: "Back to Program", href: "../../index.html" };
        next.innerHTML = `<span>Concept locked. Move on:</span> <a class="btn" href="${n.href}">${n.label}</a>`;
        next.classList.add("show");
      }
    }

    Q.questions.forEach((q, qi) => {
      const qd = document.createElement("div"); qd.className = "q";
      const stem = document.createElement("div"); stem.className = "stem"; stem.textContent = `${qi + 1}. ${q.stem}`;
      qd.appendChild(stem);

      if (q.type === "open") {
        const ta = document.createElement("textarea"); ta.className = "q-open"; ta.rows = 2;
        ta.placeholder = q.hint || "Write your answer, then reveal the model answer to self-check.";
        qd.appendChild(ta);
        const reveal = document.createElement("button"); reveal.className = "btn-soft"; reveal.type = "button"; reveal.textContent = "Reveal model answer";
        qd.appendChild(reveal);
        const model = document.createElement("div"); model.className = "model-answer"; model.innerHTML = `<div class="ma-k">Model answer</div>${q.model}`;
        const rate = document.createElement("div"); rate.className = "selfrate"; rate.innerHTML = "<span>How did yours compare?</span>";
        [["got", "Nailed it"], ["partly", "Partly"], ["missed", "Missed it"]].forEach(([k, label]) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "sr"; b.textContent = label;
          b.addEventListener("click", () => {
            rate.querySelectorAll(".sr").forEach(x => x.classList.remove("on")); b.classList.add("on");
            state[qi].selfRate = k; state[qi].committed = true; finishCheck();
          });
          rate.appendChild(b);
        });
        qd.appendChild(model); qd.appendChild(rate);
        reveal.addEventListener("click", () => { model.classList.add("show"); rate.classList.add("show"); reveal.style.display = "none"; });
      } else {
        const order = shuffle(q.options.map((o, i) => ({ o, i })));
        order.forEach(({ o, i }) => {
          const b = document.createElement("button"); b.className = "opt"; b.type = "button"; b.textContent = o;
          b.addEventListener("click", () => {
            if (state[qi].committed) return;
            state[qi].committed = true; state[qi].correct = (i === q.answer);
            qd.querySelectorAll(".opt").forEach((x, xi) => {
              x.setAttribute("disabled", "true");
              if (order[xi].i === q.answer) x.classList.add("correct");
            });
            if (!state[qi].correct) b.classList.add("wrong");
            qd.querySelector(".explain").classList.add("show");
            finishCheck();
          });
          qd.appendChild(b);
        });
        const ex = document.createElement("div"); ex.className = "explain";
        ex.innerHTML = `<span class="ex-k">Why</span> ${q.explain || ""}`;
        qd.appendChild(ex);
      }
      host.appendChild(qd);
    });

    const summary = document.createElement("div"); summary.className = "quiz-summary"; host.appendChild(summary);
  }

  // ---- modal control ----
  function setupModal(Q) {
    const overlay = document.getElementById("quiz-modal");
    const host = document.getElementById("quiz");
    if (!overlay || !host) return;
    let rendered = false;
    function open() {
      if (!rendered) { render(host, Q); rendered = true; }
      overlay.hidden = false; document.body.style.overflow = "hidden";
      const card = overlay.querySelector(".modal-card"); if (card) card.scrollTop = 0;
    }
    function close() { overlay.hidden = true; document.body.style.overflow = ""; }
    window.FDE_openQuiz = open; window.FDE_closeQuiz = close;
    const fab = document.getElementById("quiz-fab"); if (fab) fab.addEventListener("click", open);
    const x = overlay.querySelector(".modal-close"); if (x) x.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) close(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.QUIZ) setupModal(window.QUIZ);
  });
})();
