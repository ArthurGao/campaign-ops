import { useId, useState } from 'react';
import type { FactPage, FactView } from '@campaign-ops/core';
import type { ApiError } from '@/api/client';
import { useConfirmFact, useCreateFact, usePatchFact, useRejectFact } from '@/api/queries/facts';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { RichText } from '@/components/shared/Placeholder';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleSelect } from '@/components/ui/select';
import { useRoleStore } from '@/store/role.store';

/**
 * Client confirms with a source (409 without one); an expiry makes it confirmed_with_expiry.
 * The PM may confirm official-source entries, and must then set an expiry.
 */
export function ConfirmFactDialog({ fact, onClose }: { fact: FactView; onClose(): void }) {
  const id = useId();
  const confirm = useConfirmFact();
  const pmMustExpire = useRoleStore((s) => s.role) === 'pm';
  const [source, setSource] = useState(fact.source ?? '');
  const [hasExpiry, setHasExpiry] = useState(
    fact.status === 'confirmed_with_expiry' || pmMustExpire,
  );
  const [expires, setExpires] = useState(fact.expiresAt?.slice(0, 10) ?? '');
  const [note, setNote] = useState(fact.publicNote ?? '');
  const submit = () =>
    confirm.mutate(
      {
        id: fact.id,
        source,
        ...(hasExpiry && expires
          ? { expiresAt: new Date(`${expires}T23:59:00+13:00`).toISOString() }
          : {}),
        ...(note ? { publicNote: note } : {}),
      },
      { onSuccess: onClose },
    );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader
          title={`Confirm ${fact.id} — ${fact.label}`}
          description={<RichText text={fact.statement} />}
        />
        <Field
          label="Source (document name or URL)"
          htmlFor={`${id}-src`}
          help="Required. The confirmation records who confirmed it, when, and from what."
        >
          <Input
            id={`${id}-src`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Client email, 16 Oct 2026"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={hasExpiry}
            disabled={pmMustExpire}
            onCheckedChange={(v) => setHasExpiry(v === true)}
          />
          {pmMustExpire
            ? 'Official source checked by the PM: an expiry is required (re-check by this date)'
            : 'Valid until a date (visa rules, offers) — becomes “confirmed with expiry”'}
        </label>
        {hasExpiry ? (
          <Field label="Expires on" htmlFor={`${id}-exp`}>
            <Input
              id={`${id}-exp`}
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="w-48"
            />
          </Field>
        ) : null}
        <Field
          label="Public note"
          htmlFor={`${id}-note`}
          help="Wording that must accompany the fact, e.g. “subject to official information at departure”."
        >
          <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <BlockedHint error={confirm.error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="approve" loading={confirm.isPending} onClick={submit}>
            Confirm {fact.id}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectFactDialog({ fact, onClose }: { fact: FactView; onClose(): void }) {
  const reject = useRejectFact();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Reject ${fact.id} — ${fact.label}`}
      description="The entry becomes unusable. Anything citing it is flagged for re-review."
      confirmLabel="Reject entry"
      tone="danger"
      note={{ label: 'What is wrong with it', required: true }}
      onConfirm={(note) => reject.mutateAsync({ id: fact.id, note })}
    />
  );
}

/** PM adds or edits an entry. Editing the wording of a confirmed entry sends it back to pending. */
export function EditFactDialog({
  fact,
  page,
  onClose,
}: {
  fact?: FactView;
  page: FactPage;
  onClose(): void;
}) {
  const id = useId();
  const create = useCreateFact();
  const patch = usePatchFact();
  const [pageValue, setPage] = useState<FactPage>(fact?.page ?? page);
  const [label, setLabel] = useState(fact?.label ?? '');
  const [statement, setStatement] = useState(fact?.statement ?? '');
  const [extra, setExtra] = useState(
    fact?.page === 'internal' ? (fact.purpose ?? '') : (fact?.publicNote ?? ''),
  );
  const error = (create.error ?? patch.error) as ApiError | null;
  const confirmedWording =
    fact &&
    (fact.status === 'confirmed' || fact.status === 'confirmed_with_expiry') &&
    statement !== fact.statement;
  const submit = () => {
    const extraField =
      pageValue === 'internal'
        ? { purpose: extra || undefined }
        : { publicNote: extra || undefined };
    if (fact)
      patch.mutate({ id: fact.id, label, statement, ...extraField }, { onSuccess: onClose });
    else
      create.mutate({ page: pageValue, label, statement, ...extraField }, { onSuccess: onClose });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader
          title={fact ? `Edit ${fact.id}` : 'Add Fact Sheet entry'}
          description="Every change bumps the Fact Sheet version and flags work that cites the entry."
        />
        {!fact ? (
          <Field label="Page" htmlFor={`${id}-page`}>
            <SimpleSelect<FactPage>
              id={`${id}-page`}
              value={pageValue}
              onChange={setPage}
              options={[
                { value: 'external', label: 'External — may be cited publicly once confirmed' },
                { value: 'internal', label: 'Internal — budget, targets; never public' },
              ]}
            />
          </Field>
        ) : null}
        <Field label="Label" htmlFor={`${id}-label`}>
          <Input id={`${id}-label`} value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field
          label="Statement"
          htmlFor={`${id}-st`}
          help="Use [TBC] placeholders for anything not confirmed, e.g. [date TBC]."
        >
          <Textarea
            id={`${id}-st`}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </Field>
        <Field label={pageValue === 'internal' ? 'Purpose' : 'Public note'} htmlFor={`${id}-x`}>
          <Input id={`${id}-x`} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </Field>
        {confirmedWording ? (
          <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
            New wording needs a new confirmation: {fact.id} will go back to pending.
          </p>
        ) : null}
        <BlockedHint error={error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={create.isPending || patch.isPending}
            disabled={!label.trim() || !statement.trim()}
            onClick={submit}
          >
            {fact ? 'Save new version' : 'Add as pending'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
