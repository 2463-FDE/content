#!/usr/bin/env node
/* Deterministically injects/refreshes the static program -> week -> day
   orientation nav (`.lesson-crumbs`) on every required lesson route, from the
   single-source map in assets/js/curriculum-map.js. Idempotent: an existing
   crumbs nav is replaced in place; otherwise the nav lands directly after the
   topbar. Run with --write to apply; without it, reports stale routes. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const map = require(path.join(ROOT, "assets/js/curriculum-map.js"));
const write = process.argv.includes("--write");

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function relative(fromHref, toHref) {
  const fromDir = path.posix.dirname(fromHref);
  return path.posix.relative(fromDir, toHref);
}

function crumbsHtml(page) {
  const prev = page.prev
    ? `<a class="crumb-step" rel="prev" href="${relative(page.href, page.prev.href)}">◂ ${page.prev.week === page.week ? `Day ${page.prev.day}` : `Week ${page.prev.week}`}</a>`
    : `<a class="crumb-step" href="../../index.html#curriculum">◂ Hub</a>`;
  const next = page.next
    ? `<a class="crumb-step crumb-next" rel="next" href="${relative(page.href, page.next.href)}">${page.next.week === page.week ? `Day ${page.next.day}` : `Week ${page.next.week}`} ▸</a>`
    : `<a class="crumb-step crumb-next" href="../../index.html#curriculum">Program complete · hub ▸</a>`;
  return (
    `<nav class="lesson-crumbs" aria-label="You are here" data-day-position="${page.dayPosition} of 50">` +
    `<div class="crumb-path">` +
    `<a class="crumb-hub" href="../../index.html#curriculum">Curriculum hub</a>` +
    `<span class="crumb-sep" aria-hidden="true">▸</span>` +
    `<span class="crumb-week">Week ${page.week} · ${esc(page.weekTitle)}</span>` +
    `<span class="crumb-sep" aria-hidden="true">▸</span>` +
    `<span class="crumb-day" aria-current="page">Day ${page.day} · ${esc(page.dayTitle)}</span>` +
    `</div>` +
    `<div class="crumb-meta">` +
    `<span class="crumb-pos">Day ${page.dayPosition} of 50</span>` +
    `<span class="crumb-project">${esc(page.project.label)} · ${esc(page.project.mode)}</span>` +
    `<span class="crumb-steps">${prev}${next}</span>` +
    `</div>` +
    `</nav>`
  );
}

function topbarEnd(html) {
  const open = html.indexOf('<div class="topbar"');
  if (open === -1) throw new Error("no topbar");
  let depth = 0;
  const tag = /<div\b|<\/div>/g;
  tag.lastIndex = open;
  let match;
  while ((match = tag.exec(html))) {
    depth += match[0] === "</div>" ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  throw new Error("unbalanced topbar");
}

function pageFor(href) {
  return map.pages().find(function (page) { return page.href === href; }) || null;
}

module.exports = { crumbsHtml, pageFor, topbarEnd };

if (require.main === module) {
  const stale = [];
  for (const page of map.pages()) {
    const file = path.join(ROOT, page.href);
    const source = fs.readFileSync(file, "utf8");
    const nav = crumbsHtml(page);
    let next;
    if (/<nav class="lesson-crumbs"[\s\S]*?<\/nav>/.test(source)) {
      next = source.replace(/<nav class="lesson-crumbs"[\s\S]*?<\/nav>/, () => nav);
    } else {
      const at = topbarEnd(source);
      next = source.slice(0, at) + "\n" + nav + source.slice(at);
    }
    if (next !== source) {
      stale.push(page.href);
      if (write) fs.writeFileSync(file, next);
    }
  }

  if (stale.length) {
    console.log(`${write ? "updated" : "stale"}: ${stale.length} route(s)`);
    for (const href of stale) console.log("  " + href);
    if (!write) process.exitCode = 1;
  } else {
    console.log("all lesson crumbs current");
  }
}
