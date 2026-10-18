# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided in the repo docs (`README.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`): React 18 + Vite + TypeScript strict + Tailwind CSS + shadcn/ui (Radix), TanStack Query v5, React Router v6, Zustand (UI state only), `@dnd-kit/core`, Recharts, `diff`; framework-free domain package `packages/core` serving the API in the browser; optional NestJS 10 wrapper; pnpm workspace.

## Users

- **In the product fiction:** one part-time project manager (~16 h/week) running an AI-assisted marketing campaign for a small NZ travel agency, plus the client's approver / decision maker, a sales person and an executor. Roles are switched via a dropdown (no auth). The PM is the daily operator; the client roles visit to confirm facts and approve specific versions; sales edits leads; the executor schedules and publishes.
- **Who judges the phase 1 demo:** both (a) interview / review panels who know the underlying PM plan and watch a ~5-minute click-through to judge whether the plan's rules are actually enforced, and (b) later, a real travel-agency client as a proposal for phase 2.

## Product Purpose

CampaignOps is a media-promotion operations console: one place to run an AI-assisted campaign without letting AI publish, spend, or invent facts. It coordinates work across a CMS, ad platforms, a video factory and a CRM, and keeps the record of what was decided, by whom, on which version. Phase 1 is a clickable demo with mock data and simulated agents whose API shapes allow real integrations to be swapped in later.

Success for phase 1: the six key flows (F1–F6 in `docs/01-product-spec.md`) run end to end, and a viewer can see each guardrail block an action and explain why.

## Positioning

The product's point is that the plan is hard to break, not that it has many features. Its mechanism:
- the Fact Sheet is the single source of truth; unconfirmed facts are unusable in outbound content;
- client approvals bind to exact versions; any content edit resets approval;
- AI agents are read-only and every output is accepted or rejected by a person, item by item;
- paid traffic is gated on four explicit ad gates;
- the CRM is the only ledger for results.

## Operating Context

- Scenario (`docs/00-context.md`): a fictional client `Demo Travel (NZ)` selling a guided China Tour departing March–May 2027 to NZ English-speaking customers, mostly 50+ (assumption).
- Channels: website, SEO, GEO (AI-search visibility), Facebook/Instagram, YouTube, TikTok trial, Google Search and Meta ads.
- Three agents (Audit, Outbound, Feedback), an existing video factory (briefs out, receipts in), two client approval gates, two-week checkpoints, Feedback runs twice a week.
- Dates displayed in `Pacific/Auckland`; money as NZD cents.

## Capabilities and Constraints

- Twelve screens: Dashboard, Workflow, Week, Review, Fact Sheet, Findings, Tasks (kanban), Agents (with AI cost), Video factory, Publish packages, Leads (Funnel, Reconciliation), Settings.
- Every blocked action returns `{ code, message, hint }`; the UI shows the specific unmet condition, never just a lock.
- Mock only: no auth, no database, no file upload, no realtime beyond 2 s polling during agent runs.
- UI copy in English only; no Chinese in the UI.
- Seed data uses placeholders (`[date TBC]`, `[price TBC]`, `https://example.govt.nz/visa`); no real companies, prices, dates or visa rules. Placeholders must look like placeholders.
- Mobile layout required for Dashboard and Tasks; other screens are desktop-first.
- Open product questions are tracked in the conversation / `docs/decisions.md` (e.g. whether an in-scope `ad_change` skips client approval in flow F3).

## Brand Commitments

None. `Demo Travel (NZ)` is purely fictional and CampaignOps has no existing brand assets; the visual world is undecided.

## Evidence on Hand

- Product docs: `README.md`, `docs/00-context.md` through `docs/05-frontend.md`, layer instructions in `backend/CLAUDE.md` and `frontend/CLAUDE.md`.
- No real client data, testimonials, metrics or screenshots exist. All numbers in the demo are seeded mocks and must not be presented as real results.

## Product Principles

1. **Show the gate, not just the lock.** Every refusal names the rule and what would satisfy it.
2. **Humans decide; AI proposes.** Nothing an agent produces changes state until a person accepts it.
3. **Provenance is visible.** Fact refs, versions and who-approved-what are first-class on every item.
4. **Honest about unknowns.** TBC values, small samples and unknown attribution are shown as such, never filled in.
5. **Fewer, clearer screens** over feature breadth.

## Accessibility & Inclusion

WCAG 2.2 AA. Focus rings, labelled controls, tables with `<th scope>`, dialogs with focus trap, `aria-live` toasts, keyboard-reachable everything; `jsx-a11y` lint. Status is never conveyed by colour alone (fact chips, gate badges carry text).
