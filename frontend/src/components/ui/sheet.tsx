import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Right-hand drawer for record details (task, fact usages, lead). */
export const Sheet = DialogPrimitive.Root;

export function SheetContent({ title, description, children, className, actions }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-rail/30" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[44rem] flex-col border-l border-rule bg-surface shadow-overlay data-[state=open]:animate-[sheet-in_200ms_cubic-bezier(0.16,1,0.3,1)]',
          className,
        )}
      >
        <header className="flex items-start gap-3 border-b border-rule px-5 py-4">
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-base font-semibold leading-snug text-ink">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className={description ? 'mt-1 text-sm text-ink-2' : 'sr-only'}>{description ?? 'Details'}</DialogPrimitive.Description>
          </div>
          {actions}
          <DialogPrimitive.Close className="rounded-sm p-1 text-ink-3 hover:bg-panel hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
