import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-sans font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83708] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111315] disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default: 'bg-[#E83708] text-[#111315] hover:bg-[#d43106] active:translate-y-[1px] rounded-sm shadow-sm',
        destructive: 'bg-[#dc2626] text-white hover:bg-[#b91c1c] rounded-sm',
        outline: 'border border-[#414548] bg-transparent text-[#F4F1E9] hover:bg-[#202326] hover:border-[#68665F] rounded-sm',
        secondary: 'bg-[#202326] border border-[#414548] text-[#F4F1E9] hover:bg-[#282C30] hover:border-[#68665F] rounded-sm',
        ghost: 'bg-transparent text-[#F4F1E9]/75 hover:text-[#F4F1E9] hover:bg-[#202326] rounded-sm',
        accent: 'bg-[#E83708]/15 border border-[#E83708]/30 text-[#E83708] hover:bg-[#E83708]/25 rounded-sm',
        link: 'text-[#E83708] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'min-h-[44px] h-11 px-5 py-2.5',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10 min-w-[40px] min-h-[40px] p-2',
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
