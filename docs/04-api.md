# 04 — API (mock backend, NestJS)

Base URL `http://localhost:3000`. JSON everywhere. All mutating endpoints read the acting role from header `X-Role: pm | client_approver | client_decision_maker | sales | executor` and `X-Actor-Name` (defaults to a seeded name per role). Missing permission → `403 { code: 'FORBIDDEN', message, hint: 'Requires: client_approver' }`. Blocked by invariant → `409 { code, message, hint }`. Swagger at `/api/docs`.

Error codes used by the UI: `FORBIDDEN`, `NEEDS_CONFIRMATION`, `VERSION_MISMATCH`, `DUPLICATE_BRIEF`, `DUPLICATE_PUBLISH`, `AD_GATES_UNMET` (payload includes `gates: AdGates`), `PAGE_LOCKED`, `QA_REQUIRED`, `APPROVAL_REQUIRED`, `INVALID_TRANSITION`, `SCOPE_NOT_AUTHORISED`.

## Dashboard
- `GET /dashboard` → `{ threeQuestions: {...}, funnel: ReconSummary, blockers: (EvidenceItem|Task)[], awaitingApprovalCount, nextCheckpoint, hoursThisWeek: { used, cap: 16 } }`

## Fact Sheet
- `GET /fact-sheet?page=external|internal` → `FactEntry[]` + `{ version }`
- `GET /fact-sheet/external` → external entries only (the Outbound reader uses this; internal never included — test it)
- `GET /fact-sheet/versions` → `FactSheetVersion[]`
- `GET /fact-sheet/:id/usages` → `{ tasks: Task[], briefs: Brief[], packages: PublishPackage[] }`
- `POST /fact-sheet` (pm) → create entry → bumps version
- `PATCH /fact-sheet/:id` (pm) → edit statement/source/expiry → bumps version, flags usages `needsRereview`
- `POST /fact-sheet/:id/confirm` (client roles; pm only for `official` entries and only with `expiresAt` — D-34) `{ source, expiresAt?, publicNote? }` → status `confirmed` / `confirmed_with_expiry`; 409 if `source` empty
- `POST /fact-sheet/:id/reject` (client roles) `{ note }`

## Evidence
- `GET /evidence?source=&blocks=&priority=&status=`
- `POST /evidence` (pm)
- `PATCH /evidence/:id` (pm) — status/priority/owner
- `POST /evidence/:id/convert` (pm) `{ type: TaskType, title?, channel?, pageUrl? }` → creates Task (`draft` or `blocked` if facts unconfirmed), sets evidence `converted`

## Tasks
- `GET /tasks?status=&type=&channel=` → `Task[]`
- `GET /tasks/:id`
- `POST /tasks` (pm)
- `PATCH /tasks/:id` (pm) — body/title/factRefs; recomputes `needsConfirmation`; version bump rules per 02
- `POST /tasks/:id/transition` `{ to: TaskStatus, note?, qa?: QARecord, nonSubstantive?: {...} }` — applies role + invariant checks; 409 with specific code
- `GET /tasks/:id/gates` → `AdGates` (for ad tasks; Dashboard also uses)
- `POST /tasks/:id/create-package` (pm) → PublishPackage from a `social_post`/`ad_copy` task that is `approved` or at least `qa` passed (mirrors the plan: package goes to client for approval)
- `POST /tasks/:id/create-brief` (pm) → prefilled Brief draft from a `video_brief` task

## Agents
- `GET /agents` → 3 cards with permissions, last run, guardrail text
- `GET /agents/runs?agent=&status=` → `AgentRun[]` (newest first)
- `GET /agents/runs/:runId`
- `POST /agents/:agentId/runs` (pm) `{ trigger, inputs }` → `202 { runId }`
- `POST /agents/runs/:runId/outputs/:outputId/decision` (pm) `{ status: 'accepted'|'rejected', note? }` → on accept returns `{ createdType, createdId }`

## Video factory
- `GET /factory/briefs`, `GET /factory/briefs/:id`
- `POST /factory/briefs` (pm) → validates `allowedFacts` all publicly usable else `NEEDS_CONFIRMATION`; checks duplicate by `taskId` else `DUPLICATE_BRIEF`; adds `idempotencyKey` only if `settings.factorySupportsIdempotency`
- `POST /factory/briefs/:id/send` (pm) → status `submitted`; mock factory advances `accepted → in_production → delivered` over ~6 s and attaches a receipt
- `POST /factory/briefs/:id/qa` (pm) `{ passed, checklist, notes }` → `qa_passed` (and linked task → `qa`) or `qa_returned` (new receipt version expected)
- `POST /factory/briefs/:id/cancel` (pm)

## Publish packages
- `GET /packages?status=`, `GET /packages/:id`
- `PATCH /packages/:id` (pm) `{ caption?, asset?, scheduledAt?, nonSubstantive?: boolean }` → version bumps and approval reset per I-P3; if `nonSubstantive` and scope allows → stays approvable by pm
- `POST /packages/:id/approve` (client roles; pm only when `nonSubstantive` flow) `{ note? }` → records approved versions
- `POST /packages/:id/reject` (client roles) `{ note }`
- `POST /packages/:id/schedule` (executor) → I-P2 duplicate check (`DUPLICATE_PUBLISH`), requires `approved`
- `POST /packages/:id/published` (executor) `{ postUrl, at }`
- `POST /packages/:id/verify` (pm) `{ result: 'verified'|'mismatch', note? }`
- `POST /packages/:id/take-down` (pm) `{ note }` → log entry; status stays with a `takenDown: true` flag (add to type)
- `GET /publish-log` → flattened log across packages (used by the duplicate check UI and the Dashboard)

## Leads
- `GET /leads?validity=&stage=&medium=` → `Lead[]`
- `GET /leads/:id`
- `POST /leads` (sales|pm)
- `PATCH /leads/:id` (sales) — validity (+reason, decidedAt set server-side), stage, lostReason, order, owner, firstResponseAt
- `GET /leads/merge-suggestions` → pairs with same email/phone and same travel need
- `POST /leads/:id/merge` (sales) `{ intoId }` → I-L2 enforced
- `GET /leads/export?deidentified=true` → CSV without contact/clickIds (I-L3)
- `GET /reconciliation?weeks=3` → `ReconRow[]` + `{ summary: { byChannel, totals } }`

## Settings
- `GET /settings`
- `PATCH /settings` (pm for most; `preApprovedScope` and `people.approvers` require client roles) → recomputes `landingPage.status`
- `POST /settings/reset-demo` (any) → reloads seed
- `GET /settings/utm-preview?source=&medium=&content=` → rendered link

## Health
- `GET /health` → `{ ok: true, seedVersion }`
