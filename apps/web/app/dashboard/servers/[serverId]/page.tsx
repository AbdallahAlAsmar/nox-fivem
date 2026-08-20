'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Bot,
  Send,
  Loader2,
  Sparkles,
  FileDiff,
  Package,
  Settings,
  Terminal,
  Play,
  Pause,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  X,
  Copy,
  ExternalLink,
  Download,
} from 'lucide-react';

export default function ServerDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const serverId = params.get('id') ?? '';
  const [activeTab, setActiveTab] = useState('chat');
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: Date } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ORCH_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'https://gazette-hurricane-hung-calibration.trycloudflare.com';

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const loadServer = async () => {
    try {
      const res = await fetch(`${ORCH_URL}/api/servers/${serverId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServer(data);
      setPairing(data.pairing ?? null);
      setPairingError(null);
      if (!data.hasAgent) {
        startPolling();
      } else {
        stopPolling();
      }
    } catch {
      setError('Failed to load server');
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(() => loadServer(), 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    loadServer();
    return stopPolling;
  }, [serverId]);

  const regeneratePairing = async () => {
    setRegenerating(true);
    setPairingError(null);
    try {
      const res = await fetch(`${ORCH_URL}/servers/${serverId}/pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPairing(data.pairing);
    } catch (err) {
      setPairingError(err instanceof Error ? err.message : 'Failed to regenerate pairing code');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <ServerSkeleton />;
  if (error) return <ServerError error={error} onRetry={() => window.location.reload()} />;
  if (!server) return <NotFound />;

  const isUnpaired = !server.hasAgent;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
      <header className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-4 flex-shrink-0 gap-4">
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </a>
        <div className="h-4 w-px bg-[rgba(255,255,255,0.08)]" />
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-2 h-2 flex-shrink-0 ${
              server.status === 'online'
                ? 'bg-[#22c55e] animate-pulse'
                : server.status === 'offline'
                ? 'bg-[rgba(255,255,255,0.2)]'
                : 'bg-[#f59e0b] animate-pulse'
            }`}
          />
          <div className="min-w-0">
            <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-white truncate">
              {server.name}
            </h1>
            <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider">
              {server.framework?.toUpperCase()} • {server.status}
              {server.hasAgent && (
                <span className="text-[#22c55e] ml-1">• Agent Connected</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]">
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]">
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">Start</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]">
            <Pause className="w-3 h-3" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        </div>
      </header>

      {isUnpaired ? (
        <UnpairedView
          serverId={serverId}
          serverName={server.name}
          pairing={pairing}
          loading={regenerating}
          error={pairingError}
          onRegenerate={regeneratePairing}
          onRetry={loadServer}
        />
      ) : (
        <>
          <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/30 flex items-center px-4 gap-1 flex-shrink-0">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'changes', label: 'Changes', icon: FileDiff },
              { id: 'resources', label: 'Resources', icon: Package },
              { id: 'console', label: 'Console', icon: Terminal },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                    isActive
                      ? 'text-white bg-[rgba(94,106,210,0.15)] border-b-2 border-[#5E6AD2]'
                      : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-12 h-12 text-[rgba(94,106,210,0.3)] mx-auto mb-4" />
              <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab
              </p>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">
                This section will be populated with real content in the next iteration.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UnpairedView({
  serverId,
  serverName,
  pairing,
  loading,
  error,
  onRegenerate,
  onRetry,
}: {
  serverId: string;
  serverName: string;
  pairing: { code: string; expiresAt: Date } | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => Promise<void>;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const copyCode = async () => {
    if (pairing) {
      await navigator.clipboard.writeText(pairing.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = '/dist/NOX-Setup.exe';
    a.download = 'NOX-Setup.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1500);
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

        <div className="mb-4">
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
            Connected to:{' '}
            <span className="font-mono text-[rgba(255,255,255,0.6)]">{serverName}</span>
          </p>
        </div>

        {error && (
          <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button
              onClick={onRetry}
              className="ml-auto font-mono text-xs uppercase tracking-wider text-[rgba(239,68,68,0.7)] hover:text-[#ef4444] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!pairing && !loading && (
          <div className="mb-4">
            <button
              onClick={onRegenerate}
              className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] hover:text-white py-2 px-4 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              No pairing code — generate one
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[rgba(255,255,255,0.3)] animate-spin" />
            <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
              Generating pairing code…
            </p>
          </div>
        ) : pairing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">
                  Connect Desktop App
                </h1>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                  Pair this server with the NOX desktop agent
                </p>
              </div>
            </div>

            <div className="border border-[rgba(94,106,210,0.3)] bg-[rgba(94,106,210,0.06)] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(94,106,210,0.06)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center">
                  <span className="font-mono text-[10px] font-medium text-[#5E6AD2]">1</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#5E6AD2]" />
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-white">
                  Download the Desktop App
                </h3>
              </div>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
                Install the NOX desktop app on your Windows PC. It manages your servers, validates
                paths, and runs the AI agent.
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
            </div>

            <div className="border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center">
                  <span className="font-mono text-[10px] font-medium text-[#f59e0b]">2</span>
                </div>
                <Send className="w-3.5 h-3.5 text-[#f59e0b]" />
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-white">
                  Enter the Pairing Code
                </h3>
              </div>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
                Open the NOX desktop app, click Add Server, and enter the code below to link this
                server to the agent.
              </p>
              <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 flex items-center justify-between gap-3">
                <code className="font-mono text-sm text-[#5E6AD2] tracking-widest">
                  {pairing.code}
                </code>
                <button
                  onClick={copyCode}
                  className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 flex-shrink-0 px-2 py-1 border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="w-full font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white py-3 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors duration-100"
            >
              I&apos;ll do this later — back to dashboard
            </button>

            <div className="pt-1">
              <button
                onClick={onRegenerate}
                className="w-full font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] py-2 transition-colors duration-100"
              >
                Expired? Refresh pairing code
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center font-mono text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider">
          The desktop app polls for pairing. Click refresh if it does not appear.
        </p>
      </div>
    </div>
  );
}

function ServerSkeleton() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
      <div className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-4 gap-4">
        <div className="w-12 h-4 bg-[rgba(255,255,255,0.06)] animate-pulse" />
        <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-4 bg-[rgba(255,255,255,0.06)] animate-pulse" />
            <div className="w-24 h-3 bg-[rgba(255,255,255,0.04)] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/30 flex items-center px-4 gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-16 h-6 bg-[rgba(255,255,255,0.04)] animate-pulse rounded-sm" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-[rgba(255,255,255,0.03)] animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

function ServerError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-[#ef4444]" />
        </div>
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
          Something went wrong
        </h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 mx-auto"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="font-mono text-8xl font-bold text-[rgba(255,255,255,0.1)] mb-4">404</div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-2">
          Server Not Found
        </h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-6">
          The server you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <a
          href="/dashboard"
          className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] hover:underline"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
