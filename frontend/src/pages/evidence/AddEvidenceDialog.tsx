import { useId, useState } from 'react';
import {
  BLOCKS,
  EVIDENCE_SOURCES,
  PRIORITIES,
  type Blocks,
  type EvidenceSource,
  type Priority,
} from '@campaign-ops/core';
import { useCreateEvidence } from '@/api/queries/evidence';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';

export function AddEvidenceDialog({ onClose }: { onClose(): void }) {
  const id = useId();
  const create = useCreateEvidence();
  const [f, setF] = useState({
    source: 'site' as EvidenceSource,
    finding: '',
    proof: '',
    impact: '',
    blocks: 'none' as Blocks,
    priority: 'P1' as Priority,
    owner: '',
    needsApproval: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = () =>
    create.mutate(
      {
        source: f.source,
        finding: f.finding,
        proof: f.proof ? [{ label: f.proof }] : [],
        impact: f.impact,
        blocks: f.blocks,
        priority: f.priority,
        suggestedOwner: f.owner || 'PM',
        needsApproval: f.needsApproval,
      },
      { onSuccess: onClose },
    );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide>
        <DialogHeader
          title="Add evidence"
          description="Finding, proof and impact. Report the problem; the fix is a task."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Source" htmlFor={`${id}-s`}>
            <SimpleSelect<EvidenceSource>
              id={`${id}-s`}
              value={f.source}
              onChange={(v) => set('source', v)}
              options={EVIDENCE_SOURCES}
            />
          </Field>
          <Field label="Blocks" htmlFor={`${id}-b`}>
            <SimpleSelect<Blocks>
              id={`${id}-b`}
              value={f.blocks}
              onChange={(v) => set('blocks', v)}
              options={BLOCKS}
            />
          </Field>
          <Field label="Priority" htmlFor={`${id}-p`}>
            <SimpleSelect<Priority>
              id={`${id}-p`}
              value={f.priority}
              onChange={(v) => set('priority', v)}
              options={PRIORITIES}
            />
          </Field>
        </div>
        <Field label="Finding" htmlFor={`${id}-f`}>
          <Input
            id={`${id}-f`}
            value={f.finding}
            onChange={(e) => set('finding', e.target.value)}
          />
        </Field>
        <Field label="Proof" htmlFor={`${id}-pr`} help="Screenshot label, URL or request log.">
          <Input id={`${id}-pr`} value={f.proof} onChange={(e) => set('proof', e.target.value)} />
        </Field>
        <Field label="Impact" htmlFor={`${id}-i`}>
          <Textarea
            id={`${id}-i`}
            value={f.impact}
            onChange={(e) => set('impact', e.target.value)}
            className="min-h-16"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Suggested owner" htmlFor={`${id}-o`}>
            <Input
              id={`${id}-o`}
              value={f.owner}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="PM, Website (client), Ask client…"
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox
              checked={f.needsApproval}
              onCheckedChange={(v) => set('needsApproval', v === true)}
            />
            Needs client approval
          </label>
        </div>
        <BlockedHint error={create.error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!f.finding.trim()}
            onClick={submit}
          >
            Add evidence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
