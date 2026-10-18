import { replaceById, stamp } from '../common/audit';
import { type IdService } from '../store/id.service';
import type { Clock } from '../domain/clock';
import type { PackageStatus } from '../domain/enums';
import { AppError, notFound } from '../domain/errors';
import { needsConfirmation } from '../domain/rules/facts';
import {
  applyPackageEdit,
  approvePackage,
  markPublished,
  recordVerification,
  rejectPackage,
  schedulePackage,
  takeDown,
  type PackageContext,
} from '../domain/rules/packages';
import { PACKAGE_CHANNEL, renderUtm, utmForChannel } from '../domain/rules/utm';
import type {
  Actor,
  Brief,
  PublishLogRow,
  PublishPackage,
  QARecord,
  Receipt,
  ReceiptAsset,
  Task,
} from '../domain/types';
import type { PackageReader } from '../integrations/agents/agent.adapter';
import { type MemoryStore } from '../store/memory.store';
import type { CreatePackageInput, PatchPackageInput } from './inputs';

/** Remove FS markers and fill {link} so the caption reads as it will be posted. */
export function captionFromBody(body: string, link: string): string {
  return body
    .replace(/\s*\[← FS-\d+\]/g, '')
    .replace(/\{link\}/g, link)
    .replace(/\s+…\s+/g, ' ')
    .trim();
}

export type AvailableAsset = ReceiptAsset & { briefId: string; receiptVersion: string };

/** Reference recorded on the source task when a package is verified. */
export type VerificationRef = { runId: string; outputId: string };

/** Lets TasksService follow its packages without a circular dependency. */
export type PackageHooks = {
  published(pkg: PublishPackage, actor: Actor): void;
  verified(pkg: PublishPackage, actor: Actor, ref: VerificationRef): void;
};

