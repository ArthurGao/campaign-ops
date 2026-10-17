import type {
  AgentRun,
  Brief,
  EvidenceItem,
  FactEntry,
  FactSheetVersion,
  FunnelWeek,
  Lead,
  OpsStatus,
  PublishPackage,
  ReconRow,
  Settings,
  Task,
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

export const SEED_VERSION = 'seed-2026-10-15.1';

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
  funnel: FunnelWeek[];
  adSets: AdSetReport[];
  settings: Settings;
  ops: OpsStatus;
  livePosts: Record<string, string>;
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
  };
}
