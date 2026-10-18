import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, Plus } from 'lucide-react';
import { useDashboard } from '@/api/queries/dashboard';
import { useFacts, useFactVersions } from '@/api/queries/facts';
import { ActionButton } from '@/components/shared/ActionButton';
import { PageHeader } from '@/components/shared/Layout';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { copy } from '@/lib/copy';
import { EditFactDialog } from './FactDialogs';
import { FactTable } from './FactTable';
import { HistoryTab } from './HistoryTab';
import { UsagesDrawer } from './UsagesDrawer';

const ORDER = {
  pending: 0,
  assumption: 1,
  rejected: 2,
  confirmed_with_expiry: 3,
  confirmed: 4,
  superseded: 5,
} as const;

export default function FactSheetPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'external';
  const usage = params.get('fact');
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useFacts();
  const versions = useFactVersions().data;
  const now = useDashboard().data?.now;
  const entries = data?.entries ?? [];
  const external = entries
    .filter((f) => f.page === 'external')
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.id.localeCompare(b.id));
  const internal = entries.filter((f) => f.page === 'internal');
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeader
        title={copy.pages.facts.title}
        steps={[1, 4]}
        lede={copy.pages.facts.lede}
        meta={data ? <VersionBadge label="Version">{data.version}</VersionBadge> : null}
        actions={
          <ActionButton variant="primary" permission="fact.edit" onClick={() => setAdding(true)}>
            <Plus /> Add entry
          </ActionButton>
        }
      />
      <Tabs value={tab} onValueChange={(v) => set('tab', v)}>
        <TabsList>
          <TabsTrigger value="external">
            External page <span className="font-mono text-xs text-ink-3">{external.length}</span>
          </TabsTrigger>
          <TabsTrigger value="internal">
            <Lock className="size-3.5" aria-hidden /> Internal page{' '}
            <span className="font-mono text-xs text-ink-3">{internal.length}</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            History <span className="font-mono text-xs text-ink-3">{versions?.length ?? ''}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="external">
          {isLoading ? (
            <SkeletonRows />
          ) : (
            <FactTable
              facts={external}
              page="external"
              now={now}
              onUsages={(id) => set('fact', id)}
            />
          )}
        </TabsContent>
        <TabsContent value="internal" className="grid gap-3">
          <p className="flex items-center gap-2 rounded-md border border-internal/30 bg-internal-soft px-3 py-2 text-sm text-internal">
            <Lock className="size-4" aria-hidden />
            Budget, targets and rates. Never sent to the Outbound agent, never cited publicly. Only
            the Feedback agent reads this page.
          </p>
          {isLoading ? (
            <SkeletonRows />
          ) : (
            <FactTable
              facts={internal}
              page="internal"
              now={now}
              onUsages={(id) => set('fact', id)}
            />
          )}
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
      <UsagesDrawer factId={usage} onClose={() => set('fact', null)} />
      {adding ? (
        <EditFactDialog
          page={tab === 'internal' ? 'internal' : 'external'}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </>
  );
}
