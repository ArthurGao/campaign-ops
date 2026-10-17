---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: []
---

## Scope

The whole CampaignOps web app (9 Operate screens: Dashboard, Fact Sheet, Evidence, Tasks, Agents, Video factory, Publish, Leads, Settings). Visitor mode: Operate. Desktop-first; Dashboard and Tasks must work at 390px.

## Audience and job

A part-time PM (16 h/week) runs the campaign; client approver / decision maker drop in to confirm facts and approve exact versions; sales edits leads; executor schedules and publishes. Demo judged by interview panels in a 5-minute click-through: they must see each rule block an action and say why.

## Constraints

Standalone frontend (mock API in the browser, no backend). English UI. WCAG 2.2 AA. Placeholders ([date TBC]) must look like placeholders. Pinned direction (user, 2026-10-18): dense-data owns layout and palette, swiss-grid contributes local detail only, light ground, the gate is the signature. Code-led.

## Direction contract

THESIS: A campaign register where every refusal shows its reason. Refuses the dark Linear-style dashboard of metric cards; the screen reads like a well-kept record of who approved which version, with the rules visible where they bite.

OWN-WORLD: Cool paper-white ground (not cream), blue-black ink, a deep harbour-navy rail as the committed shell colour, one cobalt accent for selection and primary actions only. Semantic green / amber / red / grey reserved for fact and gate state, always paired with text. Public Sans for UI, JetBrains Mono for ids, versions, money and times with tabular figures. 1px rules divide regions; square-ish 4px corners; no shadows except overlays.

STORY: The visitor sees what is blocked and why within one glance, acts in the role that may act, and watches the block clear: fact turns green, gate segment fills, version stamp updates.

FIRST VIEWPORT: Left navy rail with nine destinations and live counts. Top bar: campaign name, demo clock, hours 9.5/16, next checkpoint, role switcher as the most prominent control. Dashboard body: three question columns ("Can we sell it?", "Can we catch enquiries?", "Can we measure it?") each answering in a sentence with its check list; below, blockers list left, approvals and funnel right.

FORM: Pinned direction (dense-data + swiss-grid detail, design KB), no concept-seed roll. Signature move: the gate strip — a segmented row of numbered gates (1/4 … 4/4) that fills green per passed condition and shows the unmet reason inline; the same component in kanban cards, drawers and blocked-action toasts. Motion grammar: 180 ms state transitions only; a gate segment fills when its condition flips.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
