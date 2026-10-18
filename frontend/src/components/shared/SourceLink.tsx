import { ExternalLink } from 'lucide-react';
import { copy } from '@/lib/copy';
import { sourceEntry, sourceHref } from '@/lib/source-map';
import { cn } from '@/lib/utils';

/** Link to one place in the source workflow artifact (opens in a new tab). */
export function SourceLink({
  anchor,
  what,
  className,
}: {
  anchor: string;
  /** Names the target for the tooltip and screen readers, e.g. "step 4". */
  what: string;
  className?: string;
}) {
  return (
    <a
      href={sourceHref(anchor)}
      target="_blank"
      rel="noreferrer"
      title={copy.workflow.sourceHelp(what)}
      aria-label={`${copy.workflow.sourceShort}: ${what}, opens in a new tab`}
      data-source-anchor={anchor}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-ink-2 hover:text-accent hover:underline',
        className,
      )}
    >
      {copy.workflow.sourceShort}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

/** "Source plan" link for a record the source workflow mentions (FS-04, PUB-2027CT-012, …); nothing otherwise. */
export function SourceRef({ id, className }: { id: string; className?: string }) {
  const entry = sourceEntry(id);
  return entry ? <SourceLink anchor={entry.anchor} what={id} className={className} /> : null;
}
