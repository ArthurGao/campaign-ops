import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, GitMerge } from 'lucide-react';
import { SOURCE_MEDIUMS, STAGES, VALIDITIES } from '@campaign-ops/core';
import {
  fetchExportCsv,
  useLeads,
  useMergeLead,
  useMergeSuggestions,
  useRecon,
} from '@/api/queries/leads';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { EmptyState, PageHeader, Section } from '@/components/shared/Layout';
import { Button } from '@/components/ui/button';
import { SimpleSelect } from '@/components/ui/select';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { copy } from '@/lib/copy';
import { LeadEditDrawer } from './LeadEditDrawer';
import { LeadsTable } from './LeadsTable';
import { ReconChart } from './ReconChart';
import { ReconSummary, ReconTable } from './ReconTable';

const FILTERS = [
  {
    key: 'validity',
    label: 'Validity',
    options: VALIDITIES,
    get: (l: { validity: { value: string } }) => l.validity.value,
  },
  { key: 'stage', label: 'Stage', options: STAGES, get: (l: { stage: string }) => l.stage },
  {
    key: 'medium',
    label: 'Medium',
    options: SOURCE_MEDIUMS,
    get: (l: { source: { utmMedium?: string } }) => l.source.utmMedium ?? '',
  },
] as const;

/** Download the de-identified CSV as a file (I-L3). */
async function downloadCsv() {
  const csv = await fetchExportCsv();
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: 'crm-export-deidentified.csv',
  });
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'leads';
  const leads = useLeads();
  const suggestions = useMergeSuggestions().data ?? [];
  const merge = useMergeLead();
  const recon = useRecon(3);
  const [exporting, setExporting] = useState(false);
  const all = leads.data ?? [];
  const list = all.filter((l) =>
    FILTERS.every((f) => !params.get(f.key) || f.get(l as never) === params.get(f.key)),
  );
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const historicallyValid = all.filter((l) => l.everValid).length;

  return (
    <>
      <PageHeader
        title={copy.pages.leads.title}
        steps={[9]}
        lede={copy.pages.leads.lede}
        actions={
          <Button
            loading={exporting}
            onClick={() => (setExporting(true), downloadCsv().finally(() => setExporting(false)))}
          >
            <Download /> De-identified CSV
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => set('tab', v === 'leads' ? null : v)}>
        <TabsList>
          <TabsTrigger value="leads">
            Leads <span className="font-mono text-xs text-ink-3">{all.length}</span>
          </TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>
        <TabsContent value="leads" className="grid gap-3">
          {suggestions.map((s) => (
            <div
              key={s.leadId}
              className="flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm"
            >
              <GitMerge className="size-4 text-accent-strong" aria-hidden />
              <span>
                <span className="font-mono font-semibold">{s.leadId}</span> looks like{' '}
                <span className="font-mono font-semibold">{s.intoId}</span>: same{' '}
                {s.matchedOn.join(' and ')}, same tour and travel month ({s.travelDate ?? 'none'}).
              </span>
              <ActionButton
                size="sm"
                variant="primary"
                permission="lead.merge"
                loading={merge.isPending}
                onClick={() => merge.mutate({ id: s.leadId, intoId: s.intoId })}
              >
                Merge into {s.intoId}
              </ActionButton>
            </div>
          ))}
          <BlockedHint error={merge.error} />
          <div className="flex flex-wrap items-end gap-3">
            {FILTERS.map((f) => (
              <label key={f.key} className="grid gap-1 text-xs font-medium text-ink-2">
                {f.label}
                <SimpleSelect
                  value={params.get(f.key) ?? 'all'}
                  onChange={(v) => set(f.key, v)}
                  options={[
                    { value: 'all', label: 'All' },
                    ...f.options.map((o) => ({ value: o, label: o.replace(/_/g, ' ') })),
                  ]}
                  className="w-40"
                  label={f.label}
                />
              </label>
            ))}
            <p className="ml-auto pb-2 text-xs text-ink-2">
              <span className="font-mono">{historicallyValid}</span> historically valid ·{' '}
              <span className="font-mono">{list.length}</span> shown
            </p>
          </div>
          {leads.isLoading ? (
            <SkeletonRows />
          ) : list.length ? (
            <LeadsTable leads={list} onOpen={(id) => set('lead', id)} />
          ) : (
            <EmptyState title="No leads match these filters." />
          )}
        </TabsContent>
        <TabsContent value="reconciliation" className="grid gap-6">
          <p className="max-w-[80ch] text-sm text-ink-2">
            The CRM is the ledger; platform numbers are for diagnosis. Paid CPL = channel spend ÷
            de-duplicated valid leads. With spend and no valid leads there is no CPL, only what was
            spent.
          </p>
          {recon.data ? (
            <>
              <ReconChart rows={recon.data.rows} />
              <Section title="By week and channel">
                <ReconTable rows={recon.data.rows} />
              </Section>
              <Section title="Three-week totals">
                <ReconSummary byChannel={recon.data.summary.byChannel} />
              </Section>
            </>
          ) : (
            <SkeletonRows />
          )}
        </TabsContent>
      </Tabs>
      <LeadEditDrawer
        lead={all.find((l) => l.id === params.get('lead'))}
        onClose={() => set('lead', null)}
      />
    </>
  );
}
