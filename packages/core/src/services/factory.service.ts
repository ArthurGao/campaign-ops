import { replaceById, stamp } from '../common/audit';
import { type IdService } from '../store/id.service';
import type { Clock } from '../domain/clock';
import { AppError, invalidTransition, notFound } from '../domain/errors';
import { needsConfirmationError, unusableRefs } from '../domain/rules/facts';
import type { Actor, Brief, PublishPackage, Receipt } from '../domain/types';
import type { BriefReader } from '../integrations/agents/agent.adapter';
import type { FactoryClient } from '../integrations/factory/factory.client';
import { SYSTEM } from '../seed/actors';
import { type MemoryStore } from '../store/memory.store';
import { type PackagesService } from './packages.service';
import { type TasksService } from './tasks.service';
import type { BriefQAInput, CreateBriefInput } from './inputs';

/** The human checklist item I-V2 requires, ticked with a name. */
export const HUMAN_REVIEW_ITEM = 'Captions, voice-over and key frames reviewed';
export const BRIEF_QA_CHECKLIST = [
  'Ratios, lengths and checksums match the brief',
  'facts_used ⊆ allowed_facts',
  HUMAN_REVIEW_ITEM,
  'Music license proof present',
  'Credits within cap',
];

export class FactoryService implements BriefReader {
  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly tasks: TasksService,
    private readonly packages: PackagesService,
    private readonly factory: FactoryClient,
    private readonly clock: Clock,
  ) {}

  private get briefs(): Brief[] {
    return this.store.data.briefs;
  }

  list(): Brief[] {
    return this.briefs;
  }

  find(id: string): Brief | undefined {
    return this.briefs.find((b) => b.id === id);
  }

  get(id: string): Brief {
    const b = this.find(id);
    if (!b) throw notFound('Brief', id);
    return b;
  }

  private save(next: Brief, actor: Actor, action: string, detail?: string, reason?: string): Brief {
    return replaceById(this.briefs, stamp(next, this.clock.now(), actor, action, detail, reason));
  }

  /** I-V1: no other non-cancelled brief for the same task (the factory queue check by task_id). */
  private assertNoDuplicate(taskId: string, exceptId?: string): void {
    const dup = this.briefs.find(
      (b) => b.taskId === taskId && b.id !== exceptId && b.status !== 'cancelled',
    );
    if (dup) {
      throw new AppError(
        'DUPLICATE_BRIEF',
        `${taskId} already has brief ${dup.id} (${dup.status}).`,
        `Cancel ${dup.id} first, or work on it instead.`,
      );
    }
  }

  private assertFactsUsable(brief: Pick<Brief, 'allowedFacts'>, what: string): void {
    const missing = unusableRefs(brief.allowedFacts, this.store.data.facts, this.clock.now());
    if (missing.length) throw needsConfirmationError(missing, what);
  }

  create(dto: CreateBriefInput, actor: Actor): Brief {
    const task = this.tasks.get(dto.taskId);
    if (task.type !== 'video_brief')
      throw new AppError('VALIDATION', `${task.id} is not a video brief task.`);
    this.assertFactsUsable(dto, 'This brief');
    this.assertNoDuplicate(dto.taskId);
    const at = this.clock.now().toISOString();
    const id = this.ids.brief();
    const brief: Brief = {
      id,
      ...dto,
      campaign: this.store.data.settings.campaign.name,
      factSheetVersion: this.store.data.factSheetVersion,
      deliverables: dto.deliverables.map((d) => ({ ...d })),
      costCap: { ...dto.costCap },
      ...(this.store.data.settings.factorySupportsIdempotency
        ? { idempotencyKey: `${dto.taskId}:v1` }
        : {}),
      status: 'draft',
      version: 1,
      receipts: [],
      needsRereview: false,
      returnNotes: [],
      createdAt: at,
      updatedAt: at,
      events: [{ at, actor, action: 'created', detail: `From ${dto.taskId}` }],
    };
    this.briefs.push(brief);
    this.tasks.linkBrief(task.id, id, actor);
    return brief;
  }

  /** Re-attach factory callbacks for briefs left in flight (e.g. after a browser reload). */
  resumeInFlight(ids: string[]): void {
    for (const id of ids) {
      const b = this.find(id);
      if (b && ['submitted', 'accepted', 'in_production'].includes(b.status))
        this.submitToFactory(b);
    }
  }

  send(id: string, actor: Actor): Brief {
    const before = this.get(id);
    if (before.status !== 'draft' && before.status !== 'qa_returned') {
      throw invalidTransition(
        before.status,
        'submitted',
        'Only draft or returned briefs can be sent.',
      );
    }
    if (before.status === 'qa_returned' && before.receipts.length > before.costCap.maxRerenders) {
      throw new AppError(
        'INVALID_TRANSITION',
        `${id} reached its re-render cap (${before.costCap.maxRerenders}).`,
        'Raise the cost cap with the client or cancel the brief.',
      );
    }
    this.assertFactsUsable(before, id);
    this.assertNoDuplicate(before.taskId, id);
    const idempotencyKey = this.store.data.settings.factorySupportsIdempotency
      ? `${before.taskId}:v${before.version}`
      : undefined;
    const sent = this.save(
      { ...before, status: 'submitted', idempotencyKey },
      actor,
      'sent',
      `Duplicate check by task_id passed${idempotencyKey ? `; key ${idempotencyKey}` : ''}`,
    );
    this.submitToFactory(sent);
    return sent;
  }

  private submitToFactory(sent: Brief): void {
    const id = sent.id;
    this.factory.submit(sent, {
      onStatus: (status) => {
        const cur = this.find(id);
        if (cur && cur.status !== 'cancelled') this.save({ ...cur, status }, SYSTEM, status);
      },
      onDelivered: (receipt: Receipt) => {
        const cur = this.find(id);
        if (cur && cur.status !== 'cancelled')
          this.save(
            { ...cur, status: 'delivered', receipts: [...cur.receipts, receipt] },
            SYSTEM,
            'delivered',
            `Receipt ${receipt.version}`,
          );
      },
    });
  }

  /** I-V2 on pass; I-V3 on return (version bumps, old receipts kept). */
  qa(id: string, dto: BriefQAInput, actor: Actor): { brief: Brief; packages: PublishPackage[] } {
    const before = this.get(id);
    if (before.status !== 'delivered')
      throw invalidTransition(
        before.status,
        dto.passed ? 'qa_passed' : 'qa_returned',
        'QA runs on a delivered receipt.',
      );
    const receipt = before.receipts.at(-1)!;
    const at = this.clock.now().toISOString();

    if (!dto.passed) {
      if (!dto.notes?.trim())
        throw new AppError('VALIDATION', 'Returning a receipt needs a note for the factory.');
      const returned = this.save(
        {
          ...before,
          status: 'qa_returned',
          version: before.version + 1,
          returnNotes: [...before.returnNotes, { version: before.version, note: dto.notes, at }],
          qa: {
            by: actor,
            at,
            passed: false,
            checklist: dto.checklist,
            notes: dto.notes,
            receiptVersion: receipt.version,
            reviewerName: dto.reviewerName,
          },
        },
        actor,
        'qa_returned',
        `Receipt ${receipt.version}`,
        dto.notes,
      );
      return { brief: returned, packages: [] };
    }

    const problems: string[] = [];
    const outside = receipt.factsUsed.filter((f) => !before.allowedFacts.includes(f));
    if (outside.length) problems.push(`facts_used outside allowed_facts: ${outside.join(', ')}`);
    if (receipt.musicLicense.status !== 'licensed' || !receipt.musicLicense.proof)
      problems.push('music license proof missing');
    if (receipt.creditsUsed > before.costCap.maxCredits)
      problems.push(`credits ${receipt.creditsUsed} over cap ${before.costCap.maxCredits}`);
    const human = dto.checklist.find((c) => c.item === HUMAN_REVIEW_ITEM);
    if (!human?.ok || !dto.reviewerName?.trim())
      problems.push(`"${HUMAN_REVIEW_ITEM}" must be ticked with the reviewer's name`);
    const unticked = dto.checklist
      .filter((c) => !c.ok && c.item !== HUMAN_REVIEW_ITEM)
      .map((c) => c.item);
    if (unticked.length) problems.push(`unticked: ${unticked.join('; ')}`);
    if (problems.length) {
      throw new AppError(
        'QA_REQUIRED',
        `Receipt ${receipt.version} cannot pass QA.`,
        problems.join(' · '),
      );
    }

    const passed = this.save(
      {
        ...before,
        status: 'qa_passed',
        needsRereview: false,
        qa: {
          by: actor,
          at,
          passed: true,
          checklist: dto.checklist,
          notes: dto.notes,
          receiptVersion: receipt.version,
          reviewerName: dto.reviewerName,
        },
      },
      actor,
      'qa_passed',
      `Receipt ${receipt.version}; reviewed by ${dto.reviewerName}`,
    );
    this.tasks.moveToQaFromFactory(passed.taskId, actor, passed.id);
    const packages = this.packages.createFromBrief(passed, receipt, actor);
    return { brief: passed, packages };
  }

  cancel(id: string, actor: Actor, reason?: string): Brief {
    const before = this.get(id);
    if (before.status === 'qa_passed' || before.status === 'cancelled')
      throw invalidTransition(before.status, 'cancelled');
    return this.save({ ...before, status: 'cancelled' }, actor, 'cancelled', undefined, reason);
  }
}
