// Entities from docs/02-data-model.md (plus the additions recorded in docs/decisions.md).
// Copied verbatim to frontend/src/types/ by `pnpm sync-types` — never edit the copy.
import type {
  AdResolution,
  AgentId,
  ApprovalStatus,
  Blocks,
  BriefStatus,
  Channel,
  DecisionStatus,
  ErrorCode,
  EvidenceSource,
  EvidenceStatus,
  FactPage,
  FactStatus,
  FunnelStep,
  HourCategory,
  LandingPageStatus,
  OutputType,
  PackageStatus,
  Priority,
  PublishAction,
  Ratio,
  ReconChannel,
  ReportStatus,
  ReviewDecision,
  Role,
  RunStatus,
  RunTrigger,
  SourceMedium,
  Stage,
  TaskStatus,
  TaskType,
  Validity,
} from './enums';

export type Actor = { role: Role; name: string };
export type AuditEvent = {
  at: string;
  actor: Actor;
  action: string;
  detail?: string;
  reason?: string;
};

/** Every entity carries timestamps and its own history list. */
export type Tracked = { createdAt: string; updatedAt: string; events: AuditEvent[] };

export type ApiErrorBody = { code: ErrorCode; message: string; hint?: string; gates?: AdGates };

// ---------------------------------------------------------------- Fact Sheet

export type FactEntry = Tracked & {
  id: string; // 'FS-04'
  page: FactPage;
  label: string; // short name, e.g. 'Departure'
  statement: string; // 'Departure: March 2027 [date TBC]'
  status: FactStatus;
  source?: string;
  confirmedBy?: Actor;
  confirmedAt?: string;
  expiresAt?: string; // only for confirmed_with_expiry
  publicNote?: string;
  purpose?: string; // internal page only
  supersededBy?: string;
  rejectedNote?: string;
  /** Core product fact (date, price, seats, inclusions): every one must be usable before any ad launches. */
  productCore?: boolean;
  /** Verified from an official source (visa, entry rules): the PM may confirm it, with an expiry. */
  official?: boolean;
};

export type FactChange = { factId: string; before?: Partial<FactEntry>; after: Partial<FactEntry> };

export type FactSheetVersion = {
  version: string; // 'FS-v1.3'
  at: string;
  actor: Actor;
  changes: FactChange[];
  /** Items flagged needsRereview by this version (I-F3). */
  affected: { kind: 'task' | 'package' | 'brief'; id: string }[];
};

/** Public-facing view of an entry plus its derived usability. */
export type FactView = FactEntry & { publiclyUsable: boolean; expiringSoon: boolean };

export type FactUsages = { tasks: Task[]; briefs: Brief[]; packages: PublishPackage[] };

// ---------------------------------------------------------------- Evidence

export type ProofLink = { label: string; url?: string };

export type EvidenceItem = Tracked & {
  id: string; // 'E-03'
  source: EvidenceSource;
  finding: string;
  proof: ProofLink[];
  impact: string;
  blocks: Blocks;
  priority: Priority;
  suggestedOwner: string;
  needsApproval: boolean;
  status: EvidenceStatus;
  convertedTaskId?: string;
  originRunId?: string;
  isExample?: boolean;
};

// ---------------------------------------------------------------- Tasks

export type QAChecklistItem = { item: string; ok: boolean };
export type QARecord = {
  by: Actor;
  at: string;
  passed: boolean;
  notes?: string;
  checklist: QAChecklistItem[];
};

export type NonSubstantiveAuth = { authorisedBy: string; scopeRef: string };
export type PreApprovedAuth = { scopeRef: string; authorisedBy: string };
export type PendingNonSubstantive = { scopeRef: string; markedBy: Actor; at: string };

export type ApprovalRecord = {
  approver: Actor;
  at: string;
  status: 'approved' | 'rejected';
  approvedVersion: number;
  note?: string;
  nonSubstantive?: NonSubstantiveAuth;
  preApproved?: PreApprovedAuth;
};

export type VerificationRecord = {
  result: 'match' | 'mismatch';
  runId: string;
  outputId: string;
  at: string;
  by: Actor;
  note?: string;
};

