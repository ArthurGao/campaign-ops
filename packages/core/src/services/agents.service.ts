import { replaceById, stamp } from '../common/audit';
import { type IdService } from '../store/id.service';
import type { Clock, Scheduler } from '../domain/clock';
import {
  AGENT_IDS,
  OUTBOUND_MODES,
  type AgentId,
  type RunStatus,
  type RunTrigger,
} from '../domain/enums';
import { AppError, invalidTransition, notFound } from '../domain/errors';
import type {
  Actor,
  AgentCard,
  AgentOutput,
  AgentRun,
  DecisionResult,
  OutputDecision,
} from '../domain/types';
import type { AgentAdapter } from '../integrations/agents/agent.adapter';
import { AGENT_PROFILES, GUARDRAIL } from '../seed/agents.seed';
import { type MemoryStore } from '../store/memory.store';
import { type EvidenceService } from './evidence.service';
import { type PackagesService } from './packages.service';
import { type TasksService } from './tasks.service';

/** Run lifecycle timing (docs/03-agents.md): queued → running after 500 ms, then 2–6 s per agent. */
export const RUN_DELAYS: { queued: number } & Record<AgentId, number> = {
  queued: 500,
  audit: 3_000,
  outbound: 2_500,
  feedback: 4_000,
};
const BASE_TOKENS: Record<AgentId, number> = { audit: 30_000, outbound: 4_000, feedback: 15_000 };

