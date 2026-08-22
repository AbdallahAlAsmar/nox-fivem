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
  Plus as PlusIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ORCHESTRATOR_URL } from '@/lib/config';
import { scanResources, restartServer, createServer } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useState, useCallback } from 'react';
import { ServerCardSkeleton, PlayerRowSkeleton, ResourceRowSkeleton, SettingsFieldSkeleton } from '@/components/ui/skeletons';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

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
      } catch { return []; }
    }),
  );
  return results.flat();
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Components ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#16161E] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">{label}</span>
      </div>
      <div className={`font-mono text-2xl font-medium ${color}`}>{value}</div>
      {sub && (
        <p className="font-sans text-xs text-white/35 mt-1">{sub}</p>
      )}
    </motion.div>
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
    chat: 'text-white/50',
    scan: 'text-[#22c55e]',
    restart: 'text-[#f59e0b]',
    ban: 'text-[#ef4444]',
  };
  const Icon = iconMap[item.type] || Activity;
  const color = colorMap[item.type] || 'text-white/40';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`w-7 h-7 flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-xs text-white/70 leading-[1.5]">{item.message}</p>
        <p className="font-mono text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
          {item.serverName} · {timeAgo(item.timestamp)}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />
    </div>
  );
}

function ServerCard({
  server,
  pendingChanges,
  onScan,
  onRestart,
}: {
  server: ServerData;
  pendingChanges: number;
  onScan: (id: string) => void;
  onRestart: (id: string) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await onScan(server.id);
      toast.success('Scan completed');
    } catch {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await onRestart(server.id);
      toast.success('Restart command sent');
    } catch {
      toast.error('Restart failed');
    } finally {
      setRestarting(false);
    }
  };

  return (
    <Link
      href={`/dashboard/servers/${server.id}`}
      className="group block bg-[#16161E] hover:bg-[#1a1a24] transition-colors duration-100"
    >
      {/* Header row */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-2 h-2 flex-shrink-0 ${
              server.status === 'online' && server.hasAgent
                ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                : server.status === 'offline'
                ? 'bg-white/20'
                : 'bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.6)]'
            }`}
          />
          <div className="min-w-0">
            <h2 className="font-mono text-sm font-medium text-white truncate group-hover:text-white transition-colors duration-100">
              {server.name}
            </h2>
            <p className="font-mono text-[10px] text-white/30 truncate mt-0.5">{server.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {server.hasAgent ? (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(34,197,94,0.1)] text-[#22c55e]">
              Connected
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-white/30">
              Standalone
            </span>
          )}
          {pendingChanges > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(245,158,11,0.1)] text-[#f59e0b]">
              {pendingChanges} changes
            </span>
          )}
        </div>
      </div>

      {/* Framework & metadata row */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-xs text-white/60 uppercase">
            {server.framework || 'UNKNOWN'}
          </span>
          <span className="text-white/15">·</span>
          <span className="font-mono text-xs text-white/40">{server.resourceCount} resources</span>
          {server.playerCount > 0 && (
            <>
              <span className="text-white/15">·</span>
              <span className="font-mono text-xs text-white/40">{server.playerCount}/{server.maxPlayers} players</span>
            </>
          )}
          {server.fps > 0 && (
            <>
              <span className="text-white/15">·</span>
              <span className="font-mono text-xs text-white/40">{server.fps} FPS</span>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
        <span className="font-mono text-[10px] text-white/25">
          {server.lastSeenAt ? `Last seen ${timeAgo(new Date(server.lastSeenAt).getTime())}` : 'No recent activity'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScan(); }}
            disabled={scanning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            Scan
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestart(); }}
            disabled={restarting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-100 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            Restart
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isSignedIn } = useAuth();
  const { data: servers, isLoading, error, mutate } = useSWR('servers', fetchServers, {
    fallbackData: [],
  });
  const { data: allChanges } = useSWR(
    servers && servers.length > 0 ? `changes:${servers.map((s: any) => s.id).join(',')}` : null,
    () => fetchAllChanges(servers as any[]),
    { dedupingInterval: 15_000 },
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [creating, setCreating] = useState(false);
  const { dialog, confirm, close: closeConfirm } = useConfirmDialog();

  const displayServers = (servers ?? []) as ServerData[];
  const hasError = !!error;

  // Compute stats
  const totalServers = displayServers.length;
  const onlineServers = displayServers.filter((s) => s.status === 'online' && s.hasAgent).length;
  const pendingChanges = allChanges?.filter((c: Change) => c.status === 'pending').length ?? 0;
  const today = new Date().toDateString();
  const aiMessagesToday = allChanges?.filter(
    (c: Change) => new Date(c.createdAt).toDateString() === today,
  ).length ?? 0;

  // Build activity feed from changes + server heartbeat events
  const activityItems: ActivityItem[] = [
    ...(allChanges ?? [])
      .filter((c: Change) => c.status === 'pending')
      .slice(0, 5)
      .map((c: Change) => ({
        id: `change_${c.id}`,
        type: 'change' as const,
        message: `AI proposed change to ${c.file}`,
        serverName: c.serverName || 'Unknown',
        timestamp: new Date(c.createdAt).getTime(),
      })),
    ...(allChanges ?? [])
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
      mutate();
    } catch (e) {
      toast.error('Scan failed');
    }
  };

  const handleRestart = async (serverId: string) => {
    try {
      await restartServer(serverId);
      toast.success('Restart command sent');
    } catch (e) {
      toast.error('Restart failed');
    }
  };

  const handleCreateServer = async () => {
    if (!newServerName.trim()) return;
    setCreating(true);
    try {
      const result = await createServer(newServerName);
      toast.success(`Server "${newServerName}" created`);
      setShowCreateModal(false);
      setNewServerName('');
      mutate();
    } catch (e) {
      toast.error('Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteServer = (server: ServerData) => {
    confirm({
      title: 'Delete Server',
      message: `Are you sure you want to delete "${server.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        // Delete implementation would go here
        toast.success('Server deleted');
        mutate();
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f]">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 bg-[#16161E] border border-[rgba(94,106,210,0.4)] text-white"
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create server modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50"
            >
              <div className="bg-[#16161E] border border-white/10 p-5">
                <h3 className="font-mono text-sm text-white mb-4">New Server</h3>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Server name..."
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#5E6AD2] mb-4"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateServer()}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 font-mono text-xs text-white/50 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateServer}
                    disabled={creating || !newServerName.trim()}
                    className="px-3 py-1.5 bg-[#5E6AD2] hover:bg-[#4f5bc0] disabled:opacity-50 text-white font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm dialog */}
      {dialog && (
        <ConfirmDialog
          isOpen={!!dialog}
          title={dialog.title}
          message={dialog.message}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          variant={dialog.variant}
          onConfirm={dialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {/* Top bar */}
      <header className="h-12 border-b border-white/5 bg-[#16161E]/30 flex items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-white/40">
          <span className="text-white font-medium">Servers</span>
          <span className="text-white/20">/</span>
          <span>
            {isLoading
              ? 'loading...'
              : `${displayServers.length} server${displayServers.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-white/30 bg-white/5 rounded font-mono">⌘K</kbd>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 text-[#5E6AD2] font-mono text-xs uppercase tracking-wider hover:bg-[#5E6AD2]/25 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Server</span>
          </button>
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
              color={pendingChanges > 0 ? 'text-[#f59e0b]' : 'text-white/50'}
              sub={pendingChanges > 0 ? 'awaiting review' : 'all applied'}
            />
          </div>
        )}

        {/* ─── Activity Feed ──────────────────────────────────────────── */}
        {activityItems.length > 0 && (
          <div className="bg-[#16161E] p-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-white/40 mb-3">Recent Activity</h3>
            <div className="space-y-0.5">
              {activityItems.map((item) => (
                <ActivityItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Server Grid ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-white/40">Your Servers</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <ServerCardSkeleton key={i} />
              ))}
            </div>
          ) : hasError ? (
            <div className="text-center py-16 bg-[#16161E]">
              <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <h3 className="font-mono text-sm text-white/60 mb-2">Failed to load servers</h3>
              <p className="font-sans text-xs text-white/30 mb-4">Check your connection and try again</p>
              <button
                onClick={() => mutate()}
                className="flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : displayServers.length === 0 ? (
            <div className="text-center py-16 bg-[#16161E]">
              <Server className="w-12 h-12 text-white/15 mx-auto mb-4" />
              <h3 className="font-mono text-sm text-white/60 mb-2">No servers yet</h3>
              <p className="font-sans text-xs text-white/30 mb-4 max-w-sm mx-auto">
                Create your first server to get started with AI-powered management
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors mx-auto"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Create Server
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayServers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  pendingChanges={allChanges?.filter((c: Change) => c.serverId === server.id && c.status === 'pending').length ?? 0}
                  onScan={handleScan}
                  onRestart={handleRestart}
                />
              ))}
              {/* Create card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex flex-col items-center justify-center min-h-[180px] bg-[#16161E]/50 border border-dashed border-white/10 hover:border-[#5E6AD2]/40 hover:bg-[#16161E] transition-all duration-100 rounded"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <PlusIcon className="w-5 h-5 text-white/30" />
                </div>
                <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Add Server</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}