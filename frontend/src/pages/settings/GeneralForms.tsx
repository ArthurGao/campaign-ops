import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { renderUtm, utmForChannel, type Settings } from '@campaign-ops/core';
import { usePatchSettings, useResetDemo } from '@/api/queries/settings';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Facts, Section } from '@/components/shared/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';

export function PeopleForm({ settings }: { settings: Settings }) {
  const id = useId();
  const patch = usePatchSettings();
  const role = useRoleStore((s) => s.role);
  const p = settings.people;
  const [owner, setOwner] = useState(p.alertOwnerOutsideHours);
  useEffect(() => setOwner(p.alertOwnerOutsideHours), [p.alertOwnerOutsideHours]);
  return (
    <Section title="People">
      <div className="grid gap-4 rounded-md border border-rule bg-surface p-4">
        <Facts
          rows={[
            ['PM', p.pm],
            ...Object.entries(p.approvers).map(
              ([k, v]) => [`Approves ${k}`, v] as [string, string],
            ),
            ['Decision maker', p.decisionMaker],
            ['Executors', p.executors.join(', ')],
            ['Sales', p.sales.join(', ')],
          ]}
        />
        <fieldset disabled={!can(role, 'settings.general').ok} className="grid gap-3">
          <legend className="mb-1 text-sm font-semibold">Alert owner outside PM hours</legend>
          <p className="text-xs text-ink-3">Required for the budget-and-monitoring ad gate.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name" htmlFor={`${id}-n`}>
              <Input
                id={`${id}-n`}
                value={owner.name}
                onChange={(e) => setOwner({ ...owner, name: e.target.value })}
              />
            </Field>
            <Field label="Contact" htmlFor={`${id}-c`}>
              <Input
                id={`${id}-c`}
                value={owner.contact}
                onChange={(e) => setOwner({ ...owner, contact: e.target.value })}
                className="font-mono"
              />
            </Field>
            <Field label="Responds within (min)" htmlFor={`${id}-m`}>
              <Input
                id={`${id}-m`}
                type="number"
                min={1}
                value={owner.responseMinutes}
                onChange={(e) => setOwner({ ...owner, responseMinutes: Number(e.target.value) })}
                className="font-mono"
              />
            </Field>
          </div>
          <BlockedHint error={patch.error} />
          <ActionButton
            className="justify-self-start"
            permission="settings.general"
            loading={patch.isPending}
            onClick={() => patch.mutate({ people: { alertOwnerOutsideHours: owner } })}
          >
            Save alert owner
          </ActionButton>
        </fieldset>
      </div>
    </Section>
  );
}

/** Live preview renders locally from the unsaved template with the same function the API uses. */
export function UtmTemplateForm({ settings }: { settings: Settings }) {
  const id = useId();
  const patch = usePatchSettings();
  const role = useRoleStore((s) => s.role);
  const [tpl, setTpl] = useState(settings.utmTemplate);
  const [channel, setChannel] = useState('facebook_feed');
  useEffect(() => setTpl(settings.utmTemplate), [settings.utmTemplate]);
  const { source, medium } = utmForChannel(channel);
  const preview = renderUtm(tpl, {
    base: settings.landingPage.url,
    source,
    medium,
    content: 'pub-2027ct-013',
  });
  return (
    <Section title="UTM template">
      <fieldset
        disabled={!can(role, 'settings.general').ok}
        className="grid gap-3 rounded-md border border-rule bg-surface p-4"
      >
        <legend className="sr-only">UTM template</legend>
        <Field
          label="Template"
          htmlFor={`${id}-t`}
          help="Placeholders: {base} {source} {medium} {content}. Agents and packages never edit generated links."
        >
          <Input
            id={`${id}-t`}
            value={tpl}
            onChange={(e) => setTpl(e.target.value)}
            className="font-mono text-xs"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-2">Preview for</span>
          <SimpleSelect
            value={channel}
            onChange={setChannel}
            options={[
              'facebook_feed',
              'instagram_reels',
              'youtube_video',
              'google_search',
              'meta_ads',
            ]}
            className="w-48"
            label="Preview channel"
          />
        </div>
        <output
          className="break-all rounded-sm bg-ground px-2.5 py-2 font-mono text-xs text-ink"
          aria-live="polite"
        >
          {preview}
        </output>
        <BlockedHint error={patch.error} />
        <ActionButton
          className="justify-self-start"
          permission="settings.general"
          disabled={tpl === settings.utmTemplate}
          loading={patch.isPending}
          onClick={() => patch.mutate({ utmTemplate: tpl })}
        >
          Save template
        </ActionButton>
      </fieldset>
    </Section>
  );
}

export function ProhibitedWords({ settings }: { settings: Settings }) {
  const patch = usePatchSettings();
  const role = useRoleStore((s) => s.role);
  const ok = can(role, 'settings.general').ok;
  const [word, setWord] = useState('');
  const words = settings.prohibitedWords;
  const save = (next: string[]) => patch.mutate({ prohibitedWords: next });
  return (
    <Section title="Prohibited words" count={words.length}>
      <div className="grid gap-3 rounded-md border border-rule bg-surface p-4">
        <p className="text-xs text-ink-3">
          Outbound flags any draft or task body containing these.
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {words.map((w) => (
            <li
              key={w}
              className="inline-flex items-center gap-1 rounded-sm border border-rule bg-ground px-2 py-0.5 text-sm"
            >
              {w}
              {ok ? (
                <button
                  aria-label={`Remove ${w}`}
                  className="text-ink-3 hover:text-bad"
                  onClick={() => save(words.filter((x) => x !== w))}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (word.trim()) save([...words, word.trim()]);
            setWord('');
          }}
        >
          <Input
            aria-label="New prohibited word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            disabled={!ok}
            className="max-w-60"
          />
          <ActionButton type="submit" permission="settings.general" disabled={!word.trim()}>
            Add
          </ActionButton>
        </form>
      </div>
    </Section>
  );
}

export function FactoryAndReset({ settings }: { settings: Settings }) {
  const patch = usePatchSettings();
  const reset = useResetDemo();
  const role = useRoleStore((s) => s.role);
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title="Factory and demo">
      <div className="grid gap-4 rounded-md border border-rule bg-surface p-4">
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={settings.factorySupportsIdempotency}
            disabled={!can(role, 'settings.general').ok}
            onCheckedChange={(v) => patch.mutate({ factorySupportsIdempotency: v })}
            aria-label="Factory supports idempotency keys"
          />
          <span className="grid">
            <span className="font-medium">Factory declares idempotency-key support</span>
            <span className="text-xs text-ink-3">
              Off: briefs are de-duplicated by task id only.
            </span>
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Reset demo data
          </Button>
          <span className="text-xs text-ink-3">
            Reloads the seed and restarts the demo clock. Any role may do this.
          </span>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Reset demo data?"
        description="Every change made in this browser is discarded and the seed is reloaded."
        confirmLabel="Reset"
        tone="danger"
        onConfirm={() => reset.mutateAsync()}
      />
    </Section>
  );
}
