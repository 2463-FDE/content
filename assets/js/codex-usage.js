/* codex-usage.js — shared Codex review-agent quota window.
   The @codex-review agent runs on ONE ChatGPT-plan Codex account, so its rate limit
   is a shared pool across the cohort. A pusher on the trainer's Mac publishes the
   latest snapshot to the Worker (/codex-usage); this fetches it (cohort-gated by the
   session token) and renders a small meter under the Resources block. Renders nothing
   if there's no session or no data — never blocks the page. */
(function () {
  var RUN = (window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev").replace(/\/$/, "");

  function token() { try { return localStorage.getItem("fde_session") || ""; } catch (e) { return ""; } }

  function windowLabel(mins) {
    if (!mins) return "";
    if (mins % 10080 === 0) { var w = mins / 10080; return w === 1 ? "weekly" : w + "-week"; }
    if (mins % 1440 === 0) { var d = mins / 1440; return d === 1 ? "daily" : d + "-day"; }
    if (mins % 60 === 0) { var h = mins / 60; return h + "h window"; }
    return mins + "min window";
  }

  function until(resetAtSec) {
    if (!resetAtSec) return "";
    var s = resetAtSec - Math.floor(Date.now() / 1000);
    if (s <= 0) return "resets now";
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return "resets in " + d + "d " + h + "h";
    if (h > 0) return "resets in " + h + "h " + m + "m";
    return "resets in " + m + "m";
  }

  function ago(ms) {
    if (!ms) return "";
    var s = Math.floor((Date.now() - ms) / 1000);
    if (s < 90) return "just now";
    if (s < 5400) return Math.round(s / 60) + " min ago";
    if (s < 172800) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  }

  // Bar for one rate-limit window. `w` = {used_percent, window_minutes, reset_at}.
  function barHTML(label, w, limitReached) {
    var used = Math.max(0, Math.min(100, Math.round(w.used_percent || 0)));
    var tone = limitReached || used >= 100 ? "crit" : used >= 90 ? "crit" : used >= 70 ? "warn" : "ok";
    var wl = windowLabel(w.window_minutes);
    var reset = until(w.reset_at);
    var sub = [wl, reset].filter(Boolean).join(" · ");
    return (
      '<div class="cu-row">' +
        '<div class="cu-row-top"><span class="cu-row-label">' + label + '</span>' +
          '<span class="cu-pct">' + used + '% used</span></div>' +
        '<div class="cu-bar"><div class="cu-fill ' + tone + '" style="width:' + used + '%"></div></div>' +
        (sub ? '<div class="cu-sub">' + sub + '</div>' : '') +
      '</div>'
    );
  }

  function render(host, usage) {
    var rl = usage && usage.rate_limits;
    if (!rl) return;
    var limit = !!rl.limit_reached;
    var rows = "";
    if (rl.primary) rows += barHTML(rl.secondary ? "5-hour" : "Usage", rl.primary, limit);
    if (rl.secondary) rows += barHTML("Weekly", rl.secondary, limit);
    if (!rows) return;

    // A quota reading is only true at the moment Codex last ran. The pusher can only
    // report the newest snapshot in Codex's logs, so when no review has run the same
    // figures get re-pushed indefinitely and age silently. Past a few hours these are
    // a historical reading, not a live one — and showing "quota exhausted" off stale
    // data tells the cohort reviews are paused when they are not.
    var ts = usage.source_ts || usage.stored_at;
    var ageMs = ts ? (Date.now() - ts) : 0;
    var STALE_MS = 3 * 3600 * 1000;
    var isStale = ageMs > STALE_MS;

    var plan = usage.plan_type ? '<span class="cu-plan">' + String(usage.plan_type) + '</span>' : "";
    var stale = ago(ts);
    var banner = (limit && !isStale)
      ? '<div class="cu-limit">⚠ Shared quota exhausted — reviews paused until reset</div>' : "";
    var staleNote = isStale
      ? '<div class="cu-stale">⏳ Last reading ' + stale + ' — Codex has not run since, so this is ' +
        'a historical snapshot, not a live quota. It refreshes on the next review.</div>' : "";

    host.innerHTML =
      '<div class="cu-card' + (limit && !isStale ? ' is-limit' : '') + (isStale ? ' is-stale' : '') + '">' +
        '<div class="cu-head"><span class="cu-title">🤖 Codex Review Quota</span>' + plan + '</div>' +
        staleNote +
        banner +
        rows +
        (stale ? '<div class="cu-foot">shared across the cohort · updated ' + stale + '</div>' : '') +
      '</div>' +
      metricsHTML(usage.metrics);
    host.style.display = "";
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Compact, positive cohort-usage block. Counts only — no quality scores.
  // Highlights the most-active devs rather than ranking everyone.
  function metricsHTML(m) {
    if (!m || !Array.isArray(m.top) || !m.top.length) return "";
    var max = m.top.reduce(function (a, t) { return Math.max(a, t.reviews || 0); }, 1);
    var medal = ["🥇", "🥈", "🥉"]; // 🥇🥈🥉
    var rows = m.top.map(function (t, i) {
      var w = Math.max(6, Math.round((t.reviews || 0) / max * 100));
      return '<div class="cu-top-row">' +
          '<span class="cu-top-name">' + (medal[i] || "") + " " + esc(t.name) + '</span>' +
          '<span class="cu-top-bar"><span style="width:' + w + '%"></span></span>' +
          '<span class="cu-top-n">' + (t.reviews || 0) + '</span>' +
        '</div>';
    }).join("");
    var wk = (typeof m.reviews_7d === "number" && m.reviews_7d > 0)
      ? ' · <b>' + m.reviews_7d + '</b> this week' : "";
    var stat = (m.total_reviews || 0) + ' reviews · ' + (m.active_devs || m.top.length) + ' devs' + wk;
    return (
      '<div class="cu-card cu-metrics">' +
        '<div class="cu-head"><span class="cu-title">📈 Most Active</span></div>' +
        '<div class="cu-mstat">' + stat + '</div>' +
        '<div class="cu-top">' + rows + '</div>' +
      '</div>'
    );
  }

  function mount() {
    var host = document.getElementById("codex-usage");
    if (!host) {
      // Fallback: append to the sidebar rail (or legacy hero-right) if the
      // placeholder div isn't in the page.
      var rail = document.querySelector(".cal-rail") || document.querySelector(".hero-right");
      if (!rail) return;
      host = document.createElement("div");
      host.id = "codex-usage";
      rail.appendChild(host);
    }
    host.style.display = "none";
    var t = token();
    if (!t) return; // not logged in — auth.js overlay will handle it
    fetch(RUN + "/codex-usage", { headers: { authorization: "Bearer " + t } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok && d.usage) render(host, d.usage); })
      .catch(function () { /* silent — widget is non-critical */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
