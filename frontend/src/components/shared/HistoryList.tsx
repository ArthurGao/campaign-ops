import type { AuditEvent } from '@campaign-ops/core';
import { fmtDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';

/** Audit events (who, when, what changed, reason), newest first. */
export function HistoryList({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="relative grid gap-0 border-l border-rule pl-4">
      {[...events].reverse().map((e, i) => (
        <li key={i} className="relative pb-3.5 last:pb-0">
          <span
            className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full border-2 border-surface bg-ink-3"
            aria-hidden
          />
          <p className="text-sm">
            <span className="font-medium text-ink">{e.action}</span>
            {e.detail ? <span className="text-ink-2"> · {e.detail}</span> : null}
          </p>
          {e.reason ? <p className="text-[0.8125rem] italic text-ink-2">“{e.reason}”</p> : null}
          <p className="font-mono text-[0.7rem] text-ink-3">
            {fmtDateTime(e.at)} · {e.actor.name} (
            {e.actor.name === 'System' ? 'system' : ROLE_LABELS[e.actor.role]})
          </p>
        </li>
      ))}
    </ol>
  );
}
