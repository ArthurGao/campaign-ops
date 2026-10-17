# CampaignOps

**Media promotion operations console** — one place to run an AI-assisted marketing campaign without letting AI publish, spend, or invent facts.

Built for the scenario in `docs/00-context.md`: a small NZ travel agency promoting a 2027 China Tour, one part-time project manager (16 h/week), three AI agents, an existing video factory, and a client who must approve anything public or paid.

> Phase 1 (this repo): a clickable web app with mock data and simulated agents. No real integrations. The API shapes are designed so that real Claude calls, a real CRM and real ad platforms can be plugged in later by swapping implementations only.

## What it manages

| Area | Why it exists |
|---|---|
| Fact Sheet | The only source of truth for anything said publicly. Entries have status (confirmed / pending / assumption) and a version. Unconfirmed entries cannot be referenced by outbound content. External page vs internal page (budget, targets). |
| Evidence & backlog | Everything the Audit agent or the PM finds: finding, proof, impact, blocks what, suggested owner, needs approval. Items become tasks. |
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
├── backend/                  # NestJS + TypeScript, in-memory store, seed data
└── frontend/                 # React + Vite + TypeScript + Tailwind + shadcn/ui
```

## Stack

- **frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router, Zustand (only for UI state), Recharts for the small funnel/reconciliation charts.
- **backend**: NestJS 10, TypeScript, in-memory repositories seeded from `backend/src/seed/*.ts`, simulated agent runs with timers. No database in phase 1. Swagger at `/api/docs`.
- **tooling**: pnpm workspaces, ESLint + Prettier, Vitest (frontend) and Jest (backend) with a handful of tests around the invariants in `docs/02-data-model.md`.

## Run

```bash
pnpm install
pnpm -C backend start:dev      # http://localhost:3000, swagger at /api/docs
pnpm -C frontend dev           # http://localhost:5173
```

`frontend/.env`: `VITE_API_URL=http://localhost:3000`

## Non-goals for phase 1

- No authentication (single PM user, roles switched via a dropdown for demo).
- No real Claude / ad platform / CRM / GTM calls. Interfaces exist; implementations are mocks.
- No file upload. Video assets are links.
- No multi-tenant. One client, one campaign.

## Phase 2 (not in scope now)

Real agent runs via Claude API using the prompts in `backend/src/agents/prompts/`, CSV import for CRM, Meta/Google read-only reporting, Google Sheets sync for the Fact Sheet external page, optional GitHub PR flow for drafts.
