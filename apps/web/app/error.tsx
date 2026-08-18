'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="font-mono text-8xl font-bold text-[rgba(255,255,255,0.1)] mb-4">!</div>
        <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-2">
          Application Error
        </h1>
        <p className="font-sans text-sm text-[rgba(255,255,255,0.4)] mb-6 max-w-md">
          {error.message || 'Something went wrong'}
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-[#0F0F14] bg-white hover:opacity-85 transition-opacity duration-100"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