export class PackagesService implements PackageReader {
  private hooks: PackageHooks[] = [];

  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly clock: Clock,
  ) {}

  registerHooks(hooks: PackageHooks): void {
    this.hooks.push(hooks);
  }

  private get packages(): PublishPackage[] {
    return this.store.data.packages;
  }

  private ctx(): PackageContext {
    return {
      now: this.clock.now(),
      facts: this.store.data.facts,
      settings: this.store.data.settings,
    };
  }

  /** needsConfirmation is time-dependent (expiry), so refresh it whenever packages are read. */
  private refresh(p: PublishPackage): PublishPackage {
    const flag = needsConfirmation(p.factRefs, this.store.data.facts, this.clock.now());
    if (flag === p.needsConfirmation) return p;
    return replaceById(this.packages, { ...p, needsConfirmation: flag });
  }

  list(status?: PackageStatus): PublishPackage[] {
    return this.packages.map((p) => this.refresh(p)).filter((p) => !status || p.status === status);
  }

  find(id: string): PublishPackage | undefined {
    const p = this.packages.find((x) => x.id === id);
    return p && this.refresh(p);
  }

  get(id: string): PublishPackage {
    const p = this.find(id);
    if (!p) throw notFound('Package', id);
    return p;
  }

  publishLog(): PublishLogRow[] {
    return this.packages
      .flatMap((p) =>
        p.publishLog.map((e) => ({
          ...e,
          packageId: p.id,
          channel: p.channel,
          assetId: p.asset?.assetId,
        })),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  /** Assets from receipts that passed QA: the only ones a package may use. Latest version per ratio. */
  availableAssets(): AvailableAsset[] {
    return this.store.data.briefs
      .filter((b) => b.status === 'qa_passed')
      .flatMap((b) => {
        const latest = new Map<string, AvailableAsset>();
        for (const r of b.receipts)
          for (const a of r.assets)
            latest.set(a.ratio, { ...a, briefId: b.id, receiptVersion: r.version });
        return [...latest.values()];
      });
  }

  private save(
    next: PublishPackage,
    actor: Actor,
    action: string,
    detail?: string,
    reason?: string,
  ): PublishPackage {
    return replaceById(this.packages, stamp(next, this.clock.now(), actor, action, detail, reason));
  }

  patch(id: string, dto: PatchPackageInput, actor: Actor): PublishPackage {
    const before = this.get(id);
    if (dto.nonSubstantive && !dto.scopeRef) {
      throw new AppError(
        'VALIDATION',
        'A non-substantive edit needs scopeRef.',
        'Pick the kind of edit from the pre-approved list.',
        400,
      );
    }
    let asset: Parameters<typeof applyPackageEdit>[1]['asset'];
    if (dto.asset) {
      const known = this.availableAssets().find((a) => a.assetId === dto.asset!.assetId);
      asset = known
        ? { assetId: known.assetId, url: known.url, checksum: known.checksum }
        : dto.asset;
    }
    const next = applyPackageEdit(
      before,
      {
        captionText: dto.caption,
        asset,
        scheduledAt: dto.scheduledAt,
        nonSubstantive: dto.nonSubstantive ? { scopeRef: dto.scopeRef! } : undefined,
        needsRereview: dto.needsRereview,
      },
      actor,
      this.ctx(),
    );
    const parts = [
      next.caption.version !== before.caption.version
        ? `caption ${before.caption.version} → ${next.caption.version}`
        : '',
      next.asset?.version !== before.asset?.version
        ? `asset ${before.asset?.version ?? '—'} → ${next.asset?.version}`
        : '',
      next.scheduledAt !== before.scheduledAt ? 'scheduled time' : '',
      dto.needsRereview === false ? 're-review cleared' : '',
    ].filter(Boolean);
    return this.save(
      next,
      actor,
      'edited',
      parts.join('; '),
      dto.nonSubstantive ? `Non-substantive: ${dto.scopeRef}` : undefined,
    );
  }

  approve(id: string, actor: Actor, note?: string): PublishPackage {
    const next = approvePackage(this.get(id), actor, this.ctx(), note);
    return this.save(
      next,
      actor,
      'approved',
      `asset ${next.approval.approvedAssetVersion ?? '—'} / caption ${next.approval.approvedCaptionVersion}`,
      note,
    );
  }

  reject(id: string, actor: Actor, note: string): PublishPackage {
    return this.save(
      rejectPackage(this.get(id), actor, note, this.clock.now()),
      actor,
      'rejected',
      undefined,
      note,
    );
  }

  schedule(id: string, actor: Actor): PublishPackage {
    return this.save(
      schedulePackage(this.get(id), actor, this.packages, this.ctx()),
      actor,
      'scheduled',
      'Duplicate check passed',
    );
  }

  published(id: string, actor: Actor, postUrl: string, at?: string): PublishPackage {
    const saved = this.save(
      markPublished(this.get(id), actor, postUrl, at ?? this.clock.now().toISOString()),
      actor,
      'published',
      postUrl,
    );
    this.hooks.forEach((h) => h.published(saved, actor));
    return saved;
  }

  verify(
    id: string,
    actor: Actor,
    result: 'verified' | 'mismatch',
    note?: string,
    ref: VerificationRef = { runId: 'manual', outputId: id },
  ): PublishPackage {
    const saved = this.save(
      recordVerification(this.get(id), actor, result, note, this.clock.now()),
      actor,
      result,
      undefined,
      note,
    );
    if (result === 'verified') this.hooks.forEach((h) => h.verified(saved, actor, ref));
    return saved;
  }

  takeDown(id: string, actor: Actor, note: string): PublishPackage {
    return this.save(
      takeDown(this.get(id), actor, note, this.clock.now()),
      actor,
      'taken down',
      undefined,
      note,
    );
  }

  createFromTask(task: Task, dto: CreatePackageInput, actor: Actor): PublishPackage {
    if (task.type !== 'social_post' && task.type !== 'ad_copy') {
      throw new AppError(
        'VALIDATION',
        `${task.id} is a ${task.type}; only social posts and ad copy become packages.`,
      );
    }
    const qaPassed = task.qa?.passed === true;
    if (!(
      task.status === 'approved' ||
      (qaPassed && ['qa', 'awaiting_approval'].includes(task.status))
    )) {
      throw new AppError(
        'QA_REQUIRED',
        `${task.id} has not passed QA.`,
        'Record QA on the task before building its package.',
      );
    }
    const existing =
      task.linkedPackageId &&
      this.packages.find((p) => p.id === task.linkedPackageId && !p.takenDown);
    if (existing) {
      throw new AppError(
        'INVALID_TRANSITION',
        `${task.id} already has ${existing.id}.`,
        'Edit that package instead; it keeps the version history.',
      );
    }
    let asset: PublishPackage['asset'];
    if (dto.assetId) {
      const a = this.availableAssets().find((x) => x.assetId === dto.assetId);
      if (!a)
        throw new AppError(
          'VALIDATION',
          `${dto.assetId} has not passed factory QA.`,
          'Pick an asset from a QA-passed receipt.',
        );
      asset = { assetId: a.assetId, version: a.receiptVersion, url: a.url, checksum: a.checksum };
    }
    const id = this.ids.package();
    const channel = dto.channel ?? PACKAGE_CHANNEL[task.channel ?? ''] ?? task.channel ?? 'website';
    const s = this.store.data.settings;
    const { source, medium } = utmForChannel(channel);
    const link = renderUtm(s.utmTemplate, {
      base: s.landingPage.url,
      source,
      medium,
      content: id.toLowerCase(),
    });
    const now = this.clock.now();
    const caption = {
      version: this.ids.caption(id),
      text: captionFromBody(task.body ?? task.title, link),
    };
    const pkg: PublishPackage = {
      id,
      sourceTaskId: task.id,
      channel,
      account: `${s.campaign.client} — ${channel.replace('_', ' ')}`,
      ...(asset ? { asset } : {}),
      caption,
      captionHistory: [{ ...caption, at: now.toISOString() }],
      assetHistory: asset ? [{ ...asset, at: now.toISOString() }] : [],
      link,
      factRefs: [...task.factRefs],
      factSheetVersion: this.store.data.factSheetVersion,
      scheduledAt: dto.scheduledAt ?? new Date(now.getTime() + 2 * 86_400_000).toISOString(),
      qa: task.qa as QARecord,
      approval: { status: 'pending' },
      executor: s.people.executors[0] ?? '',
      status: 'awaiting_approval',
      publishLog: [],
      takenDown: false,
      needsConfirmation: needsConfirmation(task.factRefs, this.store.data.facts, now),
      needsRereview: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      events: [{ at: now.toISOString(), actor, action: 'created', detail: `From ${task.id}` }],
    };
    this.packages.push(pkg);
    return pkg;
  }

  /** D-22: one package per deliverable after a receipt passes QA. Caption starts as a placeholder. */
  createFromBrief(brief: Brief, receipt: Receipt, actor: Actor): PublishPackage[] {
    const s = this.store.data.settings;
    const now = this.clock.now().toISOString();
    return brief.deliverables.map((d) => {
      const latest = [...brief.receipts]
        .reverse()
        .flatMap((r) => r.assets.map((a) => ({ a, v: r.version })))
        .find((x) => x.a.ratio === d.ratio);
      const id = this.ids.package();
      const { source, medium } = utmForChannel(d.channel);
      const caption = {
        version: this.ids.caption(id),
        text: `[Caption TBC — draft with Outbound for ${d.channel}]`,
      };
      const pkg: PublishPackage = {
        id,
        sourceTaskId: brief.taskId,
        sourceBriefId: brief.id,
        channel: d.channel,
        account: `${s.campaign.client} — ${d.channel.replace('_', ' ')}`,
        ...(latest
          ? {
              asset: {
                assetId: latest.a.assetId,
                version: latest.v,
                url: latest.a.url,
                checksum: latest.a.checksum,
              },
            }
          : {}),
        caption,
        captionHistory: [{ ...caption, at: now }],
        assetHistory: latest
          ? [
              {
                assetId: latest.a.assetId,
                version: latest.v,
                url: latest.a.url,
                checksum: latest.a.checksum,
                at: now,
              },
            ]
          : [],
        link: renderUtm(s.utmTemplate, {
          base: s.landingPage.url,
          source,
          medium,
          content: id.toLowerCase(),
        }),
        factRefs: [...receipt.factsUsed],
        factSheetVersion: this.store.data.factSheetVersion,
        scheduledAt: new Date(this.clock.now().getTime() + 3 * 86_400_000).toISOString(),
        qa: brief.qa as QARecord,
        approval: { status: 'pending' },
        executor: s.people.executors[0] ?? '',
        status: 'awaiting_approval',
        publishLog: [],
        takenDown: false,
        needsConfirmation: needsConfirmation(
          receipt.factsUsed,
          this.store.data.facts,
          this.clock.now(),
        ),
        needsRereview: false,
        createdAt: now,
        updatedAt: now,
        events: [
          {
            at: now,
            actor,
            action: 'created',
            detail: `From ${brief.id} receipt ${receipt.version}`,
          },
        ],
      };
      this.packages.push(pkg);
      return pkg;
    });
  }

  /** Accepting an agent verification records it on the package. */
  applyAgentVerification(
    id: string,
    result: 'match' | 'mismatch',
    diff: string[] | undefined,
    actor: Actor,
    ref: VerificationRef,
  ): PublishPackage {
    const note =
      result === 'mismatch'
        ? `${ref.outputId}: ${(diff ?? []).join(' | ') || 'differs from approved'}`
        : `${ref.outputId}: match`;
    return this.verify(id, actor, result === 'match' ? 'verified' : 'mismatch', note, ref);
  }
}
