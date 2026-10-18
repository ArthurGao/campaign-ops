import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import type { AssumptionCheck, ReviewView } from '@campaign-ops/core';
import { useReview, useSaveReview, useSendReview } from '@/api/queries/review';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState, PageHeader, Section } from '@/components/shared/Layout';
import { Markdown } from '@/components/shared/Markdown';
import { SourceLink } from '@/components/shared/SourceLink';
import { Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { fmtDateTime, fmtDay, humanize, money, pct } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';
import { ChannelTable, type Decisions } from './ChannelTable';

function Assumption({ check }: { check: AssumptionCheck }) {
  return (
    <Section title="Close-rate assumption" id="review-assumption">
      <div className="grid gap-1 rounded-md border border-rule bg-surface p-3 text-sm">
        <p>
          <Link
            to={`/fact-sheet?tab=internal&fact=${check.factId}#fact-${check.factId}`}
            className="font-mono font-semibold text-accent hover:underline"
          >
            {check.factId}
          </Link>{' '}
          {check.statement}
        </p>
        <p className="text-ink-2">
          Real: {check.deposits} of {check.validLeads} valid leads booked
          {check.rate !== null ? ` (${pct(check.rate)})` : ''}.{' '}
          {check.enough
            ? 'The sample is big enough: replace the assumption on the Fact Sheet.'
            : 'Too few valid leads: keep the assumption and say so.'}
        </p>
      </div>
    </Section>
  );
}

/** What the PM saved; the rule's suggestions are never shown as decisions. */
const saved = (v: ReviewView): Decisions =>
  Object.fromEntries((v.review?.decisions ?? []).map((d) => [d.channel, d]));

/** The editor starts from the saved draft, and from the suggestions where nothing is saved. */
const editable = (v: ReviewView): Decisions => ({
  ...Object.fromEntries(v.channels.map((c) => [c.channel, { decision: c.suggestion, note: '' }])),
  ...saved(v),
});

function ScaleCaps({ view, decisions }: { view: ReviewView; decisions: Decisions }) {
  const scaled = view.channels.filter((c) => decisions[c.channel]?.decision === 'scale');
  if (!scaled.length) return null;
  return (
    <ul className="grid gap-1 text-sm text-ink-2">
      {scaled.map((c) => {
        const cap = view.budgetCapCents[c.channel];
        const name = humanize(c.channel);
        return (
          <li key={c.channel}>
            {cap ? copy.review.scaleCap(name, money(cap)) : copy.review.scaleNoCap(name)}
          </li>
        );
      })}
    </ul>
  );
}

function Editor({ view }: { view: ReviewView }) {
  const id = useId();
  const save = useSaveReview();
  const send = useSendReview();
  const [confirming, setConfirming] = useState(false);
  const [decisions, setDecisions] = useState(() => editable(view));
  const [nextPhase, setNextPhase] = useState(view.review?.nextPhase ?? '');
  useEffect(() => {
    setDecisions(editable(view));
    setNextPhase(view.review?.nextPhase ?? '');
  }, [view.review?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = view.channels.map((c) => ({ channel: c.channel, ...decisions[c.channel]! }));
  const before = saved(view);
  const dirty =
    !view.review ||
    nextPhase !== view.review.nextPhase ||
    list.some(
      (d) => d.decision !== before[d.channel]?.decision || d.note !== before[d.channel]?.note,
    );

  return (
    <div className="grid gap-6">
      <ChannelTable
        view={view}
        decisions={decisions}
        onChange={(channel, next) => setDecisions({ ...decisions, [channel]: next })}
      />
      <ScaleCaps view={view} decisions={decisions} />
      <Assumption check={view.assumption} />
      <Field label="Next phase" htmlFor={`${id}-next`} help={copy.review.nextPhaseHelp}>
        <Textarea
          id={`${id}-next`}
          rows={4}
          value={nextPhase}
          onChange={(e) => setNextPhase(e.target.value)}
          placeholder={'- Hours: …\n- Budget: …'}
          className="font-mono text-[0.8125rem]"
        />
      </Field>
      <BlockedHint error={save.error ?? send.error} />
      <div className="flex flex-wrap gap-2">
        <ActionButton
          permission="review.edit"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate({ decisions: list, nextPhase })}
        >
          Save draft
        </ActionButton>
        <ActionButton
          variant="primary"
          permission="review.edit"
          blockedReason={dirty ? 'Save the draft first.' : undefined}
          onClick={() => setConfirming(true)}
        >
          <Send /> Send to client
        </ActionButton>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Send the review to the client?"
        description={copy.review.sendConfirm}
        confirmLabel="Send review"
        onConfirm={() => send.mutateAsync()}
      />
    </div>
  );
}

/** Sent: what the client got. Not sent and not the PM: the saved draft, if any, and a note. */
function ReadOnly({ view }: { view: ReviewView }) {
  const review = view.review;
  const sent = review?.status === 'sent';
  return (
    <div className="grid gap-6">
      {sent ? (
        <p className="rounded-md border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ink">
          Sent {fmtDateTime(review.sentAt)} by {review.sentBy?.name}. {copy.review.sendConfirm}
        </p>
      ) : null}
      <ChannelTable view={view} decisions={saved(view)} />
      {sent ? (
        <>
          <Assumption check={view.assumption} />
          <Section title="Next phase" id="review-next">
            <Markdown text={review.nextPhase} />
          </Section>
        </>
      ) : (
        <EmptyState title={copy.review.notSent} />
      )}
    </div>
  );
}

/** Source week 4: one page per channel — what it brought, what it cost, scale / keep / stop / wait. */
export default function ReviewPage() {
  const role = useRoleStore((s) => s.role);
  const { data: view } = useReview();
  const editing = view?.review?.status !== 'sent' && can(role, 'review.edit').ok;

  return (
    <>
      <PageHeader title={copy.pages.review.title} steps={[10]} lede={copy.pages.review.lede} />
      {!view ? (
        <SkeletonRows />
      ) : !view.weeks.length ? (
        <EmptyState title="No full week of data yet." body={copy.review.notSent} />
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-ink-2">
            Weeks of {view.weeks.map(fmtDay).join(' and ')} (full weeks only; the running week is
            left out). <SourceLink anchor="term-review" what="the week-4 review" />
          </p>
          {!view.bigCallsAllowed ? (
            <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
              {copy.review.smallOnly}
            </p>
          ) : null}
          {editing ? <Editor view={view} /> : <ReadOnly view={view} />}
        </div>
      )}
    </>
  );
}
