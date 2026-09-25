/* modals.js — generic accessible modal opener. Any element with
   data-modal="<id>" opens that overlay; close via .modal-close, backdrop, or Esc. */
(function () {
  const returnFocus = new WeakMap();
  const focusableSelector = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  function openModal() {
    const visible = Array.from(document.querySelectorAll(".modal-overlay:not([hidden])"));
    return visible[visible.length - 1] || null;
  }

  function focusableIn(modal) {
    return Array.from(modal.querySelectorAll(focusableSelector)).filter(el =>
      !el.hidden && el.getAttribute("aria-hidden") !== "true" && el.getClientRects().length > 0
    );
  }

  function prepareDialog(modal) {
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    const heading = modal.querySelector("h1, h2, h3");
    if (heading) {
      if (!heading.id) heading.id = `${modal.id || "modal"}-title`;
      modal.setAttribute("aria-labelledby", heading.id);
    }
  }

  function open(modal) {
    if (!modal || !modal.hidden) return;
    returnFocus.set(modal, document.activeElement);
    prepareDialog(modal);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const card = modal.querySelector(".modal-card");
    if (card) card.scrollTop = 0;
    const target = modal.querySelector(".modal-close") || focusableIn(modal)[0] || card;
    if (target) {
      if (!target.matches(focusableSelector)) target.tabIndex = -1;
      target.focus();
    }
  }

  function close(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!openModal()) document.body.style.overflow = "";
    const trigger = returnFocus.get(modal);
    returnFocus.delete(modal);
    if (trigger && trigger.isConnected && typeof trigger.focus === "function") trigger.focus();
  }

  window.FDE_openModal = (id) => open(document.getElementById(id));
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-modal]").forEach(btn => {
      const modal = document.getElementById(btn.dataset.modal);
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", () => open(modal));
    });
    document.querySelectorAll(".modal-overlay").forEach(modal => {
      prepareDialog(modal);
      const closeButton = modal.querySelector(".modal-close");
      if (closeButton) closeButton.addEventListener("click", () => close(modal));
      modal.addEventListener("click", event => {
        if (event.target === modal) close(modal);
      });
    });
    document.addEventListener("keydown", event => {
      const modal = openModal();
      if (!modal) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(modal);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusableIn(modal);
      if (!items.length) {
        event.preventDefault();
        modal.querySelector(".modal-card")?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });
})();
