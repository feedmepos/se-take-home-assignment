import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-700',
        secondary: 'bg-amber-500 text-white hover:bg-amber-600',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'hover:bg-slate-100 text-slate-900',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
