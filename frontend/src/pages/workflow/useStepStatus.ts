import { useRuns } from '@/api/queries/agents';
import { useDashboard } from '@/api/queries/dashboard';
import { useEvidence } from '@/api/queries/evidence';
import { useBriefs } from '@/api/queries/factory';
import { useFacts } from '@/api/queries/facts';
import { useLeads, useRecon } from '@/api/queries/leads';
import { usePackages } from '@/api/queries/packages';
import { useSettings } from '@/api/queries/settings';
import { useTasks } from '@/api/queries/tasks';
import { fmtDateTime, fmtDay, plural } from '@/lib/format';

export type StepTone = 'ok' | 'waiting' | 'blocked';
export type StepStatus = { tone: StepTone; text: string; links: { to: string; label: string }[] };

/** Live state of each of the ten steps, read from the same API the screens use. */
export function useStepStatus(): Record<number, StepStatus> | undefined {
  const facts = useFacts().data;
  const evidence = useEvidence().data;
  const tasks = useTasks().data;
  const runs = useRuns().data;
  const briefs = useBriefs().data;
  const packages = usePackages().data;
  const leads = useLeads().data;
  const recon = useRecon(3).data;
  const settings = useSettings().data;
  const dash = useDashboard().data;
  if (
    !facts ||
    !evidence ||
    !tasks ||
    !runs ||
    !briefs ||
    !packages ||
    !leads ||
    !recon ||
    !settings ||
    !dash
  )
    return undefined;

  const external = facts.entries.filter((f) => f.page === 'external' && f.status !== 'superseded');
  const unusable = external.filter((f) => !f.publiclyUsable);
  const superseded = facts.entries.filter((f) => f.status === 'superseded').length;
  const lastAudit = runs.find((r) => r.agent === 'audit' && r.status !== 'queued');
  const lastFeedback = runs.find((r) => r.agent === 'feedback' && r.status === 'completed');
  const open = evidence.filter((e) => e.status === 'open');
  const openP0 = open.filter((e) => e.priority === 'P0');
  const by = (s: string) => tasks.filter((t) => t.status === s);
  const inFactory = briefs.filter((b) =>
    ['submitted', 'accepted', 'in_production'].includes(b.status),
  );
  const receiptsToQa = briefs.filter((b) => b.status === 'delivered');
  const pkg = (s: string) => packages.filter((p) => p.status === s);
  const pendingLeads = leads.filter((l) => l.validity.value === 'pending');
  const zeroCpl = recon.rows.filter((r) => r.paidCpl === null);
  const undecidedSuggestions = runs.flatMap((r) =>
    r.outputs.filter((o) => o.type === 'suggestion' && !o.decision),
  );

  return {
    1: {
      tone: 'ok',
      text: `${facts.version} · ${plural(external.length, 'external entry', 'external entries')}, ${plural(facts.entries.filter((f) => f.page === 'internal').length, 'internal entry', 'internal entries')}${superseded ? `, ${superseded} superseded` : ''} · ${plural(tasks.length, 'task')} on the board`,
      links: [
        { to: '/fact-sheet', label: 'Fact Sheet' },
        { to: '/tasks', label: 'Tasks' },
      ],
    },
    2: {
      tone: lastAudit?.status === 'completed' ? 'ok' : 'blocked',
      text: lastAudit
        ? `Last audit ${lastAudit.id} ${lastAudit.status} ${fmtDateTime(lastAudit.finishedAt ?? lastAudit.createdAt)}${lastAudit.error ? ` — ${lastAudit.error}` : ''}`
        : 'No audit run yet',
      links: [{ to: '/agents', label: 'Run Audit' }],
    },
    3: {
      tone: openP0.length ? 'blocked' : open.length ? 'waiting' : 'ok',
      text: `${plural(open.length, 'open finding')}${openP0.length ? `, ${openP0.length} P0 (${openP0.map((e) => e.id).join(', ')})` : ''} not yet a task`,
      links: [{ to: '/evidence?status=open', label: 'Findings' }],
    },
    4: {
      tone: unusable.length ? 'waiting' : 'ok',
      text: unusable.length
        ? `Waiting on the client: ${unusable.map((f) => `${f.id} ${f.label}`).join(', ')}. Scope signed by ${settings.preApprovedScope.signedBy}.`
        : `All public facts confirmed. Scope signed by ${settings.preApprovedScope.signedBy}.`,
      links: [
        { to: '/fact-sheet', label: 'Confirm facts' },
        { to: '/settings', label: 'Pre-approved scope' },
      ],
    },
    5: {
      tone: by('blocked').length ? 'blocked' : 'ok',
      text: `${plural(by('draft').length, 'draft')}, ${by('blocked').length} blocked on facts, ${plural(inFactory.length, 'brief')} in the factory`,
      links: [
        { to: '/agents', label: 'Outbound' },
        { to: '/factory', label: 'Video factory' },
      ],
    },
    6: {
      tone: by('qa').length || receiptsToQa.length ? 'waiting' : 'ok',
      text: `${plural(by('qa').length, 'task')} in QA, ${plural(receiptsToQa.length, 'receipt')} waiting for QA`,
      links: [
        { to: '/tasks', label: 'Tasks' },
        { to: '/factory', label: 'Receipts' },
      ],
    },
    7: {
      tone: dash.awaitingApprovalCount ? 'waiting' : 'ok',
      text: `${plural(dash.awaitingApproval.tasks, 'task')} and ${plural(dash.awaitingApproval.packages, 'package')} awaiting the client`,
      links: [
        { to: '/publish?status=awaiting_approval', label: 'Publish' },
        { to: '/tasks', label: 'Tasks' },
      ],
    },
    8: {
      tone: pkg('mismatch').length
        ? 'blocked'
        : by('approved').length || pkg('scheduled').length
          ? 'waiting'
          : 'ok',
      text: `${plural(by('approved').length, 'approved task')} not live, ${pkg('scheduled').length} scheduled, ${pkg('published').length} published awaiting verification${pkg('mismatch').length ? `, ${pkg('mismatch').length} mismatch` : ''}`,
      links: [
        { to: '/publish', label: 'Publish' },
        { to: '/tasks', label: 'Tasks' },
      ],
    },
    9: {
      tone: zeroCpl.length ? 'waiting' : 'ok',
      text: `${plural(pendingLeads.length, 'lead')} with pending validity${zeroCpl.length ? `; ${zeroCpl.length} channel-week with spend and no valid leads` : ''}${lastFeedback ? `; last Feedback run ${fmtDay(lastFeedback.finishedAt)}` : ''}`,
      links: [
        { to: '/leads', label: 'Leads' },
        { to: '/leads?tab=reconciliation', label: 'Reconciliation' },
      ],
    },
    10: {
      tone: undecidedSuggestions.length ? 'waiting' : 'ok',
      text: `${plural(undecidedSuggestions.length, 'suggestion')} to decide; this week's report ${dash.reportThisWeek === 'sent' ? 'sent' : 'not sent yet'}; next checkpoint ${fmtDay(dash.nextCheckpoint)}`,
      links: [
        { to: '/week', label: 'Week plan and report' },
        { to: '/agents', label: 'Agent outputs' },
      ],
    },
  };
}
