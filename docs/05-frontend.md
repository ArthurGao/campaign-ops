# 05 — Frontend

React 18 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router. Data comes only through the API client: by default the API runs in the browser on `packages/core` (D-04); `VITE_API_MODE=http` uses the NestJS backend. No mock data inside components.

## Layout

- Left sidebar (collapsible on mobile): Dashboard, Workflow, Week, Review, Fact Sheet, Findings, Tasks, Agents, Video factory, Publish, Leads, Settings.
- Top bar: campaign name (`Demo Travel (NZ) · China Tour 2027`), **role switcher** (select; stored in Zustand; sent as `X-Role`), "Hours this week 9.5 / 16" pill, next checkpoint date.
- Global toast for blocked actions: `message` from the API; inline `hint` under the control that was clicked.
- Every destructive or state-changing button shows a confirm dialog with the reason it will record (e.g. reject note, mismatch note).

## Routes

| Route | Screen | Key components |
|---|---|---|
| `/` | Dashboard | `ThreeQuestionTiles`, `FunnelChart` (Recharts), `BlockersList`, `ApprovalsCard`, `CheckpointCard` |
| `/fact-sheet` | Fact Sheet | `FactTable` (tabs external/internal/history), `FactRowActions`, `FactUsagesDrawer`, `VersionDiff` |
| `/evidence` | Findings | `EvidenceTable`, `EvidenceFilters`, `ConvertToTaskDialog`, `ExampleBanner` |
| `/tasks` | Tasks | `KanbanBoard` (dnd-kit), `TaskCard`, `TaskDrawer` (tabs: details, fact refs, QA, approval, history), `GateBadges` |
| `/agents` | Agents | `AgentCard` ×3, `RunForm`, `RunsTable`, `RunDetail`, `OutputReviewItem` (accept/reject), `AiCost` (D-40) |
| `/factory` | Video factory | `BriefList`, `BriefForm`, `ReceiptView`, `QAChecklist`, `JsonPeek` (shows the brief/receipt JSON as in the plan) |
| `/publish` | Publish packages | `PackageList`, `PackageView`, `ApprovalPanel`, `ExecutorPanel`, `PublishLogTable`, `VersionBadge` |
| `/leads` | Leads | `LeadsTable`, `LeadEditDrawer`, `MergeSuggestionBanner`, tab `Funnel` → `FunnelTab` (D-39), tab `Reconciliation` → `ReconTable`, `ReconChart`, `ExportButton` |
| `/review` | Review | `ChannelTable` (suggestion, decision, note per channel), assumption check, next phase, send once (D-40) |
| `/settings` | Settings | `ScopeForm`, `PeopleForm`, `UtmTemplateForm` (live preview), `LandingPageChecks` (4 toggles → status), `ProhibitedWords`, `ResetDemoButton` |

## UX rules

1. **Show the gate, not just the lock.** Wherever an action is blocked, render the specific unmet condition(s): e.g. for an ad task, four gate badges with green/red; for a package, "Approved versions: asset v1 / caption v1 — current caption v2".
2. **Fact refs are first-class.** A chip per FS id everywhere a reference appears: green (publicly usable), amber (confirmed with expiry, nearing), red (pending/assumption/rejected), grey (internal — should never appear on outbound items; if it does, show a warning banner — it indicates a bug).
3. **Versions visible.** Task version, package asset/caption versions, Fact Sheet version in a small mono badge. Diff view for history.
4. **Agent outputs are reviewable one by one.** Each output card: type badge, body (markdown), fact refs, evidence links, in-scope flag, Accept / Reject with note. After accept show "Created TASK-023 →".
5. **No silent AI actions.** Agent cards display the guardrail sentence. Run buttons are available only to `pm`.
6. **Placeholders look like placeholders.** `[date TBC]`, `[price TBC]` rendered in a muted mono style; never styled like real values.
7. **Reconciliation zero-denominator.** Render "No valid leads yet · spent $X" in place of CPL; do not render `0`, `∞` or `NaN`.
8. **Role-aware empty states.** E.g. Sales role on Tasks: "Read-only for Sales. Switch role to PM to edit."
9. **Polling**: while a run is `queued|running`, poll `GET /agents/runs/:id` every 2 s with a progress indicator; stop on completion.
10. **Accessibility**: focus rings, labelled controls, tables with `<th scope>`, dialogs with focus trap (shadcn defaults). Mobile layout required for Dashboard and Tasks (horizontal scroll kanban).

## Seed data

Headline records the demo depends on live in `packages/core/src/seed/` (pinned by `seed.spec.ts`); the click-through that uses them is `docs/demo-script.md`.

## Component notes

- `KanbanBoard`: use `@dnd-kit/core`; on drop call `POST /tasks/:id/transition`; on 409 revert and toast.
- `JsonPeek`: collapsible `<pre>` showing the brief/receipt/package JSON exactly as stored — interviewers recognise the plan's samples.
- `FunnelChart`: 4 bars, this week vs last week; no pie charts.
- `ReconTable`: columns week, channel, spend, platform conversions, CRM valid leads, CPL or message, over-report ratio with a subtle warning when > 1.3.
- `VersionDiff`: simple line diff (use `diff` package) for captions and fact statements.

## Testing

Vitest for shared components and the mock API (`src/**/*.test.ts*`); Playwright (`e2e/`) runs every flow in `docs/demo-script.md` plus the Week, Funnel, Review, source-link and layout checks against the in-browser mock API (port 5402).
