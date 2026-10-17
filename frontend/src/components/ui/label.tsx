import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn('text-[0.8125rem] font-medium text-ink', className)} {...props} />,
);
Label.displayName = 'Label';

/** Label + control + optional help text, stacked. */
export function Field({ label, htmlFor, help, children, className }: { label: string; htmlFor: string; help?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help ? <p className="text-xs text-ink-3">{help}</p> : null}
    </div>
  );
}
