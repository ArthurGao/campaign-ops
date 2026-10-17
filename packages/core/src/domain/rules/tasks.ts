import { AD_TASK_TYPES, CLIENT_ROLES, type Role, type TaskStatus, type TaskType } from '../enums';
import { AppError, forbidden, invalidTransition } from '../errors';
import type { Actor, AdGates, FactEntry, QAChecklistItem, Settings, Task } from '../types';
import { needsConfirmation, needsConfirmationError, unusableRefs } from './facts';
import { GATE_LABELS, unmetGates } from './gates';

/** Transitions a person may request (docs/02-data-model.md). `→ blocked` is system-only. */
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ['qa'],
  qa: ['awaiting_approval'],
  awaiting_approval: ['approved', 'draft'],
  approved: ['live'],
  live: ['verified'],
  verified: [],
  blocked: ['draft'],
};

/** Task types that change a page; only one of them may be live on a page at a time. */
export const PAGE_TASK_TYPES: readonly TaskType[] = ['site_change', 'seo_change', 'geo_change'];

export type QAInput = { passed: boolean; checklist: QAChecklistItem[]; notes?: string };

export type TransitionRequest = { to: TaskStatus; actor: Actor; note?: string; qa?: QAInput };

export type TaskContext = { now: Date; facts: readonly FactEntry[]; settings: Settings; tasks: readonly Task[]; gates?: AdGates };

const isAdTask = (t: Task) => (AD_TASK_TYPES as readonly TaskType[]).includes(t.type);

/** Out-of-scope ad changes need the client decision maker; everything else any client role. */
export function approverRolesFor(task: Task): readonly Role[] {
  return task.type === 'ad_change' ? ['client_decision_maker'] : CLIENT_ROLES;
}

function requireRole(actor: Actor, roles: readonly Role[], action: string): void {
  if (!roles.includes(actor.role)) throw forbidden(action, roles);
}

function requireUsableFacts(task: Task, ctx: TaskContext): void {
  const missing = unusableRefs(task.factRefs, ctx.facts, ctx.now);
  if (missing.length) throw needsConfirmationError(missing, task.id);
}

/** Another page change already live (not yet verified) on the same page. */
export function pageLockConflict(task: Task, tasks: readonly Task[]): Task | undefined {
  if (!task.pageUrl || !PAGE_TASK_TYPES.includes(task.type)) return undefined;
  return tasks.find(
    (t) => t.id !== task.id && t.pageUrl === task.pageUrl && PAGE_TASK_TYPES.includes(t.type) && t.status === 'live',
  );
}

/** Whether the PM may approve a pending non-substantive edit under the signed scope. */
export function scopeAllows(settings: Settings, scopeRef: string | undefined): boolean {
  const scope = settings.preApprovedScope;
  return !!scopeRef && scope.pmMayApproveNonSubstantive && scope.nonSubstantiveList.includes(scopeRef);
}

export function scopeNotAuthorised(scopeRef: string | undefined): AppError {
  return new AppError(
    'SCOPE_NOT_AUTHORISED',
    scopeRef
      ? `"${scopeRef}" is not a non-substantive edit the PM may approve.`
      : 'The pre-approved scope does not let the PM approve edits.',
    'Send it to the client approver, or ask the client to extend the pre-approved scope in Settings.',
  );
}

