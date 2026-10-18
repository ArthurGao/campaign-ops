// Endpoint table for the in-browser mock API. Mirrors docs/04-api.md and the backend controllers:
// same paths, same endpoint-level roles, same service calls into @campaign-ops/core.
import {
  AppError,
  CLIENT_ROLES,
  FACT_PAGES,
  type Actor,
  type BriefQAInput,
  type ConfirmFactInput,
  type ConvertEvidenceInput,
  type Core,
  type CreateBriefInput,
  type CreateEvidenceInput,
  type CreateFactInput,
  type CreateLeadInput,
  type CreatePackageInput,
  type CreateTaskInput,
  type LogTimeInput,
  type PatchEvidenceInput,
  type PatchFactInput,
  type PatchLeadInput,
  type PatchPackageInput,
  type PatchSettingsInput,
  type PatchTaskInput,
  type Role,
  type SaveReportInput,
  type SaveReviewInput,
  type TransitionInput,
  BRIEF_QA_CHECKLIST,
} from '@campaign-ops/core';

export type RouteContext = {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  actor: Actor;
};

export type Route = {
  method: 'GET' | 'POST' | 'PATCH';
  pattern: string;
  roles?: readonly Role[];
  status?: number;
  /** Response is text (CSV) rather than JSON. */
  text?: boolean;
  handler: (core: Core, ctx: RouteContext) => unknown;
};

const CLIENTS = CLIENT_ROLES;

/** Minimal request validation (the backend uses class-validator DTOs for this). */
function need(body: Record<string, unknown>, ...fields: string[]): void {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length)
    throw new AppError('VALIDATION', `Missing: ${missing.join(', ')}`, undefined, 400);
}

const q = (ctx: RouteContext, key: string) => ctx.query.get(key) || undefined;
const as = <T>(body: Record<string, unknown>) => body as unknown as T;

