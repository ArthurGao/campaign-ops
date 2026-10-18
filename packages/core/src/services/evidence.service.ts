import { replaceById, stamp } from '../common/audit';
import { type IdService } from '../store/id.service';
import type { Clock } from '../domain/clock';
import type { Blocks, EvidenceSource, EvidenceStatus, Priority } from '../domain/enums';
import { AppError, notFound } from '../domain/errors';
import { isHttpUrl } from '../domain/rules/url';
import type { Actor, EvidenceItem, Task } from '../domain/types';
import type { BacklogReader } from '../integrations/agents/mock-audit.adapter';
import { type MemoryStore } from '../store/memory.store';
import { type TasksService } from './tasks.service';
import type { ConvertEvidenceInput, CreateEvidenceInput, PatchEvidenceInput } from './inputs';

export type EvidenceFilters = {
  source?: EvidenceSource;
  blocks?: Blocks;
  priority?: Priority;
  status?: EvidenceStatus;
};

export class EvidenceService implements BacklogReader {
  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly tasks: TasksService,
    private readonly clock: Clock,
  ) {}

  private get items(): EvidenceItem[] {
    return this.store.data.evidence;
  }

  findings(): { id: string; finding: string }[] {
    return this.items
      .filter((e) => e.status !== 'dismissed')
      .map(({ id, finding }) => ({ id, finding }));
  }

  list(f: EvidenceFilters = {}): EvidenceItem[] {
    return this.items.filter(
      (e) =>
        (!f.source || e.source === f.source) &&
        (!f.blocks || e.blocks === f.blocks) &&
        (!f.priority || e.priority === f.priority) &&
        (!f.status || e.status === f.status),
    );
  }

  get(id: string): EvidenceItem {
    const e = this.items.find((x) => x.id === id);
    if (!e) throw notFound('Evidence', id);
    return e;
  }

  create(dto: CreateEvidenceInput, actor: Actor, originRunId?: string): EvidenceItem {
    const badProof = dto.proof.find((pr) => pr.url && !isHttpUrl(pr.url));
    if (badProof) {
      throw new AppError(
        'VALIDATION',
        `Proof link "${badProof.label}" must be an http(s) URL.`,
        undefined,
        400,
      );
    }
    const at = this.clock.now().toISOString();
    const item: EvidenceItem = {
      id: this.ids.evidence(),
      ...dto,
      proof: dto.proof.map((p) => ({ ...p })),
      status: 'open',
      ...(originRunId ? { originRunId } : {}),
      createdAt: at,
      updatedAt: at,
      events: [{ at, actor, action: originRunId ? `accepted from ${originRunId}` : 'created' }],
    };
    this.items.push(item);
    return item;
  }

  patch(id: string, dto: PatchEvidenceInput, actor: Actor): EvidenceItem {
    const before = this.get(id);
    if (dto.status === 'dismissed' && !dto.reason?.trim()) {
      throw new AppError(
        'VALIDATION',
        'Dismissing evidence needs a reason.',
        'Record why it does not need action.',
      );
    }
    if (dto.status === 'converted' && before.status !== 'converted') {
      throw new AppError(
        'INVALID_TRANSITION',
        'Use "Convert to task" to convert evidence.',
        'POST /evidence/:id/convert',
      );
    }
    const next = {
      ...before,
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.priority ? { priority: dto.priority } : {}),
      ...(dto.blocks ? { blocks: dto.blocks } : {}),
      ...(dto.suggestedOwner !== undefined ? { suggestedOwner: dto.suggestedOwner } : {}),
    };
    const changed = (['status', 'priority', 'blocks', 'suggestedOwner'] as const).filter(
      (k) => next[k] !== before[k],
    );
    return replaceById(
      this.items,
      stamp(next, this.clock.now(), actor, 'updated', changed.join(', '), dto.reason),
    );
  }

  convert(
    id: string,
    dto: ConvertEvidenceInput,
    actor: Actor,
  ): { evidence: EvidenceItem; task: Task } {
    const before = this.get(id);
    if (before.status !== 'open') {
      throw new AppError(
        'INVALID_TRANSITION',
        `${id} is ${before.status}${before.convertedTaskId ? ` (${before.convertedTaskId})` : ''}.`,
        'Only open evidence can be converted.',
      );
    }
    const task = this.tasks.createInternal(
      {
        type: dto.type,
        title: dto.title ?? before.finding,
        channel: dto.channel,
        pageUrl: dto.pageUrl,
        factRefs: dto.factRefs,
        owner: before.suggestedOwner,
        body: `${before.finding}\n\nImpact: ${before.impact}\nProof: ${before.proof.map((p) => p.label).join('; ')}`,
        originEvidenceId: before.id,
      },
      actor,
      `From ${before.id}`,
    );
    const evidence = replaceById(
      this.items,
      stamp(
        { ...before, status: 'converted', convertedTaskId: task.id },
        this.clock.now(),
        actor,
        'converted',
        task.id,
      ),
    );
    return { evidence, task };
  }
}