export type Task = Tracked & {
  id: string; // 'TASK-021'
  type: TaskType;
  title: string;
  channel?: Channel;
  status: TaskStatus;
  blockedReason?: string;
  owner: string;
  factRefs: string[];
  needsConfirmation: boolean;
  needsRereview: boolean;
  version: number;
  body?: string;
  qa?: QARecord;
  approval?: ApprovalRecord;
  pendingNonSubstantive?: PendingNonSubstantive;
  verification?: VerificationRecord;
  pageUrl?: string;
  linkedPackageId?: string;
  linkedBriefId?: string;
  originRunId?: string;
  originEvidenceId?: string;
  /** D-32: 'decrease' (pause, cut) changes go live without the launch gates. */
  spendEffect?: 'increase' | 'decrease';
};

// ---------------------------------------------------------------- Agents

export type OutputProposal =
  | {
      kind: 'evidence';
      evidence: Pick<
        EvidenceItem,
        | 'source'
        | 'finding'
        | 'proof'
        | 'impact'
        | 'blocks'
        | 'priority'
        | 'suggestedOwner'
        | 'needsApproval'
      >;
    }
  | {
      kind: 'task';
      task: {
        type: TaskType;
        title: string;
        channel?: Channel;
        body?: string;
        factRefs: string[];
        taskId?: string;
        spendEffect?: 'increase' | 'decrease';
      };
      scopeRef?: string;
    }
  | {
      kind: 'needs_confirmation';
      factIds: string[];
      title: string;
      type: TaskType;
      channel?: Channel;
      taskId?: string;
    }
  | {
      kind: 'verification';
      target: 'task' | 'package';
      targetId: string;
      result: 'match' | 'mismatch';
      diff?: string[];
    };

export type OutputDecision = {
  status: DecisionStatus;
  by: Actor;
  at: string;
  note?: string;
  createdId?: string;
  createdType?: 'evidence' | 'task' | 'package' | 'none';
};

export type AgentOutput = {
  id: string; // 'RUN-0007-O1'
  type: OutputType;
  title: string;
  body: string;
  factRefs?: string[];
  evidence?: ProofLink[];
  inScope?: boolean;
  immediate?: boolean;
  approverRole?: Role;
  proposal?: OutputProposal;
  decision?: OutputDecision;
};

export type AgentRun = Tracked & {
  id: string; // 'RUN-0007'
  agent: AgentId;
  trigger: RunTrigger;
  inputs: Record<string, unknown>;
  factSheetVersion?: string;
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  costEstimate?: { tokens: number; usd: number };
  error?: string;
  outputs: AgentOutput[];
  requestedBy: Actor;
};

export type AgentCard = {
  id: AgentId;
  name: string;
  role: string;
  reads: string[];
  permissions: string[];
  guardrail: string;
  lastRun?: Pick<AgentRun, 'id' | 'status' | 'startedAt' | 'finishedAt'>;
};

// ---------------------------------------------------------------- Video factory

export type Deliverable = { channel: string; ratio: Ratio };

export type ReceiptAsset = {
  assetId: string;
  ratio: string;
  durationSec: number;
  url: string;
  checksum: string;
};

export type Receipt = {
  version: string; // 'v1'
  deliveredAt: string;
  assets: ReceiptAsset[];
  factsUsed: string[];
  musicLicense: { status: 'licensed' | 'missing'; proof?: string };
  creditsUsed: number;
  renderAttempts: number;
  issues: string[];
};

export type BriefQA = QARecord & { receiptVersion: string; reviewerName?: string };

export type Brief = Tracked & {
  id: string; // 'SOC-2027CT-003'
  taskId: string;
  idempotencyKey?: string;
  campaign: string;
  objective: string;
  marketLanguage: string;
  factSheetVersion: string;
  allowedFacts: string[];
  forbidden: string[];
  deliverables: Deliverable[];
  requirements: string[];
  deadline: string;
  costCap: { maxRerenders: number; maxCredits: number };
  approver: string;
  status: BriefStatus;
  version: number;
  receipts: Receipt[];
  qa?: BriefQA;
  needsRereview: boolean;
  returnNotes: { version: number; note: string; at: string }[];
};

export type BriefDraft = Omit<
  Brief,
  keyof Tracked | 'id' | 'status' | 'version' | 'receipts' | 'needsRereview' | 'returnNotes'
>;

// ---------------------------------------------------------------- Publish packages

