import { humanize } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'info' | 'progress' | 'ok' | 'warn' | 'bad';

const TONES: Record<string, Tone> = {
  // tasks
  draft: 'neutral',
  // weekly report
  sent: 'ok',
  qa: 'info',
  awaiting_approval: 'warn',
  approved: 'progress',
  live: 'ok',
  verified: 'ok',
  blocked: 'bad',
  // packages
  scheduled: 'progress',
  published: 'ok',
  mismatch: 'bad',
  // briefs
  submitted: 'info',
  accepted: 'info',
  in_production: 'progress',
  delivered: 'warn',
  qa_passed: 'ok',
  qa_returned: 'bad',
  cancelled: 'neutral',
  // runs
  queued: 'neutral',
  running: 'progress',
  completed: 'ok',
  failed: 'bad',
  // evidence / leads
  open: 'warn',
  converted: 'ok',
  dismissed: 'neutral',
  pending: 'warn',
  valid: 'ok',
  invalid: 'bad',
  // facts
  confirmed: 'ok',
  confirmed_with_expiry: 'warn',
  assumption: 'bad',
  superseded: 'neutral',
  rejected: 'bad',
  // review decisions
  scale: 'ok',
  keep: 'info',
  stop: 'bad',
  wait: 'warn',
  // landing page
  traffic_ready: 'ok',
  not_ready: 'bad',
};

const CLS: Record<Tone, string> = {
  neutral: 'bg-panel text-ink-2 border-rule',
  info: 'bg-accent-soft text-accent-strong border-accent/20',
  progress: 'bg-progress-soft text-progress border-progress/20',
  ok: 'bg-ok-soft text-ok border-ok/25',
  warn: 'bg-warn-soft text-warn border-warn/30',
  bad: 'bg-bad-soft text-bad border-bad/25',
};

const DOT: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  info: 'bg-accent',
  progress: 'bg-progress',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

export function StatusChip({
  status,
  label,
  className,
  pulse,
}: {
  status: string;
  label?: string;
  className?: string;
  pulse?: boolean;
}) {
  const tone = TONES[status] ?? 'neutral';
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[0.72rem] font-medium leading-4 whitespace-nowrap',
        CLS[tone],
        className,
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', DOT[tone], pulse && 'animate-pulse-soft')}
        aria-hidden
      />
      {label ?? humanize(status)}
    </span>
  );
}
