'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Search,
  Check,
  RotateCcw,
} from 'lucide-react';
import ChatPanel from '@/components/chat/ChatPanel';
import { ORCHESTRATOR_URL } from '@/lib/config';
import { scanResources, restartServer, applyChange, deleteServer } from '@/lib/api';
import { fetchPlayers } from '@/lib/api-base';

export default function ServerDetailPage() {
  const params = useParams<{ serverId: string }>();
  const router = useRouter();
  const serverId = params?.serverId ?? '';

  const [activeTab, setActiveTab] = useState<'chat' | 'players' | 'changes' | 'resources' | 'console' | 'settings'>('chat');
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: Date } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [headerMessage, setHeaderMessage] = useState<string | null>(null);
  const [deletingServer, setDeletingServer] = useState(false);
  const [deleteServerMsg, setDeleteServerMsg] = useState<string | null>(null);
  const handleDeleteServer = async (name: string) => {
    setDeletingServer(true);
    setDeleteServerMsg(null);
    try {
      await deleteServer(serverId, name);
      router.push('/dashboard');
    } catch {
      setDeleteServerMsg('Failed to delete server');
    } finally {
      setDeletingServer(false);
    }
  };

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ORCH_URL = ORCHESTRATOR_URL;


  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(() => {
      loadServer(false);
    }, 4000);
  };

  const loadServer = async (showLoadingSpinner = true) => {
    if (!serverId) return;
    if (showLoadingSpinner) setLoading(true);

    try {
      setError(null);
      const res = await fetch(`${ORCH_URL}/api/servers/${serverId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setServer(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setServer(data);
      setPairing(data.pairing ?? null);
      setPairingError(null);

      if (!data.hasAgent) {
        startPolling();
      } else {
        stopPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load server');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (serverId) {
      loadServer(true);
    }
    return () => stopPolling();
  }, [serverId]);

  const regeneratePairing = async () => {
    if (!serverId) return;
    setRegenerating(true);
    setPairingError(null);
    try {
      const res = await fetch(`${ORCH_URL}/api/servers/${serverId}/pairing`, {
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

  const handleScan = async () => {
    if (!serverId || scanning) return;
    setScanning(true);
    setHeaderMessage('Scanning resources...');
    try {
      await scanResources(serverId);
      setHeaderMessage('Scan complete');
      await loadServer(false);
    } catch {
      setHeaderMessage('Scan failed');
    } finally {
      setScanning(false);
      setTimeout(() => setHeaderMessage(null), 3000);
    }
  };

  const handleRestart = async () => {
    if (!serverId || restarting) return;
    setRestarting(true);
    setHeaderMessage('Restarting server...');
    try {
      await restartServer(serverId);
      setHeaderMessage('Server restart signal sent');
      await loadServer(false);
    } catch {
      setHeaderMessage('Failed to restart server');
    } finally {
      setRestarting(false);
      setTimeout(() => setHeaderMessage(null), 3000);
    }
  };

  if (loading) return <ServerSkeleton />;
  if (error) return <ServerError error={error} onRetry={() => loadServer(true)} />;
  if (!server) return <NotFound />;

  const isUnpaired = !server.hasAgent;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
      {/* Top Header */}
      <header className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-4 flex-shrink-0 gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>
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

        {headerMessage && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5E6AD2] bg-[rgba(94,106,210,0.1)] px-2.5 py-1 border border-[rgba(94,106,210,0.2)]">
            {headerMessage}
          </span>
        )}

        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning || isUnpaired}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)] disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{scanning ? 'Scanning...' : 'Scan'}</span>
          </button>
          <button
            onClick={handleRestart}
            disabled={restarting || isUnpaired}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)] disabled:opacity-40"
          >
            <Play className={`w-3 h-3 ${restarting ? 'animate-pulse text-[#22c55e]' : ''}`} />
            <span className="hidden sm:inline">{restarting ? 'Restarting...' : 'Restart'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      {isUnpaired ? (
        <UnpairedView
          serverId={serverId}
          serverName={server.name}
          pairing={pairing}
          loading={regenerating}
          error={pairingError}
          onRegenerate={regeneratePairing}
          onRetry={() => loadServer(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub Navigation Bar */}
          <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/30 flex items-center px-4 gap-1 flex-shrink-0">
            {[
              { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
              { id: 'players' as const, label: 'Players', icon: Users },
              { id: 'changes' as const, label: 'Changes', icon: FileDiff },
              { id: 'resources' as const, label: 'Resources', icon: Package },
              { id: 'console' as const, label: 'Console', icon: Terminal },
              { id: 'settings' as const, label: 'Settings', icon: Settings },
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

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat' && (
                <ChatPanel
                  serverId={serverId}
                  framework={server.framework || 'unknown'}
                  onThreadIdChange={(tid) => {/* sync active thread */}}
                />
            )}

            {activeTab === 'players' && (
              <ServerPlayersView serverId={serverId} orchUrl={ORCH_URL} />
            )}

            {activeTab === 'changes' && (
              <ServerChangesView serverId={serverId} orchUrl={ORCH_URL} />
            )}

            {activeTab === 'resources' && (
              <ServerResourcesView
                serverId={serverId}
                orchUrl={ORCH_URL}
                resources={server.resources || []}
                onScan={handleScan}
                scanning={scanning}
              />
            )}

            {activeTab === 'console' && (
              <ServerConsoleView server={server} onRestart={handleRestart} />
            )}

            {activeTab === 'settings' && (
              <ServerSettingsView
                server={server}
                serverId={serverId}
                orchUrl={ORCH_URL}
                onRefresh={() => loadServer(false)}
                onDelete={handleDeleteServer}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unpaired View ─────────────────────────────────────────────────────────────

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
    if (pairing?.code) {
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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>

        <div className="mb-4">
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
            Server:{' '}
            <span className="font-mono text-[rgba(255,255,255,0.7)]">{serverName}</span>
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
                <code className="font-mono text-base text-[#5E6AD2] tracking-widest font-bold">
                  {pairing.code}
                </code>
                <button
                  onClick={copyCode}
                  className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] hover:text-white transition-colors duration-100 flex-shrink-0 px-3 py-1.5 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="block text-center font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white py-3 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors duration-100"
            >
              I&apos;ll do this later — back to dashboard
            </Link>

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
          The desktop app connects automatically once paired.
        </p>
      </div>
    </div>
  );
}

// ─── Tab Components ─────────────────────────────────────────────────────────────

function ServerChangesView({ serverId, orchUrl }: { serverId: string; orchUrl: string }) {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadChanges = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${orchUrl}/api/servers/${serverId}/changes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setChanges(data);
    } catch {
      setError('Failed to fetch pending changes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, [serverId]);

  const handleApply = async (changeId: string) => {
    setApplyingId(changeId);
    try {
      await applyChange(changeId);
      await loadChanges();
    } catch (e) {
      console.error(e);
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-[rgba(255,255,255,0.3)]" />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <FileDiff className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-3" />
          <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-1">
            No Pending Changes
          </p>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">
            Ask the AI in the Chat tab to make modifications to resources.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {changes.map((change) => (
        <div
          key={change.id}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDiff className="w-4 h-4 text-[#5E6AD2]" />
              <span className="font-mono text-xs text-white">{change.file || change.path}</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]">
              {change.status}
            </span>
          </div>

          {change.diff && (
            <pre className="p-3 bg-[#0A0A0F] border border-[rgba(255,255,255,0.05)] font-mono text-[11px] text-[rgba(255,255,255,0.8)] overflow-x-auto max-h-48">
              {change.diff}
            </pre>
          )}

          {change.status === 'pending' && (
            <div className="flex justify-end">
              <button
                onClick={() => handleApply(change.id)}
                disabled={applyingId === change.id}
                className="px-3 py-1.5 bg-[#5E6AD2] hover:bg-[#4f5bc0] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {applyingId === change.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>Apply Change</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ServerResourcesView({
  serverId,
  orchUrl,
  resources,
  onScan,
  scanning,
}: {
  serverId: string;
  orchUrl: string;
  resources: Array<{ name: string; path: string; dependencies?: string[] }>;
  onScan: () => void;
  scanning: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = resources.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.path ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs focus:outline-none focus:border-[#5E6AD2]"
          />
        </div>

        <button
          onClick={onScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white bg-[#16161E] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning...' : 'Scan Resources'}</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-8 h-8 text-[rgba(255,255,255,0.2)] mx-auto mb-2" />
          <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            {resources.length === 0 ? 'No resources detected yet' : 'No matching resources found'}
          </p>
          {resources.length === 0 && (
            <p className="font-sans text-xs text-[rgba(255,255,255,0.3)] mt-1">
              Click Scan Resources to discover installed FiveM scripts and dependencies.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((res, i) => (
            <div
              key={i}
              className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-3 flex flex-col gap-1.5 hover:border-[rgba(255,255,255,0.16)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-[#5E6AD2] flex-shrink-0" />
                <span className="font-mono text-xs text-white truncate font-medium">{res.name}</span>
              </div>
              {res.path && (
                <p className="font-mono text-[10px] text-[rgba(255,255,255,0.35)] truncate">
                  {res.path}
                </p>
              )}
              {res.dependencies && res.dependencies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {res.dependencies.map((dep, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[9px] px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)]"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServerPlayersView({ serverId, orchUrl }: { serverId: string; orchUrl: string }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${orchUrl}/api/servers/${serverId}/players`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlayers(data);
    } catch {
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 30000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-[rgba(255,255,255,0.3)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-[rgba(239,68,68,0.5)] mx-auto mb-2" />
          <p className="font-mono text-xs text-[rgba(239,68,68,0.7)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {players.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-3" />
          <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-1">
            No Players Online
          </p>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">
            Players will appear here when connected to the server.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">
              Online Players ({players.length})
            </h3>
            <button
              onClick={loadPlayers}
              className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)]"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-3 flex items-center gap-3 hover:border-[rgba(255,255,255,0.16)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-[#5E6AD2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-white truncate">{player.name}</p>
                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">{player.identifier}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-[rgba(255,255,255,0.5)]">{player.ping}ms</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServerConsoleView({ server, onRestart }: { server: any; onRestart: () => void }) {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<string[]>([
    `[NOX] Connected to server: ${server.name}`,
    `[NOX] Framework: ${server.framework || 'unknown'}`,
    `[NOX] Agent status: ${server.hasAgent ? 'Active' : 'Unpaired'}`,
    `[NOX] Ready for commands.`,
  ]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setLogs((prev) => [...prev, `> ${command}`, `[NOX] Command "${command}" queued.`]);
    setCommand('');
  };

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0A0A0F] font-mono text-xs overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-1 text-[rgba(255,255,255,0.7)] p-2">
        {logs.map((log, index) => (
          <div key={index} className="leading-relaxed">
            {log}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendCommand} className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder="Execute server command..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 bg-[#16161E] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#5E6AD2]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#5E6AD2] hover:bg-[#4f5bc0] text-white uppercase text-xs tracking-wider transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ServerSettingsView({
  server,
  serverId,
  orchUrl,
  onRefresh,
  onDelete,
}: {
  server: any;
  serverId: string;
  orchUrl: string;
  onRefresh: () => void;
  onDelete: (name: string) => Promise<void>;
}) {
  const [revoking, setRevoking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [serverDir, setServerDir] = useState(server?.settings?.serverDir || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const handleSaveDir = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${orchUrl}/api/servers/${serverId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { serverDir } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg('Settings saved');
      onRefresh();
    } catch {
      setMsg('Failed to save settings');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to disconnect and revoke the agent on this server?')) return;
    setRevoking(true);
    try {
      const res = await fetch(`${orchUrl}/api/servers/${serverId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg('Agent revoked successfully');
      onRefresh();
    } catch {
      setMsg('Failed to revoke agent');
    } finally {
      setRevoking(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleDelete = async () => {
    if (deleteName !== server?.name) {
      setDeleteMsg('Server name does not match');
      return;
    }
    setDeleting(true);
    try {
      await onDelete(server?.name);
      // On success, the parent handles the redirect
    } catch {
      setDeleteMsg('Failed to delete server');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Server Settings</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
          Configuration and agent metadata for this server
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] font-mono text-xs text-[#5E6AD2]">
          {msg}
        </div>
      )}

      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
            Server Name
          </label>
          <p className="font-mono text-sm text-white">{server.name}</p>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
            Framework
          </label>
          <p className="font-mono text-xs text-white uppercase">{server.framework || 'unknown'}</p>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
            Status
          </label>
          <p className="font-mono text-xs text-white uppercase">{server.status}</p>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
            Server Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverDir}
              onChange={(e) => setServerDir(e.target.value)}
              placeholder="Enter server directory path..."
              className="flex-1 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#5E6AD2]"
            />
            <button
              onClick={handleSaveDir}
              disabled={saving}
              className="px-4 py-2 bg-[#5E6AD2] hover:bg-[#4f5bc0] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="font-sans text-[10px] text-[rgba(255,255,255,0.3)] mt-1">
            Path to your FiveM server directory (e.g., C:/servers/my-server)
          </p>
        </div>
      </div>

      <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] p-5 space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-[#ef4444]">Danger Zone</h3>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
          Permanently delete this server and all its data. This cannot be undone.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={deleteName}
            onChange={(e) => setDeleteName(e.target.value)}
            placeholder={`Type "${server?.name}" to confirm`}
            className="w-full bg-[#0A0A0F] border border-[rgba(239,68,68,0.2)] px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ef4444] placeholder:text-white/20"
          />
          {deleteMsg && <p className="font-mono text-xs text-[#ef4444]">{deleteMsg}</p>}
          <button
            onClick={handleDelete}
            disabled={deleting || deleteName !== server?.name}
            className="w-full px-4 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.25)] text-[#ef4444] font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Delete Server</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton & Error States ───────────────────────────────────────────────────

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
    <div className="flex-1 flex items-center justify-center p-6 bg-[#0F0F14]">
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
    <div className="flex-1 flex items-center justify-center p-6 bg-[#0F0F14]">
      <div className="text-center">
        <div className="font-mono text-8xl font-bold text-[rgba(255,255,255,0.1)] mb-4">404</div>
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
