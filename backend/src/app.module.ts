import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppExceptionFilter } from './common/errors';
import { RolesGuard } from './common/roles.guard';
import { CoreModule } from './core/core.module';
import { AgentsModule } from './modules/agents/agents.module';
import { DashboardModule } from './modules/dashboard/dashboard.controller';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { FactSheetModule } from './modules/fact-sheet/fact-sheet.module';
import { FactoryModule } from './modules/factory/factory.module';
import { HealthModule } from './modules/health/health.module';
import { LeadsModule } from './modules/leads/leads.module';
import { PackagesModule } from './modules/packages/packages.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.controller';
import { SettingsModule } from './modules/settings/settings.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    CoreModule,
    HealthModule,
    DashboardModule,
    FactSheetModule,
    EvidenceModule,
    TasksModule,
    AgentsModule,
    FactoryModule,
    PackagesModule,
    LeadsModule,
    ReconciliationModule,
    SettingsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
