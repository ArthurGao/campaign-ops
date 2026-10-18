import type { LandingPageChecks as Checks, Settings } from '@campaign-ops/core';
import { usePatchSettings } from '@/api/queries/settings';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Section } from '@/components/shared/Layout';
import { GateStrip } from '@/components/shared/GateBadges';
import { StatusChip } from '@/components/shared/StatusChip';
import { Switch } from '@/components/ui/switch';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';

const LABELS: Record<keyof Checks, [string, string]> = {
  factsConfirmed: [
    'Page facts confirmed',
    'Everything the page states is confirmed on the Fact Sheet.',
  ],
  leadFiresOnce: ['Lead event fires once', 'One submit = one Lead event (E-03 found two).'],
  sourceCaptured: ['Source captured to CRM', 'UTM and click ids reach the lead record.'],
  reachesSales: ['Enquiry reaches sales', 'A test enquiry lands with a named person.'],
};

/** Only all four checks make the page traffic-ready (an ad gate). */
export function LandingPageChecks({ settings }: { settings: Settings }) {
  const patch = usePatchSettings();
  const role = useRoleStore((s) => s.role);
  const perm = can(role, 'settings.general');
  const lp = settings.landingPage;
  return (
    <Section title="Landing page" actions={<StatusChip status={lp.status} />}>
      <div className="grid gap-3 rounded-md border border-rule bg-surface p-4">
        <p className="break-all font-mono text-xs text-ink-2">{lp.url}</p>
        <GateStrip
          title="Traffic-ready checks"
          blockedText="no ad can go live"
          gates={(Object.keys(LABELS) as (keyof Checks)[]).map((k) => ({
            key: k,
            short: LABELS[k][0],
            label: LABELS[k][1],
            ok: lp.checks[k],
          }))}
        />
        <p className="text-xs text-ink-2">
          Daily availability check: {settings.people.landingPageDailyOwner}. Record each check:
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(LABELS) as (keyof Checks)[]).map((k) => {
            const control = (
              <Switch
                checked={lp.checks[k]}
                disabled={!perm.ok || patch.isPending}
                aria-label={LABELS[k][0]}
                onCheckedChange={(v) => patch.mutate({ landingPage: { checks: { [k]: v } } })}
              />
            );
            return (
              <li key={k} className="flex items-center gap-3">
                {control}
                <span className="text-sm font-medium">{LABELS[k][0]}</span>
              </li>
            );
          })}
        </ul>
        {!perm.ok ? (
          <p className="text-xs text-ink-3">{perm.reason}: the PM records these checks.</p>
        ) : null}
        <BlockedHint error={patch.error} />
      </div>
    </Section>
  );
}
