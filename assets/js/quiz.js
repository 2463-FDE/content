/* quiz.js — end-of-reading comprehension check.
   Non-punitive: answer every question, then SUBMIT ONCE at the bottom for
   feedback. No per-question "check" clicks. Still a COMPLETION gate: submitting
   unlocks the next-reading nav (enforces order so we can track who did what).
   Tester/trainer roles bypass the gate (free navigation for review).

   Question types:
     scq   {type:"scq",  stem, options[], answer:<idx>, explain}
     mcq   {type:"mcq",  stem, options[], answer:[idx,...], explain}   // multi-select
     tf    {type:"tf",   stem, answer:true|false, explain}
     match {type:"match",stem, pairs:[{l,r},...], explain}
     open  {type:"open", stem, hint?, model}                          // self-graded
   window.QUIZ = { id, title, questions:[...] }
   window.FDE_NEXT = { label, href }  drives the gated next link. */
(function () {
  const LSID = "fde_trainee_id", LSRES = "fde_results";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  function getResults() { try { return JSON.parse(localStorage.getItem(LSRES) || "{}"); } catch (e) { return {}; } }
  function doneBadge() { const s = document.createElement("span"); s.className = "done-check"; s.textContent = "✓ Completed"; return s; }
  function record(rec) {
    // Key by PAGE, not by Q.id. Quiz ids are reused across days ("task" is on
    // d1, d2a, w02d1, w02d2; "ex" on d3a/d4a/d4b), so id-keying let a later
    // same-id quiz overwrite an earlier day's record — flipping its `page` and
    // breaking that day's completion gate (day-summary quizDone() matches by
    // page). Page is unique per reading, so every day keeps its own record. (BUG 1)
    try { const all = getResults(); all[rec.page] = rec; localStorage.setItem(LSRES, JSON.stringify(all)); } catch (e) {}
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

  // ---- mark the quiz launcher activity-card as completed ----
  function markLauncherDone() {
    document.querySelectorAll('.activity-card[data-modal="quiz-modal"]').forEach(function (card) {
      if (card.classList.contains("is-done")) return;
      card.classList.add("is-done");
      const k = card.querySelector(".ac-k");
      if (k && !k.querySelector(".ac-done")) {
        const b = document.createElement("span"); b.className = "ac-done"; b.textContent = "✓ Done";
        k.appendChild(b);
      }
    });
  }

  function explainEl(q) {
    const e = document.createElement("div"); e.className = "explain";
    e.innerHTML = `<span class="ex-k">Why</span> ${q.explain || ""}`;
    return e;
  }

  function render(host, Q) {
    const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
    const trainee = idt ? idt.code : (localStorage.getItem(LSID) || "anon");
    const bypass = idt && (idt.role === "tester" || idt.role === "trainer");
    const already = !!getResults()[location.pathname]; // page-keyed, matches record() + quizDone()
    host.innerHTML = "";

    const h = document.createElement("h2"); h.textContent = Q.title || "Check your understanding";
    if (already) { h.appendChild(doneBadge()); markLauncherDone(); }
    host.appendChild(h);
    const sub = document.createElement("p"); sub.className = "quiz-sub";
    sub.innerHTML = bypass
      ? "Practice check. (You're in tester/trainer view — navigation is unlocked.)"
      : already
        ? "You've already completed this check — it counts toward your day. Answer and resubmit any time to retry."
        : "Answer all the questions, then hit Submit once at the bottom. Instant feedback, retry freely — it's practice, not a grade.";
    host.appendChild(sub);

    const state = Q.questions.map(() => ({ done: false, correct: null }));
    const commits = [];

    // bottom submit bar (declared first so buildQ callbacks can refresh it)
    const bar = document.createElement("div"); bar.className = "quiz-submitbar";
    const submit = document.createElement("button"); submit.className = "btn"; submit.type = "button"; submit.textContent = "Submit answers"; submit.disabled = true;
    const hint = document.createElement("span"); hint.className = "qs-hint";
    function refreshBar() {
      const n = state.filter(s => s.done).length, total = Q.questions.length;
      submit.disabled = n < total;
      hint.textContent = n < total ? `${n}/${total} answered` : "All answered — submit when ready.";
    }

    Q.questions.forEach((q, qi) => host.appendChild(buildQ(q, qi, state, commits, refreshBar)));

    bar.appendChild(submit); bar.appendChild(hint);
    host.appendChild(bar);
    const summary = document.createElement("div"); summary.className = "quiz-summary"; host.appendChild(summary);
    refreshBar();

    submit.addEventListener("click", () => {
      let got = 0;
      commits.forEach(c => { if (c()) got++; });
      submit.style.display = "none"; hint.style.display = "none";
      summary.innerHTML = `<b>Check complete.</b> ${got}/${Q.questions.length} on this pass — practice, so retry any time. ` +
        `<button class="btn-link retry">Try again ↻</button>`;
      summary.classList.add("show");
      summary.querySelector(".retry").addEventListener("click", () => render(host, Q));
      record({ id: Q.id, trainee, type: "quiz", got, total: Q.questions.length, items: state.map(s => s.correct), ts: new Date().toISOString(), page: location.pathname });
      setNextGate(true);
      if (!h.querySelector(".done-check")) h.appendChild(doneBadge());
      markLauncherDone();
      try { window.dispatchEvent(new CustomEvent("fde-quiz-done", { detail: { page: location.pathname } })); } catch (e) {}
    });

    // gate state on load
    setNextGate(bypass || already);
  }

  // Build one question in ANSWER mode (no grading yet). Registers commits[qi],
  // a function that grades the question, reveals feedback, and returns correctness.
  function buildQ(q, qi, state, commits, refresh) {
    const qd = document.createElement("div"); qd.className = "q q-" + (q.type || "scq");
    const stem = document.createElement("div"); stem.className = "stem";
    const kind = { scq: "Choose one", mcq: "Select all that apply", tf: "True or false", match: "Match each pair", open: "Write & self-check" }[q.type] || "";
    stem.innerHTML = `<span class="q-kind">${kind}</span>${qi + 1}. ${q.stem}`;
    qd.appendChild(stem);

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
      const reveal = () => { model.classList.add("show"); rate.classList.add("show"); rev.style.display = "none"; };
      rev.addEventListener("click", reveal);
      qd.append(ta, rev, model, rate);
      commits[qi] = () => { reveal(); ta.disabled = true; rate.querySelectorAll(".sr").forEach(b => b.disabled = true); return state[qi].correct === true; };
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
      const ex = explainEl(q);
      wrap.querySelectorAll("select").forEach(s => s.addEventListener("change", () => {
        const all = Array.from(wrap.querySelectorAll("select")).every(x => x.value);
        state[qi] = { done: all, correct: null }; refresh();
      }));
      qd.append(wrap, ex);
      commits[qi] = () => {
        let ok = true;
        wrap.querySelectorAll("select").forEach(s => {
          const i = +s.dataset.i; s.disabled = true;
          const right = s.value === q.pairs[i].r;
          s.classList.add(right ? "correct" : "wrong"); if (!right) ok = false;
        });
        ex.classList.add("show"); state[qi].correct = ok; return ok;
      };
      return qd;
    }

    if (q.type === "mcq") {
      const order = shuffle(q.options.map((o, i) => ({ o, i })));
      const opts = [];
      order.forEach(({ o, i }) => {
        const b = document.createElement("button"); b.className = "opt opt-multi"; b.type = "button"; b.textContent = o; b.dataset.i = i;
        b.addEventListener("click", () => {
          if (b.hasAttribute("disabled")) return;
          b.classList.toggle("chosen");
          const any = opts.some(x => x.classList.contains("chosen"));
          state[qi] = { done: any, correct: null }; refresh();
        });
        opts.push(b); qd.appendChild(b);
      });
      const ex = explainEl(q);
      const ans = new Set(q.answer);
      qd.appendChild(ex);
      commits[qi] = () => {
        let ok = true;
        opts.forEach(b => {
          b.setAttribute("disabled", "true");
          const i = +b.dataset.i, chosen = b.classList.contains("chosen"), correct = ans.has(i);
          b.classList.remove("chosen");
          if (correct) b.classList.add("correct");
          if (chosen && !correct) { b.classList.add("wrong"); ok = false; }
          if (!chosen && correct) ok = false;
        });
        ex.classList.add("show"); state[qi].correct = ok; return ok;
      };
      return qd;
    }

    // scq + tf — single-select, no commit-on-click; selection is changeable until submit
    let options, answerIdx;
    if (q.type === "tf") { options = ["True", "False"]; answerIdx = q.answer ? 0 : 1; }
    else { options = q.options; answerIdx = q.answer; }
    const order = shuffle(options.map((o, i) => ({ o, i })));
    const ex = explainEl(q);
    const btns = [];
    let selIdx = null;
    order.forEach(({ o, i }) => {
      const b = document.createElement("button"); b.className = "opt" + (q.type === "tf" ? " opt-tf" : ""); b.type = "button"; b.textContent = o; b.dataset.i = i;
      b.addEventListener("click", () => {
        if (b.hasAttribute("disabled")) return;
        btns.forEach(x => x.classList.remove("chosen"));
        b.classList.add("chosen"); selIdx = i;
        state[qi] = { done: true, correct: null }; refresh();
      });
      btns.push(b); qd.appendChild(b);
    });
    qd.appendChild(ex);
    commits[qi] = () => {
      btns.forEach(x => {
        x.setAttribute("disabled", "true");
        x.classList.remove("chosen");
        if (+x.dataset.i === answerIdx) x.classList.add("correct");
        if (+x.dataset.i === selIdx && selIdx !== answerIdx) x.classList.add("wrong");
      });
      ex.classList.add("show");
      const correct = selIdx === answerIdx; state[qi].correct = correct; return correct;
    };
    return qd;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("quiz");
    if (host && window.QUIZ) {
      render(host, window.QUIZ);
      // keep the quiz launcher card's question count in sync with the spec
      const n = window.QUIZ.questions.length;
      document.querySelectorAll(".quiz-count").forEach(e => e.textContent = n);
      const card = document.querySelector('.activity-card[data-modal="quiz-modal"] .ac-t');
      if (card && /\d/.test(card.textContent)) card.textContent = card.textContent.replace(/\d+/, n);
    }
  });
})();
