/* learning-chrome.js — shared accessibility and trainer chrome for reading pages.
   Objectives and expected outputs are copied from each page's existing canonical
   goals/deliverable fields; this file never invents lesson content. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDELearningChrome = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { api.init(document); });
    } else {
      api.init(document);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MAX_OBJECTIVES = 5;

  function canonicalItems(doc, selector, limit) {
    return Array.prototype.slice.call(doc.querySelectorAll(selector), 0, limit);
  }

  function addSkipLink(doc, main) {
    var existing = doc.getElementById("reading-skip-link");
    if (existing) return existing;

    if (!main.id) main.id = "reading-main";
    main.tabIndex = -1;
    main.classList.add("reading-main-target");

    var link = doc.createElement("a");
    link.id = "reading-skip-link";
    link.className = "skip-link";
    link.href = "#" + main.id;
    link.textContent = "Skip to reading";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      main.focus();
      main.scrollIntoView({ block: "start" });
    });
    doc.body.insertBefore(link, doc.body.firstChild);
    return link;
  }

  function addObjectives(doc, lede) {
    var existing = doc.getElementById("learning-objectives");
    if (existing) return existing;

    var goals = canonicalItems(doc, "#goals-modal .goals-list li", MAX_OBJECTIVES);
    var source = "goals-modal";

    if (goals.length < 3) {
      var meta = doc.querySelector('meta[name="fde-concepts"]');
      var concepts = meta && meta.content
        ? meta.content.split(",").map(function (item) { return item.trim(); }).filter(Boolean)
        : [];
      if (concepts.length < 3) return null;
      goals = concepts.slice(0, MAX_OBJECTIVES).map(function (concept) {
        var item = doc.createElement("li");
        item.textContent = concept.replace(/-/g, " ");
        return item;
      });
      source = "fde-concepts";
    }

    var section = doc.createElement("section");
    section.id = "learning-objectives";
    section.className = "learning-objectives";
    section.setAttribute("aria-labelledby", "learning-objectives-title");
    section.setAttribute("data-source", source);

    var metaConcepts = doc.querySelector('meta[name="fde-concepts"]');
    if (metaConcepts && metaConcepts.content) {
      section.setAttribute("data-fde-concepts", metaConcepts.content);
    }

    var heading = doc.createElement("h2");
    heading.id = "learning-objectives-title";
    heading.textContent = "Learning objectives";
    section.appendChild(heading);

    var list = doc.createElement("ul");
    list.className = "learning-objectives-list";
    goals.forEach(function (goal) { list.appendChild(goal.cloneNode(true)); });
    section.appendChild(list);

    var outputs = canonicalItems(doc, "#goals-modal .deliv-list li", Infinity);
    if (outputs.length) {
      var details = doc.createElement("details");
      details.className = "lesson-support";
      var summary = doc.createElement("summary");
      summary.textContent = "Expected output for today";
      details.appendChild(summary);
      var outputList = doc.createElement("ul");
      outputList.className = "lesson-output-list";
      outputs.forEach(function (output) { outputList.appendChild(output.cloneNode(true)); });
      details.appendChild(outputList);
      section.appendChild(details);
    }

    var summaryNode = lede.querySelector(".summary");
    lede.insertBefore(section, summaryNode || null);
    return section;
  }

  function addPrintSupport(doc) {
    var view = doc.defaultView;
    if (!view || doc.__fdeLearningPrintSupport) return;
    doc.__fdeLearningPrintSupport = true;

    view.addEventListener("beforeprint", function () {
      canonicalItems(doc, ".lesson-support", Infinity).forEach(function (details) {
        if (!details.open) {
          details.open = true;
          details.setAttribute("data-opened-for-print", "");
        }
      });
    });
    view.addEventListener("afterprint", function () {
      canonicalItems(doc, ".lesson-support[data-opened-for-print]", Infinity).forEach(function (details) {
        details.open = false;
        details.removeAttribute("data-opened-for-print");
      });
    });
  }

  function init(doc) {
    var main = doc.querySelector("main.lesson2, main.lesson, main.wrap, main");
    var lede = doc.querySelector(".reading-col .lede, .lede");
    if (!main || !lede || !doc.body) {
      return { skipLink: null, objectives: null };
    }
    addPrintSupport(doc);
    return {
      skipLink: addSkipLink(doc, main),
      objectives: addObjectives(doc, lede)
    };
  }

  return { init: init };
});
