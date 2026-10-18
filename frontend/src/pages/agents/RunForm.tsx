import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AUDIT_SCOPES,
  CHANNELS,
  FEEDBACK_SCOPES,
  OUTBOUND_MODES,
  type AgentId,
  type Channel,
  type OutboundMode,
} from '@campaign-ops/core';
import { useStartRun } from '@/api/queries/agents';
import { useBriefs } from '@/api/queries/factory';
import { usePackages } from '@/api/queries/packages';
import { useSettings } from '@/api/queries/settings';
import { useTasks } from '@/api/queries/tasks';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { humanize } from '@/lib/format';

const NONE = '__none';

function Scopes<T extends string>({
  all,
  value,
  onChange,
  legend,
}: {
  all: readonly T[];
  value: T[];
  onChange(v: T[]): void;
  legend: string;
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-[0.8125rem] font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {all.map((s) => (
          <label key={s} className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={value.includes(s)}
              onCheckedChange={(on) => onChange(on ? [...value, s] : value.filter((x) => x !== s))}
            />
            {humanize(s)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Per-agent inputs (docs/03-agents.md). Starting a run opens its page, which polls until it finishes. */
export function RunForm({ agent, onCancel }: { agent: AgentId; onCancel(): void }) {
  const id = useId();
  const navigate = useNavigate();
  const start = useStartRun();
  const tasks = useTasks().data ?? [];
  const briefs = useBriefs().data ?? [];
  const packages = usePackages().data ?? [];

  const settings = useSettings().data;
  // Defaults to the landing page from Settings; an emptied field shows the failed-run path.
  const [editedUrl, setSiteUrl] = useState<string>();
  const siteUrl = editedUrl ?? settings?.landingPage.url ?? '';
  const [auditScope, setAuditScope] = useState<string[]>([...AUDIT_SCOPES]);

  const [mode, setMode] = useState<OutboundMode>('draft');
  const [taskId, setTaskId] = useState<string>(NONE);
  const [channel, setChannel] = useState<Channel>('facebook');
  const [spec, setSpec] = useState('≤ 80 words, must include departure date, link at end');
  const [briefId, setBriefId] = useState<string>(NONE);
  const [packageId, setPackageId] = useState<string>(NONE);

  const [fbScope, setFbScope] = useState<string[]>(['ads', 'funnel', 'reconciliation']);
  const [afterLaunch, setAfterLaunch] = useState<string>(NONE);

  const pick = (v: string) => (v === NONE ? undefined : v);
  const submit = () => {
    const inputs: Record<string, unknown> =
      agent === 'audit'
        ? { siteUrl, scope: auditScope }
        : agent === 'outbound'
          ? mode === 'draft'
            ? { mode, taskId: pick(taskId), channel, spec }
            : mode === 'qa'
              ? { mode, briefId: pick(briefId), taskId: pick(taskId) }
              : { mode, packageId: pick(packageId), taskId: pick(taskId) }
          : pick(afterLaunch)
            ? { afterLaunchOf: afterLaunch }
            : { dateRange: 'last 10 days', scope: fbScope };
    start.mutate(
      { agent, inputs },
      { onSuccess: ({ runId }) => navigate(`/agents/runs/${runId}`) },
    );
  };

  const draftTasks = tasks.filter(
    (t) =>
      ['social_post', 'ad_copy'].includes(t.type) && ['draft', 'blocked', 'qa'].includes(t.status),
  );
  const liveTasks = tasks.filter((t) => t.status === 'live');

  return (
    <div className="grid gap-3 border-t border-rule pt-3">
      {agent === 'audit' ? (
        <>
          <Field
            label="Site URL"
            htmlFor={`${id}-url`}
            help="Empty URL → the run fails with “No URL provided”."
          >
            <Input id={`${id}-url`} value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
          </Field>
          <Scopes
            legend="Scope"
            all={AUDIT_SCOPES}
            value={auditScope as never[]}
            onChange={setAuditScope}
          />
          <p className="text-xs text-ink-2">
            Sales response is checked only if the client agreed to a TEST enquiry (Settings →
            Pre-approved scope): {settings?.preApprovedScope.testEnquiry ? 'agreed' : 'not agreed'}.
          </p>
        </>
      ) : null}
      {agent === 'outbound' ? (
        <>
          <Field label="Mode" htmlFor={`${id}-mode`}>
            <SimpleSelect<OutboundMode>
              id={`${id}-mode`}
              value={mode}
              onChange={setMode}
              options={OUTBOUND_MODES}
            />
          </Field>
          {mode === 'draft' ? (
            <>
              <Field
                label="Task (optional)"
                htmlFor={`${id}-task`}
                help="Re-run for an existing task, e.g. the blocked TASK-021 once FS-04 is confirmed."
              >
                <SimpleSelect
                  id={`${id}-task`}
                  value={taskId}
                  onChange={setTaskId}
                  options={[
                    { value: NONE, label: 'New draft' },
                    ...draftTasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` })),
                  ]}
                />
              </Field>
              <Field label="Channel" htmlFor={`${id}-ch`}>
                <SimpleSelect<Channel>
                  id={`${id}-ch`}
                  value={channel}
                  onChange={setChannel}
                  options={CHANNELS}
                />
              </Field>
              <Field
                label="Spec"
                htmlFor={`${id}-spec`}
                help="Asking for dates, price or visa info that is not confirmed returns needs_confirmation."
              >
                <Input id={`${id}-spec`} value={spec} onChange={(e) => setSpec(e.target.value)} />
              </Field>
            </>
          ) : null}
          {mode === 'qa' ? (
            <>
              <Field label="Brief receipt" htmlFor={`${id}-brief`}>
                <SimpleSelect
                  id={`${id}-brief`}
                  value={briefId}
                  onChange={setBriefId}
                  options={[
                    { value: NONE, label: 'None' },
                    ...briefs
                      .filter((b) => b.receipts.length)
                      .map((b) => ({ value: b.id, label: `${b.id} · ${humanize(b.status)}` })),
                  ]}
                />
              </Field>
              <Field label="Task body" htmlFor={`${id}-qtask`}>
                <SimpleSelect
                  id={`${id}-qtask`}
                  value={taskId}
                  onChange={setTaskId}
                  options={[
                    { value: NONE, label: 'None' },
                    ...tasks
                      .filter((t) => t.body)
                      .map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` })),
                  ]}
                />
              </Field>
            </>
          ) : null}
          {mode === 'verify' ? (
            <>
              <Field label="Published package" htmlFor={`${id}-pkg`}>
                <SimpleSelect
                  id={`${id}-pkg`}
                  value={packageId}
                  onChange={setPackageId}
                  options={[
                    { value: NONE, label: 'None' },
                    ...packages
                      .filter((p) => p.publishLog.some((e) => e.action === 'published'))
                      .map((p) => ({ value: p.id, label: `${p.id} · ${p.channel}` })),
                  ]}
                />
              </Field>
              <Field label="Or a live task" htmlFor={`${id}-vtask`}>
                <SimpleSelect
                  id={`${id}-vtask`}
                  value={taskId}
                  onChange={setTaskId}
                  options={[
                    { value: NONE, label: 'None' },
                    ...liveTasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` })),
                  ]}
                />
              </Field>
            </>
          ) : null}
        </>
      ) : null}
      {agent === 'feedback' ? (
        <>
          <Scopes
            legend="Scope (last 10 days)"
            all={FEEDBACK_SCOPES}
            value={fbScope as never[]}
            onChange={setFbScope}
          />
          <Field
            label="After launch of (optional)"
            htmlFor={`${id}-al`}
            help="An extra run after a launch or change: verifies the platform matches the change record."
          >
            <SimpleSelect
              id={`${id}-al`}
              value={afterLaunch}
              onChange={setAfterLaunch}
              options={[
                { value: NONE, label: 'Regular run' },
                ...liveTasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` })),
              ]}
            />
          </Field>
        </>
      ) : null}
      <BlockedHint error={start.error} />
      <div className="flex gap-2">
        <Button variant="primary" loading={start.isPending} onClick={submit}>
          Start run
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
