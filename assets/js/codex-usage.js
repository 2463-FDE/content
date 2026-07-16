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

    var plan = usage.plan_type ? '<span class="cu-plan">' + String(usage.plan_type) + '</span>' : "";
    var stale = ago(usage.source_ts || usage.stored_at);
    var banner = limit ? '<div class="cu-limit">⚠ Shared quota exhausted — reviews paused until reset</div>' : "";

    host.innerHTML =
      '<div class="cu-card' + (limit ? ' is-limit' : '') + '">' +
        '<div class="cu-head"><span class="cu-title">🤖 Codex Review Quota</span>' + plan + '</div>' +
        banner +
        rows +
        (stale ? '<div class="cu-foot">shared across the cohort · updated ' + stale + '</div>' : '') +
      '</div>';
    host.style.display = "";
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
