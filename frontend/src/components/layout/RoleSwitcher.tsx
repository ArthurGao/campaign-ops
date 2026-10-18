import { DEFAULT_ACTOR_NAMES, ROLES, type Role } from '@campaign-ops/core';
import { UserRound } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { copy } from '@/lib/copy';
import { ROLE_LABELS } from '@/lib/permissions';
import { useRoleStore } from '@/store/role.store';

/** The demo's identity control. Sent as X-Role / X-Actor-Name with every request. */
export function RoleSwitcher() {
  const { role, actorName, setRole } = useRoleStore();
  return (
    <div className="flex items-center gap-2">
      <Tooltip content={copy.app.roleHelp} side="bottom">
        <button
          type="button"
          className="hidden cursor-help text-2xs font-semibold uppercase tracking-wide text-ink-3 lg:inline"
        >
          {copy.app.roleLabel}
        </button>
      </Tooltip>
      <Select value={role} onValueChange={(v) => setRole(v as Role)}>
        <SelectTrigger
          aria-label="Acting role"
          className="h-9 w-auto min-w-[13rem] gap-2 border-rail bg-rail font-medium text-rail-ink hover:border-rail-2 hover:bg-rail-2 [&_svg]:text-rail-muted"
        >
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {ROLE_LABELS[role]} <span className="font-normal text-rail-muted">· {actorName}</span>
            </span>
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              <span className="font-medium">{ROLE_LABELS[r]}</span>{' '}
              <span className="text-ink-3">· {DEFAULT_ACTOR_NAMES[r]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
