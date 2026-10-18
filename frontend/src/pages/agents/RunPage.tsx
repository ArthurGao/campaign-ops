import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { AgentRun } from '@campaign-ops/core';
import { useAgentRun } from '@/api/queries/agents';
import { JsonPeek } from '@/components/shared/JsonPeek';
import { EmptyState, Facts, PageHeader, Section } from '@/components/shared/Layout';
import { StatusChip } from '@/components/shared/StatusChip';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { fmtDateTime, humanize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { OutputReviewItem } from './OutputReviewItem';

const STEPS: AgentRun['status'][] = ['queued', 'running', 'completed'];

/** Lifecycle strip: queued → running → completed | failed, live while polling. */
function Progress({ run }: { run: AgentRun }) {
  const at = run.status === 'failed' ? 2 : STEPS.indexOf(run.status);
  return (
    <ol
      className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-rule bg-rule"
      aria-label="Run progress"
    >
      {STEPS.map((s, i) => {
        const last = i === 2 && run.status === 'failed';
        const done =
          i < at || (i === at && (run.status === 'completed' || run.status === 'failed'));
        const current = i === at && (run.status === 'queued' || run.status === 'running');
        return (
          <li
            key={s}
            className={cn('relative bg-surface px-3 py-2 text-sm', current && 'font-semibold')}
            aria-current={current ? 'step' : undefined}
          >
            <span
              className={cn(
                'absolute inset-x-0 top-0 h-1',
                last
                  ? 'bg-bad'
                  : done
                    ? 'bg-ok'
                    : current
                      ? 'animate-pulse-soft bg-accent'
                      : 'bg-transparent',
              )}
              aria-hidden
            />
            {last ? 'Failed' : humanize(s)}
          </li>
        );
      })}
    </ol>
  );
}

export default function RunPage() {
  const { runId } = useParams();
  const { data: run, isLoading } = useAgentRun(runId);
  if (isLoading || !run) return <SkeletonRows rows={8} />;
  const active = run.status === 'queued' || run.status === 'running';
  const waiting = run.outputs.filter((o) => !o.decision).length;
  const { factSheet, ...inputs } = run.inputs as Record<string, unknown> & { factSheet?: unknown };
  return (
    <>
      <Link
        to="/agents"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Agents
      </Link>
      <PageHeader
        title={`${run.id} · ${humanize(run.agent)}`}
        lede={copy.guardrail}
        meta={
          <>
            <StatusChip status={run.status} pulse={active} />
            {run.factSheetVersion ? (
              <VersionBadge label="Fact Sheet">{run.factSheetVersion}</VersionBadge>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(16rem,1fr)]">
        <div className="grid content-start gap-4">
          <Progress run={run} />
          {active ? (
            <p className="text-sm text-ink-2" aria-live="polite">
              {run.status === 'queued' && run.trigger === 'scheduled'
                ? `Scheduled run — waits for its slot (${fmtDateTime(String(run.inputs.scheduledFor ?? ''))}). Feedback runs twice a week, not daily.`
                : 'Working… this page refreshes every 2 seconds.'}
            </p>
          ) : null}
          {run.error ? (
            <p className="rounded-md border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">
              Failed: {run.error}
            </p>
          ) : null}
          <Section
            title="Outputs"
            count={waiting ? `${run.outputs.length} · ${waiting} to review` : run.outputs.length}
            id="outputs"
          >
            {run.outputs.length ? (
              <ol className="grid gap-3">
                {run.outputs.map((o) => (
                  <OutputReviewItem key={o.id} run={run} output={o} />
                ))}
              </ol>
            ) : (
              <EmptyState title={active ? 'No outputs yet.' : 'This run produced no outputs.'} />
            )}
          </Section>
        </div>
        <aside className="grid content-start gap-4">
          <Section title="Run">
            <Facts
              rows={[
                ['Trigger', humanize(run.trigger)],
                ['Requested by', run.requestedBy.name],
                ['Started', <span className="font-mono">{fmtDateTime(run.startedAt)}</span>],
                ['Finished', <span className="font-mono">{fmtDateTime(run.finishedAt)}</span>],
                [
                  'Cost (mock)',
                  run.costEstimate ? (
                    <span className="font-mono">
                      {run.costEstimate.tokens.toLocaleString('en-NZ')} tokens · $
                      {run.costEstimate.usd.toFixed(2)}
                    </span>
                  ) : (
                    '—'
                  ),
                ],
              ]}
            />
          </Section>
          <Section title="Input snapshot">
            <Facts
              rows={Object.entries(inputs).map(([k, v]) => [
                humanize(k),
                <span className="break-words font-mono text-xs">
                  {Array.isArray(v)
                    ? v.join(', ')
                    : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v)}
                </span>,
              ])}
            />
            {factSheet ? (
              <p className="text-xs text-ink-2">
                External Fact Sheet entries only — the Outbound agent cannot see the internal page.
              </p>
            ) : null}
            <JsonPeek value={run.inputs} label="Inputs as stored" />
          </Section>
        </aside>
      </div>
    </>
  );
}
