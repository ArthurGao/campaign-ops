# Source workflow → CampaignOps

The frontend exists to run this workflow:
**China Tour 2027 推广工作流** — https://claude.ai/artifact/TpdZz945Dm6MVEvLeBNLFN (the author's plan; ten
steps, three agents, exception handling, shared rules, weekly 16-hour budget, quality measures).
`docs/00-context.md` is its condensed English form. When the two disagree, the source workflow is the
author's intent; record the resolution in `docs/decisions.md`.

## The ten steps and where they live in the app

| # | Step (source) | Who | Screen / mechanism | Status |
|---|---|---|---|---|
| 1 | Build the Fact Sheet and task board | PM | Fact Sheet (external / internal / history), Tasks board | Done |
| 2 | Audit the current state | Audit agent | Agents › Audit run → evidence + GEO observations; failed run when no URL | Done |
| 3 | Verify and prioritise | PM | Findings: filters, P0–P2, convert to task (bulk) | Done |
| 4 | Client confirms facts, budget, pre-approved scope (gate 1) | Client | Fact Sheet › Confirm (source required); Settings › Pre-approved scope (client roles) | Done |
| 5 | Produce (drafts, briefs; video via factory) | Outbound agent, factory | Agents › Outbound draft (needs_confirmation stops); Video factory brief → receipt | Done |
| 6 | QA (agent first, then PM) | Outbound, PM | Outbound qa mode; task QA checklist; factory QA checklist with named human review | Done |
| 7 | Client approval of exact versions (gate 2) | Client | Task approval, Publish › Approve these versions; edits reset approval | Done |
| 8 | Go live and verify | Executor, Outbound | Mark live (ad gates, page lock), Schedule (duplicate check), Mark published, Outbound verify | Done |
| 9 | Take enquiries, read results | Sales, Feedback agent | Leads (validity vs stage, merge rules), Funnel by layer (D-39), Reconciliation, Feedback runs, de-identified CSV | Done |
| 10 | Decide the next round | PM | Accept / reject suggestions; in-scope changes arrive pre-approved, others go to the client; Week (plan, hours, report) | Done (D-37) |

In the app, **Workflow** (`/workflow`) renders these steps with their live status and links; each
screen header shows the step numbers it serves.

## Links between the two (D-36)

- **Source → app.** The published artifact carries a generated block: a search box ("在原文和
  CampaignOps 里找") over the plan's sections and the app's screens, "在 CampaignOps 里看" links under
  every step, agent, exception, rule and section, and record ids (FS-04, PUB-2027CT-012, …) linked
  to the record in the app.
- **App → source.** "Source plan ↗" links on each Workflow step, exception and rule, and on records
  the plan mentions (Fact Sheet rows, evidence, tasks, packages, briefs, leads). They open the
  artifact at `#step-N`, `#ex-N`, `#rule-N`, `#ref-<id>`; the block expands and highlights the target.
- **One map.** `frontend/src/lib/source-map.json`. `src/lib/source-map.test.ts` checks every anchor
  against `docs/source/workflow.html`, every app path against the router and every record id against
  the seed; `e2e/source-links.spec.ts` checks the links in both directions in a browser.
- **Updating the artifact.** Read the live artifact, save it over `docs/source/workflow.html`
  (verbatim), run `node frontend/scripts/source-links.mjs`, then publish
  `docs/source/workflow.linked.html` to the same artifact URL. Re-running replaces only the block.

Loop: out-of-scope changes go back to step 4, new tasks to step 5, every two weeks back to step 2
(Dashboard shows the next checkpoint).

## Exception handling (source "出了问题怎么回到我这里")

| Situation | In the app |
|---|---|
| Landing page broken / tracking down | Landing checks in Settings; ad gate blocks going live; Feedback raises an "act now" anomaly. Pausing live ads is a person's action (task), as in the source |
| Product facts changed | Any fact change bumps the version and flags every citing task / package / brief for re-review (History tab) |
| AI wrote an unconfirmed visa claim or date | Outbound stops with needs_confirmation; approval and scheduling refuse unconfirmed facts |
| Video production failed or late | Brief returned with a note → new receipt version; re-render cap enforced |
| Approval never came | Nothing ships unapproved (no reminder feature) |
| Publish API timeout | Not modelled (no real platforms) |
| Live content differs from approved | Outbound verify → mismatch with sentence diff; Take down |
| Views up but no enquiries | Funnel by layer on Dashboard; Feedback funnel observation |

## Differences resolved (2026-10-18)

1. Ad gate "product facts confirmed" follows the source: all core product facts (D-33).
2. The PM confirms official-source facts such as visa rules, with an expiry (D-34).
3. Spend-reducing changes (pauses) skip the launch gates, as the source's stop-loss rules imply (D-32).

## Still open

1. **Week-4 review report and the AI cost log** (source "第 4 周：第一次完整复盘", "AI 不是免费的"). The
   weekly report, plan and 16-hour split are in the app since D-37, and the review's layer-by-layer
   funnel with break points since D-39 (Leads → Funnel); the review report itself and the cost log are
   not.

Resolved as a label only: Feedback suggestions in scope read "Approved by the PM within scope ·
applied by Executor", matching the source sample ADS-007.
