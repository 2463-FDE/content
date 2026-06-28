/* auth.js — lightweight identity gate. First visit: enter access code (from
   roster.js) -> marks who you are for progress tracking. Not security; just
   consistent attribution. Stores identity in localStorage; quiz.js / survey.js
   read it. Sets window.FDE_getIdentity(). */
(function () {
  const KEY = "fde_identity";
  function get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function set(idt) {
    localStorage.setItem(KEY, JSON.stringify(idt));
    localStorage.setItem("fde_trainee_id", idt.code);
    localStorage.setItem("fde_trainee_name", idt.name);
  }
  function lookup(code) {
    const c = (code || "").trim().toUpperCase();
    return (window.ROSTER || []).find(r => r.code.toUpperCase() === c) || null;
  }
  function badge(idt) {
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    let b = bar.querySelector(".id-badge");
    if (!b) { b = document.createElement("span"); b.className = "id-badge"; bar.appendChild(b); }
    b.innerHTML = `<span class="dot"></span><span>${idt.name}</span> <a href="#" class="logout">log out</a>`;
    b.querySelector(".logout").addEventListener("click", e => { e.preventDefault(); localStorage.removeItem(KEY); location.reload(); });
  }
  function overlay() {
    const o = document.createElement("div");
    o.className = "login-overlay";
    o.innerHTML =
      '<div class="login-card">' +
        '<div class="lc-brand"><b>2463</b>·FDE</div>' +
        '<h2>Enter your access code</h2>' +
        '<p>This just marks who you are so your readings, checks, and surveys are saved under your name. Your trainer gives you the code.</p>' +
        '<input type="text" class="lc-input" placeholder="e.g. CJ-TEST" autocomplete="off" spellcheck="false">' +
        '<button class="btn lc-go" type="button">Continue</button>' +
        '<div class="lc-err"></div>' +
      '</div>';
    document.body.appendChild(o);
    const inp = o.querySelector(".lc-input"), err = o.querySelector(".lc-err");
    function go() {
      const m = lookup(inp.value);
      if (m) { set(m); location.reload(); }
      else { err.textContent = "Code not recognized. Check with your trainer."; inp.focus(); }
    }
    o.querySelector(".lc-go").addEventListener("click", go);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    setTimeout(() => inp.focus(), 50);
  }
  window.FDE_getIdentity = get;
  document.addEventListener("DOMContentLoaded", () => {
    const idt = get();
    if (idt) { window.FDE_IDENTITY = idt; badge(idt); }
    else overlay();
  });
})();
