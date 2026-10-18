# 02 — Data model

All entities live in memory in phase 1. Define TypeScript types in `backend/src/domain/` and mirror them to `frontend/src/types/`. IDs are human-readable strings. Every entity has `createdAt`, `updatedAt`, and an `events: AuditEvent[]` list (who, when, what changed, reason) for the history drawers.

```ts
type Role = 'pm' | 'client_approver' | 'client_decision_maker' | 'sales' | 'executor';
type Actor = { role: Role; name: string };
type AuditEvent = { at: string; actor: Actor; action: string; detail?: string; reason?: string };
```

## Fact Sheet

```ts
type FactStatus = 'confirmed' | 'pending' | 'assumption' | 'confirmed_with_expiry' | 'superseded' | 'rejected';
type FactPage = 'external' | 'internal';

type FactEntry = {
  id: string;                 // 'FS-04'
  page: FactPage;
  statement: string;          // 'Departure: March 2027 [date TBC]'
  status: FactStatus;
  source?: string;            // document name or URL
  confirmedBy?: Actor;
  confirmedAt?: string;
  expiresAt?: string;         // only for confirmed_with_expiry
  publicNote?: string;        // e.g. 'Must state: subject to official information at departure'
  purpose?: string;           // internal page only, e.g. 'cap on leads to buy'
  supersededBy?: string;      // FS id
};

type FactSheetVersion = {
  version: string;            // 'FS-v1.3'
  at: string;
  actor: Actor;
  changes: { factId: string; before?: Partial<FactEntry>; after: Partial<FactEntry> }[];
};
```

Derived: `isPubliclyUsable(entry, now) = page === 'external' && (status === 'confirmed' || (status === 'confirmed_with_expiry' && expiresAt > now))`.

Invariants
- I-F1: `internal` entries are never returned by the endpoint the Outbound agent reads (`GET /fact-sheet/external`).
- I-F2: any status change bumps the Fact Sheet version and records a `FactSheetVersion`.
- I-F3: a change to a referenced entry marks every referencing Task/Package/Brief with `needsRereview = true`.

## Evidence

```ts
type EvidenceSource = 'site' | 'tracking' | 'channels' | 'seo' | 'geo' | 'sales' | 'ai_search';
type Blocks = 'none' | 'traffic' | 'ads' | 'measurement';
type Priority = 'P0' | 'P1' | 'P2';

type EvidenceItem = {
  id: string;                 // 'E-03'
  source: EvidenceSource;
  finding: string;
  proof: { label: string; url?: string }[];
  impact: string;
  blocks: Blocks;
  priority: Priority;
  suggestedOwner: string;
  needsApproval: boolean;
  status: 'open' | 'converted' | 'dismissed';
  convertedTaskId?: string;
  originRunId?: string;       // if accepted from an agent run
  isExample?: boolean;        // seed flag → UI banner
};
```

## Tasks

```ts
type TaskType = 'site_change' | 'seo_change' | 'geo_change' | 'social_post' | 'ad_copy' | 'ad_change' | 'video_brief';
type TaskStatus = 'draft' | 'qa' | 'awaiting_approval' | 'approved' | 'live' | 'verified' | 'blocked';

type Task = {
  id: string;                 // 'TASK-021'
  type: TaskType;
  title: string;
  channel?: 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'google_search' | 'meta_ads' | 'website';
  status: TaskStatus;
  blockedReason?: string;
  owner: string;
  factRefs: string[];         // FS ids
  needsConfirmation: boolean; // true if any factRef not publicly usable
  needsRereview: boolean;
  version: number;
  body?: string;              // draft text / change description
  qa?: QARecord;
  approval?: ApprovalRecord;
  pageUrl?: string;           // site changes: one task per page at a time
  linkedPackageId?: string;
  linkedBriefId?: string;
  originRunId?: string;
};

type QARecord = { by: Actor; at: string; passed: boolean; notes?: string; checklist: { item: string; ok: boolean }[] };

type ApprovalRecord = {
  approver: Actor;
  at: string;
  status: 'approved' | 'rejected';
  approvedVersion: number;     // task version
  note?: string;
  nonSubstantive?: { authorisedBy: string; scopeRef: string };  // PM-approved minor edits
};
```

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

