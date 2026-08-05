/* usage-notice.js — budget reminders for the chat assistants.
 *
 * Every assistant response carries the learner's remaining daily budget (the
 * shared cross-assistant pot the Worker meters). This file turns that number
 * into a heads-up at each 20% of the day's budget spent.
 *
 * IMPORTANT: this is entirely local. No model call, no Worker call, no tokens.
 * The notice is composed here from a number the response already contained, and
 * it is rendered as a system line the assistant never sees — it is not appended
 * to the transcript, so it can never end up in a later prompt.
 *
 * Fires once per threshold per day. The mark is stored per local date, so it
 * resets on its own and a reload or a second assistant doesn't re-announce a
 * threshold the learner already saw.
 *
 * Public API:
 *   window.FDE_usageNotice(left, total) -> { pct, left, total, text } | null
 *     Returns a notice the FIRST time a 20% threshold is crossed, otherwise
 *     null. Returns null for uncapped (practice) identities, which send null.
 */
(function () {
  "use strict";

  var STEPS = [20, 40, 60, 80];   // 100% isn't here — that's the cap message

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function markKey() { return "fde-usage-mark-" + today(); }
  function getMark() {
    try { return parseInt(localStorage.getItem(markKey()) || "0", 10) || 0; } catch (e) { return 0; }
  }
  function setMark(v) { try { localStorage.setItem(markKey(), String(v)); } catch (e) {} }

  function phrase(pct, left, total) {
    var of = left + " of " + total + " left";
    if (pct >= 80) {
      return "You've used " + pct + "% of today's assistant budget — " + of + ". " +
        "Worth spending the rest on the things you're actually stuck on; the readings and the checks don't cost anything.";
    }
    if (pct >= 60) {
      return "You're " + pct + "% through today's assistant budget (" + of + "). " +
        "It's shared across every assistant on the site and resets tomorrow.";
    }
    return "Heads up: " + pct + "% of today's assistant budget used — " + of + ". " +
      "One pot across every assistant on the site.";
  }

  // left/total come straight off the Worker's response. left === null means an
  // uncapped identity, so there is nothing to warn about.
  window.FDE_usageNotice = function (left, total) {
    if (left == null || !total) return null;
    var used = Math.max(0, total - left);
    var pct = Math.floor((used / total) * 100);

    var hit = 0;
    for (var i = 0; i < STEPS.length; i++) if (pct >= STEPS[i]) hit = STEPS[i];
    if (!hit) return null;

    var mark = getMark();
    if (hit <= mark) return null;       // already announced this threshold today
    setMark(hit);
    return { pct: hit, left: left, total: total, text: phrase(hit, left, total) };
  };
})();
