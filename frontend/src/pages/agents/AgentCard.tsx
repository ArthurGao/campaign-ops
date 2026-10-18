import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import type { AgentCard as Card } from '@campaign-ops/core';
import { ActionButton } from '@/components/shared/ActionButton';
import { StatusChip } from '@/components/shared/StatusChip';
import { fmtDateTime } from '@/lib/format';
import { RunForm } from './RunForm';

export function AgentCard({ agent }: { agent: Card }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      className="grid content-start gap-3 rounded-md border border-rule bg-surface p-4"
      aria-labelledby={`agent-${agent.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`agent-${agent.id}`} className="text-lg font-semibold">
            {agent.name}
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">{agent.role}</p>
        </div>
        {!open ? (
          <ActionButton
            variant="primary"
            size="sm"
            permission="agent.run"
            onClick={() => setOpen(true)}
          >
            Run
          </ActionButton>
        ) : null}
      </header>
      <div className="grid gap-3 text-[0.8125rem] sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-3">Reads</h3>
          <ul className="grid gap-0.5 text-ink-2">
            {agent.reads.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-3">
            Permissions
          </h3>
          <ul className="grid gap-0.5 text-ink-2">
            {agent.permissions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-sm bg-panel px-2.5 py-2 text-[0.8125rem] font-medium text-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
        {agent.guardrail}
      </p>
      {agent.lastRun ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
          Last run
          <Link
            to={`/agents/runs/${agent.lastRun.id}`}
            className="font-mono text-accent hover:underline"
          >
            {agent.lastRun.id}
          </Link>
          <StatusChip status={agent.lastRun.status} />
          <span className="font-mono">
            {fmtDateTime(agent.lastRun.finishedAt ?? agent.lastRun.startedAt)}
          </span>
        </p>
      ) : null}
      {open ? <RunForm agent={agent.id} onCancel={() => setOpen(false)} /> : null}
    </article>
  );
}
