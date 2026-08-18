import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-[rgba(255,255,255,0.15)] bg-transparent text-[rgba(255,255,255,0.6)]',
        secondary: 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)]',
        destructive: 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]',
        outline: 'border-[rgba(255,255,255,0.15)] bg-transparent text-[rgba(255,255,255,0.6)]',
        accent: 'border-[rgba(94,106,210,0.4)] bg-[rgba(94,106,210,0.1)] text-[#5E6AD2]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
