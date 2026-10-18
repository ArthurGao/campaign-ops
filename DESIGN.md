---
name: CampaignOps
description: A campaign register where every refusal shows its reason.
colors:
  ground: "#f3f5f4"
  surface: "#ffffff"
  panel: "#eaeeec"
  rule: "#d3dad7"
  rule-strong: "#17232e"
  ink: "#15202b"
  ink-2: "#45525e"
  ink-3: "#5f6b76"
  rail: "#0f2639"
  rail-2: "#183a55"
  rail-ink: "#e8eff4"
  rail-muted: "#a3b6c6"
  accent: "#2a4dd3"
  accent-strong: "#1f3cae"
  accent-soft: "#e6ebfb"
  ok: "#1b7348"
  ok-soft: "#e1f1e8"
  warn: "#8f5400"
  warn-soft: "#fbeed6"
  bad: "#b02c24"
  bad-soft: "#fbe6e3"
  internal: "#59636d"
  internal-soft: "#e7eaed"
  progress: "#1d4f74"
  progress-soft: "#e4eef6"
  chart-previous: "#9fb3c3"
typography:
  headline:
    fontFamily: "Public Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Public Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Public Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  body:
    fontFamily: "Public Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum' 1, 'cv11' 1"
  body-dense:
    fontFamily: "Public Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Public Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.025em"
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.45
    fontFeature: "'zero' 1, 'tnum' 1"
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1.25rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.125rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.125rem"
  button-secondary-hover:
    backgroundColor: "{colors.ground}"
  button-approve:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.125rem"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bad}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.125rem"
  button-sm:
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "1.75rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.125rem"
  status-chip-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.sm}"
    padding: "1px 0.375rem"
  status-chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    padding: "1px 0.375rem"
  status-chip-bad:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad}"
    rounded: "{rounded.sm}"
    padding: "1px 0.375rem"
  status-chip-progress:
    backgroundColor: "{colors.progress-soft}"
    textColor: "{colors.progress}"
    rounded: "{rounded.sm}"
    padding: "1px 0.375rem"
  fact-chip-unconfirmed:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "1px 0.375rem"
  fact-chip-internal:
    backgroundColor: "{colors.internal-soft}"
    textColor: "{colors.internal}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "1px 0.375rem"
  version-badge:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-2}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "0 0.375rem"
  placeholder:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-3}"
    typography: "{typography.mono}"
    rounded: "{rounded.xs}"
    padding: "0 0.25rem"
  nav-item:
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.md}"
    padding: "0.45rem 0.625rem"
  nav-item-active:
    backgroundColor: "{colors.rail-2}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  role-switcher:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.md}"
    height: "2.25rem"
  tooltip:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.625rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.625rem"
---

# Design System: CampaignOps

## Overview

**Creative North Star: "The Kept Register"**

CampaignOps reads like a well-kept record book: who approved which version, which fact is usable, which gate is still shut and why. It refuses the dark metric-card dashboard. The ground is a cool paper-white, the type is blue-black ink, and the shell (a deep harbour-navy rail) is the only committed mass of colour. Content sits on white records separated by 1px rules, not on floating cards.

Density is high but legible. A 15px root keeps tables, kanban cards and drawers compact; ids, versions, times, money and counts are set in a monospace with tabular figures so provenance scans in columns. Colour carries meaning, not mood: one cobalt for action and selection, and a strict semantic set (green, amber, red, grey) reserved for fact and gate state, always paired with a word or icon.

The signature is the gate strip: numbered segments that fill green as each condition passes and name the unmet ones inline, with unmet segments hatched in red. The same object appears on the dashboard, in drawers, in blocked-action hints and, compacted, on kanban cards. The world's motion is the moment a block clears: a segment fills, a chip turns green, a version stamp changes.

**Key Characteristics:**
- Cool paper-white ground, white records, 1px rules; no resting shadows.
- Harbour-navy rail as the shell; the role switcher and tooltips share its colour.
- One cobalt accent for primary action, selection, links and focus.
- Semantic colour for fact and gate state only, never without text.
- Public Sans for UI, JetBrains Mono for every id, version, time, count and placeholder.
- Square-ish 4px corners; a 2px heavy rule under each page heading.
- The gate strip as the reusable signature of every refusal.

## Colors

A cool, low-chroma grey-green paper and navy ink system with a single cobalt voice and a tightly scoped semantic set.

