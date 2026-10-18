import { GATE_LABELS, type AdGates } from '@campaign-ops/core';

export type Gate = { key: string; short: string; label: string; ok: boolean };

const ORDER: (keyof AdGates)[] = [
  'productFactsConfirmed',
  'landingPageReady',
  'creativeApproved',
  'budgetAndMonitoringApproved',
];

const SHORT: Record<keyof AdGates, string> = {
  productFactsConfirmed: 'Facts',
  landingPageReady: 'Landing page',
  creativeApproved: 'Creative',
  budgetAndMonitoringApproved: 'Budget & alerts',
};

export function adGateList(gates: AdGates): Gate[] {
  return ORDER.map((k) => ({ key: k, short: SHORT[k], label: GATE_LABELS[k], ok: gates[k] }));
}
