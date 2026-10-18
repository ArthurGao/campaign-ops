// Status enums and other string unions, defined once.
// Single source for the frontend and backend, which import it from @campaign-ops/core (D-05).

export const ROLES = [
  'pm',
  'client_approver',
  'client_decision_maker',
  'sales',
  'executor',
] as const;
export type Role = (typeof ROLES)[number];
export const CLIENT_ROLES = ['client_approver', 'client_decision_maker'] as const;

// Fact Sheet (external / internal page; vocabulary in docs/00-context.md)
export const FACT_STATUSES = [
  'confirmed',
  'pending',
  'assumption',
  'confirmed_with_expiry',
  'superseded',
  'rejected',
] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];
export const FACT_PAGES = ['external', 'internal'] as const;
export type FactPage = (typeof FACT_PAGES)[number];

// Findings (UI name; entity Evidence, D-38)
export const EVIDENCE_SOURCES = [
  'site',
  'tracking',
  'channels',
  'seo',
  'geo',
  'sales',
  'ai_search',
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];
export const BLOCKS = ['none', 'traffic', 'ads', 'measurement'] as const;
export type Blocks = (typeof BLOCKS)[number];
export const PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const EVIDENCE_STATUSES = ['open', 'converted', 'dismissed'] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

// Tasks board
export const TASK_TYPES = [
  'site_change',
  'seo_change',
  'geo_change',
  'social_post',
  'ad_copy',
  'ad_change',
  'video_brief',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const AD_TASK_TYPES = ['ad_copy', 'ad_change'] as const;
export const TASK_STATUSES = [
  'draft',
  'qa',
  'awaiting_approval',
  'approved',
  'live',
  'verified',
  'blocked',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const CHANNELS = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'google_search',
  'meta_ads',
  'website',
] as const;
export type Channel = (typeof CHANNELS)[number];

// Agents: Audit / Outbound / Feedback
export const AGENT_IDS = ['audit', 'outbound', 'feedback'] as const;
export type AgentId = (typeof AGENT_IDS)[number];
export const RUN_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
export const RUN_TRIGGERS = ['manual', 'scheduled', 'after_launch'] as const;
export type RunTrigger = (typeof RUN_TRIGGERS)[number];
export const OUTPUT_TYPES = [
  'evidence',
  'draft',
  'suggestion',
  'needs_confirmation',
  'observation',
  'verification',
] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];
export const DECISION_STATUSES = ['accepted', 'rejected'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export const OUTBOUND_MODES = ['draft', 'qa', 'verify'] as const;
export type OutboundMode = (typeof OUTBOUND_MODES)[number];
export const AUDIT_SCOPES = ['site', 'tracking', 'channels', 'seo', 'geo', 'sales'] as const;
export type AuditScope = (typeof AUDIT_SCOPES)[number];
export const FEEDBACK_SCOPES = ['ads', 'funnel', 'reconciliation', 'leads_quality'] as const;
export type FeedbackScope = (typeof FEEDBACK_SCOPES)[number];

// Video factory: briefs out, receipts in
export const BRIEF_STATUSES = [
  'draft',
  'submitted',
  'accepted',
  'in_production',
  'delivered',
  'qa_passed',
  'qa_returned',
  'cancelled',
] as const;
export type BriefStatus = (typeof BRIEF_STATUSES)[number];
export const RATIOS = ['16:9', '9:16', '4:5', '1:1'] as const;
export type Ratio = (typeof RATIOS)[number];

// Publish packages
export const PACKAGE_STATUSES = [
  'awaiting_approval',
  'approved',
  'scheduled',
  'published',
  'verified',
  'mismatch',
] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export const PUBLISH_ACTIONS = [
  'scheduled',
  'published',
  'verified',
  'mismatch',
  'taken_down',
] as const;
export type PublishAction = (typeof PUBLISH_ACTIONS)[number];

// Leads: a valid lead is validity 'valid'
export const VALIDITIES = ['pending', 'valid', 'invalid'] as const;
export type Validity = (typeof VALIDITIES)[number];
export const STAGES = ['new', 'contacted', 'quoted', 'deposit_paid', 'lost'] as const;
export type Stage = (typeof STAGES)[number];
export const SOURCE_MEDIUMS = [
  'paid_social',
  'paid_search',
  'organic_search',
  'organic_social',
  'lead_ads',
  'email',
  'phone',
  'dm',
  'referral',
  'unknown',
] as const;
export type SourceMedium = (typeof SOURCE_MEDIUMS)[number];
export const AD_RESOLUTIONS = ['captured', 'matched_from_platform', 'unknown'] as const;
export type AdResolution = (typeof AD_RESOLUTIONS)[number];

// Reconciliation
export const RECON_CHANNELS = [
  'google_search',
  'meta_ads',
  'organic_search',
  'organic_social',
  'tiktok',
  'direct',
] as const;
export type ReconChannel = (typeof RECON_CHANNELS)[number];
export const PAID_RECON_CHANNELS = ['google_search', 'meta_ads', 'tiktok'] as const;
/** Funnel steps between the four layers: impressions → visits → valid leads → deposits. */
export const FUNNEL_STEPS = ['click', 'enquiry', 'booking'] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

// Settings: landing page 'traffic_ready' means ready to receive paid traffic
export const LANDING_PAGE_STATUSES = ['not_ready', 'traffic_ready'] as const;
export type LandingPageStatus = (typeof LANDING_PAGE_STATUSES)[number];

// Weekly loop (source workflow "每周 16 小时怎么花"): the PM's hours by category
export const HOUR_CATEGORIES = [
  'management',
  'audit',
  'site',
  'social',
  'seo_geo',
  'ads',
  'review',
  'buffer',
] as const;
export type HourCategory = (typeof HOUR_CATEGORIES)[number];
export const REPORT_STATUSES = ['draft', 'sent'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
/** Campaign review (week 4, D-40): what to do with each channel next. */
export const REVIEW_DECISIONS = ['scale', 'keep', 'stop', 'wait'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

// Error codes returned in { code, message, hint }
export const ERROR_CODES = [
  'FORBIDDEN',
  'NEEDS_CONFIRMATION',
  'VERSION_MISMATCH',
  'DUPLICATE_BRIEF',
  'DUPLICATE_PUBLISH',
  'AD_GATES_UNMET',
  'PAGE_LOCKED',
  'QA_REQUIRED',
  'APPROVAL_REQUIRED',
  'INVALID_TRANSITION',
  'SCOPE_NOT_AUTHORISED',
  'VALIDATION',
  'NOT_FOUND',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
