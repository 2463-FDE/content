"use strict";

/* Minimal parsed page model for Node regressions: an HTML tree with enough DOM
   surface to execute page scripts, plus a CSS rule model with selector
   matching, cascade order, media evaluation, inheritance, and var() resolution. */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW_TAGS = new Set(["script", "style", "textarea", "title"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", middot: "·", mdash: "—", ndash: "–", rarr: "→", larr: "←", hellip: "…", times: "×" };
const INHERITED = new Set(["color"]);

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === "#") return String.fromCodePoint(name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
    return Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : whole;
  });
}

class ClassList {
  constructor(element) { this.element = element; }
  values() { return (this.element.getAttribute("class") || "").split(/\s+/).filter(Boolean); }
  contains(name) { return this.values().includes(name); }
  add(...names) { this.element.setAttribute("class", [...new Set([...this.values(), ...names])].join(" ")); }
  remove(...names) { this.element.setAttribute("class", this.values().filter((name) => !names.includes(name)).join(" ")); }
  toggle(name, force) {
    const on = force === undefined ? !this.contains(name) : Boolean(force);
    if (on) this.add(name); else this.remove(name);
    return on;
  }
}

class Node {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = tag.toUpperCase();
    this.nodeType = tag === "#text" ? 3 : 1;
    this.attributes = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.data = "";
    this.listeners = new Map();
    this.value = "";
    this.disabled = false;
    this.classList = new ClassList(this);
    const element = this;
    this.dataset = new Proxy({}, {
      get(_, key) { return typeof key === "string" ? element.getAttribute(`data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`) ?? undefined : undefined; },
      set(_, key, value) { element.setAttribute(`data-${String(key).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value); return true; },
    });
  }
  get localName() { return this.tagName.toLowerCase(); }
  get children() { return this.childNodes.filter((child) => child.nodeType === 1); }
  get id() { return this.getAttribute("id") || ""; }
  set id(value) { this.setAttribute("id", value); }
  get className() { return this.getAttribute("class") || ""; }
  set className(value) { this.setAttribute("class", value); }
  get hidden() { return this.hasAttribute("hidden"); }
  set hidden(value) { if (value) this.setAttribute("hidden", ""); else this.removeAttribute("hidden"); }
  get tabIndex() { const value = this.getAttribute("tabindex"); return value === null ? 0 : Number(value); }
  set tabIndex(value) { this.setAttribute("tabindex", value); }
  get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map((child) => child.textContent).join(""); }
  set textContent(value) {
    this.replaceChildren();
    if (String(value)) this.appendChild(Object.assign(new Node(this.ownerDocument, "#text"), { data: String(value) }));
  }
  set innerHTML(html) {
    this.replaceChildren();
    parseInto(this.ownerDocument, this, String(html));
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  appendChild(node) {
    if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  replaceChildren(...nodes) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    nodes.forEach((node) => this.appendChild(node));
  }
  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }
  ancestors() { const list = []; for (let node = this.parentNode; node && node.nodeType === 1 && node.tagName !== "#ROOT"; node = node.parentNode) list.push(node); return list; }
  matches(selector) { return parseSelectorList(selector).some((complex) => matchComplex(this, complex, new Set())); }
  closest(selector) { for (let node = this; node && node.tagName !== "#ROOT"; node = node.parentNode) if (node.matches(selector)) return node; return null; }
  querySelectorAll(selector) { const list = parseSelectorList(selector); return this.descendants().filter((node) => list.some((complex) => matchComplex(node, complex, new Set()))); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getElementById(id) { return this.descendants().find((node) => node.id === id) || null; }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, init = {}) {
    const event = Object.assign({ type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, init);
    for (let node = this; node; node = node.parentNode) {
      event.currentTarget = node;
      (node.listeners.get(type) || []).forEach((listener) => listener.call(node, event));
    }
    return event;
  }
  click() { return this.dispatch("click"); }
  focus() { this.ownerDocument.activeElement = this; }
}

class Document {
  constructor(html) {
    this.root = new Node(this, "#root");
    this.activeElement = null;
    this.readyState = "loading";
    this.listeners = new Map();
    parseInto(this, this.root, html);
  }
  get documentElement() { return this.root.children.find((node) => node.localName === "html") || this.root; }
  get body() { return this.root.querySelector("body"); }
  createElement(tag) { return new Node(this, tag.toLowerCase()); }
  getElementById(id) { return this.root.getElementById(id); }
  querySelectorAll(selector) { return this.root.querySelectorAll(selector); }
  querySelector(selector) { return this.root.querySelector(selector); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, init = {}) {
    const event = Object.assign({ type, target: this }, init);
    (this.listeners.get(type) || []).forEach((listener) => listener.call(this, event));
    return event;
  }
}

function parseAttributes(element, source) {
  for (const attr of source.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    element.setAttribute(attr[1].toLowerCase(), decode(attr[2] ?? attr[3] ?? attr[4] ?? ""));
  }
}

function parseInto(doc, parent, html) {
  const stack = [parent];
  const pattern = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+|<)/g;
  let match;
  while ((match = pattern.exec(html))) {
    const top = stack[stack.length - 1];
    if (match[5] !== undefined) {
      top.appendChild(Object.assign(new Node(doc, "#text"), { data: decode(match[5]) }));
      continue;
    }
    if (!match[2]) continue;
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.map((node) => node.localName).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const element = new Node(doc, tag);
    parseAttributes(element, match[3]);
    top.appendChild(element);
    if (RAW_TAGS.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, pattern.lastIndex);
      const end = close === -1 ? html.length : close;
      const raw = html.slice(pattern.lastIndex, end);
      if (raw) element.appendChild(Object.assign(new Node(doc, "#text"), { data: tag === "textarea" || tag === "title" ? decode(raw) : raw }));
      pattern.lastIndex = close === -1 ? html.length : html.indexOf(">", close) + 1;
      continue;
    }
    if (!VOID_TAGS.has(tag) && !match[4]) stack.push(element);
  }
}

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const char of text) {
    if (quote) { if (char === quote) quote = null; current += char; continue; }
    if (char === "\"" || char === "'") quote = char;
    else if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (char === separator && depth === 0) { parts.push(current); current = ""; continue; }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseCompound(text) {
  const compound = { tag: null, ids: [], classes: [], attrs: [], pseudos: [], nots: [], element: false };
  const pattern = /^(\*|[a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]|::?([\w-]+)(?:\(((?:[^()]|\([^()]*\))*)\))?/y;
  let index = 0;
  while (index < text.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(text);
    if (!match) throw new Error(`Unsupported selector compound: ${text}`);
    index = pattern.lastIndex;
    if (match[1]) compound.tag = match[1] === "*" ? null : match[1].toLowerCase();
    else if (match[2]) compound.ids.push(match[2]);
    else if (match[3]) compound.classes.push(match[3]);
    else if (match[4]) compound.attrs.push({ name: match[4].toLowerCase(), op: match[5], value: match[6] ?? match[7] ?? match[8] });
    else if (match[0].startsWith("::") || ["before", "after", "placeholder", "marker", "selection"].includes(match[9])) compound.element = true;
    else if (match[9] === "not") compound.nots.push(parseSelectorList(match[10]));
    else compound.pseudos.push(match[10] === undefined ? match[9] : `${match[9]}(${match[10]})`);
  }
  return compound;
}

function parseComplex(text) {
  const parts = [];
  const tokens = text.replace(/\s*([>+~])\s*/g, " $1 ").trim().split(/\s+/);
  let combinator = " ";
  for (const token of tokens) {
    if ([">", "+", "~"].includes(token)) { combinator = token; continue; }
    parts.push({ combinator, compound: parseCompound(token) });
    combinator = " ";
  }
  return parts;
}

function parseSelectorList(text) { return splitTopLevel(text, ",").map(parseComplex); }

function elementSiblings(node) { return node.parentNode ? node.parentNode.children : [node]; }

function matchPseudo(node, pseudo, states) {
  if (states.has(pseudo)) return true;
  if (pseudo === "root") return node.localName === "html";
  if (pseudo === "disabled") return Boolean(node.disabled);
  const siblings = elementSiblings(node);
  const sameType = siblings.filter((sibling) => sibling.localName === node.localName);
  if (pseudo === "first-child") return siblings[0] === node;
  if (pseudo === "last-child") return siblings[siblings.length - 1] === node;
  if (pseudo === "first-of-type") return sameType[0] === node;
  if (pseudo === "last-of-type") return sameType[sameType.length - 1] === node;
  return false;
}

function matchCompound(node, compound, states) {
  if (!node || node.nodeType !== 1 || node.tagName === "#ROOT" || compound.element) return false;
  if (compound.tag && node.localName !== compound.tag) return false;
  if (compound.ids.some((id) => node.id !== id)) return false;
  if (compound.classes.some((name) => !node.classList.contains(name))) return false;
  for (const attr of compound.attrs) {
    const value = node.getAttribute(attr.name);
    if (value === null) return false;
    if (attr.op === "=" && value !== attr.value) return false;
    if (attr.op === "~=" && !value.split(/\s+/).includes(attr.value)) return false;
    if (attr.op === "^=" && !value.startsWith(attr.value)) return false;
    if (attr.op === "$=" && !value.endsWith(attr.value)) return false;
    if (attr.op === "*=" && !value.includes(attr.value)) return false;
  }
  if (compound.pseudos.some((pseudo) => !matchPseudo(node, pseudo, states))) return false;
  if (compound.nots.some((list) => list.some((complex) => matchComplex(node, complex, states)))) return false;
  return true;
}

function matchComplex(node, parts, states, index = parts.length - 1) {
  if (!matchCompound(node, parts[index].compound, states)) return false;
  if (index === 0) return true;
  const combinator = parts[index].combinator;
  if (combinator === ">") return matchComplex(node.parentNode, parts, states, index - 1);
  if (combinator === " ") {
    for (let ancestor = node.parentNode; ancestor && ancestor.tagName !== "#ROOT"; ancestor = ancestor.parentNode) {
      if (matchComplex(ancestor, parts, states, index - 1)) return true;
    }
    return false;
  }
  const siblings = elementSiblings(node);
  const before = siblings.slice(0, siblings.indexOf(node));
  if (combinator === "+") return before.length > 0 && matchComplex(before[before.length - 1], parts, states, index - 1);
  return before.some((sibling) => matchComplex(sibling, parts, states, index - 1));
}

function specificity(parts) {
  const total = [0, 0, 0];
  for (const { compound } of parts) {
    total[0] += compound.ids.length;
    total[1] += compound.classes.length + compound.attrs.length + compound.pseudos.length;
    total[2] += (compound.tag ? 1 : 0) + (compound.element ? 1 : 0);
    for (const list of compound.nots) {
      const best = list.map(specificity).sort(compareSpecificity).pop() || [0, 0, 0];
      best.forEach((value, i) => { total[i] += value; });
    }
  }
  return total;
}

function compareSpecificity(a, b) {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ""); }

function parseDeclarations(body) {
  return splitTopLevel(body, ";").map((text) => {
    const colon = text.indexOf(":");
    if (colon < 0) return null;
    let value = text.slice(colon + 1).trim();
    const important = /!\s*important\s*$/i.test(value);
    if (important) value = value.replace(/!\s*important\s*$/i, "").trim();
    return { property: text.slice(0, colon).trim().toLowerCase(), value, important };
  }).filter(Boolean);
}

function readBlock(css, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < css.length; i += 1) {
    const char = css[i];
    if (quote) { if (char === quote && css[i - 1] !== "\\") quote = null; continue; }
    if (char === "\"" || char === "'") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") { depth -= 1; if (depth === 0) return i; }
  }
  return css.length;
}

function parseRules(css, media = [], rules = []) {
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open < 0) break;
    const prelude = css.slice(index, open).trim();
    const close = readBlock(css, open);
    const body = css.slice(open + 1, close);
    index = close + 1;
    if (prelude.startsWith("@media")) parseRules(body, [...media, prelude.slice(6).trim()], rules);
    else if (prelude.startsWith("@supports") || prelude.startsWith("@layer")) parseRules(body, media, rules);
    else if (prelude.startsWith("@")) continue;
    else if (prelude) {
      const selectors = splitTopLevel(prelude.replace(/^[^{]*;\s*/, ""), ",");
      rules.push({ selectors, parsed: selectors.map(parseComplex), declarations: parseDeclarations(body), media });
    }
  }
  return rules;
}

function parseStylesheet(css) { return parseRules(stripComments(css)); }

function mediaMatches(query, env) {
  return splitTopLevel(query, ",").some((alternative) => {
    let text = alternative.trim().toLowerCase();
    if (/^only\s+/.test(text)) text = text.replace(/^only\s+/, "");
    if (text.startsWith("print")) return false;
    text = text.replace(/^(screen|all)\s*(and\s*)?/, "");
    if (!text) return true;
    return text.split(/\s+and\s+/).every((feature) => {
      const match = /^\(\s*([\w-]+)\s*(?::\s*([^)]+))?\)$/.exec(feature.trim());
      if (!match) return false;
      const [, name, raw] = match;
      const value = (raw || "").trim();
      if (name === "max-width") return env.width <= parseFloat(value);
      if (name === "min-width") return env.width >= parseFloat(value);
      if (name === "prefers-color-scheme") return value === env.colorScheme;
      if (name === "prefers-reduced-motion") return value === (env.reducedMotion ? "reduce" : "no-preference");
      if (name === "scripting") return value === "enabled";
      if (name === "hover") return value === "hover";
      return false;
    });
  });
}

class StyleModel {
  constructor(sheets, env = {}) {
    this.rules = sheets.flatMap((sheet) => sheet);
    this.env = { width: 1280, colorScheme: "light", reducedMotion: false, ...env };
  }

  declared(node, states = new Set()) {
    const winners = new Map();
    this.rules.forEach((rule, order) => {
      if (!rule.media.every((query) => mediaMatches(query, this.env))) return;
      let best = null;
      rule.parsed.forEach((parts) => {
        if (!matchComplex(node, parts, states)) return;
        const spec = specificity(parts);
        if (!best || compareSpecificity(spec, best) > 0) best = spec;
      });
      if (!best) return;
      for (const declaration of rule.declarations) this.offer(winners, declaration, [declaration.important ? 1 : 0, 0, ...best, order]);
    });
    const inline = node.getAttribute("style");
    if (inline) for (const declaration of parseDeclarations(inline)) this.offer(winners, declaration, [declaration.important ? 1 : 0, 1, 0, 0, 0, Infinity]);
    return new Map([...winners].map(([property, entry]) => [property, entry.value]));
  }

  offer(winners, declaration, rank) {
    const current = winners.get(declaration.property);
    if (!current || compareRank(rank, current.rank) >= 0) {
      winners.set(declaration.property, { value: declaration.value, rank });
    }
  }

  customProperties(node, states) {
    const inherited = node.parentNode && node.parentNode.nodeType === 1 && node.parentNode.tagName !== "#ROOT"
      ? this.customProperties(node.parentNode, new Set())
      : new Map();
    const own = new Map(inherited);
    for (const [property, value] of this.declared(node, states)) if (property.startsWith("--")) own.set(property, value);
    return own;
  }

  resolve(value, custom, seen = new Set()) {
    let output = value;
    for (let guard = 0; guard < 50 && /var\(/.test(output); guard += 1) {
      output = output.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/, (_, name, fallback) => {
        if (seen.has(name)) throw new Error(`Cyclic custom property ${name}`);
        const raw = custom.has(name) ? custom.get(name) : fallback;
        if (raw === undefined) throw new Error(`Unresolved custom property ${name}`);
        return this.resolve(raw.trim(), custom, new Set([...seen, name]));
      });
    }
    return output.trim();
  }

  computed(node, property, { states = new Set() } = {}) {
    const declared = this.declared(node, states);
    let value = declared.get(property);
    if (value === undefined || value === "inherit") {
      if (!INHERITED.has(property) && value !== "inherit") return null;
      const parent = node.parentNode;
      return parent && parent.nodeType === 1 && parent.tagName !== "#ROOT" ? this.computed(parent, property) : null;
    }
    return this.resolve(value, this.customProperties(node, states));
  }
}

function compareRank(a, b) {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function readRepo(relative) { return fs.readFileSync(path.join(ROOT, relative), "utf8"); }

function loadPage(relative) {
  const html = readRepo(relative);
  const doc = new Document(html);
  const base = path.dirname(path.join(ROOT, relative));
  const sheets = [];
  for (const node of doc.root.descendants()) {
    if (node.localName === "link" && node.getAttribute("rel") === "stylesheet") {
      const href = node.getAttribute("href").split("?")[0];
      const file = path.resolve(base, href);
      if (file.startsWith(ROOT) && fs.existsSync(file)) sheets.push(parseStylesheet(fs.readFileSync(file, "utf8")));
    } else if (node.localName === "style") {
      sheets.push(parseStylesheet(node.textContent));
    }
  }
  return { html, doc, sheets, styles: (env) => new StyleModel(sheets, env) };
}

function hexRgb(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) throw new Error(`Expected a hex colour, got ${value}`);
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function luminance(color) {
  const linear = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastFromLuminance(a, b) {
  const [lighter, darker] = [a, b].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrast(foreground, background) { return contrastFromLuminance(luminance(foreground), luminance(background)); }

function composite(foreground, background, alpha) {
  return foreground.map((channel, index) => Math.round(channel * alpha + background[index] * (1 - alpha)));
}

module.exports = { Document, StyleModel, parseStylesheet, loadPage, readRepo, hexRgb, luminance, contrast, contrastFromLuminance, composite, ROOT };
