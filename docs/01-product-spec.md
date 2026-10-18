# 01 — Product spec (phase 1: clickable mock)

## Users and roles

Single login is out of scope; a **role switcher** in the header changes what actions are enabled. Roles:

| Role | Can do |
|---|---|
| `pm` | Everything except client approvals; runs agents; accepts/rejects agent outputs; sends briefs; schedules; edits settings. |
| `client_approver` | Confirm Fact Sheet entries; approve/reject publish packages and site changes; edit pre-approved scope. Read-only elsewhere. |
| `client_decision_maker` | Same as approver plus budget and out-of-scope ad changes. |
| `sales` | Edit leads (validity, stage, reason, notes). Read-only elsewhere. |
| `executor` | Move tasks to `live`, mark packages `scheduled` / `published`, record receipts. Read-only elsewhere. |

The current role is shown on every page. Disabled actions show a tooltip "Requires: client_approver".

## Scope (phase 1)

In: all screens below with mock data; simulated agent runs; all invariants enforced in the mock backend; demo script.

Out: real integrations, auth, persistence beyond process memory (add a "Reset demo data" button in Settings that reloads the seed).

## Screens

### 1. Dashboard
Purpose: answer the three starting questions at a glance.
- Three status tiles: **Can we sell it?** (count of confirmed vs pending external facts), **Can we catch enquiries?** (landing page status, Lead event check, last test enquiry response time), **Can we measure it?** (GA4/GTM/Pixel detected, UTM capture, CRM connected).
- Funnel this week vs last week: impressions → visits → valid leads → deposits (from reconciliation data).
- Blockers list (evidence items with `blocks !== 'none'` and open tasks with `needs_confirmation`).
- Awaiting approval (count + link), next checkpoint date, hours used this week vs 16.

### 2. Fact Sheet
- Tabs: **External page**, **Internal page**, **History**.
- Table columns: ID, statement, status, source, confirmed by / date, expiry, public-usable (derived).
- Row actions: `pm` can add/edit (creates a new Fact Sheet version), `client_approver` can **Confirm** or **Reject with note**. Confirm requires a source.
- "Where is this used?" drawer: lists drafts, briefs, packages referencing the entry.
- History tab: version list with diff of changed entries; bumping a referenced entry shows affected items with a **Re-review** button that flags them.

### 3. Evidence & backlog
- Table: ID, source (site/tracking/channels/seo/geo/sales/ai_search), finding, proof (link/screenshot label), impact, blocks (none/traffic/ads/measurement), priority P0–P2, suggested owner, needs approval, status (open/converted/dismissed).
- Filters by source, blocks, priority. Bulk "Convert to task".
- Inline note: "Format example only — not a diagnosis" shown on seed items flagged `isExample`.

### 4. Tasks
- Kanban columns: `draft`, `qa`, `awaiting_approval`, `approved`, `live`, `verified`, plus a side column `blocked`.
- Card: type (site_change, seo_change, geo_change, social_post, ad_copy, video_brief), title, owner, fact refs (chips, red if unconfirmed), version, gate badges for ads.
- Drag between columns only where the transition is allowed (see 02-data-model); otherwise snap back with the reason.
- Task drawer: description, fact refs with status, QA checklist, approval record, history log.

### 5. Agents
- Three cards (Audit, Outbound, Feedback): one-line role, permissions, last run, **Run** button with a small form for inputs (e.g. Outbound: task type + channel + Fact Sheet version; Feedback: date range).
- Runs table: run ID, agent, trigger, status, started, duration, outputs count, cost estimate (tokens mock).
- Run detail: inputs snapshot, outputs list; each output has type (evidence / draft / suggestion / needs_confirmation / observation), body, fact refs, and **Accept** / **Reject** with note. Accept creates the linked record and shows the link.
- Visible guardrail text under each card: "Read-only. Produces drafts and suggestions only."

### 6. Video factory
- Briefs list: task ID, campaign, deliverables (ratios), allowed facts, deadline, cost cap, status (`submitted → accepted → in_production → delivered → qa_passed | qa_returned`).
- **New brief** form prefilled from a `video_brief` task; sending runs the duplicate check (same `task_id` already in queue → block).
- Receipt view: assets with ID/ratio/checksum, `facts_used`, license proof link, `credits_used` vs cap, render attempts, issues.
- QA checklist: ratio/length/checksum match; `facts_used ⊆ allowed_facts`; captions/voice-over/key frames checked by human (checkbox with name); license proof present; credits within cap. Pass → task to `qa`; Return → new version note.

