import type { Clock } from '../domain/clock';
import { isPubliclyUsable } from '../domain/rules/facts';
import type { DashboardResponse } from '../domain/types';
import type { MemoryStore } from '../store/memory.store';
import type { TasksService } from './tasks.service';

const DAY_MS = 86_400_000;

export class DashboardService {
  constructor(
    private readonly store: MemoryStore,
    private readonly tasks: TasksService,
    private readonly clock: Clock,
  ) {}

  get(): DashboardResponse {
    const now = this.clock.now();
    const { facts, evidence, packages, settings, ops, funnel, factSheetVersion } = this.store.data;
    const tasks = this.tasks.list();
    const external = facts.filter((f) => f.page === 'external' && f.status !== 'superseded' && f.status !== 'rejected');
    const usable = external.filter((f) => isPubliclyUsable(f, now));
    const verifiedTasks = new Set(tasks.filter((t) => t.status === 'verified').map((t) => t.id));

    const blockers: DashboardResponse['blockers'] = [
      ...evidence
        .filter((e) => e.blocks !== 'none' && e.status !== 'dismissed' && !(e.convertedTaskId && verifiedTasks.has(e.convertedTaskId)))
        .map((item) => ({ kind: 'evidence' as const, item })),
      ...tasks.filter((t) => t.needsConfirmation && t.status !== 'verified').map((item) => ({ kind: 'task' as const, item })),
    ];

    const start = new Date(settings.campaign.startDate).getTime();
    const period = settings.checkpointEveryDays * DAY_MS;
    const nextCheckpoint = new Date(start + Math.max(1, Math.ceil((now.getTime() - start) / period)) * period).toISOString();

    const awaitingTasks = tasks.filter((t) => t.status === 'awaiting_approval').length;
    const awaitingPackages = packages.filter((p) => p.status === 'awaiting_approval').length;
    const [lastWeek, thisWeek] = funnel.slice(-2);

    return {
      threeQuestions: {
        canSell: {
          usable: usable.length,
          total: external.length,
          pending: external.filter((f) => !isPubliclyUsable(f, now)).map((f) => ({ id: f.id, label: f.label, status: f.status })),
        },
        canCatch: { landingPageStatus: settings.landingPage.status, checks: settings.landingPage.checks, lastTestEnquiry: ops.lastTestEnquiry },
        canMeasure: ops.tracking,
      },
      funnel: { thisWeek, lastWeek },
      blockers,
      awaitingApprovalCount: awaitingTasks + awaitingPackages,
      awaitingApproval: { tasks: awaitingTasks, packages: awaitingPackages },
      nextCheckpoint,
      hoursThisWeek: { used: ops.hoursThisWeek, cap: ops.hoursCap },
      now: now.toISOString(),
      factSheetVersion,
    };
  }
}
