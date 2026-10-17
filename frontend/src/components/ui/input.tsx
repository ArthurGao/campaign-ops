import * as React from 'react';
import { cn } from '@/lib/utils';

export const fieldClass =
  'w-full rounded-md border border-rule bg-surface px-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:bg-panel disabled:text-ink-3 aria-[invalid=true]:border-bad';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, 'h-8.5', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(fieldClass, 'min-h-20 py-2 leading-relaxed', className)} {...props} />,
);
Textarea.displayName = 'Textarea';
