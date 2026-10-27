/* batch-context.js — reusable viewer-local batch and curriculum context.
   A batch is restored from the URL first, then browser storage. Curriculum
   support is resolved only through the public config; unknown batches never
   inherit another cohort's model. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDEBatchContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var activeBatch = null;

  function normalize(value) {
    var text = String(value == null ? "" : value).trim();
    return /^\d+$/.test(text) && Number(text) > 0 ? text.replace(/^0+(?=\d)/, "") : null;
  }

  function queryValue(location, parameter) {
    if (!location || !location.href || typeof URL !== "function") return null;
    try { return normalize(new URL(location.href).searchParams.get(parameter || "batch")); }
    catch (error) { return null; }
  }

  function modelFor(config, batch) {
    var models = config && config.batch && config.batch.models;
    var value = normalize(batch);
    return value && models && Object.prototype.hasOwnProperty.call(models, value) ? models[value] : null;
  }

  function create(config, storage, location) {
    if (!config || !config.batch) throw new Error("Curriculum batch config is unavailable.");
    var fallback = normalize(config.batch.placeholder);
    if (!fallback) throw new Error("Curriculum batch placeholder is invalid.");
    var key = config.batch.storageKey;
    var parameter = config.batch.queryParameter || "batch";

    function read() {
      var linked = queryValue(location, parameter);
      if (linked) return linked;
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
    return { read: read, write: write, reset: reset, placeholder: fallback, queryParameter: parameter };
  }

  function contextualizeHref(href, batch, base) {
    if (!href || String(href).charAt(0) === "#" || typeof URL !== "function") return href;
    var value = normalize(batch);
    if (!value) return href;
    try {
      var target = new URL(href, base);
      var source = new URL(base);
      if (target.origin !== source.origin || !/^(https?:|file:)$/.test(target.protocol)) return href;
      target.searchParams.set("batch", value);
      return target.href;
    } catch (error) { return href; }
  }

  function syncLocation(value, parameter, mode) {
    if (!root.location || !root.history || typeof URL !== "function") return;
    try {
      var url = new URL(root.location.href);
      if (url.searchParams.get(parameter) === value) return;
      url.searchParams.set(parameter, value);
      root.history[mode === "push" ? "pushState" : "replaceState"]({ fdeBatch: value }, "", url.href);
    } catch (error) { /* URL context is best-effort on legacy/file browsers */ }
  }

  function syncLinks(doc, value) {
    if (!doc || !root.location) return;
    Array.prototype.forEach.call(doc.querySelectorAll("a[href]"), function (link) {
      var authored = link.getAttribute("href");
      var next = contextualizeHref(authored, value, root.location.href);
      if (next !== authored) link.setAttribute("href", next);
    });
  }

  function setHiddenByBatch(node, hidden) {
    if (!node) return;
    if (hidden) {
      node.hidden = true;
      node.setAttribute("data-batch-hidden", "true");
    } else if (node.getAttribute("data-batch-hidden") === "true") {
      node.hidden = false;
      node.removeAttribute("data-batch-hidden");
    }
  }

  function applyCurriculumModel(doc, config, value) {
    if (!doc || !doc.body) return modelFor(config, value);
    var model = modelFor(config, value);
    var supported = !!model;
    doc.body.setAttribute("data-curriculum-batch", value);
    doc.body.setAttribute("data-curriculum-model", supported ? model.id : "unavailable");

    var surfaces = Array.prototype.slice.call(doc.querySelectorAll("[data-curriculum-surface]"));
    var pathname = root.location && root.location.pathname || "";
    if (/\/weeks\/w\d{2}\//.test(pathname)) {
      [doc.querySelector("main"), doc.querySelector("footer.foot"), doc.querySelector(".skip-link"),
        doc.querySelector(".rc-fab"), doc.querySelector(".rc-overlay")].forEach(function (node) {
        if (node && surfaces.indexOf(node) === -1) surfaces.push(node);
      });
    }
    surfaces.forEach(function (node) { setHiddenByBatch(node, !supported); });

    var status = doc.getElementById("curriculum-model-status");
    if (!status) {
      status = doc.createElement("section");
      status.id = "curriculum-model-status";
      status.className = "curriculum-model-empty";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      var insertion = doc.querySelector(".hub-launcher") || doc.querySelector(".tr-curriculum") || doc.getElementById("cal") || doc.querySelector("main") || doc.querySelector("[data-curriculum-surface]");
      if (insertion && insertion.parentNode) insertion.parentNode.insertBefore(status, insertion);
      else status.hidden = true;
    }
    var supportedBatches = Object.keys(config.batch.models || {});
    var recovery = supportedBatches.length === 1
      ? " Choose Batch " + supportedBatches[0] + " to load its curriculum."
      : " Choose a supported batch to load its curriculum.";
    var message = supported ? "" : "No curriculum is configured for Batch " + value + "; content from another cohort is not shown." + recovery;
    if (status.hidden !== supported) status.hidden = supported;
    if (status.textContent !== message) status.textContent = message;

    if (!doc.documentElement.getAttribute("data-curriculum-original-title")) {
      doc.documentElement.setAttribute("data-curriculum-original-title", doc.title || "2463-FDE");
    }
    doc.title = supported
      ? doc.documentElement.getAttribute("data-curriculum-original-title")
      : "Curriculum unavailable · Batch " + value + " | 2463-FDE";
    return model;
  }

  function mount(doc, config, storage) {
    var context;
    try { context = create(config, storage, root.location); }
    catch (error) {
      Array.prototype.forEach.call(doc.querySelectorAll("[data-batch-context]"), function (host) {
        host.textContent = "Batch context unavailable";
        host.setAttribute("role", "status");
        host.classList.add("batch-context-error");
      });
      return null;
    }

    function publish(value) {
      activeBatch = value;
      var model = applyCurriculumModel(doc, config, value);
      Array.prototype.forEach.call(doc.querySelectorAll("[data-batch-value]"), function (node) {
        node.textContent = value;
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-client-name]"), function (node) {
        node.textContent = model && model.clientIdentity || "the selected cohort";
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-cloud-path-status]"), function (node) {
        var cloud = config.cloudPath || {};
        node.textContent = cloud.label || "Cloud evidence status unavailable";
        node.setAttribute("data-cloud-path-status", cloud.status || "unavailable");
        node.classList.toggle("is-pending", !cloud.active);
        node.classList.toggle("is-ready", !!cloud.active);
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-batch-context] input"), function (input) {
        input.value = value;
      });
      syncLinks(doc, value);
      try { root.dispatchEvent(new CustomEvent("fde-batch-change", { detail: { batch: value, model: model } })); }
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
        if (result.ok) {
          syncLocation(result.value, context.queryParameter, "push");
          publish(result.value);
        }
      }
      apply.addEventListener("click", commit);
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
      });
      host.replaceChildren(label, input, apply, status);
    });

    var initial = context.read();
    context.write(initial);
    syncLocation(initial, context.queryParameter, "replace");
    publish(initial);

    if (typeof root.addEventListener === "function") {
      root.addEventListener("popstate", function () {
        var value = queryValue(root.location, context.queryParameter) || context.placeholder;
        context.write(value);
        publish(value);
      });
    }
    if (typeof root.MutationObserver === "function" && doc.body) {
      new root.MutationObserver(function () {
        syncLinks(doc, activeBatch);
        applyCurriculumModel(doc, config, activeBatch);
      }).observe(doc.body, { childList: true, subtree: true });
    }
    return context;
  }

  function init(doc, config, storage) {
    return mount(doc, config || root.FDE_CURRICULUM_CONFIG, storage || root.localStorage);
  }

  function current() { return activeBatch; }
  function currentHref(href) {
    return root.location ? contextualizeHref(href, activeBatch, root.location.href) : href;
  }

  return {
    normalize: normalize,
    modelFor: modelFor,
    create: create,
    mount: mount,
    init: init,
    contextualizeHref: contextualizeHref,
    current: current,
    currentHref: currentHref
  };
});
