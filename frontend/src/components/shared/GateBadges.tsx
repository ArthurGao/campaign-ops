import { Check, X } from 'lucide-react';
import type { AdGates } from '@campaign-ops/core';
import { adGateList, type Gate } from '@/lib/gates';
import { cn } from '@/lib/utils';

/**
 * The gate strip, the app's signature: numbered segments that fill green as each condition passes,
 * with the unmet ones named. One component for ad gates (R3) and the landing-page checks, in a full
 * form (drawers, dashboard, blocked-action hints) and a compact form (kanban cards).
 */
export function GateStrip({
  title,
  gates,
  compact = false,
  blockedText,
  className,
}: {
  title: string;
  gates: Gate[];
  compact?: boolean;
  /** Shown after the count while any gate is unmet, e.g. "cannot go live". */
  blockedText?: string;
  className?: string;
}) {
  const passed = gates.filter((g) => g.ok).length;
  const total = gates.length;
  const firstUnmet = gates.find((g) => !g.ok);

  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-1.5', className)}
        aria-label={`${title} ${passed} of ${total} passed${firstUnmet ? `, first unmet: ${firstUnmet.short}` : ''}`}
        role="img"
      >
        <ol className="flex gap-0.5" aria-hidden>
          {gates.map((g, i) => (
            <li
              key={`${g.key}-${g.ok}`}
              className={cn(
                'grid h-3.5 w-4 origin-left place-items-center rounded-[2px] font-mono text-[0.55rem] font-bold leading-none',
                g.ok
                  ? 'animate-gate-fill bg-ok text-white'
                  : 'border border-bad bg-bad-soft text-bad',
              )}
            >
              {i + 1}
            </li>
          ))}
        </ol>
        <span
          className={cn(
            'min-w-0 truncate font-mono text-[0.68rem] font-semibold',
            firstUnmet ? 'text-bad' : 'text-ok',
          )}
          aria-hidden
        >
          {passed}/{total}
          {firstUnmet ? <span className="font-sans font-medium"> · {firstUnmet.short}</span> : null}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-2">{title}</span>
        <span
          className={cn('font-mono text-xs font-semibold', firstUnmet ? 'text-bad' : 'text-ok')}
        >
          {passed}/{total} {firstUnmet && blockedText ? `passed — ${blockedText}` : 'passed'}
        </span>
      </div>
      <ol
        className={cn(
          'grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule',
          total === 4 && 'sm:grid-cols-4',
        )}
      >
        {gates.map((g, i) => (
          <li
            key={g.key}
            data-gate={g.key}
            data-ok={g.ok}
            className={cn(
              'relative grid content-start gap-0.5 bg-surface px-2.5 py-2',
              !g.ok &&
                'bg-[repeating-linear-gradient(135deg,var(--color-bad-soft)_0_6px,var(--color-surface)_6px_12px)]',
            )}
          >
            <span
              key={`${g.key}-${g.ok}`}
              className={cn(
                'absolute inset-x-0 top-0 h-1 origin-left',
                g.ok ? 'animate-gate-fill bg-ok' : 'bg-bad',
              )}
              aria-hidden
            />
            <span className="flex items-center gap-1 pt-0.5 font-mono text-[0.68rem] text-ink-3">
              Gate {i + 1}
              {g.ok ? (
                <Check className="size-3 text-ok" strokeWidth={3} aria-hidden />
              ) : (
                <X className="size-3 text-bad" strokeWidth={3} aria-hidden />
              )}
            </span>
            <span
              className={cn(
                'text-[0.8125rem] font-semibold leading-tight',
                g.ok ? 'text-ink' : 'text-bad',
              )}
            >
              {g.short}
            </span>
            <span className="text-[0.72rem] leading-snug text-ink-2">
              <span className="sr-only">{g.ok ? 'Passed: ' : 'Not met: '}</span>
              {g.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The four ad gates (R3) as a gate strip. */
export function GateBadges({
  gates,
  compact = false,
  className,
}: {
  gates: AdGates;
  compact?: boolean;
  className?: string;
}) {
  return (
    <GateStrip
      title="Ad gates"
      gates={adGateList(gates)}
      compact={compact}
      blockedText="cannot go live"
      className={className}
    />
  );
}
