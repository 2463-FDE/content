/* scrolly.js — scroll-driven diagram build + in-page section nav (TOC).
   Each <section class="step" data-step="N"> activates diagram step N and its
   TOC entry when it reaches the middle of the viewport. */
(function () {
  function init() {
    const steps = Array.from(document.querySelectorAll(".step"));
    const bar = document.querySelector(".progressbar > i");
    const toc = document.querySelector(".toc");
    if (!steps.length) return;

    // build the table of contents from each step's heading
    const tocLinks = [];
    if (toc) {
      const head = document.createElement("div"); head.className = "toc-head"; head.textContent = "On this page";
      const ul = document.createElement("ul");
      steps.forEach((s, i) => {
        const h = s.querySelector("h2"); if (!h) return;
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#"; a.textContent = h.textContent;
        a.addEventListener("click", (e) => { e.preventDefault(); s.scrollIntoView({ behavior: "smooth", block: "start" }); });
        li.appendChild(a); ul.appendChild(li); tocLinks[i] = a;
      });
      toc.appendChild(head); toc.appendChild(ul);
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        steps.forEach(s => s.classList.remove("active"));
        e.target.classList.add("active");
        const n = parseInt(e.target.dataset.step, 10);
        const di = parseInt(e.target.dataset.diagram || "0", 10);
        if (!isNaN(n) && window.Diagram) window.Diagram.to(di, n);
        const idx = steps.indexOf(e.target);
        tocLinks.forEach((a, i) => { if (a) a.classList.toggle("on", i === idx); });
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(s => obs.observe(s));

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
