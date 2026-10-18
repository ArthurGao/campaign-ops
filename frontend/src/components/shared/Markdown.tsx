import { Fragment, type ReactNode } from 'react';
import { RichText } from './Placeholder';

/** Inline: **bold**, `code`, plus fact chips and placeholders. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="break-all rounded-sm bg-panel px-1 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    return <RichText key={i} text={part} />;
  });
}

function table(lines: string[], key: number) {
  const rows = lines
    .filter((l) => !/^\|\s*-/.test(l))
    .map((l) =>
      l
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim()),
    );
  const [head, ...body] = rows;
  return (
    <div key={key} className="overflow-x-auto rounded-md border border-rule">
      <table className="data-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={
                    /^[\d$,.\s×%()-]+$/.test(c) ? 'tabular text-right font-mono' : 'tabular'
                  }
                >
                  {inline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The small markdown subset agent outputs use: paragraphs, tables, bold, code, and diff lines
 * ('+ added', '- removed'). Renders React elements only, never raw HTML.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('|')) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) tbl.push(lines[i++]);
      blocks.push(table(tbl, blocks.length));
      continue;
    }
    if (/^[+-] /.test(line)) {
      const diff: string[] = [];
      while (i < lines.length && /^[+-] /.test(lines[i])) diff.push(lines[i++]);
      blocks.push(
        <ul key={blocks.length} className="grid gap-1 font-mono text-[0.8rem]">
          {diff.map((d, j) => (
            <li
              key={j}
              className={
                d.startsWith('+')
                  ? 'rounded-sm bg-bad-soft px-2 py-1 text-bad'
                  : 'rounded-sm bg-ok-soft px-2 py-1 text-ok'
              }
            >
              <span className="sr-only">
                {d.startsWith('+') ? 'Only live: ' : 'Only approved: '}
              </span>
              {d}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim()) {
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith('|') &&
        !/^[+-] /.test(lines[i])
      )
        para.push(lines[i++]);
      blocks.push(
        <p key={blocks.length} className="leading-relaxed">
          {para.map((p, j) => (
            <Fragment key={j}>
              {j > 0 ? <br /> : null}
              {inline(p)}
            </Fragment>
          ))}
        </p>,
      );
      continue;
    }
    i++;
  }
  return <div className="grid gap-2.5 text-sm text-ink-2">{blocks}</div>;
}
