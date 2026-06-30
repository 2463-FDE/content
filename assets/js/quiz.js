/* quiz.js — end-of-reading comprehension check.
   Non-punitive: each question grades + reveals the answer IMMEDIATELY on answer,
   and the check AUTO-COMPLETES the moment the last question is answered — no
   Submit button. (mcq "select all" is the one exception: it needs a small per-
   question "Check answer" button, since multi-select can't grade on one click.)
   Completing unlocks the next-reading nav (enforces order so we can track who did
   what) and fires `fde-quiz-done`. Tester/trainer roles bypass the gate.

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
        ? "You've already completed this check — it counts toward your day. Answer again any time to retry."
        : "Answer each question to see the correct answer and why, right away. The check completes itself once you've answered them all — no submit button.";
    host.appendChild(sub);

    const state = Q.questions.map(() => ({ done: false, correct: null }));
    let finalized = false;

    // Progress hint only — no Submit button. Each question grades on answer, and
    // the check auto-completes (records + unlocks the next-reading nav + fires
    // fde-quiz-done) the moment the last question is answered.
    const bar = document.createElement("div"); bar.className = "quiz-submitbar";
    const hint = document.createElement("span"); hint.className = "qs-hint";
    bar.appendChild(hint);
    const summary = document.createElement("div"); summary.className = "quiz-summary";

    function finalize() {
      finalized = true;
      const total = Q.questions.length;
      const got = state.filter(s => s.correct === true).length;
      bar.style.display = "none";
      summary.innerHTML = `<b>Check complete.</b> ${got}/${total} on this pass — practice, so retry any time. ` +
        `<button class="btn-link retry">Try again ↻</button>`;
      summary.classList.add("show");
      summary.querySelector(".retry").addEventListener("click", () => render(host, Q));
      record({ id: Q.id, trainee, type: "quiz", got, total, items: state.map(s => s.correct), ts: new Date().toISOString(), page: location.pathname });
      setNextGate(true);
      if (!h.querySelector(".done-check")) h.appendChild(doneBadge());
      markLauncherDone();
      try { window.dispatchEvent(new CustomEvent("fde-quiz-done", { detail: { page: location.pathname } })); } catch (e) {}
    }
    // Called by each question once it's been answered+graded.
    function onAnswered() {
      const n = state.filter(s => s.done).length, total = Q.questions.length;
      hint.textContent = n < total ? `${n}/${total} answered` : "";
      if (n === total && !finalized) finalize();
    }

    Q.questions.forEach((q, qi) => host.appendChild(buildQ(q, qi, state, onAnswered)));
    host.appendChild(bar);
    host.appendChild(summary);
    onAnswered();

    // gate state on load
    setNextGate(bypass || already);
  }

  // Build one question that grades IMMEDIATELY on answer — reveals the correct
  // answer + explanation and locks the choices — then calls done() so render()
  // can auto-complete the check once every question has been answered.
  function buildQ(q, qi, state, done) {
    const qd = document.createElement("div"); qd.className = "q q-" + (q.type || "scq");
    const stem = document.createElement("div"); stem.className = "stem";
    const kind = { scq: "Choose one", mcq: "Select all that apply", tf: "True or false", match: "Match each pair", open: "Write & self-check" }[q.type] || "";
    stem.innerHTML = `<span class="q-kind">${kind}</span>${qi + 1}. ${q.stem}`;
    qd.appendChild(stem);
    let graded = false; // one-shot per question; retry is whole-quiz via "Try again"

    if (q.type === "open") {
      const ta = document.createElement("textarea"); ta.className = "q-open"; ta.rows = 2; ta.placeholder = q.hint || "Write your answer, then reveal the model answer.";
      const rev = document.createElement("button"); rev.className = "btn-soft"; rev.type = "button"; rev.textContent = "Reveal model answer";
      const model = document.createElement("div"); model.className = "model-answer"; model.innerHTML = `<div class="ma-k">Model answer</div>${q.model || ""}`;
      const rate = document.createElement("div"); rate.className = "selfrate"; rate.innerHTML = "<span>How did yours compare?</span>";
      [["got", "Nailed it"], ["partly", "Partly"], ["missed", "Missed it"]].forEach(([k, l]) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "sr"; b.textContent = l;
        b.addEventListener("click", () => {
          rate.querySelectorAll(".sr").forEach(x => x.classList.remove("on")); b.classList.add("on");
          state[qi] = { done: true, correct: k === "got" }; graded = true; done();
        });
        rate.appendChild(b);
      });
      rev.addEventListener("click", () => { model.classList.add("show"); rate.classList.add("show"); rev.style.display = "none"; ta.disabled = true; });
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
      const ex = explainEl(q);
      // Grade automatically the moment every pair has a selection.
      wrap.querySelectorAll("select").forEach(s => s.addEventListener("change", () => {
        if (graded) return;
        const sels = Array.from(wrap.querySelectorAll("select"));
        if (!sels.every(x => x.value)) return;
        graded = true; let ok = true;
        sels.forEach(s2 => { const i = +s2.dataset.i; s2.disabled = true; const right = s2.value === q.pairs[i].r; s2.classList.add(right ? "correct" : "wrong"); if (!right) ok = false; });
        ex.classList.add("show"); state[qi] = { done: true, correct: ok }; done();
      }));
      qd.append(wrap, ex);
      return qd;
    }

    if (q.type === "mcq") {
      // Multi-select can't grade on a single click, so it gets one small "Check
      // answer" button — the only per-question click in the whole quiz.
      const order = shuffle(q.options.map((o, i) => ({ o, i })));
      const opts = [];
      const ans = new Set(q.answer);
      const ex = explainEl(q);
      const check = document.createElement("button"); check.className = "btn-soft q-check"; check.type = "button"; check.textContent = "Check answer"; check.disabled = true;
      order.forEach(({ o, i }) => {
        const b = document.createElement("button"); b.className = "opt opt-multi"; b.type = "button"; b.textContent = o; b.dataset.i = i;
        b.addEventListener("click", () => {
          if (graded) return;
          b.classList.toggle("chosen");
          check.disabled = !opts.some(x => x.classList.contains("chosen"));
        });
        opts.push(b); qd.appendChild(b);
      });
      check.addEventListener("click", () => {
        if (graded) return; graded = true;
        let ok = true;
        opts.forEach(b => {
          b.setAttribute("disabled", "true");
          const i = +b.dataset.i, chosen = b.classList.contains("chosen"), correct = ans.has(i);
          b.classList.remove("chosen");
          if (correct) b.classList.add("correct");
          if (chosen && !correct) { b.classList.add("wrong"); ok = false; }
          if (!chosen && correct) ok = false;
        });
        check.style.display = "none"; ex.classList.add("show");
        state[qi] = { done: true, correct: ok }; done();
      });
      qd.appendChild(check); qd.appendChild(ex);
      return qd;
    }

    // scq + tf — single decisive answer: grade the instant they pick.
    let options, answerIdx;
    if (q.type === "tf") { options = ["True", "False"]; answerIdx = q.answer ? 0 : 1; }
    else { options = q.options; answerIdx = q.answer; }
    const order = shuffle(options.map((o, i) => ({ o, i })));
    const ex = explainEl(q);
    const btns = [];
    order.forEach(({ o, i }) => {
      const b = document.createElement("button"); b.className = "opt" + (q.type === "tf" ? " opt-tf" : ""); b.type = "button"; b.textContent = o; b.dataset.i = i;
      b.addEventListener("click", () => {
        if (graded) return; graded = true;
        const selIdx = i;
        btns.forEach(x => {
          x.setAttribute("disabled", "true"); x.classList.remove("chosen");
          if (+x.dataset.i === answerIdx) x.classList.add("correct");
          if (+x.dataset.i === selIdx && selIdx !== answerIdx) x.classList.add("wrong");
        });
        ex.classList.add("show");
        state[qi] = { done: true, correct: selIdx === answerIdx };
        done();
      });
      btns.push(b); qd.appendChild(b);
    });
    qd.appendChild(ex);
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
