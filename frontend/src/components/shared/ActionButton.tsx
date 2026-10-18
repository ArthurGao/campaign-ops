import { forwardRef, type MouseEvent } from 'react';
import type { Role } from '@campaign-ops/core';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { can, requiresText, type Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/store/role.store';

type Props = ButtonProps & {
  /** Endpoint permission, or an explicit role list for state-dependent actions. */
  permission?: Permission;
  roles?: readonly Role[];
  /** A reason other than role (e.g. "Confirm FS-04 first") disables with this tooltip. */
  blockedReason?: string;
};

/**
 * Frontend rule 3: actions the current role cannot take stay visible, disabled, and say who can.
 * Blocked buttons use aria-disabled (not disabled) so keyboard and pointer users still reach the reason.
 */
export const ActionButton = forwardRef<HTMLButtonElement, Props>(
  ({ permission, roles, blockedReason, disabled, onClick, className, children, ...props }, ref) => {
    const role = useRoleStore((s) => s.role);
    const roleCheck = permission
      ? can(role, permission)
      : roles
        ? roles.includes(role)
          ? { ok: true }
          : { ok: false, reason: requiresText(roles) }
        : { ok: true };
    const reason = !roleCheck.ok ? roleCheck.reason : blockedReason;
    if (!reason) {
      return (
        <Button ref={ref} disabled={disabled} onClick={onClick} className={className} {...props}>
          {children}
        </Button>
      );
    }
    const block = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();
    return (
      <Tooltip content={reason}>
        <Button
          ref={ref}
          aria-disabled
          onClick={block}
          className={cn('cursor-not-allowed opacity-45', className)}
          {...props}
          type="button"
        >
          {children}
          <span className="sr-only"> — {reason}</span>
        </Button>
      </Tooltip>
    );
  },
);
ActionButton.displayName = 'ActionButton';