### Primary
- **Register Cobalt** (accent): primary buttons, active tab underline, links ("Open the Fact Sheet →"), focus outlines, text caret, selection. Deepens to **Pressed Cobalt** (accent-strong) on hover and as selection text; **Cobalt Wash** (accent-soft) is the selection background and the `info` status tone.

### Secondary
- **Harbour Navy** (rail): the sidebar, the role switcher, tooltips, the dialog and drawer scrim (at 35–40%), the workflow gate stamp, the "this week" bar in charts and the hours meter. **Harbour Navy Lift** (rail-2) marks the active nav item and the switcher hover. **Rail Ink** (rail-ink) and **Rail Mist** (rail-muted) are text on navy.

### Tertiary (semantic state only)
- **Ledger Green** (ok) / **Green Wash** (ok-soft): confirmed facts, passed gates, approved versions, the Approve button.
- **Tidemark Amber** (warn) / **Amber Wash** (warn-soft): pending or expiring facts, awaiting approval, stale versions.
- **Refusal Red** (bad) / **Red Wash** (bad-soft): unconfirmed facts, unmet gates, blocked tasks, blocked-action hints, the danger button.
- **Internal Slate** (internal) / **Slate Wash** (internal-soft): internal-only facts that may never be public.
- **Process Blue** (progress) / **Process Wash** (progress-soft): in-flight states (approved, scheduled, running, in production) in status chips and agent output types.

### Neutral
- **Cool Paper** (ground): page background, hovered table rows, the plain version badge.
- **Sheet White** (surface): every record, card, input, dialog and gate segment.
- **Ledger Tint** (panel): table header row, kanban column wells, skeletons, neutral chips, placeholders.
- **Hairline** (rule): all 1px dividers and borders; also the scrollbar thumb.
- **Heavy Rule** (rule-strong): the 2px rule under page headings and the dashboard question columns on mobile.
- **Ink** (ink), **Ink Second** (ink-2), **Ink Third** (ink-3): primary text, secondary text and lede, meta labels and placeholder text.
- **Prior Period Grey** (chart-previous): the "last week" series in comparison charts.

### Named Rules
**The Semantic-Only Rule.** Green, amber, red, grey and process blue mean fact or workflow state and nothing else, and every use carries a word, id or icon. A coloured dot or tint alone never states a status.

**The One Cobalt Rule.** Cobalt marks what you can act on or what is selected. It never signals a status, and it is never decoration.

**The Navy Shell Rule.** Harbour Navy is the shell's colour: rail, role switcher, tooltips, scrim. Content regions stay on paper and white.

## Typography

**Body Font:** Public Sans Variable (with ui-sans-serif, system-ui)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, SFMono-Regular)

**Character:** A plain, civic sans with tabular figures carries the prose and controls; a precise monospace with slashed zero carries the record's evidence. The pairing reads as government form plus ledger.

The root size is 15px, so every rem value below is 15px-based.

### Hierarchy
- **Headline** (700, 1.6rem, 1.25, -0.015em): page titles only, sitting on the heavy rule.
- **Title** (600, 1.125rem, 1.25, -0.01em): the dashboard question columns ("Can we sell it?"); dialog titles step down to 1rem.
- **Title Small** (600, 0.875rem): section headings over a 1px rule, with a mono count beside them.
- **Body** (400, 0.9375rem, 1.45): default text; ledes cap at 72ch, empty-state bodies at 60ch.
- **Body Dense** (400, 0.8125rem): table cells, kanban card titles (600), gate segment titles, blocker impact lines.
- **Label** (600, 0.6875rem, 0.025em, uppercase): table column heads, gate strip titles, top-bar metadata labels, kanban column names, status stamps such as "Blocks ads". Labels name data; they never sit above a heading as a kicker.
- **Mono** (500, 0.68–0.8rem): ids (FS-04, TASK-021), versions, demo clock, hours, counts, gate numbers, error codes, placeholders (at 0.85em of surrounding text).

### Named Rules
**The Mono Provenance Rule.** Anything that identifies, versions, times, counts or prices a record is set in JetBrains Mono with tabular figures and slashed zero. Prose never is.

**The Placeholder Rule.** An unknown value (`[date TBC]`, `[price TBC]`) is mono, muted ink-3, on a tinted panel with a dashed border, so it can never be mistaken for a real value.

