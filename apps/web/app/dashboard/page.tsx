'use client';

import useSWR from 'swr';
import Link from 'next/link';
import {
  Server,
  Plus,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Zap,
  FileDiff,
  MessageSquare,
  RefreshCw,
  Play,
  Pause,
  Terminal,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ORCHESTRATOR_URL } from '@/lib/config';
import { scanResources, restartServer } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ServerData {
  id: string;
  name: string;
  framework: string;
  status: string;
  lastSeenAt: string | null;
  resourceCount: number;
  hasAgent: boolean;
  playerCount: number;
  maxPlayers: number;
  fps: number;
  serverDir?: string;
}

interface Change {
  id: string;
  file: string;
  diff: string;
  status: string;
  createdAt: string;
  serverId: string;
  serverName?: string;
}

interface ActivityItem {
  id: string;
  type: 'change' | 'chat' | 'scan' | 'restart' | 'ban';
  message: string;
  serverName: string;
  timestamp: number;
}

// ─── Fetchers ───────────────────────────────────────────────────────────────────

const ORCH_URL = ORCHESTRATOR_URL;

async function fetchServers() {
  const res = await fetch(`${ORCH_URL}/api/servers`);
  if (!res.ok) throw new Error(res.status.toString());
  return res.json();
}

async function fetchAllChanges(servers: any[]) {
  const results = await Promise.all(
    servers.map(async (s) => {
      try {
        const res = await fetch(`${ORCH_URL}/api/servers/${s.id}/changes`);
        if (!res.ok) return [];
        return (await res.json()).map((c: any) => ({ ...c, serverId: s.id, serverName: s.name }));
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}

// ─── Components ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
          {label}
        </span>
      </div>
      <div className={`font-mono text-2xl font-medium ${color}`}>{value}</div>
      {sub && (
        <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] mt-1">{sub}</p>
      )}
    </div>
  );
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const iconMap = {
    change: FileDiff,
    chat: MessageSquare,
    scan: RefreshCw,
    restart: Play,
    ban: Users,
  };
  const colorMap: Record<string, string> = {
    change: 'text-[#5E6AD2]',
    chat: 'text-[rgba(255,255,255,0.5)]',
    scan: 'text-[#22c55e]',
    restart: 'text-[#f59e0b]',
    ban: 'text-[#ef4444]',
  };
  const Icon = iconMap[item.type] || Activity;
  const color = colorMap[item.type] || 'text-[rgba(255,255,255,0.4)]';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.05)] last:border-0">
      <div className={`w-7 h-7 flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-xs text-[rgba(255,255,255,0.7)] leading-[1.5]">
          {item.message}
        </p>
        <p className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider mt-0.5">
          {item.serverName} · {timeAgo(item.timestamp)}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-[rgba(255,255,255,0.15)] flex-shrink-0" />
    </div>
  );
}

function ServerCard({
  server,
  pendingChanges,
  onScan,
  onRestart,
  onConsole,
}: {
  server: ServerData;
  pendingChanges: number;
  onScan: (id: string) => void;
  onRestart: (id: string) => void;
  onConsole: (id: string) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await onScan(server.id);
    } finally {
      setScanning(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await onRestart(server.id);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <Link
      href={`/dashboard/servers/${server.id}`}
      className="group block bg-[#16161E] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100"
    >
      {/* Header row */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-2 h-2 flex-shrink-0 ${
              server.status === 'online'
                ? 'bg-[#22c55e] animate-pulse'
                : server.status === 'offline'
                ? 'bg-[rgba(255,255,255,0.2)]'
                : 'bg-[#f59e0b] animate-pulse'
            }`}
          />
          <h3 className="font-mono text-xs uppercase tracking-wider truncate group-hover:text-white transition-colors duration-100 text-white">
            {server.name}
          </h3>
        </div>
        <span className="nox-badge font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 flex-shrink-0 ml-2">
          {server.framework?.toUpperCase() || (server.hasAgent ? 'DETECTED' : 'STANDALONE')}
        </span>
      </div>

      {/* Metrics row */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                Players
              </span>
            </div>
            <div className="font-mono text-sm text-white">
              {server.status === 'online' && server.hasAgent
                ? server.playerCount
                : '0'}
              <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] ml-1">
                /{server.maxPlayers}
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                FPS
              </span>
            </div>
            <div className="font-mono text-sm text-white">
              {server.status === 'online' && server.hasAgent
                ? server.fps
                : '—'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FileDiff className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                Pending
              </span>
            </div>
            <div className="font-mono text-sm text-white">
              {pendingChanges > 0 ? (
                <span className="text-[#f59e0b]">{pendingChanges}</span>
              ) : (
                <span className="text-[rgba(255,255,255,0.4)]">0</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-5 pb-3 flex items-center gap-4 font-mono text-xs text-[rgba(255,255,255,0.4)]">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{server.resourceCount ?? 0} resources</span>
        </div>
        {server.lastSeenAt && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{timeAgo(server.lastSeenAt)}</span>
          </div>
        )}
        {server.hasAgent && (
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#22c55e] flex-shrink-0" />
            <span className="text-[#22c55e]">Agent</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScan(); }}
          disabled={scanning || server.status !== 'online' || !server.hasAgent}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed border-r border-[rgba(255,255,255,0.06)]"
        >
          <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          Scan
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestart(); }}
          disabled={restarting || server.status !== 'online' || !server.hasAgent}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed border-r border-[rgba(255,255,255,0.06)]"
        >
          <Play className="w-3 h-3" />
          {restarting ? 'Restarting…' : 'Restart'}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConsole(server.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Terminal className="w-3 h-3" />
          Console
        </button>
      </div>
    </Link>
  );
}

