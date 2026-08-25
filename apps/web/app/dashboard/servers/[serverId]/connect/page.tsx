'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchServer, scanResources, refreshPairing } from '@/lib/api';
import { PairingSetupView } from '@/components/dashboard/PairingSetupView';

export default function ServerConnectPage() {
  const params = useParams<{ serverId: string }>();
  const router = useRouter();
  const serverId = params?.serverId ?? '';
  const [server, setServer] = useState<any>(null);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: Date } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchServer(serverId);
        if (!data) throw new Error('Failed to load server');

        if (cancelled) return;
        setServer(data);
        setPairing(data.pairing ?? null);
        setConnected(!!data.hasAgent);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load server');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const poll = setInterval(() => {
      if (!cancelled && !connected) {
        load();
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [serverId, connected]);

  const handleDone = () => {
    router.push('/dashboard');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setPairingError(null);
    try {
      const pairing = await refreshPairing(serverId);
      setPairing(pairing);
    } catch (err) {
      setPairingError(
        err instanceof Error ? err.message : 'Failed to regenerate pairing code',
      );
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F0F14]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[rgba(255,255,255,0.3)] animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            Loading server…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F0F14] p-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-[#ef4444]" />
          </div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
            Something went wrong
          </h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">
            {error}
          </p>
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 mx-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!server) {
    return <NotFound />;
  }

  if (connected) {
    return (
      <ConnectedView
        serverId={serverId}
        name={server.name}
        framework={server.framework}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>

        <div className="mb-4">
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
            Connected to:{' '}
            <span className="font-mono text-[rgba(255,255,255,0.6)]">
              {server.name}
            </span>
          </p>
        </div>

        {pairingError && (
          <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {pairingError}
            <button
              onClick={handleRegenerate}
              className="ml-auto font-mono text-xs uppercase tracking-wider text-[rgba(239,68,68,0.7)] hover:text-[#ef4444] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {regenerating ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[rgba(255,255,255,0.3)] animate-spin" />
            <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
              Generating pairing code…
            </p>
          </div>
        ) : pairing ? (
          <PairingSetupView
            pairing={{
              id: serverId,
              pairingCode: pairing.code,
              expiresAt: pairing.expiresAt,
            }}
            onDone={handleDone}
            onRegenerate={handleRegenerate}
          />
        ) : (
          <div>
            <p className="font-mono text-xs text-[rgba(255,255,255,0.5)] mb-4">
              No pairing code available. This should not happen — regenerate it.
            </p>
            <button
              onClick={handleRegenerate}
              className="font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.04)] px-4 py-2.5 transition-colors"
            >
              Generate Pairing Code
            </button>
          </div>
        )}

        <p className="mt-6 text-center font-mono text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider">
          The desktop app will connect automatically once it submits the pairing
          code.
        </p>
      </div>
    </div>
  );
}

function ConnectedView({
  serverId,
  name,
  framework,
}: {
  serverId: string;
  name: string;
  framework: string;
}) {
  const [scanning, setScanning] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
          </div>
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">
              Agent Connected
            </h1>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
              {name} • {framework.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">
              Online
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">
                Server ID
              </label>
              <code className="block px-3 py-2 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] font-mono text-xs text-[#5E6AD2] truncate">
                {serverId}
              </code>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">
                Framework
              </label>
              <p className="px-3 py-2 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] font-mono text-xs text-white uppercase">
                {framework || 'unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              setScanning(true);
              try {
                await scanResources(serverId);
              } finally {
                setScanning(false);
              }
            }}
            disabled={scanning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`}
            />
            {scanning ? 'Scanning…' : 'Scan Resources'}
          </button>
        </div>

        <div className="text-center">
          <Link
            href={`/dashboard/servers/${serverId}`}
            className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] hover:underline"
          >
            Open Full Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#0F0F14]">
      <div className="text-center">
        <div className="font-mono text-8xl font-bold text-[rgba(255,255,255,0.1)] mb-4">
          404
        </div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-2">
          Server Not Found
        </h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-6">
          The server you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/dashboard"
          className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
