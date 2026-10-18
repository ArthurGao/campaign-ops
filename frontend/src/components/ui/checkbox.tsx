import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-ink-3 bg-surface transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-white data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-white disabled:opacity-45',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      {props.checked === 'indeterminate' ? (
        <Minus className="size-3" />
      ) : (
        <Check className="size-3" strokeWidth={3} />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';