export type PackageAsset = { assetId: string; version: string; url: string; checksum: string };
export type PackageCaption = { version: string; text: string };

export type PackageApproval = {
  approver?: Actor;
  status: ApprovalStatus;
  at?: string;
  approvedAssetVersion?: string;
  approvedCaptionVersion?: string;
  note?: string;
  nonSubstantive?: NonSubstantiveAuth;
};

export type PublishLogEntry = {
  at: string;
  actor: Actor;
  action: PublishAction;
  postUrl?: string;
  note?: string;
};

export type PublishPackage = Tracked & {
  id: string; // 'PUB-2027CT-012'
  sourceTaskId: string;
  sourceBriefId?: string;
  channel: string; // 'facebook_feed'
  account: string;
  asset?: PackageAsset;
  caption: PackageCaption;
  /** Every caption version ever written, oldest first; used for diffs. */
  captionHistory: (PackageCaption & { at: string })[];
  assetHistory: (PackageAsset & { at: string })[];
  link: string;
  factRefs: string[];
  factSheetVersion: string;
  scheduledAt: string;
  qa: QARecord;
  approval: PackageApproval;
  pendingNonSubstantive?: PendingNonSubstantive;
  executor: string;
  status: PackageStatus;
  publishLog: PublishLogEntry[];
  takenDown: boolean;
  needsConfirmation: boolean;
  needsRereview: boolean;
  verificationNote?: string;
};

export type PublishLogRow = PublishLogEntry & {
  packageId: string;
  channel: string;
  assetId?: string;
};

// ---------------------------------------------------------------- Leads

export type Lead = Tracked & {
  id: string; // 'L-0012'
  receivedAt: string;
  contact: { name: string; email?: string; phone?: string };
  enquiry: { tour: string; travelDate?: string; people?: number; notes?: string };
  source: {
    utmSource?: string;
    utmMedium?: SourceMedium;
    utmCampaign?: string;
    channelLabel: string;
  };
  adDetail: {
    campaignId?: string;
    adId?: string;
    utmContent?: string;
    utmTerm?: string;
    landingPageVersion?: string;
    resolution: AdResolution;
  };
  clickIds: { gclid?: string; fbclid?: string; ttclid?: string };
  selfReportedSource?: string;
  firstResponseAt?: string;
  owner: string;
  validity: { value: Validity; decidedAt?: string; reason?: string };
  /** I-L1: true once validity was ever 'valid'; never reset. */
  everValid: boolean;
  stage: Stage;
  lostReason?: string;
  order?: { tour: string; people: number; amountCents?: number };
  mergedFrom?: string[];
  mergedInto?: string;
  relatedLeadIds?: string[];
};

export type MergeSuggestion = {
  leadId: string;
  intoId: string;
  matchedOn: ('email' | 'phone')[];
  tour: string;
  travelDate?: string;
};

// ---------------------------------------------------------------- Reconciliation

export type ReconRow = {
  weekStart: string;
  channel: ReconChannel;
  spendCents: number;
  platformReportedConversions: number;
  crmValidLeads: number;
  /** null when spend > 0 and no valid leads; undefined when the channel has no spend. */
  paidCpl?: number | null;
  overReportRatio?: number | null;
};

export type ReconChannelSummary = {
  channel: ReconChannel;
  spendCents: number;
  platformReportedConversions: number;
  crmValidLeads: number;
  paidCpl?: number | null;
  overReportRatio?: number | null;
};

export type ReconResponse = {
  rows: ReconRow[];
  summary: { byChannel: ReconChannelSummary[]; totals: Omit<ReconChannelSummary, 'channel'> };
};

export type FunnelWeek = {
  weekStart: string;
  impressions: number;
  visits: number;
  validLeads: number;
  deposits: number;
};

/** One channel's week by funnel layer. impressions is null where nothing is shown (direct). */
export type FunnelRow = {
  weekStart: string;
  channel: ReconChannel;
  impressions: number | null;
  visits: number;
  validLeads: number;
  deposits: number;
};

export type FunnelCounts = Omit<FunnelRow, 'weekStart' | 'channel'>;

/** rate = next layer ÷ this layer; change is relative to the week before (−0.4 = 40% lower). */
export type FunnelStepView = {
  rate: number | null;
  lowSample: boolean;
  change: number | null;
  /** The rate fell enough against the week before to be a break point candidate. */
  fell: boolean;
};

