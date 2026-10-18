import { useEffect, useId, useState } from 'react';
import { Send } from 'lucide-react';
import { bullets, type ReportNumbers, type WeekView } from '@campaign-ops/core';
import { useSaveReport, useSendReport } from '@/api/queries/weeks';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState, Facts, Section } from '@/components/shared/Layout';
import { Markdown } from '@/components/shared/Markdown';
import { Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { copy } from '@/lib/copy';
import { fmtDateTime, humanize, money } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';

const PARTS = [
  { key: 'done', title: 'Done this week' },
  { key: 'blocked', title: 'Stuck, and on what' },
  { key: 'next', title: 'Next week' },
] as const;

function Numbers({ numbers }: { numbers: ReportNumbers }) {
  return (
    <Section title="Numbers (from the CRM side)" id="report-numbers">
      <Facts
        className="rounded-md border border-rule bg-surface p-3"
        rows={[
          ['Visits', numbers.visits ?? '—'],
          ['Valid leads', numbers.validLeads ?? '—'],
          ['Deposits', numbers.deposits ?? '—'],
          ...numbers.paid.map(
            (p) =>
              [
                humanize(p.channel),
                `${money(p.spendCents)} spent · ${p.validLeads} valid · CPL ${p.cplText}`,
              ] as [string, string],
          ),
        ]}
      />
    </Section>
  );
}

export function ReportTab({ view }: { view: WeekView }) {
  const role = useRoleStore((s) => s.role);
  const report = view.report;

  if (report?.status === 'sent') {
    return (
      <div className="grid gap-5">
        <p className="rounded-md border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ink">
          Sent {fmtDateTime(report.sentAt)} by {report.sentBy?.name}. {copy.week.sendConfirm}
        </p>
        {PARTS.map((p) => (
          <Section key={p.key} title={p.title} id={`report-${p.key}`}>
            <Markdown text={report[p.key] || '- Nothing'} />
          </Section>
        ))}
        {report.numbers ? <Numbers numbers={report.numbers} /> : null}
      </div>
    );
  }
  if (!can(role, 'week.edit').ok) {
    return <EmptyState title={copy.week.reportNotSent} />;
  }
  if (!view.isCurrent && !view.isPast) {
    return <EmptyState title="A report is written once the week has started." />;
  }
  return <ReportEditor view={view} />;
}

function ReportEditor({ view }: { view: WeekView }) {
  const id = useId();
  const save = useSaveReport();
  const send = useSendReport();
  const [confirming, setConfirming] = useState(false);
  // A saved draft wins; otherwise start from the lines the week's records suggest.
  const initial = () => ({
    done: view.report?.done ?? bullets(view.draft.done),
    blocked: view.report?.blocked ?? bullets(view.draft.blocked),
    next: view.report?.next ?? bullets(view.draft.next),
  });
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial()), [view.week, view.report?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !view.report || PARTS.some((p) => text[p.key] !== view.report?.[p.key]);

  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-2">
        {copy.week.reportHelp}{' '}
        {view.report ? 'Draft saved.' : 'Prefilled from this week’s records; edit before saving.'}
      </p>
      {PARTS.map((p) => (
        <Field key={p.key} label={p.title} htmlFor={`${id}-${p.key}`}>
          <Textarea
            id={`${id}-${p.key}`}
            rows={Math.max(3, text[p.key].split('\n').length + 1)}
            value={text[p.key]}
            onChange={(e) => setText({ ...text, [p.key]: e.target.value })}
            className="font-mono text-[0.8125rem]"
          />
        </Field>
      ))}
      <Numbers numbers={view.numbers} />
      <BlockedHint error={save.error ?? send.error} />
      <div className="flex flex-wrap gap-2">
        <ActionButton
          permission="week.edit"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate({ week: view.week, ...text })}
        >
          Save draft
        </ActionButton>
        <ActionButton
          variant="primary"
          permission="week.edit"
          blockedReason={dirty ? 'Save the draft first.' : undefined}
          onClick={() => setConfirming(true)}
        >
          <Send /> Send to client
        </ActionButton>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Send the report for week ${view.number}?`}
        description={copy.week.sendConfirm}
        confirmLabel="Send report"
        onConfirm={() => send.mutateAsync({ week: view.week })}
      />
    </div>
  );
}
