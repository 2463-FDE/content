/* trainer-manifest.js — authenticated loader for trainer-only expectation content.
   It never requests the trainer route for a non-trainer identity. Rendering stays
   with each page so fetched text can be inserted with textContent only. */
(function () {
  "use strict";

  let state = { status: "idle", items: [], error: "" };
  let pending = null;

  function identity() {
    try {
      return typeof window.FDE_getIdentity === "function" ? window.FDE_getIdentity() : null;
    } catch (error) {
      return null;
    }
  }

  function publish(next) {
    state = next;
    window.dispatchEvent(new CustomEvent("fde:trainer-manifest", { detail: state }));
    return state;
  }

  async function request(forceSession) {
    const base = String(window.FDE_RUN_URL || "").replace(/\/$/, "");
    if (!base) throw new Error("Trainer content service is not configured.");
    const token = await window.FDE_ensureSession(Boolean(forceSession));
    if (!token) throw new Error("Your trainer session has expired. Log out and sign in again.");
    return fetch(base + "/coworker/manifest?scope=trainer", {
      headers: { authorization: "Bearer " + token },
    });
  }

  async function load() {
    const idt = identity();
    if (!idt || idt.role !== "trainer") return state;
    if (state.status === "ready") return state;
    if (pending) return pending;

    publish({ status: "loading", items: [], error: "" });
    pending = (async function () {
      try {
        let response = await request(false);
        if (response.status === 401) response = await request(true);
        if (!response.ok) throw new Error("Trainer content could not be loaded (HTTP " + response.status + ").");
        const body = await response.json();
        const items = Array.isArray(body) ? body : body && body.items;
        if (!Array.isArray(items) || items.some(function (item) { return !item || item.visibility !== "trainer"; })) {
          throw new Error("Trainer content returned an invalid manifest.");
        }
        return publish({ status: "ready", items: items, error: "" });
      } catch (error) {
        return publish({
          status: "error",
          items: [],
          error: error && error.message ? error.message : "Trainer content could not be loaded.",
        });
      } finally {
        pending = null;
      }
    })();
    return pending;
  }

  window.FDE_loadTrainerManifest = load;
  window.FDE_getTrainerManifestState = function () { return state; };
})();