export type FunnelLine = FunnelCounts & {
  steps: Record<FunnelStep, FunnelStepView>;
  /** The step whose rate fell most against the week before, when it fell enough to matter. */
  breakPoint: FunnelStep | null;
};

export type FunnelWeekView = {
  weekStart: string;
  total: FunnelLine;
  channels: (FunnelLine & { channel: ReconChannel })[];
};

export type FunnelResponse = { weeks: FunnelWeekView[] };

// ---------------------------------------------------------------- Settings

export type LandingPageChecks = {
  factsConfirmed: boolean;
  leadFiresOnce: boolean;
  sourceCaptured: boolean;
  reachesSales: boolean;
};

export type Settings = {
  campaign: { client: string; name: string; promotionWindow: string; startDate: string };
  preApprovedScope: {
    budgetCapCentsByChannel: Record<string, number>;
    pauseConditions: string[];
    allowedAssetScope: string;
    pmMayApproveNonSubstantive: boolean;
    nonSubstantiveList: string[];
    signedBy: string;
    signedAt: string;
  };
  people: {
    pm: string;
    approvers: Record<string, string>;
    decisionMaker: string;
    alertOwnerOutsideHours: { name: string; contact: string; responseMinutes: number };
    executors: string[];
    sales: string[];
    landingPageDailyOwner: string;
  };
  utmTemplate: string;
  prohibitedWords: string[];
  landingPage: { url: string; checks: LandingPageChecks; status: LandingPageStatus };
  factorySupportsIdempotency: boolean;
  checkpointEveryDays: 14;
  events: AuditEvent[];
};

// ---------------------------------------------------------------- Ad gates

export type AdGates = {
  productFactsConfirmed: boolean;
  landingPageReady: boolean;
  creativeApproved: boolean;
  budgetAndMonitoringApproved: boolean;
};

// ---------------------------------------------------------------- Dashboard

export type OpsStatus = {
  tracking: {
    ga4: boolean;
    gtm: boolean;
    metaPixel: boolean;
    utmCaptured: boolean;
    crmConnected: boolean;
  };
  lastTestEnquiry?: { at: string; responseMinutes: number };
};

// ---------------------------------------------------------------- Weekly loop

/** Weeks are named by their Monday in Pacific/Auckland: '2026-10-12'. */
export type WeekId = string;

export type TimeEntry = {
  id: string; // 'TIME-0001'
  week: WeekId;
  date: string; // '2026-10-14' (Pacific/Auckland)
  category: HourCategory;
  hours: number;
  note?: string;
  actor: Actor;
  createdAt: string;
};

export type WeekPlan = Tracked & {
  week: WeekId;
  /** Tasks picked from the board for this week, in the PM's order. */
  taskIds: string[];
};

export type ReportNumbers = {
  visits?: number;
  validLeads?: number;
  deposits?: number;
  paid: { channel: string; spendCents: number; validLeads: number; cplText: string }[];
};

/** The one-page weekly report to the client: done, blocked, next (one line per item). */
export type WeeklyReport = Tracked & {
  id: string; // 'WR-2026-10-12'
  week: WeekId;
  status: ReportStatus;
  done: string;
  blocked: string;
  next: string;
  /** Snapshot taken when the report is sent. */
  numbers?: ReportNumbers;
  sentAt?: string;
  sentBy?: Actor;
};

export type HoursSummary = {
  cap: number;
  /** Source plan for this campaign week, by category (buffer included). */
  planned: Record<HourCategory, number>;
  used: Record<HourCategory, number>;
  total: number;
  plannedTotal: number;
  remaining: number;
  overCap: boolean;
};

export type PlanItemView = {
  taskId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  owner: string;
  /** Why it cannot move now, if anything stops it. */
  blocker?: string;
  done: boolean;
};

export type ReportDraft = { done: string[]; blocked: string[]; next: string[] };

export type WeekView = {
  week: WeekId;
  number: number;
  isCurrent: boolean;
  /** Past weeks are read-only for plans and hours. */
  isPast: boolean;
  plan: PlanItemView[];
  hours: HoursSummary;
  entries: TimeEntry[];
  report?: WeeklyReport;
  /** Suggested lines from the week's data; the PM edits them into the report. */
  draft: ReportDraft;
  numbers: ReportNumbers;
};

