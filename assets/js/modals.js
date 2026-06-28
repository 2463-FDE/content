/* modals.js — generic modal opener. Any element with data-modal="<id>" opens
   the .modal-overlay with that id; close via .modal-close, backdrop click, Esc. */
(function () {
  function open(m) { if (!m) return; m.hidden = false; document.body.style.overflow = "hidden"; const c = m.querySelector(".modal-card"); if (c) c.scrollTop = 0; }
  function close(m) { if (!m) return; m.hidden = true; document.body.style.overflow = ""; }
  window.FDE_openModal = (id) => open(document.getElementById(id));
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-modal]").forEach(btn => {
      const m = document.getElementById(btn.dataset.modal);
      btn.addEventListener("click", () => open(m));
    });
    document.querySelectorAll(".modal-overlay").forEach(m => {
      const x = m.querySelector(".modal-close"); if (x) x.addEventListener("click", () => close(m));
      m.addEventListener("click", e => { if (e.target === m) close(m); });
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal-overlay:not([hidden])").forEach(close); });
  });
})();
