'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  Server,
  Ban,
} from 'lucide-react';
import ChatPanel from '@/components/chat/ChatPanel';
import { PairingSetupView } from '@/components/dashboard/PairingSetupView';
import { ORCHESTRATOR_URL } from '@/lib/config';
import { scanResources, restartServer, deleteServer } from '@/lib/api';
import { fetchPlayers, banPlayer, unbanPlayer } from '@/lib/api';
import { authedFetch } from '@/lib/auth-fetch';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

export default function ServerDetailPage() {
  const params = useParams<{ serverId: string }>();
  const router = useRouter();
  const serverId = params?.serverId ?? '';
  const [activeTab, setActiveTab] = useState<'chat' | 'players' | 'resources' | 'console' | 'settings'>('chat');
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
  const [resourceList, setResourceList] = useState<any[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceScanning, setResourceScanning] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [serverName, setServerName] = useState('');
  // While the user edits the name field, the settings poll must not clobber
  // what they're typing. Cleared after a successful save.
  const serverNameDirtyRef = useRef(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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
      const res = await authedFetch(`${ORCH_URL}/api/servers/${serverId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setServer(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setServer(data);
      if (!serverNameDirtyRef.current) {
        setServerName(data.name ?? '');
      }

      if (data.pairing) setPairing(data.pairing);
      else setPairing(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load server');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadServer();
    startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

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

  const regeneratePairingCode = async () => {
    setRegenerating(true);
    setPairingError(null);
    try {
      const res = await authedFetch(`${ORCH_URL}/api/servers/${serverId}/regenerate-pairing`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPairing({ code: data.code, expiresAt: new Date(data.expiresAt) });
    } catch (err: any) {
      setPairingError(err.message || 'Failed to regenerate code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await scanResources(serverId);
      setHeaderMessage('Scan complete');
      loadServer(false);
    } catch {
      setHeaderMessage('Scan failed');
    } finally {
      setScanning(false);
      setTimeout(() => setHeaderMessage(null), 3000);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await restartServer(serverId);
      setHeaderMessage('Restart command sent');
    } catch {
      setHeaderMessage('Restart failed');
    } finally {
      setRestarting(false);
      setTimeout(() => setHeaderMessage(null), 3000);
    }
  };

  const handleSaveName = async () => {
    if (!serverName.trim() || isSavingName) return;
    setIsSavingName(true);
    setSaveMsg(null);
    try {
      const res = await authedFetch(`${ORCH_URL}/api/servers/${serverId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: serverName.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      serverNameDirtyRef.current = false;
      setSaveMsg('Server name updated');
      loadServer(false);
    } catch {
      setSaveMsg('Failed to update server name');
    } finally {
      setIsSavingName(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleResourceScan = async () => {
    setResourceScanning(true);
    setResourceError(null);
    try {
      const res = await authedFetch(`${ORCH_URL}/api/servers/${serverId}/scan`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResourceList(data.resources || []);
    } catch (err: any) {
      setResourceError(err.message || 'Scan failed');
    } finally {
      setResourceScanning(false);
    }
  };

  const filteredResources = resourceList.filter((r: any) =>
    r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
    (r.path ?? '').toLowerCase().includes(resourceSearch.toLowerCase())
  );

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'resources', label: 'Resources', icon: Package },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
      {/* Top bar */}
      <div className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-4 gap-4 flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          {loading ? (
            <div className="h-4 w-32 bg-[rgba(255,255,255,0.06)] animate-pulse rounded" />
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                server?.status === 'online'
                  ? 'bg-[#22c55e] animate-pulse'
                  : server?.status === 'offline'
                  ? 'bg-[rgba(255,255,255,0.2)]'
                  : 'bg-[#f59e0b] animate-pulse'
              }`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-white truncate">
                    {server?.name || 'Loading...'}
                  </span>
                  <span className="nox-badge font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 flex-shrink-0">
                    {server?.framework?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-[rgba(255,255,255,0.3)] mt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22c55e]"></span>
                    </span>
                    {server?.playerCount ?? 0}/{server?.maxPlayers ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {server?.fps ?? '—'} fps
                  </span>
                  {server?.lastSeenAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(server.lastSeenAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleScan}
            disabled={scanning || server?.status !== 'online' || !server?.hasAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            Scan
          </button>
          <button
            onClick={handleRestart}
            disabled={restarting || server?.status !== 'online' || !server?.hasAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Play className="w-3 h-3" />
            {restarting ? 'Restarting…' : 'Restart'}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="h-10 border-b border-[rgba(255,255,255,0.06)] bg-[#16161E]/30 flex items-center px-4 gap-1 flex-shrink-0 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                isActive
                  ? 'text-white border-b-2 border-[#3DFFA2] -mb-px'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {headerMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 right-6 z-50 font-mono text-xs uppercase tracking-wider px-4 py-2.5 bg-[#16161E] border border-[rgba(61,255,162,0.4)] text-white"
          >
            {headerMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && !loading && server && server.status !== 'online' && (
          <div className="p-6 overflow-y-auto">
            <div className="max-w-lg mx-auto">
              <div className={`flex items-start gap-3 p-4 border mb-5 ${server.hasAgent ? 'border-[rgba(61,255,162,0.3)] bg-[rgba(61,255,162,0.06)]' : 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)]'}`}>
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${server.hasAgent ? 'text-[#3DFFA2]' : 'text-[#f59e0b]'}`} />
                <div>
                  <p className={`font-mono text-xs uppercase tracking-wider ${server.hasAgent ? 'text-[#3DFFA2]' : 'text-[#f59e0b]'}`}>
                    {server.hasAgent ? 'Desktop app is offline' : 'Server not connected'}
                  </p>
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.6)] mt-1 leading-[1.6]">
                    {server.hasAgent
                      ? 'This server is linked to a NOXES desktop app, but the app isn\'t running right now — so chat, players, and file tools are unavailable. Open the NOXES app on your PC (make sure it\'s signed in), pick this server, and it will reconnect automatically.'
                      : 'The NOXES desktop app isn\'t linked to this server yet, so chat, players, and file tools are unavailable. Follow the steps below to connect it — takes about a minute.'}
                  </p>
                </div>
              </div>

              {pairingError && (
                <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pairingError}
                </div>
              )}

              {regenerating ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 text-[rgba(255,255,255,0.3)] animate-spin" />
                  <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                    Generating pairing code…
                  </p>
                </div>
              ) : pairing ? (
                !server.hasAgent && (
                  <PairingSetupView
                    pairing={{
                      id: serverId,
                      pairingCode: pairing.code,
                      expiresAt: pairing.expiresAt,
                    }}
                    onRegenerate={regeneratePairingCode}
                    serverName={server.name}
                    hideDismiss
                  />
                )
              ) : (
                !server.hasAgent && (
                  <div className="space-y-3">
                    <ol className="space-y-2.5 font-sans text-xs text-white/60 leading-[1.6] list-none">
                      <li className="flex gap-2.5">
                        <span className="font-mono text-[10px] text-[#3DFFA2] mt-0.5 flex-shrink-0">1.</span>
                        <span>Download and install the <a href="/dist/NOX-Setup.exe" className="text-[#3DFFA2] hover:text-white underline">NOXES desktop app</a>.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="font-mono text-[10px] text-[#3DFFA2] mt-0.5 flex-shrink-0">2.</span>
                        <span>Sign in with the same account, pick this server, choose your FiveM directory — it connects automatically.</span>
                      </li>
                    </ol>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && server?.status === 'online' && (
          <ChatPanel
            serverId={serverId}
            framework={server?.framework || 'Unknown'}
          />
        )}

        {activeTab === 'players' && server && (
          <ServerPlayersView
            serverId={serverId}
            orchUrl={ORCH_URL}
            hasAgent={server?.hasAgent}
          />
        )}

        {activeTab === 'resources' && server && (
          <ServerResourcesView
            serverId={serverId}
            orchUrl={ORCH_URL}
            resources={resourceList}
            search={resourceSearch}
            onSearch={setResourceSearch}
            onScan={handleResourceScan}
            scanning={resourceScanning}
            error={resourceError}
          />
        )}

        {activeTab === 'console' && server && (
          <ServerConsoleView serverId={serverId} orchUrl={ORCH_URL} hasAgent={!!server.hasAgent} />
        )}

        {activeTab === 'settings' && server && (
          <ServerSettingsView
            server={server}
            serverId={serverId}
            orchUrl={ORCH_URL}
            pairing={pairing}
            onRegenerate={regeneratePairingCode}
            regenerating={regenerating}
            pairingError={pairingError}
            serverName={serverName}
            onNameChange={(v) => {
              // Mark dirty BEFORE updating state so the settings poll skips
              // overwriting while the user edits.
              serverNameDirtyRef.current = true;
              setServerName(v);
            }}
            onSaveName={handleSaveName}
            isSavingName={isSavingName}
            saveMsg={saveMsg}
            onRefresh={loadServer}
            onDelete={handleDeleteServer}
            deletingServer={deletingServer}
            deleteServerMsg={deleteServerMsg}
          />
        )}

        {!server && !loading && (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#0F0F14]">
            <div className="text-center max-w-md">
              <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-[#ef4444]" />
              </div>
              <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
                Server Not Found
              </h2>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">
                The server you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Link
                href="/dashboard"
                className="font-mono text-xs uppercase tracking-wider text-[#3DFFA2] hover:underline"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ServerPlayersView({ serverId, orchUrl, hasAgent }: { serverId: string; orchUrl: string; hasAgent: boolean }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banning, setBanning] = useState<Record<string, boolean>>({});
  const [unbanning, setUnbanning] = useState<Record<string, boolean>>({});
  const [banModal, setBanModal] = useState<{ player: any; reason: string } | null>(null);
  const [banMsg, setBanMsg] = useState<string | null>(null);
  // Spinner belongs to the FIRST load only — background poll refreshes must
  // not flash it every 5 seconds.
  const firstLoadRef = useRef(true);

  const loadPlayers = useCallback(async () => {
    try {
      if (firstLoadRef.current) setLoading(true);
      setError(null);
      const data = await fetchPlayers(serverId);
      setPlayers(data || []);
    } catch (e: any) {
      if (firstLoadRef.current || players.length === 0) {
        setError(e?.message || 'Failed to fetch players — ensure the agent is connected');
      }
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setLoading(false);
      }
    }
  }, [serverId, players.length]);

  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const handleBan = async (player: any) => {
    setBanModal({ player, reason: '' });
  };

  const confirmBan = async () => {
    if (!banModal) return;
    const { player, reason } = banModal;
    const playerId = player.dbPlayerId || player.id || player.playerId;
    if (!playerId) return;
    setBanning((prev) => ({ ...prev, [playerId]: true }));
    setBanMsg(null);
    try {
      await banPlayer(serverId, playerId, reason || undefined);
      setBanModal(null);
      await loadPlayers();
      setBanMsg('Player banned');
    } catch {
      setBanMsg('Failed to ban player');
    } finally {
      setBanning((prev) => ({ ...prev, [playerId]: false }));
      setTimeout(() => setBanMsg(null), 3000);
    }
  };

  const handleUnban = async (player: any) => {
    const playerId = player.dbPlayerId || player.id || player.playerId;
    if (!playerId) return;
    setUnbanning((prev) => ({ ...prev, [playerId]: true }));
    try {
      await unbanPlayer(serverId, playerId);
      await loadPlayers();
    } catch {
      // ignore
    } finally {
      setUnbanning((prev) => ({ ...prev, [playerId]: false }));
    }
  };

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
          <p className="font-mono text-xs text-[rgba(239,68,68,0.7)] mb-2">{error}</p>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
            {!hasAgent ? 'Agent not connected — pair the NOXES agent to this server' : 'Retry in a moment'}
          </p>
          <button
            onClick={loadPlayers}
            className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {players.map((player: any) => {
            const playerId = player.dbPlayerId || player.id || player.playerId;
            const isBanned = player.isBanned;
            const banBtn = isBanned
              ? (
                  <button
                    onClick={() => handleUnban(player)}
                    disabled={unbanning[playerId]}
                    className="flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#22c55e] border border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.1)] transition-colors disabled:opacity-50"
                  >
                    {unbanning[playerId] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {unbanning[playerId] ? 'Unbanning...' : 'Unban'}
                  </button>
                )
              : (
                  <button
                    onClick={() => handleBan(player)}
                    disabled={banning[playerId]}
                    className="flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#ef4444] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50"
                  >
                    {banning[playerId] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                    {banning[playerId] ? 'Banning...' : 'Ban'}
                  </button>
                );
            return (
              <div
                key={playerId || player.id}
                className={`bg-[#16161E] border p-3 flex items-center gap-3 transition-colors ${
                  isBanned
                    ? 'border-[rgba(239,68,68,0.3)] hover:border-[rgba(239,68,68,0.5)]'
                    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isBanned
                    ? 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]'
                    : 'bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.3)]'
                }`}>
                  {isBanned
                    ? <Ban className="w-4 h-4 text-[#ef4444]" />
                    : <Users className="w-4 h-4 text-[#3DFFA2]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-white truncate">{player.name}</p>
                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">{player.identifier}</p>
                  {isBanned && player.banReason && (
                    <p className="font-mono text-[10px] text-[#ef4444] mt-0.5 truncate">{player.banReason}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-xs text-[rgba(255,255,255,0.5)]">{player.ping}ms</p>
                  {isBanned && (
                    <p className="font-mono text-[10px] text-[#ef4444] mt-0.5">
                      {player.bannedAt ? new Date(player.bannedAt).toLocaleDateString() : 'Banned'}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">{banBtn}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ban reason modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-[#16161E] border border-[rgba(239,68,68,0.3)] rounded-lg p-5 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center">
                <Ban className="w-4 h-4 text-[#ef4444]" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">Ban Player</h3>
                <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">{banModal.player.name}</p>
              </div>
              <button
                onClick={() => setBanModal(null)}
                className="ml-auto text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5 block">
                Ban Reason (optional)
              </label>
              <input
                type="text"
                value={banModal.reason}
                onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmBan();
                  if (e.key === 'Escape') setBanModal(null);
                }}
                placeholder="e.g. Exploiting, cheating, harassment..."
                className="w-full bg-[#0a0a0f] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 font-mono text-xs text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[rgba(239,68,68,0.5)]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBanModal(null)}
                className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.1)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                disabled={banning[banModal.player.dbPlayerId || banModal.player.id || banModal.player.playerId]}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {banning[banModal.player.dbPlayerId || banModal.player.id || banModal.player.playerId] ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Ban className="w-3 h-3" />
                )}
                {banning[banModal.player.dbPlayerId || banModal.player.id || banModal.player.playerId] ? 'Banning...' : 'Confirm Ban'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast */}
      {banMsg && (
        <div className="fixed bottom-6 right-6 z-50 font-mono text-xs uppercase tracking-wider px-4 py-2.5 border shadow-lg">
          {banMsg.includes('banned') ? (
            <span className="text-[#22c55e] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
              {banMsg}
            </span>
          ) : (
            <span className="text-[#ef4444] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)]">
              <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
              {banMsg}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ServerResourcesView({
  serverId,
  orchUrl,
  resources,
  search,
  onSearch,
  onScan,
  scanning,
  error,
}: {
  serverId: string;
  orchUrl: string;
  resources: Array<{ name: string; path: string; dependencies?: string[] }>;
  search: string;
  onSearch: (v: string) => void;
  onScan: () => void;
  scanning: boolean;
  error: string | null;
}) {
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
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs focus:outline-none focus:border-[#3DFFA2]"
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

      {error && (
        <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] font-mono text-xs text-[#ef4444]">
          {error}
        </div>
      )}

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
        <div className="space-y-2">
          {filtered.map((res, i) => {
            return (
              <div
                key={i}
                className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-3 flex items-center gap-3 hover:border-[rgba(255,255,255,0.16)] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.3)]">
                  <Package className="w-4 h-4 text-[#3DFFA2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white font-medium truncate">{res.name}</span>
                  </div>
                  {res.path && (
                    <p className="font-mono text-[10px] text-[rgba(255,255,255,0.35)] truncate mt-0.5">
                      {res.path}
                    </p>
                  )}
                  {res.dependencies && res.dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {res.dependencies.slice(0, 4).map((dep, idx) => (
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServerConsoleView({ serverId, orchUrl, hasAgent }: { serverId: string; orchUrl: string; hasAgent: boolean }) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Load-once per mount; the agent's tailConsole returns a static snapshot,
  // not a stream — no polling interval is wired up yet.
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await authedFetch(`${orchUrl}/api/servers/${serverId}/console`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const fetched: string[] = Array.isArray(data?.lines)
        ? data.lines
        : Array.isArray(data?.output)
        ? data.output
        : typeof data?.content === 'string'
        ? data.content.split('\n')
        : [];
      setLines(fetched);
    } catch (e: any) {
      setError(e?.message || 'Failed to load console output');
    } finally {
      setLoading(false);
    }
  }, [serverId, orchUrl]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0A0A0F] font-mono text-xs overflow-hidden">
      {/* Static viewer — the platform has no console exec action, so command
          input would be dishonest. This is a read-only tail of the log. */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.35)]">
          Server Console (last 200 lines)
        </span>
        <button
          onClick={async () => {
            setLoading(true);
            await load();
          }}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)] disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[rgba(255,255,255,0.3)]" />
        </div>
      ) : error ? (
        <div className="p-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded text-[#ef4444]">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0.5 text-[rgba(255,255,255,0.7)] p-2 whitespace-pre-wrap break-all">
          {lines.length === 0 ? (
            <p className="text-[rgba(255,255,255,0.3)]">No console output available.</p>
          ) : (
            lines.map((line, index) => (
              <div key={index} className="leading-relaxed">
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ServerSettingsView({
  server,
  serverId,
  orchUrl,
  pairing,
  onRegenerate,
  regenerating,
  pairingError,
  serverName,
  onNameChange,
  onSaveName,
  isSavingName,
  saveMsg,
  onRefresh,
  onDelete,
  deletingServer,
  deleteServerMsg,
}: {
  server: any;
  serverId: string;
  orchUrl: string;
  pairing: { code: string; expiresAt: Date } | null;
  onRegenerate: () => void;
  regenerating: boolean;
  pairingError: string | null;
  serverName: string;
  onNameChange: (v: string) => void;
  onSaveName: () => void;
  isSavingName: boolean;
  saveMsg: string | null;
  onRefresh: () => void;
  onDelete: (name: string) => Promise<void>;
  deletingServer: boolean;
  deleteServerMsg: string | null;
}) {
  const [serverDir, setServerDir] = useState(server?.settings?.serverDir || '');
  const [saving, setSaving] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const handleSaveDir = async () => {
    setSaving(true);
    try {
      const res = await authedFetch(`${orchUrl}/api/servers/${serverId}/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings: { serverDir } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg('Server directory saved');
      onRefresh();
    } catch {
      setMsg('Failed to save server directory');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to disconnect and revoke the agent on this server?')) return;
    setRevoking(true);
    try {
      const res = await authedFetch(`${orchUrl}/api/servers/${serverId}/revoke`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRevokeMsg('Agent revoked successfully');
      onRefresh();
    } catch {
      setRevokeMsg('Failed to revoke agent');
    } finally {
      setRevoking(false);
      setTimeout(() => setRevokeMsg(null), 3000);
    }
  };

  const handleDelete = async () => {
    if (deleteName !== server?.name) {
      setDeleteMsg('Server name does not match');
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(server?.name);
    } catch {
      setDeleteMsg('Failed to delete server');
    } finally {
      setIsDeleting(false);
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
        <div className="p-3 bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.2)] font-mono text-xs text-[#3DFFA2]">
          {msg}
        </div>
      )}

      {/* Server Info Card */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
            Server Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverName}
              onChange={(e) => onNameChange(e.target.value)}
              className="flex-1 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#3DFFA2]"
            />
            <button
              onClick={onSaveName}
              disabled={isSavingName || serverName === server?.name}
              className="px-4 py-2 bg-[#3DFFA2] hover:bg-[#36d98c] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingName ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
              Framework
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white uppercase px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded">
                {server?.framework?.toUpperCase() || 'Not detected'}
              </span>
            </div>
            <p className="font-sans text-[10px] text-[rgba(255,255,255,0.3)] mt-1">
              Auto-detected from server scan
            </p>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">
              Status
            </label>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                server?.status === 'online'
                  ? 'bg-[#22c55e] animate-pulse'
                  : server?.status === 'offline'
                  ? 'bg-[rgba(255,255,255,0.2)]'
                  : 'bg-[#f59e0b] animate-pulse'
              }`} />
              <span className="font-mono text-xs text-white uppercase">
                {server?.status || 'unknown'}
              </span>
            </div>
            {server?.lastSeenAt && (
              <p className="font-sans text-[10px] text-[rgba(255,255,255,0.3)] mt-1">
                Last seen: {new Date(server.lastSeenAt).toLocaleString()}
              </p>
            )}
          </div>
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
              className="flex-1 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#3DFFA2]"
            />
            <button
              onClick={handleSaveDir}
              disabled={saving}
              className="px-4 py-2 bg-[#3DFFA2] hover:bg-[#36d98c] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="font-sans text-[10px] text-[rgba(255,255,255,0.3)] mt-1">
            Path to your FiveM server directory (e.g., C:/servers/my-server)
          </p>
        </div>
      </div>

      {/* Pairing Card */}
      {pairing && (
        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase tracking-wider text-white">Agent Pairing</h3>
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] px-3 py-2 font-mono text-sm text-[#3DFFA2]">
              {pairing.code}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(pairing.code)}
              className="p-2 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="font-sans text-[10px] text-[rgba(255,255,255,0.3)]">
            Expires: {pairing.expiresAt.toLocaleString()}
          </p>
          {pairingError && (
            <p className="font-mono text-xs text-[#ef4444]">{pairingError}</p>
          )}
        </div>
      )}

      {/* Danger Zone */}
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
            disabled={isDeleting || deleteName !== server?.name}
            className="w-full px-4 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.25)] text-[#ef4444] font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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