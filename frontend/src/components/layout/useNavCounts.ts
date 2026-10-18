import { isLiveExternal, stillBlocking } from '@campaign-ops/core';
import { useRuns } from '@/api/queries/agents';
import { useEvidence } from '@/api/queries/evidence';
import { useBriefs } from '@/api/queries/factory';
import { useFacts } from '@/api/queries/facts';
import { useLeads } from '@/api/queries/leads';
import { usePackages } from '@/api/queries/packages';
import { useSettings } from '@/api/queries/settings';
import { useTasks } from '@/api/queries/tasks';

type Count = { n: number; title: string; alert?: boolean };

/** The rail's live counts: what is waiting on someone, per destination. */
export function useNavCounts(): Record<
  'facts' | 'evidence' | 'tasks' | 'agents' | 'factory' | 'publish' | 'leads' | 'settings',
  Count | undefined
> {
  const facts = useFacts().data?.entries ?? [];
  const evidence = useEvidence().data ?? [];
  const tasks = useTasks().data ?? [];
  const runs = useRuns().data ?? [];
  const briefs = useBriefs().data ?? [];
  const packages = usePackages().data ?? [];
  const leads = useLeads().data ?? [];
  const settings = useSettings().data;

  const unconfirmed = facts.filter((f) => isLiveExternal(f) && !f.publiclyUsable).length;
  const blocking = stillBlocking(evidence, tasks).length;
  const openEvidence = evidence.filter((e) => e.status === 'open').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const review = runs.flatMap((r) =>
    r.status === 'completed' ? r.outputs.filter((o) => !o.decision) : [],
  ).length;
  const qa = briefs.filter((b) => b.status === 'delivered').length;
  const awaiting = packages.filter((p) => p.status === 'awaiting_approval').length;
  const pendingLeads = leads.filter((l) => l.validity.value === 'pending').length;

  return {
    facts: { n: unconfirmed, title: 'external facts not confirmed', alert: unconfirmed > 0 },
    evidence: { n: openEvidence, title: `open items, ${blocking} blocking`, alert: blocking > 0 },
    tasks: { n: blocked, title: 'blocked tasks', alert: blocked > 0 },
    agents: { n: review, title: 'outputs waiting for review' },
    factory: { n: qa, title: 'receipts waiting for QA' },
    publish: { n: awaiting, title: 'packages awaiting approval' },
    leads: { n: pendingLeads, title: 'leads with pending validity' },
    settings:
      settings?.landingPage.status === 'not_ready'
        ? { n: 1, title: 'landing page not traffic-ready', alert: true }
        : undefined,
  };
}
