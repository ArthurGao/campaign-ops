import { useEffect, useId, useState } from 'react';
import type { Settings } from '@campaign-ops/core';
import { usePatchSettings } from '@/api/queries/settings';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Section } from '@/components/shared/Layout';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { fmtDateTime } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';

/** The pre-approved scope the client signs: budget caps, pause conditions, non-substantive edits. */
export function ScopeForm({ settings }: { settings: Settings }) {
  const id = useId();
  const patch = usePatchSettings();
  const role = useRoleStore((s) => s.role);
  const editable = can(role, 'settings.scope').ok;
  const s = settings.preApprovedScope;
  const [caps, setCaps] = useState<Record<string, string>>({});
  const [pause, setPause] = useState('');
  const [assets, setAssets] = useState('');
  const [pmMay, setPmMay] = useState(false);
  const [list, setList] = useState('');
  useEffect(() => {
    setCaps(
      Object.fromEntries(
        Object.entries(s.budgetCapCentsByChannel).map(([k, v]) => [k, String(v / 100)]),
      ),
    );
    setPause(s.pauseConditions.join('\n'));
    setAssets(s.allowedAssetScope);
    setPmMay(s.pmMayApproveNonSubstantive);
    setList(s.nonSubstantiveList.join(', '));
  }, [s]);
  const save = () =>
    patch.mutate({
      preApprovedScope: {
        budgetCapCentsByChannel: Object.fromEntries(
          Object.entries(caps).map(([k, v]) => [k, Math.round(Number(v || 0) * 100)]),
        ),
        pauseConditions: pause
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        allowedAssetScope: assets,
        pmMayApproveNonSubstantive: pmMay,
        nonSubstantiveList: list
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      },
    });
  return (
    <Section
      title="Pre-approved scope"
      id="scope"
      actions={
        <span className="text-xs text-ink-3">
          Signed by {s.signedBy} · {fmtDateTime(s.signedAt)}
        </span>
      }
    >
      <fieldset
        disabled={!editable}
        className="grid gap-4 rounded-md border border-rule bg-surface p-4"
      >
        <legend className="sr-only">Pre-approved scope</legend>
        <p className="text-sm text-ink-2">
          Changes need a client role and re-sign the scope. A channel cap of $0 fails the budget
          gate for its ads.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.keys(caps).map((ch) => (
            <Field
              key={ch}
              label={`${ch.replace(/_/g, ' ')} cap (NZD / week)`}
              htmlFor={`${id}-${ch}`}
            >
              <Input
                id={`${id}-${ch}`}
                type="number"
                min={0}
                step={10}
                value={caps[ch]}
                onChange={(e) => setCaps({ ...caps, [ch]: e.target.value })}
                className="font-mono"
              />
            </Field>
          ))}
        </div>
        <Field
          label="Pause conditions (one per line)"
          htmlFor={`${id}-p`}
          help="Feedback suggestions that meet one of these are in scope: the executor may apply them."
        >
          <Textarea id={`${id}-p`} value={pause} onChange={(e) => setPause(e.target.value)} />
        </Field>
        <Field label="Allowed assets and facts" htmlFor={`${id}-a`}>
          <Input id={`${id}-a`} value={assets} onChange={(e) => setAssets(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              checked={pmMay}
              onCheckedChange={setPmMay}
              aria-label="PM may approve non-substantive edits"
            />
            PM may approve non-substantive edits
          </label>
          <Input
            aria-label="Non-substantive edit kinds"
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder="typos, punctuation, …"
            disabled={!pmMay || !editable}
          />
        </div>
        <BlockedHint error={patch.error} />
        <ActionButton
          variant="primary"
          className="justify-self-start"
          permission="settings.scope"
          loading={patch.isPending}
          onClick={save}
        >
          Sign updated scope
        </ActionButton>
      </fieldset>
    </Section>
  );
}
