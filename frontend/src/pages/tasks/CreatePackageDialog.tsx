import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PACKAGE_CHANNEL, type Task } from '@campaign-ops/core';
import { useAssets } from '@/api/queries/factory';
import { useCreatePackage } from '@/api/queries/tasks';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';

const NONE = '__none';

/** Package = asset version + caption version + generated UTM link; goes to the client for approval. */
export function CreatePackageDialog({ task, onClose }: { task: Task; onClose(): void }) {
  const id = useId();
  const navigate = useNavigate();
  const assets = useAssets().data ?? [];
  const create = useCreatePackage();
  const [assetId, setAssetId] = useState<string>(NONE);
  const channel = PACKAGE_CHANNEL[task.channel ?? ''] ?? task.channel ?? 'website';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader
          title={`Create package from ${task.id}`}
          description={`Channel ${channel.replace(/_/g, ' ')}. The caption is the task body; the link is generated from the UTM template and cannot be edited.`}
        />
        <Field
          label="Asset"
          htmlFor={`${id}-a`}
          help="Only assets from receipts that passed factory QA are offered."
        >
          <SimpleSelect
            id={`${id}-a`}
            value={assetId}
            onChange={setAssetId}
            options={[
              { value: NONE, label: 'No asset (text only)' },
              ...assets.map((a) => ({
                value: a.assetId,
                label: `${a.assetId} · ${a.ratio} · ${a.briefId}`,
              })),
            ]}
          />
        </Field>
        <BlockedHint error={create.error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { id: task.id, ...(assetId !== NONE ? { assetId } : {}) },
                { onSuccess: (p) => navigate(`/publish/${p.id}`) },
              )
            }
          >
            Create package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
