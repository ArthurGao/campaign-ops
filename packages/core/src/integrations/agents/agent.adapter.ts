import type { AgentId } from '../../domain/enums';
import type { DeidentifiedRow } from '../../domain/rules/leads';
import type {
  AgentOutput,
  Brief,
  FactView,
  FunnelWeek,
  PublishPackage,
  ReconRow,
  Settings,
  Task,
} from '../../domain/types';

/** What a mock (or, in phase 2, real) agent returns; ids and decisions are added by the service. */
export type AgentOutputDraft = Omit<AgentOutput, 'id' | 'decision'>;

export type RunContext = { now: Date; runId: string };

export interface AgentAdapter {
  readonly id: AgentId;
  /** Input snapshot stored on the run and shown in the UI. */
  snapshot(inputs: Record<string, unknown>): Record<string, unknown>;
  run(inputs: Record<string, unknown>, ctx: RunContext): Promise<AgentOutputDraft[]>;
}

/** The Outbound agent's only window on the Fact Sheet: external entries, by type (I-F1, I-A3). */
export interface ExternalFactReader {
  getExternal(): FactView[];
  version(): string;
}

/** Full Fact Sheet incl. the internal page — Feedback agent only. */
export interface FullFactReader {
  list(): { version: string; entries: FactView[] };
}

export interface TaskReader {
  find(id: string): Task | undefined;
  list(): Task[];
}

export interface BriefReader {
  find(id: string): Brief | undefined;
}

export interface PackageReader {
  find(id: string): PublishPackage | undefined;
  list(): PublishPackage[];
}

export interface SettingsReader {
  get(): Settings;
}

export interface ResultsReader {
  recon(): ReconRow[];
  funnel(): FunnelWeek[];
  /** De-identified CRM export (R9): no names, emails, phones, click ids. */
  crmExport(): DeidentifiedRow[];
}
