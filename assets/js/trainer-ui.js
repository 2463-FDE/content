/* trainer-ui.js — focused accessibility behavior for trainer tabs and fields. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FDETrainerUI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function tabsFor(container) {
    return Array.from(container.querySelectorAll(".tr-tab"));
  }

  function activateTab(container, tab, moveFocus) {
    const which = tab.getAttribute("data-tab");
    tabsFor(container).forEach(function (candidate) {
      const selected = candidate === tab;
      candidate.classList.toggle("on", selected);
      candidate.setAttribute("aria-selected", selected ? "true" : "false");
      candidate.tabIndex = selected ? 0 : -1;
    });
    container.querySelectorAll(".tr-tabpanel").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== which;
    });
    if (moveFocus) tab.focus();
  }

  function bindTabs(container) {
    const tabs = tabsFor(container);
    tabs.forEach(function (tab, index) {
      tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      tab.addEventListener("click", function () { activateTab(container, tab, false); });
      tab.addEventListener("keydown", function (event) {
        let next = null;
        if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (event.key === "Home") next = tabs[0];
        else if (event.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        activateTab(container, next, true);
      });
    });
  }

  function describedBy(input) {
    return (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  }

  function clearFieldError(input, error) {
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    const ids = describedBy(input).filter(function (id) { return id !== error.id; });
    if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
    else input.removeAttribute("aria-describedby");
  }

  function setFieldError(input, error, message, moveFocus) {
    clearFieldError(input, error);
    if (!message) return;
    error.textContent = message;
    input.setAttribute("aria-invalid", "true");
    const ids = describedBy(input);
    if (error.id && !ids.includes(error.id)) ids.push(error.id);
    if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
    if (moveFocus) input.focus();
  }

  return { activateTab, bindTabs, clearFieldError, setFieldError };
});
