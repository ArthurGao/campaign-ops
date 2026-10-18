import { ExternalLink } from '@/components/shared/ExternalLink';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { PublishPackage } from '@campaign-ops/core';
import { FactRefs } from '@/components/shared/FactChip';
import { HistoryList } from '@/components/shared/HistoryList';
import { JsonPeek } from '@/components/shared/JsonPeek';
import { Facts, Section } from '@/components/shared/Layout';
import { RichText } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { VersionDiff } from '@/components/shared/VersionDiff';
import { SourceRef } from '@/components/shared/SourceLink';
import { useFactIndex } from '@/api/queries/facts';
import { copy } from '@/lib/copy';
import { fmtDateTime, humanize } from '@/lib/format';
import { ApprovalPanel, ExecutorPanel, PmPanel } from './PackagePanels';

/** UX rule 1: "Approved versions: asset v1 / caption v1 — current caption v2", side by side. */
function VersionCompare({ pkg }: { pkg: PublishPackage }) {
  const a = pkg.approval;
  const approved = a.status === 'approved';
  const assetOk = approved && a.approvedAssetVersion === pkg.asset?.version;
  const capOk = approved && a.approvedCaptionVersion === pkg.caption.version;
  const lastApprovedCaption = [...pkg.events]
    .reverse()
    .find((e) => e.action === 'approved')
    ?.detail?.match(/caption (CAP-\S+)/)?.[1];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule text-sm">
      <div className="grid gap-1.5 bg-surface px-3 py-2.5">
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-3">Approved</span>
        {approved ? (
          <span className="flex flex-wrap gap-1.5">
            <VersionBadge label="asset" tone="approved">
              {a.approvedAssetVersion ?? '—'}
            </VersionBadge>
            <VersionBadge label="caption" tone="approved">
              {a.approvedCaptionVersion}
            </VersionBadge>
          </span>
        ) : (
          <span className="text-ink-2">
            {a.status === 'rejected' ? 'Rejected' : 'Not yet'}
            {lastApprovedCaption ? (
              <span className="text-ink-3"> (earlier: {lastApprovedCaption})</span>
            ) : null}
          </span>
        )}
        {a.approver && a.at ? (
          <span className="text-xs text-ink-2">
            {a.approver.name} · <span className="font-mono">{fmtDateTime(a.at)}</span>
          </span>
        ) : null}
      </div>
      <div className="grid gap-1.5 bg-surface px-3 py-2.5">
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-3">Current</span>
        <span className="flex flex-wrap gap-1.5">
          <VersionBadge label="asset" tone={approved ? (assetOk ? 'approved' : 'stale') : 'plain'}>
            {pkg.asset?.version ?? '—'}
          </VersionBadge>
          <VersionBadge label="caption" tone={approved ? (capOk ? 'approved' : 'stale') : 'plain'}>
            {pkg.caption.version}
          </VersionBadge>
        </span>
        {approved && !(assetOk && capOk) ? (
          <span className="text-xs font-medium text-warn">Changed since approval</span>
        ) : null}
      </div>
    </div>
  );
}

