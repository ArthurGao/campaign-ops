import { ExternalLink } from '@/components/shared/ExternalLink';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import type { AgentOutput, AgentRun } from '@campaign-ops/core';
import { useDecideOutput } from '@/api/queries/agents';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FactRefs } from '@/components/shared/FactChip';
import { Markdown } from '@/components/shared/Markdown';
import { fmtDateTime, humanize } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const TYPE_CLS: Record<AgentOutput['type'], string> = {
  evidence: 'bg-progress-soft text-progress',
  draft: 'bg-accent-soft text-accent-strong',
  suggestion: 'bg-ok-soft text-ok',
  needs_confirmation: 'bg-bad-soft text-bad',
  observation: 'bg-panel text-ink-2',
  verification: 'bg-warn-soft text-warn',
};

/** What accepting creates (I-A1 / I-A2), said on the button. */
function acceptLabel(o: AgentOutput): string {
  const p = o.proposal;
  switch (o.type) {
    case 'evidence':
      return 'Accept → add to evidence';
    case 'draft':
      return p?.kind === 'task' && p.task.taskId
        ? `Accept → apply to ${p.task.taskId}`
        : 'Accept → create draft task';
    case 'needs_confirmation':
      return p?.kind === 'needs_confirmation' && p.taskId
        ? `Accept → block ${p.taskId}`
        : 'Accept → create blocked task';
    case 'suggestion':
      return o.inScope ? 'Accept → ad change (pre-approved)' : 'Accept → task for client approval';
    case 'verification':
      return `Accept → record ${p?.kind === 'verification' ? p.result : 'result'}`;
    default:
      return 'Accept as noted';
  }
}

const createdHref = (type?: string, id?: string) =>
  !id
    ? undefined
    : type === 'evidence'
      ? `/evidence?focus=${id}`
      : type === 'task'
        ? `/tasks?task=${id}`
        : type === 'package'
          ? `/publish/${id}`
          : undefined;

export function OutputReviewItem({ run, output }: { run: AgentRun; output: AgentOutput }) {
  const decide = useDecideOutput();
  const [rejecting, setRejecting] = useState(false);
  const d = output.decision;
  const href = createdHref(d?.createdType, d?.createdId);
  return (
    <li
      className={cn(
        'grid gap-3 rounded-md border bg-surface p-4',
        d?.status === 'rejected'
          ? 'border-rule opacity-75'
          : d
            ? 'border-ok/30'
            : 'border-accent/30',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-sm px-1.5 py-px text-[0.7rem] font-semibold uppercase tracking-wide',
            TYPE_CLS[output.type],
          )}
        >
          {humanize(output.type)}
        </span>
        <span className="font-mono text-xs text-ink-3">{output.id}</span>
        {output.inScope !== undefined ? (
          <span
            className={cn(
              'rounded-sm px-1.5 py-px text-[0.7rem] font-semibold',
              output.inScope ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn',
            )}
          >
            {output.inScope ? 'Within pre-approved scope' : 'Outside scope — client must approve'}
          </span>
        ) : null}
        {output.immediate ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-bad px-1.5 py-px text-[0.7rem] font-semibold text-white">
            <Zap className="size-3" aria-hidden /> Act now
          </span>
        ) : null}
        {output.approverRole ? (
          <span className="text-xs text-ink-2">
            {output.inScope ? 'Approved by the PM within scope' : 'Needs the client decision maker'}{' '}
            · applied by {ROLE_LABELS[output.approverRole]}
          </span>
        ) : null}
      </div>
      <h3 className="text-[0.95rem] font-semibold leading-snug">{output.title}</h3>
      <Markdown text={output.body} />
      {output.factRefs?.length ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
          Facts <FactRefs ids={output.factRefs} />
        </div>
      ) : null}
      {output.evidence?.length ? (
        <ul className="grid gap-0.5 text-xs text-ink-2">
          {output.evidence.map((e, i) => (
            <li key={i}>
              {e.url ? (
                <ExternalLink href={e.url}>{e.label}</ExternalLink>
              ) : (
                <>Evidence: {e.label}</>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3">
        {d ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn('font-semibold', d.status === 'accepted' ? 'text-ok' : 'text-ink-2')}
            >
              {d.status === 'accepted' ? 'Accepted' : 'Rejected'}
            </span>
            <span className="text-ink-2">
              by {d.by.name} · <span className="font-mono">{fmtDateTime(d.at)}</span>
            </span>
            {href ? (
              <Link to={href} className="font-medium text-accent hover:underline">
                Created {d.createdId} →
              </Link>
            ) : null}
            {d.note ? <span className="italic text-ink-2">“{d.note}”</span> : null}
          </p>
        ) : run.status === 'completed' ? (
          <>
            <ActionButton
              size="sm"
              variant="approve"
              permission="agent.decide"
              loading={decide.isPending && decide.variables?.status === 'accepted'}
              onClick={() =>
                decide.mutate({ runId: run.id, outputId: output.id, status: 'accepted' })
              }
            >
              {acceptLabel(output)}
            </ActionButton>
            <ActionButton
              size="sm"
              variant="ghost"
              permission="agent.decide"
              onClick={() => setRejecting(true)}
            >
              Reject…
            </ActionButton>
          </>
        ) : null}
      </div>
      <BlockedHint error={decide.error} />
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ${output.id}`}
        description="Nothing is created. The output stays in this run's history with your note."
        confirmLabel="Reject"
        note={{ label: 'Why', placeholder: 'e.g. duplicate of E-03' }}
        onConfirm={(note) =>
          decide.mutateAsync({
            runId: run.id,
            outputId: output.id,
            status: 'rejected',
            note: note || undefined,
          })
        }
      />
    </li>
  );
}
