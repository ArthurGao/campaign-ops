import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Right-hand side panel for record details (task, fact usages, lead). Non-modal on purpose: the
 * role switcher and navigation stay usable while it is open, so a demo can switch role mid-flow.
 */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      {children}
    </DialogPrimitive.Root>
  );
}

/** Clicks on the top bar or inside popovers (selects, tooltips) do not dismiss the panel. */
function keepOpen(e: { target: EventTarget | null; preventDefault(): void }) {
  const el = e.target as Element | null;
  if (
    el?.closest(
      '[data-keep-sheet], [data-radix-popper-content-wrapper], [role="dialog"], [data-sonner-toaster]',
    )
  )
    e.preventDefault();
}

export function SheetContent({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        onInteractOutside={keepOpen}
        className={cn(
          'fixed bottom-0 right-0 top-14 z-30 flex w-full max-w-[44rem] flex-col border-l border-rule bg-surface shadow-overlay',
          className,
        )}
      >
        <header className="flex items-start gap-3 border-b border-rule px-5 py-4">
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-base font-semibold leading-snug text-ink">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              asChild={!!description}
              className={description ? 'mt-1 text-sm text-ink-2' : 'sr-only'}
            >
              {description ? <div>{description}</div> : 'Details'}
            </DialogPrimitive.Description>
          </div>
          {actions}
          <DialogPrimitive.Close
            className="rounded-sm p-1 text-ink-3 hover:bg-panel hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
