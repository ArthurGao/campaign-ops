import { useTask, useTaskGates } from '@/api/queries/tasks';
import { GateBadges } from '@/components/shared/GateBadges';
import { HistoryList } from '@/components/shared/HistoryList';
import { RichText } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { ApprovalTab } from './drawer/ApprovalTab';
import { DetailsTab } from './drawer/DetailsTab';
import { QaTab } from './drawer/QaTab';
import { isAdTask } from '@/lib/tasks';
import { TransitionBar } from './TransitionBar';

export function TaskDrawer({
  id,
  tab,
  onTab,
  onClose,
}: {
  id: string | null;
  tab: string;
  onTab(tab: string): void;
  onClose(): void;
}) {
  const { data: task, isLoading } = useTask(id ?? undefined);
  // D-32: pauses and cuts go live without the launch gates, so the tab is not shown for them.
  const ad = !!task && isAdTask(task) && task.spendEffect !== 'decrease';
  const gates = useTaskGates(task?.id, ad).data;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      {id ? (
        <SheetContent
          title={task ? <RichText text={task.title} /> : id}
          description={
            task ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-2">{task.id}</span>
                <StatusChip status={task.status} />
                <VersionBadge>v{task.version}</VersionBadge>
              </span>
            ) : undefined
          }
        >
          {isLoading || !task ? (
            <div className="p-5">
              <SkeletonRows rows={5} />
            </div>
          ) : (
            <>
              <TransitionBar task={task} onTab={onTab} />
              <Tabs value={tab} onValueChange={onTab} className="px-5 pb-6 pt-2">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  {ad ? <TabsTrigger value="gates">Ad gates</TabsTrigger> : null}
                  <TabsTrigger value="qa">QA</TabsTrigger>
                  <TabsTrigger value="approval">Approval</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="details">
                  <DetailsTab task={task} />
                </TabsContent>
                {ad ? (
                  <TabsContent value="gates" className="grid gap-3">
                    {gates ? <GateBadges gates={gates} /> : <SkeletonRows rows={2} />}
                    <p className="text-sm text-ink-2">
                      All four must pass before the executor can put an ad live. Landing page checks
                      and budget caps live in{' '}
                      <Link to="/settings" className="text-accent underline">
                        Settings
                      </Link>
                      ; facts on the{' '}
                      <Link to="/fact-sheet" className="text-accent underline">
                        Fact Sheet
                      </Link>
                      .
                    </p>
                  </TabsContent>
                ) : null}
                <TabsContent value="qa">
                  <QaTab task={task} />
                </TabsContent>
                <TabsContent value="approval">
                  <ApprovalTab task={task} />
                </TabsContent>
                <TabsContent value="history">
                  <HistoryList events={task.events} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
