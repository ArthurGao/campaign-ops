import { forwardRef, type HTMLAttributes } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { Task } from '@campaign-ops/core';
import type { ApiError } from '@/api/client';
import { useTaskGates } from '@/api/queries/tasks';
import { FactRefs } from '@/components/shared/FactChip';
import { GateBadges } from '@/components/shared/GateBadges';
import { RichText } from '@/components/shared/Placeholder';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { humanize } from '@/lib/format';
import { isAdTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';

function CardGates({ id }: { id: string }) {
  const { data } = useTaskGates(id);
  return data ? <GateBadges gates={data} compact /> : null;
}

type Props = HTMLAttributes<HTMLDivElement> & {
  task: Task;
  error?: ApiError | null;
  dragging?: boolean;
  onOpen(): void;
};

export const TaskCard = forwardRef<HTMLDivElement, Props>(
  ({ task, error, dragging, onOpen, className, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={cn(
        'group grid gap-2 rounded-md border bg-surface p-2.5 text-left transition-shadow duration-150',
        task.status === 'blocked' ? 'border-bad/40' : 'border-rule hover:border-ink-3/60',
        dragging && 'shadow-overlay ring-2 ring-accent/40',
        className,
      )}
    >
      <div className="grid gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[0.72rem] font-medium whitespace-nowrap text-ink-2">
            {task.id}
          </span>
          <VersionBadge className="ml-auto">v{task.version}</VersionBadge>
        </div>
        <span className="truncate text-[0.7rem] text-ink-3">
          {humanize(task.type)}
          {task.channel ? ` · ${humanize(task.channel)}` : ''}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-left text-[0.8125rem] font-semibold leading-snug text-ink hover:text-accent focus-visible:text-accent"
      >
        <RichText text={task.title} />
      </button>
      {task.factRefs.length ? <FactRefs ids={task.factRefs} /> : null}
      {isAdTask(task) &&
      task.spendEffect !== 'decrease' &&
      ['approved', 'awaiting_approval', 'qa', 'live'].includes(task.status) ? (
        <CardGates id={task.id} />
      ) : null}
      {task.blockedReason ? (
        <p className="flex items-start gap-1 text-[0.72rem] font-medium text-bad">
          <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden /> {task.blockedReason}
        </p>
      ) : null}
      {task.needsRereview ? (
        <p className="flex items-center gap-1 text-[0.72rem] font-medium text-warn">
          <RotateCcw className="size-3" aria-hidden /> Fact changed — re-review
        </p>
      ) : null}
      {task.pendingNonSubstantive ? (
        <p className="text-[0.72rem] text-ink-2">
          Non-substantive edit: {task.pendingNonSubstantive.scopeRef}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-sm bg-bad-soft px-2 py-1 text-[0.72rem] leading-snug text-bad"
        >
          <span className="font-mono font-semibold">{error.code}</span>{' '}
          {error.hint ?? error.message}
        </p>
      ) : null}
      <p className="text-[0.7rem] text-ink-3">{task.owner}</p>
    </div>
  ),
);
TaskCard.displayName = 'TaskCard';
