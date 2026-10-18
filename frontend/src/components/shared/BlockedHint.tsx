import { Ban } from 'lucide-react';
import type { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';
import { GateBadges } from './GateBadges';

/** Inline explanation next to the control that was refused (frontend rule 2). */
export function BlockedHint({ error, className }: { error?: ApiError | null; className?: string }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cn(
        'grid gap-2 rounded-md border border-bad/30 bg-bad-soft/60 px-3 py-2.5 text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Ban className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
        <div className="grid gap-0.5">
          <p className="font-medium text-ink">
            <span className="mr-1.5 font-mono text-[0.7rem] font-semibold text-bad">
              {error.code}
            </span>
            {error.message}
          </p>
          {error.hint ? <p className="text-ink-2">{error.hint}</p> : null}
        </div>
      </div>
      {error.gates ? <GateBadges gates={error.gates} /> : null}
    </div>
  );
}
