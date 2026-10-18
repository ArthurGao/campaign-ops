import { ExternalLink } from '@/components/shared/ExternalLink';
import { Link } from 'react-router-dom';

import type { EvidenceItem } from '@campaign-ops/core';
import { ActionButton } from '@/components/shared/ActionButton';
import { StatusChip } from '@/components/shared/StatusChip';
import { Checkbox } from '@/components/ui/checkbox';
import { humanize } from '@/lib/format';
import { cn } from '@/lib/utils';

const BLOCK_CLS: Record<EvidenceItem['blocks'], string> = {
  none: 'text-ink-3',
  traffic: 'bg-bad text-white',
  ads: 'bg-bad text-white',
  measurement: 'bg-warn text-white',
};

export function EvidenceTable({
  items,
  selected,
  onSelect,
  onConvert,
  onDismiss,
  focus,
  canSelect,
}: {
  items: EvidenceItem[];
  selected: Set<string>;
  onSelect(id: string, on: boolean): void;
  onConvert(item: EvidenceItem): void;
  onDismiss(item: EvidenceItem): void;
  focus?: string | null;
  canSelect: boolean;
}) {
  const selectable = items.filter((i) => i.status === 'open');
  const all = selectable.length > 0 && selectable.every((i) => selected.has(i.id));
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[74rem]">
        <thead>
          <tr>
            <th scope="col" className="w-8">
              <Checkbox
                aria-label="Select all open items"
                disabled={!canSelect || !selectable.length}
                checked={
                  all ? true : selectable.some((i) => selected.has(i.id)) ? 'indeterminate' : false
                }
                onCheckedChange={(v) => selectable.forEach((i) => onSelect(i.id, v === true))}
              />
            </th>
            <th scope="col">ID</th>
            <th scope="col">Source</th>
            <th scope="col" className="w-[30%]">
              Finding · proof
            </th>
            <th scope="col" className="min-w-[13rem]">
              Impact
            </th>
            <th scope="col">Blocks</th>
            <th scope="col">Pri.</th>
            <th scope="col">Owner</th>
            <th scope="col">Approval</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr
              key={e.id}
              id={`row-${e.id}`}
              className={cn(
                focus === e.id && 'bg-accent-soft/60',
                e.status === 'dismissed' && 'text-ink-3',
              )}
            >
              <td>
                {e.status === 'open' ? (
                  <Checkbox
                    aria-label={`Select ${e.id}`}
                    disabled={!canSelect}
                    checked={selected.has(e.id)}
                    onCheckedChange={(v) => onSelect(e.id, v === true)}
                  />
                ) : null}
              </td>
              <td className="font-mono text-[0.78rem] whitespace-nowrap">{e.id}</td>
              <td className="whitespace-nowrap">{humanize(e.source)}</td>
              <td>
                <p className="font-medium text-ink">{e.finding}</p>
                {e.isExample ? (
                  <p className="mt-0.5 text-[0.72rem] font-medium text-warn">
                    Format example only — not a diagnosis
                  </p>
                ) : null}
                <ul className="mt-1 grid gap-0.5">
                  {e.proof.map((p, i) => (
                    <li key={i} className="text-xs text-ink-2">
                      {p.url ? (
                        <ExternalLink href={p.url}>{p.label}</ExternalLink>
                      ) : (
                        <span>Proof: {p.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {e.originRunId ? (
                  <Link
                    to={`/agents/runs/${e.originRunId}`}
                    className="mt-1 inline-block font-mono text-[0.7rem] text-ink-3 hover:text-accent"
                  >
                    from {e.originRunId}
                  </Link>
                ) : null}
              </td>
              <td className="text-[0.8rem] text-ink-2">{e.impact}</td>
              <td>
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-px text-[0.72rem] font-semibold whitespace-nowrap',
                    BLOCK_CLS[e.blocks],
                  )}
                >
                  {e.blocks === 'none' ? '—' : humanize(e.blocks)}
                </span>
              </td>
              <td
                className={cn(
                  'font-mono text-[0.78rem]',
                  e.priority === 'P0' && 'font-bold text-bad',
                )}
              >
                {e.priority}
              </td>
              <td className="text-[0.8rem]">{e.suggestedOwner}</td>
              <td className="text-[0.8rem]">{e.needsApproval ? 'Needed' : '—'}</td>
              <td className="whitespace-nowrap">
                <StatusChip status={e.status} />
                {e.convertedTaskId ? (
                  <Link
                    to={`/tasks?task=${e.convertedTaskId}`}
                    className="mt-1 block font-mono text-[0.72rem] text-accent hover:underline"
                  >
                    {e.convertedTaskId} →
                  </Link>
                ) : null}
              </td>
              <td>
                {e.status === 'open' ? (
                  <div className="flex justify-end gap-1.5 whitespace-nowrap">
                    <ActionButton
                      size="sm"
                      permission="evidence.edit"
                      onClick={() => onConvert(e)}
                      aria-label={`Convert ${e.id} to a task`}
                    >
                      To task
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      permission="evidence.edit"
                      onClick={() => onDismiss(e)}
                    >
                      Dismiss
                    </ActionButton>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
