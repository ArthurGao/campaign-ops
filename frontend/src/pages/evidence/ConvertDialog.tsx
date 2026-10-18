import { useId, useState } from 'react';
import {
  CHANNELS,
  TASK_TYPES,
  type Channel,
  type EvidenceItem,
  type TaskType,
} from '@campaign-ops/core';
import type { ApiError } from '@/api/client';
import { useConvertEvidence } from '@/api/queries/evidence';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_TYPE: Record<EvidenceItem['source'], TaskType> = {
  site: 'site_change',
  tracking: 'site_change',
  channels: 'social_post',
  seo: 'seo_change',
  geo: 'geo_change',
  ai_search: 'geo_change',
  sales: 'site_change',
};

/** Convert one or many evidence items into draft tasks (bulk "Convert to task"). */
export function ConvertDialog({ items, onClose }: { items: EvidenceItem[]; onClose(): void }) {
  const id = useId();
  const convert = useConvertEvidence();
  const single = items.length === 1 ? items[0] : undefined;
  const [type, setType] = useState<TaskType>(DEFAULT_TYPE[items[0].source]);
  const [title, setTitle] = useState(single?.finding ?? '');
  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [pageUrl, setPageUrl] = useState(
    ['site_change', 'seo_change', 'geo_change'].includes(DEFAULT_TYPE[items[0].source])
      ? 'https://demo-travel.example/tours/china-2027'
      : '',
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const pageType = ['site_change', 'seo_change', 'geo_change'].includes(type);

  const submit = async () => {
    setPending(true);
    setError(null);
    const created: string[] = [];
    try {
      for (const e of items) {
        const res = await convert.mutateAsync({
          id: e.id,
          type,
          ...(single && title ? { title } : {}),
          ...(channel ? { channel } : {}),
          ...(pageType && pageUrl ? { pageUrl } : {}),
        });
        created.push(res.task.id);
      }
      toast.success(`Created ${created.join(', ')} as draft${created.length > 1 ? 's' : ''}`);
      onClose();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader
          title={
            single ? `Convert ${single.id} to a task` : `Convert ${items.length} items to tasks`
          }
          description={single ? single.finding : items.map((i) => i.id).join(', ')}
        />
        <Field label="Task type" htmlFor={`${id}-type`}>
          <SimpleSelect<TaskType>
            id={`${id}-type`}
            value={type}
            onChange={setType}
            options={TASK_TYPES}
          />
        </Field>
        {single ? (
          <Field label="Title" htmlFor={`${id}-title`}>
            <Input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Channel" htmlFor={`${id}-ch`} help="Optional for site work.">
          <SimpleSelect<Channel>
            id={`${id}-ch`}
            value={channel}
            onChange={setChannel}
            options={CHANNELS}
            placeholder="None"
          />
        </Field>
        {pageType ? (
          <Field label="Page URL" htmlFor={`${id}-url`} help="One live change per page at a time.">
            <Input id={`${id}-url`} value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
          </Field>
        ) : null}
        <BlockedHint error={error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={submit}>
            Create {items.length > 1 ? `${items.length} tasks` : 'task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
