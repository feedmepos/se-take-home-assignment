import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  {
    variants: {
      variant: {
        // Order controls: each has a distinct, readable color
        default: 'bg-slate-800 text-white hover:bg-slate-700',
        // VIP → brand gold; dark text for contrast on gold
        secondary: 'bg-[#FFC72C] text-gray-900 font-semibold hover:bg-amber-400',
        // +Bot → green (positive action)
        success: 'bg-green-600 text-white hover:bg-green-700',
        // -Bot → brand red (destructive action)
        destructive: 'bg-[#DA291C] text-white hover:bg-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, className }))} ref={ref} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
