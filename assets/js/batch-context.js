/* batch-context.js — reusable viewer-local batch context.
   Accepts any positive integer batch number, falls back honestly when storage is
   unavailable, and writes user input with textContent/value only. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDEBatchContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalize(value) {
    var text = String(value == null ? "" : value).trim();
    return /^\d+$/.test(text) && Number(text) > 0 ? text.replace(/^0+(?=\d)/, "") : null;
  }

  function create(config, storage) {
    if (!config || !config.batch) throw new Error("Curriculum batch config is unavailable.");
    var fallback = normalize(config.batch.placeholder);
    if (!fallback) throw new Error("Curriculum batch placeholder is invalid.");
    var key = config.batch.storageKey;

    function read() {
      try { return normalize(storage && storage.getItem(key)) || fallback; }
      catch (error) { return fallback; }
    }
    function write(value) {
      var next = normalize(value);
      if (!next) return { ok: false, value: read(), error: "Enter a positive batch number." };
      try { if (storage) storage.setItem(key, next); }
      catch (error) { return { ok: true, value: next, persisted: false }; }
      return { ok: true, value: next, persisted: true };
    }
    function reset() {
      try { if (storage) storage.removeItem(key); } catch (error) { /* fallback still works */ }
      return fallback;
    }
    return { read: read, write: write, reset: reset, placeholder: fallback };
  }

  function mount(doc, config, storage) {
    var context;
    try { context = create(config, storage); }
    catch (error) {
      Array.prototype.forEach.call(doc.querySelectorAll("[data-batch-context]"), function (host) {
        host.textContent = "Batch context unavailable";
        host.setAttribute("role", "status");
        host.classList.add("batch-context-error");
      });
      return null;
    }

    function publish(value) {
      Array.prototype.forEach.call(doc.querySelectorAll("[data-batch-value]"), function (node) {
        node.textContent = value;
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-client-name]"), function (node) {
        node.textContent = config.clientIdentity;
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-cloud-path-status]"), function (node) {
        var cloud = config.cloudPath || {};
        node.textContent = cloud.label || "Cloud evidence status unavailable";
        node.setAttribute("data-cloud-path-status", cloud.status || "unavailable");
        node.classList.toggle("is-pending", !cloud.active);
        node.classList.toggle("is-ready", !!cloud.active);
      });
      try { root.dispatchEvent(new CustomEvent("fde-batch-change", { detail: { batch: value } })); }
      catch (error) { /* CustomEvent is optional in older browsers */ }
    }

    Array.prototype.forEach.call(doc.querySelectorAll("[data-batch-context]"), function (host, index) {
      if (host.getAttribute("data-batch-mounted") === "true") return;
      host.setAttribute("data-batch-mounted", "true");
      host.classList.add("batch-context");

      var id = "batch-context-input-" + index;
      var label = doc.createElement("label");
      label.setAttribute("for", id);
      label.textContent = config.batch.label;
      var input = doc.createElement("input");
      input.id = id;
      input.type = "text";
      input.inputMode = "numeric";
      input.pattern = "[0-9]+";
      input.autocomplete = "off";
      input.setAttribute("aria-describedby", id + "-status");
      input.value = context.read();
      var apply = doc.createElement("button");
      apply.type = "button";
      apply.textContent = "Apply";
      var status = doc.createElement("span");
      status.id = id + "-status";
      status.className = "batch-context-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");

      function commit() {
        var result = context.write(input.value);
        input.setAttribute("aria-invalid", result.ok ? "false" : "true");
        status.textContent = result.ok
          ? (result.persisted === false ? "Applied for this page; browser storage is unavailable." : "Batch context updated.")
          : result.error;
        input.value = result.value;
        if (result.ok) publish(result.value);
      }
      apply.addEventListener("click", commit);
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
      });
      host.replaceChildren(label, input, apply, status);
    });

    publish(context.read());
    return context;
  }

  function init(doc, config, storage) {
    return mount(doc, config || root.FDE_CURRICULUM_CONFIG, storage || root.localStorage);
  }

  return { normalize: normalize, create: create, mount: mount, init: init };
});
