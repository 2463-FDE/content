// api.js — thin fetch wrappers around the Cloudflare Worker backend.
// Every call is wrapped in try/catch and surfaces a toast on failure.
// No call hangs silently: a timeout aborts after REQUEST_TIMEOUT_MS.

(function () {
  "use strict";

  var REQUEST_TIMEOUT_MS = 30000;

  function base() {
    var url = (window.CONFIG && window.CONFIG.WORKER_URL) || "";
    return String(url).replace(/\/+$/, "");
  }

  // Lightweight toast surface. app.js may override window.showToast for nicer UI;
  // this fallback guarantees errors are never silent.
  function toast(msg, kind) {
    if (typeof window.showToast === "function") {
      window.showToast(msg, kind || "error");
    } else {
      // eslint-disable-next-line no-console
      console.error("[toast]", kind || "error", msg);
    }
  }

  function timeoutSignal(ms) {
    if (typeof AbortController === "undefined") return { signal: undefined, clear: function () {} };
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, ms);
    return { signal: ctrl.signal, clear: function () { clearTimeout(t); } };
  }

  // Core POST helper. Returns parsed JSON body on any HTTP status (the API uses
  // 401/403 as meaningful bodies), or throws a network/timeout error.
  function post(path, body) {
    var url = base() + path;
    var to = timeoutSignal(REQUEST_TIMEOUT_MS);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: to.signal
    })
      .then(function (res) {
        to.clear();
        return res
          .json()
          .catch(function () {
            throw new Error("Bad response from server (status " + res.status + ").");
          })
          .then(function (data) {
            // Pass the body through regardless of status; callers inspect data.ok.
            if (data && typeof data === "object") {
              data.__status = res.status;
              return data;
            }
            throw new Error("Malformed response from server.");
          });
      })
      .catch(function (err) {
        to.clear();
        if (err && err.name === "AbortError") {
          throw new Error("Request timed out. Check your connection and try again.");
        }
        throw err;
      });
  }

  function get(path) {
    var url = base() + path;
    var to = timeoutSignal(REQUEST_TIMEOUT_MS);
    return fetch(url, { method: "GET", signal: to.signal })
      .then(function (res) {
        to.clear();
        return res.json().catch(function () {
          throw new Error("Bad response from server (status " + res.status + ").");
        });
      })
      .catch(function (err) {
        to.clear();
        if (err && err.name === "AbortError") {
          throw new Error("Request timed out. Check your connection and try again.");
        }
        throw err;
      });
  }

  // ---- Endpoint wrappers --------------------------------------------------

  function session(name, passcode) {
    return post("/session", { name: name, passcode: passcode }).catch(function (e) {
      toast(e.message || "Could not reach the server.");
      throw e;
    });
  }

  // `opts` may be a plain day string (legacy) or a customization object
  // { day, days:[…], cumulative:bool, count:N } for a customized interview.
  function startInterview(name, passcode, opts) {
    var body = { name: name, passcode: passcode };
    if (typeof opts === "string") {
      body.day = opts || null;
    } else if (opts && typeof opts === "object") {
      if (opts.day) body.day = opts.day;
      if (Array.isArray(opts.days) && opts.days.length) body.days = opts.days;
      if (opts.cumulative) body.cumulative = true;
      if (opts.count) body.count = opts.count;
    }
    return post("/interview/start", body).catch(function (e) {
      toast(e.message || "Could not start the interview.");
      throw e;
    });
  }

  function judge(interviewId, questionId, transcript, delivery) {
    return post("/judge", {
      interviewId: interviewId,
      questionId: questionId,
      transcript: transcript,
      delivery: delivery || null
    }).catch(function (e) {
      toast(e.message || "Judging failed. Try resubmitting.");
      throw e;
    });
  }

  function finishInterview(interviewId) {
    return post("/interview/finish", { interviewId: interviewId }).catch(function (e) {
      toast(e.message || "Could not finalize the interview.");
      throw e;
    });
  }

  function leaderboard() {
    return get("/leaderboard").catch(function (e) {
      toast(e.message || "Could not load the leaderboard.");
      throw e;
    });
  }

  // ---- System Design Simulator wrappers ----------------------------------

  function designScenarios(name, passcode, track) {
    return post("/design/scenarios", { name: name, passcode: passcode, track: track }).catch(function (e) {
      toast(e.message || "Could not load scenarios.");
      throw e;
    });
  }
  function designStart(name, passcode, scenarioId) {
    return post("/design/start", { name: name, passcode: passcode, scenarioId: scenarioId }).catch(function (e) {
      toast(e.message || "Could not start the design session.");
      throw e;
    });
  }
  function designClarify(sessionId, question, mode) {
    return post("/design/clarify", { sessionId: sessionId, question: question, mode: mode }).catch(function (e) {
      toast(e.message || "The client didn't respond. Try again.");
      throw e;
    });
  }
  function designSnapshot(sessionId, sceneJson) {
    // Fire-and-forget timeline snapshot; never toast on failure (background).
    return post("/design/snapshot", { sessionId: sessionId, sceneJson: sceneJson }).catch(function () { return null; });
  }
  function designSubmit(sessionId, payload) {
    return post("/design/submit", Object.assign({ sessionId: sessionId }, payload || {})).catch(function (e) {
      toast(e.message || "Could not submit your design.");
      throw e;
    });
  }
  function designFollowup(sessionId, answers) {
    return post("/design/followup", { sessionId: sessionId, answers: answers }).catch(function (e) {
      toast(e.message || "Could not submit your follow-up answers.");
      throw e;
    });
  }
  function designSessionView(name, passcode, sessionId) {
    return post("/design/session-view", { name: name, passcode: passcode, sessionId: sessionId }).catch(function (e) {
      toast(e.message || "Could not load that design.");
      throw e;
    });
  }
  function designLeaderboard() {
    return get("/design/leaderboard").catch(function (e) {
      toast(e.message || "Could not load the leaderboards.");
      throw e;
    });
  }
  function trainerReport(trainerPasscode, opts) {
    return post("/trainer/report", Object.assign({ trainerPasscode: trainerPasscode }, opts || {})).catch(function (e) {
      toast(e.message || "Could not load the trainer report.");
      throw e;
    });
  }
  function designHistory(name, passcode) {
    return post("/design/history", { name: name, passcode: passcode }).catch(function (e) {
      toast(e.message || "Could not load your past designs.");
      throw e;
    });
  }
  function designReport(name, passcode, sessionId) {
    return post("/design/report", { name: name, passcode: passcode, sessionId: sessionId }).catch(function (e) {
      toast(e.message || "Could not load that report.");
      throw e;
    });
  }
  function trainerSession(trainerPasscode, sessionId) {
    return post("/trainer/session", { trainerPasscode: trainerPasscode, sessionId: sessionId }).catch(function (e) {
      toast(e.message || "Could not load that report.");
      throw e;
    });
  }

  // ---- Collaborator Chat wrappers (Feature 2) ----------------------------
  function collabStart(name, passcode, day) {
    return post("/collab/start", { name: name, passcode: passcode, day: day || null }).catch(function (e) {
      toast(e.message || "Could not start the collaborator chat.");
      throw e;
    });
  }
  function collabMessage(sessionId, text) {
    return post("/collab/message", { sessionId: sessionId, text: text }).catch(function (e) {
      toast(e.message || "Your colleague didn't respond. Try again.");
      throw e;
    });
  }
  function collabFinish(sessionId) {
    return post("/collab/finish", { sessionId: sessionId }).catch(function (e) {
      toast(e.message || "Could not wrap up the chat.");
      throw e;
    });
  }
  function collabHistory(name, passcode) {
    return post("/collab/history", { name: name, passcode: passcode }).catch(function (e) {
      toast(e.message || "Could not load your past chats.");
      throw e;
    });
  }

  window.API = {
    session: session,
    startInterview: startInterview,
    judge: judge,
    finishInterview: finishInterview,
    leaderboard: leaderboard,
    // System Design Simulator
    designScenarios: designScenarios,
    designStart: designStart,
    designClarify: designClarify,
    designSnapshot: designSnapshot,
    designSubmit: designSubmit,
    designFollowup: designFollowup,
    designSessionView: designSessionView,
    designLeaderboard: designLeaderboard,
    trainerReport: trainerReport,
    designHistory: designHistory,
    designReport: designReport,
    trainerSession: trainerSession,
    // Collaborator Chat
    collabStart: collabStart,
    collabMessage: collabMessage,
    collabFinish: collabFinish,
    collabHistory: collabHistory
  };
})();
