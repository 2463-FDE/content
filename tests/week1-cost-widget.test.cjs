const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function mountCostWidget(locale) {
  const children = new Map();
  const mount = {
    set innerHTML(html) {
      children.clear();
      for (const match of html.matchAll(/<(input|b)\b([^>]*)>/g)) {
        const className = match[2].match(/class="([^"]+)"/)?.[1];
        if (!className) continue;
        const child = {
          tag: match[1],
          value: match[2].match(/value="([^"]*)"/)?.[1] ?? "",
          textContent: "",
          dataset: {},
          listeners: {},
          addEventListener(type, listener) {
            (this.listeners[type] ||= []).push(listener);
          },
        };
        children.set(`.${className}`, child);
      }
    },
    querySelector(selector) { return children.get(selector) || null; },
    querySelectorAll(selector) {
      return selector === "input" ? [...children.values()].filter((child) => child.tag === "input") : [];
    },
  };
  const listeners = {};
  const sandbox = {
    document: {
      addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
      querySelectorAll(selector) { return selector === ".ix-cost" ? [mount] : []; },
      querySelector() { return null; },
    },
    Intl: {
      NumberFormat: function NumberFormat(_requestedLocale, options) {
        return new Intl.NumberFormat(locale, options);
      },
    },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/js/interactive.js"), "utf8"), sandbox);
  for (const listener of listeners.DOMContentLoaded || []) listener();
  return mount;
}

for (const locale of ["en-US", "de-DE", "fr-FR"]) {
  test(`cost widget exposes locale-independent arithmetic in ${locale}`, () => {
    const mount = mountCostWidget(locale);
    const call = mount.querySelector(".c-call");
    const day = mount.querySelector(".c-day");
    const month = mount.querySelector(".c-mo");
    assert.equal(Number(call.dataset.value), 0.0136);
    assert.equal(Number(day.dataset.value), 680);
    assert.equal(Number(month.dataset.value), 20400);
    assert.ok(call.textContent.length > 0);

    mount.querySelector(".c-pin").value = "4";
    mount.querySelector(".c-pout").value = "20";
    for (const listener of mount.querySelector(".c-pin").listeners.input) listener();
    assert.equal(Number(mount.querySelector(".c-day").dataset.value), 1360);
  });
}
