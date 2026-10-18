import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, Plus } from 'lucide-react';
import {
  BLOCKS,
  EVIDENCE_SOURCES,
  EVIDENCE_STATUSES,
  PRIORITIES,
  type EvidenceItem,
} from '@campaign-ops/core';
import { useEvidence, usePatchEvidence } from '@/api/queries/evidence';
import { ActionButton } from '@/components/shared/ActionButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState, PageHeader } from '@/components/shared/Layout';
import { Button } from '@/components/ui/button';
import { SimpleSelect } from '@/components/ui/select';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';
import { AddEvidenceDialog } from './AddEvidenceDialog';
import { ConvertDialog } from './ConvertDialog';
import { EvidenceTable } from './EvidenceTable';

const FILTERS = [
  { key: 'source', label: 'Source', options: EVIDENCE_SOURCES },
  { key: 'blocks', label: 'Blocks', options: BLOCKS },
  { key: 'priority', label: 'Priority', options: PRIORITIES },
  { key: 'status', label: 'Status', options: EVIDENCE_STATUSES },
] as const;

export default function EvidencePage() {
  const [params, setParams] = useSearchParams();
  const { data, isLoading } = useEvidence();
  const patch = usePatchEvidence();
  const role = useRoleStore((s) => s.role);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [converting, setConverting] = useState<EvidenceItem[] | null>(null);
  const [dismissing, setDismissing] = useState<EvidenceItem | null>(null);
  const [adding, setAdding] = useState(false);
  const focus = params.get('focus');

  const items = useMemo(
    () =>
      (data ?? []).filter((e) =>
        FILTERS.every((f) => !params.get(f.key) || e[f.key] === params.get(f.key)),
      ),
    [data, params],
  );
  useEffect(() => {
    if (focus && data) document.getElementById(`row-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus, data]);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };
  const chosen = (data ?? []).filter((e) => selected.has(e.id));
  const hasExamples = (data ?? []).some((e) => e.isExample);

  return (
    <>
      <PageHeader
        title={copy.pages.evidence.title}
        steps={[2, 3]}
        lede={copy.pages.evidence.lede}
        actions={
          <ActionButton
            variant="primary"
            permission="evidence.edit"
            onClick={() => setAdding(true)}
          >
            <Plus /> Add evidence
          </ActionButton>
        }
      />
      <div className="grid gap-3">
        {hasExamples ? (
          <p className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Items labelled “Format example only” show how evidence is recorded. They are seeded
            examples, not a diagnosis of a real site.
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-3">
          {FILTERS.map((f) => (
            <label key={f.key} className="grid gap-1 text-xs font-medium text-ink-2">
              {f.label}
              <SimpleSelect
                value={params.get(f.key) ?? 'all'}
                onChange={(v) => setFilter(f.key, v)}
                options={[
                  { value: 'all', label: 'All' },
                  ...f.options.map((o) => ({ value: o, label: o.replace(/_/g, ' ') })),
                ]}
                className="w-40"
                label={f.label}
              />
            </label>
          ))}
          <span className="ml-auto pb-2 font-mono text-xs text-ink-3">
            {items.length} of {data?.length ?? 0}
          </span>
        </div>
        {selected.size ? (
          <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm">
            <span className="font-medium text-accent-strong">{selected.size} selected</span>
            <ActionButton
              size="sm"
              variant="primary"
              permission="evidence.edit"
              onClick={() => setConverting(chosen.filter((e) => e.status === 'open'))}
            >
              Convert to tasks
            </ActionButton>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : null}
        {isLoading ? (
          <SkeletonRows />
        ) : items.length ? (
          <EvidenceTable
            items={items}
            selected={selected}
            canSelect={can(role, 'evidence.edit').ok}
            focus={focus}
            onSelect={(id, on) =>
              setSelected((s) => {
                const n = new Set(s);
                if (on) n.add(id);
                else n.delete(id);
                return n;
              })
            }
            onConvert={(e) => setConverting([e])}
            onDismiss={setDismissing}
          />
        ) : (
          <EmptyState
            title="No evidence matches these filters."
            body="Clear a filter, or run the Audit agent to collect findings with proof."
          />
        )}
      </div>
      {converting?.length ? (
        <ConvertDialog
          items={converting}
          onClose={() => {
            setConverting(null);
            setSelected(new Set());
          }}
        />
      ) : null}
      <ConfirmDialog
        open={!!dismissing}
        onOpenChange={(o) => !o && setDismissing(null)}
        title={`Dismiss ${dismissing?.id ?? ''}`}
        description={dismissing?.finding}
        confirmLabel="Dismiss"
        note={{ label: 'Why it needs no action', required: true }}
        onConfirm={(reason) =>
          patch.mutateAsync({ id: dismissing!.id, status: 'dismissed', reason })
        }
      />
      {adding ? <AddEvidenceDialog onClose={() => setAdding(false)} /> : null}
    </>
  );
}