function ServerCardSkeleton() {
  return (
    <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 bg-[rgba(255,255,255,0.15)] animate-pulse" />
          <div className="h-3.5 w-28 bg-[rgba(255,255,255,0.06)] animate-pulse" />
        </div>
        <div className="h-4 w-14 bg-[rgba(255,255,255,0.06)] animate-pulse rounded-sm" />
      </div>
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-2.5 w-10 bg-[rgba(255,255,255,0.06)] animate-pulse mb-2" />
              <div className="h-4 w-8 bg-[rgba(255,255,255,0.08)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-3 flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-2.5 w-16 bg-[rgba(255,255,255,0.06)] animate-pulse" />
        ))}
      </div>
      <div className="flex border-t border-[rgba(255,255,255,0.06)]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-8 bg-[rgba(255,255,255,0.04)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
      <div className="w-14 h-14 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mx-auto mb-4">
        <Server className="w-7 h-7 text-[#5E6AD2]" />
      </div>
      <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-2">
        No servers yet
      </h2>
      <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-6 max-w-md mx-auto leading-[1.6]">
        Add your first FiveM server to start chatting with AI and making changes safely.
      </p>
      <Link
        href="/dashboard/servers/new"
        className="font-mono text-xs uppercase tracking-[1.4px] px-5 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 inline-flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Your First Server
      </Link>
    </div>
  );
}

