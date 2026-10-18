import { Global, Module, type Provider } from '@nestjs/common';
import {
  AgentsService,
  createCore,
  DashboardService,
  DemoClock,
  EvidenceService,
  FactoryService,
  FactSheetService,
  LeadsService,
  MemoryStore,
  PackagesService,
  ReconciliationService,
  SettingsService,
  TasksService,
  TimerScheduler,
  WeeksService,
  ReviewService,
  type Clock,
  type Core,
  type Scheduler,
} from '@campaign-ops/core';

export const CLOCK = Symbol('CLOCK');
export const SCHEDULER = Symbol('SCHEDULER');
export const CORE = Symbol('CORE');

const fromCore = <K extends keyof Core>(token: unknown, key: K): Provider => ({
  provide: token as never,
  inject: [CORE],
  useFactory: (core: Core) => core[key],
});

/**
 * The framework-free core (packages/core) wired into Nest. Services are plain classes, exposed under
 * their class tokens; tests override CLOCK and SCHEDULER.
 */
@Global()
@Module({
  providers: [
    { provide: CLOCK, useFactory: () => new DemoClock() },
    { provide: SCHEDULER, useFactory: () => new TimerScheduler() },
    {
      provide: CORE,
      inject: [CLOCK, SCHEDULER],
      useFactory: (clock: Clock, scheduler: Scheduler) => createCore({ clock, scheduler }),
    },
    fromCore(MemoryStore, 'store'),
    fromCore(FactSheetService, 'facts'),
    fromCore(SettingsService, 'settings'),
    fromCore(PackagesService, 'packages'),
    fromCore(TasksService, 'tasks'),
    fromCore(EvidenceService, 'evidence'),
    fromCore(FactoryService, 'factory'),
    fromCore(AgentsService, 'agents'),
    fromCore(LeadsService, 'leads'),
    fromCore(ReconciliationService, 'recon'),
    fromCore(DashboardService, 'dashboard'),
    fromCore(WeeksService, 'weeks'),
    fromCore(ReviewService, 'review'),
  ],
  exports: [
    CLOCK,
    SCHEDULER,
    CORE,
    MemoryStore,
    FactSheetService,
    SettingsService,
    PackagesService,
    TasksService,
    EvidenceService,
    FactoryService,
    AgentsService,
    LeadsService,
    ReconciliationService,
    DashboardService,
    WeeksService,
    ReviewService,
  ],
})
export class CoreModule {}
