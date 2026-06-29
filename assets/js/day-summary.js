/* day-summary.js — "Summarize Your Day": the end-of-day completion gate.
   A day is completed by (a) working the comprehension check (quiz.js) AND
   (b) recording a 90-120s spoken summary of the day's content. On completion we
   grade the summary against the day's concepts (backend /concept-check) and
   surface the sections to revisit, then reveal the next-day link.

   Multi-part days (d2a/d2b share one fde-day): non-final parts just save a part
   note and don't gate. Peeking ahead never completes (see progress.js).

   Web Speech API (Chrome/Edge); typed fallback elsewhere. */
(function () {
  var WORKER = (window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev");
  var MIN_CHARS = 250; // ~45-50 words; a real summary, not a one-liner

  function meta(n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.getAttribute("content") : ""; }
  function ident() { try { return JSON.parse(localStorage.getItem("fde_identity") || "null"); } catch (e) { return null; } }
  function el(tag, cls, txt) { var d = document.createElement(tag); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; }
  function pretty(id) { return String(id).replace(/-/g, " "); }
  function quizDone() {
    try {
      var all = JSON.parse(localStorage.getItem("fde_results") || "{}");
      var path = location.pathname;
      return Object.keys(all).some(function (k) { var r = all[k]; return r && r.type === "quiz" && r.page === path; });
    } catch (e) { return false; }
  }

  function init() {
    var day = meta("fde-day");
    var col = document.querySelector(".reading-col");
    if (!day || !col) return;

    var concepts = (meta("fde-concepts") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var nextHref = (window.FDE_NEXT && window.FDE_NEXT.href) || "";
    var nextLabel = (window.FDE_NEXT && window.FDE_NEXT.label) || "Next ▸";
    var dnum = (day.match(/d(\d+)/) || [])[1] || "";
    var nextSameDay = !!dnum && new RegExp("d0*" + dnum + "[a-z]\\.html$").test(nextHref);
    var partId = (location.pathname.split("/").pop() || day).replace(/\.html$/, "");
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

    var wrap = el("section", "day-summary");
    wrap.setAttribute("aria-label", "Summarize your day");
    wrap.appendChild(el("div", "ds-k", nextSameDay ? "Wrap this part" : "Summarize your day"));
    wrap.appendChild(el("h2", null, nextSameDay ? "Wrap this part — say your takeaway" : "Summarize Your Day"));
    wrap.appendChild(el("p", "ds-sub", nextSameDay
      ? "Out loud, ~30s: the one idea from this part and where you'd use it. Saves your part note."
      : "Out loud, 90-120 seconds: summarize today's content in your own words — the key ideas, how they connect, and where you'd use them at a client. This + the comprehension check completes the day and flags anything to revisit."));

    var box = el("textarea", "ds-box");
    box.placeholder = SR ? "Press Record and speak — your words land here to edit before saving." : "Speech capture isn't supported here. Type your summary.";
    var controls = el("div", "ds-controls");
    var recBtn = el("button", "ds-btn ds-rec", SR ? "🎙 Record" : "🎙 Not supported");
    recBtn.type = "button"; if (!SR) recBtn.disabled = true;
    var saveBtn = el("button", "ds-btn ds-save", nextSameDay ? "Save part note" : "Complete day ▸");
    saveBtn.type = "button"; saveBtn.disabled = true;
    var status = el("span", "ds-status");
    controls.appendChild(recBtn); controls.appendChild(saveBtn); controls.appendChild(status);
    var revisit = el("div", "ds-revisit"); revisit.style.display = "none";
    wrap.appendChild(box); wrap.appendChild(controls); wrap.appendChild(revisit);
    col.appendChild(wrap);

    var minChars = nextSameDay ? 8 : MIN_CHARS;
    function refresh() {
      var n = box.value.trim().length;
      saveBtn.disabled = n < minChars;
      if (!nextSameDay && n > 0 && n < minChars) status.textContent = "Keep going — aim for 90-120s (" + n + "/" + minChars + " chars).";
      else if (!listening) status.textContent = "";
    }

    // ---- recording ----
    var rec = null, listening = false, base = "";
    if (SR) {
      rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
      rec.onresult = function (e) {
        var fin = "", interim = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var t = e.results[i][0].transcript;
          if (e.results[i].isFinal) fin += t; else interim += t;
        }
        if (fin) base = (base + " " + fin).trim();
        box.value = (base + " " + interim).trim();
        refresh();
      };
      rec.onend = function () { if (listening) { try { rec.start(); } catch (e) {} } };
      rec.onerror = function (ev) {
        if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) {
          listening = false; recBtn.classList.remove("is-rec"); recBtn.textContent = "🎙 Record";
          status.textContent = "Mic blocked — type instead."; box.focus();
        }
      };
      recBtn.addEventListener("click", function () {
        if (listening) { listening = false; recBtn.classList.remove("is-rec"); recBtn.textContent = "🎙 Record"; status.textContent = ""; try { rec.stop(); } catch (e) {} refresh(); return; }
        base = box.value.trim(); listening = true; recBtn.classList.add("is-rec"); recBtn.textContent = "⏹ Stop"; status.textContent = "Listening…";
        try { rec.start(); } catch (e) {}
      });
    }
    box.addEventListener("input", refresh);

    // ---- save / complete ----
    saveBtn.addEventListener("click", function () {
      var text = box.value.trim();
      if (text.length < minChars) return;
      if (listening) { listening = false; try { rec.stop(); } catch (e) {} recBtn.classList.remove("is-rec"); recBtn.textContent = "🎙 Record"; }
      var id = ident();
      var code = (id && id.code) || "anon";
      try {
        localStorage.setItem("fde_summary_" + code + "_" + partId,
          JSON.stringify({ day: day, part: partId, text: text, at: new Date().toISOString() }));
      } catch (e) {}

      // Non-final part: just save a part note, don't gate or complete.
      if (nextSameDay) {
        try { fetch(WORKER + "/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "part-note", trainee: code, id: day + ":" + partId, day: day, text: text }), keepalive: true }).catch(function () {}); } catch (e) {}
        if (window.FDE_PROGRESS) window.FDE_PROGRESS.markStarted(day);
        wrap.classList.add("is-done"); saveBtn.disabled = true; recBtn.disabled = true;
        status.textContent = "✓ Saved — on to the next part.";
        return;
      }

      // Day-complete path: require the comprehension check too.
      if (!quizDone()) {
        status.textContent = "One more step — finish the Comprehension check (right) first, then complete the day.";
        return;
      }
      saveBtn.disabled = true; recBtn.disabled = true; status.textContent = "Grading your summary…";
      fetch(WORKER + "/concept-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, day: day, concepts: concepts, text: text }),
      }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (window.FDE_PROGRESS) window.FDE_PROGRESS.markCompleted(day);
        wrap.classList.add("is-done");
        status.textContent = "✓ Day complete.";
        var toRevisit = (d && (d.revisit || d.weak)) || [];
        revisit.innerHTML = "";
        if (toRevisit.length) {
          revisit.appendChild(el("div", "ds-revisit-k", "Worth a revisit before you move on:"));
          var ul = el("ul");
          toRevisit.forEach(function (c) { ul.appendChild(el("li", null, pretty(c))); });
          revisit.appendChild(ul);
          if (d && d.note) revisit.appendChild(el("p", "ds-note", d.note));
        } else {
          revisit.appendChild(el("div", "ds-revisit-k", "Solid — your summary covered the day's concepts. 👏"));
        }
        if (nextHref) {
          var a = el("a", "ds-next", nextHref.indexOf("index.html") >= 0 ? "Back to Program ▸" : (nextLabel || "Next day ▸"));
          a.setAttribute("href", nextHref); revisit.appendChild(a);
        }
        revisit.style.display = "";
      }).catch(function () {
        if (window.FDE_PROGRESS) window.FDE_PROGRESS.markCompleted(day);
        wrap.classList.add("is-done"); status.textContent = "✓ Day complete (grading unavailable).";
        if (nextHref) { revisit.innerHTML = ""; var a = el("a", "ds-next", nextLabel || "Next ▸"); a.setAttribute("href", nextHref); revisit.appendChild(a); revisit.style.display = ""; }
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
