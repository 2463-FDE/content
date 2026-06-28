/* quiz.js — end-of-reading comprehension check.
   Non-punitive (immediate feedback, retry, no score gate) BUT a COMPLETION
   gate: you must work through every question to unlock the "next" nav — this
   enforces order so we can track who did what in sequence. Tester/trainer
   roles bypass the gate (free navigation for review).

   Question types:
     scq   {type:"scq",  stem, options[], answer:<idx>, explain}
     mcq   {type:"mcq",  stem, options[], answer:[idx,...], explain}   // multi-select
     tf    {type:"tf",   stem, answer:true|false, explain}
     match {type:"match",stem, pairs:[{l,r},...], explain}
     open  {type:"open", stem, hint?, model}
   window.QUIZ = { id, title, questions:[...] }
   window.FDE_NEXT = { label, href }  drives the gated next link. */
(function () {
  const LSID = "fde_trainee_id", LSRES = "fde_results";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  function getResults() { try { return JSON.parse(localStorage.getItem(LSRES) || "{}"); } catch (e) { return {}; } }
  function record(rec) {
    try { const all = getResults(); all[rec.id] = rec; localStorage.setItem(LSRES, JSON.stringify(all)); } catch (e) {}
    const url = window.FDE_TRACK_URL;
    if (url && navigator.sendBeacon) { try { navigator.sendBeacon(url, new Blob([JSON.stringify(rec)], { type: "application/json" })); } catch (e) {} }
    else if (url) { try { fetch(url, { method: "POST", body: JSON.stringify(rec), headers: { "Content-Type": "application/json" }, keepalive: true }); } catch (e) {} }
  }

  // ---- gated "next" nav ----
  function setNextGate(unlocked) {
    const n = window.FDE_NEXT || {};
    const link = document.querySelector(".snav-next");
    if (link) {
      if (unlocked && n.href) {
        link.classList.remove("locked");
        link.setAttribute("href", n.href);
        link.textContent = n.label || "Next ▸";
      } else {
        link.classList.add("locked");
        link.removeAttribute("href");
        link.textContent = "🔒 Finish the check";
      }
    }
    const mn = document.querySelector(".modal-next");
    if (mn && unlocked && n.href) {
      mn.innerHTML = `<span>Concept locked. Continue:</span> <a class="btn" href="${n.href}">${n.label || "Next ▸"}</a>`;
      mn.classList.add("show");
    }
  }

  function render(host, Q) {
    const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
    const trainee = idt ? idt.code : (localStorage.getItem(LSID) || "anon");
    const bypass = idt && (idt.role === "tester" || idt.role === "trainer");
    const already = !!getResults()[Q.id];
    host.innerHTML = "";

    const h = document.createElement("h2"); h.textContent = Q.title || "Check your understanding"; host.appendChild(h);
    const sub = document.createElement("p"); sub.className = "quiz-sub";
    sub.innerHTML = bypass
      ? "Practice check. (You're in tester/trainer view — navigation is unlocked.)"
      : "Work through all of these to unlock the next reading. Instant feedback, retry freely — it's practice, not a grade.";
    host.appendChild(sub);

    const state = Q.questions.map(() => ({ done: false, correct: null }));
    function refresh() {
      const allDone = state.every(s => s.done);
      const summary = host.querySelector(".quiz-summary");
      if (allDone) {
        const got = state.filter(s => s.correct === true).length;
        summary.innerHTML = `<b>Check complete.</b> ${got}/${Q.questions.length} on this pass — practice, so retry any time. ` +
          `<button class="btn-link retry">Try again ↻</button>`;
        summary.classList.add("show");
        summary.querySelector(".retry").addEventListener("click", () => render(host, Q));
        record({ id: Q.id, trainee, type: "quiz", got, total: Q.questions.length, items: state.map(s => s.correct), ts: new Date().toISOString(), page: location.pathname });
        setNextGate(true);
      }
    }

    Q.questions.forEach((q, qi) => host.appendChild(buildQ(q, qi, state, refresh)));
    const summary = document.createElement("div"); summary.className = "quiz-summary"; host.appendChild(summary);

    // gate state on load
    setNextGate(bypass || already);
  }

  function buildQ(q, qi, state, refresh) {
    const qd = document.createElement("div"); qd.className = "q q-" + (q.type || "scq");
    const stem = document.createElement("div"); stem.className = "stem";
    const kind = { scq: "Choose one", mcq: "Select all that apply", tf: "True or false", match: "Match each pair", open: "Write & self-check" }[q.type] || "";
    stem.innerHTML = `<span class="q-kind">${kind}</span>${qi + 1}. ${q.stem}`;
    qd.appendChild(stem);
    const explain = () => { const e = document.createElement("div"); e.className = "explain"; e.innerHTML = `<span class="ex-k">Why</span> ${q.explain || ""}`; return e; };

    if (q.type === "open") {
      const ta = document.createElement("textarea"); ta.className = "q-open"; ta.rows = 2; ta.placeholder = q.hint || "Write your answer, then reveal the model answer.";
      const rev = document.createElement("button"); rev.className = "btn-soft"; rev.type = "button"; rev.textContent = "Reveal model answer";
      const model = document.createElement("div"); model.className = "model-answer"; model.innerHTML = `<div class="ma-k">Model answer</div>${q.model || ""}`;
      const rate = document.createElement("div"); rate.className = "selfrate"; rate.innerHTML = "<span>How did yours compare?</span>";
      [["got", "Nailed it"], ["partly", "Partly"], ["missed", "Missed it"]].forEach(([k, l]) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "sr"; b.textContent = l;
        b.addEventListener("click", () => { rate.querySelectorAll(".sr").forEach(x => x.classList.remove("on")); b.classList.add("on"); state[qi] = { done: true, correct: k === "got" }; refresh(); });
        rate.appendChild(b);
      });
      rev.addEventListener("click", () => { model.classList.add("show"); rate.classList.add("show"); rev.style.display = "none"; });
      qd.append(ta, rev, model, rate);
      return qd;
    }

    if (q.type === "match") {
      const rights = shuffle(q.pairs.map(p => p.r));
      const wrap = document.createElement("div"); wrap.className = "q-match";
      q.pairs.forEach((p, i) => {
        const row = document.createElement("div"); row.className = "match-row";
        const sel = `<select data-i="${i}"><option value="">— choose —</option>${rights.map(r => `<option>${esc(r)}</option>`).join("")}</select>`;
        row.innerHTML = `<span class="match-l">${esc(p.l)}</span>${sel}`;
        wrap.appendChild(row);
      });
      const btn = document.createElement("button"); btn.className = "btn"; btn.type = "button"; btn.textContent = "Check matches";
      const ex = explain();
      btn.addEventListener("click", () => {
        let ok = true;
        wrap.querySelectorAll("select").forEach(s => {
          const i = +s.dataset.i; s.disabled = true;
          const right = s.value === q.pairs[i].r;
          s.classList.add(right ? "correct" : "wrong"); if (!right) ok = false;
        });
        btn.disabled = true; ex.classList.add("show");
        state[qi] = { done: true, correct: ok }; refresh();
      });
      qd.append(wrap, btn, ex);
      return qd;
    }

    if (q.type === "mcq") {
      const order = shuffle(q.options.map((o, i) => ({ o, i })));
      const opts = [];
      order.forEach(({ o, i }) => {
        const b = document.createElement("button"); b.className = "opt opt-multi"; b.type = "button"; b.textContent = o; b.dataset.i = i;
        b.addEventListener("click", () => { if (b.hasAttribute("disabled")) return; b.classList.toggle("chosen"); });
        opts.push(b); qd.appendChild(b);
      });
      const btn = document.createElement("button"); btn.className = "btn"; btn.type = "button"; btn.textContent = "Check answer";
      const ex = explain();
      const ans = new Set(q.answer);
      btn.addEventListener("click", () => {
        let ok = true;
        opts.forEach(b => {
          b.setAttribute("disabled", "true");
          const i = +b.dataset.i, chosen = b.classList.contains("chosen"), correct = ans.has(i);
          if (correct) b.classList.add("correct");
          if (chosen && !correct) { b.classList.add("wrong"); ok = false; }
          if (!chosen && correct) ok = false;
        });
        btn.disabled = true; ex.classList.add("show");
        state[qi] = { done: true, correct: ok }; refresh();
      });
      qd.append(btn, ex);
      return qd;
    }

    // scq + tf (single commit on click)
    let options, answerIdx;
    if (q.type === "tf") { options = ["True", "False"]; answerIdx = q.answer ? 0 : 1; }
    else { options = q.options; answerIdx = q.answer; }
    const order = shuffle(options.map((o, i) => ({ o, i })));
    const ex = explain();
    order.forEach(({ o, i }) => {
      const b = document.createElement("button"); b.className = "opt" + (q.type === "tf" ? " opt-tf" : ""); b.type = "button"; b.textContent = o;
      b.addEventListener("click", () => {
        if (state[qi].done) return;
        qd.querySelectorAll(".opt").forEach((x, xi) => { x.setAttribute("disabled", "true"); if (order[xi].i === answerIdx) x.classList.add("correct"); });
        const correct = i === answerIdx; if (!correct) b.classList.add("wrong");
        ex.classList.add("show");
        state[qi] = { done: true, correct }; refresh();
      });
      qd.appendChild(b);
    });
    qd.appendChild(ex);
    return qd;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("quiz");
    if (host && window.QUIZ) render(host, window.QUIZ);
  });
})();
