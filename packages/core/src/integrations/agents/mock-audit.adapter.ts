import { AUDIT_SCOPES, type AuditScope } from '../../domain/enums';
import { AUDIT_CANDIDATES, GEO_PLATFORMS, GEO_QUESTIONS } from '../../seed/agents.seed';
import type { AgentAdapter, AgentOutputDraft } from './agent.adapter';

/** Existing backlog findings, so a re-run does not propose duplicates. */
export type BacklogReader = { findings(): { id: string; finding: string }[] };

function parseScope(raw: unknown): AuditScope[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...AUDIT_SCOPES];
  return raw.filter((s): s is AuditScope => (AUDIT_SCOPES as readonly string[]).includes(String(s)));
}

/**
 * Mock Audit agent (docs/03-agents.md): canned evidence candidates filtered by scope, plus one GEO
 * observation per question (5 questions × 2 platforms × 2 runs) when `geo` is in scope.
 */
export class MockAuditAdapter implements AgentAdapter {
  readonly id = 'audit' as const;

  constructor(private readonly backlog: BacklogReader) {}

  snapshot(inputs: Record<string, unknown>): Record<string, unknown> {
    return {
      siteUrl: String(inputs.siteUrl ?? ''),
      scope: parseScope(inputs.scope),
      geoQuestions: GEO_QUESTIONS.length,
      geoPlatforms: GEO_PLATFORMS.length,
      testEnquiryApproved: inputs.testEnquiryApproved === true,
    };
  }

  async run(inputs: Record<string, unknown>): Promise<AgentOutputDraft[]> {
    const siteUrl = String(inputs.siteUrl ?? '').trim();
    if (!siteUrl) throw new Error('No URL provided');
    const scope = parseScope(inputs.scope);
    const testEnquiryApproved = inputs.testEnquiryApproved === true;

    const existing = this.backlog.findings();
    const outputs: AgentOutputDraft[] = [];
    const alreadyLogged: string[] = [];

    for (const c of AUDIT_CANDIDATES) {
      if (!scope.includes(c.scope)) continue;
      // Sales response is only observed through a client-approved test enquiry.
      if (c.scope === 'sales' && !testEnquiryApproved) continue;
      const dup = existing.find((e) => e.finding === c.evidence.finding);
      if (dup) {
        alreadyLogged.push(dup.id);
        continue;
      }
      outputs.push({
        type: 'evidence',
        title: c.title,
        body: c.body,
        evidence: c.evidence.proof,
        proposal: { kind: 'evidence', evidence: c.evidence },
      });
    }

    if (scope.includes('sales') && !testEnquiryApproved) {
      outputs.push({
        type: 'observation',
        title: 'Sales response not checked',
        body: 'No test enquiry was approved for this run, so first-response time was not observed.',
      });
    }

    if (alreadyLogged.length) {
      outputs.push({
        type: 'observation',
        title: `${alreadyLogged.length} findings already in the backlog`,
        body: `Still present, not repeated: ${alreadyLogged.join(', ')}.`,
      });
    }

    if (scope.includes('geo')) {
      GEO_QUESTIONS.forEach((q, i) => {
        const rows = q.results
          .map((r) => `| ${r.platform} | ${r.mentioned ? 'yes' : 'no'} | ${r.accurate === null ? 'n/a' : r.accurate ? 'yes' : 'no'} | ${r.cited} |`)
          .join('\n');
        outputs.push({
          type: 'observation',
          title: `GEO Q${i + 1} — ${q.question}`,
          body: `2 runs per platform.\n\n| Platform | Mentioned | Accurate | Sources cited |\n|---|---|---|---|\n${rows}`,
        });
      });
    }
    return outputs;
  }
}
