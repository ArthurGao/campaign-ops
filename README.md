# CampaignOps

**Media promotion operations console** — one place to run an AI-assisted marketing campaign without letting AI publish, spend, or invent facts.

Built to run the workflow in **China Tour 2027 推广工作流** (https://claude.ai/artifact/TpdZz945Dm6MVEvLeBNLFN; step-to-screen map in `docs/workflow-source.md`), condensed in `docs/00-context.md`: a small NZ travel agency promoting a 2027 China Tour, one part-time project manager (16 h/week), three AI agents, an existing video factory, and a client who must approve anything public or paid.

> Phase 1 (this repo): a clickable web app with mock data and simulated agents. No real integrations. The API shapes are designed so that real Claude calls, a real CRM and real ad platforms can be plugged in later by swapping implementations only.
>
> **The frontend runs on its own.** By default it serves the whole API inside the browser from the shared domain package (`packages/core`): same endpoints, roles, rules, 409s and agent timers as the NestJS backend, with demo state kept in `localStorage`. Deploy `frontend/dist` to any static host; no backend needed. See `docs/decisions.md` D-04.

## What it manages

| Area | Why it exists |
|---|---|
| Fact Sheet | The only source of truth for anything said publicly. Entries have status (confirmed / pending / assumption) and a version. Unconfirmed entries cannot be referenced by outbound content. External page vs internal page (budget, targets). |
| Findings | Everything the Audit agent or the PM finds: finding, proof, impact, blocks what, suggested owner, needs approval. Items become tasks. |
| Tasks | Kanban across the shared pipeline: draft → QA → client approval → live → verified. Site changes, SEO/GEO changes, social posts, ad copy, video briefs. |
| Agents | Three agents — Audit, Outbound, Feedback — each with fixed inputs, read-only permissions, and outputs that must be reviewed. Trigger a run, watch status, review results, accept or reject. |
| Video factory | Briefs out, receipts in. Idempotency check by `task_id`, QA checklist, cost cap. |
| Publish packages | One record per post/ad: asset version + caption + UTM link + account + time + fact refs + QA + approval. Approval binds to a version. |
| Leads (simple CRM) | Every enquiry with source, validity, sales stage, reason, order. Weekly reconciliation of platform-reported conversions vs CRM. |
| Settings | Pre-approved scope, approvers, alert owner, UTM template, prohibited words. |

## Repo layout

```
campaign-ops/
├── README.md
├── CLAUDE.md                 # instructions for Claude Code
├── docs/
│   ├── 00-context.md         # the scenario and the rules the app enforces
│   ├── 01-product-spec.md    # users, scope, screens, flows
│   ├── 02-data-model.md      # entities, states, invariants
│   ├── 03-agents.md          # the three agents: inputs, outputs, mock behaviour
│   ├── 04-api.md             # REST endpoints (mock backend)
│   └── 05-frontend.md        # routes, components, mock data, UX rules
├── packages/core/            # framework-free domain: types, rules, seed, mock agents/factory, services
├── backend/                  # NestJS wrapper over core (optional; DTO validation, Swagger)
└── frontend/                 # React + Vite + TypeScript + Tailwind; in-browser mock API by default
```

## Stack

- **frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router, Zustand (only for UI state), Recharts for the small funnel/reconciliation charts.
- **core**: plain TypeScript. Rules in `packages/core/src/domain/rules/`, seed in `packages/core/src/seed/`, services in `packages/core/src/services/`, mock integrations in `packages/core/src/integrations/`.
- **backend** (optional): NestJS 10 controllers + `class-validator` DTOs over core. Swagger at `/api/docs`.
- **tooling**: pnpm workspaces, ESLint + Prettier, Jest (core rules + seed, backend HTTP e2e), Vitest (frontend), Playwright (browser flows F1–F6).

## Run

```bash
pnpm install
pnpm dev                       # standalone frontend, mock API in the browser → http://localhost:5400
pnpm build:frontend            # static site in frontend/dist (deploy anywhere)
pnpm dev:full                  # optional: NestJS backend on :3400 + frontend in http mode
```

`frontend/.env`: `VITE_API_MODE=mock` (default) or `http`, plus `VITE_API_URL=http://localhost:3400` for http mode.
Ports 3400 / 5400 avoid collisions on the dev machine (D-01); override with `PORT`.

### Deploy the frontend alone

`pnpm build:frontend` produces `frontend/dist`: plain static files. SPA fallbacks ship for Vercel
(`frontend/vercel.json`), Netlify (`_redirects`) and GitHub Pages (`404.html`). For a sub-path
deploy set `VITE_BASE=/sub/path/` at build time. Nothing is sent to any server: every visitor gets
their own demo state, reset from **Settings › Reset demo data**.

### Checks

```bash
pnpm -r typecheck && pnpm lint && pnpm test   # core 99 · backend e2e 21 · frontend 21
pnpm e2e                                      # Playwright: F1–F6 through the UI (uses system Chrome)
```

The 5-minute demo: `docs/demo-script.md`.

## Non-goals for phase 1

- No authentication (roles switched via the “Acting as” dropdown for the demo).
- No real Claude / ad platform / CRM / GTM calls. Interfaces exist; implementations are mocks.
- No file upload. Video assets are links.
- No multi-tenant. One client, one campaign.

## Phase 2 (not in scope now)

Real agent runs via Claude API using the prompts in `backend/src/agents/prompts/`, CSV import for CRM, Meta/Google read-only reporting, Google Sheets sync for the Fact Sheet external page, optional GitHub PR flow for drafts.
