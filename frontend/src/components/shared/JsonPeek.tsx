import { Braces } from 'lucide-react';

/** The record exactly as stored, collapsed by default (docs/05: interviewers recognise the plan's samples). */
export function JsonPeek({ value, label = 'View JSON' }: { value: unknown; label?: string }) {
  return (
    <details className="group rounded-md border border-rule bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-ink-2 hover:text-ink">
        <Braces className="size-3.5" aria-hidden />
        {label}
        <span className="ml-auto font-mono text-[0.68rem] text-ink-3 group-open:hidden">
          collapsed
        </span>
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-rule bg-rail p-3 font-mono text-[0.72rem] leading-relaxed text-rail-ink">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