export function PackageView({ pkg }: { pkg: PublishPackage }) {
  const facts = useFactIndex();
  const internal = pkg.factRefs.filter((id) => facts.get(id)?.page === 'internal');
  const approvedCaption = pkg.captionHistory.find(
    (c) => c.version === pkg.approval.approvedCaptionVersion,
  );
  const previous =
    pkg.captionHistory.length > 1 ? pkg.captionHistory[pkg.captionHistory.length - 2] : undefined;
  const compareTo =
    approvedCaption && approvedCaption.version !== pkg.caption.version
      ? approvedCaption
      : pkg.status === 'awaiting_approval'
        ? previous
        : undefined;
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-lg font-semibold">{pkg.id}</h2>
        <StatusChip status={pkg.status} />
        <SourceRef id={pkg.id} />
        {pkg.takenDown ? (
          <span className="rounded-sm bg-ink px-1.5 py-px text-[0.7rem] font-semibold text-white">
            Taken down
          </span>
        ) : null}
        <span className="text-sm text-ink-2">
          {humanize(pkg.channel)} · {pkg.account}
        </span>
        <Link
          to={`/tasks?task=${pkg.sourceTaskId}`}
          className="ml-auto font-mono text-sm text-accent hover:underline"
        >
          {pkg.sourceTaskId}
        </Link>
      </header>
      {internal.length ? (
        <p className="flex gap-2 rounded-md border border-internal/40 bg-internal-soft px-3 py-2 text-sm text-internal">
          <AlertTriangle className="size-4" aria-hidden />
          {copy.internalFactWarning}
        </p>
      ) : null}
      {pkg.needsConfirmation ? (
        <p className="rounded-md border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">
          Cites a fact that is not publicly usable: cannot be approved or scheduled until the client
          confirms it.
        </p>
      ) : null}
      {pkg.needsRereview ? (
        <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
          A cited Fact Sheet entry changed after this package was built. Re-check the caption.
        </p>
      ) : null}
      <VersionCompare pkg={pkg} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
        <div className="grid content-start gap-5">
          <Section title="Caption" actions={<VersionBadge>{pkg.caption.version}</VersionBadge>}>
            <div className="rounded-md border border-rule bg-surface px-3.5 py-3 text-[0.95rem] leading-relaxed">
              <RichText text={pkg.caption.text} />
            </div>
            {compareTo ? (
              <div className="grid gap-1 rounded-md border border-dashed border-rule px-3.5 py-2.5">
                <span className="text-xs text-ink-2">
                  Changes from <span className="font-mono">{compareTo.version}</span> to{' '}
                  <span className="font-mono">{pkg.caption.version}</span>
                </span>
                <VersionDiff before={compareTo.text} after={pkg.caption.text} />
              </div>
            ) : null}
          </Section>
          <Section title="Package">
            <Facts
              rows={[
                [
                  'Asset',
                  pkg.asset ? (
                    <ExternalLink href={pkg.asset.url} className="font-mono">
                      {pkg.asset.assetId}
                    </ExternalLink>
                  ) : (
                    'Text only'
                  ),
                ],
                ...(pkg.asset
                  ? ([
                      ['Checksum', <span className="font-mono text-xs">{pkg.asset.checksum}</span>],
                    ] as [string, React.ReactNode][])
                  : []),
                [
                  'Link',
                  <span className="grid gap-0.5">
                    <span className="break-all font-mono text-xs">{pkg.link}</span>
                    <span className="text-[0.7rem] text-ink-3">
                      Generated from the UTM template · read-only
                    </span>
                  </span>,
                ],
                ['Scheduled', <span className="font-mono">{fmtDateTime(pkg.scheduledAt)}</span>],
                ['Facts', <FactRefs ids={pkg.factRefs} />],
                ['Fact Sheet', <VersionBadge>{pkg.factSheetVersion}</VersionBadge>],
                [
                  'QA',
                  pkg.qa ? (
                    <span className={pkg.qa.passed ? 'text-ok' : 'text-bad'}>
                      {pkg.qa.passed ? 'Passed' : 'Failed'} · {pkg.qa.by.name}
                    </span>
                  ) : (
                    '—'
                  ),
                ],
                ['Executor', pkg.executor],
                ...(pkg.sourceBriefId
                  ? ([
                      [
                        'Brief',
                        <Link
                          to={`/factory/${pkg.sourceBriefId}`}
                          className="font-mono text-accent hover:underline"
                        >
                          {pkg.sourceBriefId}
                        </Link>,
                      ],
                    ] as [string, React.ReactNode][])
                  : []),
                ...(pkg.verificationNote
                  ? ([
                      ['Verification', <span className="text-bad">{pkg.verificationNote}</span>],
                    ] as [string, React.ReactNode][])
                  : []),
              ]}
            />
          </Section>
        </div>
        <div className="grid content-start gap-3">
          <ApprovalPanel pkg={pkg} />
          <ExecutorPanel pkg={pkg} />
          <PmPanel pkg={pkg} />
        </div>
      </div>
      <Section title="Publish log" count={pkg.publishLog.length}>
        {pkg.publishLog.length ? (
          <ol className="grid gap-1 text-sm">
            {pkg.publishLog.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-3">{fmtDateTime(e.at)}</span>
                <StatusChip
                  status={e.action === 'taken_down' ? 'cancelled' : e.action}
                  label={humanize(e.action)}
                />
                <span className="text-ink-2">{e.actor.name}</span>
                {e.postUrl ? (
                  <ExternalLink
                    href={e.postUrl}
                    className="break-all font-mono text-xs"
                    icon={false}
                  >
                    {e.postUrl}
                  </ExternalLink>
                ) : null}
                {e.note ? <span className="italic text-ink-2">“{e.note}”</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-3">Nothing scheduled or published yet.</p>
        )}
      </Section>
      <Section title="History">
        <HistoryList events={pkg.events} />
      </Section>
      <JsonPeek value={pkg} label="Package JSON as stored" />
    </div>
  );
}
