import * as React from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-48 rounded-md border border-rule bg-surface p-1 text-sm shadow-overlay',
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

/** Menu item; a disabled item shows why under its label. */
export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & {
    reason?: string;
    tone?: 'danger';
  }
>(({ className, children, reason, tone, disabled, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    disabled={disabled || !!reason}
    className={cn(
      'grid cursor-default select-none rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-strong data-[disabled]:text-ink-3',
      tone === 'danger' && 'text-bad',
      className,
    )}
    {...props}
  >
    <span>{children}</span>
    {reason ? <span className="text-[0.7rem] text-ink-3">{reason}</span> : null}
  </DropdownPrimitive.Item>
));
DropdownMenuItem.displayName = 'DropdownMenuItem';
