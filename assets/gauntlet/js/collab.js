// collab.js — Collaborator Chat (Feature 2), front end.
//
// A teammate messages the learner about the week/day's material — but they've got
// something wrong. The learner has to coach them through it in chat. Reuses the
// System Design chat shell (.sd-chat* classes) for a consistent look, and ADDS a
// small, self-contained markdown/code-block renderer (the SD chat renders plain
// text only, so legible fenced code — a hard requirement here — is net-new).
//
// Exposes window.COLLAB.open(creds, onExit). Renders into <main id="app"> the same
// way window.DESIGN does. Pure vanilla JS; relies on window.API + window.STT.
(function () {
  "use strict";

  var S = { name: null, passcode: null, tier: null, onExit: null, sessionId: null, canFinish: false, busy: false };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function app() { return $("#app"); }
  function toast(m, k) { if (typeof window.showToast === "function") window.showToast(m, k || "error"); }

  // ---- markdown / code rendering ------------------------------------------
  // Renders a chat message into DOM: fenced ```lang code``` → <pre><code> blocks
  // (monospace, legible, with a language tag + copy button), inline `code` spans,
  // everything else as text with newlines preserved. Everything goes through
  // textContent, so it is XSS-safe by construction (no innerHTML of message text).
  function renderMessage(text) {
    var frag = document.createDocumentFragment();
    var src = String(text == null ? "" : text);
    var fence = /```([\w+-]*)[ \t]*\r?\n?([\s\S]*?)```/g;
    var last = 0, m;
    while ((m = fence.exec(src)) !== null) {
      if (m.index > last) appendProse(frag, src.slice(last, m.index));
      frag.appendChild(codeBlock(m[1] || "", m[2] || ""));
      last = fence.lastIndex;
    }
    if (last < src.length) appendProse(frag, src.slice(last));
    return frag;
  }

  function codeBlock(lang, code) {
    var cleaned = code.replace(/\s+$/, "");
    var pre = el("pre", { class: "chat-code" });
    var head = el("div", { class: "chat-code-head" }, [
      el("span", { class: "chat-code-lang", text: (lang || "code").toLowerCase() })
    ]);
    var copy = el("button", { class: "chat-code-copy", type: "button", text: "Copy" });
    copy.addEventListener("click", function () {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(cleaned);
        copy.textContent = "Copied";
        setTimeout(function () { copy.textContent = "Copy"; }, 1400);
      } catch (e) { /* no-op */ }
    });
    head.appendChild(copy);
    pre.appendChild(head);
    pre.appendChild(el("code", { class: "chat-code-body", text: cleaned }));
    return pre;
  }

  // Prose segment: split into paragraphs on blank lines; within a paragraph,
  // preserve single newlines and render inline `code` spans.
  function appendProse(frag, text) {
    var trimmed = text.replace(/^\n+/, "").replace(/\n+$/, "");
    if (!trimmed) return;
    trimmed.split(/\n{2,}/).forEach(function (para) {
      if (!para.trim()) return;
      var p = el("div", { class: "chat-md-p" });
      inlineCode(p, para);
      frag.appendChild(p);
    });
  }
  function inlineCode(container, text) {
    var parts = String(text).split(/(`[^`]+`)/);
    parts.forEach(function (part) {
      if (!part) return;
      if (part.length > 1 && part.charAt(0) === "`" && part.charAt(part.length - 1) === "`") {
        container.appendChild(el("code", { class: "chat-inline-code", text: part.slice(1, -1) }));
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  // ---- header -------------------------------------------------------------
  function topbar(title, subtitle) {
    var back = el("button", { class: "btn btn--ghost", type: "button", text: "← Modes" });
    back.addEventListener("click", function () { if (typeof S.onExit === "function") S.onExit(); });
    return el("div", { class: "sd-topbar" }, [
      el("div", {}, [
        el("h1", { class: "sd-topbar-title", text: title }),
        subtitle ? el("p", { class: "sd-sub", text: subtitle }) : null
      ]),
      back
    ]);
  }

  // ---- material selector (mirrors the AI-interview week/day picker) --------
  function weekList() {
    var seen = {}, out = [];
    (window.FDE_CURRICULUM_DAYS || []).forEach(function (d) {
      var w = d.v.slice(0, 3);
      if (!seen[w]) { seen[w] = true; out.push({ w: w, label: "Week " + parseInt(w.slice(1), 10) }); }
    });
    return out;
  }
  function daysOfWeek(w) {
    return (window.FDE_CURRICULUM_DAYS || []).filter(function (d) { return d.v.slice(0, 3) === w; });
  }

  // ---- intro (pick material) ----------------------------------------------
  function renderIntro() {
    window.STT && window.STT.tts && window.STT.tts.cancel && window.STT.tts.cancel();
    var root = app();
    clear(root);

    if (!S.selWeek) S.selWeek = (window.FDE_DEFAULT_DAY || "w01d5").slice(0, 3);
    if (!Array.isArray(S.selDays)) S.selDays = [];

    var weekSel = el("select", { class: "field", id: "collabWeek" });
    weekList().forEach(function (wk) { weekSel.appendChild(el("option", { value: wk.w, text: wk.label })); });
    weekSel.value = S.selWeek;

    var dayChips = el("div", { class: "iv-daychips", id: "collabDayChips" });
    var scopeHint = el("p", { class: "iv-scope-hint", id: "collabScopeHint" });

    function syncHint() {
      scopeHint.textContent = S.selDays.length
        ? (S.selDays.length + " day" + (S.selDays.length === 1 ? "" : "s") + " selected — your teammate's issue comes from this material.")
        : "Whole week (default) — a teammate scenario drawn from anywhere this week.";
    }
    function rebuildChips() {
      clear(dayChips);
      daysOfWeek(S.selWeek).forEach(function (d) {
        var on = S.selDays.indexOf(d.v) >= 0;
        var chip = el("button", { class: "iv-chip" + (on ? " is-on" : ""), type: "button", "aria-pressed": on ? "true" : "false", text: "Day " + d.v.slice(4).replace(/^d/, "") });
        chip.addEventListener("click", function () {
          var i = S.selDays.indexOf(d.v);
          if (i >= 0) S.selDays.splice(i, 1); else S.selDays.push(d.v);
          rebuildChips(); syncHint();
        });
        dayChips.appendChild(chip);
      });
    }
    weekSel.addEventListener("change", function () { S.selWeek = weekSel.value; S.selDays = []; rebuildChips(); syncHint(); });
    rebuildChips(); syncHint();

    var startBtn = el("button", { class: "btn btn--primary btn--lg", type: "button", text: "Start the chat" });
    startBtn.addEventListener("click", function () {
      var days = S.selDays.length ? S.selDays.slice() : daysOfWeek(S.selWeek).map(function (d) { return d.v; });
      startSession({ days: days });
    });

    var card = el("div", { class: "card screen-in" }, [
      el("h2", { class: "panel-title", text: "How this works" }),
      el("ul", { class: "how-list" }, [
        el("li", { text: "A teammate will message you about the week's material — and they've got something wrong or stuck." }),
        el("li", { text: "Chat back and forth to help them see it. Ask questions, explain clearly, share a resource or a small code fix." }),
        el("li", { text: "You're scored on the QUALITY of the collaboration — clarity, curiosity, resourcefulness, sincerity — not how fast you “win.”" }),
        el("li", { text: "Keep it under ~20 messages. Wrap up when it feels resolved, then hit Finish for feedback." })
      ]),
      el("div", { class: "iv-config" }, [
        el("div", { class: "iv-config-cols" }, [
          el("div", { class: "iv-config-row iv-config-col--week" }, [
            el("label", { class: "field-label", for: "collabWeek", text: "Week" }),
            weekSel
          ]),
          el("div", { class: "iv-config-row iv-config-col--days" }, [
            el("label", { class: "field-label", text: "Days (optional — leave empty for the whole week)" }),
            dayChips,
            scopeHint
          ])
        ])
      ]),
      el("div", { class: "lobby-actions" }, [startBtn])
    ]);
    root.appendChild(el("div", { class: "screen" }, [topbar("Collaborator Chat", "Coach a teammate through the week's material."), card]));
  }

  function startSession(sel) {
    var root = app();
    clear(root);
    root.appendChild(el("div", { class: "screen" }, [
      topbar("Collaborator Chat", null),
      el("div", { class: "card screen-in" }, [el("p", { class: "sd-sub", text: "Your teammate is typing…" })])
    ]));
    window.API.collabStart(S.name, S.passcode, sel)
      .then(function (data) {
        if (data && data.ok) { S.sessionId = data.sessionId; renderChat(data); }
        else if (data && data.error === "cap_reached") { toast("You've hit today's Collaborator Chat limit. Come back tomorrow.", "warn"); renderIntro(); }
        else { toast("Could not start the chat.", "error"); renderIntro(); }
      })
      .catch(function () { renderIntro(); });
  }

  // ---- chat ---------------------------------------------------------------
  function renderChat(session) {
    var root = app();
    clear(root);

    var maxTurns = session.maxTurns || 20;
    var turnsUsed = session.turnsUsed || 1;

    var chatLog = el("div", { class: "sd-chat-log", id: "collabLog" }, [
      el("div", { class: "sd-chat-sys" }, [
        "You're chatting with ",
        el("strong", { text: session.colleague || "a teammate" }),
        ". Help them understand where they went wrong — ask questions, explain, share resources. Code renders as code blocks."
      ])
    ]);

    var counter = el("span", { class: "collab-counter", id: "collabCounter" });
    var input = el("textarea", { class: "sd-chat-input", id: "collabInput", rows: "2", placeholder: "Type your reply… (Cmd/Ctrl+Enter to send). You can paste code in ``` fences." });
    var micBtn = el("button", { class: "btn btn--ghost sd-mic", type: "button", title: "Speak your reply", text: "🎙" });
    var sendBtn = el("button", { class: "btn btn--primary sd-send", type: "button", text: "Send" });
    var finishBtn = el("button", { class: "btn", type: "button", text: "Finish & get feedback" });
    finishBtn.disabled = true;

    var chat = el("div", { class: "sd-chat collab-chat" }, [
      el("div", { class: "sd-chat-head" }, [
        el("span", { text: "Chat with " + (session.colleague || "teammate") }),
        counter
      ]),
      chatLog,
      el("div", { class: "sd-chat-row" }, [input, el("div", { class: "sd-chat-btns" }, [micBtn, sendBtn])]),
      el("div", { class: "collab-finish-row" }, [finishBtn])
    ]);

    root.appendChild(el("div", { class: "screen" }, [topbar("Collaborator Chat", null), chat]));

    // opening colleague message
    pushTurn(chatLog, "client", session.colleague || "Teammate", session.opening || "");
    updateCounter(counter, maxTurns - turnsUsed);

    function pushLocal(role, label, text) { pushTurn(chatLog, role, label, text); }

    function send() {
      var q = (input.value || "").trim();
      if (!q) { toast("Type a reply first.", "warn"); return; }
      if (S.busy) return;
      S.busy = true; sendBtn.disabled = true; sendBtn.textContent = "…";
      pushLocal("learner", "You", q);
      input.value = "";
      var thinking = el("div", { class: "sd-chat-turn sd-chat-turn--client is-thinking" }, [
        el("span", { class: "sd-chat-role", text: session.colleague || "Teammate" }),
        el("span", { class: "sd-chat-text", text: "…" })
      ]);
      chatLog.appendChild(thinking); chatLog.scrollTop = chatLog.scrollHeight;

      window.API.collabMessage(S.sessionId, q)
        .then(function (data) {
          if (thinking.parentNode) thinking.parentNode.removeChild(thinking);
          S.busy = false; sendBtn.disabled = false; sendBtn.textContent = "Send";
          if (data && data.ok) {
            pushLocal("client", session.colleague || "Teammate", data.reply);
            updateCounter(counter, data.messagesLeft);
            if (data.canFinish) { finishBtn.disabled = false; S.canFinish = true; }
            if (data.capped) {
              input.disabled = true; sendBtn.disabled = true;
              finishBtn.disabled = false; S.canFinish = true;
              pushSys(chatLog, "You've reached the message limit — wrap up and hit Finish for feedback.");
            }
          } else if (data && data.error === "cap_reached") {
            input.disabled = true; sendBtn.disabled = true; finishBtn.disabled = false; S.canFinish = true;
            updateCounter(counter, 0);
            pushSys(chatLog, "Message limit reached — hit Finish for feedback.");
          } else {
            toast("Your teammate didn't respond. Try again.", "warn");
          }
        })
        .catch(function () {
          if (thinking.parentNode) thinking.parentNode.removeChild(thinking);
          S.busy = false; sendBtn.disabled = false; sendBtn.textContent = "Send";
        });
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
    });

    finishBtn.addEventListener("click", function () {
      if (!S.canFinish || S.busy) return;
      S.busy = true; finishBtn.disabled = true; finishBtn.textContent = "Scoring…";
      window.API.collabFinish(S.sessionId)
        .then(function (data) {
          S.busy = false;
          if (data && data.ok) renderResults(data, session);
          else if (data && data.error === "too_short") { toast("Chat a bit more before finishing (at least a couple of replies).", "warn"); finishBtn.disabled = false; finishBtn.textContent = "Finish & get feedback"; }
          else { toast("Could not score the chat.", "error"); finishBtn.disabled = false; finishBtn.textContent = "Finish & get feedback"; }
        })
        .catch(function () { S.busy = false; finishBtn.disabled = false; finishBtn.textContent = "Finish & get feedback"; });
    });

    // mic → fills the input (learner reviews then sends)
    var recorder = null, recording = false;
    micBtn.addEventListener("click", function () {
      if (!window.STT || !window.STT.supported()) { toast("Speech not supported here — type instead.", "warn"); return; }
      if (recording) { try { recorder.stop(); } catch (e) {} recording = false; micBtn.classList.remove("is-rec"); micBtn.textContent = "🎙"; return; }
      recorder = window.STT.createRecorder({
        onStart: function () { recording = true; micBtn.classList.add("is-rec"); micBtn.textContent = "⏹"; },
        onUpdate: function (t) { input.value = t; },
        onError: function () { recording = false; micBtn.classList.remove("is-rec"); micBtn.textContent = "🎙"; },
        onEnd: function () { recording = false; micBtn.classList.remove("is-rec"); micBtn.textContent = "🎙"; }
      });
      recorder.start();
    });
  }

  function pushTurn(log, role, label, text) {
    var body = el("span", { class: "sd-chat-text" });
    body.appendChild(renderMessage(text));
    log.appendChild(el("div", { class: "sd-chat-turn sd-chat-turn--" + role }, [
      el("span", { class: "sd-chat-role", text: label }),
      body
    ]));
    log.scrollTop = log.scrollHeight;
  }
  function pushSys(log, text) {
    log.appendChild(el("div", { class: "sd-chat-sys", text: text }));
    log.scrollTop = log.scrollHeight;
  }
  function updateCounter(node, left) {
    var n = typeof left === "number" ? Math.max(0, left) : 0;
    node.textContent = n + " message" + (n === 1 ? "" : "s") + " left";
    node.className = "collab-counter" + (n <= 3 ? " is-low" : "");
  }

  // ---- results ------------------------------------------------------------
  function renderResults(data, session) {
    var root = app();
    clear(root);
    var dims = data.dims || {};
    var dimRows = [
      ["Collaboration", dims.collaboration],
      ["Curiosity", dims.curiosity],
      ["Resourcefulness", dims.resourcefulness],
      ["Sincerity", dims.sincerity]
    ].map(function (d) {
      var v = typeof d[1] === "number" ? d[1] : 0;
      return el("div", { class: "collab-dim" }, [
        el("div", { class: "collab-dim-head" }, [
          el("span", { text: d[0] }),
          el("span", { class: "collab-dim-val", text: String(v) })
        ]),
        el("div", { class: "bar" }, [el("div", { class: "bar__fill", style: "width:" + v + "%" })])
      ]);
    });

    var strengths = (data.strengths || []).map(function (t) { return el("li", { text: t }); });
    var improvements = (data.improvements || []).map(function (t) { return el("li", { text: t }); });

    var again = el("button", { class: "btn btn--primary", type: "button", text: "New chat" });
    again.addEventListener("click", function () { S.sessionId = null; S.canFinish = false; renderIntro(); });
    var back = el("button", { class: "btn", type: "button", text: "Back to modes" });
    back.addEventListener("click", function () { if (typeof S.onExit === "function") S.onExit(); });

    var practiceNote = data.practice
      ? el("p", { class: "cap-note", text: "Practice identity — this score isn't recorded." })
      : null;

    var card = el("div", { class: "card screen-in" }, [
      el("div", { class: "collab-score-hero" }, [
        el("div", { class: "collab-score-num", text: String(data.score) }),
        el("div", { class: "collab-score-cap", text: "Collaboration score" })
      ]),
      practiceNote,
      el("p", { class: "sd-sub", text: data.colleagueResolved ? "Your teammate came away understanding it — nice coaching." : "Your teammate is still working through it — the interaction is what counts." }),
      el("div", { class: "collab-dims" }, dimRows),
      el("div", { class: "fb-cols" }, [
        el("div", {}, [el("h3", { text: "What you did well" }), el("ul", { class: "how-list" }, strengths)]),
        el("div", {}, [el("h3", { text: "To grow" }), el("ul", { class: "how-list" }, improvements)])
      ]),
      el("div", { class: "lobby-actions" }, [again, back])
    ]);
    root.appendChild(el("div", { class: "screen" }, [topbar("Collaborator Chat — feedback", null), card]));
  }

  // ---- public -------------------------------------------------------------
  window.COLLAB = {
    open: function (creds, onExit) {
      S.name = creds.name; S.passcode = creds.passcode; S.tier = creds.tier || null;
      S.onExit = onExit || null;
      S.sessionId = null; S.canFinish = false; S.busy = false;
      renderIntro();
    }
  };
})();
