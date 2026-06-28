/* scrolly.js — scroll-driven diagram build + in-page section nav (TOC).
   TOC groups steps by their diagram ("part"); on multi-diagram pages it's an
   accordion: only the part you're currently in is expanded, so jumping parts
   is obvious. Each <section class="step" data-diagram="i" data-step="n">
   activates diagram i / step n and its TOC entry at viewport center. */
(function () {
  // short, scannable TOC label from a long section heading
  function shortLabel(t) {
    t = (t || "").trim();
    for (const sep of [" — ", " – ", ": ", " · "]) {
      const i = t.indexOf(sep);
      if (i > 0 && i <= 28) return t.slice(0, i);
    }
    const w = t.split(/\s+/);
    let s = w.slice(0, 4).join(" ");
    if (s.length > 26) s = s.slice(0, 24).trim() + "…";
    return s;
  }
  function init() {
    const steps = Array.from(document.querySelectorAll(".step"));
    const bar = document.querySelector(".progressbar > i");
    const toc = document.querySelector(".toc");
    if (!steps.length) return;

    // group consecutive steps by data-diagram into "parts"
    const groups = [];
    steps.forEach((s) => {
      const di = parseInt(s.dataset.diagram || "0", 10);
      let g = groups[groups.length - 1];
      if (!g || g.di !== di) { g = { di, items: [] }; groups.push(g); }
      g.items.push(s);
    });
    const multi = groups.length > 1;

    const stepToLink = new Map();
    const partEls = [];
    if (toc) {
      const head = document.createElement("div");
      head.className = "toc-head";
      head.textContent = "On this page";
      toc.appendChild(head);

      groups.forEach((g, gi) => {
        const title = (window.DIAGRAMS && window.DIAGRAMS[g.di] && window.DIAGRAMS[g.di].title) || ("Part " + (gi + 1));
        const part = document.createElement("div");
        part.className = "toc-part";
        if (multi) {
          const ph = document.createElement("button");
          ph.type = "button"; ph.className = "toc-part-head";
          ph.innerHTML = `<span class="cv">▸</span><span class="pt">${title}</span>`;
          ph.addEventListener("click", () => g.items[0].scrollIntoView({ behavior: "smooth", block: "start" }));
          part.appendChild(ph);
        }
        const ul = document.createElement("ul");
        ul.className = "toc-part-list";
        g.items.forEach((s) => {
          const h = s.querySelector("h2"); if (!h) return;
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = "#"; a.textContent = shortLabel(h.textContent); a.title = h.textContent;
          a.addEventListener("click", (e) => { e.preventDefault(); s.scrollIntoView({ behavior: "smooth", block: "start" }); });
          li.appendChild(a); ul.appendChild(li);
          stepToLink.set(s, a);
        });
        part.appendChild(ul);
        toc.appendChild(part);
        partEls.push(part);
      });
      partEls.forEach((p, i) => p.classList.toggle("open", i === 0));
    }

    function openPart(gi) {
      if (!multi) return;
      partEls.forEach((p, i) => p.classList.toggle("open", i === gi));
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        steps.forEach(s => s.classList.remove("active"));
        e.target.classList.add("active");
        const n = parseInt(e.target.dataset.step, 10);
        const di = parseInt(e.target.dataset.diagram || "0", 10);
        if (!isNaN(n) && window.Diagram) window.Diagram.to(di, n);
        stepToLink.forEach((a, s) => a.classList.toggle("on", s === e.target));
        // accordion: expand the part this step belongs to
        let gi = 0;
        for (let k = 0; k < groups.length; k++) { if (groups[k].items.includes(e.target)) { gi = k; break; } }
        openPart(gi);
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
