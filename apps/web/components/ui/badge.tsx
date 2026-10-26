import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider transition-colors focus:outline-none rounded-sm',
  {
    variants: {
      variant: {
        default: 'border-[#414548] bg-[#202326] text-[#F4F1E9]/85',
        secondary: 'border-[#414548] bg-transparent text-[#F4F1E9]/65',
        destructive: 'border-[#dc2626]/40 bg-[#dc2626]/10 text-[#f87171]',
        outline: 'border-[#414548] bg-transparent text-[#F4F1E9]/80',
        accent: 'border-[#E83708]/40 bg-[#E83708]/10 text-[#E83708]',
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
