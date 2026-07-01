// progress.js — per-learner curriculum progress (Start / Resume / Completed).
//
// Server-backed so progress survives a browser switch or a cache clear. The
// backend (Cloudflare KV, uprog:<code>) is the source of truth; localStorage is
// an instant-render cache + offline write buffer.
//
// Flow: render from the localStorage cache immediately (no flash), then on load
// pull the server record, merge by precedence (none < started < completed, never
// downgrade), push any local-only progress back up (heals writes made offline),
// and fire "fde-progress-sync" so the calendar re-renders. Reads/peeking never
// auto-complete skipped days; completion is the end-of-day STT summary.
window.FDE_PROGRESS = (function () {
  "use strict";

  var WORKER = (window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev");
  // Canonical curriculum order — only days with reading pages (drive the calendar).
  var ORDER = ["w01d1", "w01d2", "w01d3", "w01d4", "w01d5", "w02d1", "w02d2", "w02d3", "w02d4", "w02d5", "w03d1", "w03d2", "w03d3", "w03d4", "w03d5"];
  var RANK = { none: 0, started: 1, completed: 2 };

  function code() {
    try { var id = JSON.parse(localStorage.getItem("fde_identity") || "null"); return (id && id.code) || ""; }
    catch (e) { return ""; }
  }
  function cacheKey() { var c = code(); return "fde_progress" + (c ? "_" + c : ""); }
  function read() {
    try { return JSON.parse(localStorage.getItem(cacheKey()) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function write(p) {
    try { localStorage.setItem(cacheKey(), JSON.stringify(p)); } catch (e) { /* no-op */ }
  }
  function higher(a, b) { return (RANK[b] || 0) > (RANK[a] || 0) ? b : (a || "none"); }

  // "none" | "started" | "completed" — read from the local cache (sync, instant).
  function status(day) { return read()[day] || "none"; }

  // Mark ONLY this day. Peeking ahead must not auto-complete skipped days; never
  // downgrade. Writes the cache immediately and pushes to the server best-effort.
  function set(day, st) {
    var p = read();
    var next = higher(p[day], st);
    if (next === p[day]) { push(day, next); return; }
    p[day] = next; write(p); push(day, next);
  }
  function markStarted(day) { set(day, "started"); }
  function markCompleted(day) { set(day, "completed"); }

  // ---- server sync ----
  function push(day, st, attempt) {
    var c = code(); if (!c || !WORKER) return;
    attempt = attempt || 0;
    try {
      fetch(WORKER + "/uprog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, day: day, status: st }), keepalive: true,
      }).then(function (r) {
        // Don't swallow a failed completion write. Retry once, then warn — the
        // local cache still holds it and sync() will heal on next load, but a
        // visible warning beats a learner who "completed" with nothing on the
        // server. (BUG 4)
        if (!r || !r.ok) throw new Error("uprog " + (r && r.status));
      }).catch(function (e) {
        if (attempt < 1) { setTimeout(function () { push(day, st, attempt + 1); }, 1500); }
        else { try { console.warn("[FDE] progress push failed for", day, st, "— cached, will heal on next load:", e && e.message); } catch (x) {} }
      });
    } catch (e) { /* offline — cache holds it; reconcile on next load */ }
  }

  function sync() {
    var c = code(); if (!c || !WORKER) return;
    fetch(WORKER + "/uprog?code=" + encodeURIComponent(c))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok) return;
        // Clean-slate reset: if the server's reset epoch advanced past what this
        // browser last saw, drop ALL local progress/summary cache once (so a wiped
        // server doesn't get re-healed from stale localStorage), then adopt server.
        try {
          var ep = String(d.resetEpoch || "0");
          if (ep !== "0" && ep !== (localStorage.getItem("fde_reset_epoch") || "0")) {
            Object.keys(localStorage).filter(function (k) { return /^fde_(progress|summary)_/.test(k); })
              .forEach(function (k) { localStorage.removeItem(k); });
            localStorage.setItem("fde_reset_epoch", ep);
            try { window.dispatchEvent(new CustomEvent("fde-progress-sync")); } catch (e) {}
            return; // server is the clean source of truth this load
          }
        } catch (e) { /* no-op */ }
        var server = d.progress || {};
        var local = read();
        var merged = {}, changedLocal = false, changedServer = false;
        var days = {}; Object.keys(server).forEach(function (k) { days[k] = 1; }); Object.keys(local).forEach(function (k) { days[k] = 1; });
        Object.keys(days).forEach(function (day) {
          merged[day] = higher(server[day], local[day]);
          if (merged[day] !== (local[day] || undefined)) changedLocal = true;
          if (merged[day] !== (server[day] || undefined)) changedServer = true;
        });
        if (changedLocal) write(merged);
        // Heal: push any local-only progress (e.g. offline completions) back up.
        if (changedServer) {
          try {
            fetch(WORKER + "/uprog", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: c, progress: merged }),
            }).catch(function () {});
          } catch (e) { /* no-op */ }
        }
        try { window.dispatchEvent(new CustomEvent("fde-progress-sync")); } catch (e) {}
      })
      .catch(function () { /* offline — cache stands */ });
  }

  // Auto-track: a reading page marks its own day started on load.
  function autoTrack() {
    var m = document.querySelector('meta[name="fde-day"]');
    if (m && m.getAttribute("content")) markStarted(m.getAttribute("content"));
    sync();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoTrack);
  else autoTrack();

  return { ORDER: ORDER, read: read, status: status, markStarted: markStarted, markCompleted: markCompleted, sync: sync };
})();
