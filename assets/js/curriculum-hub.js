/* curriculum-hub.js — trainer day launcher driven by window.WEEKS. */
(function () {
  "use strict";
  function firstHref(day) {
    return day && (day.href || (day.parts && day.parts[0] && day.parts[0].href)) || "";
  }
  function init() {
    var weeks = Array.isArray(window.WEEKS) ? window.WEEKS : [];
    var weekSelect = document.getElementById("hub-week");
    var daySelect = document.getElementById("hub-day");
    var open = document.getElementById("hub-open");
    var status = document.getElementById("hub-launch-status");
    if (!weekSelect || !daySelect || !open || !status) return;

    weeks.forEach(function (week) {
      var option = document.createElement("option");
      option.value = String(week.w);
      option.textContent = "Week " + week.w + " — " + week.title;
      weekSelect.appendChild(option);
    });

    function selectedWeek() {
      return weeks.find(function (week) { return String(week.w) === weekSelect.value; });
    }
    function fillDays() {
      daySelect.replaceChildren();
      var week = selectedWeek();
      if (!week) { open.disabled = true; status.textContent = "No curriculum week is available."; return; }
      week.days.forEach(function (day, index) {
        var option = document.createElement("option");
        option.value = String(index);
        option.textContent = "Day " + (index + 1) + " — " + day.t;
        option.disabled = !firstHref(day);
        daySelect.appendChild(option);
      });
      var available = Array.from(daySelect.options).find(function (option) { return !option.disabled; });
      if (available) daySelect.value = available.value;
      update();
    }
    function update() {
      var week = selectedWeek();
      var day = week && week.days[Number(daySelect.value)];
      var href = firstHref(day);
      open.disabled = !href;
      status.textContent = href ? "Ready: Week " + week.w + ", Day " + (Number(daySelect.value) + 1) + "." : "That day has no published route yet.";
    }
    function launch() {
      var week = selectedWeek();
      var day = week && week.days[Number(daySelect.value)];
      var href = firstHref(day);
      if (href) window.location.assign(window.FDEBatchContext ? window.FDEBatchContext.currentHref(href) : href);
    }

    weekSelect.addEventListener("change", fillDays);
    daySelect.addEventListener("change", update);
    open.addEventListener("click", launch);
    weekSelect.value = weeks.some(function (week) { return week.w === 1; }) ? "1" : (weeks[0] ? String(weeks[0].w) : "");
    fillDays();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
