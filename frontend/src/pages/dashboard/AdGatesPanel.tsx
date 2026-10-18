import { Link } from 'react-router-dom';
import type { Task } from '@campaign-ops/core';
import { useTaskGates, useTasks } from '@/api/queries/tasks';
import { GateBadges } from '@/components/shared/GateBadges';
import { Section } from '@/components/shared/Layout';
import { StatusChip } from '@/components/shared/StatusChip';
import { Skeleton } from '@/components/ui/skeleton';
import { isAdTask } from '@/lib/tasks';

function AdRow({ task }: { task: Task }) {
  const { data } = useTaskGates(task.id);
  return (
    <li className="grid gap-2 py-3 first:pt-0 lg:grid-cols-[minmax(12rem,0.6fr)_minmax(0,1.4fr)] lg:items-start lg:gap-5">
      <div className="grid gap-1">
        <span className="flex items-center gap-2">
          <Link
            to={`/tasks?task=${task.id}&tab=gates`}
            className="font-mono text-xs text-accent hover:underline"
          >
            {task.id}
          </Link>
          <StatusChip status={task.status} />
        </span>
        <span className="text-sm font-medium leading-snug">{task.title}</span>
      </div>
      {data ? <GateBadges gates={data} /> : <Skeleton className="h-20" />}
    </li>
  );
}

/** R3 in the first viewport: every ad that is not verified yet, with its four gates. */
export function AdGatesPanel() {
  const ads = (useTasks().data ?? []).filter(
    (t) =>
      isAdTask(t) &&
      t.spendEffect !== 'decrease' &&
      !['verified', 'draft', 'blocked'].includes(t.status),
  );
  if (!ads.length) return null;
  return (
    <Section title="Paid traffic: ad gates" count={ads.length} id="ad-gates">
      <ul className="divide-y divide-rule">
        {ads.map((t) => (
          <AdRow key={t.id} task={t} />
        ))}
      </ul>
    </Section>
  );
}
