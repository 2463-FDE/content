// progress.js — per-learner curriculum progress (Start / Resume / Completed).
//
// Pure localStorage, namespaced by the learner's access code so multiple people
// on one browser don't clobber each other. A reading page auto-marks itself
// "started" on load (reading its <meta name="fde-day">) and backfills every
// earlier day as "completed" — i.e. a day flips to ✓ the moment the learner
// moves on to the next topic. The curriculum calendar (index.html) reads this to
// render a Start/Resume/Completed button per day card.
window.FDE_PROGRESS = (function () {
  "use strict";

  // Canonical curriculum order. Extend as later weeks are authored — only days
  // with reading pages belong here (they drive backfill + the calendar buttons).
  var ORDER = ["w01d1", "w01d2", "w01d3", "w01d4", "w01d5", "w02d1", "w02d2", "w02d3", "w02d4", "w02d5"];

  function key() {
    try {
      var id = JSON.parse(localStorage.getItem("fde_identity") || "null");
      return "fde_progress" + (id && id.code ? "_" + id.code : "");
    } catch (e) { return "fde_progress"; }
  }
  function read() {
    try { return JSON.parse(localStorage.getItem(key()) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function write(p) {
    try { localStorage.setItem(key(), JSON.stringify(p)); } catch (e) { /* no-op */ }
  }

  // "none" | "started" | "completed"
  function status(day) { return read()[day] || "none"; }

  // Mark a day in progress. Marks ONLY this day started — peeking ahead at a
  // future topic must NOT auto-complete the days you skipped. Completion is an
  // explicit act: recording the end-of-day STT summary (see day-summary.js).
  // Never downgrades a day that's already completed (revisiting is fine).
  function markStarted(day) {
    var p = read();
    if (p[day] !== "completed") p[day] = "started";
    write(p);
  }

  function markCompleted(day) {
    var p = read();
    p[day] = "completed";
    write(p);
  }

  // Auto-track: if this page declares a curriculum day, mark it started.
  function autoTrack() {
    var m = document.querySelector('meta[name="fde-day"]');
    if (m && m.getAttribute("content")) markStarted(m.getAttribute("content"));
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoTrack);
  } else {
    autoTrack();
  }

  return { ORDER: ORDER, read: read, status: status, markStarted: markStarted, markCompleted: markCompleted };
})();
