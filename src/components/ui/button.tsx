import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  {
    variants: {
      variant: {
        // Order controls: each has a distinct, readable color
        default: 'bg-slate-800 text-white hover:bg-slate-700',
        // VIP → brand gold; dark text for contrast on gold
        secondary: 'bg-[#FFC72C] text-gray-900 font-semibold hover:bg-amber-400',
        // +Bot → green (positive action)
        success: 'bg-green-600 text-white hover:bg-green-700',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        // -Bot → brand red (destructive action)
        destructive: 'bg-[#DA291C] text-white hover:bg-red-700',
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
