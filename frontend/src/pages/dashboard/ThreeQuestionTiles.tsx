import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import type { DashboardResponse } from '@campaign-ops/core';
import { FactChip } from '@/components/shared/FactChip';
import { StatusChip } from '@/components/shared/StatusChip';
import { humanize, minutesText } from '@/lib/format';
import { cn } from '@/lib/utils';

function Check2({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 py-1 text-sm">
      {ok ? (
        <Check className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-label="Yes" />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 text-bad" strokeWidth={2.5} aria-label="No" />
      )}
      <span className={cn(ok ? 'text-ink' : 'font-medium text-ink')}>{children}</span>
    </li>
  );
}

function Column({
  q,
  verdict,
  ok,
  children,
  link,
}: {
  q: string;
  verdict: string;
  ok: boolean;
  children: React.ReactNode;
  link: { to: string; label: string };
}) {
  return (
    <section className="grid content-start gap-3 border-t-2 border-rule-strong pt-3 md:border-l md:border-t-0 md:border-rule md:pl-5 md:pt-0 md:first:border-l-0 md:first:pl-0">
      <h2 className="text-lg font-semibold leading-tight tracking-[-0.01em]">{q}</h2>
      <p
        className={cn('flex items-center gap-2 text-sm font-semibold', ok ? 'text-ok' : 'text-bad')}
      >
        {ok ? (
          <Check className="size-4" strokeWidth={3} aria-hidden />
        ) : (
          <X className="size-4" strokeWidth={3} aria-hidden />
        )}
        {verdict}
      </p>
      <ul className="divide-y divide-rule/70">{children}</ul>
      <Link
        to={link.to}
        className="justify-self-start text-[0.8125rem] font-medium text-accent hover:underline"
      >
        {link.label} →
      </Link>
    </section>
  );
}

const CHECK_LABELS = {
  factsConfirmed: 'Page facts confirmed',
  leadFiresOnce: 'Lead event fires once',
  sourceCaptured: 'Source captured to CRM',
  reachesSales: 'Enquiry reaches sales',
} as const;

const TRACKING_LABELS = {
  ga4: 'GA4 detected',
  gtm: 'GTM detected',
  metaPixel: 'Meta Pixel detected',
  utmCaptured: 'UTM captured on the form',
  crmConnected: 'CRM receives every enquiry',
} as const;

export function ThreeQuestionTiles({ q }: { q: DashboardResponse['threeQuestions'] }) {
  const { canSell, canCatch, canMeasure } = q;
  const catchOk = canCatch.landingPageStatus === 'traffic_ready';
  const response = canCatch.lastTestEnquiry?.responseMinutes;
  const measureMissing = Object.values(canMeasure).filter((v) => !v).length;
  return (
    <div className="grid gap-6 md:grid-cols-3 md:gap-0">
      <Column
        q="Can we sell it?"
        ok={canSell.pending.length === 0}
        verdict={
          canSell.pending.length
            ? `Not yet — ${canSell.usable} of ${canSell.total} public facts usable`
            : 'Yes — every public fact confirmed'
        }
        link={{ to: '/fact-sheet', label: 'Open the Fact Sheet' }}
      >
        {canSell.pending.map((f) => (
          <li key={f.id} className="flex items-center gap-2 py-1.5 text-sm">
            <FactChip id={f.id} />
            <span className="flex-1 truncate">{f.label}</span>
            <StatusChip status={f.status} />
          </li>
        ))}
      </Column>
      <Column
        q="Can we catch enquiries?"
        ok={catchOk}
        verdict={
          catchOk
            ? 'Yes — landing page is traffic-ready'
            : `Not yet — landing page ${humanize(canCatch.landingPageStatus).toLowerCase()}`
        }
        link={{ to: '/settings', label: 'Landing page checks' }}
      >
        {(Object.keys(CHECK_LABELS) as (keyof typeof CHECK_LABELS)[]).map((k) => (
          <Check2 key={k} ok={canCatch.checks[k]}>
            {CHECK_LABELS[k]}
          </Check2>
        ))}
        {response !== undefined ? (
          <Check2 ok={response <= 120}>
            Last test enquiry answered in <span className="font-mono">{minutesText(response)}</span>
          </Check2>
        ) : null}
      </Column>
      <Column
        q="Can we measure it?"
        ok={measureMissing === 0}
        verdict={
          measureMissing
            ? `Not yet — ${measureMissing} checks missing`
            : 'Yes — tracking and CRM in place'
        }
        link={{ to: '/leads?tab=reconciliation', label: 'Reconciliation' }}
      >
        {(Object.keys(TRACKING_LABELS) as (keyof typeof TRACKING_LABELS)[]).map((k) => (
          <Check2 key={k} ok={canMeasure[k]}>
            {TRACKING_LABELS[k]}
          </Check2>
        ))}
      </Column>
    </div>
  );
}