```ts
type AgentId = 'audit' | 'outbound' | 'feedback';
type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
type OutputType = 'evidence' | 'draft' | 'suggestion' | 'needs_confirmation' | 'observation' | 'verification';

type AgentRun = {
  id: string;                 // 'RUN-0007'
  agent: AgentId;
  trigger: 'manual' | 'scheduled' | 'after_launch';
  inputs: Record<string, unknown>;     // snapshot shown in UI
  factSheetVersion?: string;
  status: RunStatus;
  startedAt?: string; finishedAt?: string;
  costEstimate?: { tokens: number; usd: number };  // mock numbers
  error?: string;
  outputs: AgentOutput[];
};

type AgentOutput = {
  id: string;
  type: OutputType;
  title: string;
  body: string;               // markdown allowed
  factRefs?: string[];
  evidence?: { label: string; url?: string }[];
  inScope?: boolean;          // suggestions: within pre-approved scope?
  decision?: { status: 'accepted' | 'rejected'; by: Actor; at: string; note?: string; createdId?: string };
};
```

Invariants
- I-A1: accepting an output creates exactly one record (EvidenceItem, Task draft, Task `ad_change`, or sets `verified`) and stores `createdId`.
- I-A2: outputs of type `needs_confirmation` can only be accepted into a Task with `status = 'blocked'` and `blockedReason = 'needs_confirmation: <FS ids>'`.
- I-A3: the Outbound agent's input snapshot must only contain external facts (assert in service; test).

## Video factory

```ts
type BriefStatus = 'submitted' | 'accepted' | 'in_production' | 'delivered' | 'qa_passed' | 'qa_returned' | 'cancelled';

type Brief = {
  id: string;                 // 'SOC-2027CT-003'
  taskId: string;
  idempotencyKey?: string;    // only if factory supports it (settings flag)
  campaign: string;
  objective: string;
  marketLanguage: string;     // 'NZ English market; deliver in English; follow client brand guide'
  factSheetVersion: string;
  allowedFacts: string[];     // FS ids, must all be publicly usable at send time
  forbidden: string[];
  deliverables: { channel: string; ratio: '16:9' | '9:16' | '4:5' | '1:1' }[];
  requirements: string[];
  deadline: string;
  costCap: { maxRerenders: number; maxCredits: number };
  approver: string;
  status: BriefStatus;
  version: number;
  receipts: Receipt[];
};

type Receipt = {
  version: string;            // 'v1'
  deliveredAt: string;
  assets: { assetId: string; ratio: string; durationSec: number; url: string; checksum: string }[];
  factsUsed: string[];
  musicLicense: { status: 'licensed' | 'missing'; proof?: string };
  creditsUsed: number;
  renderAttempts: number;
  issues: string[];
};
```

Invariants
- I-V1: sending a brief fails if another non-cancelled brief exists with the same `taskId`.
- I-V2: QA pass requires `factsUsed ⊆ allowedFacts`, license proof present, `creditsUsed ≤ costCap.maxCredits`, and the human checklist item "captions, voice-over and key frames reviewed" ticked with a name.
- I-V3: a returned brief creates a new receipt version; old receipts are kept.

## Publish packages

```ts
type PackageStatus = 'awaiting_approval' | 'approved' | 'scheduled' | 'published' | 'verified' | 'mismatch';

type PublishPackage = {
  id: string;                 // 'PUB-2027CT-012'
  sourceTaskId: string;
  channel: string;            // 'facebook_feed'
  account: string;
  asset: { assetId: string; version: string; url: string; checksum: string };
  caption: { version: string; text: string };
  link: string;               // generated from UTM template; read-only
  factRefs: string[];
  factSheetVersion: string;
  scheduledAt: string;        // ISO with Pacific/Auckland display
  qa: QARecord;
  approval?: { approver: Actor; status: 'pending' | 'approved' | 'rejected'; at?: string; approvedAssetVersion?: string; approvedCaptionVersion?: string; note?: string; nonSubstantive?: ApprovalRecord['nonSubstantive'] };
  executor: string;
  status: PackageStatus;
  publishLog: { at: string; actor: Actor; action: 'scheduled' | 'published' | 'verified' | 'mismatch' | 'taken_down'; postUrl?: string; note?: string }[];
};
```

