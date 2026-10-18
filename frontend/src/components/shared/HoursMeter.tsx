import { cn } from '@/lib/utils';

/** The PM's hours against the weekly cap; red once over. `buffer` marks the reserved tail. */
export function HoursMeter({
  used,
  cap,
  buffer,
  bufferHelp,
}: {
  used: number;
  cap: number;
  buffer?: number;
  bufferHelp?: string;
}) {
  const width = (n: number) => `${Math.min(100, (n / cap) * 100)}%`;
  return (
    <div
      className="relative h-2.5 overflow-hidden rounded-sm bg-panel"
      role="meter"
      aria-label="PM hours this week"
      aria-valuemin={0}
      aria-valuemax={cap}
      aria-valuenow={used}
    >
      <div
        className={cn('h-full', used > cap ? 'bg-bad' : 'bg-rail-2')}
        style={{ width: width(used) }}
      />
      {buffer ? (
        <div
          className="absolute inset-y-0 right-0 border-l border-dashed border-ink-3/70"
          style={{ width: width(buffer) }}
          title={bufferHelp}
        />
      ) : null}
    </div>
  );
}
