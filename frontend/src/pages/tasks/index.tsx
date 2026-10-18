import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { TASK_TYPES, type TaskType } from '@campaign-ops/core';
import { useTasks } from '@/api/queries/tasks';
import { ActionButton } from '@/components/shared/ActionButton';
import { PageHeader } from '@/components/shared/Layout';
import { SimpleSelect } from '@/components/ui/select';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { ROLE_LABELS } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';
import { KanbanBoard } from './KanbanBoard';
import { NewTaskDialog } from './NewTaskDialog';
import { TaskDrawer } from './TaskDrawer';

const ROLE_NOTE: Record<string, string> = {
  sales: copy.readOnly('Sales', 'PM'),
  client_approver:
    'As client approver you approve or reject tasks in “Client approval”. Everything else is read-only.',
  client_decision_maker:
    'As decision maker you approve ad changes outside the pre-approved scope, and any other task awaiting approval.',
  executor: 'As executor you move approved work to Live. Ads also need all four gates.',
};

export default function TasksPage() {
  const [params, setParams] = useSearchParams();
  const { data, isLoading } = useTasks();
  const role = useRoleStore((s) => s.role);
  const [creating, setCreating] = useState(false);
  const type = params.get('type') ?? 'all';
  const tasks = useMemo(
    () => (data ?? []).filter((t) => type === 'all' || t.type === type),
    [data, type],
  );
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeader
        title={copy.pages.tasks.title}
        steps={[3, 5, 6, 7, 8]}
        lede={copy.pages.tasks.lede}
        actions={
          <>
            <SimpleSelect<string>
              value={type}
              onChange={(v) => update({ type: v === 'all' ? null : v })}
              options={[
                { value: 'all', label: 'All types' },
                ...TASK_TYPES.map((t: TaskType) => ({ value: t, label: t.replace(/_/g, ' ') })),
              ]}
              className="w-40"
              label="Filter by type"
            />
            <ActionButton
              variant="primary"
              permission="task.create"
              onClick={() => setCreating(true)}
            >
              <Plus /> New task
            </ActionButton>
          </>
        }
      />
      {role !== 'pm' ? (
        <p className="mb-3 rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink-2">
          <span className="font-semibold text-ink">{ROLE_LABELS[role]}:</span> {ROLE_NOTE[role]}
        </p>
      ) : null}
      {isLoading ? (
        <SkeletonRows rows={8} />
      ) : (
        <KanbanBoard
          tasks={tasks}
          onOpen={(id, tab) => update({ task: id, tab: tab ?? 'details' })}
        />
      )}
      <TaskDrawer
        id={params.get('task')}
        tab={params.get('tab') ?? 'details'}
        onTab={(t) => update({ tab: t })}
        onClose={() => update({ task: null, tab: null })}
      />
      {creating ? (
        <NewTaskDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            update({ task: id, tab: 'details' });
          }}
        />
      ) : null}
    </>
  );
}
