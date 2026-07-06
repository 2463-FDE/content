/* codeviewer.js — read-only VS Code-style code popups. Self-contained, no deps.
   Renders any <div class="cv" data-file="ingest.py" data-lang="python"> whose
   raw source lives in a child <pre class="cv-raw">…escaped code…</pre> into an
   editor chrome (title bar + traffic-lights + filename tab) with line numbers
   and lightweight syntax highlighting. Meant to sit inside a .code-modal so the
   reading length is unaffected until the learner opens it. */
(function () {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Language token specs. Order matters: earlier patterns win. Each match is
  // wrapped in <span class="t-<type>">. Everything else is emitted verbatim.
  const SPECS = {
    python: [
      ["com", /#[^\n]*/y],
      ["str", /(?:[rbfRBF]{0,2})(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y],
      ["dec", /@[A-Za-z_][\w.]*/y],
      ["num", /\b\d[\d_]*\.?\d*(?:e[+-]?\d+)?\b/iy],
      ["kw", /\b(?:def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|None|True|False|with|try|except|finally|raise|yield|lambda|async|await|pass|break|continue|global|nonlocal|assert|del)\b/y],
      ["bif", /\b(?:print|len|range|list|dict|set|tuple|str|int|float|bool|enumerate|zip|open|sorted|sum|min|max|map|filter|isinstance|super|self)\b/y],
      ["fn", /[A-Za-z_]\w*(?=\s*\()/y],
      ["id", /[A-Za-z_]\w*/y],
      ["ws", /\s+/y],
      ["any", /[^]/y],
    ],
    sql: [
      ["com", /--[^\n]*/y],
      ["str", /'(?:''|[^'])*'/y],
      ["num", /\b\d+\b/y],
      ["kw", /\b(?:CREATE|TABLE|INDEX|ON|USING|WITH|SELECT|FROM|WHERE|ORDER\s+BY|LIMIT|INSERT|INTO|VALUES|AND|OR|NOT|AS|VECTOR|EXTENSION|IF|EXISTS|PRIMARY|KEY)\b/iy],
      ["fn", /[A-Za-z_]\w*(?=\s*\()/y],
      ["id", /[A-Za-z_]\w*/y],
      ["ws", /\s+/y],
      ["any", /[^]/y],
    ],
    bash: [
      ["com", /#[^\n]*/y],
      ["str", /"(?:\\.|[^"\\])*"|'[^']*'/y],
      ["kw", /\b(?:export|cd|pip|python|npx|curl|echo|source)\b/y],
      ["any", /[^]/y],
    ],
  };

  function highlight(code, lang) {
    const spec = SPECS[lang] || SPECS.python;
    let out = "", i = 0;
    while (i < code.length) {
      let matched = false;
      for (const [type, re] of spec) {
        re.lastIndex = i;
        const m = re.exec(code);
        if (m && m.index === i) {
          const text = esc(m[0]);
          out += (type === "ws" || type === "any" || type === "id") ? text : `<span class="t-${type}">${text}</span>`;
          i += m[0].length; matched = true; break;
        }
      }
      if (!matched) { out += esc(code[i]); i++; }
    }
    return out;
  }

  function render(el) {
    const raw = el.querySelector(".cv-raw");
    if (!raw) return;
    const code = raw.textContent.replace(/^\n/, "").replace(/\s+$/, "");
    const lang = el.dataset.lang || "python";
    const file = el.dataset.file || "example.py";
    const lines = highlight(code, lang).split("\n");
    const gutter = lines.map((_, i) => `<span>${i + 1}</span>`).join("");
    const body = lines.map(l => `<span class="cv-line">${l || " "}</span>`).join("");
    el.innerHTML =
      `<div class="cv-bar"><span class="cv-dots"><i class="d-r"></i><i class="d-y"></i><i class="d-g"></i></span>` +
      `<span class="cv-tab">${esc(file)}</span></div>` +
      `<div class="cv-body"><div class="cv-gutter">${gutter}</div><pre class="cv-pre"><code>${body}</code></pre></div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".cv").forEach(render);
  });
})();
