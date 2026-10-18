import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import type { WeekView } from '@campaign-ops/core';
import { useTasks } from '@/api/queries/tasks';
import { useSetPlan } from '@/api/queries/weeks';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { EmptyState, Section } from '@/components/shared/Layout';
import { RichText } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { SimpleSelect } from '@/components/ui/select';
import { copy } from '@/lib/copy';
import { humanize } from '@/lib/format';

export function PlanTab({ view }: { view: WeekView }) {
  const tasks = useTasks().data ?? [];
  const setPlan = useSetPlan();
  const [pick, setPick] = useState<string>();
  const ids = view.plan.map((i) => i.taskId);
  const open = tasks.filter((t) => t.status !== 'verified' && !ids.includes(t.id));
  const save = (taskIds: string[], then?: () => void) =>
    setPlan.mutate({ week: view.week, taskIds }, { onSuccess: then });
  const locked = view.isPast ? copy.week.pastPlan : undefined;

  return (
    <Section
      title="Planned tasks"
      count={view.plan.length}
      id="plan"
      actions={<span className="text-xs text-ink-3">{copy.week.planHelp}</span>}
    >
      {view.plan.length ? (
        <div className="overflow-x-auto rounded-md border border-rule bg-surface">
          <table className="data-table min-w-[48rem]">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col" className="w-[38%]">
                  Title
                </th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
                <th scope="col">Stops it</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {view.plan.map((i) => (
                <tr key={i.taskId} id={`plan-${i.taskId}`}>
                  <td className="whitespace-nowrap">
                    <Link
                      to={`/tasks?task=${i.taskId}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {i.taskId}
                    </Link>
                    <span className="block text-[0.7rem] text-ink-3">{humanize(i.type)}</span>
                  </td>
                  <td>
                    <RichText text={i.title} />
                  </td>
                  <td>
                    <StatusChip status={i.status} />
                  </td>
                  <td className="whitespace-nowrap text-[0.8125rem]">{i.owner}</td>
                  <td className="text-[0.8125rem]">
                    {i.done ? (
                      <span className="inline-flex items-center gap-1 text-ok">
                        <Check className="size-3.5" aria-hidden /> Done
                      </span>
                    ) : i.blocker ? (
                      <span className="text-bad">{i.blocker}</span>
                    ) : (
                      <span className="text-ink-3">Nothing</span>
                    )}
                  </td>
                  <td className="text-right">
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      permission="week.edit"
                      blockedReason={locked}
                      aria-label={`Remove ${i.taskId} from the plan`}
                      onClick={() => save(ids.filter((id) => id !== i.taskId))}
                    >
                      <X />
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Nothing planned for this week."
          body="Pick tasks from the board below."
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect
          label="Task to add"
          value={pick}
          onChange={setPick}
          placeholder="Add a task from the board…"
          options={open.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))}
          className="w-[min(100%,28rem)]"
          disabled={!!locked}
        />
        <ActionButton
          permission="week.edit"
          blockedReason={locked}
          disabled={!pick}
          loading={setPlan.isPending}
          onClick={() => pick && save([...ids, pick], () => setPick(undefined))}
        >
          Add to plan
        </ActionButton>
      </div>
      <BlockedHint error={setPlan.error} />
    </Section>
  );
}
