import { OUTBOUND_MODES, type Channel, type OutboundMode, type TaskType } from '../../domain/enums';
import { PACKAGE_CHANNEL, renderUtm, utmForChannel } from '../../domain/rules/utm';
import type { FactView, Task } from '../../domain/types';
import type { SocialPlatformClient } from '../platforms/social.client';
import type {
  AgentAdapter,
  AgentOutputDraft,
  BriefReader,
  ExternalFactReader,
  PackageReader,
  RunContext,
  SettingsReader,
  TaskReader,
} from './agent.adapter';

/** Spec keywords that require a Fact Sheet entry. Price, dates, seats and visa are never filled in. */
const REQUIRED_FACTS: { factId: string; keywords: string[] }[] = [
  { factId: 'FS-04', keywords: ['departure', 'date'] },
  { factId: 'FS-15', keywords: ['price', 'cost'] },
  { factId: 'FS-09', keywords: ['visa', 'passport', 'entry requirement'] },
];

/** Facts every placeholder draft leans on (docs/03-agents.md mock behaviour). */
const BASE_FACTS = ['FS-07', 'FS-11'];

const AD_CHANNELS: readonly string[] = ['google_search', 'meta_ads'];

export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Sentence-level diff: '+' only live, '-' only approved. */
export function sentenceDiff(approved: string, live: string): string[] {
  const a = splitSentences(approved);
  const l = splitSentences(live);
  return [...l.filter((s) => !a.includes(s)).map((s) => `+ ${s}`), ...a.filter((s) => !l.includes(s)).map((s) => `- ${s}`)];
}

/**
 * Mock Outbound agent. Constructed with an ExternalFactReader, so it cannot see the internal page.
 */
export class MockOutboundAdapter implements AgentAdapter {
  readonly id = 'outbound' as const;

  constructor(
    private readonly facts: ExternalFactReader,
    private readonly tasks: TaskReader,
    private readonly briefs: BriefReader,
    private readonly packages: PackageReader,
    private readonly settings: SettingsReader,
    private readonly social: SocialPlatformClient,
  ) {}

  /** I-A3: the snapshot carries external entries only. */
  snapshot(inputs: Record<string, unknown>): Record<string, unknown> {
    return {
      ...inputs,
      factSheet: {
        version: this.facts.version(),
        entries: this.facts.getExternal().map(({ id, page, label, status, statement, publiclyUsable }) => ({
          id,
          page,
          label,
          status,
          statement,
          publiclyUsable,
        })),
      },
      prohibitedWords: this.settings.get().prohibitedWords,
    };
  }

  async run(inputs: Record<string, unknown>, ctx: RunContext): Promise<AgentOutputDraft[]> {
    const mode = String(inputs.mode ?? 'draft') as OutboundMode;
    if (!OUTBOUND_MODES.includes(mode)) throw new Error(`Unknown mode "${mode}"`);
    const task = typeof inputs.taskId === 'string' && inputs.taskId ? this.tasks.find(inputs.taskId) : undefined;
    if (inputs.taskId && !task) throw new Error(`Task ${String(inputs.taskId)} not found`);

    const outputs =
      mode === 'draft'
        ? this.draft(inputs, task, ctx)
        : mode === 'qa'
          ? this.qa(inputs, task)
          : await this.verify(inputs, task);
    return [...outputs, ...this.prohibitedWordCheck(task)];
  }

  private usable(): Map<string, FactView> {
    return new Map(this.facts.getExternal().map((f) => [f.id, f]));
  }

