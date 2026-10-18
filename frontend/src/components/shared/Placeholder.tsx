import { Fragment } from 'react';
import { FS_ID } from '@campaign-ops/core';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { FactChip } from './FactChip';

/** UX rule 6: '[date TBC]' renders muted and mono, never like a real value. */
export function Placeholder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      title={copy.placeholderHelp}
      className={cn(
        'whitespace-nowrap rounded-[2px] border border-dashed border-ink-3/50 bg-panel/70 px-1 font-mono text-[0.85em] text-ink-3',
        className,
      )}
    >
      {children}
    </span>
  );
}

const TOKEN = new RegExp(`(\\[← ${FS_ID}\\]|\\[[^\\]]*TBC[^\\]]*\\]|\\[[A-Za-z]\\])`);
const IS_PLACEHOLDER = /^(\[[^\]]*TBC[^\]]*\]|\[[A-Za-z]\])$/;

/** Text with inline FS citations as fact chips and [TBC] tokens as placeholders. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        const fs = new RegExp(`^\\[← (${FS_ID})\\]$`).exec(p);
        if (fs) return <FactChip key={i} id={fs[1]} className="mx-0.5" />;
        if (IS_PLACEHOLDER.test(p)) return <Placeholder key={i}>{p}</Placeholder>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </span>
  );
}
