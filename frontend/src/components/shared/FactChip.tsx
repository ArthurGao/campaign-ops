import { AlertTriangle, Check, Clock, Lock } from 'lucide-react';
import type { FactView } from '@campaign-ops/core';
import { factTone, type FactTone } from '@/lib/facts';
import { useFactIndex } from '@/api/queries/facts';
import { Tooltip } from '@/components/ui/tooltip';
import { humanize } from '@/lib/format';
import { cn } from '@/lib/utils';

const TONE: Record<FactTone, { cls: string; Icon: typeof Check; label: string }> = {
  usable: { cls: 'border-ok/35 bg-ok-soft text-ok', Icon: Check, label: 'publicly usable' },
  expiring: {
    cls: 'border-warn/40 bg-warn-soft text-warn',
    Icon: Clock,
    label: 'confirmed, expiring soon',
  },
  unconfirmed: {
    cls: 'border-bad/35 bg-bad-soft text-bad',
    Icon: AlertTriangle,
    label: 'not usable',
  },
  internal: {
    cls: 'border-internal/35 bg-internal-soft text-internal',
    Icon: Lock,
    label: 'internal — never public',
  },
};

function tooltipText(id: string, fact: FactView | undefined): string {
  if (!fact) return `${id}: not on the Fact Sheet`;
  const status = humanize(fact.status);
  const expiry = fact.expiresAt
    ? ` · expires ${new Date(fact.expiresAt).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })}`
    : '';
  return `${fact.label} — ${status}${expiry}`;
}

export function FactChip({
  id,
  fact: given,
  className,
}: {
  id: string;
  fact?: FactView;
  className?: string;
}) {
  const index = useFactIndex();
  const fact = given ?? index.get(id);
  const tone = factTone(fact);
  const { cls, Icon, label } = TONE[tone];
  return (
    <Tooltip content={tooltipText(id, fact)}>
      <span
        data-tone={tone}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm border px-1.5 py-px font-mono text-[0.72rem] font-medium leading-4 whitespace-nowrap align-baseline',
          cls,
          className,
        )}
      >
        <Icon className="size-3" aria-hidden strokeWidth={2.5} />
        {id}
        <span className="sr-only"> ({label})</span>
      </span>
    </Tooltip>
  );
}

export function FactRefs({
  ids,
  empty = 'No facts cited',
}: {
  ids: readonly string[];
  empty?: string;
}) {
  if (!ids.length) return <span className="text-xs text-ink-3">{empty}</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <FactChip key={id} id={id} />
      ))}
    </span>
  );
}
