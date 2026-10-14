/* interactive-cloud.js — provider decision check (predict-then-check).

   Progressive enhancement over static, readable markup:
     <div class="ix-cloud" data-core-interaction data-cloud="aws|gcp">
       <div class="ix-k">✓ Practice · …</div>
       <p class="ix-cloud-q">Question…</p>
       <ol class="ix-cloud-options">
         <li data-correct data-why="…">Option</li>
         <li data-why="…">Option</li>
       </ol>
       <details class="ix-cloud-answer"><summary>Show the answer</summary>…</details>
     </div>
   Without JavaScript the question, options and answer stay readable. With it,
   the options become a radio group with a Check button, per-option feedback,
   and the answer revealed after the first check. Nothing leaves the page. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FDECloudCheck = api;
  if (typeof document !== "undefined" && document.addEventListener) {
    var run = function () { api.enhanceAll(document); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var count = 0;

  /* Pure grading: which option ids are correct, and the verdict for a pick. */
  function grade(options, pickedIndex) {
    var picked = options[pickedIndex];
    if (!picked) return { status: "unanswered", correct: false, why: "" };
    return { status: picked.correct ? "correct" : "wrong", correct: !!picked.correct, why: picked.why || "" };
  }

  function readOptions(list) {
    return Array.prototype.map.call(list.querySelectorAll("li"), function (li) {
      return { text: li.textContent.trim(), correct: li.hasAttribute("data-correct"), why: li.getAttribute("data-why") || "" };
    });
  }

  function enhance(doc, host) {
    if (host.getAttribute("data-enhanced") === "true") return;
    var list = host.querySelector(".ix-cloud-options");
    var answer = host.querySelector(".ix-cloud-answer");
    if (!list) return;
    count += 1;
    var name = "ix-cloud-" + count;
    var options = readOptions(list);
    var question = host.querySelector(".ix-cloud-q");

    var fieldset = doc.createElement("fieldset");
    fieldset.className = "ix-cloud-choices";
    var legend = doc.createElement("legend");
    legend.className = "sr-only";
    legend.textContent = question ? question.textContent.trim() : "Choose one";
    fieldset.appendChild(legend);
    var labels = options.map(function (option, index) {
      var label = doc.createElement("label");
      label.className = "ix-cloud-choice";
      var input = doc.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = String(index);
      var text = doc.createElement("span");
      text.textContent = option.text;
      label.appendChild(input);
      label.appendChild(text);
      fieldset.appendChild(label);
      return label;
    });

    var actions = doc.createElement("div");
    actions.className = "ix-cloud-actions";
    var check = doc.createElement("button");
    check.type = "button";
    check.className = "ix-btn";
    check.textContent = "Check my choice";
    actions.appendChild(check);
    var feedback = doc.createElement("p");
    feedback.className = "ix-cloud-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");

    check.addEventListener("click", function () {
      var picked = fieldset.querySelector("input:checked");
      var verdict = grade(options, picked ? Number(picked.value) : -1);
      labels.forEach(function (label) { label.classList.remove("is-correct", "is-wrong"); });
      if (verdict.status === "unanswered") {
        feedback.textContent = "Pick one option first.";
        return;
      }
      labels[Number(picked.value)].classList.add(verdict.correct ? "is-correct" : "is-wrong");
      feedback.textContent = (verdict.correct ? "Right. " : "Not this one. ") + verdict.why +
        (verdict.correct ? "" : " Try another option.");
      if (answer) {
        answer.hidden = false;
        if (verdict.correct) answer.open = true;
      }
    });

    list.hidden = true;
    if (answer) answer.hidden = true;
    list.parentNode.insertBefore(fieldset, list.nextSibling);
    fieldset.parentNode.insertBefore(actions, fieldset.nextSibling);
    actions.parentNode.insertBefore(feedback, actions.nextSibling);
    host.setAttribute("data-enhanced", "true");
  }

  function enhanceAll(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll(".ix-cloud"), function (host) { enhance(doc, host); });
  }

  return { grade: grade, enhanceAll: enhanceAll };
});
