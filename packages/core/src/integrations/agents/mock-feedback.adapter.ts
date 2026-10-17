import { FEEDBACK_SCOPES, type FeedbackScope } from '../../domain/enums';
import { formatNzd } from '../../domain/rules/money';
import { cplText, overReportRatio, withDerived } from '../../domain/rules/recon';
import type { AdSetReport } from '../../seed/recon.seed';
import type {
  AgentAdapter,
  AgentOutputDraft,
  FullFactReader,
  ResultsReader,
  SettingsReader,
  TaskReader,
} from './agent.adapter';

export type AdSetReader = { adSets(): AdSetReport[] };

const PAUSE_TITLE = 'Pause Meta ad set B';
const AD_SET_B = 'META-CT27-B';
const num = (n: number) => n.toLocaleString('en-NZ');

function parseScope(raw: unknown): FeedbackScope[] {
  if (!Array.isArray(raw) || raw.length === 0) return ['ads', 'funnel', 'reconciliation'];
  return raw.filter((s): s is FeedbackScope => (FEEDBACK_SCOPES as readonly string[]).includes(String(s)));
}

/**
 * Mock Feedback agent. Reads de-identified CRM rows, mock platform reports and the internal Fact
 * Sheet page (the only agent allowed to). Suggests; never changes ads, budgets or content.
 */
export class MockFeedbackAdapter implements AgentAdapter {
  readonly id = 'feedback' as const;

  constructor(
    private readonly results: ResultsReader & AdSetReader,
    private readonly facts: FullFactReader,
    private readonly settings: SettingsReader,
    private readonly tasks: TaskReader,
  ) {}

  snapshot(inputs: Record<string, unknown>): Record<string, unknown> {
    const crm = this.results.crmExport();
    return {
      dateRange: inputs.dateRange ?? 'last 10 days',
      scope: parseScope(inputs.scope),
      ...(inputs.afterLaunchOf ? { afterLaunchOf: inputs.afterLaunchOf } : {}),
      crmExport: { rows: crm.length, deidentified: true, columns: Object.keys(crm[0] ?? {}) },
      factSheetVersion: this.facts.list().version,
    };
  }

  async run(inputs: Record<string, unknown>): Promise<AgentOutputDraft[]> {
    if (typeof inputs.afterLaunchOf === 'string' && inputs.afterLaunchOf) return this.afterLaunch(inputs.afterLaunchOf);
    const scope = parseScope(inputs.scope);
    const outputs: AgentOutputDraft[] = [];
    if (scope.includes('funnel')) outputs.push(this.funnel());
    if (scope.includes('reconciliation')) outputs.push(this.reconciliation());
    if (scope.includes('ads')) outputs.push(...this.ads());
    if (scope.includes('leads_quality')) outputs.push(this.leadsQuality());
    if (this.settings.get().landingPage.status === 'not_ready') outputs.push(this.landingAnomaly());
    return outputs;
  }

  private afterLaunch(taskId: string): AgentOutputDraft[] {
    const task = this.tasks.find(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== 'live') {
      return [{ type: 'observation', title: `${task.id} is ${task.status}`, body: 'Nothing launched to verify yet.' }];
    }
    return [
      {
        type: 'verification',
        title: `${task.id} platform state matches the change record`,
        body: `Checked ${task.channel ?? 'the platform'}: "${task.title}" is in effect as recorded. **match**`,
        proposal: { kind: 'verification', target: 'task', targetId: task.id, result: 'match' },
      },
    ];
  }

  private funnel(): AgentOutputDraft {
    const weeks = this.results.funnel();
    const [prev, last, current] = weeks.slice(-3);
    const target = this.facts.list().entries.find((f) => f.id === 'FS-21');
    const row = (label: string, k: 'impressions' | 'visits' | 'validLeads' | 'deposits') =>
      `| ${label} | ${num(prev[k])} | ${num(last[k])} | ${num(current[k])} |`;
    return {
      type: 'observation',
      title: 'Funnel by layer',
      body: [
        '| Layer | 2 weeks ago | Last week | This week (to date) |',
        '|---|---|---|---|',
        row('Impressions', 'impressions'),
        row('Visits', 'visits'),
        row('Valid leads (CRM)', 'validLeads'),
        row('Deposits', 'deposits'),
        '',
        `Sample too small for conclusions; the next two-week checkpoint decides.${target ? ` Internal target ${target.id} is ${target.status === 'assumption' ? 'an assumption' : target.status} (${target.statement}); pacing not assessed.` : ''}`,
      ].join('\n'),
    };
  }

  private reconciliation(): AgentOutputDraft {
    const rows = this.results.recon().map(withDerived);
    const lastWeek = [...new Set(rows.map((r) => r.weekStart))].slice(-2)[0];
    const week = rows.filter((r) => r.weekStart === lastWeek);
    const lines = week
      .filter((r) => r.spendCents > 0 || r.platformReportedConversions > 0)
      .map((r) => {
        const ratio = overReportRatio(r.platformReportedConversions, r.crmValidLeads);
        return `| ${r.channel} | ${r.platformReportedConversions} | ${r.crmValidLeads} | ${ratio === null ? '—' : ratio === undefined ? '—' : `${ratio}×`} | ${cplText(r.spendCents, r.crmValidLeads)} |`;
      });
    const zero = week.filter((r) => r.spendCents > 0 && r.crmValidLeads === 0);
    return {
      type: 'observation',
      title: zero.length ? `Reconciliation: ${zero.map((r) => r.channel).join(', ')} spent with no valid leads` : 'Reconciliation, last full week',
      body: [
        '| Channel | Platform-reported | CRM valid | Over-report | Paid CPL |',
        '|---|---|---|---|---|',
        ...lines,
        '',
        'CRM is the ledger; platform numbers are for diagnosis only.',
      ].join('\n'),
    };
  }

