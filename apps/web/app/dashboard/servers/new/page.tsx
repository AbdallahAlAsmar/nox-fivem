'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Server,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Download,
  Rocket,
  MousePointerClick,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createServer } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const DOWNLOAD_URL = '/dist/NOX-Setup.exe';

export default function NewServerPage() {
  const router = useRouter();
  const [name, setName] = useState('');
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

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <SuccessView result={result} onDone={() => router.push('/dashboard')} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-1">Add a Server</h1>
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
                    className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white font-sans placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Success / Setup View ───────────────────────────────────────────────────────

function SuccessView({
  result,
  onDone,
}: {
  result: { id: string; pairingCode: string };
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(result.pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = DOWNLOAD_URL;
    a.download = 'NOX-Setup.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Server Created</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
            Now pair it with the NOX desktop agent
          </p>
        </div>
      </div>

      {/* Step 1: Download */}
      <SetupStep
        step={1}
        title="Download the Desktop App"
        icon={Download}
        iconColor="text-[#5E6AD2]"
        borderColor="border-[rgba(94,106,210,0.3)]"
        bgColor="bg-[rgba(94,106,210,0.06)]"
      >
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
          Install the NOX desktop app on your Windows PC. It manages your servers, validates paths, and runs the AI agent.
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] hover:bg-[#4f5bc0] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {downloading ? 'Downloading…' : 'Download NOX-Setup.exe'}
        </button>
      </SetupStep>

      {/* Step 2: Pair */}
      <SetupStep
        step={2}
        title="Open the Desktop App & Add Your Server"
        icon={MousePointerClick}
        iconColor="text-[#22c55e]"
        borderColor="border-[rgba(34,197,94,0.3)]"
        bgColor="bg-[rgba(34,197,94,0.06)]"
      >
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-2">
          1. Launch NOX from your Start Menu or desktop shortcut
        </p>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-2">
          2. Click <strong className="text-white">Add Server</strong> on the dashboard
        </p>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
          3. Enter a name and browse to your FiveM <code className="font-mono text-[rgba(94,106,210,0.9)]">server-data</code> folder
        </p>
        <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.08)] rounded p-2.5 font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
          Example: <span className="text-[rgba(255,255,255,0.6)]">C:/FXServer/server-data</span>
        </div>
      </SetupStep>

      {/* Step 3: Enter Pairing Code */}
      <SetupStep
        step={3}
        title="Enter the Pairing Code"
        icon={Rocket}
        iconColor="text-[#f59e0b]"
        borderColor="border-[rgba(245,158,11,0.3)]"
        bgColor="bg-[rgba(245,158,11,0.06)]"
      >
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
          In the desktop app, you&apos;ll see a field to enter the pairing code below. This links your server to the NOX agent so it can read files and propose changes.
        </p>
        <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 flex items-center justify-between gap-3">
          <code className="font-mono text-sm text-[#5E6AD2] tracking-widest">
            {result.pairingCode}
          </code>
          <button
            onClick={copyCode}
            className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 flex-shrink-0 px-2 py-1 border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </SetupStep>

      {/* Done */}
      <button
        onClick={onDone}
        className="w-full font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white py-3 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors duration-100"
      >
        I&apos;ll do this later — back to dashboard
      </button>
    </motion.div>
  );
}

function SetupStep({
  step,
  title,
  icon: Icon,
  iconColor,
  borderColor,
  bgColor,
  children,
}: {
  step: number;
  title: string;
  icon: any;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-6 h-6 rounded-full ${bgColor} border ${borderColor} flex items-center justify-center`}>
          <span className={`font-mono text-[10px] font-medium ${iconColor}`}>{step}</span>
        </div>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
