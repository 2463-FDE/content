/* quiz.js — end-of-reading comprehension check (2-5 Qs).
   Answered on-page, shows success, tracks per-individual.

   Page defines:
   window.QUIZ = {
     id: "w01-d1",            // unique per reading
     title: "Check your understanding",
     pass: 0.7,               // fraction to pass
     questions: [ { stem, options:[...], answer: <idx>, explain } ]
   }

   Tracking: localStorage now; recordCompletion() is the seam to a central
   backend (e.g. CF Worker + D1). Set window.FDE_TRACK_URL to enable POST. */
(function () {
  const LSID = "fde_trainee_id";
  const LSRES = "fde_results";

  function getResults() { try { return JSON.parse(localStorage.getItem(LSRES) || "{}"); } catch (e) { return {}; } }
  function saveResult(rec) {
    const all = getResults();
    const prev = all[rec.id];
    if (!prev || rec.score > prev.score) all[rec.id] = rec;
    localStorage.setItem(LSRES, JSON.stringify(all));
  }

  // seam to central tracking — non-blocking, fails silent on a static host
  function recordCompletion(rec) {
    saveResult(rec);
    const url = window.FDE_TRACK_URL;
    if (url && navigator.sendBeacon) {
      try { navigator.sendBeacon(url, new Blob([JSON.stringify(rec)], { type: "application/json" })); } catch (e) {}
    } else if (url) {
      try { fetch(url, { method: "POST", body: JSON.stringify(rec), headers: { "Content-Type": "application/json" }, keepalive: true }); } catch (e) {}
    }
  }

  function render(host, Q) {
    const traineeId = localStorage.getItem(LSID) || "";
    const prior = getResults()[Q.id];
    host.innerHTML = "";

    const h = document.createElement("h2");
    h.textContent = Q.title || "Check your understanding";
    host.appendChild(h);

    const sub = document.createElement("p");
    sub.style.color = "var(--ink-soft)"; sub.style.marginTop = "-6px";
    sub.textContent = `Answer all ${Q.questions.length} to show you've got the concept.` +
      (prior ? `  Your best so far: ${Math.round(prior.score * 100)}%.` : "");
    host.appendChild(sub);

    // identity gate
    const gate = document.createElement("div");
    gate.className = "idgate";
    gate.innerHTML = '<label>Your trainee ID / GitHub handle:</label>';
    const idInput = document.createElement("input");
    idInput.type = "text"; idInput.placeholder = "e.g. jsmith"; idInput.value = traineeId;
    idInput.addEventListener("change", () => localStorage.setItem(LSID, idInput.value.trim()));
    gate.appendChild(idInput);
    host.appendChild(gate);

    const chosen = new Array(Q.questions.length).fill(-1);
    let submitted = false;

    Q.questions.forEach((q, qi) => {
      const qd = document.createElement("div"); qd.className = "q";
      const stem = document.createElement("div"); stem.className = "stem";
      stem.textContent = `${qi + 1}. ${q.stem}`;
      qd.appendChild(stem);
      q.options.forEach((opt, oi) => {
        const b = document.createElement("button");
        b.className = "opt"; b.type = "button"; b.textContent = opt;
        b.addEventListener("click", () => {
          if (submitted) return;
          chosen[qi] = oi;
          Array.from(qd.querySelectorAll(".opt")).forEach(x => x.classList.remove("chosen"));
          b.classList.add("chosen");
          updateBtn();
        });
        qd.appendChild(b);
      });
      const ex = document.createElement("div"); ex.className = "explain"; ex.textContent = q.explain || "";
      qd.appendChild(ex);
      host.appendChild(qd);
    });

    const actions = document.createElement("div"); actions.className = "actions";
    const btn = document.createElement("button"); btn.className = "btn"; btn.textContent = "Submit answers"; btn.disabled = true;
    const score = document.createElement("span"); score.className = "scorebox";
    actions.appendChild(btn); actions.appendChild(score);
    host.appendChild(actions);

    function updateBtn() { btn.disabled = chosen.includes(-1) || !idInput.value.trim(); }
    idInput.addEventListener("input", updateBtn);

    btn.addEventListener("click", () => {
      if (submitted) return;
      submitted = true;
      let correct = 0;
      const qs = host.querySelectorAll(".q");
      Q.questions.forEach((q, qi) => {
        const opts = qs[qi].querySelectorAll(".opt");
        opts.forEach((o, oi) => {
          o.setAttribute("disabled", "true");
          if (oi === q.answer) o.classList.add("correct");
          else if (oi === chosen[qi]) o.classList.add("wrong");
        });
        qs[qi].querySelector(".explain").classList.add("show");
        if (chosen[qi] === q.answer) correct++;
      });
      const frac = correct / Q.questions.length;
      const pass = frac >= (Q.pass || 0.7);
      score.textContent = `${correct}/${Q.questions.length} correct — ${pass ? "passed ✓" : "review & retry"}`;
      score.classList.add(pass ? "pass" : "fail");
      btn.textContent = pass ? "Completed" : "Try again";
      btn.disabled = false;
      const rec = {
        id: Q.id, trainee: idInput.value.trim(), score: frac, correct,
        total: Q.questions.length, pass, ts: new Date().toISOString(),
        page: location.pathname
      };
      recordCompletion(rec);
      if (!pass) {
        btn.textContent = "Retry";
        btn.onclick = () => render(host, Q);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("quiz");
    if (host && window.QUIZ) render(host, window.QUIZ);
  });
})();
