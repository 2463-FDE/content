/* interactive.js — reusable inline learning widgets for reading pages.
   Declared via markup; auto-initialized on DOMContentLoaded. Each replaces
   passive prose with an active beat. All self-contained, no deps.

   Components:
   1. Predict-then-reveal:  <div class="ix-predict" data-q="..." data-a="..."></div>
   2. Spot-the-problem:     <div class="ix-spot" data-snippet="..." data-q="..." data-a="..."></div>
   3. Token counter:        <div class="ix-tokens" data-sample="..."></div>
   4. Temperature slider:   <div class="ix-temp"></div>
   5. Cost calculator:      <div class="ix-cost"></div>
   6. Retry/backoff sim:    <div class="ix-retry"></div>
*/
(function () {
  const esc = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function predict(elist) {
    elist.forEach(el => {
      const q = el.dataset.q || el.getAttribute("data-q") || "";
      const a = el.dataset.a || "";
      el.innerHTML =
        `<div class="ix-k">Predict</div><p class="ix-q">${q}</p>` +
        `<button class="ix-btn" type="button">Reveal answer</button>` +
        `<div class="ix-a">${a}</div>`;
      const btn = el.querySelector(".ix-btn"), ans = el.querySelector(".ix-a");
      btn.addEventListener("click", () => { ans.classList.add("show"); btn.style.display = "none"; });
    });
  }

  function spot(elist) {
    elist.forEach(el => {
      const snip = el.dataset.snippet || "", q = el.dataset.q || "What's the latent problem here?", a = el.dataset.a || "";
      el.innerHTML =
        `<div class="ix-k spot">🔍 Spot the problem</div>` +
        `<pre class="ix-snippet">${esc(snip)}</pre>` +
        `<p class="ix-q">${q}</p>` +
        `<button class="ix-btn" type="button">Reveal the problem</button>` +
        `<div class="ix-a">${a}</div>`;
      const btn = el.querySelector(".ix-btn"), ans = el.querySelector(".ix-a");
      btn.addEventListener("click", () => { ans.classList.add("show"); btn.style.display = "none"; });
    });
  }

  function tokenCounter(elist) {
    elist.forEach(el => {
      const sample = el.dataset.sample || "Summarize this RFP for a non-technical reader.";
      el.innerHTML =
        `<div class="ix-k">Token counter <span class="ix-sub">(≈ chars ÷ 4)</span></div>` +
        `<textarea class="ix-ta" rows="3"></textarea>` +
        `<div class="ix-out"><b class="t-tok">0</b> tokens · <span class="t-ch">0</span> chars · <span class="t-wd">0</span> words</div>`;
      const ta = el.querySelector(".ix-ta");
      const tok = el.querySelector(".t-tok"), ch = el.querySelector(".t-ch"), wd = el.querySelector(".t-wd");
      function upd() {
        const s = ta.value; const chars = s.length;
        ch.textContent = chars; wd.textContent = s.trim() ? s.trim().split(/\s+/).length : 0;
        tok.textContent = Math.ceil(chars / 4);
      }
      ta.addEventListener("input", upd); ta.value = sample; upd();
    });
  }

  function tempSlider(elist) {
    const logits = [3.2, 2.4, 1.9, 1.2, 0.6]; // fixed candidate "scores"
    const labels = ["approve", "review", "deny", "escalate", "defer"];
    elist.forEach(el => {
      el.innerHTML =
        `<div class="ix-k">Temperature <span class="ix-sub">how the next token is picked</span></div>` +
        `<input class="ix-range" type="range" min="0" max="150" value="20">` +
        `<div class="ix-temp-val">temperature = <b>0.20</b> · <span class="ix-temp-desc"></span></div>` +
        `<div class="ix-bars"></div>`;
      const range = el.querySelector(".ix-range"), val = el.querySelector("b"), desc = el.querySelector(".ix-temp-desc"), bars = el.querySelector(".ix-bars");
      function softmax(t) {
        const T = Math.max(0.05, t);
        const ex = logits.map(z => Math.exp(z / T));
        const s = ex.reduce((a, b) => a + b, 0);
        return ex.map(e => e / s);
      }
      function upd() {
        const t = range.value / 100; val.textContent = t.toFixed(2);
        desc.textContent = t < 0.3 ? "near-deterministic — picks the top token (extraction, code, classification)"
          : t < 0.8 ? "balanced" : "creative / varied — less repeatable";
        const p = softmax(t);
        bars.innerHTML = p.map((pr, i) =>
          `<div class="ix-bar-row"><span class="ix-bar-l">${labels[i]}</span>` +
          `<span class="ix-bar"><i style="width:${(pr * 100).toFixed(1)}%"></i></span>` +
          `<span class="ix-bar-p">${(pr * 100).toFixed(0)}%</span></div>`).join("");
      }
      range.addEventListener("input", upd); upd();
    });
  }

  function costCalc(elist) {
    elist.forEach(el => {
      el.innerHTML =
        `<div class="ix-k">Cost calculator</div>` +
        `<div class="ix-grid">` +
        `<label>Input tokens<input class="c-in" type="number" value="4800"></label>` +
        `<label>Output tokens<input class="c-out" type="number" value="400"></label>` +
        `<label>$ / M input<input class="c-pin" type="number" step="0.1" value="3"></label>` +
        `<label>$ / M output<input class="c-pout" type="number" step="0.1" value="15"></label>` +
        `<label>Calls / day<input class="c-n" type="number" value="50000"></label>` +
        `</div>` +
        `<div class="ix-out">Per call <b class="c-call">$0</b> · Per day <b class="c-day">$0</b> · Per month <b class="c-mo">$0</b></div>`;
      const g = (s) => parseFloat(el.querySelector(s).value) || 0;
      function upd() {
        const per = g(".c-in") / 1e6 * g(".c-pin") + g(".c-out") / 1e6 * g(".c-pout");
        const day = per * g(".c-n"); const mo = day * 30;
        el.querySelector(".c-call").textContent = "$" + per.toFixed(4);
        el.querySelector(".c-day").textContent = "$" + day.toLocaleString(undefined, { maximumFractionDigits: 0 });
        el.querySelector(".c-mo").textContent = "$" + mo.toLocaleString(undefined, { maximumFractionDigits: 0 });
      }
      el.querySelectorAll("input").forEach(i => i.addEventListener("input", upd)); upd();
    });
  }

  function retrySim(elist) {
    elist.forEach(el => {
      el.innerHTML =
        `<div class="ix-k">Retry with backoff + jitter</div>` +
        `<div class="ix-out">base 0.5s · ×2 each attempt · cap 8s · full jitter · max 5 tries</div>` +
        `<button class="ix-btn" type="button">▶ Simulate a flaky call</button>` +
        `<div class="ix-retry-log"></div>`;
      const btn = el.querySelector(".ix-btn"), log = el.querySelector(".ix-retry-log");
      btn.addEventListener("click", () => {
        const succeedAt = 2 + Math.floor(Math.random() * 3); // succeeds on attempt 3-5
        let html = "", t = 0;
        for (let n = 0; n < 5; n++) {
          const base = Math.min(8, 0.5 * Math.pow(2, n));
          const wait = n === 0 ? 0 : +(Math.random() * base).toFixed(2);
          t += wait;
          const ok = n === succeedAt;
          html += `<div class="rl-row ${ok ? "ok" : "fail"}">attempt ${n + 1}: ${n === 0 ? "immediate" : "wait " + wait + "s (≤" + base + "s)"} → ${ok ? "200 ✓ ship" : "429/5xx — back off"}</div>`;
          if (ok) break;
        }
        html += `<div class="rl-tot">total added latency ≈ ${t.toFixed(2)}s — bounded, never an infinite hammer</div>`;
        log.innerHTML = html;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    predict(document.querySelectorAll(".ix-predict"));
    spot(document.querySelectorAll(".ix-spot"));
    tokenCounter(document.querySelectorAll(".ix-tokens"));
    tempSlider(document.querySelectorAll(".ix-temp"));
    costCalc(document.querySelectorAll(".ix-cost"));
    retrySim(document.querySelectorAll(".ix-retry"));
  });
})();
