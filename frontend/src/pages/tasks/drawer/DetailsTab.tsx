import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '@campaign-ops/core';
import { useSettings } from '@/api/queries/settings';
import { usePatchTask } from '@/api/queries/tasks';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { FactRefs } from '@/components/shared/FactChip';
import { Facts } from '@/components/shared/Layout';
import { RichText } from '@/components/shared/Placeholder';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { humanize } from '@/lib/format';

const parseRefs = (s: string) => [
  ...new Set(
    s
      .split(/[\s,]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
  ),
];

export function DetailsTab({ task }: { task: Task }) {
  const id = useId();
  const patch = usePatchTask();
  const scope = useSettings().data?.preApprovedScope;
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(task.body ?? '');
  const [refs, setRefs] = useState(task.factRefs.join(', '));
  const [ns, setNs] = useState(false);
  const [scopeRef, setScopeRef] = useState<string | undefined>();
  useEffect(() => {
    setBody(task.body ?? '');
    setRefs(task.factRefs.join(', '));
  }, [task.body, task.factRefs]);

  const frozen = task.status === 'live' || task.status === 'verified';
  const resets = task.status === 'approved' || task.status === 'awaiting_approval';
  const save = () =>
    patch.mutate(
      {
        id: task.id,
        body,
        factRefs: parseRefs(refs),
        ...(ns && scopeRef ? { nonSubstantive: true, scopeRef } : {}),
      },
      { onSuccess: () => setEditing(false) },
    );

  return (
    <div className="grid gap-5">
      <Facts
        rows={[
          ['Type', humanize(task.type)],
          ['Channel', task.channel ? humanize(task.channel) : '—'],
          ['Owner', task.owner],
          ...(task.spendEffect === 'decrease'
            ? ([['Spend', 'Reduces spend (pause or cut): launch gates do not apply']] as [
                string,
                React.ReactNode,
              ][])
            : []),
          ...(task.pageUrl
            ? ([['Page', <span className="break-all font-mono text-xs">{task.pageUrl}</span>]] as [
                string,
                React.ReactNode,
              ][])
            : []),
          ['Fact refs', <FactRefs ids={task.factRefs} />],
          ...(task.originRunId
            ? ([
                [
                  'From run',
                  <Link
                    to={`/agents/runs/${task.originRunId}`}
                    className="font-mono text-accent hover:underline"
                  >
                    {task.originRunId}
                  </Link>,
                ],
              ] as [string, React.ReactNode][])
            : []),
          ...(task.originEvidenceId
            ? ([
                [
                  'From evidence',
                  <Link
                    to={`/evidence?focus=${task.originEvidenceId}`}
                    className="font-mono text-accent hover:underline"
                  >
                    {task.originEvidenceId}
                  </Link>,
                ],
              ] as [string, React.ReactNode][])
            : []),
          ...(task.linkedPackageId
            ? ([
                [
                  'Package',
                  <Link
                    to={`/publish/${task.linkedPackageId}`}
                    className="font-mono text-accent hover:underline"
                  >
                    {task.linkedPackageId}
                  </Link>,
                ],
              ] as [string, React.ReactNode][])
            : []),
          ...(task.linkedBriefId
            ? ([
                [
                  'Brief',
                  <Link
                    to={`/factory/${task.linkedBriefId}`}
                    className="font-mono text-accent hover:underline"
                  >
                    {task.linkedBriefId}
                  </Link>,
                ],
              ] as [string, React.ReactNode][])
            : []),
        ]}
      />
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-2xs font-semibold uppercase tracking-wide text-ink-2">
            Draft · v{task.version}
          </h3>
          {!editing ? (
            <ActionButton
              size="sm"
              variant="ghost"
              permission="task.edit"
              blockedReason={
                frozen
                  ? `${humanize(task.status)} work is frozen; create a follow-up task.`
                  : undefined
              }
              onClick={() => setEditing(true)}
            >
              Edit
            </ActionButton>
          ) : null}
        </div>
        {editing ? (
          <div className="grid gap-3">
            <Field
              label="Body"
              htmlFor={`${id}-b`}
              help="Put the FS id after every fact, e.g. [← FS-07]."
            >
              <Textarea
                id={`${id}-b`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-32 font-mono text-[0.8rem]"
              />
            </Field>
            <Field
              label="Fact refs"
              htmlFor={`${id}-r`}
              help="Comma-separated FS ids. Unconfirmed refs block QA and approval."
            >
              <Input
                id={`${id}-r`}
                value={refs}
                onChange={(e) => setRefs(e.target.value)}
                className="font-mono"
              />
            </Field>
            {resets ? (
              <div className="grid gap-2 rounded-md border border-warn/30 bg-warn-soft/60 p-3 text-sm">
                <p className="text-warn">
                  Saving creates v{task.version + 1} and sends it back to client approval
                  {task.approval
                    ? ` (approval for v${task.approval.approvedVersion} is cleared)`
                    : ''}
                  .
                </p>
                <label className="flex items-center gap-2">
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
                {!scope?.pmMayApproveNonSubstantive ? (
                  <p className="text-xs text-ink-2">
                    The client has not allowed PM approval of edits.
                  </p>
                ) : null}
              </div>
            ) : null}
            <BlockedHint error={patch.error} />
            <div className="flex gap-2">
              <Button
                variant="primary"
                loading={patch.isPending}
                disabled={ns && !scopeRef}
                onClick={save}
              >
                {resets ? `Save as v${task.version + 1}` : 'Save'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : task.body ? (
          <div className="whitespace-pre-line rounded-md border border-rule bg-ground px-3.5 py-3 text-sm leading-relaxed">
            <RichText text={task.body} />
          </div>
        ) : (
          <p className="text-sm text-ink-3">
            No draft text yet.{' '}
            {task.status === 'blocked'
              ? 'The Outbound agent stopped: a required fact is unconfirmed.'
              : 'Run the Outbound agent or write it here.'}
          </p>
        )}
      </div>
      {task.needsRereview ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-warn/30 bg-warn-soft/60 px-3 py-2 text-sm text-warn">
          A cited Fact Sheet entry changed after this was written. Check the text still holds.
          <ActionButton
            size="sm"
            permission="task.edit"
            onClick={() => patch.mutate({ id: task.id, needsRereview: false })}
          >
            Mark re-reviewed
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
}
