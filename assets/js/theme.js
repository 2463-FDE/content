// theme.js — light/dark theme for the 2463-FDE site.
//
// Loaded in <head> (render-blocking, before <body>) so the saved/system theme is
// applied to <html data-theme> before first paint — no flash of the wrong theme.
// Also injects the branded favicon and a topbar theme-toggle, so individual pages
// don't have to hand-wire either. The atlas (its own always-dark app) and the
// gauntlet (JS-rendered header) are handled by the floating-toggle fallback.
(function () {
  "use strict";
  var KEY = "fde_theme";
  var root = document.documentElement;

  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function systemDark() {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function resolve() {
    var s = saved();
    return (s === "dark" || s === "light") ? s : (systemDark() ? "dark" : "light");
  }
  function current() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function apply(t) { root.setAttribute("data-theme", t); }

  // 1) Apply ASAP (this runs before <body> exists → no flash).
  apply(resolve());

  // 2) Inject the favicon, resolved relative to THIS script's URL so it works from
  //    any directory depth (root pages, weeks/**, gauntlet).
  (function injectFavicon() {
    try {
      var src = (document.currentScript && document.currentScript.src) || "";
      var href = src.replace(/assets\/js\/theme\.js.*$/, "assets/favicon.svg");
      if (!href || href === src) return;
      if (document.querySelector('link[rel~="icon"]')) return; // respect a page's own icon
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = href;
      (document.head || root).appendChild(link);
    } catch (e) { /* no-op */ }
  })();

  // 3) Toggle button.
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var btn = null;

  function updateBtn() {
    if (!btn) return;
    var dark = current() === "dark";
    var label = dark ? "Switch to light mode" : "Switch to dark mode";
    btn.innerHTML = dark ? SUN : MOON; // show the action you'd switch TO
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
  function setTheme(t) {
    apply(t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* no-op */ }
    updateBtn();
  }

  function injectToggle() {
    if (btn) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.addEventListener("click", function () { setTheme(current() === "dark" ? "light" : "dark"); });

    var right = document.querySelector(".topbar-right");
    var bar = document.querySelector(".topbar");
    if (right) {
      right.insertBefore(btn, right.firstChild);
    } else if (bar) {
      bar.appendChild(btn);
    } else {
      // No standard topbar (gauntlet/atlas): float it out of the way.
      btn.className = "theme-toggle theme-toggle--float";
      (document.body || root).appendChild(btn);
    }
    updateBtn();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectToggle);
  } else {
    injectToggle();
  }

  // 4) Follow the OS theme while the user hasn't set an explicit preference.
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function (e) { if (!saved()) setTheme(e.matches ? "dark" : "light"); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) { /* no-op */ }
})();
