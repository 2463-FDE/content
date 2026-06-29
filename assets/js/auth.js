/* auth.js — lightweight identity gate. First visit: enter access code (from
   roster.js) -> marks who you are for progress tracking. Learner codes match
   plaintext; trainer codes are verified against SHA-256 hashes (TRAINERS) so
   trainer codes never appear in the public source. Sets window.FDE_getIdentity().
   Not real security — just consistent attribution + answer-key gating. */
(function () {
  const KEY = "fde_identity";
  function get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function set(idt) {
    localStorage.setItem(KEY, JSON.stringify(idt));
    localStorage.setItem("fde_trainee_id", idt.code);
    localStorage.setItem("fde_trainee_name", idt.name);
  }
  async function sha256(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function resolve(code) {
    const c = (code || "").trim();
    if (!c) return null;
    const plain = (window.ROSTER || []).find(r => r.code.toUpperCase() === c.toUpperCase());
    if (plain) return { code: plain.code, name: plain.name, role: plain.role };
    try {
      const h = await sha256(c);
      const t = (window.TRAINERS || []).find(x => x.hash === h);
      if (t) return { code: c, name: t.name, role: "trainer" };
    } catch (e) { /* crypto unavailable (insecure context) */ }
    return null;
  }
  function badge(idt) {
    // Mount into the navbar's right zone when present (3-zone topbar); fall
    // back to the bar itself on pages with the older single-row topbar.
    const bar = document.querySelector(".topbar-right") || document.querySelector(".topbar");
    if (!bar) return;
    let b = bar.querySelector(".id-badge");
    if (!b) { b = document.createElement("span"); b.className = "id-badge"; bar.appendChild(b); }
    const rolePill = (idt.role === "trainer") ? '<span class="role">trainer</span>' : '';
    b.innerHTML = `<span class="dot"></span><span>${idt.name}</span>${rolePill} <a href="#" class="logout">log out</a>`;
    b.querySelector(".logout").addEventListener("click", e => { e.preventDefault(); localStorage.removeItem(KEY); location.reload(); });
  }
  function overlay() {
    const o = document.createElement("div");
    o.className = "login-overlay";
    o.innerHTML =
      '<div class="login-card">' +
        '<div class="lc-brand"><b>2463</b>·FDE</div>' +
        '<h2>Enter your access code</h2>' +
        '<p>This marks who you are so your readings, checks, and surveys are saved under your name. Your trainer gives you the code.</p>' +
        '<input type="text" class="lc-input" placeholder="Enter your access code" autocomplete="off" spellcheck="false">' +
        '<button class="btn lc-go" type="button">Continue</button>' +
        '<div class="lc-err"></div>' +
      '</div>';
    document.body.appendChild(o);
    const inp = o.querySelector(".lc-input"), err = o.querySelector(".lc-err"), go = o.querySelector(".lc-go");
    async function submit() {
      go.disabled = true; err.textContent = "";
      const m = await resolve(inp.value);
      if (m) { set(m); location.reload(); }
      else { err.textContent = "Code not recognized. Check with your trainer."; go.disabled = false; inp.focus(); }
    }
    go.addEventListener("click", submit);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    setTimeout(() => inp.focus(), 50);
  }
  window.FDE_getIdentity = get;
  document.addEventListener("DOMContentLoaded", () => {
    const idt = get();
    if (idt) { window.FDE_IDENTITY = idt; if (idt.role === "trainer") document.body.classList.add("is-trainer"); badge(idt); }
    else overlay();
  });
})();
