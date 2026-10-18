import { DemoClock, TimerScheduler, type Clock, type Scheduler } from './domain/clock';
import { funnelTotals } from './domain/rules/funnel';
import { deidentify } from './domain/rules/leads';
import type { AgentAdapter } from './integrations/agents/agent.adapter';
import { MockAuditAdapter } from './integrations/agents/mock-audit.adapter';
import { MockFeedbackAdapter } from './integrations/agents/mock-feedback.adapter';
import { MockOutboundAdapter } from './integrations/agents/mock-outbound.adapter';
import type { FactoryClient } from './integrations/factory/factory.client';
import { MockFactoryClient } from './integrations/factory/mock-factory.client';
import { MockSocialClient } from './integrations/platforms/mock-social.client';
import type { SocialPlatformClient } from './integrations/platforms/social.client';
import { AgentsService } from './services/agents.service';
import { DashboardService } from './services/dashboard.service';
import { EvidenceService } from './services/evidence.service';
import { FactSheetService } from './services/fact-sheet.service';
import { FactoryService } from './services/factory.service';
import { LeadsService } from './services/leads.service';
import { PackagesService } from './services/packages.service';
import { ReconciliationService } from './services/reconciliation.service';
import { SettingsService } from './services/settings.service';
import { TasksService } from './services/tasks.service';
import { WeeksService } from './services/weeks.service';
import { IdService } from './store/id.service';
import { MemoryStore } from './store/memory.store';

export type CoreOptions = {
  clock?: Clock;
  scheduler?: Scheduler;
  store?: MemoryStore;
  factory?: FactoryClient;
  social?: SocialPlatformClient;
};

/**
 * Composition root shared by the NestJS backend and the in-browser mock API. Swapping a mock
 * integration for a real one happens here and nowhere else.
 */
export function createCore(opts: CoreOptions = {}) {
  const clock = opts.clock ?? new DemoClock();
  const scheduler = opts.scheduler ?? new TimerScheduler();
  const store = opts.store ?? new MemoryStore();
  const ids = new IdService(store);
  const social = opts.social ?? new MockSocialClient(store);
  const factoryClient = opts.factory ?? new MockFactoryClient(scheduler, clock);

  const facts = new FactSheetService(store, ids, clock);
  const settings = new SettingsService(store, clock, scheduler);
  const packages = new PackagesService(store, ids, clock);
  const tasks = new TasksService(store, ids, packages, clock);
  const evidence = new EvidenceService(store, ids, tasks, clock);
  const factory = new FactoryService(store, ids, tasks, packages, factoryClient, clock);
  const adapters: AgentAdapter[] = [
    new MockAuditAdapter(evidence),
    // Outbound gets a reader with getExternal() only: it cannot reach the internal page (I-F1).
    new MockOutboundAdapter(
      { getExternal: () => facts.getExternal(), version: () => facts.version() },
      tasks,
      factory,
      packages,
      settings,
      social,
    ),
    new MockFeedbackAdapter(
      {
        recon: () => store.data.recon,
        funnel: () => funnelTotals(store.data.funnel),
        adSets: () => store.data.adSets,
        crmExport: () => store.data.leads.filter((l) => !l.mergedInto).map(deidentify),
      },
      { list: () => facts.list() },
      settings,
      tasks,
    ),
  ];
  const agents = new AgentsService(
    store,
    ids,
    tasks,
    evidence,
    packages,
    adapters,
    clock,
    scheduler,
  );
  const leads = new LeadsService(store, ids, clock);
  const recon = new ReconciliationService(store);
  const dashboard = new DashboardService(store, tasks, clock);
  const weeks = new WeeksService(store, tasks, clock);

  return {
    clock,
    scheduler,
    store,
    ids,
    facts,
    settings,
    packages,
    tasks,
    evidence,
    factory,
    agents,
    leads,
    recon,
    dashboard,
    weeks,
  };
}

export type Core = ReturnType<typeof createCore>;
