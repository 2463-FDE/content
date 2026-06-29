/* day-summary.js — end-of-reading "record your takeaway" via speech-to-text.
   The completion trigger for a day: recording a summary marks the day completed
   (peeking ahead no longer does — see progress.js). On a non-final part of a
   multi-part day it saves a "part takeaway" and only marks the day started.

   Capture only. Grading the summary against the day's concepts (the concept-check)
   needs a backend LLM judge — that stays a future goal. We POST the transcript to
   the /track sink so it's available for that and for trainer review later.

   Web Speech API (Chrome/Edge). Falls back to a typed textarea elsewhere. */
(function () {
  var WORKER = "https://fde-backend.jestercharles.workers.dev";

  function meta(n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.getAttribute("content") : ""; }
  function ident() { try { return JSON.parse(localStorage.getItem("fde_identity") || "null"); } catch (e) { return null; } }
  function el(tag, cls, txt) { var d = document.createElement(tag); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; }

  function init() {
    var day = meta("fde-day");
    var col = document.querySelector(".reading-col");
    if (!day || !col) return;

    // Last part of the day? (multi-part days like d2a/d2b share one fde-day.)
    // If FDE_NEXT points to another lettered part of the SAME day, this isn't the
    // last part — recording wraps the part, not the day.
    var nextHref = (window.FDE_NEXT && window.FDE_NEXT.href) || "";
    var dnum = (day.match(/d(\d+)/) || [])[1] || "";
    var nextSameDay = !!dnum && new RegExp("d0*" + dnum + "[a-z]\\.html$").test(nextHref);
    var partId = (location.pathname.split("/").pop() || day).replace(/\.html$/, "");

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

    var wrap = el("section", "day-summary");
    wrap.setAttribute("aria-label", "Record your takeaway");
    wrap.appendChild(el("div", "ds-k", nextSameDay ? "Wrap this part" : "Wrap the day"));
    wrap.appendChild(el("h2", null, nextSameDay
      ? "Before the next part — say your takeaway"
      : "Before you move on — say your takeaway"));
    wrap.appendChild(el("p", "ds-sub",
      "Out loud, in 20-30 seconds: what was the one idea that mattered, and where would you use it at a client? "
      + (nextSameDay ? "Saves your part note." : "This marks the day complete.")));

    var box = el("textarea", "ds-box");
    box.placeholder = SR ? "Press Record and speak — your words land here to edit before saving." : "Speech capture isn't supported in this browser. Type your takeaway here.";
    var controls = el("div", "ds-controls");
    var recBtn = el("button", "ds-btn ds-rec", SR ? "🎙 Record" : "🎙 Not supported");
    recBtn.type = "button";
    if (!SR) recBtn.disabled = true;
    var saveBtn = el("button", "ds-btn ds-save", nextSameDay ? "Save part note" : "Save & complete day");
    saveBtn.type = "button"; saveBtn.disabled = true;
    var status = el("span", "ds-status");
    controls.appendChild(recBtn); controls.appendChild(saveBtn); controls.appendChild(status);

    wrap.appendChild(box); wrap.appendChild(controls);
    col.appendChild(wrap);

    box.addEventListener("input", function () { saveBtn.disabled = box.value.trim().length < 8; });

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
        saveBtn.disabled = box.value.trim().length < 8;
      };
      rec.onend = function () { if (listening) { try { rec.start(); } catch (e) {} } }; // Chrome auto-stops ~1min
      rec.onerror = function (ev) {
        if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) {
          listening = false; recBtn.classList.remove("is-rec"); recBtn.textContent = "🎙 Record";
          status.textContent = "Mic blocked — type instead."; box.focus();
        }
      };
      recBtn.addEventListener("click", function () {
        if (listening) { listening = false; recBtn.classList.remove("is-rec"); recBtn.textContent = "🎙 Record"; status.textContent = ""; try { rec.stop(); } catch (e) {} return; }
        base = box.value.trim(); listening = true; recBtn.classList.add("is-rec"); recBtn.textContent = "⏹ Stop"; status.textContent = "Listening…";
        try { rec.start(); } catch (e) {}
      });
    }

    // ---- save ----
    saveBtn.addEventListener("click", function () {
      var text = box.value.trim();
      if (text.length < 8) return;
      if (listening) { listening = false; try { rec.stop(); } catch (e) {} recBtn.classList.remove("is-rec"); recBtn.textContent = "🎙 Record"; }
      var id = ident();
      var code = (id && id.code) || "anon";
      try {
        localStorage.setItem("fde_summary_" + code + "_" + partId,
          JSON.stringify({ day: day, part: partId, text: text, at: new Date().toISOString() }));
      } catch (e) {}
      // best-effort sink for the future concept-check / trainer review
      try {
        fetch(WORKER + "/track", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "day-summary", trainee: code, id: day + ":" + partId, day: day, text: text }),
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
      if (window.FDE_PROGRESS) {
        if (nextSameDay) window.FDE_PROGRESS.markStarted(day);
        else window.FDE_PROGRESS.markCompleted(day);
      }
      wrap.classList.add("is-done");
      saveBtn.disabled = true; recBtn.disabled = true;
      status.textContent = nextSameDay ? "✓ Saved — on to the next part." : "✓ Saved — day complete.";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
