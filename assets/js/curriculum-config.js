/* curriculum-config.js — public, non-secret curriculum presentation config.
   The temporary batch placeholder lives here once; UI code reads it rather than
   copying a cohort number into pages. No learner/provider input is trusted. */
(function (root, factory) {
  var config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  root.FDE_CURRICULUM_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({
    clientIdentity: "LTM, formerly LTIMindtree",
    batch: Object.freeze({
      placeholder: "2567",
      storageKey: "fde_batch_context",
      label: "Batch"
    }),
    cloudPath: Object.freeze({
      status: "evidence-lane-pending",
      label: "AWS/GCP evidence seam pending",
      options: Object.freeze(["aws", "gcp", "both"]),
      active: false
    })
  });
});
