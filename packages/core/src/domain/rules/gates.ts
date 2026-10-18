import { AD_TASK_TYPES, type LandingPageStatus, type TaskType } from '../enums';
import type { AdGates, FactEntry, LandingPageChecks, Settings, Task } from '../types';
import { needsConfirmation } from './facts';

export const GATE_LABELS: Record<keyof AdGates, string> = {
  productFactsConfirmed: 'Product facts confirmed',
  landingPageReady: 'Landing page traffic-ready',
  creativeApproved: 'Creative approved (current version)',
  budgetAndMonitoringApproved: 'Budget cap and out-of-hours alert owner approved',
};

/** Ad tasks pass the four gates to go live, except spend-reducing changes (D-32). */
export function requiresAdGates(task: Task): boolean {
  return (
    (AD_TASK_TYPES as readonly TaskType[]).includes(task.type) && task.spendEffect !== 'decrease'
  );
}

/** R3: the four gates an ad task must pass before it can go live. */
export function computeAdGates(
  task: Task,
  ctx: { facts: readonly FactEntry[]; settings: Settings; now: Date },
): AdGates {
  const cap = ctx.settings.preApprovedScope.budgetCapCentsByChannel[task.channel ?? ''] ?? 0;
  // Source workflow: date, price, seats and inclusions all confirmed, plus whatever the ad itself cites.
  const core = ctx.facts.filter((f) => f.productCore && f.page === 'external').map((f) => f.id);
  return {
    productFactsConfirmed: !needsConfirmation(
      [...new Set([...core, ...task.factRefs])],
      ctx.facts,
      ctx.now,
    ),
    landingPageReady: ctx.settings.landingPage.status === 'traffic_ready',
    creativeApproved:
      task.approval?.status === 'approved' && task.approval.approvedVersion === task.version,
    budgetAndMonitoringApproved:
      cap > 0 && ctx.settings.people.alertOwnerOutsideHours.name.trim() !== '',
  };
}

export function unmetGates(gates: AdGates): (keyof AdGates)[] {
  return (Object.keys(gates) as (keyof AdGates)[]).filter((k) => !gates[k]);
}

/** Only all four checks make the landing page traffic-ready. */
export function deriveLandingPageStatus(checks: LandingPageChecks): LandingPageStatus {
  return Object.values(checks).every(Boolean) ? 'traffic_ready' : 'not_ready';
}
