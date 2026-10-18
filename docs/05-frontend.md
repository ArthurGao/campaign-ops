# 05 — Frontend

React 18 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router. Data comes only from the backend API (`VITE_API_URL`); no mock data inside the frontend.

## Layout

- Left sidebar (collapsible on mobile): Dashboard, Fact Sheet, Evidence, Tasks, Agents, Video factory, Publish, Leads, Settings.
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

## Seed data the UI must look good with

The backend seed (see `CLAUDE.md` "Seed coverage") must include, at minimum, these headline records so the demo script works:

- Fact Sheet external: `FS-04` Departure (pending), `FS-07` Itinerary cities (confirmed), `FS-09` NZ passport entry requirements (confirmed_with_expiry, expires in 30 days, public note "subject to official information at departure"), `FS-11` Inclusions (confirmed), `FS-12` Primary customer 50+ (assumption), `FS-15` Price (pending).
- Fact Sheet internal: `FS-20` Ad budget (pending), `FS-21` Sales target `[N] seats` (assumption), `FS-22` Sales capacity per week (pending), `FS-23` Close rate `[r]` (assumption), `FS-24` People per booking `[p]` (assumption).
- Evidence: `E-03` "Lead event fires twice on form submit" (tracking, blocks ads, P0, isExample), `E-07` "China Tour page still shows last year's departures" (site, blocks traffic, P0, isExample).
- Tasks: `TASK-021` social_post Facebook caption (blocked, needs_confirmation FS-04), `TASK-018` site_change China Tour page (awaiting_approval), `TASK-030` ad_copy Google Search (approved, gates: landing page not ready), `TASK-011` video_brief (approved → brief `SOC-2027CT-003`).
- Agent runs: `RUN-0003` audit completed; `RUN-0007` outbound completed with one `needs_confirmation`; `RUN-0009` feedback completed with "Pause Meta ad set B"; `RUN-0010` audit failed (no URL); `RUN-0011` feedback queued.
- Factory: `SOC-2027CT-003` delivered with receipt `v1` (assets `VID-0031-4x5-v1`, `-9x16-v1`, `-16x9-v1`, `factsUsed ['FS-07','FS-11']`, license proof link, `creditsUsed 12 / cap 20`); `SOC-2027CT-004` in_production.
- Packages: `PUB-2027CT-012` facebook_feed awaiting_approval (asset `VID-0031-4x5-v2`, caption `CAP-012-v1`); others covering each status; `PUB-2027CT-008` mismatch with a one-sentence caption diff.
- Leads: `L-0012` paid_social valid / deposit_paid, 2 people; `L-0013` organic_search invalid "wants independent travel"; `L-0015` valid then lost; `L-0016` + `L-0017` same contact different travel dates (related, not merged); `L-0018` lead_ads with `adDetail.resolution = 'matched_from_platform'`; one phone lead with `adDetail.resolution = 'unknown'`.
- Reconciliation: 3 weeks × channels; week 2 `meta_ads` spend > 0 and `crmValidLeads = 0`.
- Settings: `pmMayApproveNonSubstantive: true` with list `['typos','punctuation','schedule time within the same day']`; alert owner set; landing page checks 3/4 on (so `not_ready`) — the demo flips the fourth.

## Component notes

- `KanbanBoard`: use `@dnd-kit/core`; on drop call `POST /tasks/:id/transition`; on 409 revert and toast.
- `JsonPeek`: collapsible `<pre>` showing the brief/receipt/package JSON exactly as stored — interviewers recognise the plan's samples.
- `FunnelChart`: 4 bars, this week vs last week; no pie charts.
- `ReconTable`: columns week, channel, spend, platform conversions, CRM valid leads, CPL or message, over-report ratio with a subtle warning when > 1.3.
- `VersionDiff`: simple line diff (use `diff` package) for captions and fact statements.

## Testing (light)

- Vitest: `FactChip` colour by status; `ReconTable` zero-denominator message; `GateBadges` rendering from `AdGates`.
- Playwright smoke (optional): demo flow F1 end to end against the running mock backend.
