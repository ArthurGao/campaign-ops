// Request shapes accepted by the services. The NestJS DTO classes and the in-browser mock API both
// pass these; they mirror docs/04-api.md.
import type {
  Blocks,
  Channel,
  EvidenceSource,
  EvidenceStatus,
  FactPage,
  Priority,
  Ratio,
  SourceMedium,
  Stage,
  TaskStatus,
  TaskType,
  Validity,
} from '../domain/enums';
import type { ProofLink, QAChecklistItem } from '../domain/types';

/** Drop undefined keys so a partial update never overwrites a value with undefined. */
export function defined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// ---- Fact Sheet
export type CreateFactInput = { page: FactPage; label: string; statement: string; purpose?: string; publicNote?: string };
export type PatchFactInput = {
  label?: string;
  statement?: string;
  source?: string;
  expiresAt?: string;
  publicNote?: string;
  purpose?: string;
};
export type ConfirmFactInput = { source: string; expiresAt?: string; publicNote?: string };

// ---- Evidence
export type CreateEvidenceInput = {
  source: EvidenceSource;
  finding: string;
  proof: ProofLink[];
  impact: string;
  blocks: Blocks;
  priority: Priority;
  suggestedOwner: string;
  needsApproval: boolean;
};
export type PatchEvidenceInput = {
  status?: EvidenceStatus;
  priority?: Priority;
  suggestedOwner?: string;
  blocks?: Blocks;
  reason?: string;
};
export type ConvertEvidenceInput = { type: TaskType; title?: string; channel?: Channel; pageUrl?: string; factRefs?: string[] };

// ---- Tasks
export type CreateTaskInput = {
  type: TaskType;
  title: string;
  channel?: Channel;
  body?: string;
  factRefs?: string[];
  owner?: string;
  pageUrl?: string;
};
export type PatchTaskInput = {
  title?: string;
  body?: string;
  factRefs?: string[];
  owner?: string;
  nonSubstantive?: boolean;
  scopeRef?: string;
  needsRereview?: false;
};
export type TransitionInput = {
  to: TaskStatus;
  note?: string;
  qa?: { passed: boolean; checklist: QAChecklistItem[]; notes?: string };
};

// ---- Packages
export type PatchPackageInput = {
  caption?: string;
  asset?: { assetId: string; url: string; checksum: string };
  scheduledAt?: string;
  nonSubstantive?: boolean;
  scopeRef?: string;
  needsRereview?: false;
};
export type CreatePackageInput = { assetId?: string; channel?: string; scheduledAt?: string };

// ---- Factory
export type CreateBriefInput = {
  taskId: string;
  campaign: string;
  objective: string;
  marketLanguage: string;
  factSheetVersion: string;
  allowedFacts: string[];
  forbidden: string[];
  deliverables: { channel: string; ratio: Ratio }[];
  requirements: string[];
  deadline: string;
  costCap: { maxRerenders: number; maxCredits: number };
  approver: string;
};
export type BriefQAInput = { passed: boolean; checklist: QAChecklistItem[]; notes?: string; reviewerName?: string };

// ---- Leads
export type CreateLeadInput = {
  contact: { name: string; email?: string; phone?: string };
  enquiry: { tour: string; travelDate?: string; people?: number; notes?: string };
  source: { utmSource?: string; utmMedium?: SourceMedium; utmCampaign?: string; channelLabel: string };
  selfReportedSource?: string;
};
export type PatchLeadInput = {
  validity?: Validity;
  validityReason?: string;
  stage?: Stage;
  lostReason?: string;
  owner?: string;
  firstResponseAt?: string;
  order?: { tour: string; people: number } | null;
};

// ---- Settings
export type PatchSettingsInput = {
  preApprovedScope?: {
    budgetCapCentsByChannel?: Record<string, number>;
    pauseConditions?: string[];
    allowedAssetScope?: string;
    pmMayApproveNonSubstantive?: boolean;
    nonSubstantiveList?: string[];
  };
  people?: {
    approvers?: Record<string, string>;
    alertOwnerOutsideHours?: { name: string; contact: string; responseMinutes: number };
    executors?: string[];
    landingPageDailyOwner?: string;
  };
  utmTemplate?: string;
  prohibitedWords?: string[];
  landingPage?: {
    url?: string;
    checks?: { factsConfirmed?: boolean; leadFiresOnce?: boolean; sourceCaptured?: boolean; reachesSales?: boolean };
  };
  factorySupportsIdempotency?: boolean;
};
