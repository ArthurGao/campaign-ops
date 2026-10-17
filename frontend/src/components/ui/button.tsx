import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent-strong active:bg-accent-strong',
        secondary: 'border border-rule bg-surface text-ink hover:border-ink-3 hover:bg-ground',
        ghost: 'text-ink-2 hover:bg-panel hover:text-ink',
        danger: 'border border-bad/30 bg-surface text-bad hover:bg-bad-soft',
        approve: 'bg-ok text-white hover:bg-[#145a38]',
        link: 'text-accent underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-7 px-2.5 text-[0.8125rem]',
        md: 'h-8.5 px-3.5 text-sm',
        icon: 'size-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