### 7. Publish packages
- List with status chips: `awaiting_approval`, `approved`, `scheduled`, `published`, `verified`, `mismatch`.
- Package view: asset (ID, version, link), caption (version, text), UTM link (generated, read-only), account, scheduled time (Pacific/Auckland), fact refs, QA, approval (approver, status, approved versions), executor, publish log entries.
- Actions by role: approver **Approve** (records versions) / **Reject with note**; executor **Schedule** (runs duplicate check) → **Mark published** (post URL + time); pm **Record verification** (`verified` or `mismatch` with diff note). Any edit to caption/asset creates a new version and resets to `awaiting_approval`; a non-substantive edit flow asks for the pre-approved scope authorisation and records it.

### 8. Leads (simple CRM)
- Table: ID, date, enquiry summary, source (utm_source/medium/campaign or phone/dm/email), ad detail (campaign/ad ID, utm_content, utm_term, landing page version, or "unknown"), self-reported source, first response time, owner, validity (+date, reason), stage, order.
- Row edit for `sales`. Merge suggestion banner when same email/phone appears with the same travel need; keep separate when travel need differs (show both with a link).
- **Reconciliation** tab: per channel per week — platform-reported conversions vs CRM valid leads, spend, paid CPL (or "no valid leads yet, spent X"), over-report ratio. Small chart.
- Export button produces the de-identified CSV the Feedback agent would receive (names/emails/phones stripped) — download as a file.

### 9. Settings
- Pre-approved scope: budget cap per channel, pause conditions, allowed asset/fact scope, **non-substantive edits PM may approve (yes/no + list)**.
- People: approvers by category, alert owner outside PM hours (name, contact, response time), executors.
- UTM template with live preview; prohibited words list used by Outbound checks.
- Landing page status (`not_ready` / `traffic_ready`) with the four checks as toggles — only all four on allows `traffic_ready`.
- "Reset demo data".

### 10. Week (added 2026-10-18, D-37)
The source workflow's weekly loop: plan on Monday, a one-page report at the end of the week, 16 PM hours.
- **Plan**: tasks picked from the board for this or next week (pm). Each row says what stops it: an unconfirmed fact, client approval, unmet ad gates, or a block reason. Past weeks are read-only.
- **Hours**: the PM logs time by category (management, audit, site, social, SEO/GEO, ads, review, buffer) in quarter hours. Used vs the source plan's split for that campaign week (15 h in week 1, then 16 h, with 1.5 h buffer); over 16 h shows as over. Buffer entries need a note. The top bar and Dashboard read the same total.
- **Report**: done / blocked / next, prefilled from the week's records (status changes, publishes, Fact Sheet versions, open blockers, next week's plan), edited and saved as a draft, then sent once with a snapshot of the week's numbers (visits, valid leads, deposits, paid spend and CPL). Client roles see sent reports only; a sent report is not edited.

## Key flows (must work end to end in the demo)

F1. **Unconfirmed fact blocks a draft.** Run Outbound for a Facebook caption while `FS-04` is pending → output `needs_confirmation` → accept creates a blocked task → client confirms `FS-04` with a source → task shows fact refs green → re-run Outbound → draft → QA → package → approve → schedule → publish → verify.

F2. **Factory round-trip.** Create brief from a `video_brief` task → send (duplicate check passes) → simulated factory moves to delivered after a few seconds → receipt appears → QA checklist → pass → package created.

F3. **Feedback proposes a pause.** Run Feedback for last 10 days → suggestion "Pause Meta ad set B" with evidence and in-scope flag → PM accepts → task `ad_change` created → executor marks live → Feedback next run verifies state.

F4. **Approval binds versions.** Edit a caption on an `approved` package → version bumps, status resets → approver sees diff → approves again.

F5. **Ad gate.** Try to move an `ad_copy` task to `live` while landing page is `not_ready` or budget not approved → blocked with the list of unmet gates; flip settings → allowed.

F6. **Reconciliation with zero denominator.** A channel with spend but zero valid leads shows "no valid leads yet, spent $X" rather than a CPL.
