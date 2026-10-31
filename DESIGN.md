---
name: 2463-FDE Content Site
description: Dispatch-board design system for the ten-week FDE curriculum hub and reading pages
colors:
  paper-ground: "#faf9f6"
  surface: "#ffffff"
  surface-raised: "#f4f3ee"
  ink: "#1c2126"
  ink-soft: "#4d555f"
  dim-label: "#666d76"
  hairline: "#e4e1d9"
  signal-orange: "#e8590c"
  orange-fill: "#c74a0a"
  orange-ink: "#c2410c"
  orange-wash: "#fdf0e7"
  good-green: "#2f9e44"
  good-ink: "#2f7d32"
  bad-red: "#e03131"
  bad-ink: "#c92a2a"
  info-blue: "#1971c2"
  warn-ink: "#b45309"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(30px, 4vw, 42px)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
  mono:
    fontFamily: "'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace"
    fontSize: "13px"
rounded:
  ctl: "8px"
  panel: "12px"
  card: "16px"
components:
  button-primary:
    backgroundColor: "{colors.orange-fill}"
    textColor: "#ffffff"
    rounded: "{rounded.ctl}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.orange-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.ctl}"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "8px 14px"
  chip-state-start:
    backgroundColor: "{colors.orange-wash}"
    textColor: "{colors.orange-ink}"
    rounded: "{rounded.ctl}"
    padding: "5px 12px"
  card-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "12px 13px"
---

# Design System: 2463-FDE Content Site

## Overview

**Creative North Star: "The Dispatch Board"**

The site reads like a well-set engineering dispatch board: a warm paper ground carrying hairline-bordered panels, one orange signal color spent carefully, and a calendar of day cards whose states (Start, Resume, Completed, open, in-build) read at a glance. It is an Operate/Read surface for mid-to-senior engineers and their trainers; scanability, state feedback, and task completion outrank expression, and brand lives in precise details: tabular numerals, a disciplined uppercase label voice, drawn 2px-stroke glyphs, and phase-colored top rules that organize the ten weeks like lines on a service map.

The system is deliberately zero-dependency. Type is the platform's own stack, icons are hand-drawn inline SVG in one stroke weight, and every color is a CSS custom property themed twice (light paper, dark console) plus print. Confirmed rejections: no marketing hero, no gradients-as-decoration, no glassmorphism, no emoji standing in for icons in the shared chrome.

**Key Characteristics:**
- Borders structure the page; shadows are reserved for floating layers and interaction feedback.
- One accent hue split into three roles (line, fill, ink) so every use passes WCAG AA.
- One uppercase label voice (11px / 0.08em) for every micro-label on the site.
- State is always worded or iconed, never carried by hue alone.
- Light, dark, print, and reduced-motion are first-class modes of the same token set.

## Colors

A paper-and-ink neutral field with one orange signal split by role, plus a small semantic set for state.

