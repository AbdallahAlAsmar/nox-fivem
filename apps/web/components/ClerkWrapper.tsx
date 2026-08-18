'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  useEffect(() => {
    // Only initialize Clerk on pages that need it
    const needsClerk = pathname.startsWith('/dashboard') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    if (needsClerk) {
      // Load Clerk dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.clerk.com/clerk@5.25.2.browser.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [pathname]);
  
  return <>{children}</>;
}
