import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Page title on a heavy rule (swiss-grid detail), one-line purpose, actions at right. */
export function PageHeader({
  title,
  lede,
  actions,
  meta,
  steps,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  /** Workflow steps this screen serves (docs/workflow-source.md). */
  steps?: number[];
}) {
  return (
    <header className="page-rule mb-5 flex flex-wrap items-end gap-x-6 gap-y-3 pb-3">
      <div className="min-w-[min(100%,26rem)] flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.015em] text-ink">
            {title}
          </h1>
          {meta}
          {steps?.length ? (
            <Link
              to={`/workflow#step-${steps[0]}`}
              className="text-xs font-medium text-accent hover:underline"
              title="Where this screen sits in the ten-step workflow"
            >
              Workflow step{steps.length > 1 ? 's' : ''} {steps.join(' · ')} →
            </Link>
          ) : null}
        </div>
        {lede ? <p className="mt-1 max-w-[72ch] text-sm text-ink-2">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  count,
  actions,
  children,
  className,
  id,
}: {
  title: string;
  count?: number | string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn('grid content-start gap-3', className)}>
      <div className="flex items-center gap-2 border-b border-rule pb-1.5">
        <h2 id={id} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {count !== undefined ? <span className="font-mono text-xs text-ink-3">{count}</span> : null}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: typeof Inbox;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid justify-items-start gap-2 rounded-md border border-dashed border-rule bg-surface px-4 py-5',
        className,
      )}
    >
      <Icon className="size-5 text-ink-3" aria-hidden />
      <p className="text-sm font-semibold text-ink">{title}</p>
      {body ? <div className="max-w-[60ch] text-sm text-ink-2">{body}</div> : null}
      {action}
    </div>
  );
}

/** Key/value rows in a definition list. */
export function Facts({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-[minmax(7rem,max-content)_1fr] gap-x-4 gap-y-1.5 text-sm',
        className,
      )}
    >
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