## Layout

A fixed navy rail (15rem) on the left and a sticky 3.5rem white top bar carrying the campaign name, demo clock, hours, next checkpoint and the role switcher at the far right. The main column caps at 96rem with 1rem side padding (2rem from lg), 1.5rem top and 4rem bottom.

Every page opens with a page header: headline, optional mono meta badge and workflow-step link, a one-line lede, actions right-aligned, all over the 2px heavy rule, then 1.25rem of space. Sections stack with 0.75rem internal gaps under a 1px-ruled Title Small heading. The dashboard runs three question columns divided by vertical 1px rules, then a 1.7fr / 1fr split (blockers left, approvals and checkpoint right) with a 2rem gutter. Key-value detail uses a two-column definition list (min 7rem label column).

Tables are the dense default: 0.8125rem text, 0.75rem by 0.5rem cells, Ledger Tint uppercase header row, 1px row rules and a Cool Paper row hover. Grouped metrics sit in a 1px-gap grid on a Hairline background, so the gaps draw the rules.

Responsive: below lg (1024px) the rail becomes an off-canvas drawer behind a menu button with a navy scrim; below md (768px) the top-bar metadata hides and the role switcher stays; the dashboard question columns stack with a heavy top rule each. Kanban columns are a fixed 15.5rem and scroll horizontally at every width. Dashboard and Tasks are built to 390px; other screens are desktop-first.

## Elevation & Depth

