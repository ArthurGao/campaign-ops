# 00 — Context: the scenario and the rules

This app operationalises a project-management plan for an AI-assisted marketing campaign. The plan is the authority; the app is the tool that makes the plan hard to break.

## Scenario

- Client: a small New Zealand travel agency ("Demo Travel (NZ)" in seed data), selling a guided **China Tour departing March–May 2027** to NZ English-speaking customers, most of them 50+ and travelling as a couple or small group (assumption, to be validated).
- Channels: website conversion, SEO, GEO (visibility in AI search answers), social (Facebook/Instagram, YouTube, TikTok trial; X deferred), paid ads (Google Search non-brand and Meta first).
- Constraints: one PM with about **16 hours per week**; an **existing video factory** (Remotion templates) that takes briefs and returns receipts; price, seats, departure dates, full itinerary, sales target and ad budget are **not confirmed at start**; visa/passport rules must be verified and may change before 2027.
- Three AI agents: **Audit** (looks at the current state), **Outbound** (drafts everything that goes out and checks facts), **Feedback** (reads results and proposes adjustments). They are read-only, produce drafts and suggestions, and never publish or spend.
- Two client approval gates: (1) confirm facts, budget and a pre-approved scope; (2) approve specific versions of content before they go live.

## Vocabulary (Chinese in the source plan → app term)

| Plan | App |
|---|---|
| Fact Sheet 对外页 / 内部页 | Fact Sheet external page / internal page |
| 证据和待办表 | Findings (each with its evidence; entity `Evidence`, route `/evidence`) |
| 任务看板 | Tasks board |
| 可引流 | Landing page status `traffic_ready` |
| P0 / P1 / P2 | Priority P0 / P1 / P2 |
| 发布包 | Publish package |
| 回执 | Factory receipt |
| 有效咨询 | Valid lead (validity = `valid`) |
| 预批范围 | Pre-approved scope |
| 诊断 / 出稿 / 回流 Agent | Audit / Outbound / Feedback agent |

## Rules the app must enforce

R1. **Single source of truth.** Public content may only cite Fact Sheet entries on the external page with status `confirmed` (or `confirmed_with_expiry` not past expiry). Internal page entries (budget, targets, close rate, people per booking) are never exposed to the Outbound agent and never cited publicly.

R2. **Versions bind approvals.** Fact Sheet, briefs, assets, captions and publish packages carry versions. A client approval records the exact versions approved. Any content change creates a new version and returns the item to `awaiting_approval`. Non-substantive edits (typos, punctuation, schedule-time tweaks) may be approved by the PM **only if** the pre-approved scope says so; they still create a new version and record the authorisation.

R3. **Gates before paid traffic.** An ad cannot be `live` unless: product facts confirmed; landing page `traffic_ready` (page confirmed, Lead event fires once, source captured to CRM, lead reaches sales); the ad's assets/copy approved; budget and monitoring responsibility approved (caps, pause conditions, alert owner outside PM hours).

R4. **Agents suggest, humans decide.** Agent outputs are reviewed item by item. Accepting creates evidence/tasks/drafts; rejecting archives. Agents cannot change task status, approvals or settings. Outbound outputs that need unconfirmed facts are flagged `needs_confirmation` and stop.

R5. **No duplicate production or publishing.** Before a brief is sent, the factory queue is checked by `task_id`; `idempotency_key` is used only when the factory declares support. Before publishing, the publish log is checked for the same asset + channel.

R6. **CRM is the only ledger for results.** Each enquiry is one record with a source. Validity (`pending | valid | invalid` + date + reason) is separate from sales stage (`new | contacted | quoted | deposit_paid | lost`). A lead that was valid and later lost still counts as historically valid. Same contact merges; different travel needs stay separate. Paid CPL per channel = channel spend ÷ de-duplicated valid leads attributed to that channel; if the denominator is zero, show "no valid leads yet, spent X" instead of a number.

R7. **Two-week checkpoints, not deadlines.** Adjustments are reviewed at checkpoints considering spend thresholds, sample size and sales cycle. Failures, wrong public information and stop-loss conditions are acted on immediately; insufficient samples do not produce conclusions.

R8. **Daily hard checks are not agent work.** Spend caps and ad disapprovals are handled by platform automated rules; landing page/form availability is checked daily by a named person. The Feedback agent runs twice a week (plus one extra run after major launches or changes).

R9. **Data minimisation.** The Feedback agent receives de-identified CRM exports (no names, emails, phones). No passport or card numbers anywhere in the system.

## What the app is NOT

Not a CMS, not an ad manager, not a video editor, not a replacement for the client's CRM. It coordinates work across those tools and keeps the record of what was decided, by whom, on which version.
