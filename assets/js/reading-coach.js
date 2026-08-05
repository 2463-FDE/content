/* reading-coach.js — the per-reading study assistant.
 *
 * Every daily reading page gets two things from this file:
 *
 *   1. A DELIVERY BLOCK near the end of the reading column: one big highlighted
 *      button that hands the learner a paste-ready Claude Code prompt for TODAY'S
 *      material, aimed at whatever repo they're already working in. The generic
 *      version is generated server-side once per page and cached for the whole
 *      cohort; a learner who wants it aimed at their own project gets a custom
 *      one out of the conversation.
 *
 *   2. An ASSISTANT the learner can talk to about the reading itself. It is
 *      grounded in this page's text — which the Worker fetches server-side from
 *      the published page, so nothing here ships page content to the model — and
 *      it can pull an earlier reading into context when the question reaches
 *      back ("how does this relate to the chunking stuff in week 2?").
 *
 * Sibling of coding-coach.js and the same shape: server-side context, curated
 * (free) opening, per-session + per-day caps enforced by the Worker, transcript
 * replayed from localStorage.
 *
 * Dependencies: none. roster.js for window.FDE_RUN_URL, auth.js for the identity.
 * Load AFTER day-summary.js — the delivery block inserts itself above the
 * "Summarize Your Day" section, which day-summary.js appends on DOM ready.
 *
 * Persistence (localStorage, per reading id):
 *   rc-log-<id>      transcript [{role,text}]
 *   rc-sid-<id>      {id, at} — dropped after 6h to match the Worker's TTL
 *   rc-prompt-<id>   the generic delivery prompt (paints instantly on a revisit)
 */
