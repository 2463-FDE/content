/* scrolly.js — wires .step sections to the diagram + progress bar.
   Each <section class="step" data-step="N"> activates diagram step N when
   it scrolls to the middle of the viewport. */
(function () {
  function init() {
    const steps = Array.from(document.querySelectorAll(".step"));
    const bar = document.querySelector(".progressbar > i");
    if (!steps.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          steps.forEach(s => s.classList.remove("active"));
          e.target.classList.add("active");
          const n = parseInt(e.target.dataset.step, 10);
          if (!isNaN(n) && window.Diagram) window.Diagram.goTo(n);
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    steps.forEach(s => obs.observe(s));

    // reading-progress bar
    if (bar) {
      const onScroll = () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
      };
      document.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.Diagram) window.Diagram.init("#diagram", ".stage-caption");
    init();
  });
})();
