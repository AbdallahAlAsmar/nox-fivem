'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Server,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createServer } from '@/lib/api';
import { motion } from 'framer-motion';

export default function NewServerPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [framework, setFramework] = useState('qbcore');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; pairingCode: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

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
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-1">Add a Server</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-6">
            Register your FiveM server to connect the AI agent.
          </p>

          {result ? (
            <SuccessCard result={result} onDone={() => router.push(`/dashboard/servers/${result.id}`)} />
          ) : (
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
                  className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white font-sans placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                  required
                  maxLength={64}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
                  Framework
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white font-sans focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100 appearance-none"
                >
                  <option value="qbcore" className="bg-[#16161E]">QBCore</option>
                  <option value="esx" className="bg-[#16161E]">ESX</option>
                  <option value="qbox" className="bg-[#16161E]">QBox</option>
                  <option value="other" className="bg-[#16161E]">Other</option>
                </select>
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
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SuccessCard({
  result,
  onDone,
}: {
  result: { id: string; pairingCode: string };
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(result.pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.2)] p-6 text-center"
    >
      <div className="w-12 h-12 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-6 h-6 text-[#5E6AD2]" />
      </div>
      <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-1">Server Created</h2>
      <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-5">
        Install the agent on your server and enter the pairing code.
      </p>

      <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 mb-4 flex items-center justify-between gap-3">
        <code className="font-mono text-sm text-[#5E6AD2] tracking-widest">
          {result.pairingCode}
        </code>
        <button
          onClick={copyCode}
          className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 flex-shrink-0"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <button
        onClick={onDone}
        className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] hover:underline"
      >
        Go to Dashboard →
      </button>
    </motion.div>
  );
}