/** Apply a requested status change. Returns the new task; never mutates the input. */
export function applyTransition(task: Task, req: TransitionRequest, ctx: TaskContext): Task {
  const { to, actor } = req;
  const at = ctx.now.toISOString();
  const from = task.status;

  if (to === 'blocked') {
    throw invalidTransition(from, to, 'Only the system blocks tasks (for example when a fact is unconfirmed).');
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    const allowed = ALLOWED_TRANSITIONS[from];
    throw invalidTransition(from, to, allowed.length ? `From ${from} the next step is ${allowed.join(' or ')}.` : `${from} is final.`);
  }

  switch (`${from}->${to}`) {
    case 'draft->qa': {
      requireRole(actor, ['pm'], 'send a task to QA');
      requireUsableFacts(task, ctx);
      return { ...task, status: 'qa', qa: undefined };
    }

    case 'qa->awaiting_approval': {
      requireRole(actor, ['pm'], 'send a task for approval');
      requireUsableFacts(task, ctx);
      const qa = req.qa ? { ...req.qa, by: actor, at } : task.qa;
      const passed = !!qa && qa.passed && qa.checklist.every((c) => c.ok);
      if (!passed) {
        const failed = qa?.checklist.filter((c) => !c.ok).map((c) => c.item) ?? [];
        throw new AppError(
          'QA_REQUIRED',
          `${task.id} has not passed QA.`,
          failed.length ? `Unticked: ${failed.join('; ')}` : 'Complete the QA checklist first.',
        );
      }
      return { ...task, status: 'awaiting_approval', qa };
    }

    case 'awaiting_approval->approved': {
      if (actor.role === 'pm') {
        const pending = task.pendingNonSubstantive;
        if (!pending) throw forbidden('approve this task', approverRolesFor(task));
        if (!scopeAllows(ctx.settings, pending.scopeRef)) throw scopeNotAuthorised(pending.scopeRef);
        requireUsableFacts(task, ctx);
        return {
          ...task,
          status: 'approved',
          needsRereview: false,
          pendingNonSubstantive: undefined,
          approval: {
            approver: actor,
            at,
            status: 'approved',
            approvedVersion: task.version,
            ...(req.note ? { note: req.note } : {}),
            nonSubstantive: { authorisedBy: ctx.settings.preApprovedScope.signedBy, scopeRef: pending.scopeRef },
          },
        };
      }
      requireRole(actor, approverRolesFor(task), 'approve this task');
      requireUsableFacts(task, ctx);
      return {
        ...task,
        status: 'approved',
        needsRereview: false,
        pendingNonSubstantive: undefined,
        approval: { approver: actor, at, status: 'approved', approvedVersion: task.version, ...(req.note ? { note: req.note } : {}) },
      };
    }

    case 'awaiting_approval->draft': {
      requireRole(actor, approverRolesFor(task), 'reject this task');
      if (!req.note?.trim()) {
        throw new AppError('VALIDATION', 'A rejection needs a note.', 'Say what must change before it comes back.');
      }
      return {
        ...task,
        status: 'draft',
        qa: undefined,
        pendingNonSubstantive: undefined,
        approval: { approver: actor, at, status: 'rejected', approvedVersion: task.version, note: req.note },
      };
    }

    case 'approved->live': {
      requireRole(actor, ['executor'], 'mark a task live');
      const approval = task.approval;
      if (approval?.status !== 'approved' || approval.approvedVersion !== task.version) {
        throw new AppError(
          'APPROVAL_REQUIRED',
          `${task.id} v${task.version} has no approval for this version.`,
          approval ? `Approved version: v${approval.approvedVersion}.` : 'Send it for client approval.',
        );
      }
      if (isAdTask(task)) {
        const gates = ctx.gates;
        if (!gates) throw new Error('Ad gates must be computed for ad tasks');
        const unmet = unmetGates(gates);
        if (unmet.length) {
          throw new AppError(
            'AD_GATES_UNMET',
            `${task.id} cannot go live: ${unmet.length} of 4 ad gates unmet.`,
            `Unmet: ${unmet.map((k) => GATE_LABELS[k]).join('; ')}`,
            409,
            { gates },
          );
        }
      }
      const lock = pageLockConflict(task, ctx.tasks);
      if (lock) {
        throw new AppError(
          'PAGE_LOCKED',
          `${task.pageUrl} already has a live change (${lock.id}).`,
          `Verify ${lock.id} before another change goes live on this page.`,
        );
      }
      return { ...task, status: 'live' };
    }

    case 'live->verified': {
      requireRole(actor, ['pm'], 'mark a task verified');
      if (task.verification?.result !== 'match') {
        throw new AppError(
          'INVALID_TRANSITION',
          `${task.id} has no accepted verification.`,
          'Run Outbound (verify) or Feedback (after launch) and accept a matching verification output.',
        );
      }
      return { ...task, status: 'verified' };
    }

    case 'blocked->draft': {
      requireRole(actor, ['pm'], 'unblock a task');
      if (task.blockedReason?.startsWith('needs_confirmation')) requireUsableFacts(task, ctx);
      return {
        ...task,
        status: 'draft',
        blockedReason: undefined,
        needsConfirmation: needsConfirmation(task.factRefs, ctx.facts, ctx.now),
      };
    }
  }
  throw invalidTransition(from, to);
}

export type TaskEdit = {
  title?: string;
  body?: string;
  factRefs?: string[];
  owner?: string;
  needsRereview?: false;
  nonSubstantive?: { scopeRef: string };
};

/**
 * Edit rules: content edits on approved / awaiting_approval bump the version and reset approval
 * (optionally marked non-substantive, D-19); edits in QA clear the QA record; live work is frozen.
 */
export function applyEdit(task: Task, edit: TaskEdit, actor: Actor, ctx: Pick<TaskContext, 'now' | 'facts' | 'settings'>): Task {
  const contentChanged =
    (edit.title !== undefined && edit.title !== task.title) ||
    (edit.body !== undefined && edit.body !== task.body) ||
    (edit.factRefs !== undefined && edit.factRefs.join() !== task.factRefs.join());

  if (contentChanged && (task.status === 'live' || task.status === 'verified')) {
    throw new AppError('INVALID_TRANSITION', `${task.id} is ${task.status}; its content is frozen.`, 'Create a follow-up task for further changes.');
  }
  if (edit.nonSubstantive && !scopeAllows(ctx.settings, edit.nonSubstantive.scopeRef)) {
    throw scopeNotAuthorised(edit.nonSubstantive.scopeRef);
  }

  let next: Task = {
    ...task,
    ...(edit.title !== undefined ? { title: edit.title } : {}),
    ...(edit.body !== undefined ? { body: edit.body } : {}),
    ...(edit.factRefs !== undefined ? { factRefs: [...edit.factRefs] } : {}),
    ...(edit.owner !== undefined ? { owner: edit.owner } : {}),
    ...(edit.needsRereview === false ? { needsRereview: false } : {}),
  };
  next.needsConfirmation = needsConfirmation(next.factRefs, ctx.facts, ctx.now);

  if (contentChanged && (task.status === 'approved' || task.status === 'awaiting_approval')) {
    next = {
      ...next,
      version: task.version + 1,
      status: 'awaiting_approval',
      approval: undefined,
      pendingNonSubstantive: edit.nonSubstantive
        ? { scopeRef: edit.nonSubstantive.scopeRef, markedBy: actor, at: ctx.now.toISOString() }
        : undefined,
    };
  } else if (contentChanged && task.status === 'qa') {
    next = { ...next, qa: undefined };
  }
  return next;
}

/** System transition: any → blocked with a reason. */
export function blockTask(task: Task, reason: string): Task {
  return { ...task, status: 'blocked', blockedReason: reason };
}

export function needsConfirmationReason(factIds: readonly string[]): string {
  return `needs_confirmation: ${factIds.join(', ')}`;
}
