const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.resolve(__dirname, "../assets/css/style.css"), "utf8");

function tokenFrom(blockPattern, name) {
  const block = css.match(blockPattern)?.[1] || "";
  const value = block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
  assert.ok(value, `missing token --${name}`);
  return value;
}

function darkToken(name) {
  return tokenFrom(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/, name);
}

function rgb(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function composite(foreground, background, alpha) {
  return foreground.map((channel, index) => Math.round(channel * alpha + background[index] * (1 - alpha)));
}

function luminance(color) {
  const linear = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("default-dark inactive lesson prose, labels, and tags remain WCAG AA", () => {
  assert.match(css, /\.step\s*\{[\s\S]*?opacity:\s*var\(--step-muted-opacity\)/);
  const background = rgb(darkToken("bg"));
  const opacity = Number(darkToken("step-muted-opacity"));
  assert.ok(opacity < 1, "inactive steps must retain visual hierarchy");

  const samples = [
    ["instructional prose", darkToken("ink")],
    ["secondary labels", darkToken("ink-soft")],
    ["step tags", darkToken("accent-ink")],
    ["instructional controls", darkToken("accent")],
    ["control metadata", darkToken("dim")],
  ];
  for (const [surface, token] of samples) {
    const rendered = composite(rgb(token), background, opacity);
    assert.ok(contrast(rendered, background) >= 4.5, `${surface} fell below 4.5:1`);
  }

  const mutedButtonText = composite(rgb("#ffffff"), background, opacity);
  const mutedButtonFill = composite(rgb(darkToken("accent-fill")), background, opacity);
  assert.ok(contrast(mutedButtonText, mutedButtonFill) >= 4.5, "filled control fell below 4.5:1");
  assert.match(css, /\.code-cta \.cc-meta \{ color:var\(--ink-soft\);/);
});

test("Week 1 uses shared step and tag token surfaces covered by the contrast regression", () => {
  const lesson = fs.readFileSync(path.resolve(__dirname, "../weeks/w01/d1.html"), "utf8");
  assert.match(lesson, /<section class="step"/);
  assert.match(lesson, /<div class="tag">The whole game<\/div>/);
  assert.match(lesson, /<p>Start with the fact that reframes everything else:/);
  assert.match(lesson, /class='stage-hint'>\(tap nodes for detail\)<\/span>/);
  assert.doesNotMatch(lesson, /style='opacity:\.7'>\(tap/);
  assert.match(css, /\.stage-caption \.stage-hint \{ opacity: var\(--caption-hint-opacity\); \}/);
  assert.ok(Number(darkToken("caption-hint-opacity")) >= 0.8);
});