function timeAgo(date: string | number): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  const {
    data: servers,
    error,
    isLoading,
    mutate,
  } = useSWR('servers', fetchServers, {
    refreshInterval: 30_000,
    dedupingInterval: 10_000,
    fallbackData: [],
  });

  // Fetch changes for all servers to compute stats + activity
  const { data: allChanges = [] } = useSWR(
    servers && servers.length > 0 ? `changes:${servers.map((s: any) => s.id).join(',')}` : null,
    () => fetchAllChanges(servers as any[]),
    { dedupingInterval: 15_000 },
  );

  const displayServers = (servers ?? []) as ServerData[];
  const hasError = !!error;

  // Compute stats
  const totalServers = displayServers.length;
  const onlineServers = displayServers.filter((s) => s.status === 'online' && s.hasAgent).length;
  const pendingChanges = allChanges.filter((c: Change) => c.status === 'pending').length;
  // AI messages today: count changes with activity today as proxy
  const today = new Date().toDateString();
  const aiMessagesToday = allChanges.filter(
    (c: Change) => new Date(c.createdAt).toDateString() === today,
  ).length;

  // Build activity feed from changes + server heartbeat events
  const activityItems: ActivityItem[] = [
    ...allChanges
      .filter((c: Change) => c.status === 'pending')
      .slice(0, 5)
      .map((c: Change) => ({
        id: `change_${c.id}`,
        type: 'change' as const,
        message: `AI proposed change to ${c.file}`,
        serverName: c.serverName || 'Unknown',
        timestamp: new Date(c.createdAt).getTime(),
      })),
    ...allChanges
      .filter((c: Change) => c.status === 'applied')
      .slice(0, 3)
      .map((c: Change) => ({
        id: `applied_${c.id}`,
        type: 'change' as const,
        message: `Applied change to ${c.file}`,
        serverName: c.serverName || 'Unknown',
        timestamp: new Date(c.createdAt).getTime(),
      })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  // Add synthetic activity for online servers with no recent changes
  if (activityItems.length < 3) {
    displayServers
      .filter((s) => s.status === 'online' && s.hasAgent)
      .slice(0, 3)
      .forEach((s) => {
        activityItems.push({
          id: `heartbeat_${s.id}`,
          type: 'scan' as const,
          message: `${s.name} heartbeat received`,
          serverName: s.name,
          timestamp: s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : Date.now() - 60000,
        });
      });
  }

  const handleScan = async (serverId: string) => {
    try {
      await scanResources(serverId);
      setToast('Scan completed');
      mutate();
    } catch (e) {
      setToast('Scan failed');
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleRestart = async (serverId: string) => {
    try {
      await restartServer(serverId);
      setToast('Restart command sent');
    } catch (e) {
      setToast('Restart failed');
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleConsole = (serverId: string) => {
    window.open(`/dashboard/servers/${serverId}`, '_self');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-16 right-6 z-50 font-mono text-xs uppercase tracking-wider px-4 py-2.5 bg-[#16161E] border border-[rgba(94,106,210,0.4)] text-white"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="h-12 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
          <span className="text-white font-medium">Servers</span>
          <span className="text-[rgba(255,255,255,0.2)]">/</span>
          <span>
            {isLoading
              ? 'loading…'
              : `${displayServers.length} server${displayServers.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* ─── Stats Row ──────────────────────────────────────────────── */}
        {totalServers > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Servers"
              value={totalServers}
              icon={Server}
              color="text-white"
              sub={`${onlineServers} online`}
            />
            <StatCard
              label="Online"
              value={onlineServers}
              icon={Activity}
              color="text-[#22c55e]"
              sub={`of ${totalServers} configured`}
            />
            <StatCard
              label="AI Messages"
              value={aiMessagesToday}
              icon={MessageSquare}
              color="text-[#5E6AD2]"
              sub="today"
            />
            <StatCard
              label="Pending Changes"
              value={pendingChanges}
              icon={FileDiff}
              color={pendingChanges > 0 ? 'text-[#f59e0b]' : 'text-[rgba(255,255,255,0.5)]'}
              sub={pendingChanges > 0 ? 'awaiting review' : 'all applied'}
            />
          </div>
        )}

        {/* ─── Activity Feed ──────────────────────────────────────────── */}
        {totalServers > 0 && (
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.6)]">
                  Activity
                </span>
              </div>
              <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                Last 24h
              </span>
            </div>
            <div className="px-2 py-2">
              {activityItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="font-mono text-xs text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                    No recent activity
                  </p>
                </div>
              ) : (
                activityItems.map((item) => (
                  <ActivityItemRow key={item.id} item={item} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">
              Your Servers
            </h1>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
              Manage and chat with your FiveM servers
            </p>
          </div>
          <Link
            href="/dashboard/servers/new"
            className="font-mono text-xs uppercase tracking-[1.4px] px-4 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Server
          </Link>
        </div>

        {/* ─── Loading ────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServerCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ─── Error ──────────────────────────────────────────────────── */}
        {hasError && !isLoading && (
          <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#ef4444]">
                Connection failed
              </h3>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
                Could not connect to the orchestrator. Make sure it is running on port 3001.
              </p>
            </div>
          </div>
        )}

        {/* ─── Empty ──────────────────────────────────────────────────── */}
        {!isLoading && !hasError && displayServers.length === 0 && <EmptyState />}

        {/* ─── Server Grid ────────────────────────────────────────────── */}
        {!isLoading && displayServers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {displayServers.map((server: ServerData) => {
              const serverPending = allChanges.filter(
                (c: Change) => c.serverId === server.id && c.status === 'pending',
              ).length;
              return (
                <ServerCard
                  key={server.id}
                  server={server}
                  pendingChanges={serverPending}
                  onScan={handleScan}
                  onRestart={handleRestart}
                  onConsole={handleConsole}
                />
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}