import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { RATIOS, type BriefDraft, type Ratio } from '@campaign-ops/core';
import { useBriefPrefill } from '@/api/queries/tasks';
import { useCreateBrief, useSendBrief } from '@/api/queries/factory';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { FactRefs } from '@/components/shared/FactChip';
import { JsonPeek } from '@/components/shared/JsonPeek';
import { Section } from '@/components/shared/Layout';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { SkeletonRows } from '@/components/ui/skeleton';

/** New brief prefilled from a video_brief task; save runs the fact and duplicate checks, then send. */
export function BriefForm({ taskId, onCancel }: { taskId: string; onCancel(): void }) {
  const id = useId();
  const navigate = useNavigate();
  const prefill = useBriefPrefill();
  const create = useCreateBrief();
  const send = useSendBrief();
  const [draft, setDraft] = useState<BriefDraft | null>(null);
  const [facts, setFacts] = useState('');

  useEffect(() => {
    prefill.mutate(taskId, {
      onSuccess: (d) => {
        setDraft(d);
        setFacts(d.allowedFacts.join(', '));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill once per task
  }, [taskId]);

  if (prefill.error) return <BlockedHint error={prefill.error} />;
  if (!draft) return <SkeletonRows rows={6} />;
  const set = <K extends keyof BriefDraft>(k: K, v: BriefDraft[K]) =>
    setDraft({ ...draft, [k]: v });
  const body = (): BriefDraft => ({
    ...draft,
    allowedFacts: facts
      .split(/[\s,]+/)
      .map((f) => f.trim().toUpperCase())
      .filter(Boolean),
  });

  const saveAndSend = () =>
    create.mutate(body(), {
      onSuccess: (b) => send.mutate(b.id, { onSettled: () => navigate(`/factory/${b.id}`) }),
    });

  return (
    <Section title={`New brief from ${taskId}`}>
      <div className="grid gap-4 rounded-md border border-rule bg-surface p-4">
        <Field label="Objective" htmlFor={`${id}-o`}>
          <Textarea
            id={`${id}-o`}
            value={draft.objective}
            onChange={(e) => set('objective', e.target.value)}
            className="min-h-16"
          />
        </Field>
        <Field
          label="Allowed facts"
          htmlFor={`${id}-f`}
          help="Every allowed fact must be publicly usable when the brief is saved and sent."
        >
          <Input
            id={`${id}-f`}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            className="font-mono"
          />
        </Field>
        <FactRefs ids={body().allowedFacts} />
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[0.8125rem] font-medium">Deliverables</legend>
          {draft.deliverables.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <SimpleSelect<Ratio>
                value={d.ratio}
                onChange={(v) =>
                  set(
                    'deliverables',
                    draft.deliverables.map((x, j) => (j === i ? { ...x, ratio: v } : x)),
                  )
                }
                options={RATIOS}
                className="w-28"
                label="Ratio"
              />
              <Input
                aria-label="Channel"
                value={d.channel}
                onChange={(e) =>
                  set(
                    'deliverables',
                    draft.deliverables.map((x, j) =>
                      j === i ? { ...x, channel: e.target.value } : x,
                    ),
                  )
                }
                className="w-52"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove deliverable"
                onClick={() =>
                  set(
                    'deliverables',
                    draft.deliverables.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="justify-self-start"
            onClick={() =>
              set('deliverables', [
                ...draft.deliverables,
                { channel: 'facebook_feed', ratio: '4:5' },
              ])
            }
          >
            <Plus /> Add ratio
          </Button>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Deadline" htmlFor={`${id}-d`}>
            <Input
              id={`${id}-d`}
              type="date"
              value={draft.deadline.slice(0, 10)}
              onChange={(e) =>
                set('deadline', new Date(`${e.target.value}T17:00:00+13:00`).toISOString())
              }
            />
          </Field>
          <Field label="Max credits" htmlFor={`${id}-c`}>
            <Input
              id={`${id}-c`}
              type="number"
              min={1}
              value={draft.costCap.maxCredits}
              onChange={(e) =>
                set('costCap', { ...draft.costCap, maxCredits: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Max re-renders" htmlFor={`${id}-r`}>
            <Input
              id={`${id}-r`}
              type="number"
              min={0}
              value={draft.costCap.maxRerenders}
              onChange={(e) =>
                set('costCap', { ...draft.costCap, maxRerenders: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <p className="text-sm text-ink-2">
          Market: {draft.marketLanguage}. Forbidden: {draft.forbidden.join('; ')}.
        </p>
        <JsonPeek value={body()} label="Brief JSON (as the factory receives it)" />
        <BlockedHint error={create.error ?? send.error} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            loading={create.isPending || send.isPending}
            onClick={saveAndSend}
          >
            Save and send to factory
          </Button>
          <Button
            loading={create.isPending}
            onClick={() =>
              create.mutate(body(), { onSuccess: (b) => navigate(`/factory/${b.id}`) })
            }
          >
            Save draft
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Section>
  );
}
