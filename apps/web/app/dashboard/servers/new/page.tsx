'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createServer } from '@/lib/api';
import { Plus, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function NewServerPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; connect?: { serverId: string; agentDeviceId: string; wsUrl: string } } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const server = await createServer(name.trim());
      setResult(server);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-lg mx-auto">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </a>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="font-mono text-xs text-[#22c55e]">Server created — auto-paired and ready</span>
            </div>
            {result.connect && (
              <div className="bg-[#16161E] border border-white/10 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] uppercase text-white/40">Server ID</span>
                  <span className="font-mono text-xs text-white/60">{result.connect.serverId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] uppercase text-white/40">Device ID</span>
                  <span className="font-mono text-xs text-white/60">{result.connect.agentDeviceId}</span>
                </div>
              </div>
            )}
            <p className="font-sans text-xs text-white/40">
              The desktop agent will auto-connect on next launch.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-2.5 bg-[#3DFFA2] hover:bg-[#36d98c] text-white font-mono text-xs uppercase tracking-wider transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-1">
              Add a Server
            </h1>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-6">
              Create a server on the web, then pair it with the desktop agent.
            </p>

            <form onSubmit={handleSubmit} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
                  Server Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My RP Server"
                  className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white font-sans placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#3DFFA2] transition-colors duration-100"
                  required
                  maxLength={64}
                />
              </div>

              {error && (
                <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-[#0F0F14] bg-white hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Server
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
