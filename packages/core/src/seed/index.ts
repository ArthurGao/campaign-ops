import type {
  AgentRun,
  Brief,
  EvidenceItem,
  FactEntry,
  FactSheetVersion,
  FunnelRow,
  Lead,
  OpsStatus,
  PublishPackage,
  ReconRow,
  Settings,
  Task,
  TimeEntry,
  WeekPlan,
  WeeklyReport,
} from '../domain/types';
import { evidenceSeed } from './evidence.seed';
import { factorySeed } from './factory.seed';
import { FACT_SHEET_VERSION, factSheetSeed, factSheetVersionsSeed } from './fact-sheet.seed';
import { leadsSeed } from './leads.seed';
import { livePostsSeed, packagesSeed } from './packages.seed';
import { adSetsSeed, funnelSeed, reconSeed, type AdSetReport } from './recon.seed';
import { runsSeed } from './runs.seed';
import { opsSeed, settingsSeed } from './settings.seed';
import { tasksSeed } from './tasks.seed';
import { timeEntriesSeed, weeklyReportsSeed, weekPlansSeed } from './week.seed';

export const SEED_VERSION = 'seed-2026-10-18.1';

export type Seed = {
  seedVersion: string;
  factSheetVersion: string;
  facts: FactEntry[];
  factVersions: FactSheetVersion[];
  evidence: EvidenceItem[];
  tasks: Task[];
  runs: AgentRun[];
  briefs: Brief[];
  packages: PublishPackage[];
  leads: Lead[];
  recon: ReconRow[];
  funnel: FunnelRow[];
  adSets: AdSetReport[];
  settings: Settings;
  ops: OpsStatus;
  livePosts: Record<string, string>;
  timeEntries: TimeEntry[];
  weekPlans: WeekPlan[];
  weeklyReports: WeeklyReport[];
};

/** The whole demo dataset. Deterministic: every date is relative to SEED_NOW. */
export function buildSeed(): Seed {
  return {
    seedVersion: SEED_VERSION,
    factSheetVersion: FACT_SHEET_VERSION,
    facts: factSheetSeed(),
    factVersions: factSheetVersionsSeed(),
    evidence: evidenceSeed(),
    tasks: tasksSeed(),
    runs: runsSeed(),
    briefs: factorySeed(),
    packages: packagesSeed(),
    leads: leadsSeed(),
    recon: reconSeed(),
    funnel: funnelSeed(),
    adSets: adSetsSeed(),
    settings: settingsSeed(),
    ops: opsSeed(),
    livePosts: livePostsSeed(),
    timeEntries: timeEntriesSeed(),
    weekPlans: weekPlansSeed(),
    weeklyReports: weeklyReportsSeed(),
  };
}
