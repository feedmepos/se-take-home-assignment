import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        vip: 'border-transparent bg-amber-100 text-amber-800',
        normal: 'border-transparent bg-slate-200 text-slate-700',
        idle: 'border-transparent bg-slate-200 text-slate-700',
        busy: 'border-transparent bg-emerald-100 text-emerald-800',
      },
    },
    defaultVariants: {
      variant: 'normal',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
