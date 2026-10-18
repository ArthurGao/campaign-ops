import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ALLOWED_TRANSITIONS, type Task, type TaskStatus } from '@campaign-ops/core';
import { api, type ApiError } from '@/api/client';
import { copy } from '@/lib/copy';
import { requiresText, transitionRoles } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/store/role.store';
import { TaskCard } from './TaskCard';

const MAIN: TaskStatus[] = ['draft', 'qa', 'awaiting_approval', 'approved', 'live', 'verified'];
/** Moves that need input first open the drawer on the right tab instead of calling the API. */
const NEEDS_INPUT: Partial<Record<string, 'qa' | 'approval'>> = {
  'qa->awaiting_approval': 'qa',
  'awaiting_approval->draft': 'approval',
};

function Draggable({
  task,
  error,
  onOpen,
}: {
  task: Task;
  error?: ApiError | null;
  onOpen(): void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      error={error}
      onOpen={onOpen}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable task card"
      className={cn('cursor-grab touch-none', isDragging && 'opacity-30')}
    />
  );
}

function Column({
  status,
  tasks,
  active,
  errors,
  onOpen,
  side,
}: {
  status: TaskStatus;
  tasks: Task[];
  active?: Task;
  errors: Record<string, ApiError>;
  onOpen(id: string): void;
  side?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const role = useRoleStore((s) => s.role);
  const allowed = active ? ALLOWED_TRANSITIONS[active.status].includes(status) : false;
  const mine = active && allowed && transitionRoles(active, status).includes(role);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${copy.columns[status]} column, ${tasks.length} tasks`}
      className={cn(
        'flex w-[15.5rem] shrink-0 flex-col rounded-md border transition-colors duration-150',
        side ? 'border-bad/25 bg-bad-soft/40' : 'border-rule bg-panel/60',
        active &&
          active.status !== status &&
          (allowed ? (mine ? 'border-ok bg-ok-soft/60' : 'border-warn/60') : 'opacity-50'),
        isOver && allowed && 'ring-2 ring-ok/50',
      )}
    >
      <header className="flex items-center gap-2 border-b border-rule/80 px-2.5 py-2">
        <h2
          className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            side ? 'text-bad' : 'text-ink-2',
          )}
        >
          {copy.columns[status]}
        </h2>
        <span className="font-mono text-xs text-ink-3">{tasks.length}</span>
        {active && active.status !== status && allowed ? (
          <span className="ml-auto text-[0.68rem] font-medium text-ink-2">
            {mine ? 'Drop to move' : requiresText(transitionRoles(active, status))}
          </span>
        ) : null}
      </header>
      <div className="grid content-start gap-2 p-2">
        {tasks.map((t) => (
          <Draggable key={t.id} task={t} error={errors[t.id]} onOpen={() => onOpen(t.id)} />
        ))}
        {!tasks.length ? <p className="px-1 py-3 text-center text-xs text-ink-3">Empty</p> : null}
      </div>
    </section>
  );
}

/** Kanban with optimistic moves (the only optimistic UI, rule 8); a refused move snaps back with its reason. */
export function KanbanBoard({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen(id: string, tab?: string): void;
}) {
  const qc = useQueryClient();
  const role = useRoleStore((s) => s.role);
  const [active, setActive] = useState<Task | undefined>();
  const [errors, setErrors] = useState<Record<string, ApiError>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = async ({ active: a, over }: DragEndEvent) => {
    setActive(undefined);
    const task = (a.data.current as { task: Task }).task;
    const to = over?.id as TaskStatus | undefined;
    if (!to || to === task.status) return;
    const key = `${task.status}->${to}`;
    if (!ALLOWED_TRANSITIONS[task.status].includes(to)) {
      const next = ALLOWED_TRANSITIONS[task.status];
      toast.error(
        `Cannot move ${task.id} from ${copy.columns[task.status]} to ${copy.columns[to]}.`,
        {
          description: next.length
            ? `From ${copy.columns[task.status]} the next step is ${next.map((s) => copy.columns[s]).join(' or ')}.`
            : `${copy.columns[task.status]} is final.`,
        },
      );
      return;
    }
    const roles = transitionRoles(task, to);
    if (!roles.includes(role)) {
      toast.error(`Your role cannot move ${task.id} to ${copy.columns[to]}.`, {
        description: requiresText(roles),
      });
      return;
    }
    if (NEEDS_INPUT[key]) {
      onOpen(task.id, NEEDS_INPUT[key]);
      return;
    }
    const prev = qc.getQueryData<Task[]>(['tasks']);
    qc.setQueryData<Task[]>(['tasks'], (old) =>
      old?.map((t) => (t.id === task.id ? { ...t, status: to } : t)),
    );
    setErrors(({ [task.id]: _drop, ...rest }) => rest);
    try {
      await api.post<Task>(`/tasks/${task.id}/transition`, { to });
      toast.success(`${task.id} → ${copy.columns[to]}`);
    } catch (e) {
      const err = e as ApiError;
      qc.setQueryData(['tasks'], prev);
      setErrors((x) => ({ ...x, [task.id]: err }));
      toast.error(err.message, { description: err.hint });
    } finally {
      await qc.invalidateQueries();
    }
  };

  const by = (s: TaskStatus) => tasks.filter((t) => t.status === s);
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActive((e.active.data.current as { task: Task }).task)}
      onDragCancel={() => setActive(undefined)}
      onDragEnd={onDragEnd}
    >
      {/* Blocked sits first as the side column so it is never scrolled out of view. */}
      <div className="relative -mx-4 overflow-x-auto px-4 pb-3 lg:-mx-8 lg:px-8">
        <div className="flex items-start gap-2.5">
          <Column
            status="blocked"
            tasks={by('blocked')}
            active={active}
            errors={errors}
            onOpen={onOpen}
            side
          />
          <div className="mx-0.5 w-px self-stretch bg-rule" aria-hidden />
          {MAIN.map((s) => (
            <Column
              key={s}
              status={s}
              tasks={by(s)}
              active={active}
              errors={errors}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {active ? <TaskCard task={active} dragging onOpen={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