Flat by default. Depth comes from tone (paper ground, white records, tinted wells) and 1px rules, not shadow. A single shadow exists, for overlays only.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 12px 32px -8px rgb(15 38 57 / 0.28), 0 2px 6px rgb(15 38 57 / 0.12)`): dialogs, drawers, tooltips, and a kanban card while it is being dragged.

### Named Rules
**The Overlay-Only Shadow Rule.** A surface casts a shadow only when it floats above the page (dialog, sheet, tooltip, a dragged card). Resting cards, tables and panels are flat.

## Shapes

Square-ish and quiet. Controls, cards, tables, inputs and tooltips use a 4px corner; chips, badges and small stamps 3px; dialogs and drawers 6px; gate segments, placeholders and the focus outline 2px. Pills are not used; the only full circles are status dots, the switch and the loading spinner.

Borders are 1px Hairline everywhere except the 2px heavy rule under page headings, the 2px active-tab underline, and the 4px coloured top bar on each full gate segment. Dashed borders are reserved for things that are not real yet: placeholders, the mock-data badge and empty states. A diagonal red hatch (`repeating-linear-gradient` at 135deg, 6px Red Wash and 6px white) marks an unmet gate segment.

**The Heavy Rule Rule.** Only page headings sit on the 2px rule-strong line. Everything else divides with 1px Hairline.

## Components

### Buttons
Quiet and compact; colour is spent only on the action that matters.
- **Shape:** gently squared (4px), 2.125rem tall (1.75rem small), 0.875rem horizontal padding, medium weight, 16px icons with a 0.375rem gap.
- **Primary:** Register Cobalt with white text; Pressed Cobalt on hover and active.
- **Secondary (default):** white with a Hairline border; border darkens to Ink Third and fill to Cool Paper on hover.
- **Approve:** Ledger Green with white text (deepens on hover), only for approval and confirmation.
- **Danger:** white with a faint red border and red text; Red Wash on hover.
- **Ghost / Link:** Ink Second text with a Ledger Tint hover; link buttons are cobalt and underline on hover.
- **Focus:** a 2px cobalt outline at 2px offset (global). Colour transitions run 150ms.
- **Refused (ActionButton):** an action the current role or state may not take stays visible at 45% opacity with `aria-disabled` and a not-allowed cursor, and its tooltip and screen-reader text say who can act or what must happen first. Loading shows a small current-colour spinner.

### Chips
- **Status chip:** 3px corners, 1px tinted border, 0.72rem medium text, preceded by a 6px status dot (it pulses softly while a run is active). Tones: neutral (Ledger Tint), info (Cobalt Wash), progress (Process Wash), ok, warn, bad.
- **Fact chip:** the fact id in mono inside a semantic chip with a leading icon (check usable, clock expiring, warning unconfirmed, lock internal) and a tooltip with the fact label, status and expiry. It appears inline in prose wherever a draft cites a fact.
- **Version badge:** a mono stamp, plain (Cool Paper, Hairline), approved (green) or stale (amber), with an optional small sans label.
- **Placeholder:** see The Placeholder Rule.

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** Sheet White on the Cool Paper ground; kanban columns are Ledger Tint wells (the blocked column a Red Wash well).
- **Shadow Strategy:** flat; Overlay only while dragging.
- **Border:** 1px Hairline, darkening to Ink Third on hover; a blocked card's border turns faint red.
- **Internal Padding:** 0.625rem on kanban cards, 0.875rem by 0.75rem on list rows, 1.25rem in dialogs.
- **Lists:** records in one bordered white container divided by 1px rules, not separate cards.

### Inputs / Fields
- **Style:** white, 1px Hairline, 4px corners, 2.125rem tall, 0.625rem padding, ink-3 placeholder text, cobalt caret.
- **Hover / Focus:** border darkens to Ink Third on hover; on focus the border turns cobalt with a 2px cobalt ring at 25%.
- **Error / Disabled:** invalid fields take a red border; disabled fields fill with Ledger Tint and muted text.

### Navigation
- **Rail:** Harbour Navy, 15rem wide, app name in bold over the client and campaign in Rail Mist. Items are 0.875rem with 16px icons at 80% opacity; hover adds a 6% white wash; the active item fills Harbour Navy Lift in semibold white. Live counts sit right-aligned in small mono badges (12% white, or a pale red badge when something is blocked). A ruled footer states the agents-are-read-only rule.
- **Tabs:** text tabs on a 1px rule; the active tab takes a 2px cobalt underline and ink text.
- **Role switcher:** the most prominent top-bar control, a Harbour Navy select at 2.25rem showing role and actor name, preceded by a small uppercase "Acting as" label.

### Blocked Hint
The inline explanation beside a refused control: a Red Wash panel with a faint red border and 4px corners, a ban icon, the error code in red mono, the message in ink and the hint in Ink Second. When the refusal is an ad-gate failure it embeds the full gate strip.

### Gate Strip (signature)
The four ad gates, or any set of named conditions, as one numbered strip.
- **Full form:** a Label title at left and a mono "2/4 passed — cannot go live" count at right (red while any gate is unmet, green when all pass). Below, segments sit in a 1px-gap grid on a Hairline background (two columns, four from sm), each a white cell with a 4px top bar (green passed, red unmet), "Gate n" in mono with a check or cross, a short name (red when unmet) and the condition in small Ink Second text. Unmet segments carry the red hatch.
- **Compact form (kanban cards):** small numbered squares, solid green when passed and red-outlined Red Wash when unmet, followed by "n/total · first unmet". The whole strip is announced as one labelled image.
- **Motion:** when a condition flips to passed, its bar or square fills from the left (scaleX 0.2 to 1, opacity 0.4 to 1) over 220ms on an expo-out curve.

## Do's and Don'ts

### Do:
- **Do** keep the ground Cool Paper (#f3f5f4) and every record Sheet White, separated by 1px Hairline rules.
- **Do** name the rule and the fix wherever an action is refused: keep the control visible at 45% opacity, put the reason in its tooltip, and show code, message and hint in a Blocked Hint.
- **Do** use the gate strip for any multi-condition gate, in full form in drawers, dashboard and hints and in compact form on cards.
- **Do** set ids, versions, times, counts and money in JetBrains Mono with tabular figures.
- **Do** render TBC values as dashed, muted mono placeholders.
- **Do** pair every semantic colour with a word, id or icon.
- **Do** keep motion to state changes: 150ms colour transitions, 220ms gate fills, a soft pulse only for running work and skeletons, all collapsed under reduced motion.

### Don't:
- **Don't** build a dark dashboard of metric cards; this is a light register.
- **Don't** use a cream or warm ground; the paper is cool.
- **Don't** use cobalt to signal state, or semantic colours for decoration or emphasis.
- **Don't** put shadows on resting cards, tables or panels; the overlay shadow is for floating surfaces only.
- **Don't** hide an action the current role cannot take; disable it and say who can.
- **Don't** place an uppercase label above a page or section heading as a kicker; uppercase labels name data columns, metadata and stamps.
- **Don't** round past 6px or use pill-shaped buttons and chips.
