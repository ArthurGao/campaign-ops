import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { FactPage, FactView } from '@campaign-ops/core';
import { ActionButton } from '@/components/shared/ActionButton';
import { FactChip } from '@/components/shared/FactChip';
import { RichText } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { can } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';
import { confirmRoles } from '@/lib/facts';
import { fmtDate, relDays } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ConfirmFactDialog, EditFactDialog, RejectFactDialog } from './FactDialogs';

type Open = { kind: 'confirm' | 'reject' | 'edit'; fact: FactView } | null;

export function FactTable({
  facts,
  page,
  now,
  onUsages,
}: {
  facts: FactView[];
  page: FactPage;
  now?: string;
  onUsages(id: string): void;
}) {
  const [open, setOpen] = useState<Open>(null);
  const role = useRoleStore((s) => s.role);
  const internal = page === 'internal';
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[64rem]">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col" className="w-[42%]">
              Statement
            </th>
            <th scope="col">Status</th>
            <th scope="col">Source</th>
            <th scope="col">Confirmed</th>
            <th scope="col">{internal ? 'Purpose' : 'Expiry'}</th>
            {!internal ? <th scope="col">Public use</th> : null}
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {facts.map((f) => {
            const dim = f.status === 'superseded';
            const actionable = f.status !== 'superseded';
            return (
              <tr key={f.id} className={cn(dim && 'text-ink-3')}>
                <td>
                  <FactChip id={f.id} fact={f} />
                </td>
                <td>
                  <p className="font-medium text-ink">{f.label}</p>
                  <RichText
                    text={f.statement}
                    className={cn(
                      'text-[0.8125rem]',
                      dim ? 'line-through decoration-ink-3/50' : 'text-ink-2',
                    )}
                  />
                  {f.publicNote ? (
                    <p className="mt-1 text-xs italic text-ink-3">{f.publicNote}</p>
                  ) : null}
                  {f.supersededBy ? (
                    <p className="mt-1 text-xs text-ink-3">Superseded by {f.supersededBy}</p>
                  ) : null}
                  {f.rejectedNote ? (
                    <p className="mt-1 text-xs text-bad">Rejected: {f.rejectedNote}</p>
                  ) : null}
                </td>
                <td>
                  <StatusChip status={f.status} />
                </td>
                <td className="max-w-[14rem] break-words text-[0.8rem] text-ink-2">
                  {f.source ?? <span className="text-ink-3">—</span>}
                </td>
                <td className="whitespace-nowrap text-[0.8rem]">
                  {f.confirmedBy ? (
                    <>
                      <span className="text-ink">{f.confirmedBy.name}</span>
                      <br />
                      <span className="font-mono text-ink-3">{fmtDate(f.confirmedAt)}</span>
                    </>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-[0.8rem]">
                  {internal ? (
                    <span className="whitespace-normal text-ink-2">{f.purpose}</span>
                  ) : f.expiresAt ? (
                    <>
                      <span className="font-mono">{fmtDate(f.expiresAt)}</span>
                      {now ? (
                        <span
                          className={cn(
                            'block text-xs',
                            f.expiringSoon ? 'text-warn' : 'text-ink-3',
                          )}
                        >
                          {relDays(f.expiresAt, now)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                {!internal ? (
                  <td
                    className={cn(
                      'whitespace-nowrap text-[0.8rem] font-semibold',
                      f.publiclyUsable ? 'text-ok' : 'text-bad',
                    )}
                  >
                    {f.publiclyUsable ? 'Usable' : 'Not usable'}
                  </td>
                ) : null}
                <td>
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    {actionable && f.status !== 'confirmed' ? (
                      <ActionButton
                        size="sm"
                        variant="approve"
                        roles={confirmRoles(f)}
                        onClick={() => setOpen({ kind: 'confirm', fact: f })}
                      >
                        Confirm
                      </ActionButton>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          aria-label={`More actions for ${f.id}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onUsages(f.id)}>
                          Where is {f.id} used?
                        </DropdownMenuItem>
                        {actionable ? (
                          <DropdownMenuItem
                            reason={can(role, 'fact.edit').reason}
                            onSelect={() => setOpen({ kind: 'edit', fact: f })}
                          >
                            Edit entry…
                          </DropdownMenuItem>
                        ) : null}
                        {actionable && f.status !== 'rejected' ? (
                          <DropdownMenuItem
                            tone="danger"
                            reason={can(role, 'fact.confirm').reason}
                            onSelect={() => setOpen({ kind: 'reject', fact: f })}
                          >
                            Reject entry…
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {open?.kind === 'confirm' ? (
        <ConfirmFactDialog fact={open.fact} onClose={() => setOpen(null)} />
      ) : null}
      {open?.kind === 'reject' ? (
        <RejectFactDialog fact={open.fact} onClose={() => setOpen(null)} />
      ) : null}
      {open?.kind === 'edit' ? (
        <EditFactDialog fact={open.fact} page={page} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
