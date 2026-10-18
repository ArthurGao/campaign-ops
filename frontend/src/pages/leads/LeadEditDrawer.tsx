import { useEffect, useId, useState } from 'react';
import { STAGES, VALIDITIES, type Lead, type Stage, type Validity } from '@campaign-ops/core';
import { usePatchLead } from '@/api/queries/leads';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { HistoryList } from '@/components/shared/HistoryList';
import { Facts, Section } from '@/components/shared/Layout';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { fmtDateTime } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';

/** Sales edits validity (with reason; date set by the server) separately from sales stage. */
export function LeadEditDrawer({ lead, onClose }: { lead: Lead | undefined; onClose(): void }) {
  const id = useId();
  const patch = usePatchLead();
  const role = useRoleStore((s) => s.role);
  const editable = can(role, 'lead.edit').ok;
  const [validity, setValidity] = useState<Validity>('pending');
  const [reason, setReason] = useState('');
  const [stage, setStage] = useState<Stage>('new');
  const [lost, setLost] = useState('');
  const [people, setPeople] = useState('');
  useEffect(() => {
    if (!lead) return;
    setValidity(lead.validity.value);
    setReason(lead.validity.reason ?? '');
    setStage(lead.stage);
    setLost(lead.lostReason ?? '');
    setPeople(lead.order ? String(lead.order.people) : '');
  }, [lead]);
  if (!lead) return null;
  const save = () =>
    patch.mutate({
      id: lead.id,
      ...(validity !== lead.validity.value || reason !== (lead.validity.reason ?? '')
        ? { validity, ...(reason ? { validityReason: reason } : {}) }
        : {}),
      ...(stage !== lead.stage || lost !== (lead.lostReason ?? '')
        ? { stage, ...(lost ? { lostReason: lost } : {}) }
        : {}),
      ...(people !== (lead.order ? String(lead.order.people) : '')
        ? { order: people ? { tour: lead.enquiry.tour, people: Number(people) } : null }
        : {}),
    });
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={`${lead.id} · ${lead.enquiry.tour}`}
        description={`${lead.source.channelLabel} · received ${fmtDateTime(lead.receivedAt)}`}
      >
        <div className="grid gap-6 p-5">
          {!editable ? (
            <p className="rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink-2">
              Read-only. Only Sales edits leads.
            </p>
          ) : null}
          <Section title="Contact">
            <Facts
              rows={[
                ['Name', lead.contact.name],
                ['Email', lead.contact.email ?? '—'],
                ['Phone', lead.contact.phone ?? '—'],
                ['Notes', lead.enquiry.notes ?? '—'],
              ]}
            />
            <p className="text-xs text-ink-3">
              Contact details never leave the CRM: the Feedback agent gets the de-identified export.
            </p>
          </Section>
          <Section title="Validity and stage">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Validity" htmlFor={`${id}-v`}>
                <SimpleSelect<Validity>
                  id={`${id}-v`}
                  value={validity}
                  onChange={setValidity}
                  options={VALIDITIES}
                  disabled={!editable}
                />
              </Field>
              <Field label="Reason" htmlFor={`${id}-r`} help="Required when invalid.">
                <Input
                  id={`${id}-r`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={!editable}
                />
              </Field>
              <Field label="Stage" htmlFor={`${id}-s`}>
                <SimpleSelect<Stage>
                  id={`${id}-s`}
                  value={stage}
                  onChange={setStage}
                  options={STAGES}
                  disabled={!editable}
                />
              </Field>
              <Field label="Lost reason" htmlFor={`${id}-l`} help="Required when lost.">
                <Input
                  id={`${id}-l`}
                  value={lost}
                  onChange={(e) => setLost(e.target.value)}
                  disabled={!editable}
                />
              </Field>
              <Field
                label="Order: people"
                htmlFor={`${id}-p`}
                help="Amounts stay [price TBC] until pricing is confirmed."
              >
                <Input
                  id={`${id}-p`}
                  type="number"
                  min={1}
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  disabled={!editable}
                />
              </Field>
            </div>
            {lead.everValid ? (
              <p className="text-xs text-ok">
                Counted as a valid lead historically, even if later lost or reclassified (I-L1).
              </p>
            ) : null}
            <BlockedHint error={patch.error} />
            <ActionButton
              variant="primary"
              className="justify-self-start"
              permission="lead.edit"
              loading={patch.isPending}
              onClick={save}
            >
              Save lead
            </ActionButton>
          </Section>
          <Section title="History">
            <HistoryList events={lead.events} />
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
