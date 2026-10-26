import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full border border-[#414548] bg-[#181A1D] px-3.5 py-2 text-sm text-[#F4F1E9] placeholder:text-[#68665F] focus:outline-none focus:border-[#E83708] focus:ring-1 focus:ring-[#E83708] transition-colors rounded-sm disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
