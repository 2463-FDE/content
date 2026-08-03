/* coding-coach.js — the coding-prep "thinking partner".
 *
 * Opens a LeetCode-shaped modal for one problem: the problem brief, a code
 * scratchpad (CodeMirror 5, Python or Java, pre-filled with the official starter
 * signature), and a chat pane wired to the Worker's /coach/* routes. The agent on
 * the other end is a SOUNDING BOARD — it never returns code.
 *
 * The learner types nothing but conversation. The problem brief, the examples,
 * the constraints and the starter signature all arrive from the Worker keyed by
 * slug, so there is no free-text field feeding the model's context — the only
 * learner-authored input is their chat turns and their own scratchpad.
 *
 * Nothing here executes. Learners still run and submit on LeetCode; the
 * scratchpad exists so the partner has something concrete to react to.
 *
 * Public API:  window.FDE_openCoach({ slug, name, difficulty, url })
 *   name/difficulty are only used for the header before the brief loads.
 *
 * Dependencies: none at load time. CodeMirror lazy-loads from cdnjs on first open;
 * if the CDN is blocked we fall back to a plain <textarea>.
 *
 * Persistence (localStorage, per problem slug):
 *   cc-code-<slug>-<lang>   scratchpad text
 *   cc-log-<slug>           transcript [{role,text}]
 *   cc-sid-<slug>           {id, at} — dropped after 6h to match the Worker's TTL
 */
