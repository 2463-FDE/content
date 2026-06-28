/* survey.js — weekly time-on-task + experience survey.
   Page defines window.SURVEY = {
     week: "01", title, topics: [ "Day 1 — ...", ... ]  // rows to time
   }
   Captures per-topic minutes + difficulty + confidence, plus weekly questions
   incl. whether the $20 Claude Pro quota was a limiter. Stores to localStorage
   and POSTs to window.FDE_TRACK_URL if set. */
(function () {
  const LSID = "fde_trainee_id";
  const LSKEY = "fde_surveys";

  function post(rec) {
    try { const all = JSON.parse(localStorage.getItem(LSKEY) || "{}"); all[rec.id] = rec; localStorage.setItem(LSKEY, JSON.stringify(all)); } catch (e) {}
    const url = window.FDE_TRACK_URL;
    if (url && navigator.sendBeacon) { try { navigator.sendBeacon(url, new Blob([JSON.stringify(rec)], { type: "application/json" })); } catch (e) {} }
    else if (url) { try { fetch(url, { method: "POST", body: JSON.stringify(rec), headers: { "Content-Type": "application/json" }, keepalive: true }); } catch (e) {} }
  }

  function scale(name, lo, hi) {
    const wrap = document.createElement("div"); wrap.className = "sv-scale";
    for (let i = 1; i <= 5; i++) {
      const id = name + i;
      const l = document.createElement("label");
      l.innerHTML = `<input type="radio" name="${name}" value="${i}"><span>${i}</span>`;
      wrap.appendChild(l);
    }
    const cap = document.createElement("div"); cap.className = "sv-cap"; cap.innerHTML = `<span>${lo}</span><span>${hi}</span>`;
    const box = document.createElement("div"); box.appendChild(wrap); box.appendChild(cap);
    return box;
  }

  function render(host, S) {
    host.innerHTML = "";
    const h = document.createElement("h2"); h.textContent = S.title || `Week ${S.week} — How did it go?`; host.appendChild(h);
    const p = document.createElement("p"); p.style.color = "var(--ink-soft)"; p.style.marginTop = "-6px";
    p.textContent = "Two minutes. Honest numbers help us keep the week sane — especially the quota question."; host.appendChild(p);

    const idt = window.FDE_getIdentity ? window.FDE_getIdentity() : null;
    const gate = document.createElement("div"); gate.className = "idgate";
    gate.innerHTML = "<label>Trainee ID / GitHub handle:</label>";
    const idIn = document.createElement("input"); idIn.type = "text"; idIn.value = idt ? idt.code : (localStorage.getItem(LSID) || ""); idIn.placeholder = "e.g. jsmith";
    gate.appendChild(idIn); host.appendChild(gate);
    if (idt) gate.style.display = "none";  // identity already set via login

    // per-topic time rows
    const tbl = document.createElement("div"); tbl.className = "sv-table";
    const head = document.createElement("div"); head.className = "sv-row sv-head";
    head.innerHTML = "<div>Reading / activity</div><div>Minutes</div><div>Difficulty (1 easy–5 hard)</div><div>Confidence after (1–5)</div>";
    tbl.appendChild(head);
    S.topics.forEach((t, i) => {
      const r = document.createElement("div"); r.className = "sv-row";
      const name = document.createElement("div"); name.textContent = t;
      const mins = document.createElement("input"); mins.type = "number"; mins.min = 0; mins.placeholder = "min"; mins.dataset.k = "min" + i;
      const d = scale("diff" + i, "easy", "hard");
      const c = scale("conf" + i, "lost", "solid");
      r.appendChild(name); r.appendChild(mins); r.appendChild(d); r.appendChild(c);
      tbl.appendChild(r);
    });
    host.appendChild(tbl);

    // weekly questions
    const wk = document.createElement("div"); wk.className = "sv-week";
    wk.innerHTML =
      '<div class="sv-q"><label>Total hours on the program this week</label><input type="number" min="0" step="0.5" data-k="hours" placeholder="e.g. 38"></div>' +
      '<div class="sv-q"><label>Overall pace</label>' +
        '<select data-k="pace"><option value="">—</option><option>Too slow / not enough to do</option><option>About right</option><option>Too much / overwhelming</option></select></div>' +
      '<div class="sv-q"><label>Did the <b>$20 Claude Pro</b> usage limit ever block your work this week?</label>' +
        '<select data-k="quota"><option value="">—</option><option>Never</option><option>Once or twice, minor</option><option>Often — it slowed me down</option><option>Hard blocker — could not finish work</option></select></div>' +
      '<div class="sv-q"><label>What took the LONGEST / where did you get stuck?</label><textarea data-k="stuck" rows="2" placeholder="be specific"></textarea></div>' +
      '<div class="sv-q"><label>Anything confusing, broken, or missing in the materials?</label><textarea data-k="feedback" rows="2"></textarea></div>';
    host.appendChild(wk);

    const actions = document.createElement("div"); actions.className = "actions";
    const btn = document.createElement("button"); btn.className = "btn"; btn.textContent = "Submit weekly survey";
    const msg = document.createElement("span"); msg.className = "scorebox";
    actions.appendChild(btn); actions.appendChild(msg); host.appendChild(actions);

    btn.addEventListener("click", () => {
      const trainee = idIn.value.trim();
      if (!trainee) { msg.textContent = "Add your trainee ID first."; msg.className = "scorebox fail"; return; }
      const topics = S.topics.map((t, i) => ({
        topic: t,
        minutes: Number((tbl.querySelector(`[data-k="min${i}"]`) || {}).value || 0),
        difficulty: (host.querySelector(`input[name="diff${i}"]:checked`) || {}).value || null,
        confidence: (host.querySelector(`input[name="conf${i}"]:checked`) || {}).value || null
      }));
      const get = k => { const e = wk.querySelector(`[data-k="${k}"]`); return e ? e.value : null; };
      const rec = {
        id: `survey-w${S.week}-${trainee}`, type: "survey", trainee, week: S.week,
        topics, hours: get("hours"), pace: get("pace"), quota: get("quota"),
        stuck: get("stuck"), feedback: get("feedback"), ts: new Date().toISOString()
      };
      post(rec);
      localStorage.setItem(LSID, trainee);
      msg.textContent = "Submitted — thank you ✓"; msg.className = "scorebox pass";
      btn.disabled = true;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("survey");
    if (host && window.SURVEY) render(host, window.SURVEY);
  });
})();