export const ROUTES: Route[] = [
  {
    method: 'GET',
    pattern: '/health',
    handler: (c) => ({
      ok: true,
      seedVersion: c.store.data.seedVersion,
      now: c.clock.now().toISOString(),
      mode: 'mock',
    }),
  },
  { method: 'GET', pattern: '/dashboard', handler: (c) => c.dashboard.get() },

  // ---- Fact Sheet
  {
    method: 'GET',
    pattern: '/fact-sheet',
    handler: (c, ctx) => {
      const page = q(ctx, 'page');
      if (page && !(FACT_PAGES as readonly string[]).includes(page))
        throw new AppError(
          'VALIDATION',
          `page must be one of ${FACT_PAGES.join(', ')}`,
          undefined,
          400,
        );
      return c.facts.list(page as (typeof FACT_PAGES)[number] | undefined);
    },
  },
  {
    method: 'GET',
    pattern: '/fact-sheet/external',
    handler: (c) => ({ version: c.facts.version(), entries: c.facts.getExternal() }),
  },
  { method: 'GET', pattern: '/fact-sheet/versions', handler: (c) => c.facts.versions() },
  {
    method: 'GET',
    pattern: '/fact-sheet/:id/usages',
    handler: (c, ctx) => c.facts.usages(ctx.params.id),
  },
  {
    method: 'POST',
    pattern: '/fact-sheet',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'page', 'label', 'statement'),
      c.facts.create(as<CreateFactInput>(ctx.body), ctx.actor)
    ),
  },
  {
    method: 'PATCH',
    pattern: '/fact-sheet/:id',
    roles: ['pm'],
    handler: (c, ctx) => c.facts.patch(ctx.params.id, as<PatchFactInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/fact-sheet/:id/confirm',
    // Client roles; the PM only for official-source entries with an expiry (assertMayConfirm).
    roles: [...CLIENTS, 'pm'],
    status: 201,
    handler: (c, ctx) =>
      c.facts.confirm(
        ctx.params.id,
        { ...as<ConfirmFactInput>(ctx.body), source: String(ctx.body.source ?? '') },
        ctx.actor,
      ),
  },
  {
    method: 'POST',
    pattern: '/fact-sheet/:id/reject',
    roles: CLIENTS,
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'note'),
      c.facts.reject(ctx.params.id, String(ctx.body.note), ctx.actor)
    ),
  },

  // ---- Evidence
  {
    method: 'GET',
    pattern: '/evidence',
    handler: (c, ctx) =>
      c.evidence.list({
        source: q(ctx, 'source') as never,
        blocks: q(ctx, 'blocks') as never,
        priority: q(ctx, 'priority') as never,
        status: q(ctx, 'status') as never,
      }),
  },
  { method: 'GET', pattern: '/evidence/:id', handler: (c, ctx) => c.evidence.get(ctx.params.id) },
  {
    method: 'POST',
    pattern: '/evidence',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => c.evidence.create(as<CreateEvidenceInput>(ctx.body), ctx.actor),
  },
  {
    method: 'PATCH',
    pattern: '/evidence/:id',
    roles: ['pm'],
    handler: (c, ctx) =>
      c.evidence.patch(ctx.params.id, as<PatchEvidenceInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/evidence/:id/convert',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'type'),
      c.evidence.convert(ctx.params.id, as<ConvertEvidenceInput>(ctx.body), ctx.actor)
    ),
  },

  // ---- Tasks
  {
    method: 'GET',
    pattern: '/tasks',
    handler: (c, ctx) =>
      c.tasks.list({
        status: q(ctx, 'status') as never,
        type: q(ctx, 'type') as never,
        channel: q(ctx, 'channel') as never,
      }),
  },
  { method: 'GET', pattern: '/tasks/:id', handler: (c, ctx) => c.tasks.get(ctx.params.id) },
  { method: 'GET', pattern: '/tasks/:id/gates', handler: (c, ctx) => c.tasks.gates(ctx.params.id) },
  {
    method: 'POST',
    pattern: '/tasks',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'type', 'title'),
      c.tasks.create(as<CreateTaskInput>(ctx.body), ctx.actor)
    ),
  },
  {
    method: 'PATCH',
    pattern: '/tasks/:id',
    roles: ['pm'],
    handler: (c, ctx) => c.tasks.patch(ctx.params.id, as<PatchTaskInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/tasks/:id/transition',
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'to'),
      c.tasks.transition(ctx.params.id, as<TransitionInput>(ctx.body), ctx.actor)
    ),
  },
  {
    method: 'POST',
    pattern: '/tasks/:id/create-package',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) =>
      c.tasks.createPackage(ctx.params.id, as<CreatePackageInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/tasks/:id/create-brief',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => c.tasks.briefPrefill(ctx.params.id),
  },

  // ---- Agents
  { method: 'GET', pattern: '/agents', handler: (c) => c.agents.cards() },
  { method: 'GET', pattern: '/agents/cost', handler: (c) => c.agents.cost() },
  {
    method: 'GET',
    pattern: '/agents/runs',
    handler: (c, ctx) =>
      c.agents.runs({ agent: q(ctx, 'agent') as never, status: q(ctx, 'status') as never }),
  },
  {
    method: 'GET',
    pattern: '/agents/runs/:runId',
    handler: (c, ctx) => c.agents.run(ctx.params.runId),
  },
  {
    method: 'POST',
    pattern: '/agents/:agentId/runs',
    roles: ['pm'],
    status: 202,
    handler: (c, ctx) =>
      c.agents.start(
        ctx.params.agentId,
        ctx.body.trigger as never,
        (ctx.body.inputs as Record<string, unknown>) ?? {},
        ctx.actor,
      ),
  },
  {
    method: 'POST',
    pattern: '/agents/runs/:runId/outputs/:outputId/decision',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => {
      need(ctx.body, 'status');
      return c.agents.decide(
        ctx.params.runId,
        ctx.params.outputId,
        ctx.body.status as 'accepted' | 'rejected',
        ctx.body.note as string | undefined,
        ctx.actor,
      );
    },
  },

  // ---- Video factory
  { method: 'GET', pattern: '/factory/briefs', handler: (c) => c.factory.list() },
  {
    method: 'GET',
    pattern: '/factory/briefs/:id',
    handler: (c, ctx) => c.factory.get(ctx.params.id),
  },
  { method: 'GET', pattern: '/factory/assets', handler: (c) => c.packages.availableAssets() },
  { method: 'GET', pattern: '/factory/qa-checklist', handler: () => BRIEF_QA_CHECKLIST },
  {
    method: 'POST',
    pattern: '/factory/briefs',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'taskId'),
      c.factory.create(as<CreateBriefInput>(ctx.body), ctx.actor)
    ),
  },
  {
    method: 'POST',
    pattern: '/factory/briefs/:id/send',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => c.factory.send(ctx.params.id, ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/factory/briefs/:id/qa',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => c.factory.qa(ctx.params.id, as<BriefQAInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/factory/briefs/:id/cancel',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) =>
      c.factory.cancel(ctx.params.id, ctx.actor, ctx.body.note as string | undefined),
  },

  // ---- Publish packages
  {
    method: 'GET',
    pattern: '/packages',
    handler: (c, ctx) => c.packages.list(q(ctx, 'status') as never),
  },
  { method: 'GET', pattern: '/packages/:id', handler: (c, ctx) => c.packages.get(ctx.params.id) },
  {
    method: 'PATCH',
    pattern: '/packages/:id',
    roles: ['pm'],
    handler: (c, ctx) =>
      c.packages.patch(ctx.params.id, as<PatchPackageInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/packages/:id/approve',
    status: 201,
    handler: (c, ctx) =>
      c.packages.approve(ctx.params.id, ctx.actor, ctx.body.note as string | undefined),
  },
  {
    method: 'POST',
    pattern: '/packages/:id/reject',
    status: 201,
    handler: (c, ctx) => c.packages.reject(ctx.params.id, ctx.actor, String(ctx.body.note ?? '')),
  },
  {
    method: 'POST',
    pattern: '/packages/:id/schedule',
    status: 201,
    handler: (c, ctx) => c.packages.schedule(ctx.params.id, ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/packages/:id/published',
    status: 201,
    handler: (c, ctx) =>
      c.packages.published(
        ctx.params.id,
        ctx.actor,
        String(ctx.body.postUrl ?? ''),
        ctx.body.at as string | undefined,
      ),
  },
  {
    method: 'POST',
    pattern: '/packages/:id/verify',
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'result'),
      c.packages.verify(
        ctx.params.id,
        ctx.actor,
        ctx.body.result as 'verified' | 'mismatch',
        ctx.body.note as string | undefined,
      )
    ),
  },
  {
    method: 'POST',
    pattern: '/packages/:id/take-down',
    status: 201,
    handler: (c, ctx) => c.packages.takeDown(ctx.params.id, ctx.actor, String(ctx.body.note ?? '')),
  },
  { method: 'GET', pattern: '/publish-log', handler: (c) => c.packages.publishLog() },

  // ---- Leads
  {
    method: 'GET',
    pattern: '/leads',
    handler: (c, ctx) =>
      c.leads.list({
        validity: q(ctx, 'validity') as never,
        stage: q(ctx, 'stage') as never,
        medium: q(ctx, 'medium') as never,
      }),
  },
  {
    method: 'GET',
    pattern: '/leads/merge-suggestions',
    handler: (c) => c.leads.mergeSuggestions(),
  },
  { method: 'GET', pattern: '/leads/export', text: true, handler: (c) => c.leads.exportCsv() },
  { method: 'GET', pattern: '/leads/:id', handler: (c, ctx) => c.leads.get(ctx.params.id) },
  {
    method: 'POST',
    pattern: '/leads',
    roles: ['sales', 'pm'],
    status: 201,
    handler: (c, ctx) => c.leads.create(as<CreateLeadInput>(ctx.body), ctx.actor),
  },
  {
    method: 'PATCH',
    pattern: '/leads/:id',
    roles: ['sales'],
    handler: (c, ctx) => c.leads.patch(ctx.params.id, as<PatchLeadInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/leads/:id/merge',
    roles: ['sales'],
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'intoId'),
      c.leads.merge(ctx.params.id, String(ctx.body.intoId), ctx.actor)
    ),
  },
  {
    method: 'GET',
    pattern: '/reconciliation',
    handler: (c, ctx) => c.recon.get(Number(q(ctx, 'weeks') ?? 3)),
  },
  {
    method: 'GET',
    pattern: '/funnel',
    handler: (c, ctx) => c.recon.funnel(Number(q(ctx, 'weeks') ?? 3)),
  },

  // ---- Settings
  // ---- Campaign review (D-40)
  { method: 'GET', pattern: '/review', handler: (c) => c.review.get() },
  {
    method: 'PATCH',
    pattern: '/review',
    roles: ['pm'],
    handler: (c, ctx) => c.review.save(as<SaveReviewInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/review/send',
    roles: ['pm'],
    handler: (c, ctx) => c.review.send(ctx.actor),
  },

  // ---- Weekly loop (D-37): plan, the PM's 16 hours, the weekly report
  { method: 'GET', pattern: '/weeks', handler: (c) => c.weeks.list() },
  {
    method: 'GET',
    pattern: '/weeks/:week',
    handler: (c, ctx) => c.weeks.get(ctx.params.week),
  },
  {
    method: 'PATCH',
    pattern: '/weeks/:week/plan',
    roles: ['pm'],
    handler: (c, ctx) => {
      if (!Array.isArray(ctx.body.taskIds))
        throw new AppError('VALIDATION', 'taskIds must be a list', undefined, 400);
      return c.weeks.setPlan(ctx.params.week, ctx.body.taskIds.map(String), ctx.actor);
    },
  },
  {
    method: 'POST',
    pattern: '/weeks/:week/time',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => (
      need(ctx.body, 'category', 'hours'),
      c.weeks.logTime(ctx.params.week, as<LogTimeInput>(ctx.body), ctx.actor)
    ),
  },
  {
    method: 'PATCH',
    pattern: '/weeks/:week/report',
    roles: ['pm'],
    handler: (c, ctx) =>
      c.weeks.saveReport(ctx.params.week, as<SaveReportInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/weeks/:week/report/send',
    roles: ['pm'],
    status: 201,
    handler: (c, ctx) => c.weeks.sendReport(ctx.params.week, ctx.actor),
  },

  { method: 'GET', pattern: '/settings', handler: (c) => c.settings.get() },
  {
    method: 'PATCH',
    pattern: '/settings',
    handler: (c, ctx) => c.settings.patch(as<PatchSettingsInput>(ctx.body), ctx.actor),
  },
  {
    method: 'POST',
    pattern: '/settings/reset-demo',
    status: 201,
    handler: (c) => c.settings.resetDemo(),
  },
  {
    method: 'GET',
    pattern: '/settings/utm-preview',
    handler: (c, ctx) =>
      c.settings.utmPreview({
        source: q(ctx, 'source'),
        medium: q(ctx, 'medium'),
        content: q(ctx, 'content'),
      }),
  },
];

/** Match '/tasks/:id/gates' against a concrete path; returns params or null. */
export function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