export type WeekSummary = {
  week: WeekId;
  number: number;
  isCurrent: boolean;
  reportStatus?: ReportStatus;
};

export type DashboardResponse = {
  threeQuestions: {
    canSell: {
      usable: number;
      total: number;
      pending: { id: string; label: string; status: FactStatus }[];
    };
    canCatch: {
      landingPageStatus: LandingPageStatus;
      checks: LandingPageChecks;
      lastTestEnquiry?: OpsStatus['lastTestEnquiry'];
    };
    canMeasure: OpsStatus['tracking'];
  };
  funnel: { thisWeek: FunnelWeek; lastWeek: FunnelWeek };
  blockers: ({ kind: 'evidence'; item: EvidenceItem } | { kind: 'task'; item: Task })[];
  awaitingApprovalCount: number;
  awaitingApproval: { tasks: number; packages: number };
  nextCheckpoint: string;
  hoursThisWeek: { used: number; cap: number };
  /** This week's client report, if one has been started (D-37). */
  reportThisWeek?: ReportStatus;
  now: string;
  factSheetVersion: string;
};

export type DecisionResult = {
  createdType: OutputDecision['createdType'];
  createdId?: string;
  run: AgentRun;
};

// ---------------------------------------------------------------- Campaign review (D-40)

/** One channel over the review weeks; `suggestion` is the rule's call, the PM decides. */
export type ReviewChannelNumbers = {
  spendCents: number;
  visits: number;
  validLeads: number;
  deposits: number;
  platformReportedConversions: number;
  /** As in reconciliation: undefined = no spend, null = spend and no valid leads. */
  paidCpl?: number | null;
  overReportRatio?: number | null;
};

export type ReviewChannelView = ReviewChannelNumbers & {
  channel: ReconChannel;
  /** Break point in the last review week, against the week before. */
  breakPoint: FunnelStep | null;
  suggestion: ReviewDecision;
  reason: string;
};

/** Source: replace the close-rate assumption with the real rate once the sample is big enough. */
export type AssumptionCheck = {
  factId: string;
  statement: string;
  validLeads: number;
  deposits: number;
  rate: number | null;
  enough: boolean;
};

export type ReviewChannelDecision = {
  channel: ReconChannel;
  decision: ReviewDecision;
  note: string;
};

/** What the client was sent: the sent review shows these, not numbers recomputed later. */
export type ReviewNumbers = Pick<ReviewView, 'weeks' | 'channels' | 'totals' | 'assumption'>;

/** The one-page review to the client: per channel what to scale, keep, stop or wait on. */
export type CampaignReview = Tracked & {
  id: string; // 'REV-1'
  status: ReportStatus;
  decisions: ReviewChannelDecision[];
  nextPhase: string;
  /** Snapshot taken when the review is sent. */
  numbers?: ReviewNumbers;
  sentAt?: string;
  sentBy?: Actor;
};

export type ReviewView = {
  /** Full weeks only (the current week is still running), oldest first. */
  weeks: string[];
  /** False with under two full weeks: only small changes and stop-losses (source). */
  bigCallsAllowed: boolean;
  channels: ReviewChannelView[];
  totals: { spendCents: number; validLeads: number; deposits: number; paidCpl?: number | null };
  assumption: AssumptionCheck;
  /** Pre-approved spend caps per channel; scaling above one needs the client. */
  budgetCapCents: Record<string, number>;
  review?: CampaignReview;
};

// ---------------------------------------------------------------- AI cost (D-40)

export type AiCostLine = {
  runs: number;
  /** Machine time from run start to finish. */
  machineMinutes: number;
  tokens: number;
  usd: number;
};

export type AiCostWeek = AiCostLine & {
  week: WeekId;
  /** Video factory credits on receipts delivered that week. */
  factoryCredits: number;
  /** PM hours logged as "Audit and AI checks". */
  checkHours: number;
};

export type AiCostView = {
  weeks: AiCostWeek[];
  byAgent: (AiCostLine & { agent: AgentId })[];
  factory: { credits: number; capCredits: number; renders: number };
  /** Average of the full weeks: the estimate for the weeks ahead (source: estimate from real data). */
  perWeek: Omit<AiCostWeek, 'week'> | null;
};
