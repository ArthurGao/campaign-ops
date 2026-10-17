# Decisions

Choices made where the docs were silent or contradicted each other. Rule from `CLAUDE.md`: pick the
simpler option, leave a `// TODO(phase2):` where it matters, and record it here.

## Tooling

- **D-01 Ports 3400 / 5400 instead of 3000 / 5173.** Port 3000 is already used on the dev machine by
  two other projects (registered collisions). Backend `PORT` and frontend `PORT` env vars override.
- **D-02 Hand-written shadcn/ui components.** Current shadcn output targets React 19 (no
  `forwardRef`); under React 18 Radix `asChild` loses refs. `src/components/ui/` follows the classic
  shadcn (forwardRef) source on Tailwind v4.
- **D-03 Node 26 locally, `engines >= 20`.** pnpm installed globally (Node 26 ships no corepack).
- **D-04 Standalone frontend (user request, 2026-10-18).** The frontend must deploy and start on its
  own with mock data, no backend. It runs the same domain in the browser: `src/api/mock/` routes
  every documented endpoint to the core services, so invariants, 409s and agent timers behave
  exactly as over HTTP. `VITE_API_MODE=mock` (default) or `http` (`VITE_API_URL`). This replaces
  `frontend/CLAUDE.md` rule 1 ("no mock data in the frontend"): the data still comes from
  `packages/core/src/seed`, never from components. Demo state persists in `localStorage` per browser;
  Settings › Reset demo data reloads the seed.
- **D-05 `packages/core`.** Domain types, enums, rules, seed, mock integrations and services are
  framework-free and shared: the NestJS backend wraps them (controllers + DTO validation only), the
  frontend imports them directly. Frontend types come from core, so `pnpm sync-types` is retired.
  The backend is kept working but frozen (user: "后端可以不做").

## Domain

- **D-10 Demo clock.** `now = SEED_NOW + (wall time since last reset)`. The seed is fixed relative
  to `SEED_NOW` (2026-10-15 10:00 Pacific/Auckland), so expiry windows (FS-09 expires in 30 days)
  look the same whenever the demo runs.
- **D-11 Superseded fact.** Seed coverage requires a `superseded` external entry; the headline list
  in `05-frontend.md` has none. Added `FS-03` (old departure statement) superseded by `FS-04`.
- **D-12 Package asset version.** `PUB-2027CT-012` uses `VID-0031-4x5-v2`, so `SOC-2027CT-003` has
  two receipts: `v1` (all three ratios, returned: 4:5 end card crops the link) and `v2` (4:5
  re-render), and is `qa_passed`; a package never uses an asset that has not passed QA. The
  "delivered with receipt" state is covered by `SOC-2027CT-005` (delivered, receipt `factsUsed`
  includes `FS-15`, outside `allowedFacts`, so Outbound QA and the checklist flag it).
  `SOC-2027CT-004` is `in_production`. Covers I-V3 (old receipts kept).
- **D-13 Brief `draft` status.** `POST /factory/briefs` stores a brief as `draft`; `/send` moves it
  to `submitted`. Duplicate check (I-V1) runs on create and on send, ignoring the brief itself.
- **D-14 Agent output proposals.** `AgentOutput.proposal` carries the structured record an accept
  creates (evidence fields, task fields, or a verification target). The body stays human-readable.
- **D-15 Accepting a `draft` output for an existing task** applies the draft to that task (body +
  fact refs) instead of creating a second task; a task blocked only by `needs_confirmation` whose
  facts are now usable returns to `draft`. Without a `taskId` a new draft task is created.
- **D-16 Observations.** Accepting an `observation` records the decision ("noted") and creates no
  record; I-A1 lists no target record for this type.
- **D-17 In-scope suggestions (F3).** Accepting a suggestion with `inScope: true` creates the
  `ad_change` task already `approved`, with `approval.preApproved = { scopeRef, authorisedBy }`
  pointing at the pre-approved scope the client signed. Out-of-scope suggestions create a `draft`
  task that must go through client approval (decision maker). The four ad gates still apply to
  `live`, so the demo script runs F5 (landing page) before F3.
  `TODO(phase2)`: decide whether spend-reducing changes (pause) should bypass the landing-page gate.
- **D-18 Verification by either agent.** `live → verified` requires an accepted `verification`
  output targeting the task; Outbound verifies content, Feedback verifies ad changes (F3). A package
  follows its source task: publishing it puts an approved source task `live`; verifying it
  (agent or PM) verifies a live source task.
- **D-19 Non-substantive edits are two-step for tasks and packages.** The edit marks
  `pendingNonSubstantive = { scopeRef }` and still bumps the version and resets approval; the PM may
  then approve only if `settings.preApprovedScope.pmMayApproveNonSubstantive` and `scopeRef` is in
  the list (`SCOPE_NOT_AUTHORISED` otherwise). The approval records `nonSubstantive`.
- **D-20 Page lock.** A `site_change` cannot go `live` while another task on the same `pageUrl` is
  `live` (not yet verified).
- **D-21 QA on tasks** is submitted with the `qa → awaiting_approval` transition. A failing QA
  record is rejected with `QA_REQUIRED` and not stored. Editing the body while in `qa` clears the QA.
- **D-22 Video brief QA pass** moves the linked `video_brief` task to `qa` (system transition) and
  creates one `awaiting_approval` publish package per deliverable.
- **D-23 needsRereview** is set by any Fact Sheet change to a referenced entry (I-F3) and cleared
  by the PM via `PATCH` (`needsRereview: false`) on the task / package, or by re-approval.
- **D-24 Packages without an asset** (text ads) are allowed: `asset` is optional; the duplicate
  publish key is then `sourceTaskId + channel`.
- **D-25 `scheduledAt` edits** do not reset approval (I-P1 binds asset + caption versions only)
  but are logged.
- **D-26 Reconciliation CRM counts are seeded weekly aggregates.** `TODO(phase2)`: derive from the
  CRM ledger. Lead edits in the demo do not change past weeks.
- **D-27 Ops status record.** Tracking detection, last test enquiry, hours this week and campaign
  start are a seeded `OpsStatus` record used by the Dashboard; no time-tracking feature.
- **D-28 Lead `everValid`** implements I-L1; merged-away leads keep `mergedInto` and are hidden
  from the default list.
- **D-29 Missing `X-Role` header defaults to `pm`** (Swagger convenience); an unknown role is 400.
- **D-30 Extra error codes** `VALIDATION` (400) and `NOT_FOUND` (404) besides the documented ones.
- **D-31 Editing the statement of a confirmed fact sends it back to `pending`.** The confirmation
  covered the old wording.