(function () {
  "use strict";

  var WORKER = (window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev").replace(/\/$/, "");
  var CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";
  var SESSION_MAX_AGE = 6 * 60 * 60 * 1000; // matches COACH_TTL_SECONDS

  // Used only until the Worker hands over the official signature (and when the
  // learner isn't signed in). The UMPIRE skeleton the page's readings teach.
  function fallbackStarter(lang) {
    var c = lang === "java" ? "//" : "#";
    return [
      c + " U — restate the problem in your own words (input, output, one edge case):",
      c, c + " M — what pattern does this match, and why that one?",
      c, c + " P — plan, in plain steps:", c + "   1.", c + "   2.",
      c, c + " I — implement below.", "", "",
    ].join("\n");
  }

  var S = {
    problem: null,     // {slug, name, difficulty, url} from the page row
    brief: null,       // {title, ask, examples, constraints, starter} from the Worker
    sessionId: null,
    lang: "python",
    busy: false,
    capped: false,
    editor: null,
    textarea: null,
    messages: [],
  };

  // ---- storage ---------------------------------------------------------------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function ident() {
    try { return window.FDE_getIdentity ? window.FDE_getIdentity() : JSON.parse(lsGet("fde_identity") || "null"); }
    catch (e) { return null; }
  }

  function codeKey() { return "cc-code-" + S.problem.slug + "-" + S.lang; }
  function briefKey() { return "cc-brief-" + S.problem.slug; }
  function logKey() { return "cc-log-" + S.problem.slug; }
  function sidKey() { return "cc-sid-" + S.problem.slug; }

  function loadSession() {
    try {
      var rec = JSON.parse(lsGet(sidKey()) || "null");
      if (rec && rec.id && Date.now() - rec.at < SESSION_MAX_AGE) return rec.id;
    } catch (e) {}
    lsDel(sidKey());
    return null;
  }
  function saveSession(id) { lsSet(sidKey(), JSON.stringify({ id: id, at: Date.now() })); }

  // ---- CodeMirror lazy loader ------------------------------------------------
  var cmPromise = null;
  function inject(tag, attrs) {
    return new Promise(function (res, rej) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      el.onload = function () { res(); };
      el.onerror = function () { rej(new Error("cdn")); };
      document.head.appendChild(el);
    });
  }
  function loadCM() {
    if (cmPromise) return cmPromise;
    cmPromise = inject("link", { rel: "stylesheet", href: CDN + "codemirror.min.css" })
      .then(function () { return inject("link", { rel: "stylesheet", href: CDN + "theme/material-darker.min.css" }); })
      .then(function () { return inject("script", { src: CDN + "codemirror.min.js" }); })
      .then(function () {
        return Promise.all([
          inject("script", { src: CDN + "mode/python/python.min.js" }),
          inject("script", { src: CDN + "mode/clike/clike.min.js" }),
          inject("script", { src: CDN + "addon/edit/closebrackets.min.js" }),
        ]);
      });
    return cmPromise;
  }
  function cmTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "material-darker" : "default";
  }

  // ---- rendering -------------------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // Chat is plain text plus short `inline` spans — the Worker strips code blocks
  // before they ever reach us, so there is no block-level code path to render.
  function fmt(s) {
    return esc(s).replace(/`([^`\n]{1,60})`/g, "<code>$1</code>").replace(/\n/g, "<br>");
  }
  function el(id) { return document.getElementById(id); }

  function buildModal() {
    if (el("ccModal")) return;
    var wrap = document.createElement("div");
    wrap.className = "cc-overlay";
    wrap.id = "ccModal";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="cc-shell" role="dialog" aria-modal="true" aria-label="Thinking partner">' +
        '<header class="cc-top">' +
          '<div class="cc-id"><span class="cc-name" id="ccName"></span>' +
            '<span class="cp-diff" id="ccDiff"></span><span class="cc-pat" id="ccPat"></span></div>' +
          '<div class="cc-actions">' +
            '<a class="cc-lc" id="ccLC" target="_blank" rel="noopener">Open on LeetCode ↗</a>' +
            '<span class="cc-turns" id="ccTurns"></span>' +
            '<button class="cc-x" id="ccX" aria-label="Close">✕</button>' +
          '</div>' +
        '</header>' +
        '<div class="cc-tabbar" id="ccTabs">' +
          '<button class="cc-tab" data-pane="problem">Problem</button>' +
          '<button class="cc-tab" data-pane="code">Code</button>' +
          '<button class="cc-tab on" data-pane="chat">Partner</button>' +
        '</div>' +
        '<div class="cc-panes" id="ccPanes">' +
          '<section class="cc-pane cc-problem" data-pane="problem">' +
            '<div class="cc-ph">The task</div>' +
            '<p class="cc-ask" id="ccAsk">Loading…</p>' +
            '<div id="ccExWrap" hidden><div class="cc-ph">Examples</div><div id="ccEx"></div></div>' +
            '<div id="ccConsWrap" hidden><div class="cc-ph">Constraints</div><ul class="cc-cons" id="ccCons"></ul></div>' +
            '<div class="cc-ph">UMPIRE</div>' +
            '<ol class="cc-umpire">' +
              '<li><b>U</b>nderstand — restate it, name the output, give one edge case</li>' +
              '<li><b>M</b>atch — which pattern, and why that one</li>' +
              '<li><b>P</b>lan — plain steps before syntax</li>' +
              '<li><b>I</b>mplement — skeleton first, fill in second</li>' +
              '<li><b>R</b>eview — trace a real input by hand</li>' +
              '<li><b>E</b>valuate — time, space, tradeoffs</li>' +
            '</ol>' +
            '<div class="cc-rule">This partner never gives you code. It asks the question that gets you unstuck. Solve and submit on LeetCode.</div>' +
          '</section>' +
          '<section class="cc-pane cc-code" data-pane="code">' +
            '<div class="cc-codebar">' +
              '<div class="cc-langs">' +
                '<button class="cc-lang on" data-lang="python">Python</button>' +
                '<button class="cc-lang" data-lang="java">Java</button>' +
              '</div>' +
              '<button class="cc-reset" id="ccReset" title="Restore the starter signature">↺ reset</button>' +
              '<span class="cc-hint">Scratchpad — nothing runs here. Run it on LeetCode.</span>' +
            '</div>' +
            '<div class="cc-edwrap" id="ccEdWrap"><textarea class="cc-fallback" id="ccFallback" spellcheck="false"></textarea></div>' +
          '</section>' +
          '<section class="cc-pane cc-chat on" data-pane="chat">' +
            '<div class="cc-log" id="ccLog"></div>' +
            '<div class="cc-composer">' +
              '<textarea id="ccInput" rows="2" placeholder="Think out loud — what&#39;s your read on this?"></textarea>' +
              '<button id="ccSend">Send</button>' +
            '</div>' +
            '<div class="cc-foot" id="ccFoot">Enter sends · Shift+Enter for a new line · your scratchpad rides along</div>' +
          '</section>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    el("ccX").addEventListener("click", close);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !wrap.hidden) close();
    });
    el("ccTabs").addEventListener("click", function (e) {
      var b = e.target.closest(".cc-tab"); if (b) showPane(b.dataset.pane);
    });
    wrap.querySelectorAll(".cc-lang").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.dataset.lang); });
    });
    el("ccReset").addEventListener("click", function () {
      setCode(starterFor(S.lang));
      persistCode();
    });
    el("ccSend").addEventListener("click", send);
    el("ccInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  function showPane(name) {
    var wrap = el("ccModal");
    wrap.querySelectorAll(".cc-tab").forEach(function (t) { t.classList.toggle("on", t.dataset.pane === name); });
    wrap.querySelectorAll(".cc-pane").forEach(function (p) { p.classList.toggle("on", p.dataset.pane === name); });
    if (name === "code" && S.editor) S.editor.refresh();
  }

  // Render the brief the Worker sent. Everything here is server-side content.
  function renderBrief(b) {
    S.brief = b || null;
    if (!b || b.known === false) {
      el("ccAsk").textContent = "This one isn't in the problem bank yet — open it on LeetCode and tell the partner what it asks for in your own words. (That's the Understand step anyway.)";
      el("ccExWrap").hidden = true;
      el("ccConsWrap").hidden = true;
      return;
    }
    if (b.title) el("ccName").textContent = b.title;
    if (b.difficulty) {
      var d = el("ccDiff");
      d.textContent = b.difficulty;
      d.className = "cp-diff " + (/hard/i.test(b.difficulty) ? "h" : /med/i.test(b.difficulty) ? "m" : "e");
      d.hidden = false;
    }
    el("ccAsk").textContent = b.ask || "";
    var ex = b.examples || [];
    el("ccExWrap").hidden = !ex.length;
    el("ccEx").innerHTML = ex.map(function (e) { return '<pre class="cc-ex">' + esc(e) + "</pre>"; }).join("");
    var cons = b.constraints || [];
    el("ccConsWrap").hidden = !cons.length;
    el("ccCons").innerHTML = cons.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("");
    // Briefs are static per problem — cache so a revisit paints instantly and a
    // replayed transcript doesn't need a round trip just to fill the pane.
    try { lsSet(briefKey(), JSON.stringify(b)); } catch (e) {}
  }

  // ---- editor ----------------------------------------------------------------
  function starterFor(lang) {
    if (S.brief && S.brief.starter && S.brief.starter[lang]) return S.brief.starter[lang];
    return fallbackStarter(lang);
  }
  function currentCode() {
    if (S.editor) return S.editor.getValue();
    return S.textarea ? S.textarea.value : "";
  }
  function setCode(v) {
    if (S.editor) S.editor.setValue(v); else if (S.textarea) S.textarea.value = v;
  }
  function persistCode() { lsSet(codeKey(), currentCode()); updateFoot(); }

  // The partner reads the scratchpad on every turn. Say so, and show how much of
  // it is real work — otherwise "your scratchpad rides along" is a claim the
  // learner has no way to check.
  function codeLines() {
    return currentCode().split("\n").filter(function (l) {
      var t = l.trim();
      return t && t.indexOf("#") !== 0 && t.indexOf("//") !== 0;
    }).length;
  }
  function updateFoot() {
    if (S.capped) return;
    var f = el("ccFoot");
    if (!f) return;
    var n = codeLines();
    f.innerHTML = "Enter sends · Shift+Enter for a new line · " + (n
      ? '<b class="cc-attached">the partner can see your ' + S.lang + " scratchpad (" + n + " line" + (n === 1 ? "" : "s") + ")</b>"
      : "your scratchpad goes with every message — it's empty right now");
  }

  // Drop the official starter in once the Worker's brief arrives — but never
  // clobber work in progress. Runs over BOTH languages, not just the visible one:
  // the Java pad is usually still a bare skeleton saved from before the problem
  // bank existed, and it would otherwise never pick up its signature.
  function applyStarter() {
    ["python", "java"].forEach(function (lang) {
      var key = "cc-code-" + S.problem.slug + "-" + lang;
      var saved = lsGet(key);
      var stale = saved == null || !saved.trim() || saved.trim() === fallbackStarter(lang).trim();
      if (!stale) return;                       // real work in there — leave it alone
      var v = starterFor(lang);
      if (lang === S.lang) setCode(v);
      lsSet(key, v);
    });
    updateFoot();
  }

  function mountEditor() {
    S.textarea = el("ccFallback");
    var saved = lsGet(codeKey());
    S.textarea.value = saved == null ? starterFor(S.lang) : saved;
    S.textarea.addEventListener("input", persistCode);

    loadCM().then(function () {
      if (!window.CodeMirror || S.editor) return;
      S.editor = window.CodeMirror.fromTextArea(S.textarea, {
        mode: S.lang === "java" ? "text/x-java" : "python",
        theme: cmTheme(),
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        autoCloseBrackets: true,
        lineWrapping: true,
      });
      S.editor.setSize("100%", "100%");
      S.editor.on("change", persistCode);
    }).catch(function () {
      // CDN blocked — the textarea fallback is already live and persisting.
    });
  }

  function setLang(lang) {
    if (lang === S.lang) return;
    persistCode();
    S.lang = lang;
    el("ccModal").querySelectorAll(".cc-lang").forEach(function (b) {
      b.classList.toggle("on", b.dataset.lang === lang);
    });
    var saved = lsGet(codeKey());
    setCode(saved == null ? starterFor(lang) : saved);
    applyStarter();   // covers a pad saved before the brief (or the bank) existed
    if (S.editor) S.editor.setOption("mode", lang === "java" ? "text/x-java" : "python");
    updateFoot();
  }

  // ---- chat ------------------------------------------------------------------
  function pushMsg(role, text, opts) {
    var log = el("ccLog");
    var d = document.createElement("div");
    d.className = "cc-msg cc-" + role + (opts && opts.sys ? " cc-sys" : "");
    d.innerHTML = (role === "coach" ? '<span class="cc-who">Partner</span>' : "") + "<div>" + fmt(text) + "</div>";
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    if (!(opts && opts.transient)) {
      S.messages.push({ role: role, text: text });
      lsSet(logKey(), JSON.stringify(S.messages.slice(-40)));
    }
    return d;
  }

  function setBusy(on) {
    S.busy = on;
    el("ccSend").disabled = on || S.capped;
    el("ccInput").disabled = S.capped;
  }
  function turnsLabel(left) {
    el("ccTurns").textContent = left == null ? "" : left + " turn" + (left === 1 ? "" : "s") + " left";
  }
  function lockChat(msg) {
    S.capped = true;
    el("ccInput").disabled = true;
    el("ccSend").disabled = true;
    el("ccFoot").textContent = msg;
  }

  function post(path, payload) {
    return fetch(WORKER + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); });
  }

  // Brief without touching the live session — used when reopening a problem that
  // already has a conversation going. Costs nothing server-side.
  function fetchBrief() {
    var idt = ident();
    if (!idt || !idt.code) { briefUnavailable("Sign in with your cohort access code to load this problem."); return Promise.resolve(false); }
    return post("/coach/brief", { passcode: idt.code, slug: S.problem.slug }).then(function (r) {
      if (!r.data || !r.data.ok) { briefUnavailable(); return false; }
      renderBrief(r.data.problem);
      applyStarter();
      return true;
    }).catch(function () { briefUnavailable(); return false; });
  }

  // Never leave the pane sitting on "Loading…" — say what happened and point at
  // the source of truth.
  function briefUnavailable(msg) {
    if (S.brief) return; // a cached brief is already on screen
    el("ccAsk").textContent = msg ||
      "Couldn't load the problem details. Open it on LeetCode with the link above — the partner still works.";
  }

  function startSession() {
    var idt = ident();
    if (!idt || !idt.code) {
      el("ccAsk").textContent = "Sign in with your cohort access code to load this problem and talk it through.";
      pushMsg("coach", "Sign in with your cohort access code to use the thinking partner — the button is in the top-right of the page.", { transient: true, sys: true });
      lockChat("Sign in to start a conversation.");
      return Promise.resolve(false);
    }
    // Slug only. Everything the partner is told about the problem lives server-side.
    return post("/coach/start", { passcode: idt.code, slug: S.problem.slug }).then(function (r) {
      if (!r.data || !r.data.ok) {
        var msg = r.data && r.data.error === "bad_passcode"
          ? "That access code isn't recognized — sign in again from the top-right of the page."
          : "Couldn't reach the partner right now. Your scratchpad still works; try again in a minute.";
        el("ccAsk").textContent = "Couldn't load the problem — open it on LeetCode in the meantime.";
        pushMsg("coach", msg, { transient: true, sys: true });
        lockChat("Partner unavailable.");
        return false;
      }
      S.sessionId = r.data.sessionId;
      saveSession(S.sessionId);
      renderBrief(r.data.problem);
      applyStarter();
      pushMsg("coach", r.data.opening);
      turnsLabel(r.data.messagesLeft);
      return true;
    }).catch(function () {
      el("ccAsk").textContent = "Couldn't load the problem — open it on LeetCode in the meantime.";
      pushMsg("coach", "Couldn't reach the partner (network). Your scratchpad still works.", { transient: true, sys: true });
      lockChat("Partner unavailable.");
      return false;
    });
  }

  function send() {
    if (S.busy || S.capped) return;
    var input = el("ccInput");
    var text = input.value.trim();
    if (!text) return;
    if (!S.sessionId) {
      setBusy(true);
      startSession().then(function (ok) { setBusy(false); if (ok) send(); });
      return;
    }
    input.value = "";
    pushMsg("learner", text);
    setBusy(true);
    var thinking = pushMsg("coach", "…", { transient: true });
    thinking.classList.add("cc-thinking");

    post("/coach/message", {
      sessionId: S.sessionId,
      text: text,
      code: currentCode().slice(0, 4000),
      lang: S.lang,
    }).then(function (r) {
      thinking.remove();
      setBusy(false);
      var d = r.data || {};
      if (!d.ok) {
        if (d.error === "cap_reached") {
          pushMsg("coach", "That's the end of this conversation's runway. Close this and take a real swing at it on LeetCode — that's where the reps count.", { sys: true });
          lockChat("Conversation cap reached for this problem.");
          return;
        }
        if (d.error === "day_cap_reached") {
          pushMsg("coach", "You've used today's partner budget. Come back tomorrow — and in the meantime, the module's reading and video are right there on the page.", { sys: true });
          lockChat("Daily cap reached.");
          return;
        }
        if (d.error === "session_not_found") {
          S.sessionId = null; lsDel(sidKey());
          pushMsg("coach", "That session timed out. Say it again and I'll pick it back up.", { transient: true, sys: true });
          return;
        }
        pushMsg("coach", "Something went sideways on my end. Try that again.", { transient: true, sys: true });
        return;
      }
      pushMsg("coach", d.reply);
      turnsLabel(d.messagesLeft);
      if (d.capped) lockChat("Conversation cap reached for this problem.");
    }).catch(function () {
      thinking.remove();
      setBusy(false);
      pushMsg("coach", "Network hiccup — try that again.", { transient: true, sys: true });
    });
  }

  // ---- open / close ----------------------------------------------------------
  function close() {
    var m = el("ccModal");
    if (!m) return;
    persistCode();
    m.hidden = true;
    document.body.style.overflow = "";
  }

  function open(problem) {
    buildModal();
    S.problem = {
      slug: problem.slug || "",
      name: problem.name || "",
      difficulty: problem.difficulty || "",
      url: problem.url || "",
    };
    S.brief = null;
    S.lang = "python";
    S.capped = false;
    S.busy = false;
    S.messages = [];

    el("ccName").textContent = S.problem.name;
    var diff = el("ccDiff");
    diff.textContent = S.problem.difficulty || "";
    diff.className = "cp-diff " + (/hard/i.test(S.problem.difficulty) ? "h" : /med/i.test(S.problem.difficulty) ? "m" : "e");
    diff.hidden = !S.problem.difficulty;
    el("ccPat").textContent = "";
    el("ccLC").href = S.problem.url || "#";
    el("ccAsk").textContent = "Loading…";
    el("ccExWrap").hidden = true;
    el("ccConsWrap").hidden = true;
    el("ccLog").innerHTML = "";
    el("ccInput").value = "";
    el("ccInput").disabled = false;
    el("ccSend").disabled = false;
    el("ccFoot").textContent = "Enter sends · Shift+Enter for a new line";
    el("ccModal").querySelectorAll(".cc-lang").forEach(function (b) { b.classList.toggle("on", b.dataset.lang === "python"); });
    showPane("chat");

    el("ccModal").hidden = false;
    document.body.style.overflow = "hidden";

    // Paint from the cached brief first (instant on a revisit); the /coach/start
    // response refreshes it. Must run before the editor mounts so the starter
    // signature is available.
    try {
      var cached = JSON.parse(lsGet(briefKey()) || "null");
      if (cached) renderBrief(cached);
    } catch (e) {}

    if (!S.editor && !S.textarea) mountEditor();
    else {
      var saved = lsGet(codeKey());
      setCode(saved == null ? starterFor(S.lang) : saved);
      if (S.editor) { S.editor.setOption("theme", cmTheme()); S.editor.refresh(); }
    }

    // Replay a stored transcript if the session is still live; otherwise start
    // clean. Either way we re-fetch the brief so the problem pane is populated.
    var sid = loadSession();
    var stored = [];
    try { stored = JSON.parse(lsGet(logKey()) || "[]"); } catch (e) { stored = []; }
    if (sid && stored.length) {
      S.sessionId = sid;
      S.messages = stored;
      stored.forEach(function (m) { pushMsg(m.role, m.text, { transient: true }); });
      turnsLabel(null);
      // The live session is untouched; this just fills the problem pane and the
      // starter signature, which the conversation itself never carries.
      fetchBrief();
      el("ccInput").focus();
    } else {
      S.sessionId = null;
      lsDel(logKey());
      startSession().then(function () { el("ccInput").focus(); });
    }
    updateFoot();
  }

  window.FDE_openCoach = open;
})();
