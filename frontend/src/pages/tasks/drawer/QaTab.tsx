import { useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Task } from '@campaign-ops/core';
import { useTransitionTask } from '@/api/queries/tasks';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copy } from '@/lib/copy';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/** QA checklist; passing it is what sends the task to client approval. */
export function QaTab({ task }: { task: Task }) {
  const id = useId();
  const transition = useTransitionTask();
  const [checks, setChecks] = useState<boolean[]>(copy.taskQa.map(() => false));
  const [notes, setNotes] = useState('');
  const all = checks.every(Boolean);

  if (task.status !== 'qa') {
    if (!task.qa)
      return (
        <p className="text-sm text-ink-3">
          {task.status === 'draft' || task.status === 'blocked'
            ? 'QA happens after the draft is sent to QA.'
            : 'No QA record.'}
        </p>
      );
    return (
      <div className="grid gap-2">
        <p className={cn('text-sm font-semibold', task.qa.passed ? 'text-ok' : 'text-bad')}>
          {task.qa.passed ? 'QA passed' : 'QA failed'} · {task.qa.by.name} ·{' '}
          <span className="font-mono font-normal">{fmtDateTime(task.qa.at)}</span>
        </p>
        <ul className="grid gap-1 text-sm">
          {task.qa.checklist.map((c) => (
            <li key={c.item} className="flex gap-2">
              {c.ok ? (
                <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Passed" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-bad" aria-label="Failed" />
              )}
              {c.item}
            </li>
          ))}
        </ul>
        {task.qa.notes ? <p className="text-sm italic text-ink-2">{task.qa.notes}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">QA checklist for v{task.version}</legend>
        {copy.taskQa.map((item, i) => (
          <label
            key={item}
            className="flex items-center gap-2.5 rounded-md border border-rule px-3 py-2 text-sm hover:bg-ground"
          >
            <Checkbox
              checked={checks[i]}
              onCheckedChange={(v) => setChecks((c) => c.map((x, j) => (j === i ? v === true : x)))}
            />
            {item}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-n`}>Notes</Label>
        <Textarea
          id={`${id}-n`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-16"
        />
      </div>
      <BlockedHint error={transition.error} />
      <ActionButton
        variant="primary"
        className="justify-self-start"
        roles={['pm']}
        blockedReason={all ? undefined : 'Tick every checklist item first.'}
        loading={transition.isPending}
        onClick={() =>
          transition.mutate({
            id: task.id,
            to: 'awaiting_approval',
            qa: {
              passed: true,
              checklist: copy.taskQa.map((item, i) => ({ item, ok: checks[i] })),
              ...(notes ? { notes } : {}),
            },
          })
        }
      >
        Pass QA and send for client approval
      </ActionButton>
    </div>
  );
}
