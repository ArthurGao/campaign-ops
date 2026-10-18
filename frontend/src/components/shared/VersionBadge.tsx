import { cn } from '@/lib/utils';

/** Small mono version stamp (UX rule 3). tone="stale" when it differs from what was approved. */
export function VersionBadge({
  children,
  label,
  tone = 'plain',
  className,
}: {
  children: React.ReactNode;
  label?: string;
  tone?: 'plain' | 'approved' | 'stale';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 font-mono text-[0.7rem] leading-[1.15rem] whitespace-nowrap',
        tone === 'plain' && 'border-rule bg-ground text-ink-2',
        tone === 'approved' && 'border-ok/35 bg-ok-soft text-ok',
        tone === 'stale' && 'border-warn/40 bg-warn-soft text-warn',
        className,
      )}
    >
      {label ? (
        <span className="font-sans text-[0.68rem] font-medium opacity-80">{label}</span>
      ) : null}
      {children}
    </span>
  );
}
