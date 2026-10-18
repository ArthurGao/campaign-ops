import { diffWords } from 'diff';

/** Word diff for captions and fact statements (UX rule 3). */
export function VersionDiff({
  before,
  after,
  className,
}: {
  before: string;
  after: string;
  className?: string;
}) {
  const parts = diffWords(before, after);
  return (
    <p className={className ?? 'text-sm leading-relaxed'}>
      {parts.map((p, i) =>
        p.added ? (
          <ins
            key={i}
            className="rounded-[2px] bg-ok-soft px-0.5 text-ok no-underline decoration-ok"
          >
            <span className="sr-only">added: </span>
            {p.value}
          </ins>
        ) : p.removed ? (
          <del key={i} className="rounded-[2px] bg-bad-soft px-0.5 text-bad">
            <span className="sr-only">removed: </span>
            {p.value}
          </del>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  );
}