Invariants
- I-P1: `approved` requires `approval.approvedAssetVersion === asset.version && approvedCaptionVersion === caption.version`.
- I-P2: `scheduled` requires `status === 'approved'` and no `published` log entry for the same `asset.assetId + channel` across all packages.
- I-P3: editing caption or asset after approval resets `approval.status = 'pending'`, `status = 'awaiting_approval'`, bumps the edited version; if `settings.preApprovedScope.pmMayApproveNonSubstantive` and the editor marks the edit non-substantive, the PM may approve with `nonSubstantive` recorded — still a new version.
- I-P4: `verified`/`mismatch` requires a `published` log entry; `mismatch` requires a note.

## Leads (CRM)

```ts
type Validity = 'pending' | 'valid' | 'invalid';
type Stage = 'new' | 'contacted' | 'quoted' | 'deposit_paid' | 'lost';
type SourceMedium = 'paid_social' | 'paid_search' | 'organic_search' | 'organic_social' | 'lead_ads' | 'email' | 'phone' | 'dm' | 'referral' | 'unknown';

type Lead = {
  id: string;                 // 'L-0012'
  receivedAt: string;
  contact: { name: string; email?: string; phone?: string };   // seed uses fake data
  enquiry: { tour: string; travelDate?: string; people?: number; notes?: string };
  source: { utmSource?: string; utmMedium?: SourceMedium; utmCampaign?: string; channelLabel: string };
  adDetail: { campaignId?: string; adId?: string; utmContent?: string; utmTerm?: string; landingPageVersion?: string; resolution: 'captured' | 'matched_from_platform' | 'unknown' };
  clickIds: { gclid?: string; fbclid?: string; ttclid?: string };
  selfReportedSource?: string;
  firstResponseAt?: string;
  owner: string;
  validity: { value: Validity; decidedAt?: string; reason?: string };
  stage: Stage;
  lostReason?: string;
  order?: { tour: string; people: number; amountCents?: number };
  mergedFrom?: string[];      // ids merged into this record
  relatedLeadIds?: string[];  // same contact, different travel need
};
```

Invariants
- I-L1: `valid` once set remains part of "historically valid" counts even if `stage = 'lost'`.
- I-L2: merge is only offered when same email/phone **and** same `enquiry.tour + travelDate`; otherwise records are linked via `relatedLeadIds`.
- I-L3: de-identified export strips `contact` and `clickIds`.

## Reconciliation

```ts
type ReconRow = {
  weekStart: string;
  channel: 'google_search' | 'meta_ads' | 'organic_search' | 'organic_social' | 'tiktok' | 'direct';
  spendCents: number;
  platformReportedConversions: number;
  crmValidLeads: number;      // attributed by the agreed rule (last non-direct click)
  paidCpl?: number | null;    // null when crmValidLeads === 0 and spend > 0 → UI shows message
  overReportRatio?: number;   // platformReported / crmValid
};
```

## Settings

```ts
type Settings = {
  campaign: { client: string; name: string; promotionWindow: string };
  preApprovedScope: {
    budgetCapCentsByChannel: Record<string, number>;
    pauseConditions: string[];
    allowedAssetScope: string;
    pmMayApproveNonSubstantive: boolean;
    nonSubstantiveList: string[];      // ['typos','punctuation','schedule time within same day']
  };
  people: { approvers: Record<string, string>; alertOwnerOutsideHours: { name: string; contact: string; responseMinutes: number }; executors: string[] };
  utmTemplate: string;                 // '{base}?utm_source={source}&utm_medium={medium}&utm_campaign=china_tour_2027&utm_content={content}'
  prohibitedWords: string[];
  landingPage: { url: string; checks: { factsConfirmed: boolean; leadFiresOnce: boolean; sourceCaptured: boolean; reachesSales: boolean }; status: 'not_ready' | 'traffic_ready' };
  factorySupportsIdempotency: boolean;
  checkpointEveryDays: 14;
};
```

Derived: `landingPage.status = all four checks ? 'traffic_ready' : 'not_ready'`.

## Ad gates (used by Tasks and Dashboard)

```ts
type AdGates = {
  productFactsConfirmed: boolean;   // every productCore fact (date, price, seats, inclusions) + the ad's own refs are publicly usable (D-33)
  landingPageReady: boolean;        // settings.landingPage.status === 'traffic_ready'
  creativeApproved: boolean;        // linked package/task approved
  budgetAndMonitoringApproved: boolean; // scope budget cap > 0 for channel AND alertOwnerOutsideHours set
};
```
All four must be true for `ad_copy`/`ad_change` → `live`, except spend-reducing changes (`spendEffect: 'decrease'`, D-32).
