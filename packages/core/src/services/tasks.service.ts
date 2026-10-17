import { replaceById, stamp } from '../common/audit';
import { IdService } from '../store/id.service';
import type { Clock } from '../domain/clock';
import { AD_TASK_TYPES, type Channel, type TaskStatus, type TaskType } from '../domain/enums';
import { AppError, notFound } from '../domain/errors';
import { needsConfirmation, unusableRefs } from '../domain/rules/facts';
import { computeAdGates } from '../domain/rules/gates';
import { applyEdit, applyTransition, blockTask, needsConfirmationReason, type TaskContext } from '../domain/rules/tasks';
import type { Actor, AdGates, BriefDraft, PreApprovedAuth, PublishPackage, Task, VerificationRecord } from '../domain/types';
import type { TaskReader } from '../integrations/agents/agent.adapter';
import { BRIEF_DEFAULTS, RATIO_CHANNELS } from '../seed/agents.seed';
import { MemoryStore } from '../store/memory.store';
import type { CreatePackageInput } from './inputs';
import { PackagesService } from './packages.service';
import type { CreateTaskInput, PatchTaskInput, TransitionInput } from './inputs';

export type TaskFilters = { status?: TaskStatus; type?: TaskType; channel?: Channel };

export type NewTask = {
  type: TaskType;
  title: string;
  channel?: Channel;
  body?: string;
  factRefs?: string[];
  owner?: string;
  pageUrl?: string;
  originRunId?: string;
  originEvidenceId?: string;
};

const isAd = (t: Task) => (AD_TASK_TYPES as readonly TaskType[]).includes(t.type);

