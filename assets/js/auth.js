/* auth.js — lightweight identity gate. First visit: enter access code -> the
   Worker validates it (server-side, against KV logins + a hardcoded fallback) and
   issues an HMAC-signed session token. No codes/hashes ship in page source anymore.
   On success we store the identity ({code,name,role}) AND the session token in
   localStorage; the token is sent as a bearer on trainer API calls. Sets
   window.FDE_getIdentity(). Not bank-grade, but validation now lives on the server. */
(function () {
  const KEY = "fde_identity";
  const TOKEN_KEY = "fde_session";
  const RUN = (window.FDE_RUN_URL || "").replace(/\/$/, "");
  function get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function set(idt, token) {
    localStorage.setItem(KEY, JSON.stringify(idt));
    localStorage.setItem("fde_trainee_id", idt.code);
    localStorage.setItem("fde_trainee_name", idt.name);
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }
  function clear() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
  // Server-side validation: POST the code to the Worker; on success it returns
  // {ok, token, name, role}. Returns {idt, token} or null. Never throws.
  async function resolve(code) {
    const c = (code || "").trim();
    if (!c || !RUN) return null;
    try {
      const r = await fetch(RUN + "/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const data = await r.json();
      if (r.ok && data && data.ok) {
        return { idt: { code: c, name: data.name, role: data.role }, token: data.token };
      }
    } catch (e) { /* network/parse error -> treated as not recognized */ }
    return null;
  }
  // Trainer-only nav link: shown site-wide (auth.js is global) when the session
  // role is "trainer". Learners never see it. Server still enforces trainer on
  // every /trainer/* route — this link is convenience, not the access control.
  function trainerNav(idt) {
    if (!idt || idt.role !== "trainer") return;
    const center = document.querySelector(".topbar-center");
    if (!center || center.querySelector(".trainer-nav")) return;
    // Derive the path to trainer.html from an existing site-root link (brand/Home
    // point at .../index.html), so the link resolves from subpages (weeks/, atlas/)
    // too — they use relative ../../ prefixes, not absolute paths.
    let href = "trainer.html";
    const root = document.querySelector('.topbar a[href$="index.html"]');
    if (root) href = root.getAttribute("href").replace(/index\.html$/, "trainer.html");
    const a = document.createElement("a");
    a.className = "topnav trainer-nav";
    a.href = href;
    a.textContent = "📊 Reports";
    center.appendChild(a);
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
    b.querySelector(".logout").addEventListener("click", e => { e.preventDefault(); clear(); location.reload(); });
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
      if (m) { set(m.idt, m.token); location.reload(); }
      else { err.textContent = "Code not recognized. Check with your trainer."; go.disabled = false; inp.focus(); }
    }
    go.addEventListener("click", submit);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    setTimeout(() => inp.focus(), 50);
  }
  window.FDE_getIdentity = get;
  document.addEventListener("DOMContentLoaded", () => {
    const idt = get();
    if (idt) { window.FDE_IDENTITY = idt; if (idt.role === "trainer") document.body.classList.add("is-trainer"); trainerNav(idt); badge(idt); }
    else overlay();
  });
})();