### Primary
- **Signal Orange** (#e8590c): lines, marks, focus rings, the active-step rail, phase color for Foundation weeks. Never used as small text on light ground and never under white text.
- **Orange Fill** (#c74a0a): the only background for filled controls carrying white text (4.8:1). Hover deepens to Orange Ink.
- **Orange Ink** (#c2410c): accent-colored text at any size on light grounds (5.2:1 on white), link-weight CTAs, the worded "Current week" label.
- **Orange Wash** (#fdf0e7): tinted panels and quiet chips that belong to the accent family (mindset callouts, Start chips, day summaries).

### Neutral
- **Paper Ground** (#faf9f6): the page itself.
- **Surface** (#ffffff): cards, panels, the diagram stage. **Surface Raised** (#f4f3ee): inset panels such as the trainer launchpad and run output.
- **Ink** (#1c2126) body text; **Ink Soft** (#4d555f) secondary text; **Dim Label** (#666d76) the floor for de-emphasized labels (still ≥4.5:1 on both light grounds); **Hairline** (#e4e1d9) every structural border.

### Semantic
- **Good** (#2f9e44 line / #2f7d32 ink / soft+line tints): completed states. **Bad** (#e03131 / #c92a2a): errors, destructive actions. **Info** (#1971c2): informational chips and the FDE Situation fixture. **Warn ink** (#b45309) on warn tints: pending/caution. Each ships as a soft / line / ink triple so tinted panels keep AA text.
- **Phase colors** (defined per-week in the hub's `window.PHASES`) paint 3px top rules and week labels; as label text they are mixed 70% toward Ink via `color-mix` to hold contrast.

### Named Rules
**The Split Accent Rule.** One hue, three tokens: `--accent` may only draw lines and large marks; `--accent-fill` is the only accent allowed under white text; `--accent-ink` is the only accent allowed as text. A new accent use picks the role first, the token follows.

**The Worded State Rule.** No state may ride on color alone: every state pairs its tint with a word or a drawn glyph (Start/Resume/Completed chips, "Current week", ready/pending status chips).

## Typography

**Display Font:** system stack (-apple-system … Arial)
**Body Font:** same system stack
**Label/Mono Font:** SF Mono / ui-monospace family, reserved for code, data, and measurement

**Character:** a deliberate zero-dependency platform voice; hierarchy comes from weight, size, and the label grammar rather than from a display face. Numerals in chrome are tabular.

### Hierarchy
- **Display** (650, clamp(30px–42px), 1.05, −0.02em): the hub h1 only; `text-wrap: balance`.
- **Headline** (700, 44px, 1.08, −0.02em): reading-page ledes.
- **Title** (650, 14.5–18px): card and panel titles.
- **Body** (400, 20px, 1.65): reading prose, measured by `--maxprose: 780px` (~72ch).
- **Label** (700, 11px, +0.08em, uppercase): every micro-label, from week numbers to stage titles to form labels, via `--label-size`/`--label-track`.

### Named Rules
**The One Label Voice Rule.** Every uppercase micro-label uses the shared label tokens. A new label never invents its own size or tracking.

**The Mono Is Measurement Rule.** Monospace is for code, data, and measured values, never a costume for "technical".

## Layout

The hub is a sticky 52px topbar (three zones: brand+home, page nav, viewer context) over a two-column board: the calendar main column and a 236px sticky rail. The calendar is a CSS grid of `188px + 5×minmax(0,1fr)`; `minmax(0,…)` is load-bearing so nowrap chips can never blow the grid out of its column. Reading pages prioritize learner orientation, objective-grounded teaching, and practice with visible feedback. Diagrams support the concept where spatial or system relationships improve comprehension; they are contextual evidence, not the page's mandatory lead or organizing spine. Existing routes may use the three-column TOC/prose/stage grid, while section order, interaction form, and responsive stacking may vary by objective as long as source truth, Core 30, progress/deep links, static fallback, and accessibility remain intact. Rhythm is tight-groups/generous-separation; the first week's phase rule crests a 1280×860 viewport. At ≤1080px the rail rides above the schedule as a strip, at ≤620px resources collapse to a two-up grid, and at ≤700px the topbar wraps with the page nav on its own row. All content must survive 320px with no horizontal overflow.

## Elevation & Depth

Flat by default: hairline borders declare structure, and resting cards carry no shadow. Shadows exist in exactly three tinted tokens and are reserved for floating layers (modals, popovers, tooltips, FABs) and for interaction feedback (a hovered card lifts −2px and gains `--shadow-2`).

### Shadow Vocabulary
- **shadow-1** (`0 1px 2px rgba(36,30,16,.05)`): barely-there lift for small floating affordances.
- **shadow-2** (`0 3px 12px -2px rgba(36,30,16,.09)`): hover feedback on interactive cards.
- **shadow-3** (`0 16px 44px -10px rgba(36,30,16,.22)`): modals, overlays, FABs.

### Named Rules
**The Borders Structure, Shadows Float Rule.** A resting panel is a border, never a border plus a shadow. If an element casts a shadow at rest, it must genuinely float above the page.

## Shapes

Three radius stops only: controls 8px (`--r-ctl`), panels and chips 12px (`--r-panel`), cards and modals 16px (`--r-card`). Pills (999px) are reserved for small status chips and ritual tags. Phase identity is a 3px top rule on week and day cards; the current-week marker is a 1px inset accent ring plus its worded label. Icons are inline SVG on a 24-box, 2px stroke, round caps, drawn in the site's own grammar.

## Components

### Buttons
- **Shape:** control radius (8px).
- **Primary:** Orange Fill background, white text, 650 weight, 11px 20px padding; hover deepens to Orange Ink; `:active` presses 1px down; disabled flattens to Dim.
- **Quiet (`.btn-soft`, resources, outline actions):** Surface background, hairline border; hover borrows the accent border and ink.
- **Focus:** the global `:focus-visible` ring — 3px Signal Orange, 3px offset — on every interactive element.

### Chips
- **State chips (Start / Resume / Completed):** worded, iconed, control-radius; Start = orange wash + Orange Ink, Resume = Orange Fill + white, Completed = good tints.
- **Ritual tags:** 999px pills, 10.5px, drawn 10px glyph + word; muted tints per ritual, with the two fixtures (AI Interview, FDE Situation) as filled accent/info pills.
- **Status chips (ready / pending):** 999px, semantic tints, live-region text.

### Cards / Containers
- **Corner Style:** card radius (16px) for standalone cards, panel radius (12px) for board cells.
- **Background:** Surface on Paper Ground; Surface Raised for inset tool panels.
- **Border:** 1px Hairline, plus the 3px phase top rule on calendar cells.
- **Shadow Strategy:** none at rest; shadow-2 on hover (see Elevation).
- **Internal Padding:** 12–18px by density.

### Inputs / Fields
- **Style:** 1–1.5px Hairline stroke, control radius, Surface background, ≥44px touch height in the shared chrome.
- **Focus:** accent border plus the global focus ring.
- **Error:** Bad Ink text beside the field; page-level failures use the bordered alert panel (`.curriculum-model-empty`, warn tints, `role="alert"`).

### Navigation
- **Topbar links:** 13.5px/600 Ink Soft, 2px transparent underline that turns accent on hover; the center nav is a labeled `<nav>`; trainer-only links are injected only for trainer sessions.
- **Loading/empty:** the lesson loading panel pulses opacity (collapses under reduced motion); batch-context failures render a worded alert, never a blank region.

### The Board (signature)
The ten-week calendar: week anchor cells with phase rule + label + "Ask about this week", day cells with title, slug, pinned foot (progress chip + ritual row), the "open →" cue, in-build tags, and the current-week ring driven by the same progress state as the chips. It re-renders on `fde-progress-sync`.

## Do's and Don'ts

### Do:
- **Do** take every color, radius, shadow, duration, and label metric from the tokens in `assets/css/style.css` `:root` — and redefine any new token in the dark block too.
- **Do** animate transform and opacity only, with `--ease-out` and the two duration tokens; the global reduced-motion block must keep winning.
- **Do** keep the no-JS/static fallback and the print stylesheet working for any new surface.
- **Do** draw new icons as inline SVG, 24-box, 2px stroke, round caps.
- **Do** check new accent usage against the Split Accent Rule before shipping.

### Don't:
- **Don't** put white text on Signal Orange (#e8590c) or use it for small text on light grounds; those are Orange Fill's and Orange Ink's jobs.
- **Don't** add a shadow to a resting bordered panel, a kicker/eyebrow above a heading, or an emoji in shared chrome.
- **Don't** introduce a fourth radius, a new uppercase label voice, or a second control height inside one surface.
- **Don't** restructure week-page HTML for token-only restyling. **Do** improve lesson structure when the objective benefits from a clearer orientation, teaching, or practice flow, while preserving source truth, Core 30, progress/deep-link compatibility, static fallback, and accessibility.