  private ads(): AgentOutputDraft[] {
    const existing = this.tasks.list().find((t) => t.type === 'ad_change' && t.title === PAUSE_TITLE);
    if (existing) {
      return [
        {
          type: 'observation',
          title: `${PAUSE_TITLE}: already handled`,
          body: `${existing.id} is ${existing.status}. No new suggestion.`,
        },
      ];
    }
    const adSet = this.results.adSets().find((a) => a.campaignId === AD_SET_B);
    if (!adSet || adSet.status !== 'active') return [];
    const rows = this.results.crmExport().filter((r) => r.campaignId === AD_SET_B);
    const valid = rows.filter((r) => r.everValid).length;
    const invalid = rows.filter((r) => r.validity === 'invalid');
    const reasons = [...new Set(invalid.map((r) => String(r.validityReason ?? 'no reason')))];
    const scope = this.settings.get().preApprovedScope;
    const thresholdCents = 15_000;
    const inScope = adSet.spendCentsLast10Days >= thresholdCents && valid === 0;
    if (!inScope) return [];
    return [
      {
        type: 'suggestion',
        title: PAUSE_TITLE,
        body: `Ad set B spent ${formatNzd(adSet.spendCentsLast10Days)} in the last 10 days with **${valid} valid leads**; ${invalid.length} leads were marked invalid ("${reasons.join('", "')}"). This meets pre-approved pause condition 1: "${scope.pauseConditions[0]}". Within scope: the executor applies it; no extra client approval needed.`,
        inScope: true,
        approverRole: 'executor',
        evidence: [
          { label: `Ad set B spend, last 10 days: ${formatNzd(adSet.spendCentsLast10Days)}` },
          { label: `CRM: ${valid} valid / ${invalid.length} invalid (${invalid.map((r) => r.id).join(', ')})` },
          { label: 'Pre-approved scope › pause condition 1' },
        ],
        proposal: {
          kind: 'task',
          scopeRef: 'pauseConditions[0]',
          task: {
            type: 'ad_change',
            title: PAUSE_TITLE,
            channel: 'meta_ads',
            body: `Pause ad set B (campaign ${AD_SET_B}). Reason: ${formatNzd(adSet.spendCentsLast10Days)} in 10 days with 0 valid leads. Before: active · After: paused.`,
            factRefs: [],
          },
        },
      },
    ];
  }

  private leadsQuality(): AgentOutputDraft {
    const rows = this.results.crmExport();
    const invalid = rows.filter((r) => r.validity === 'invalid');
    const byReason = new Map<string, string[]>();
    const byAd = new Map<string, number>();
    for (const r of invalid) {
      const reason = String(r.validityReason ?? 'no reason');
      byReason.set(reason, [...(byReason.get(reason) ?? []), r.id as string]);
      const key = r.attribution === 'unknown' ? 'unknown — not inferred' : [r.campaignId, r.adId, r.utmTerm, r.landingPageVersion].filter(Boolean).join(' / ') || 'organic';
      byAd.set(key, (byAd.get(key) ?? 0) + 1);
    }
    const unknown = rows.filter((r) => r.attribution === 'unknown');
    return {
      type: 'observation',
      title: 'Lead quality: invalid leads by reason and by ad',
      body: [
        '| Reason | Leads |',
        '|---|---|',
        ...[...byReason].map(([reason, ids]) => `| ${reason} | ${ids.length} (${ids.join(', ')}) |`),
        '',
        '| Campaign / ad / term / landing page | Invalid |',
        '|---|---|',
        ...[...byAd].map(([k, n]) => `| ${k} | ${n} |`),
        '',
        `${unknown.length} leads have unknown attribution (${unknown.map((r) => r.id).join(', ')}): listed as unknown, not inferred.`,
      ].join('\n'),
    };
  }

  private landingAnomaly(): AgentOutputDraft {
    const s = this.settings.get();
    const off = Object.entries(s.landingPage.checks).filter(([, ok]) => !ok).map(([k]) => k);
    const liveAds = this.tasks.list().filter((t) => (t.type === 'ad_copy' || t.type === 'ad_change') && t.status === 'live');
    const finding = liveAds.length ? 'Landing page not traffic-ready while ads are live' : 'Landing page not traffic-ready';
    return {
      type: 'evidence',
      title: finding,
      body: `Landing page is \`not_ready\` (failing: ${off.join(', ')}).${liveAds.length ? ` Live ads: ${liveAds.map((t) => t.id).join(', ')}.` : ''} Act now; this does not wait for the checkpoint.`,
      immediate: liveAds.length > 0,
      evidence: [{ label: `Settings › Landing page: ${4 - off.length} of 4 checks` }, ...liveAds.map((t) => ({ label: `${t.id} status: live` }))],
      proposal: {
        kind: 'evidence',
        evidence: {
          source: 'tracking',
          finding,
          proof: [{ label: `Settings › Landing page: ${4 - off.length} of 4 checks` }],
          impact: 'Paid traffic lands on a page whose checks fail',
          blocks: 'ads',
          priority: 'P0',
          suggestedOwner: s.people.pm,
          needsApproval: false,
        },
      },
    };
  }
}
