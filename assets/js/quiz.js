/* quiz.js — non-punitive, formative end-of-reading check.
   Evidence-based design (retrieval practice + immediate post-commit feedback,
   zero stakes, unlimited retries). See research/quiz-pedagogy-brief.md.

   Page defines:
   window.QUIZ = {
     id: "w01-d1",
     title: "Check your understanding",
     questions: [
       { type:"mcq", stem, options:[...], answer:<idx>, explain },
       { type:"open", stem, model:"<model answer to self-check against>", hint? }
     ]
   }

   Behavior: each item gives feedback the instant the learner commits it.
   No pass/fail gate. Retry freely. Results (first-try correctness + self-rating)
   stored to localStorage and POSTed to window.FDE_TRACK_URL if set. */
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
    sub.innerHTML = "Practice, not a grade. Answer each one to lock the idea in — you get the answer right away, and you can retry as many times as you like.";
    host.appendChild(sub);

    const state = Q.questions.map(() => ({ committed: false, correct: null, selfRate: null }));

    function finishCheck() {
      if (!state.every(s => s.committed)) return;
      const firstTry = state.filter(s => s.correct === true || s.selfRate === "got").length;
      const summary = host.querySelector(".quiz-summary");
      summary.innerHTML = `<b>Nice — all done.</b> You locked in ${firstTry}/${Q.questions.length} on this pass. ` +
        `This is practice, so there's no grade; retry any time to make it stick. ` +
        `<button class="btn-link retry">Try again ↻</button>`;
      summary.classList.add("show");
      summary.querySelector(".retry").addEventListener("click", () => render(host, Q));
      record({
        id: Q.id, trainee, type: "quiz", firstTry, total: Q.questions.length,
        items: state.map((s, i) => ({ q: i, correct: s.correct, selfRate: s.selfRate })),
        ts: new Date().toISOString(), page: location.pathname
      });
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
        const rate = document.createElement("div"); rate.className = "selfrate";
        rate.innerHTML = "<span>How did yours compare?</span>";
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
              const optIdx = order[xi].i;
              if (optIdx === q.answer) x.classList.add("correct");
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

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("quiz");
    if (host && window.QUIZ) render(host, window.QUIZ);
  });
})();
