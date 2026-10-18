# Demo script — 5 minutes

A click-through of the rules the app enforces. Runs on the standalone frontend (mock API in the
browser, no backend): `pnpm dev`, open http://localhost:5400. Before an audience, open
**Settings › Reset demo data** so the seed is fresh.

The role switcher (top right, “Acting as”) is the whole identity model. Detail panels stay open
while you switch roles. Every refused action says why and who can do it.

Labels in **bold** are the exact on-screen text.

## 0:00 — Where we stand (Dashboard, Workflow)

1. **Workflow** (rail, second item): the ten steps of the plan with where each stands now — step 4
   waits on the client for date, price and seats. Every screen header links back to its steps.
2. **Dashboard**. Read the three questions left to right:
   - *Can we sell it?* — Not yet: FS-04 Departure and FS-15 Price are pending, FS-12 is an assumption.
   - *Can we catch enquiries?* — Not yet: the Lead event fires twice (evidence E-03), so the landing
     page is not traffic-ready.
   - *Can we measure it?* — Yes.
3. Point at **Paid traffic: ad gates** and **Blockers**: E-03 blocks ads, E-07 blocks traffic, and TASK-021 is waiting on FS-04.

> Rule shown: nothing goes out on unconfirmed facts; the dashboard says what is blocked and why.

## 0:40 — An unconfirmed fact blocks a draft (F1)

1. **Agents › Outbound › Run**. Keep mode `draft`, channel `facebook`, spec
   `≤ 80 words, must include departure date, link at end`. **Start run**.
2. The run moves queued → running → completed. The single output is **Needs confirmation**:
   “Departure needed — FS-04 not confirmed”. No draft text was written.
3. **Accept → create blocked task**, then **Created TASK-034 →**.
4. In the task panel, **Unblock** is disabled. Hover it: *Waiting on FS-04: the client must confirm first.*

> Rules shown: agents never write state themselves (a person accepts); unconfirmed facts are unusable.

## 1:30 — The client confirms the fact

1. **Fact Sheet**. On FS-04 the **Confirm** button is disabled for the PM (*Requires:
   client_approver or client_decision_maker*).
2. Switch role to **Client approver**. **Confirm** → Source `Client email, 16 Oct 2026` →
   **Confirm FS-04**. The chip turns green and the version moves to `FS-v1.4`.
3. **History** tab: FS-v1.4 lists TASK-034 and TASK-021 under *Flagged for re-review*.

> Rules shown: confirmation needs a source; every change bumps the Fact Sheet version and flags the work that cites it.

## 2:00 — Draft → QA → approval → scheduled → published → verified

1. Switch back to **PM**. **Agents › Outbound › Run**, **Task (optional)** = TASK-034, **Start run**.
   The draft now cites `[← FS-04]`. **Accept → apply to TASK-034**, open the task: it is back in *Draft*.
2. **Send to QA** → **Record QA…** → tick the four items → **Pass QA and send for client approval**.
3. Switch to **Client approver** → **Approve v1**.
4. Switch to **PM** → **Create publish package** → asset `VID-0031-4x5-v2` → **Create package**.
   The package page shows *Approved: not yet* next to *Current: asset v2 / caption CAP-013-v1*.
5. **Client approver** → **Approve these versions**. **Executor** → **Schedule** (the duplicate
   check passes) → **Mark published…** with any post URL.
6. **PM** → **Record verified** (or run Outbound in `verify` mode and accept the verification).
   The package is *Verified*, and so is TASK-034.

> Rule shown: approval binds the exact asset and caption versions. Bonus: on **PUB-2027CT-011**,
> **Schedule** as Executor is refused with `DUPLICATE_PUBLISH` — the same reel was already
> published on that channel by PUB-2027CT-007.

## 3:15 — Approval binds versions (F4, 20 seconds)

1. **Publish › PUB-2027CT-011** as PM → **Edit caption…** → change one word → **Save new version**.
2. It drops to *Awaiting approval*; the caption shows the diff `CAP-011-v1 → CAP-011-v2`, and
   **Schedule** is disabled for the Executor until the client approves again.

## 3:35 — The ad gate (F5)

1. **Tasks**, open **TASK-030** (Google Search ad) → **Ad gates** tab: *2/4 passed — cannot go live*.
   Red: *Facts* (price and seats still pending — every core product fact must be confirmed) and
   *Landing page*.
2. Switch to **Executor** → **Mark live** → refused with `AD_GATES_UNMET` and the gate strip.
3. Switch to **Client approver** → **Fact Sheet** → **Confirm** FS-15 Price and FS-16 Seats with a
   source (FS-04 was confirmed in F1).
4. Switch to **PM** → **Settings › Landing page** → turn on **Lead event fires once**
   (the developer fixed E-03). The page becomes *Traffic ready*.
5. Back to TASK-030 as **Executor** → *4/4 passed* → **Mark live**.

## 4:15 — Feedback proposes a pause (F3)

1. As **PM**: **Agents › Feedback › Run › Start run**.
2. Outputs: the funnel; reconciliation with *no valid leads yet, spent $240.00* for meta_ads in the
   week of 5 Oct (no CPL is shown); and the suggestion **Pause Meta ad set B** marked
   *Within pre-approved scope*, with its evidence (spend $186.40 in 10 days, 0 valid leads, 3 leads
   invalid with the reason “wants independent travel”).
3. **Accept → ad change (pre-approved)** → the new task is already *Approved* under the
   pre-approved scope signed by Morgan Hale.
4. **Executor** → **Mark live**. A pause reduces spend, so the launch gates do not apply
   (`docs/decisions.md` D-32): stop-loss never waits for pricing.
5. **PM** → **Feedback › Run**, **After launch of** = the new task → **Accept → record match**.
   The task is *Verified*.

## 4:50 — Close

**Leads › Reconciliation**: platform-reported vs CRM valid leads. The CRM is the ledger. Finish on
**De-identified CSV**: the export the Feedback agent receives, with no names, emails, phones or
click ids in it.

---

Every step above is automated in `frontend/e2e/flows.spec.ts` (`pnpm -C frontend e2e`).