(function () {
  "use strict";

  var WORKER = (window.FDE_RUN_URL || "https://fde-backend.jestercharles.workers.dev").replace(/\/$/, "");
  var SESSION_MAX_AGE = 6 * 60 * 60 * 1000; // matches READING_TTL_SECONDS

  var S = {
    id: "",          // reading id, e.g. "w05d3" / "w01d2a"
    title: "",
    concepts: [],
    sessionId: null,
    busy: false,
    capped: false,
    started: false,  // the modal has opened once — don't re-replay the transcript
    messages: [],
    prompt: null,    // {text, kind}
  };

  // ---- storage ---------------------------------------------------------------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function ident() {
    try { return window.FDE_getIdentity ? window.FDE_getIdentity() : JSON.parse(lsGet("fde_identity") || "null"); }
    catch (e) { return null; }
  }

  function logKey() { return "rc-log-" + S.id; }
  function sidKey() { return "rc-sid-" + S.id; }
  function promptKey() { return "rc-prompt-" + S.id; }

  function loadSession() {
    try {
      var rec = JSON.parse(lsGet(sidKey()) || "null");
      if (rec && rec.id && Date.now() - rec.at < SESSION_MAX_AGE) return rec.id;
    } catch (e) {}
    lsDel(sidKey());
    return null;
  }
  function saveSession(id) { lsSet(sidKey(), JSON.stringify({ id: id, at: Date.now() })); }

  // ---- page identity ---------------------------------------------------------
  // Mirrors the id rule in the Worker's reading-index generator: the filename
  // stem, prefixed with its week directory when the stem doesn't already carry
  // one (w01 pages are d1.html / d2a.html; every later week is w0Nd1.html).
  function readingIdFromPath() {
    var parts = location.pathname.split("/").filter(Boolean);
    var stem = (parts.pop() || "").replace(/\.html$/, "");
    var week = parts.pop() || "";
    if (!/^w\d\d$/.test(week) || !stem) return "";
    return /^w\d\d/.test(stem) ? stem : week + stem;
  }

  function meta(n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.getAttribute("content") : ""; }
  function el(id) { return document.getElementById(id); }

  // ---- rendering -------------------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // This assistant is a tutor, not the coding-prep sounding board — code is a
  // legitimate answer here, so fenced blocks render as blocks instead of being
  // stripped.
  function fmt(s) {
    var parts = String(s == null ? "" : s).split(/```/);
    var out = "";
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        out += '<pre class="rc-code">' + esc(parts[i].replace(/^[a-z]*\n/i, "")) + "</pre>";
      } else {
        out += esc(parts[i])
          .replace(/`([^`\n]{1,80})`/g, "<code>$1</code>")
          .replace(/\*\*([^*\n]{1,120})\*\*/g, "<b>$1</b>")
          .replace(/\n/g, "<br>");
      }
    }
    return out;
  }

  function copyText(text, btn) {
    var done = function () {
      var was = btn.textContent;
      btn.textContent = "✓ Copied";
      btn.classList.add("is-copied");
      setTimeout(function () { btn.textContent = was; btn.classList.remove("is-copied"); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---- the offline template --------------------------------------------------
  // What the button hands over when the learner isn't signed in or the Worker is
  // unreachable. Built from the page itself — its title, its concept tags and its
  // section headings — so it is still specific to today, just less sharp than the
  // generated one. Same six-part shape the Worker's generator is told to follow.
  function fallbackPrompt() {
    var headings = [].slice.call(document.querySelectorAll(".reading-col .step h2"))
      .map(function (h) { return h.textContent.trim(); }).filter(Boolean).slice(0, 8);
    var concepts = S.concepts.map(function (c) { return c.replace(/-/g, " "); });
    var lines = [
      "I just finished a training reading and I want to apply it to this codebase today.",
      "",
      "Reading: " + S.title,
      concepts.length ? "Techniques it covered: " + concepts.join(", ") : null,
      headings.length ? "Sections: " + headings.join(" · ") : null,
      "",
      "Do this, in order:",
      "1. Orient yourself in this repo first — read the README, the entry points, and any AI/agent config already here. Tell me in three lines what this project is and where the relevant code lives. Ask me before assuming a stack.",
      "2. Find the place in this codebase where the techniques above are most relevant — either already implemented (possibly badly) or conspicuously missing.",
      "3. Propose the smallest change that puts one of those techniques into real use here. One technique, not all of them.",
      "4. Produce a concrete artifact for it — a file, a test, a doc, or a diff. Not a list of suggestions.",
      "5. Tell me how I can check it worked: the command to run, the output to expect, or the assertion that should now pass.",
      "",
      "Before making sweeping changes, ask me any question whose answer would change your approach.",
    ];
    return lines.filter(function (l) { return l !== null; }).join("\n");
  }

  // ---- network ---------------------------------------------------------------
  function post(path, payload) {
    return fetch(WORKER + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); });
  }

  // ---- delivery block (in the reading column) --------------------------------
  function buildDeliveryBlock() {
    var col = document.querySelector(".reading-col");
    if (!col || col.querySelector(".rc-deliver")) return;

    var wrap = document.createElement("section");
    wrap.className = "rc-deliver";
    wrap.setAttribute("aria-label", "Use this reading today");
    wrap.innerHTML =
      '<div class="rc-k">Use this today</div>' +
      "<h2>Put this reading to work before you forget it</h2>" +
      '<p class="rc-sub">Reading it once is not learning it. This is a ready-to-paste Claude Code prompt that ' +
      "takes today's patterns into a repo you're already working in — orient, find the spot, produce one real " +
      "artifact, check that it worked.</p>" +
      '<button class="rc-cta" id="rcCta">⚡ Get today\'s delivery prompt</button>' +
      '<div class="rc-cta-sub">Want it aimed at <em>your</em> project? ' +
      '<button class="rc-link" id="rcCtaChat">Talk it through with the assistant</button> and it\'ll write you a custom one.</div>';

    var summary = col.querySelector(".day-summary");
    if (summary) col.insertBefore(wrap, summary); else col.appendChild(wrap);

    el("rcCta").addEventListener("click", function () { open("prompt"); });
    el("rcCtaChat").addEventListener("click", function () { open("chat"); });
  }

  function buildFab() {
    if (el("rcFab")) return;
    var b = document.createElement("button");
    b.id = "rcFab";
    b.className = "rc-fab";
    b.type = "button";
    b.innerHTML = '<span aria-hidden="true">✳</span> Ask about this reading';
    b.addEventListener("click", function () { open("chat"); });
    document.body.appendChild(b);
  }

  // ---- modal -----------------------------------------------------------------
  function buildModal() {
    if (el("rcModal")) return;
    var wrap = document.createElement("div");
    wrap.className = "rc-overlay";
    wrap.id = "rcModal";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="rc-shell" role="dialog" aria-modal="true" aria-label="Reading assistant">' +
        '<header class="rc-top">' +
          '<div class="rc-id"><span class="rc-name" id="rcName"></span><span class="rc-week" id="rcWeek"></span></div>' +
          '<div class="rc-actions"><span class="rc-turns" id="rcTurns"></span>' +
            '<button class="rc-x" id="rcX" aria-label="Close">✕</button></div>' +
        "</header>" +
        '<div class="rc-tabbar" id="rcTabs">' +
          '<button class="rc-tab on" data-pane="chat">Ask</button>' +
          '<button class="rc-tab" data-pane="prompt">Delivery prompt</button>' +
        "</div>" +
        '<div class="rc-panes">' +
          '<section class="rc-pane rc-chat on" data-pane="chat">' +
            '<div class="rc-log" id="rcLog"></div>' +
            '<div class="rc-composer">' +
              '<textarea id="rcInput" rows="2" placeholder="Ask anything about this reading — or how it connects to an earlier week."></textarea>' +
              '<button id="rcSend">Send</button>' +
            "</div>" +
            '<div class="rc-foot" id="rcFoot">Enter sends · Shift+Enter for a new line · grounded in this page\'s text</div>' +
          "</section>" +
          '<section class="rc-pane rc-prompt" data-pane="prompt">' +
            '<div class="rc-ph">Delivery prompt <span class="rc-kind" id="rcKind"></span></div>' +
            '<p class="rc-phsub">Paste this into Claude Code inside a project you already have open.</p>' +
            '<pre class="rc-promptbox" id="rcPromptBox">Loading…</pre>' +
            '<div class="rc-prow">' +
              '<button class="rc-copy" id="rcCopy">Copy prompt</button>' +
              '<button class="rc-alt" id="rcCustom">Customize for my project</button>' +
            "</div>" +
            '<div class="rc-custom" id="rcCustomWrap" hidden>' +
              '<label for="rcCustomNote">What are you working on? Stack, repo, what you\'re trying to ship.</label>' +
              '<textarea id="rcCustomNote" rows="3" placeholder="e.g. a FastAPI service with a Postgres store; I\'m adding a retrieval endpoint this week"></textarea>' +
              '<button class="rc-alt" id="rcCustomGo">Write me a custom prompt</button>' +
            "</div>" +
            '<div class="rc-pnote" id="rcPNote"></div>' +
          "</section>" +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);

    el("rcX").addEventListener("click", close);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !wrap.hidden) close();
    });
    el("rcTabs").addEventListener("click", function (e) {
      var b = e.target.closest(".rc-tab");
      if (b) showPane(b.dataset.pane);
    });
    el("rcSend").addEventListener("click", send);
    el("rcInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    el("rcCopy").addEventListener("click", function () {
      copyText(el("rcPromptBox").textContent, el("rcCopy"));
    });
    el("rcCustom").addEventListener("click", function () {
      var w = el("rcCustomWrap");
      w.hidden = !w.hidden;
      if (!w.hidden) el("rcCustomNote").focus();
    });
    el("rcCustomGo").addEventListener("click", customPrompt);
  }

  function showPane(name) {
    var wrap = el("rcModal");
    wrap.querySelectorAll(".rc-tab").forEach(function (t) { t.classList.toggle("on", t.dataset.pane === name); });
    wrap.querySelectorAll(".rc-pane").forEach(function (p) { p.classList.toggle("on", p.dataset.pane === name); });
    if (name === "prompt") loadPrompt();
    if (name === "chat") el("rcInput").focus();
  }

  // ---- chat ------------------------------------------------------------------
  function pushMsg(role, text, opts) {
    var log = el("rcLog");
    var d = document.createElement("div");
    d.className = "rc-msg rc-" + role + (opts && opts.sys ? " rc-sys" : "");
    d.innerHTML = (role === "assistant" ? '<span class="rc-who">Assistant</span>' : "") + "<div>" + fmt(text) + "</div>";
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    if (!(opts && opts.transient)) {
      S.messages.push({ role: role, text: text });
      lsSet(logKey(), JSON.stringify(S.messages.slice(-40)));
    }
    return d;
  }

  // A pulled prior reading is worth showing: it's the assistant doing retrieval
  // on the learner's behalf, and this cohort is literally being taught how that
  // works. Silent context loading would waste the teaching moment.
  function noteLoaded(ids) {
    if (!ids || !ids.length) return;
    var d = document.createElement("div");
    d.className = "rc-loaded";
    d.textContent = "↺ pulled in " + ids.join(", ") + " to answer that";
    el("rcLog").appendChild(d);
  }

  function setBusy(on) {
    S.busy = on;
    el("rcSend").disabled = on || S.capped;
    el("rcInput").disabled = S.capped;
  }
  function turnsLabel(left) {
    el("rcTurns").textContent = left == null ? "" : left + " turn" + (left === 1 ? "" : "s") + " left";
  }
  function lockChat(msg) {
    S.capped = true;
    el("rcInput").disabled = true;
    el("rcSend").disabled = true;
    el("rcFoot").textContent = msg;
  }

  function startSession() {
    var idt = ident();
    if (!idt || !idt.code) {
      pushMsg("assistant", "Sign in with your cohort access code to talk about this reading — the button is in the top-right of the page. The delivery prompt tab still works without it.", { transient: true, sys: true });
      lockChat("Sign in to start a conversation.");
      return Promise.resolve(false);
    }
    return post("/reading/start", { passcode: idt.code, reading: S.id }).then(function (r) {
      if (!r.data || !r.data.ok) {
        var msg = r.data && r.data.error === "bad_passcode"
          ? "That access code isn't recognized — sign in again from the top-right of the page."
          : "Couldn't reach the assistant right now. The reading and the delivery prompt still work; try again in a minute.";
        pushMsg("assistant", msg, { transient: true, sys: true });
        lockChat("Assistant unavailable.");
        return false;
      }
      S.sessionId = r.data.sessionId;
      saveSession(S.sessionId);
      if (r.data.reading) {
        S.title = r.data.reading.title || S.title;
        el("rcName").textContent = S.title;
        el("rcWeek").textContent = r.data.reading.weekTitle
          ? "Week " + parseInt(String(r.data.reading.week).slice(1), 10) + " · " + r.data.reading.weekTitle : "";
      }
      pushMsg("assistant", r.data.opening);
      turnsLabel(r.data.messagesLeft);
      return true;
    }).catch(function () {
      pushMsg("assistant", "Couldn't reach the assistant (network). The delivery prompt tab still works.", { transient: true, sys: true });
      lockChat("Assistant unavailable.");
      return false;
    });
  }

  function send() {
    if (S.busy || S.capped) return;
    var input = el("rcInput");
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
    var thinking = pushMsg("assistant", "…", { transient: true });
    thinking.classList.add("rc-thinking");

    post("/reading/message", { sessionId: S.sessionId, text: text }).then(function (r) {
      thinking.remove();
      setBusy(false);
      var d = r.data || {};
      if (!d.ok) {
        if (d.error === "cap_reached") {
          pushMsg("assistant", "That's this conversation's runway. Reload the page to start a fresh one — and take the comprehension check while it's still warm.", { sys: true });
          lockChat("Conversation cap reached for this reading.");
          return;
        }
        if (d.error === "day_cap_reached") {
          pushMsg("assistant", "You've used today's assistant budget. The reading, the prompt and the check are all still here.", { sys: true });
          lockChat("Daily cap reached.");
          return;
        }
        if (d.error === "session_not_found") {
          S.sessionId = null; lsDel(sidKey());
          pushMsg("assistant", "That session timed out. Say it again and I'll pick it back up.", { transient: true, sys: true });
          return;
        }
        pushMsg("assistant", "Something went sideways on my end. Try that again.", { transient: true, sys: true });
        return;
      }
      pushMsg("assistant", d.reply);
      noteLoaded(d.loaded);
      turnsLabel(d.messagesLeft);
      if (d.capped) lockChat("Conversation cap reached for this reading.");
    }).catch(function () {
      thinking.remove();
      setBusy(false);
      pushMsg("assistant", "Network hiccup — try that again.", { transient: true, sys: true });
    });
  }

  // ---- delivery prompt -------------------------------------------------------
  function renderPrompt(text, kind, note) {
    S.prompt = { text: text, kind: kind };
    el("rcPromptBox").textContent = text;
    el("rcKind").textContent = kind === "custom" ? "· customized for you"
      : kind === "offline" ? "· offline template" : "· today's reading";
    el("rcPNote").textContent = note || "";
  }

  function loadPrompt() {
    if (S.prompt) return;                       // already painted this visit
    var cached = lsGet(promptKey());
    if (cached) renderPrompt(cached, "generic");

    var idt = ident();
    if (!idt || !idt.code) {
      renderPrompt(fallbackPrompt(), "offline",
        "Sign in with your cohort code for the version generated from today's actual reading.");
      return;
    }
    if (!cached) el("rcPromptBox").textContent = "Writing today's prompt…";
    post("/reading/prompt", { passcode: idt.code, reading: S.id }).then(function (r) {
      var d = r.data || {};
      if (!d.ok || !d.prompt) {
        if (!cached) renderPrompt(fallbackPrompt(), "offline",
          d.error === "day_cap_reached" ? "Today's assistant budget is used up — here's the offline template."
            : "Couldn't reach the generator, so here's the offline template.");
        return;
      }
      renderPrompt(d.prompt, "generic");
      lsSet(promptKey(), d.prompt);
    }).catch(function () {
      if (!cached) renderPrompt(fallbackPrompt(), "offline", "Couldn't reach the generator, so here's the offline template.");
    });
  }

  function customPrompt() {
    var note = el("rcCustomNote").value.trim();
    var go = el("rcCustomGo");
    var idt = ident();
    if (!idt || !idt.code) {
      el("rcPNote").textContent = "Sign in with your cohort access code to get a customized prompt.";
      return;
    }
    var run = function () {
      go.disabled = true;
      go.textContent = "Writing…";
      post("/reading/prompt/custom", { sessionId: S.sessionId, note: note }).then(function (r) {
        go.disabled = false;
        go.textContent = "Write me a custom prompt";
        var d = r.data || {};
        if (!d.ok || !d.prompt) {
          el("rcPNote").textContent = d.error === "day_cap_reached"
            ? "Today's assistant budget is used up — the generic prompt above still works."
            : "Couldn't write a custom one just now. The generic prompt above still works.";
          return;
        }
        renderPrompt(d.prompt, "custom",
          "Built from what you told the assistant. The generic version is one page reload away.");
        el("rcCustomWrap").hidden = true;
      }).catch(function () {
        go.disabled = false;
        go.textContent = "Write me a custom prompt";
        el("rcPNote").textContent = "Network hiccup — try that again.";
      });
    };
    // The custom prompt is written from the conversation, so it needs a session.
    if (!S.sessionId) startSession().then(function (ok) { if (ok) run(); }); else run();
  }

  // ---- open / close ----------------------------------------------------------
  function close() {
    var m = el("rcModal");
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = "";
  }

  function open(tab) {
    buildModal();
    el("rcName").textContent = S.title;
    // The page's own "Week 5 · Day 3" line. /reading/start sends a richer label,
    // but a replayed transcript never calls it — so seed from the page first.
    if (!el("rcWeek").textContent) {
      var m = document.querySelector(".lede .meta span");
      if (m) el("rcWeek").textContent = m.textContent.trim();
    }
    el("rcModal").hidden = false;
    document.body.style.overflow = "hidden";
    showPane(tab || "chat");
    // Wide viewports show both panes at once and hide the tab bar, so the prompt
    // rail would sit on "Loading…" forever if it only filled on a tab click.
    loadPrompt();

    if (S.started) return;
    S.started = true;

    // Replay a stored transcript if the session is still live; otherwise open
    // clean with the curated (free) opening.
    var sid = loadSession();
    var stored = [];
    try { stored = JSON.parse(lsGet(logKey()) || "[]"); } catch (e) { stored = []; }
    if (sid && stored.length) {
      S.sessionId = sid;
      S.messages = stored;
      stored.forEach(function (m) { pushMsg(m.role, m.text, { transient: true }); });
      turnsLabel(null);
    } else {
      S.sessionId = null;
      lsDel(logKey());
      startSession();
    }
  }

  function init() {
    S.id = readingIdFromPath();
    if (!S.id || !document.querySelector(".reading-col")) return;   // not a reading page
    var h1 = document.querySelector(".lede h1");
    S.title = h1 ? h1.textContent.trim() : document.title;
    S.concepts = (meta("fde-concepts") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    buildDeliveryBlock();
    buildFab();
    window.FDE_openReading = open;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
