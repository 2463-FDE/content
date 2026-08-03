/* coding-coach.js — the coding-prep "thinking partner".
 *
 * Opens a LeetCode-shaped modal for one problem: statement pane, code scratchpad
 * (CodeMirror 5, Python or Java), and a chat pane wired to the Worker's /coach/*
 * routes. The agent on the other end is a SOUNDING BOARD — it never returns code.
 * The scratchpad is a scratchpad: nothing here executes, learners still run and
 * submit on LeetCode. Its job is to give the partner something concrete to react to.
 *
 * Public API:  window.FDE_openCoach({ slug, name, pattern, difficulty, url })
 *
 * Dependencies: none at load time. CodeMirror is lazy-loaded from cdnjs on first
 * open, so the page's cold load is untouched; if the CDN is blocked we fall back
 * to a plain <textarea> and everything else still works.
 *
 * Persistence (localStorage, per problem slug):
 *   cc-code-<slug>-<lang>   scratchpad text
 *   cc-stmt-<slug>          pasted problem statement
 *   cc-log-<slug>           transcript [{role,text}]
 *   cc-sid-<slug>           {id, at} — dropped after 6h to match the Worker's TTL
 */
(function () {
  "use strict";

  var WORKER = (window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev").replace(/\/$/, "");
  var CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";
  var SESSION_MAX_AGE = 6 * 60 * 60 * 1000; // matches COACH_TTL_SECONDS

  // Starter scratchpad = the UMPIRE skeleton the page's readings teach (plan
  // comments first, code second). Deliberately contains no problem-specific hint.
  var STARTERS = {
    python:
      "# U — restate the problem in your own words (input, output, one edge case):\n" +
      "#\n" +
      "# M — what pattern does this match, and why that one?\n" +
      "#\n" +
      "# P — plan, in plain steps:\n" +
      "#   1.\n" +
      "#   2.\n" +
      "#\n" +
      "# I — implement below.\n\n",
    java:
      "// U — restate the problem in your own words (input, output, one edge case):\n" +
      "//\n" +
      "// M — what pattern does this match, and why that one?\n" +
      "//\n" +
      "// P — plan, in plain steps:\n" +
      "//   1.\n" +
      "//   2.\n" +
      "//\n" +
      "// I — implement below.\n\n",
  };

  var S = {
    problem: null,
    sessionId: null,
    lang: "python",
    busy: false,
    capped: false,
    editor: null,      // CodeMirror instance, or null when using the textarea fallback
    textarea: null,
    messages: [],
  };

  // ---- storage helpers -------------------------------------------------------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function ident() {
    try { return window.FDE_getIdentity ? window.FDE_getIdentity() : JSON.parse(lsGet("fde_identity") || "null"); }
    catch (e) { return null; }
  }

  function codeKey() { return "cc-code-" + S.problem.slug + "-" + S.lang; }
  function stmtKey() { return "cc-stmt-" + S.problem.slug; }
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
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // Chat is plain text plus short `inline` spans (the Worker strips code blocks
  // before they ever reach us, so there is no block-level code path to render).
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
            '<div class="cc-ph">The problem</div>' +
            '<p class="cc-note">Paste the statement here if you want the partner to be exact about the wording. Optional — it knows most of these by name.</p>' +
            '<textarea class="cc-stmt" id="ccStmt" placeholder="Paste the LeetCode problem statement (optional)"></textarea>' +
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
      var b = e.target.closest(".cc-tab"); if (!b) return;
      showPane(b.dataset.pane);
    });

    wrap.querySelectorAll(".cc-lang").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.dataset.lang); });
    });

    el("ccStmt").addEventListener("input", function () { lsSet(stmtKey(), el("ccStmt").value); });
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

  // ---- editor ----------------------------------------------------------------
  function currentCode() {
    if (S.editor) return S.editor.getValue();
    return S.textarea ? S.textarea.value : "";
  }
  function setCode(v) {
    if (S.editor) S.editor.setValue(v); else if (S.textarea) S.textarea.value = v;
  }
  function persistCode() { lsSet(codeKey(), currentCode()); }

  function mountEditor() {
    var host = el("ccEdWrap");
    S.textarea = el("ccFallback");
    var saved = lsGet(codeKey());
    var initial = saved == null ? STARTERS[S.lang] : saved;
    S.textarea.value = initial;
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
      host.classList.add("cm-live");
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
    setCode(saved == null ? STARTERS[lang] : saved);
    if (S.editor) S.editor.setOption("mode", lang === "java" ? "text/x-java" : "python");
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

  function startSession() {
    var idt = ident();
    if (!idt || !idt.code) {
      pushMsg("coach", "Sign in with your cohort access code to use the thinking partner — the button is in the top-right of the page.", { transient: true, sys: true });
      lockChat("Sign in to start a conversation.");
      return Promise.resolve(false);
    }
    return post("/coach/start", {
      passcode: idt.code,
      problem: {
        slug: S.problem.slug,
        name: S.problem.name,
        pattern: S.problem.pattern,
        difficulty: S.problem.difficulty,
        statement: el("ccStmt").value.slice(0, 6000),
      },
    }).then(function (r) {
      if (!r.data || !r.data.ok) {
        var msg = r.data && r.data.error === "bad_passcode"
          ? "That access code isn't recognized — sign in again from the top-right of the page."
          : "Couldn't reach the partner right now. Your scratchpad still works; try again in a minute.";
        pushMsg("coach", msg, { transient: true, sys: true });
        lockChat("Partner unavailable.");
        return false;
      }
      S.sessionId = r.data.sessionId;
      saveSession(S.sessionId);
      pushMsg("coach", r.data.opening);
      turnsLabel(r.data.messagesLeft);
      return true;
    }).catch(function () {
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
      // Session expired mid-visit — restart transparently, then send.
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
      statement: el("ccStmt").value.slice(0, 6000),
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
      pattern: problem.pattern || "",
      difficulty: problem.difficulty || "",
      url: problem.url || "",
    };
    S.lang = "python";
    S.capped = false;
    S.busy = false;
    S.messages = [];

    el("ccName").textContent = S.problem.name;
    var diff = el("ccDiff");
    diff.textContent = S.problem.difficulty || "";
    diff.className = "cp-diff " + (/hard/i.test(S.problem.difficulty) ? "h" : /med/i.test(S.problem.difficulty) ? "m" : "e");
    diff.hidden = !S.problem.difficulty;
    el("ccPat").textContent = S.problem.pattern || "";
    el("ccLC").href = S.problem.url || "#";
    el("ccStmt").value = lsGet(stmtKey()) || "";
    el("ccLog").innerHTML = "";
    el("ccInput").value = "";
    el("ccInput").disabled = false;
    el("ccSend").disabled = false;
    el("ccFoot").textContent = "Enter sends · Shift+Enter for a new line · your scratchpad rides along";
    el("ccModal").querySelectorAll(".cc-lang").forEach(function (b) { b.classList.toggle("on", b.dataset.lang === "python"); });
    showPane("chat");

    el("ccModal").hidden = false;
    document.body.style.overflow = "hidden";

    if (!S.editor && !S.textarea) mountEditor();
    else { var saved = lsGet(codeKey()); setCode(saved == null ? STARTERS[S.lang] : saved); if (S.editor) { S.editor.setOption("theme", cmTheme()); S.editor.refresh(); } }

    // Replay a stored transcript if the session is still live; otherwise start clean.
    var sid = loadSession();
    var stored = [];
    try { stored = JSON.parse(lsGet(logKey()) || "[]"); } catch (e) { stored = []; }
    if (sid && stored.length) {
      S.sessionId = sid;
      S.messages = stored;
      stored.forEach(function (m) { pushMsg(m.role, m.text, { transient: true }); });
      turnsLabel(null);
      el("ccInput").focus();
    } else {
      S.sessionId = null;
      lsDel(logKey());
      startSession().then(function () { el("ccInput").focus(); });
    }
  }

  window.FDE_openCoach = open;
})();
