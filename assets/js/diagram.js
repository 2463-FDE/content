/* diagram.js — declarative SVG diagram with hand-drawn (Excalidraw-style)
   wobble + per-step draw-in animation. No dependencies.

   A page defines `window.DIAGRAM = { width, height, title, nodes:[...], edges:[...], captions:[...] }`.
   nodes: { id, step, x, y, w, h, label }
   edges: { id, step, from, to, label?, dir? ('->'|'-'), bend? }
   captions: array indexed by step number (HTML allowed).

   goTo(n) reveals everything with step<=n, highlights step===n, dims earlier. */

(function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  let cfg = null, root = null, captionEl = null, current = -1;
  const nodeById = {};

  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // hand-drawn filter: subtle turbulence displacement on strokes
  function defs() {
    const d = el("defs", {});
    d.innerHTML =
      '<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#2b2f36"/></marker>' +
      '<marker id="arrowhot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#e8590c"/></marker>';
    return d;
  }

  function center(n) { return { x: n.x + n.w / 2, y: n.y + n.h / 2 }; }

  // attach point on node border toward a target point
  function anchor(n, tx, ty) {
    const c = center(n), dx = tx - c.x, dy = ty - c.y;
    if (dx === 0 && dy === 0) return c;
    const hw = n.w / 2, hh = n.h / 2;
    const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
    const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
    const s = Math.min(sx, sy);
    return { x: c.x + dx * s, y: c.y + dy * s };
  }

  function buildNode(n) {
    const g = el("g", { class: "d-el d-node", "data-step": n.step, "data-id": n.id });
    const rect = el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 8, filter: "url(#rough)" });
    const perim = 2 * (n.w + n.h);
    rect.style.strokeDasharray = perim;
    rect.style.strokeDashoffset = perim;
    g.appendChild(rect);
    const lines = String(n.label).split("\n");
    const cx = n.x + n.w / 2;
    const startY = n.y + n.h / 2 - (lines.length - 1) * 8 + 4;
    lines.forEach((ln, i) => {
      const t = el("text", { x: cx, y: startY + i * 16, "text-anchor": "middle" });
      t.textContent = ln;
      g.appendChild(t);
    });
    g._rect = rect; g._perim = perim;
    return g;
  }

  function buildEdge(e) {
    const a = nodeById[e.from], b = nodeById[e.to];
    const ca = center(a), cb = center(b);
    const pa = anchor(a, cb.x, cb.y), pb = anchor(b, ca.x, ca.y);
    let dpath;
    if (e.bend) {
      const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2 + e.bend;
      dpath = `M${pa.x},${pa.y} Q${mx},${my} ${pb.x},${pb.y}`;
    } else {
      dpath = `M${pa.x},${pa.y} L${pb.x},${pb.y}`;
    }
    const g = el("g", { class: "d-el d-edge", "data-step": e.step, "data-id": e.id });
    const p = el("path", { d: dpath, filter: "url(#rough)" });
    if (e.dir !== "-") p.setAttribute("marker-end", "url(#arrow)");
    const len = p.getTotalLength ? 0 : 0; // measured after insert
    g.appendChild(p);
    if (e.label) {
      const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2 + (e.bend ? e.bend / 2 : 0) - 6;
      const t = el("text", { x: mx, y: my, "text-anchor": "middle" });
      t.textContent = e.label;
      // halo for readability
      const halo = el("text", { x: mx, y: my, "text-anchor": "middle", stroke: "#fff", "stroke-width": 4 });
      halo.textContent = e.label;
      g.appendChild(halo); g.appendChild(t);
    }
    g._path = p; g._marker = e.dir !== "-";
    return g;
  }

  function render(spec) {
    cfg = spec;
    root.innerHTML = "";
    for (const k in nodeById) delete nodeById[k];
    root.setAttribute("viewBox", `0 0 ${spec.width} ${spec.height}`);
    root.setAttribute("preserveAspectRatio", "xMidYMid meet");
    root.appendChild(defs());
    spec.nodes.forEach(n => nodeById[n.id] = n);
    // edges first (under nodes)
    const edgeLayer = el("g", {}), nodeLayer = el("g", {});
    spec.edges.forEach(e => { const g = buildEdge(e); e._g = g; edgeLayer.appendChild(g); });
    spec.nodes.forEach(n => { const g = buildNode(n); n._g = g; nodeLayer.appendChild(g); });
    root.appendChild(edgeLayer); root.appendChild(nodeLayer);
    // measure edge path lengths now that they're in the DOM
    spec.edges.forEach(e => {
      const len = e._g._path.getTotalLength();
      e._g._path.style.strokeDasharray = len;
      e._g._path.style.strokeDashoffset = len;
      e._g._len = len;
    });
    current = -1;
    goTo(0);
  }

  function drawIn(g, isNode) {
    g.classList.add("shown");
    const target = isNode ? g._rect : g._path;
    // force reflow then animate dashoffset to 0
    requestAnimationFrame(() => {
      target.style.transition = "stroke-dashoffset .6s ease";
      target.style.strokeDashoffset = 0;
    });
  }

  function goTo(n) {
    if (!cfg || n === current) return;
    const forward = n > current;
    current = n;
    const all = [...cfg.edges, ...cfg.nodes];
    all.forEach(item => {
      const g = item._g, st = item.step;
      g.classList.remove("hot", "dim");
      if (st <= n) {
        if (!g.classList.contains("shown")) {
          if (forward && st === n) drawIn(g, !!g._rect);
          else { // already-passed elements appear instantly
            g.classList.add("shown");
            const t = g._rect || g._path; if (t) t.style.strokeDashoffset = 0;
          }
        }
        if (st === n) g.classList.add("hot");
        else g.classList.add("dim");
      } else {
        g.classList.remove("shown");
        const t = g._rect || g._path;
        if (t) { t.style.transition = "none"; t.style.strokeDashoffset = g._perim || g._len || 0; }
      }
    });
    if (captionEl) captionEl.innerHTML = (cfg.captions && cfg.captions[n]) || "";
  }

  function init(svgSel, captionSel) {
    root = document.querySelector(svgSel);
    captionEl = document.querySelector(captionSel);
    if (window.DIAGRAM) render(window.DIAGRAM);
  }

  window.Diagram = { init, render, goTo, get current() { return current; } };
})();
