import { useId, useState } from 'react';
import type { PublishPackage } from '@campaign-ops/core';
import { useSettings } from '@/api/queries/settings';
import {
  useApprovePackage,
  usePatchPackage,
  usePublishedPackage,
  useRejectPackage,
  useSchedulePackage,
  useTakeDown,
  useVerifyPackage,
} from '@/api/queries/packages';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { CLIENT_ROLES } from '@campaign-ops/core';

function Panel({
  title,
  who,
  children,
}: {
  title: string;
  who: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2.5 rounded-md border border-rule bg-surface p-3.5">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[0.7rem] text-ink-3">{who}</span>
      </header>
      {children}
    </section>
  );
}

/** Client approver: approve the exact versions, or send back with a note. */
export function ApprovalPanel({ pkg }: { pkg: PublishPackage }) {
  const approve = useApprovePackage();
  const reject = useRejectPackage();
  const [rejecting, setRejecting] = useState(false);
  const awaiting = pkg.status === 'awaiting_approval';
  const ns = pkg.pendingNonSubstantive;
  const reason = !awaiting
    ? 'Only packages awaiting approval can be approved.'
    : pkg.needsConfirmation
      ? 'A cited fact is not confirmed.'
      : undefined;
  return (
    <Panel title="Approval" who="Client approver">
      <p className="text-[0.8125rem] text-ink-2">
        Approves asset <span className="font-mono">{pkg.asset?.version ?? '—'}</span> and caption{' '}
        <span className="font-mono">{pkg.caption.version}</span>. Any later edit needs approval
        again.
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          size="sm"
          variant="approve"
          roles={ns ? [...CLIENT_ROLES, 'pm'] : CLIENT_ROLES}
          blockedReason={reason}
          loading={approve.isPending}
          onClick={() => approve.mutate({ id: pkg.id })}
        >
          {ns ? `Approve (${ns.scopeRef})` : 'Approve these versions'}
        </ActionButton>
        <ActionButton
          size="sm"
          variant="danger"
          roles={CLIENT_ROLES}
          blockedReason={awaiting ? undefined : 'Nothing to reject.'}
          onClick={() => setRejecting(true)}
        >
          Reject…
        </ActionButton>
      </div>
      {ns ? (
        <p className="text-xs text-accent-strong">
          Marked non-substantive by {ns.markedBy.name}: the PM may approve it under the signed
          scope.
        </p>
      ) : null}
      <BlockedHint error={approve.error} />
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ${pkg.id}`}
        confirmLabel="Reject"
        tone="danger"
        note={{ label: 'What must change', required: true }}
        onConfirm={(note) => reject.mutateAsync({ id: pkg.id, note })}
      />
    </Panel>
  );
}

/** Executor: schedule (duplicate check) → mark published with the post URL. */
export function ExecutorPanel({ pkg }: { pkg: PublishPackage }) {
  const id = useId();
  const schedule = useSchedulePackage();
  const published = usePublishedPackage();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  return (
    <Panel title="Publishing" who="Executor">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          size="sm"
          variant="primary"
          permission="package.schedule"
          blockedReason={
            pkg.status === 'approved'
              ? undefined
              : pkg.status === 'awaiting_approval'
                ? 'Needs client approval of these versions first.'
                : `Already ${pkg.status.replace('_', ' ')}.`
          }
          loading={schedule.isPending}
          onClick={() => schedule.mutate({ id: pkg.id })}
        >
          Schedule
        </ActionButton>
        <ActionButton
          size="sm"
          permission="package.publish"
          blockedReason={pkg.status === 'scheduled' ? undefined : 'Schedule it first.'}
          onClick={() => setOpen(true)}
        >
          Mark published…
        </ActionButton>
      </div>
      <BlockedHint error={schedule.error} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader
            title={`Mark ${pkg.id} published`}
            description="Paste the live post link. Verification compares it with the approved versions."
          />
          <Field label="Post URL" htmlFor={`${id}-u`}>
            <Input
              id={`${id}-u`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={`https://${pkg.channel.split('_')[0]}.example/…`}
            />
          </Field>
          <BlockedHint error={published.error} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={published.isPending}
              disabled={!url.trim()}
              onClick={() =>
                published.mutate({ id: pkg.id, postUrl: url }, { onSuccess: () => setOpen(false) })
              }
            >
              Mark published
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/** PM: edit caption (new version, approval resets), record verification, take down. */
export function PmPanel({ pkg }: { pkg: PublishPackage }) {
  const id = useId();
  const patch = usePatchPackage();
  const verify = useVerifyPackage();
  const takeDown = useTakeDown();
  const scope = useSettings().data?.preApprovedScope;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(pkg.caption.text);
  const [ns, setNs] = useState(false);
  const [scopeRef, setScopeRef] = useState<string | undefined>();
  const [mismatch, setMismatch] = useState(false);
  const [down, setDown] = useState(false);
  const published = pkg.publishLog.some((e) => e.action === 'published');
  const editable = pkg.status === 'awaiting_approval' || pkg.status === 'approved';
  return (
    <Panel title="Changes and verification" who="PM">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          size="sm"
          permission="package.edit"
          blockedReason={editable ? undefined : `${pkg.status} packages are frozen.`}
          onClick={() => (setText(pkg.caption.text), setEditing(true))}
        >
          Edit caption…
        </ActionButton>
        <ActionButton
          size="sm"
          variant="approve"
          permission="package.verify"
          blockedReason={published ? undefined : 'Not published yet.'}
          loading={verify.isPending}
          onClick={() => verify.mutate({ id: pkg.id, result: 'verified' })}
        >
          Record verified
        </ActionButton>
        <ActionButton
          size="sm"
          variant="danger"
          permission="package.verify"
          blockedReason={published ? undefined : 'Not published yet.'}
          onClick={() => setMismatch(true)}
        >
          Record mismatch…
        </ActionButton>
        <ActionButton
          size="sm"
          variant="ghost"
          permission="package.takeDown"
          blockedReason={
            published && !pkg.takenDown
              ? undefined
              : pkg.takenDown
                ? 'Already taken down.'
                : 'Not published yet.'
          }
          onClick={() => setDown(true)}
        >
          Take down…
        </ActionButton>
      </div>
      <BlockedHint error={verify.error} />
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent wide>
          <DialogHeader
            title={`Edit caption ${pkg.caption.version}`}
            description={`Saving creates a new caption version and returns ${pkg.id} to client approval.`}
          />
          <Field label="Caption" htmlFor={`${id}-c`}>
            <Textarea
              id={`${id}-c`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-28"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={ns}
              onCheckedChange={(v) => setNs(v === true)}
              disabled={!scope?.pmMayApproveNonSubstantive}
            />
            Non-substantive edit — the PM may approve it under the pre-approved scope
          </label>
          {ns ? (
            <SimpleSelect
              value={scopeRef}
              onChange={setScopeRef}
              options={scope?.nonSubstantiveList ?? []}
              placeholder="Kind of edit"
              className="w-64"
              label="Kind of non-substantive edit"
            />
          ) : null}
          <BlockedHint error={patch.error} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={patch.isPending}
              disabled={text === pkg.caption.text || (ns && !scopeRef)}
              onClick={() =>
                patch.mutate(
                  {
                    id: pkg.id,
                    caption: text,
                    ...(ns && scopeRef ? { nonSubstantive: true, scopeRef } : {}),
                  },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              Save new version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={mismatch}
        onOpenChange={setMismatch}
        title={`Record mismatch on ${pkg.id}`}
        confirmLabel="Record mismatch"
        tone="danger"
        note={{ label: 'Difference between live and approved', required: true }}
        onConfirm={(note) => verify.mutateAsync({ id: pkg.id, result: 'mismatch', note })}
      />
      <ConfirmDialog
        open={down}
        onOpenChange={setDown}
        title={`Take down ${pkg.id}`}
        description="Records a take-down in the publish log. The executor removes the post on the platform."
        confirmLabel="Take down"
        tone="danger"
        note={{ label: 'Why', required: true }}
        onConfirm={(note) => takeDown.mutateAsync({ id: pkg.id, note })}
      />
    </Panel>
  );
}
