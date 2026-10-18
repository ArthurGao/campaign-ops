# 02 — Data model

The types are in `packages/core/src/domain/types.ts` and `enums.ts` (the single source, D-05); this page keeps only what the types cannot say: derived values, invariants and allowed transitions. Each rule is a pure function in `packages/core/src/domain/rules/` with a spec next to it. Tracked entities carry `createdAt`, `updatedAt` and `events` (who, when, what, reason) for the history drawers.

## Fact Sheet

Derived: `isPubliclyUsable(entry, now) = page === 'external' && (status === 'confirmed' || (status === 'confirmed_with_expiry' && expiresAt > now))`.

Invariants
- I-F1: `internal` entries are never returned by the endpoint the Outbound agent reads (`GET /fact-sheet/external`).
- I-F2: any status change bumps the Fact Sheet version and records a `FactSheetVersion`.
- I-F3: a change to a referenced entry marks every referencing Task/Package/Brief with `needsRereview = true`.
- Counts of "external facts" skip superseded and rejected entries everywhere (`isLiveExternal`, D-41).

## Findings (entity `Evidence`)

- A finding with `blocks !== 'none'` keeps blocking until it is dismissed or the task it became is verified (`stillBlocking`, D-41). The Dashboard blockers, the sidebar badge and the weekly report all use it.
- Converting a finding creates a draft task (blocked if it cites an unusable fact) and sets the finding `converted`.

## Tasks

- Fact refs not given on create are read from the title and body (`factRefsIn`, D-41).

Allowed transitions (anything else → 409):
- `draft → qa` (pm; requires `needsConfirmation === false`)
- `qa → awaiting_approval` (pm; requires `qa.passed`)
- `awaiting_approval → approved` (client role; records `approvedVersion = version`)
- `awaiting_approval → draft` (client reject with note)
- `approved → live` (executor; for `ad_copy`/`ad_change`: all four ad gates must pass; for site changes: page lock — no other `live`-pending task on the same `pageUrl`)
- `live → verified` (pm, after Outbound verification output accepted)
- any → `blocked` (system, with reason) and `blocked → draft` (pm when reason cleared)
- editing `body` on `approved`/`awaiting_approval` → `version++`, status `awaiting_approval`, `approval` cleared unless non-substantive flow used.

## Agents

Invariants
- I-A1: accepting an output creates exactly one record (EvidenceItem, Task draft, Task `ad_change`, or sets `verified`) and stores `createdId`.
- I-A2: outputs of type `needs_confirmation` can only be accepted into a Task with `status = 'blocked'` and `blockedReason = 'needs_confirmation: <FS ids>'`.
- I-A3: the Outbound agent's input snapshot must only contain external facts (assert in service; test).

## Video factory

Invariants
- I-V1: sending a brief fails if another non-cancelled brief exists with the same `taskId`.
- I-V2: QA pass requires `factsUsed ⊆ allowedFacts`, license proof present, `creditsUsed ≤ costCap.maxCredits`, and the human checklist item "captions, voice-over and key frames reviewed" ticked with a name.
- I-V3: a returned brief creates a new receipt version; old receipts are kept.

## Publish packages

Invariants
- I-P1: `approved` requires `approval.approvedAssetVersion === asset.version && approvedCaptionVersion === caption.version`.
- I-P2: `scheduled` requires `status === 'approved'` and no `published` log entry for the same `asset.assetId + channel` across all packages.
- I-P3: editing caption or asset after approval resets `approval.status = 'pending'`, `status = 'awaiting_approval'`, bumps the edited version; if `settings.preApprovedScope.pmMayApproveNonSubstantive` and the editor marks the edit non-substantive, the PM may approve with `nonSubstantive` recorded — still a new version.
- I-P4: `verified`/`mismatch` requires a `published` log entry; `mismatch` requires a note.

## Leads (CRM)

Invariants
- I-L1: `valid` once set remains part of "historically valid" counts even if `stage = 'lost'`.
- I-L2: merge is only offered when same email/phone **and** same `enquiry.tour + travelDate`; otherwise records are linked via `relatedLeadIds`.
- I-L3: de-identified export strips `contact` and `clickIds`.

## Reconciliation and funnel

Paid CPL (`rules/recon.ts`) = channel spend ÷ CRM valid leads; spend with none reads "no valid leads yet, spent $X", never 0, ∞ or NaN; the total paid CPL counts only valid leads from paid channels. Weekly rows are seeded aggregates (D-26); recon and funnel rows come from one seed table so valid leads agree (D-39).

Funnel rules (`rules/funnel.ts`): step rate = next layer ÷ this layer (null when the base is 0 or
missing); a base under 10 is a small sample and is not compared; change is relative to the same
line a week earlier; the break point is the step with the largest fall of at least 20%. Weekly
totals (`funnelTotals`) feed the Dashboard funnel, the weekly report numbers and the Feedback agent.

## Settings

Derived: `landingPage.status = all four checks ? 'traffic_ready' : 'not_ready'`.

The client's consent to one TEST enquiry is part of the pre-approved scope (`testEnquiry`); every Audit run records it (D-41).

## Weekly loop (D-37)

Rules (`packages/core/src/domain/rules/week.ts`): hours in quarter steps, 0.25–8 per entry, not for a future week or before the campaign; buffer entries need a note; plans only for the current or a coming week and never with verified tasks; a report is sent once, with `done` and `next`, and is not edited after. The source plan's split per campaign week is `SOURCE_HOURS_PLAN` (weeks 1–4, week 5+ repeats week 4).

## Campaign review and AI cost (D-40)

Rules (`rules/review.ts`): full weeks only; under 2 (`MIN_REVIEW_WEEKS`) no scaling; a paid channel under 5 valid leads (`MIN_REVIEW_LEADS`) is not judged; suggestions as in the product spec; FS-23 is checked when the period has 10+ valid leads (`MIN_FUNNEL_BASE`). Sent once; the snapshot's weeks stay the review's weeks afterwards.
AI cost (`rules/ai-cost.ts`) is derived, not stored: runs that started (machine time = finish − start, tokens and model cost from `costEstimate`), factory credits by receipt delivery week, check time = `audit` time entries; the estimate is the average of the full weeks.

## Ad gates (used by Tasks and Dashboard)

- `productFactsConfirmed`: every product-core fact (date, price, seats, inclusions) and the ad's own refs are publicly usable (D-33).
- `landingPageReady`: `settings.landingPage.status === 'traffic_ready'`.
- `creativeApproved`: the linked package or task is approved.
- `budgetAndMonitoringApproved`: a budget cap above 0 for the channel and an out-of-hours alert owner.

All four must be true for `ad_copy`/`ad_change` → `live`, except spend-reducing changes (`spendEffect: 'decrease'`, D-32).
