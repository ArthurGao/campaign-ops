import { useId, useState } from 'react';
import { CHANNELS, TASK_TYPES, factRefsIn, type Channel, type TaskType } from '@campaign-ops/core';
import { useCreateTask } from '@/api/queries/tasks';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';

export function NewTaskDialog({
  onClose,
  onCreated,
}: {
  onClose(): void;
  onCreated(id: string): void;
}) {
  const id = useId();
  const create = useCreateTask();
  const [type, setType] = useState<TaskType>('social_post');
  const [channel, setChannel] = useState<Channel | undefined>('facebook');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const refs = factRefsIn(`${title} ${body}`);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide>
        <DialogHeader
          title="New task"
          description="Starts as a draft, or blocked if it cites a fact that is not confirmed."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type" htmlFor={`${id}-t`}>
            <SimpleSelect<TaskType>
              id={`${id}-t`}
              value={type}
              onChange={setType}
              options={TASK_TYPES}
            />
          </Field>
          <Field label="Channel" htmlFor={`${id}-c`}>
            <SimpleSelect<Channel>
              id={`${id}-c`}
              value={channel}
              onChange={setChannel}
              options={CHANNELS}
            />
          </Field>
        </div>
        <Field label="Title" htmlFor={`${id}-ti`}>
          <Input id={`${id}-ti`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field
          label="Body"
          htmlFor={`${id}-b`}
          help="Optional. Put the FS id after every fact; the task cites the ids it finds."
        >
          <Textarea id={`${id}-b`} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <p className="text-xs text-ink-2" aria-live="polite">
          Cites:{' '}
          {refs.length ? (
            <span className="font-mono">{refs.join(', ')}</span>
          ) : (
            'no Fact Sheet ids yet'
          )}
        </p>
        <BlockedHint error={create.error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!title.trim()}
            onClick={() =>
              create.mutate(
                {
                  type,
                  title,
                  ...(channel ? { channel } : {}),
                  ...(body ? { body } : {}),
                },
                { onSuccess: (t) => onCreated(t.id) },
              )
            }
          >
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
