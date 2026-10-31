#!/usr/bin/env node
/* Deterministically refresh the no-JavaScript reading paths for shared-data
   Week 6, Week 7, and Week 8 routes. The inline Archify <desc> remains the visual's
   authored accessible alternative; this tool copies it into the static path. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const write = process.argv.includes("--write");

function decode(text) {
  return String(text || "")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

const catalogs = [
  {
    ids: [1, 2, 3, 4, 5].map(day => `w06d${day}`),
    dir: "w06",
    lessons: require(path.join(root, "assets/js/curriculum-lessons-w06.js")),
    renderer: require(path.join(root, "assets/js/kafka-lesson.js")),
  },
  {
    ids: [1, 2, 3, 4, 5].map(day => `w07d${day}`),
    dir: "w07",
    lessons: require(path.join(root, "assets/js/curriculum-lessons-w07-w08.js")),
    renderer: require(path.join(root, "assets/js/platform-lesson.js")),
  },
  {
    ids: [1, 2, 3, 4, 5].map(day => `w08d${day}`),
    dir: "w08",
    lessons: require(path.join(root, "assets/js/curriculum-lessons-w07-w08.js")),
    renderer: require(path.join(root, "assets/js/platform-lesson.js")),
  },
];

const stale = [];
for (const catalog of catalogs) {
  for (const id of catalog.ids) {
    const file = path.join(root, "weeks", catalog.dir, `${id}.html`);
    const source = fs.readFileSync(file, "utf8");
    const desc = source.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i);
    if (!desc) throw new Error(`${id}: Archify description missing`);
    const fallback = catalog.renderer.staticFallbackHtml(catalog.lessons[id], decode(desc[1]));
    const next = source.replace(/<noscript>[\s\S]*?<\/noscript>/, () => fallback);
    if (next === source && !source.includes(fallback)) throw new Error(`${id}: no replaceable fallback`);
    if (source !== next) {
      stale.push(path.relative(root, file));
      if (write) fs.writeFileSync(file, next);
    }
  }
}

if (stale.length && !write) {
  console.error(`Static lesson fallbacks are stale:\n${stale.join("\n")}`);
  console.error("Run: node docs/workflows/render-week-static-fallbacks.js --write");
  process.exit(1);
}
console.log(write ? `Updated ${stale.length} static lesson fallback(s).` : "Static lesson fallbacks are current.");
