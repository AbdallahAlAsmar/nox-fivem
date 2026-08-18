import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-mono uppercase tracking-[1.4px] transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-white text-[#0F0F14] hover:opacity-85',
        destructive: 'bg-[#ef4444] text-white hover:opacity-85',
        outline: 'border border-[rgba(255,255,255,0.2)] bg-transparent text-white hover:border-[rgba(255,255,255,0.4)]',
        secondary: 'bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.04)]',
        ghost: 'bg-transparent text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        accent: 'bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] text-[#5E6AD2] hover:bg-[rgba(94,106,210,0.2)]',
        link: 'text-[#5E6AD2] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-[11px]',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
