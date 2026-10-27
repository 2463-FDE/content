/* curriculum-config.js — public, non-secret curriculum presentation config.
   Supported batches resolve to an explicit content model here; unknown batches
   never inherit another cohort's curriculum. No learner/provider input is trusted. */
(function (root, factory) {
  var config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  root.FDE_CURRICULUM_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var ltmIdentity = "LTM, formerly LTIMindtree";
  return Object.freeze({
    clientIdentity: ltmIdentity,
    batch: Object.freeze({
      placeholder: "2567",
      storageKey: "fde_batch_context",
      queryParameter: "batch",
      label: "Batch",
      next: Object.freeze({ id: null, label: "Next batch", status: "unconfigured" }),
      models: Object.freeze({
        "2567": Object.freeze({
          id: "ltm-2567",
          clientIdentity: ltmIdentity
        })
      })
    }),
    cloudPath: Object.freeze({
      status: "evidence-lane-pending",
      label: "AWS/GCP evidence seam pending",
      options: Object.freeze(["aws", "gcp", "both"]),
      active: false
    })
  });
});