  private draft(inputs: Record<string, unknown>, task: Task | undefined, ctx: RunContext): AgentOutputDraft[] {
    const spec = String(inputs.spec ?? '').toLowerCase();
    const channel = String(inputs.channel ?? task?.channel ?? 'facebook') as Channel;
    const facts = this.usable();
    const required = REQUIRED_FACTS.filter((r) => r.keywords.some((k) => new RegExp(`\\b${k}`).test(spec))).map((r) => r.factId);
    const missing = required.filter((id) => !facts.get(id)?.publiclyUsable);
    const type: TaskType = task?.type ?? (AD_CHANNELS.includes(channel) ? 'ad_copy' : 'social_post');
    const title = task?.title ?? `${channel.replace('_', ' ')} caption — draft`;

    if (missing.length) {
      const names = missing.map((id) => `**${id}** (${facts.get(id)?.label ?? 'unknown'}) is \`${facts.get(id)?.status ?? 'missing'}\``);
      return [
        {
          type: 'needs_confirmation',
          title: `${missing.map((id) => facts.get(id)?.label ?? id).join(' and ')} needed — ${missing.join(', ')} not confirmed`,
          body: `The spec requires information that is not publicly usable: ${names.join('; ')}. No draft text was produced for it. Confirm ${missing.join(', ')} with a source, then re-run.`,
          factRefs: missing,
          proposal: { kind: 'needs_confirmation', factIds: missing, title, type, channel, ...(task ? { taskId: task.id } : {}) },
        },
      ];
    }

    const refs = [...new Set([...required, ...BASE_FACTS])].filter((id) => facts.get(id)?.publiclyUsable);
    const settings = this.settings.get();
    const packageChannel = PACKAGE_CHANNEL[channel] ?? channel;
    const { source, medium } = utmForChannel(packageChannel);
    const link = renderUtm(settings.utmTemplate, {
      base: settings.landingPage.url,
      source,
      medium,
      content: (task?.id ?? `${ctx.runId}`).toLowerCase(),
    });
    const sentences = refs.map((id) => {
      const f = facts.get(id)!;
      const note = f.publicNote && f.status === 'confirmed_with_expiry' ? ` (${f.publicNote.replace(/^Must state:\s*/i, '')})` : '';
      return `${f.statement}${note} [← ${id}]`;
    });
    const body = `${sentences.join(' … ')} … Learn more: ${link}`;
    return [
      {
        type: 'draft',
        title: `Draft — ${title}`,
        body,
        factRefs: refs,
        proposal: { kind: 'task', task: { type, title, channel, body, factRefs: refs, ...(task ? { taskId: task.id } : {}) } },
      },
    ];
  }

  private qa(inputs: Record<string, unknown>, task: Task | undefined): AgentOutputDraft[] {
    const outputs: AgentOutputDraft[] = [];
    const briefId = typeof inputs.briefId === 'string' ? inputs.briefId : undefined;
    if (briefId) {
      const brief = this.briefs.find(briefId);
      if (!brief) throw new Error(`Brief ${briefId} not found`);
      const receipt = brief.receipts.at(-1);
      if (!receipt) {
        return [{ type: 'observation', title: `${brief.id} has no receipt yet`, body: 'Nothing to check until the factory delivers.' }];
      }
      const delivered = new Set(brief.receipts.flatMap((r) => r.assets.map((a) => a.ratio)));
      const issues: string[] = [];
      for (const d of brief.deliverables) if (!delivered.has(d.ratio)) issues.push(`Ratio ${d.ratio} (${d.channel}) not delivered`);
      const outside = receipt.factsUsed.filter((f) => !brief.allowedFacts.includes(f));
      if (outside.length) issues.push(`facts_used outside allowed_facts: ${outside.join(', ')}`);
      if (receipt.musicLicense.status !== 'licensed' || !receipt.musicLicense.proof) issues.push('Music license proof missing');
      if (receipt.creditsUsed > brief.costCap.maxCredits) issues.push(`Credits ${receipt.creditsUsed} exceed cap ${brief.costCap.maxCredits}`);
      if (receipt.assets.some((a) => !a.checksum)) issues.push('Asset without checksum');

      for (const issue of issues) {
        outputs.push({
          type: 'evidence',
          title: `${brief.id} receipt ${receipt.version}: ${issue}`,
          body: `QA against brief ${brief.id} v${brief.version} found: **${issue}**. Return the receipt to the factory with this note.`,
          factRefs: outside.length && issue.startsWith('facts_used') ? outside : undefined,
          evidence: [{ label: `Receipt ${receipt.version} vs brief v${brief.version}` }],
          proposal: {
            kind: 'evidence',
            evidence: {
              source: 'channels',
              finding: `${brief.id} receipt ${receipt.version}: ${issue}`,
              proof: [{ label: `Receipt ${receipt.version} vs brief v${brief.version}` }],
              impact: 'Asset cannot pass QA as delivered',
              blocks: 'none',
              priority: 'P1',
              suggestedOwner: 'PM',
              needsApproval: false,
            },
          },
        });
      }
      if (!issues.length) {
        outputs.push({
          type: 'observation',
          title: `${brief.id} receipt ${receipt.version} passes automated checks`,
          body: `Ratios ✓ · checksums ✓ · facts_used ⊆ allowed_facts ✓ · licence ✓ · credits ${receipt.creditsUsed}/${brief.costCap.maxCredits} ✓. A person must still review captions, voice-over and key frames.`,
        });
      }
    }
    if (task) {
      const facts = this.usable();
      const missing = task.factRefs.filter((id) => !facts.get(id)?.publiclyUsable);
      if (missing.length) {
        outputs.push({
          type: 'needs_confirmation',
          title: `${task.id} cites unconfirmed facts: ${missing.join(', ')}`,
          body: `QA stops: ${missing.join(', ')} not publicly usable.`,
          factRefs: missing,
          proposal: { kind: 'needs_confirmation', factIds: missing, title: task.title, type: task.type, channel: task.channel, taskId: task.id },
        });
      } else if (!briefId) {
        outputs.push({ type: 'observation', title: `${task.id} facts check`, body: `All fact refs (${task.factRefs.join(', ') || 'none'}) are publicly usable.` });
      }
    }
    if (!briefId && !task) throw new Error('QA needs a briefId or a taskId');
    return outputs;
  }

