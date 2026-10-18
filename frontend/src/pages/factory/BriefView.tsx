import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Brief, BriefStatus } from '@campaign-ops/core';
import { useCancelBrief, useSendBrief } from '@/api/queries/factory';
import { usePackages } from '@/api/queries/packages';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FactRefs } from '@/components/shared/FactChip';
import { HistoryList } from '@/components/shared/HistoryList';
import { JsonPeek } from '@/components/shared/JsonPeek';
import { Facts, Section } from '@/components/shared/Layout';
import { StatusChip } from '@/components/shared/StatusChip';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmtDateTime, humanize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { QAChecklist } from './QAChecklist';
import { ReceiptView } from './ReceiptView';

const FLOW: BriefStatus[] = [
  'draft',
  'submitted',
  'accepted',
  'in_production',
  'delivered',
  'qa_passed',
];

function Timeline({ status }: { status: BriefStatus }) {
  const idx = status === 'qa_returned' ? 4 : status === 'cancelled' ? -1 : FLOW.indexOf(status);
  return (
    <ol
      className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-6"
      aria-label="Brief status"
    >
      {FLOW.map((s, i) => {
        const done = i <= idx;
        const here = i === idx;
        const moving = here && ['submitted', 'accepted', 'in_production'].includes(status);
        return (
          <li
            key={s}
            className={cn(
              'relative bg-surface px-2 py-1.5 text-[0.75rem]',
              here ? 'font-semibold text-ink' : done ? 'text-ink-2' : 'text-ink-3',
            )}
            aria-current={here ? 'step' : undefined}
          >
            <span
              className={cn(
                'absolute inset-x-0 top-0 h-1',
                moving ? 'animate-pulse-soft bg-accent' : done ? 'bg-ok' : 'bg-transparent',
              )}
              aria-hidden
            />
            {i === 5 && status === 'qa_returned' ? 'QA returned' : humanize(s)}
          </li>
        );
      })}
    </ol>
  );
}

export function BriefView({ brief }: { brief: Brief }) {
  const send = useSendBrief();
  const cancel = useCancelBrief();
  const [cancelling, setCancelling] = useState(false);
  const packages = (usePackages().data ?? []).filter((p) => p.sourceBriefId === brief.id);
  const latest = brief.receipts.at(-1);
  const inFlight = ['submitted', 'accepted', 'in_production'].includes(brief.status);
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-lg font-semibold">{brief.id}</h2>
        <StatusChip status={brief.status} pulse={inFlight} />
        <VersionBadge>brief v{brief.version}</VersionBadge>
        <Link
          to={`/tasks?task=${brief.taskId}`}
          className="font-mono text-sm text-accent hover:underline"
        >
          {brief.taskId}
        </Link>
        {brief.needsRereview ? (
          <span className="rounded-sm bg-warn-soft px-1.5 py-px text-[0.7rem] font-semibold text-warn">
            Fact changed — re-review
          </span>
        ) : null}
        <div className="ml-auto flex gap-2">
          {brief.status === 'draft' || brief.status === 'qa_returned' ? (
            <ActionButton
              variant="primary"
              size="sm"
              permission="factory.write"
              loading={send.isPending}
              onClick={() => send.mutate(brief.id)}
            >
              {brief.status === 'draft'
                ? 'Send to factory'
                : `Send v${brief.version} for re-render`}
            </ActionButton>
          ) : null}
          {!['qa_passed', 'cancelled'].includes(brief.status) ? (
            <ActionButton
              variant="ghost"
              size="sm"
              permission="factory.write"
              onClick={() => setCancelling(true)}
            >
              Cancel brief
            </ActionButton>
          ) : null}
        </div>
      </header>
      <Timeline status={brief.status} />
      {inFlight ? (
        <p className="text-sm text-ink-2" aria-live="polite">
          The factory is working. This page refreshes every 2 seconds.
        </p>
      ) : null}
      <BlockedHint error={send.error} />
      {brief.status === 'delivered' && latest ? <QAChecklist brief={brief} /> : null}
      {packages.length ? (
        <p className="flex flex-wrap items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
          QA passed — packages created:
          {packages.map((p) => (
            <Link key={p.id} to={`/publish/${p.id}`} className="font-mono font-semibold underline">
              {p.id}
            </Link>
          ))}
        </p>
      ) : null}
      <Section title="Brief">
        <Facts
          rows={[
            ['Objective', brief.objective],
            ['Market', brief.marketLanguage],
            ['Allowed facts', <FactRefs ids={brief.allowedFacts} />],
            ['Forbidden', brief.forbidden.join('; ')],
            [
              'Deliverables',
              <span className="font-mono text-xs">
                {brief.deliverables.map((d) => `${d.ratio} → ${d.channel}`).join(' · ')}
              </span>,
            ],
            ['Requirements', brief.requirements.join('; ')],
            ['Deadline', <span className="font-mono">{fmtDateTime(brief.deadline)}</span>],
            [
              'Cost cap',
              <span className="font-mono">
                {brief.costCap.maxCredits} credits · {brief.costCap.maxRerenders} re-renders
              </span>,
            ],
            ['Approver', brief.approver],
            [
              'Idempotency key',
              brief.idempotencyKey ? (
                <span className="font-mono">{brief.idempotencyKey}</span>
              ) : (
                <span className="text-ink-3">
                  Not sent — factory does not declare support; duplicate check by task id instead
                </span>
              ),
            ],
            ['Fact Sheet', <VersionBadge>{brief.factSheetVersion}</VersionBadge>],
          ]}
        />
        {brief.returnNotes.length ? (
          <ul className="grid gap-1 text-sm">
            {brief.returnNotes.map((n) => (
              <li key={n.version} className="rounded-sm bg-bad-soft/60 px-2.5 py-1.5 text-bad">
                Returned v{n.version} ·{' '}
                <span className="font-mono text-xs">{fmtDateTime(n.at)}</span> — {n.note}
              </li>
            ))}
          </ul>
        ) : null}
        <JsonPeek value={brief} label="Brief JSON as stored" />
      </Section>
      {brief.receipts.length ? (
        <Section title="Receipts" count={brief.receipts.length}>
          <Tabs defaultValue={latest?.version}>
            <TabsList>
              {brief.receipts.map((r) => (
                <TabsTrigger key={r.version} value={r.version}>
                  Receipt {r.version}
                </TabsTrigger>
              ))}
            </TabsList>
            {brief.receipts.map((r) => (
              <TabsContent key={r.version} value={r.version}>
                <ReceiptView brief={brief} receipt={r} />
              </TabsContent>
            ))}
          </Tabs>
        </Section>
      ) : null}
      {brief.qa ? (
        <Section title="QA record">
          <p className={cn('text-sm font-semibold', brief.qa.passed ? 'text-ok' : 'text-bad')}>
            {brief.qa.passed ? 'Passed' : 'Returned'} on receipt {brief.qa.receiptVersion} ·
            reviewed by {brief.qa.reviewerName ?? brief.qa.by.name} ·{' '}
            <span className="font-mono font-normal">{fmtDateTime(brief.qa.at)}</span>
          </p>
        </Section>
      ) : null}
      <Section title="History">
        <HistoryList events={brief.events} />
      </Section>
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={`Cancel ${brief.id}`}
        description="A cancelled brief frees the task for a new brief."
        confirmLabel="Cancel brief"
        tone="danger"
        note={{ label: 'Reason' }}
        onConfirm={(note) => cancel.mutateAsync({ id: brief.id, note: note || undefined })}
      />
    </div>
  );
}