export class TasksService implements TaskReader {
  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly packages: PackagesService,
    private readonly clock: Clock,
  ) {
    packages.registerHooks({
      // The executor publishing a package puts its approved source task live.
      published: (pkg, actor) => {
        const task = this.find(pkg.sourceTaskId);
        if (task?.status === 'approved') this.save({ ...task, status: 'live' }, actor, 'approved → live', `${pkg.id} published`);
      },
      // A verified package verifies its live source task (D-18).
      verified: (pkg, actor, ref) => {
        const task = this.find(pkg.sourceTaskId);
        if (task?.status === 'live') this.recordVerification(task.id, { result: 'match', ...ref }, actor);
      },
    });
  }

  private get tasks(): Task[] {
    return this.store.data.tasks;
  }

  private ctx(): TaskContext {
    const { facts, settings, tasks } = this.store.data;
    return { now: this.clock.now(), facts, settings, tasks };
  }

  /** needsConfirmation depends on time (expiry) and on fact status: refresh on every read. */
  private refresh(t: Task): Task {
    const flag = needsConfirmation(t.factRefs, this.store.data.facts, this.clock.now());
    return flag === t.needsConfirmation ? t : replaceById(this.tasks, { ...t, needsConfirmation: flag });
  }

  private save(next: Task, actor: Actor, action: string, detail?: string, reason?: string): Task {
    return replaceById(this.tasks, stamp(next, this.clock.now(), actor, action, detail, reason));
  }

  list(f: TaskFilters = {}): Task[] {
    return this.tasks
      .map((t) => this.refresh(t))
      .filter((t) => (!f.status || t.status === f.status) && (!f.type || t.type === f.type) && (!f.channel || t.channel === f.channel));
  }

  find(id: string): Task | undefined {
    const t = this.tasks.find((x) => x.id === id);
    return t && this.refresh(t);
  }

  get(id: string): Task {
    const t = this.find(id);
    if (!t) throw notFound('Task', id);
    return t;
  }

  gates(id: string): AdGates {
    const { facts, settings } = this.store.data;
    return computeAdGates(this.get(id), { facts, settings, now: this.clock.now() });
  }

  /** New tasks start as draft, or blocked when they cite facts that are not publicly usable. */
  createInternal(input: NewTask, actor: Actor, detail?: string): Task {
    const now = this.clock.now();
    const factRefs = input.factRefs ?? [];
    const unusable = unusableRefs(factRefs, this.store.data.facts, now);
    const internal = factRefs.filter((id) => this.store.data.facts.find((f) => f.id === id)?.page === 'internal');
    if (internal.length && input.type !== 'ad_change') {
      throw new AppError('VALIDATION', `Internal facts cannot be cited in outbound work: ${internal.join(', ')}.`, 'Internal entries (budget, targets) never appear publicly.');
    }
    const at = now.toISOString();
    let task: Task = {
      id: this.ids.task(),
      type: input.type,
      title: input.title,
      ...(input.channel ? { channel: input.channel } : {}),
      status: 'draft',
      owner: input.owner ?? this.store.data.settings.people.pm,
      factRefs,
      needsConfirmation: unusable.length > 0,
      needsRereview: false,
      version: 1,
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.pageUrl ? { pageUrl: input.pageUrl } : {}),
      ...(input.originRunId ? { originRunId: input.originRunId } : {}),
      ...(input.originEvidenceId ? { originEvidenceId: input.originEvidenceId } : {}),
      createdAt: at,
      updatedAt: at,
      events: [{ at, actor, action: 'created', ...(detail ? { detail } : {}) }],
    };
    if (unusable.length) task = stamp(blockTask(task, needsConfirmationReason(unusable)), now, actor, '→ blocked', needsConfirmationReason(unusable));
    this.tasks.push(task);
    return task;
  }

  create(dto: CreateTaskInput, actor: Actor): Task {
    return this.createInternal(dto, actor);
  }

  patch(id: string, dto: PatchTaskInput, actor: Actor): Task {
    const before = this.get(id);
    if (dto.nonSubstantive && !dto.scopeRef) {
      throw new AppError('VALIDATION', 'A non-substantive edit needs scopeRef.', 'Pick the kind of edit from the pre-approved list.', 400);
    }
    const next = applyEdit(
      before,
      {
        title: dto.title,
        body: dto.body,
        factRefs: dto.factRefs,
        owner: dto.owner,
        needsRereview: dto.needsRereview,
        nonSubstantive: dto.nonSubstantive ? { scopeRef: dto.scopeRef! } : undefined,
      },
      actor,
      this.ctx(),
    );
    const detail = [
      next.version !== before.version ? `v${before.version} → v${next.version}` : '',
      next.status !== before.status ? `${before.status} → ${next.status}` : '',
      before.qa && !next.qa ? 'QA cleared' : '',
      dto.needsRereview === false ? 're-review cleared' : '',
    ].filter(Boolean).join('; ');
    return this.save(next, actor, 'edited', detail || undefined, dto.nonSubstantive ? `Non-substantive: ${dto.scopeRef}` : undefined);
  }

  transition(id: string, dto: TransitionInput, actor: Actor): Task {
    const before = this.get(id);
    const ctx = this.ctx();
    if (isAd(before) && dto.to === 'live') ctx.gates = this.gates(id);
    const next = applyTransition(before, { to: dto.to, actor, note: dto.note, qa: dto.qa }, ctx);
    const saved = this.save(next, actor, `${before.status} → ${next.status}`, next.approval?.nonSubstantive ? `Non-substantive (${next.approval.nonSubstantive.scopeRef})` : undefined, dto.note);
    if (saved.status === 'live' && saved.type === 'ad_change') this.applyAdChangeToPlatform(saved);
    return saved;
  }

  /** Mock ad platform: an ad change that names a campaign id takes effect when it goes live. */
  private applyAdChangeToPlatform(task: Task): void {
    for (const a of this.store.data.adSets) {
      if (task.body?.includes(a.campaignId) && /pause/i.test(task.title)) a.status = 'paused';
    }
  }

  createPackage(id: string, dto: CreatePackageInput, actor: Actor): PublishPackage {
    const task = this.get(id);
    const pkg = this.packages.createFromTask(task, dto, actor);
    this.save({ ...task, linkedPackageId: pkg.id }, actor, 'package created', pkg.id);
    return pkg;
  }

  /** Prefilled brief for the "New brief" form; nothing is stored until POST /factory/briefs. */
  briefPrefill(id: string): BriefDraft {
    const task = this.get(id);
    if (task.type !== 'video_brief') throw new AppError('VALIDATION', `${task.id} is not a video brief task.`);
    const s = this.store.data.settings;
    const ratios = [...new Set((task.title.match(/\b(16:9|9:16|4:5|1:1)\b/g) ?? ['9:16']) as ('16:9' | '9:16' | '4:5' | '1:1')[])];
    const now = this.clock.now();
    return {
      taskId: task.id,
      campaign: s.campaign.name,
      objective: task.body ?? task.title,
      marketLanguage: BRIEF_DEFAULTS.marketLanguage,
      factSheetVersion: this.store.data.factSheetVersion,
      allowedFacts: [...task.factRefs],
      forbidden: [...BRIEF_DEFAULTS.forbidden],
      deliverables: ratios.map((ratio) => ({ channel: RATIO_CHANNELS[ratio], ratio })),
      requirements: [...BRIEF_DEFAULTS.requirements],
      deadline: new Date(now.getTime() + BRIEF_DEFAULTS.deadlineDays * 86_400_000).toISOString(),
      costCap: { ...BRIEF_DEFAULTS.costCap },
      approver: s.people.approvers.content ?? s.people.decisionMaker,
    };
  }

  // ---- used by agent decisions and the factory (a person accepted the item; see I-A1)

  /** D-15: apply an accepted draft to its task; a needs_confirmation block clears if facts are now usable. */
  applyAgentDraft(taskId: string, body: string, factRefs: string[], actor: Actor, runId: string): Task {
    const before = this.get(taskId);
    let next = applyEdit(before, { body, factRefs }, actor, this.ctx());
    if (next.status === 'blocked' && next.blockedReason?.startsWith('needs_confirmation') && !next.needsConfirmation) {
      next = { ...next, status: 'draft', blockedReason: undefined };
    }
    return this.save(next, actor, `draft accepted from ${runId}`, next.status !== before.status ? `${before.status} → ${next.status}` : undefined);
  }

  /** I-A2: a needs_confirmation output lands as a blocked task. */
  blockForConfirmation(taskId: string, factIds: string[], actor: Actor, runId: string): Task {
    const before = this.get(taskId);
    const refs = [...new Set([...before.factRefs, ...factIds])];
    const next = blockTask({ ...before, factRefs: refs, needsConfirmation: true }, needsConfirmationReason(factIds));
    return this.save(next, actor, `needs_confirmation accepted from ${runId}`, `${before.status} → blocked`);
  }

  createBlocked(input: NewTask, factIds: string[], actor: Actor): Task {
    const t = this.createInternal({ ...input, factRefs: [...new Set([...(input.factRefs ?? []), ...factIds])] }, actor, `From ${input.originRunId}`);
    if (t.status === 'blocked') return t;
    // Facts were confirmed between the run and the decision: still record the block the agent raised.
    return this.save(blockTask(t, needsConfirmationReason(factIds)), actor, '→ blocked', needsConfirmationReason(factIds));
  }

  /** D-17: in-scope suggestions arrive approved under the signed pre-approved scope. */
  createPreApproved(input: NewTask, auth: PreApprovedAuth, actor: Actor): Task {
    const t = this.createInternal(input, actor, `From ${input.originRunId}`);
    const at = this.clock.now().toISOString();
    return this.save(
      { ...t, status: 'approved', approval: { approver: actor, at, status: 'approved', approvedVersion: t.version, preApproved: auth } },
      actor,
      'draft → approved',
      `Pre-approved scope ${auth.scopeRef}, signed by ${auth.authorisedBy}`,
    );
  }

  /** D-18: accepted verification; a match on live work verifies it. */
  recordVerification(taskId: string, v: Omit<VerificationRecord, 'at' | 'by'>, actor: Actor): Task {
    const before = this.get(taskId);
    const record: VerificationRecord = { ...v, at: this.clock.now().toISOString(), by: actor };
    const status = v.result === 'match' && before.status === 'live' ? 'verified' : before.status;
    return this.save({ ...before, verification: record, status }, actor, `verification ${v.result}`, status !== before.status ? 'live → verified' : undefined);
  }

  /** D-22: receipt QA passed → the video brief task moves to qa (system transition). */
  moveToQaFromFactory(taskId: string, actor: Actor, briefId: string): Task {
    const before = this.get(taskId);
    if (before.status === 'qa') return before;
    return this.save({ ...before, status: 'qa', linkedBriefId: briefId }, actor, `${before.status} → qa`, `Receipt QA passed on ${briefId}`);
  }

  linkBrief(taskId: string, briefId: string, actor: Actor): Task {
    return this.save({ ...this.get(taskId), linkedBriefId: briefId }, actor, 'brief created', briefId);
  }
}