  private async verify(inputs: Record<string, unknown>, task: Task | undefined): Promise<AgentOutputDraft[]> {
    const packageId = typeof inputs.packageId === 'string' && inputs.packageId ? inputs.packageId : undefined;
    if (packageId) {
      const pkg = this.packages.find(packageId);
      if (!pkg) throw new Error(`Package ${packageId} not found`);
      const published = [...pkg.publishLog].reverse().find((e) => e.action === 'published');
      if (!published?.postUrl) {
        return [{ type: 'observation', title: `${pkg.id} is not published yet`, body: 'Nothing live to compare.' }];
      }
      const live = (await this.social.fetchLivePost(published.postUrl)) ?? '';
      const approvedVersion = pkg.approval.approvedCaptionVersion ?? pkg.caption.version;
      const approved = pkg.captionHistory.find((c) => c.version === approvedVersion)?.text ?? pkg.caption.text;
      const diff = sentenceDiff(approved, live);
      const match = diff.length === 0;
      return [
        {
          type: 'verification',
          title: match ? `${pkg.id} live post matches approved ${approvedVersion}` : `${pkg.id} live caption differs from approved ${approvedVersion}`,
          body: match
            ? `Live caption equals ${approvedVersion}; asset ${pkg.asset?.assetId ?? '—'} unchanged. **match**`
            : `Differences between live and approved:\n\n${diff.map((d) => `${d}`).join('\n')}`,
          evidence: [{ label: 'Live post', url: published.postUrl }],
          proposal: { kind: 'verification', target: 'package', targetId: pkg.id, result: match ? 'match' : 'mismatch', ...(match ? {} : { diff }) },
        },
      ];
    }
    if (task) {
      if (task.status !== 'live') {
        return [{ type: 'observation', title: `${task.id} is ${task.status}`, body: 'Only live work can be verified.' }];
      }
      return [
        {
          type: 'verification',
          title: `${task.id} live content matches approved v${task.approval?.approvedVersion ?? task.version}`,
          body: `Checked ${task.pageUrl ?? task.channel ?? 'the live item'} against approved version ${task.approval?.approvedVersion ?? task.version}. **match**`,
          proposal: { kind: 'verification', target: 'task', targetId: task.id, result: 'match' },
        },
      ];
    }
    throw new Error('Verify needs a packageId or a taskId');
  }

  private prohibitedWordCheck(task: Task | undefined): AgentOutputDraft[] {
    if (!task?.body) return [];
    const body = task.body.toLowerCase();
    const found = this.settings.get().prohibitedWords.filter((w) => body.includes(w.toLowerCase()));
    if (!found.length) return [];
    return [
      {
        type: 'evidence',
        title: `Prohibited word${found.length > 1 ? 's' : ''} in ${task.id}: ${found.join(', ')}`,
        body: `${task.id} contains ${found.map((w) => `**${w}**`).join(', ')} (Settings › Prohibited words). Edit before QA.`,
        evidence: [{ label: `Settings › Prohibited words: ${found.join(', ')}` }],
        proposal: {
          kind: 'evidence',
          evidence: {
            source: 'channels',
            finding: `Prohibited word${found.length > 1 ? 's' : ''} ${found.map((w) => `'${w}'`).join(', ')} in ${task.id}`,
            proof: [{ label: `Settings › Prohibited words: ${found.join(', ')}` }],
            impact: 'Cannot pass QA as written',
            blocks: 'none',
            priority: 'P1',
            suggestedOwner: 'PM',
            needsApproval: false,
          },
        },
      },
    ];
  }
}
