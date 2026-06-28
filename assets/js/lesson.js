/* lesson.js — paged stepper for a reading. Replaces scroll-driven build with
   Prev/Next + dots + arrow keys. The diagram builds in sync; the whole lesson
   lives in ~one viewport (minimal page scroll). */
(function () {
  function init() {
    const steps = Array.from(document.querySelectorAll(".lstep"));
    if (!steps.length) return;
    const dotsWrap = document.querySelector(".dots");
    const prevBtn = document.querySelector(".lnav-prev");
    const nextBtn = document.querySelector(".lnav-next");
    const counter = document.querySelector(".lnav-count");
    let cur = 0;

    steps.forEach((s, i) => {
      const d = document.createElement("button");
      d.className = "dot"; d.type = "button"; d.setAttribute("aria-label", "Step " + (i + 1));
      d.addEventListener("click", () => go(i));
      dotsWrap.appendChild(d);
    });
    const dots = Array.from(dotsWrap.children);

    function go(n) {
      n = Math.max(0, Math.min(steps.length - 1, n));
      cur = n;
      steps.forEach((s, i) => s.classList.toggle("active", i === n));
      dots.forEach((d, i) => { d.classList.toggle("on", i <= n); d.classList.toggle("cur", i === n); });
      if (window.Diagram) window.Diagram.goTo(n);
      prevBtn.disabled = (n === 0);
      if (counter) counter.textContent = (n + 1) + " / " + steps.length;
      const last = n === steps.length - 1;
      nextBtn.innerHTML = last ? "Take the check ✓" : "Next ▸";
      nextBtn.classList.toggle("is-final", last);
    }

    prevBtn.addEventListener("click", () => go(cur - 1));
    nextBtn.addEventListener("click", () => {
      if (cur === steps.length - 1) { if (window.FDE_openQuiz) window.FDE_openQuiz(); }
      else go(cur + 1);
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      if (document.querySelector(".modal-overlay:not([hidden])")) return; // modal owns keys
      if (e.key === "ArrowRight") go(cur + 1);
      else if (e.key === "ArrowLeft") go(cur - 1);
    });

    if (window.Diagram) window.Diagram.init("#diagram", ".stage-caption");
    go(0);
  }
  document.addEventListener("DOMContentLoaded", init);
})();
