import { Fragment, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ExternalLink, RotateCcw, Stamp } from 'lucide-react';
import { EmptyState, PageHeader, Section } from '@/components/shared/Layout';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { useStepStatus, type StepTone } from './useStepStatus';

const TONE: Record<StepTone, { label: string; dot: string; text: string }> = {
  ok: { label: 'On track', dot: 'bg-ok', text: 'text-ok' },
  waiting: { label: 'Waiting', dot: 'bg-warn', text: 'text-warn' },
  blocked: { label: 'Blocked', dot: 'bg-bad', text: 'text-bad' },
};

export default function WorkflowPage() {
  const status = useStepStatus();
  const w = copy.workflow;
  const { hash } = useLocation();
  // Step tags on other screens link to /workflow#step-N; jump there once the steps have rendered.
  useEffect(() => {
    if (status && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [status, hash]);
  return (
    <>
      <PageHeader
        title={copy.pages.workflow.title}
        lede={copy.pages.workflow.lede}
        actions={
          <a
            href={w.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            {w.sourceLabel} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        }
      />
      {!status ? (
        <SkeletonRows rows={10} />
      ) : (
        <div className="grid gap-10">
          <ol className="grid gap-0" aria-label="Ten steps">
            {w.steps.map((s, i) => {
              const st = status[s.n];
              const newGroup = i === 0 || w.steps[i - 1].group !== s.group;
              const gate = 'gate' in s && s.gate;
              return (
                <Fragment key={s.n}>
                  {newGroup ? (
                    <li
                      aria-hidden
                      className={cn(
                        'mb-3 border-b border-rule pb-1.5 text-sm font-semibold text-ink',
                        i > 0 && 'mt-6',
                      )}
                    >
                      {w.groups[s.group as keyof typeof w.groups]}
                    </li>
                  ) : null}
                  <li
                    id={`step-${s.n}`}
                    className="relative grid scroll-mt-20 grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-2"
                  >
                    <span
                      className="absolute bottom-0 left-[1.06rem] top-9 w-px bg-rule"
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'relative z-[1] grid size-9 place-items-center font-mono text-sm font-bold',
                        gate
                          ? 'rounded-sm bg-rail text-white'
                          : 'rounded-full border-2 border-rule-strong bg-surface text-ink',
                      )}
                      aria-hidden
                    >
                      {s.n}
                    </span>
                    <div
                      className={cn(
                        'grid gap-2 rounded-md border bg-surface px-4 py-3',
                        gate ? 'border-rail' : 'border-rule',
                      )}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-[0.95rem] font-semibold">
                          <span className="sr-only">Step {s.n}: </span>
                          {s.title}
                        </h2>
                        {gate ? (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-rail px-1.5 py-px text-[0.68rem] font-semibold uppercase tracking-wide text-white">
                            <Stamp className="size-3" aria-hidden /> {w.gate}
                          </span>
                        ) : null}
                        <span className="ml-auto flex flex-wrap gap-1">
                          {s.roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-sm border border-rule bg-ground px-1.5 py-px text-[0.7rem] text-ink-2"
                            >
                              {r}
                            </span>
                          ))}
                        </span>
                      </div>
                      <p className="text-sm text-ink-2">{s.summary}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-rule pt-2">
                        <p className="flex min-w-0 flex-1 items-start gap-2 text-[0.8125rem]">
                          <span
                            className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE[st.tone].dot)}
                            aria-hidden
                          />
                          <span>
                            <span className={cn('font-semibold', TONE[st.tone].text)}>
                              {TONE[st.tone].label}:
                            </span>{' '}
                            <span className="text-ink">{st.text}</span>
                          </span>
                        </p>
                        <span className="flex flex-wrap gap-3">
                          {st.links.map((l) => (
                            <Link
                              key={l.to}
                              to={l.to}
                              className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent hover:underline"
                            >
                              {l.label} <ArrowRight className="size-3.5" aria-hidden />
                            </Link>
                          ))}
                        </span>
                      </div>
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ol>
          <p className="-mt-6 flex items-start gap-2 pl-[3.25rem] text-sm text-ink-2">
            <RotateCcw className="mt-0.5 size-4 shrink-0" aria-hidden />
            {w.loop}
          </p>

          <Section title="When something goes wrong" count={w.exceptions.length} id="exceptions">
            <div className="overflow-x-auto rounded-md border border-rule bg-surface">
              <table className="data-table min-w-[48rem]">
                <thead>
                  <tr>
                    <th scope="col">Situation</th>
                    <th scope="col">What happens</th>
                    <th scope="col">Where in CampaignOps</th>
                  </tr>
                </thead>
                <tbody>
                  {w.exceptions.map(([a, b, c]) => (
                    <tr key={a}>
                      <th
                        scope="row"
                        className="!bg-transparent !text-[0.8125rem] !font-medium !normal-case !tracking-normal text-ink"
                      >
                        {a}
                      </th>
                      <td className="text-ink-2">{b}</td>
                      <td className="text-ink-2">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Rules every agent follows" count={w.rules.length} id="rules">
            {w.rules.length ? (
              <dl className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2">
                {w.rules.map(([k, v]) => (
                  <div key={k} className="grid gap-1 bg-surface px-3.5 py-3">
                    <dt className="text-sm font-semibold">{k}</dt>
                    <dd className="text-[0.8125rem] text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyState title="No rules recorded." />
            )}
          </Section>
        </div>
      )}
    </>
  );
}