export class AgentsService {
  private readonly adapters: Map<AgentId, AgentAdapter>;

  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly tasks: TasksService,
    private readonly evidence: EvidenceService,
    private readonly packages: PackagesService,
    adapters: AgentAdapter[],
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
  ) {
    this.adapters = new Map(adapters.map((a) => [a.id, a]));
  }

  private get runsData(): AgentRun[] {
    return this.store.data.runs;
  }

  cards(): AgentCard[] {
    return AGENT_IDS.map((id) => {
      const last = this.runs({ agent: id })[0];
      return {
        id,
        ...AGENT_PROFILES[id],
        reads: [...AGENT_PROFILES[id].reads],
        permissions: [...AGENT_PROFILES[id].permissions],
        guardrail: GUARDRAIL,
        ...(last
          ? {
              lastRun: {
                id: last.id,
                status: last.status,
                startedAt: last.startedAt,
                finishedAt: last.finishedAt,
              },
            }
          : {}),
      };
    });
  }

  runs(f: { agent?: AgentId; status?: RunStatus } = {}): AgentRun[] {
    return this.runsData
      .filter((r) => (!f.agent || r.agent === f.agent) && (!f.status || r.status === f.status))
      .sort((a, b) => b.id.localeCompare(a.id));
  }

  run(id: string): AgentRun {
    const r = this.runsData.find((x) => x.id === id);
    if (!r) throw notFound('Run', id);
    return r;
  }

  private update(
    id: string,
    patch: Partial<AgentRun>,
    actor: Actor,
    action: string,
    detail?: string,
  ): AgentRun {
    return replaceById(
      this.runsData,
      stamp({ ...this.run(id), ...patch }, this.clock.now(), actor, action, detail),
    );
  }

  start(
    agentId: string,
    trigger: RunTrigger | undefined,
    inputs: Record<string, unknown>,
    actor: Actor,
  ): { runId: string } {
    if (!(AGENT_IDS as readonly string[]).includes(agentId)) throw notFound('Agent', agentId);
    const agent = agentId as AgentId;
    const adapter = this.adapters.get(agent)!;
    if (
      agent === 'outbound' &&
      !(OUTBOUND_MODES as readonly unknown[]).includes(inputs.mode ?? 'draft')
    ) {
      throw new AppError(
        'VALIDATION',
        `mode must be one of ${OUTBOUND_MODES.join(', ')}.`,
        undefined,
        400,
      );
    }
    const resolvedTrigger: RunTrigger =
      trigger ?? (agent === 'feedback' && inputs.afterLaunchOf ? 'after_launch' : 'manual');
    if (resolvedTrigger === 'after_launch' && !inputs.afterLaunchOf) {
      throw new AppError(
        'VALIDATION',
        'An after-launch run needs afterLaunchOf (task id).',
        undefined,
        400,
      );
    }

    const snapshot = adapter.snapshot(inputs);
    if (agent === 'outbound') assertExternalOnly(snapshot);
    const at = this.clock.now().toISOString();
    const run: AgentRun = {
      id: this.ids.run(),
      agent,
      trigger: resolvedTrigger,
      inputs: snapshot,
      factSheetVersion: this.store.data.factSheetVersion,
      status: 'queued',
      outputs: [],
      requestedBy: actor,
      createdAt: at,
      updatedAt: at,
      events: [{ at, actor, action: `run ${resolvedTrigger}`, detail: agent }],
    };
    this.runsData.push(run);
    const system = { role: 'pm' as const, name: 'System' };

    this.scheduler.schedule(RUN_DELAYS.queued, () => {
      this.update(
        run.id,
        { status: 'running', startedAt: this.clock.now().toISOString() },
        system,
        'running',
      );
      this.scheduler.schedule(RUN_DELAYS[agent], () => {
        adapter
          .run(inputs, { now: this.clock.now(), runId: run.id })
          .then((drafts) => {
            const outputs: AgentOutput[] = drafts.map((d, i) => ({
              ...d,
              id: `${run.id}-O${i + 1}`,
            }));
            const tokens = BASE_TOKENS[agent] + outputs.length * 900;
            this.update(
              run.id,
              {
                status: 'completed',
                finishedAt: this.clock.now().toISOString(),
                outputs,
                costEstimate: { tokens, usd: Math.round(tokens * 0.0015) / 100 },
              },
              system,
              'completed',
              `${outputs.length} outputs`,
            );
          })
          .catch((e: unknown) => {
            this.update(
              run.id,
              {
                status: 'failed',
                finishedAt: this.clock.now().toISOString(),
                error: e instanceof Error ? e.message : String(e),
                costEstimate: { tokens: 0, usd: 0 },
              },
              system,
              'failed',
            );
          });
      });
    });
    return { runId: run.id };
  }

  /** R4 / I-A1 / I-A2: a person accepts or rejects each output; accepting creates exactly one record. */
  decide(
    runId: string,
    outputId: string,
    status: 'accepted' | 'rejected',
    note: string | undefined,
    actor: Actor,
  ): DecisionResult {
    const run = this.run(runId);
    if (run.status !== 'completed')
      throw invalidTransition(
        run.status,
        'decided',
        'Only outputs of completed runs can be reviewed.',
      );
    const output = run.outputs.find((o) => o.id === outputId);
    if (!output) throw notFound('Output', outputId);
    if (output.decision) {
      throw new AppError(
        'INVALID_TRANSITION',
        `${outputId} was already ${output.decision.status}.`,
        output.decision.createdId ? `Created ${output.decision.createdId}.` : undefined,
      );
    }

    let created: Pick<OutputDecision, 'createdType' | 'createdId'> = { createdType: 'none' };
    if (status === 'accepted') created = this.accept(run, output, actor);

    const decision: OutputDecision = {
      status,
      by: actor,
      at: this.clock.now().toISOString(),
      ...(note ? { note } : {}),
      ...created,
    };
    const outputs = run.outputs.map((o) => (o.id === outputId ? { ...o, decision } : o));
    const updated = this.update(
      runId,
      { outputs },
      actor,
      `${outputId} ${status}`,
      created.createdId ? `Created ${created.createdId}` : undefined,
    );
    return { createdType: decision.createdType, createdId: decision.createdId, run: updated };
  }

  private accept(
    run: AgentRun,
    output: AgentOutput,
    actor: Actor,
  ): Pick<OutputDecision, 'createdType' | 'createdId'> {
    const p = output.proposal;
    switch (output.type) {
      case 'observation':
        return { createdType: 'none' };
      case 'evidence': {
        if (p?.kind !== 'evidence') break;
        return {
          createdType: 'evidence',
          createdId: this.evidence.create({ ...p.evidence }, actor, run.id).id,
        };
      }
      case 'draft': {
        if (p?.kind !== 'task') break;
        const { taskId, ...fields } = p.task;
        if (taskId && this.tasks.find(taskId)) {
          return {
            createdType: 'task',
            createdId: this.tasks.applyAgentDraft(
              taskId,
              fields.body ?? '',
              fields.factRefs,
              actor,
              run.id,
            ).id,
          };
        }
        return {
          createdType: 'task',
          createdId: this.tasks.createInternal(
            { ...fields, originRunId: run.id },
            actor,
            `From ${run.id}`,
          ).id,
        };
      }
      case 'needs_confirmation': {
        if (p?.kind !== 'needs_confirmation') break;
        if (p.taskId && this.tasks.find(p.taskId)) {
          return {
            createdType: 'task',
            createdId: this.tasks.blockForConfirmation(p.taskId, p.factIds, actor, run.id).id,
          };
        }
        const t = this.tasks.createBlocked(
          { type: p.type, title: p.title, channel: p.channel, originRunId: run.id },
          p.factIds,
          actor,
        );
        return { createdType: 'task', createdId: t.id };
      }
      case 'suggestion': {
        if (p?.kind !== 'task') break;
        const input = { ...p.task, originRunId: run.id };
        if (output.inScope && p.scopeRef) {
          const auth = {
            scopeRef: p.scopeRef,
            authorisedBy: this.store.data.settings.preApprovedScope.signedBy,
          };
          return {
            createdType: 'task',
            createdId: this.tasks.createPreApproved(input, auth, actor).id,
          };
        }
        return {
          createdType: 'task',
          createdId: this.tasks.createInternal(
            input,
            actor,
            `From ${run.id} (outside pre-approved scope)`,
          ).id,
        };
      }
      case 'verification': {
        if (p?.kind !== 'verification') break;
        const ref = {
          result: p.result,
          runId: run.id,
          outputId: output.id,
          ...(p.diff ? { note: p.diff.join(' | ') } : {}),
        };
        if (p.target === 'task') {
          return {
            createdType: 'task',
            createdId: this.tasks.recordVerification(p.targetId, ref, actor).id,
          };
        }
        // The package's verified hook updates its live source task.
        const pkg = this.packages.applyAgentVerification(p.targetId, p.result, p.diff, actor, {
          runId: run.id,
          outputId: output.id,
        });
        return { createdType: 'package', createdId: pkg.id };
      }
    }
    throw new AppError('VALIDATION', `${output.id} has no record to create.`, 'Reject it instead.');
  }
}

/** I-A3: the Outbound input snapshot must contain external facts only. */
export function assertExternalOnly(snapshot: Record<string, unknown>): void {
  const entries =
    (snapshot.factSheet as { entries?: { id: string; page: string }[] } | undefined)?.entries ?? [];
  const leaked = entries.filter((e) => e.page !== 'external');
  if (leaked.length)
    throw new Error(
      `Internal facts leaked into the Outbound snapshot: ${leaked.map((e) => e.id).join(', ')}`,
    );
}
