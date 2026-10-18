import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const Overlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-40 bg-rail/35', className)}
    {...props}
  />
));
Overlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { wide?: boolean }
>(({ className, children, wide, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-[12vh] z-50 grid max-h-[80vh] w-[calc(100vw-2rem)] -translate-x-1/2 gap-4 overflow-y-auto rounded-lg border border-rule bg-surface p-5 shadow-overlay',
        wide ? 'max-w-2xl' : 'max-w-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 rounded-sm p-1 text-ink-3 hover:bg-panel hover:text-ink"
        aria-label="Close"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 pr-6">
      <DialogPrimitive.Title className="text-base font-semibold text-ink">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-sm text-ink-2">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
      )}
    </div>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-rule pt-4">{children}</div>
  );
}
