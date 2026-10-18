import { replaceById, stamp } from '../common/audit';
import { type IdService } from '../store/id.service';
import type { Clock } from '../domain/clock';
import type { FactPage } from '../domain/enums';
import { AppError, notFound } from '../domain/errors';
import {
  assertConfirmable,
  assertMayConfirm,
  bumpFactSheetVersion,
  externalOnly,
  needsConfirmation,
  toView,
} from '../domain/rules/facts';
import type {
  Actor,
  FactChange,
  FactEntry,
  FactSheetVersion,
  FactUsages,
  FactView,
} from '../domain/types';
import type { ExternalFactReader } from '../integrations/agents/agent.adapter';
import { type MemoryStore } from '../store/memory.store';
import type { ConfirmFactInput, CreateFactInput, PatchFactInput } from './inputs';

const CONTENT_KEYS = [
  'label',
  'statement',
  'source',
  'expiresAt',
  'publicNote',
  'purpose',
] as const;

export class FactSheetService implements ExternalFactReader {
  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly clock: Clock,
  ) {}

  private get facts(): FactEntry[] {
    return this.store.data.facts;
  }

  version(): string {
    return this.store.data.factSheetVersion;
  }

  list(page?: FactPage): { version: string; entries: FactView[] } {
    const now = this.clock.now();
    const entries = this.facts.filter((f) => !page || f.page === page).map((f) => toView(f, now));
    return { version: this.version(), entries };
  }

  /** I-F1: the only Fact Sheet view the Outbound agent can read. Internal entries never leave here. */
  getExternal(): FactView[] {
    const now = this.clock.now();
    return externalOnly(this.facts).map((f) => toView(f, now));
  }

  get(id: string): FactEntry {
    const fact = this.facts.find((f) => f.id === id);
    if (!fact) throw notFound('Fact', id);
    return fact;
  }

  versions(): FactSheetVersion[] {
    return [...this.store.data.factVersions].reverse();
  }

  usages(id: string): FactUsages {
    this.get(id);
    const { tasks, briefs, packages } = this.store.data;
    return {
      tasks: tasks.filter((t) => t.factRefs.includes(id)),
      briefs: briefs.filter(
        (b) => b.allowedFacts.includes(id) || b.receipts.some((r) => r.factsUsed.includes(id)),
      ),
      packages: packages.filter((p) => p.factRefs.includes(id)),
    };
  }

  create(dto: CreateFactInput, actor: Actor): FactEntry {
    const now = this.clock.now().toISOString();
    const entry: FactEntry = {
      id: this.ids.fact(),
      page: dto.page,
      label: dto.label,
      statement: dto.statement,
      status: 'pending',
      ...(dto.purpose ? { purpose: dto.purpose } : {}),
      ...(dto.publicNote ? { publicNote: dto.publicNote } : {}),
      createdAt: now,
      updatedAt: now,
      events: [{ at: now, actor, action: 'created' }],
    };
    this.facts.push(entry);
    this.commit(
      [{ factId: entry.id, after: { status: 'pending', statement: entry.statement } }],
      actor,
    );
    return entry;
  }

  patch(id: string, dto: PatchFactInput, actor: Actor): FactEntry {
    const before = this.get(id);
    const after: Partial<FactEntry> = {};
    const prev: Partial<FactEntry> = {};
    for (const k of CONTENT_KEYS) {
      if (dto[k] !== undefined && dto[k] !== before[k]) {
        after[k] = dto[k];
        prev[k] = before[k];
      }
    }
    if (!Object.keys(after).length) return before;
    // A confirmation covers the wording that was confirmed; new wording needs a new confirmation.
    if (
      after.statement !== undefined &&
      (before.status === 'confirmed' || before.status === 'confirmed_with_expiry')
    ) {
      after.status = 'pending';
      prev.status = before.status;
    }
    let next: FactEntry = { ...before, ...after };
    if (after.status === 'pending')
      next = { ...next, confirmedBy: undefined, confirmedAt: undefined };
    next = stamp(next, this.clock.now(), actor, 'edited', Object.keys(after).join(', '));
    replaceById(this.facts, next);
    this.commit([{ factId: id, before: prev, after }], actor);
    return next;
  }

  confirm(id: string, dto: ConfirmFactInput, actor: Actor): FactEntry {
    const before = this.get(id);
    assertMayConfirm(before, actor, dto.expiresAt);
    assertConfirmable(before, dto.source);
    const now = this.clock.now();
    if (dto.expiresAt && new Date(dto.expiresAt) <= now) {
      throw new AppError(
        'VALIDATION',
        'The expiry date is already past.',
        'Pick a future date, or confirm without expiry.',
      );
    }
    const status = dto.expiresAt ? 'confirmed_with_expiry' : 'confirmed';
    let next: FactEntry = {
      ...before,
      status,
      source: dto.source.trim(),
      confirmedBy: actor,
      confirmedAt: now.toISOString(),
      expiresAt: dto.expiresAt,
      rejectedNote: undefined,
      ...(dto.publicNote !== undefined ? { publicNote: dto.publicNote } : {}),
    };
    next = stamp(next, now, actor, status, `Source: ${next.source}`);
    replaceById(this.facts, next);
    this.commit(
      [
        {
          factId: id,
          before: { status: before.status, source: before.source },
          after: {
            status,
            source: next.source,
            ...(dto.expiresAt ? { expiresAt: dto.expiresAt } : {}),
          },
        },
      ],
      actor,
    );
    return next;
  }

  reject(id: string, note: string, actor: Actor): FactEntry {
    const before = this.get(id);
    let next: FactEntry = {
      ...before,
      status: 'rejected',
      rejectedNote: note,
      confirmedBy: undefined,
      confirmedAt: undefined,
    };
    next = stamp(next, this.clock.now(), actor, 'rejected', undefined, note);
    replaceById(this.facts, next);
    this.commit(
      [{ factId: id, before: { status: before.status }, after: { status: 'rejected' } }],
      actor,
    );
    return next;
  }

  /** I-F2 bump the version; I-F3 flag every referencing item; refresh needsConfirmation. */
  private commit(changes: FactChange[], actor: Actor): void {
    const now = this.clock.now();
    const version = bumpFactSheetVersion(this.version());
    const ids = new Set(changes.map((c) => c.factId));
    const affected: FactSheetVersion['affected'] = [];
    const { tasks, packages, briefs } = this.store.data;

    tasks.forEach((t, i) => {
      const hit = t.factRefs.some((r) => ids.has(r));
      if (hit) affected.push({ kind: 'task', id: t.id });
      tasks[i] = {
        ...t,
        needsRereview: t.needsRereview || hit,
        needsConfirmation: needsConfirmation(t.factRefs, this.facts, now),
      };
    });
    packages.forEach((p, i) => {
      const hit = p.factRefs.some((r) => ids.has(r));
      if (hit) affected.push({ kind: 'package', id: p.id });
      packages[i] = {
        ...p,
        needsRereview: p.needsRereview || hit,
        needsConfirmation: needsConfirmation(p.factRefs, this.facts, now),
      };
    });
    briefs.forEach((b, i) => {
      const hit = b.allowedFacts.some((r) => ids.has(r));
      if (hit) {
        affected.push({ kind: 'brief', id: b.id });
        briefs[i] = { ...b, needsRereview: true };
      }
    });

    this.store.data.factSheetVersion = version;
    this.store.data.factVersions.push({ version, at: now.toISOString(), actor, changes, affected });
  }
}
