'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[hsl(240,8%,10%)] group-[.toaster]:text-[hsl(0,0%,96%)] group-[.toaster]:border group-[.toaster]:border-[hsl(240,5%,20%)] group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-[hsl(240,5%,60%)]',
          actionButton:
            'group-[.toast]:bg-[hsl(174,70%,45%)] group-[.toast]:text-[hsl(240,10%,6%)]',
          cancelButton:
            'group-[.toast]:bg-[hsl(240,5%,16%)] group-[.toast]:text-[hsl(240,5%,60%)]',
        },
      }}
      {...props}
    />
  );
}
