/* persona-communications.js — dependency-free local synthetic communication lab.
   No fetch, model, backend, email, tracking, grading, or progress integration. */
(function (root, factory) {
  var fixtures = root.FDEPersonaFixtures;
  if (typeof module === "object" && module.exports) {
    fixtures = fixtures || require("./persona-communications-fixtures.js");
    module.exports = factory(fixtures);
  } else {
    root.FDEPersonaCommunications = factory(fixtures);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (fixtureBook) {
  "use strict";

  if (!fixtureBook || !fixtureBook.scenarios) throw new Error("Persona communication fixtures are unavailable.");

  var STORAGE_PREFIX = "fde_local_synthetic_persona_v2:";
  // Retired-scenario practice state stays stored untouched under the v1 prefix;
  // it is never deleted, migrated, or relabeled as a new client. LEGACY-STATE
  var LEGACY_STORAGE_PREFIX = "fde_local_synthetic_persona_v1:";
  var CHANNELS = ["chat", "inbox", "coaching"];
  var PROJECTS = Object.keys(fixtureBook.scenarios);
  // Old deep links keep working; the active scenarios are the only ones rendered.
  var LEGACY_PROJECT_PARAMS = { riverbend: "juniper-vale", meridian: "morrowfield" };

  function hashText(value) {
    var text = String(value == null ? "" : value);
    var hash = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function normalizeProject(projectId) {
    return Object.prototype.hasOwnProperty.call(fixtureBook.scenarios, projectId) ? projectId : PROJECTS[0];
  }

  function getScenario(projectId) { return fixtureBook.scenarios[normalizeProject(projectId)]; }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function includesWord(text, word) {
    return new RegExp("(?:^|[^a-z0-9])" + escapeRegExp(word) + "(?:s|es)?(?:$|[^a-z0-9])").test(text);
  }

  function selectFact(projectId, message) {
    var scenario = getScenario(projectId);
    var text = String(message || "").toLowerCase();
    var winner = scenario.factOrder[0];
    var winnerScore = -1;
    scenario.topicRules.forEach(function (rule) {
      var score = rule.words.reduce(function (total, word) {
        return total + (includesWord(text, word) ? 1 : 0);
      }, 0);
      if (score > winnerScore) {
        winner = rule.factId;
        winnerScore = score;
      }
    });
    if (winnerScore <= 0) {
      winner = scenario.factOrder[parseInt(hashText(text || scenario.id), 36) % scenario.factOrder.length];
    }
    return { id: winner, fact: scenario.facts[winner] };
  }

  function classifyIntent(message) {
    var text = String(message || "").toLowerCase();
    if (/\b(ship|launch|today|tomorrow|deadline|move fast|just do|skip|promise|never fail|guarantee|push back|disagree)\b/.test(text)) return "pushback";
    if (/\bcall\b[^.?!]*\bdone\b/.test(text)) return "pushback";
    if (/\b(negotiate|compromise|tradeoff|trade-off|option|phase|scope|smaller|instead|alternative)\b/.test(text)) return "negotiate";
    if (/\?|\b(why|what|how|which|clarify|explain|help me understand)\b/.test(text)) return "clarify";
    return "clarify";
  }

  function generateChatReply(projectId, message) {
    var scenario = getScenario(projectId);
    var selection = selectFact(projectId, message);
    var fact = selection.fact;
    var intent = classifyIntent(message);
    var text;

    if (intent === "pushback") {
      text = "I would push back on that commitment as stated. " + fact.text +
        " A promise without that evidence would hide the actual risk. The smallest defensible next step is to " +
        fact.safeStep + ". We can still aim for the outcome: " + fact.businessOutcome +
        ". Which matters more for this update: demonstrating the control or agreeing the rollout condition?";
    } else if (intent === "negotiate") {
      text = "There is room to negotiate the sequence, not the evidence boundary. " + fact.text +
        " Option A is a narrower milestone that lets us " + fact.safeStep +
        ". Option B keeps the broader scope but moves the commitment until the evidence is reviewable. Both protect the outcome: " +
        fact.businessOutcome + ". Which trade-off can you take back to the sponsor?";
    } else {
      text = "Let’s clarify the decision before choosing a solution. " + fact.text +
        " The outcome we should optimize for is to " + fact.businessOutcome +
        ". I would ask who owns the decision, what evidence they need, and what condition changes the plan. If you share the audience and deadline, I can help frame the next message.";
    }

    return Object.freeze({
      projectId: scenario.id,
      role: scenario.technicalLeadLabel,
      intent: intent,
      factId: selection.id,
      text: text
    });
  }

  function delayMinutesFor(projectId, threadSeed) {
    var span = fixtureBook.maxReplyMinutes - fixtureBook.minReplyMinutes + 1;
    return fixtureBook.minReplyMinutes + (parseInt(hashText(projectId + "|" + threadSeed), 36) % span);
  }

  function createEmailThread(projectId, fields, sentAt, id) {
    var scenario = getScenario(projectId);
    var subject = String(fields && fields.subject || "").trim();
    var body = String(fields && fields.body || "").trim();
    if (!subject || !body) throw new Error("Subject and message are required.");
    var threadId = String(id || (projectId + "-thread-" + hashText(subject + "|" + body + "|" + sentAt)));
    var delayMinutes = delayMinutesFor(projectId, threadId + "|" + subject + "|" + body);
    return {
      id: threadId,
      projectId: scenario.id,
      to: scenario.stakeholderLabel,
      subject: subject,
      status: "sent",
      sentAt: Number(sentAt),
      deliverAt: Number(sentAt) + delayMinutes * 60000,
      messages: [{ from: "learner", at: Number(sentAt), text: body }]
    };
  }

  function threadStatus(thread, now) {
    if (thread.messages && thread.messages.some(function (message) { return message.from === "stakeholder"; })) return "replied";
    if (Number(now) <= Number(thread.sentAt)) return "sent";
    return Number(now) < Number(thread.deliverAt) ? "awaiting" : "replied";
  }

  function generateEmailReply(projectId, thread) {
    var scenario = getScenario(projectId);
    var learnerMessage = (thread.messages || []).filter(function (message) { return message.from === "learner"; }).map(function (message) { return message.text; }).join(" ");
    var selection = selectFact(projectId, thread.subject + " " + learnerMessage);
    var fact = selection.fact;
    var intent = classifyIntent(learnerMessage);
    var opening = intent === "pushback"
      ? "Thanks for naming the risk instead of quietly accepting the date."
      : intent === "negotiate"
        ? "A narrower milestone is workable if the boundary is explicit."
        : "Thanks for the clear update.";
    return {
      from: "stakeholder",
      at: Number(thread.deliverAt),
      factId: selection.id,
      text: opening + " Please frame the next update around how we will " + fact.businessOutcome +
        ". State what is included, what remains simulated or pending, who owns the next decision, and which evidence would change the plan. " +
        scenario.technicalLeadLabel + " can confirm the technical constraint; I need the expectation and business impact to be unambiguous."
    };
  }

  function revealDueReplies(state, now) {
    var changed = false;
    PROJECTS.forEach(function (projectId) {
      var project = state.projects[projectId];
      project.threads.forEach(function (thread) {
        var hasReply = thread.messages.some(function (message) { return message.from === "stakeholder"; });
        if (!hasReply && Number(now) >= Number(thread.deliverAt)) {
          thread.messages.push(generateEmailReply(projectId, thread));
          thread.status = "replied";
          changed = true;
        } else if (!hasReply) {
          var status = threadStatus(thread, now);
          if (thread.status !== status) { thread.status = status; changed = true; }
        }
      });
    });
    return changed;
  }

  function createInjectedClock(startAt) {
    var current = Number(startAt == null ? fixtureBook.fixtureEpoch : startAt);
    return Object.freeze({
      now: function () { return current; },
      advance: function (milliseconds) { current += Number(milliseconds) || 0; return current; },
      set: function (milliseconds) { current = Number(milliseconds); return current; },
      mode: "injected"
    });
  }

  function createSystemClock() {
    return Object.freeze({ now: function () { return Date.now(); }, mode: "system" });
  }

  function readExistingIdentity(storage) {
    try {
      var identity = JSON.parse(storage && storage.getItem("fde_identity") || "null");
      if (!identity || !identity.code || !identity.name) return null;
      return { code: String(identity.code), name: String(identity.name), role: String(identity.role || "learner") };
    } catch (error) { return null; }
  }

  function storageKeyForIdentity(identity, scope) {
    var seam = identity && (String(identity.code || "") + "|" + String(identity.role || "learner"));
    var key = STORAGE_PREFIX + "local-" + hashText(seam || "missing");
    return scope ? key + ":" + String(scope).replace(/[^a-z0-9-]/gi, "") : key;
  }

  function hasLegacyState(storage, identity, scope) {
    try {
      var seam = identity && (String(identity.code || "") + "|" + String(identity.role || "learner"));
      var key = LEGACY_STORAGE_PREFIX + "local-" + hashText(seam || "missing");
      if (scope) key += ":" + String(scope).replace(/[^a-z0-9-]/gi, "");
      return !!(storage && storage.getItem(key));
    } catch (error) { return false; }
  }

  function initialProjectState(projectId) {
    var scenario = getScenario(projectId);
    return {
      chat: [{
        from: "lead",
        at: fixtureBook.fixtureEpoch,
        factId: scenario.factOrder[0],
        text: "This is a local synthetic conversation. I can clarify scenario evidence, negotiate scope, or challenge a risky commitment. I have no tools, authority, or network access."
      }],
      threads: [clone(scenario.seedThread)]
    };
  }

  function initialState() {
    var projects = {};
    PROJECTS.forEach(function (projectId) { projects[projectId] = initialProjectState(projectId); });
    return {
      version: fixtureBook.version,
      selectedProject: PROJECTS[0],
      activeChannel: "chat",
      nextThreadNumber: 1,
      projects: projects
    };
  }

  function validState(value) {
    return value && value.version === fixtureBook.version && value.projects && PROJECTS.every(function (projectId) {
      return value.projects[projectId] && Array.isArray(value.projects[projectId].chat) && Array.isArray(value.projects[projectId].threads);
    });
  }

  function createStore(storage, identity, scope) {
    var key = storageKeyForIdentity(identity, scope);
    function load() {
      try {
        var value = JSON.parse(storage && storage.getItem(key) || "null");
        return validState(value) ? value : initialState();
      } catch (error) { return initialState(); }
    }
    function save(state) {
      try { if (storage) storage.setItem(key, JSON.stringify(state)); return true; }
      catch (error) { return false; }
    }
    function reset() {
      try { if (storage) storage.removeItem(key); } catch (error) { /* local reset remains best-effort */ }
      return initialState();
    }
    return Object.freeze({ key: key, load: load, save: save, reset: reset });
  }

  function transcriptText(state, projectId) {
    var project = state.projects[normalizeProject(projectId)];
    var parts = [];
    project.chat.forEach(function (message) {
      if (message.from === "learner") parts.push(message.text);
    });
    project.threads.forEach(function (thread) {
      thread.messages.forEach(function (message) {
        if (message.from === "learner") parts.push(message.text);
      });
    });
    return parts.join("\n");
  }

  function coachingItem(id, label, present, positive, suggestion) {
    return Object.freeze({ id: id, label: label, signal: present ? "evidence-present" : "try-next", message: present ? positive : suggestion });
  }

  function coachTranscript(text) {
    var source = String(text || "").trim();
    var lower = source.toLowerCase();
    var hasQuestion = /\?/.test(source) || /\b(what|why|how|which|who)\b/.test(lower);
    var hasEvidence = /\b(evidence|because|shows|trace|test|fixture|data|risk)\b/.test(lower);
    var hasOutcome = /\b(outcome|impact|claimant|adjuster|merchant|finance|customer|staff|business)\b/.test(lower);
    var hasPushback = /\b(push back|cannot|can't|would not|risk|instead|alternative|smaller|narrower)\b/.test(lower) && /\b(because|so that|evidence|risk)\b/.test(lower);
    var hasExpectation = /\b(by |before |after |next |owner|pending|included|scope|deadline|review|follow up)\b/.test(lower);
    var hasRapport = /\b(thank|appreciate|understand|agree|hear|help|works for me)\b/.test(lower);
    var hasConcrete = /\b\d+\b|\b(slot|request|reason|runbook|rollback|idempotency|reconciliation|summary)\b/.test(lower);

    return Object.freeze({
      formativeOnly: true,
      empty: !source,
      criteria: Object.freeze([
        coachingItem("clarity", "Clarity", hasConcrete, "You anchor the message in a concrete scenario detail.", "Name the exact decision, evidence, or scenario condition instead of referring to “the issue.”"),
        coachingItem("questions", "Question quality", hasQuestion, "You ask for information that can change the next step.", "Add one open question about ownership, evidence, audience, or the condition that changes the plan."),
        coachingItem("persuasion", "Persuasion", hasEvidence && hasOutcome, "You connect evidence to an outcome the stakeholder cares about.", "Link the technical evidence to a claimant, merchant, staff, trust, or money-correctness outcome."),
        coachingItem("pushback", "Respectful pushback", hasPushback, "You pair a boundary with a reason or alternative.", "State the risk, then offer the smallest defensible alternative rather than giving a bare refusal."),
        coachingItem("expectations", "Expectation-setting", hasExpectation, "You make scope, ownership, or the next checkpoint visible.", "Say what is included, what is pending, who owns the decision, and when it will be reviewed."),
        coachingItem("rapport", "Rapport", hasRapport, "You acknowledge the other person before redirecting the work.", "Acknowledge the request or pressure in one sentence before clarifying or challenging it.")
      ])
    });
  }

  function nextTabIndex(key, currentIndex, count) {
    if (key === "Home") return 0;
    if (key === "End") return count - 1;
    if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % count;
    if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + count) % count;
    return currentIndex;
  }

  function renderTextMessage(doc, container, message, labels) {
    var article = doc.createElement("article");
    article.className = "pc-message pc-message--" + (message.from === "learner" ? "learner" : "persona");
    var meta = doc.createElement("div");
    meta.className = "pc-message__meta";
    meta.textContent = message.from === "learner" ? labels.learner : labels.persona;
    var body = doc.createElement("p");
    body.textContent = String(message.text || "");
    article.appendChild(meta);
    article.appendChild(body);
    container.appendChild(article);
    return article;
  }

  function formatTime(milliseconds) {
    try { return new Date(Number(milliseconds)).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (error) { return "Synthetic time"; }
  }

  function remainingLabel(thread, now) {
    var remaining = Math.max(0, Number(thread.deliverAt) - Number(now));
    var minutes = Math.ceil(remaining / 60000);
    return minutes ? "Synthetic reply due in about " + minutes + " min" : "Reply ready to reveal";
  }

  function createElement(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function init(doc, options) {
    options = options || {};
    var host = doc.querySelector("[data-persona-app]");
    if (!host) return null;
    var storage = options.storage || (doc.defaultView && doc.defaultView.localStorage);
    var identity = options.identity || readExistingIdentity(storage);
    var gate = doc.getElementById("pc-auth-gate");
    var experience = doc.getElementById("pc-experience");

    if (!identity) {
      var missingIdentity = doc.getElementById("pc-identity-name");
      if (missingIdentity) missingIdentity.textContent = "not signed in";
      gate.hidden = false;
      experience.hidden = true;
      return { identity: null };
    }

    gate.hidden = true;
    experience.hidden = false;
    var query = options.query || (doc.defaultView && doc.defaultView.location && doc.defaultView.location.search) || "";
    var accelerated = /(?:\?|&)simClock=accelerated(?:&|$)/.test(query);
    var clock = options.clock || (accelerated ? createInjectedClock(fixtureBook.fixtureEpoch) : createSystemClock());
    var store = createStore(storage, identity, accelerated ? "accelerated" : "");
    var state = store.load();
    var requestedProject = query.match(/[?&]project=(juniper-vale|morrowfield|riverbend|meridian)(?:&|$)/);
    if (requestedProject) state.selectedProject = LEGACY_PROJECT_PARAMS[requestedProject[1]] || requestedProject[1];
    state.selectedProject = normalizeProject(state.selectedProject);
    state.activeChannel = CHANNELS.indexOf(state.activeChannel) >= 0 ? state.activeChannel : "chat";
    var selectedThreadId = null;

    var identityNode = doc.getElementById("pc-identity-name");
    identityNode.textContent = identity.name;
    var clockTools = doc.getElementById("pc-clock-tools");
    clockTools.hidden = !accelerated;

    var projectTabs = Array.prototype.slice.call(doc.querySelectorAll("[data-project-tab]"));
    var channelTabs = Array.prototype.slice.call(doc.querySelectorAll("[data-channel-tab]"));
    var channelPanels = Array.prototype.slice.call(doc.querySelectorAll("[data-channel-panel]"));
    var chatLog = doc.getElementById("pc-chat-log");
    var chatAnnouncer = doc.getElementById("pc-chat-announcer");
    var inboxAnnouncer = doc.getElementById("pc-inbox-announcer");
    var chatForm = doc.getElementById("pc-chat-form");
    var chatInput = doc.getElementById("pc-chat-input");
    var promptHost = doc.getElementById("pc-chat-prompts");
    var factHost = doc.getElementById("pc-facts");
    var projectTitle = doc.getElementById("pc-project-title");
    var projectPhase = doc.getElementById("pc-project-phase");
    var projectIntro = doc.getElementById("pc-project-intro");
    var leadLabel = doc.getElementById("pc-lead-label");
    var inboxList = doc.getElementById("pc-inbox-list");
    var threadView = doc.getElementById("pc-thread-view");
    var composeForm = doc.getElementById("pc-compose-form");
    var composeTo = doc.getElementById("pc-compose-to");
    var composeSubject = doc.getElementById("pc-compose-subject");
    var composeBody = doc.getElementById("pc-compose-body");
    var composeStatus = doc.getElementById("pc-compose-status");
    var coachingHost = doc.getElementById("pc-coaching-results");
    var coachingButton = doc.getElementById("pc-run-coaching");
    var coachingStatus = doc.getElementById("pc-coaching-status");
    var resetButton = doc.getElementById("pc-reset");
    var resetStatus = doc.getElementById("pc-reset-status");
    var legacyNote = doc.getElementById("pc-legacy-note");

    if (legacyNote && hasLegacyState(storage, identity, accelerated ? "accelerated" : "")) {
      legacyNote.textContent = "Your earlier practice history from the retired Riverbend/Meridian scenarios remains stored in this browser, untouched; this lab now hosts only the two active engagements."; // LEGACY-STATE compatibility notice
      legacyNote.hidden = false;
    }

    function projectState() { return state.projects[state.selectedProject]; }

    function activateChannel(channel, focus) {
      state.activeChannel = CHANNELS.indexOf(channel) >= 0 ? channel : "chat";
      channelTabs.forEach(function (button) {
        var active = button.getAttribute("data-channel-tab") === state.activeChannel;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
      });
      channelPanels.forEach(function (panel) { panel.hidden = panel.getAttribute("data-channel-panel") !== state.activeChannel; });
      store.save(state);
    }

    function renderProjectTabs() {
      projectTabs.forEach(function (button) {
        var active = button.getAttribute("data-project-tab") === state.selectedProject;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
    }

    function renderFacts(scenario) {
      factHost.replaceChildren();
      scenario.factOrder.forEach(function (factId) {
        var fact = scenario.facts[factId];
        var item = createElement(doc, "li", "pc-fact");
        item.appendChild(createElement(doc, "strong", "", fact.label));
        item.appendChild(createElement(doc, "span", "", fact.text));
        factHost.appendChild(item);
      });
    }

    function renderPrompts(scenario) {
      promptHost.replaceChildren();
      scenario.chatPrompts.forEach(function (prompt) {
        var button = createElement(doc, "button", "pc-prompt", prompt);
        button.type = "button";
        button.addEventListener("click", function () { chatInput.value = prompt; chatInput.focus(); });
        promptHost.appendChild(button);
      });
    }

    function renderChat(scenario) {
      chatLog.replaceChildren();
      projectState().chat.forEach(function (message) {
        renderTextMessage(doc, chatLog, message, { learner: identity.name, persona: scenario.technicalLeadLabel });
      });
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function chooseThread() {
      var threads = projectState().threads;
      if (!threads.some(function (thread) { return thread.id === selectedThreadId; })) {
        selectedThreadId = threads.length ? threads[threads.length - 1].id : null;
      }
      return threads.find(function (thread) { return thread.id === selectedThreadId; }) || null;
    }

    function statusText(thread) {
      if (thread.status === "replied") return "Replied";
      if (thread.status === "sent") return "Sent";
      return "Awaiting reply";
    }

    function renderInbox(scenario, focusSelected) {
      var currentThread = chooseThread();
      var selectedRow = null;
      inboxList.replaceChildren();
      projectState().threads.slice().reverse().forEach(function (thread) {
        var button = createElement(doc, "button", "pc-thread-row");
        button.type = "button";
        button.setAttribute("aria-pressed", thread.id === selectedThreadId ? "true" : "false");
        button.setAttribute("data-thread-id", thread.id);
        button.appendChild(createElement(doc, "strong", "", thread.subject));
        button.appendChild(createElement(doc, "span", "pc-thread-row__meta", statusText(thread) + " · " + formatTime(thread.sentAt || thread.messages[0].at)));
        button.addEventListener("click", function () { selectedThreadId = thread.id; renderInbox(scenario, true); });
        if (thread.id === selectedThreadId) selectedRow = button;
        inboxList.appendChild(button);
      });
      if (focusSelected && selectedRow) selectedRow.focus();

      var thread = currentThread;
      threadView.replaceChildren();
      if (!thread) {
        threadView.appendChild(createElement(doc, "p", "pc-empty", "Compose a message to start a synthetic thread."));
        return;
      }
      var head = createElement(doc, "div", "pc-thread-head");
      head.appendChild(createElement(doc, "h3", "", thread.subject));
      var badge = createElement(doc, "span", "pc-status pc-status--" + thread.status, statusText(thread));
      head.appendChild(badge);
      threadView.appendChild(head);
      thread.messages.forEach(function (message) {
        renderTextMessage(doc, threadView, message, { learner: identity.name, persona: scenario.stakeholderLabel });
      });
      if (thread.status !== "replied" && thread.deliverAt) {
        threadView.appendChild(createElement(doc, "p", "pc-awaiting-note", remainingLabel(thread, clock.now()) + ". No email is sent; the reply exists only in this browser simulation."));
      }
    }

    function renderCoaching() {
      coachingHost.replaceChildren();
      coachingStatus.textContent = "Choose “Review my communication” for formative feedback on this project's local transcript.";
    }

    function pendingThreadIds() {
      var pending = {};
      PROJECTS.forEach(function (projectId) {
        state.projects[projectId].threads.forEach(function (thread) {
          if (!thread.messages.some(function (message) { return message.from === "stakeholder"; })) pending[projectId + "|" + thread.id] = true;
        });
      });
      return pending;
    }

    function revealAndAnnounce() {
      var pending = pendingThreadIds();
      var changed = revealDueReplies(state, clock.now());
      var revealed = [];
      PROJECTS.forEach(function (projectId) {
        state.projects[projectId].threads.forEach(function (thread) {
          if (pending[projectId + "|" + thread.id] && thread.status === "replied") {
            revealed.push(getScenario(projectId).stakeholderLabel + " replied to “" + thread.subject + "”.");
          }
        });
      });
      if (revealed.length) inboxAnnouncer.textContent = revealed.join(" ");
      return changed;
    }

    function renderAll() {
      revealAndAnnounce();
      var scenario = getScenario(state.selectedProject);
      projectTitle.textContent = scenario.projectLabel;
      projectPhase.textContent = scenario.projectPhase;
      projectIntro.textContent = scenario.intro;
      leadLabel.textContent = scenario.technicalLeadLabel;
      composeTo.value = scenario.stakeholderLabel;
      renderProjectTabs();
      renderFacts(scenario);
      renderPrompts(scenario);
      renderChat(scenario);
      renderInbox(scenario);
      renderCoaching();
      activateChannel(state.activeChannel, false);
      store.save(state);
    }

    projectTabs.forEach(function (button, index) {
      button.addEventListener("click", function () {
        state.selectedProject = button.getAttribute("data-project-tab");
        selectedThreadId = null;
        renderAll();
      });
      button.addEventListener("keydown", function (event) {
        var next = nextTabIndex(event.key, index, projectTabs.length);
        if (next !== index) { event.preventDefault(); projectTabs[next].click(); projectTabs[next].focus(); }
      });
    });

    channelTabs.forEach(function (button, index) {
      button.addEventListener("click", function () { activateChannel(button.getAttribute("data-channel-tab"), false); });
      button.addEventListener("keydown", function (event) {
        var next = nextTabIndex(event.key, index, channelTabs.length);
        if (next !== index) { event.preventDefault(); activateChannel(channelTabs[next].getAttribute("data-channel-tab"), true); }
      });
    });

    chatForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var message = chatInput.value.trim();
      if (!message) return;
      var now = clock.now();
      projectState().chat.push({ from: "learner", at: now, text: message });
      var reply = generateChatReply(state.selectedProject, message);
      projectState().chat.push({ from: "lead", at: now, factId: reply.factId, intent: reply.intent, text: reply.text });
      chatInput.value = "";
      store.save(state);
      var scenario = getScenario(state.selectedProject);
      renderChat(scenario);
      chatAnnouncer.textContent = scenario.technicalLeadLabel + ": " + reply.text;
      chatInput.focus();
    });

    composeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      composeStatus.textContent = "";
      try {
        var thread = createEmailThread(state.selectedProject, { subject: composeSubject.value, body: composeBody.value }, clock.now(), state.selectedProject + "-local-" + state.nextThreadNumber);
        state.nextThreadNumber += 1;
        projectState().threads.push(thread);
        selectedThreadId = thread.id;
        composeSubject.value = "";
        composeBody.value = "";
        composeStatus.textContent = "Saved locally as sent. A synthetic reply will reveal after its 15–30 minute fixture delay.";
        store.save(state);
        renderInbox(getScenario(state.selectedProject));
      } catch (error) { composeStatus.textContent = error.message; }
    });

    coachingButton.addEventListener("click", function () {
      var result = coachTranscript(transcriptText(state, state.selectedProject));
      coachingHost.replaceChildren();
      if (result.empty) {
        coachingStatus.textContent = "Write a chat or inbox message first. Coaching remains local and formative.";
        return;
      }
      coachingStatus.textContent = "Formative only — these observations are not scores and are never written to grades, progress, assessments, or trainer data.";
      result.criteria.forEach(function (criterion) {
        var item = createElement(doc, "article", "pc-coach-item pc-coach-item--" + criterion.signal);
        item.appendChild(createElement(doc, "h3", "", criterion.label));
        item.appendChild(createElement(doc, "p", "", criterion.message));
        coachingHost.appendChild(item);
      });
    });

    resetButton.addEventListener("click", function () {
      state = store.reset();
      selectedThreadId = null;
      resetStatus.textContent = "This browser's synthetic chat and inbox practice state was reset. No curriculum progress or assessment data was touched.";
      renderAll();
    });

    Array.prototype.forEach.call(doc.querySelectorAll("[data-clock-advance]"), function (button) {
      button.addEventListener("click", function () {
        if (!clock.advance) return;
        clock.advance(Number(button.getAttribute("data-clock-advance")) * 60000);
        revealAndAnnounce();
        store.save(state);
        renderInbox(getScenario(state.selectedProject));
      });
    });

    if (doc.defaultView && doc.defaultView.setInterval && clock.mode === "system") {
      doc.defaultView.setInterval(function () {
        if (revealAndAnnounce()) {
          store.save(state);
          renderInbox(getScenario(state.selectedProject));
        }
      }, 30000);
    }

    renderAll();
    return { identity: identity, state: state, store: store, clock: clock };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(document); });
    else init(document);
  }

  return Object.freeze({
    fixtureBook: fixtureBook,
    hashText: hashText,
    getScenario: getScenario,
    includesWord: includesWord,
    selectFact: selectFact,
    classifyIntent: classifyIntent,
    generateChatReply: generateChatReply,
    delayMinutesFor: delayMinutesFor,
    createEmailThread: createEmailThread,
    threadStatus: threadStatus,
    generateEmailReply: generateEmailReply,
    revealDueReplies: revealDueReplies,
    createInjectedClock: createInjectedClock,
    createSystemClock: createSystemClock,
    readExistingIdentity: readExistingIdentity,
    storageKeyForIdentity: storageKeyForIdentity,
    hasLegacyState: hasLegacyState,
    initialState: initialState,
    createStore: createStore,
    transcriptText: transcriptText,
    coachTranscript: coachTranscript,
    nextTabIndex: nextTabIndex,
    renderTextMessage: renderTextMessage,
    init: init
  });
});
