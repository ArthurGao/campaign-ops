import { useAgents, useAiCost, useRuns } from '@/api/queries/agents';
import { PageHeader, Section } from '@/components/shared/Layout';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { AgentCard } from './AgentCard';
import { AiCost } from './AiCost';
import { RunsTable } from './RunsTable';

export default function AgentsPage() {
  const agents = useAgents();
  const runs = useRuns();
  const cost = useAiCost();
  return (
    <>
      <PageHeader
        title={copy.pages.agents.title}
        steps={[2, 5, 6, 8, 9, 10]}
        lede={copy.pages.agents.lede}
      />
      <div className="grid gap-8">
        {agents.data ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {agents.data.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        ) : (
          <SkeletonRows rows={4} />
        )}
        <Section title="Runs" count={runs.data?.length} id="runs">
          {runs.data ? <RunsTable runs={runs.data} /> : <SkeletonRows />}
        </Section>
        <Section title="AI cost" id="ai-cost">
          {cost.data ? <AiCost cost={cost.data} /> : <SkeletonRows />}
        </Section>
      </div>
    </>
  );
}
