'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Users, Search, Shield, ShieldOff, AlertCircle, Ban, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchServers } from '@/lib/api';
import { fetchPlayers, banPlayer, unbanPlayer } from '@/lib/api';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

export default function PlayersPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filterBanned, setFilterBanned] = useState<'all' | 'online' | 'banned'>('all');
  const [banning, setBanning] = useState<string | null>(null);
  // One reason string PER player row — a single shared state meant typing a
  // reason into one row's input changed every other open row too.
  const [banReasons, setBanReasons] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { dialog, confirm, close: closeConfirm } = useConfirmDialog();

  const { data: servers, isLoading: loadingServers, error: serversError, mutate: mutateServers } = useSWR('servers', fetchServers, {
    fallbackData: [],
  });

  const { data: players, isLoading: loadingPlayers, mutate } = useSWR(
    selectedServer ? `players:${selectedServer}` : null,
    () => fetchPlayers(selectedServer),
    { dedupingInterval: 15_000 },
  );

  const filtered = (players ?? []).filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.playerId ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterBanned === 'all' ? true :
      filterBanned === 'banned' ? p.isBanned :
      !p.isBanned;
    return matchesSearch && matchesFilter;
  });

  const handleBan = async (playerId: string, name: string) => {
    if (!selectedServer) return;
    setBanning(playerId);
    try {
      await banPlayer(selectedServer, playerId, banReasons[playerId] || `Banned by admin`);
      toast.success(`Banned ${name}`);
      mutate();
    } catch {
      toast.error('Failed to ban player');
    }
    setBanning(null);
    setBanReasons((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  const handleUnban = async (playerId: string, name: string) => {
    if (!selectedServer) return;
    try {
      await unbanPlayer(selectedServer, playerId);
      toast.success(`Unbanned ${name}`);
      mutate();
    } catch {
      toast.error('Failed to unban player');
    }
  };

  const onlineCount = (players ?? []).filter((p: any) => !p.isBanned).length;
  const bannedCount = (players ?? []).filter((p: any) => p.isBanned).length;

  return (
    <ErrorBoundary>
      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] p-6">
        {/* Toast notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 bg-[#16161E] border border-[rgba(94,106,210,0.4)] text-white"
              >
                {toastMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Players</h1>
            <p className="font-sans text-xs text-white/40 mt-1">
              Manage online players and bans across your servers
            </p>
          </div>

          {/* Server selector */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <select
                value={selectedServer}
                onChange={(e) => { setSelectedServer(e.target.value); setSearch(''); setFilterBanned('all'); }}
                className="w-full appearance-none bg-[#16161E] border border-white/10 text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:outline-none focus:border-[#5E6AD2] transition-colors"
              >
                <option value="">Select a server...</option>
                {servers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Users className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
            {selectedServer && (
              <div className="flex gap-2 font-mono text-[10px] uppercase tracking-wider">
                <span className="px-2.5 py-1.5 bg-[rgba(34,197,94,0.1)] text-[#22c55e]">
                  {onlineCount} online
                </span>
                {bannedCount > 0 && (
                  <span className="px-2.5 py-1.5 bg-[rgba(239,68,68,0.1)] text-[#ef4444]">
                    {bannedCount} banned
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Search + filters */}
          {selectedServer && players !== undefined && (
            <>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or ID..."
                    className="w-full pl-9 pr-4 py-2 bg-transparent border border-white/10 text-sm text-white font-sans placeholder:text-white/25 focus:outline-none focus:border-[#5E6AD2] transition-colors"
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'online', 'banned'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterBanned(f)}
                      className={`font-mono text-[10px] uppercase tracking-wider px-3 py-2 transition-colors ${
                        filterBanned === f
                          ? 'bg-[rgba(94,106,210,0.15)] text-[#5E6AD2]'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player list */}
              {loadingPlayers ? (
                <div className="space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#16161E] px-5 py-3.5 flex items-center gap-4">
                      <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-32 h-3 bg-white/5 rounded animate-pulse" />
                        <div className="w-24 h-2.5 bg-white/3 rounded animate-pulse" />
                      </div>
                      <div className="w-16 h-7 bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-[#16161E]">
                  <Users className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
                    {search ? 'No matches' : 'No players yet'}
                  </h3>
                  <p className="font-sans text-xs text-white/40">
                    {search ? 'Try a different search term' : 'Players will appear when someone joins the server'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((player: any) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      onBan={() => handleBan(player.id, player.name)}
                      onUnban={() => handleUnban(player.id, player.name)}
                      banning={banning === player.id}
                      banReason={banReasons[player.id] ?? ''}
                      onBanReasonChange={(v) => setBanReasons((prev) => ({ ...prev, [player.id]: v }))}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!selectedServer && !loadingServers && serversError && (
            <div className="text-center py-16 bg-[#16161E]">
              <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white/60 mb-2">Failed to load servers</h3>
              <p className="font-sans text-xs text-white/40 mb-4">Check your connection and try again</p>
              <button
                onClick={() => mutateServers()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!selectedServer && !loadingServers && !serversError && (
            <div className="text-center py-20 bg-[#16161E]">
              <Users className="w-12 h-12 text-white/15 mx-auto mb-4" />
              <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">Select a server</h3>
              <p className="font-sans text-xs text-white/40 max-w-sm mx-auto leading-[1.6]">
                Choose a server to view and manage its players.
              </p>
            </div>
          )}

          {loadingServers && (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-[#16161E] px-5 py-3.5 flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-3 bg-white/5 rounded animate-pulse" />
                    <div className="w-24 h-2.5 bg-white/3 rounded animate-pulse" />
                  </div>
                  <div className="w-16 h-7 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {selectedServer && !loadingPlayers && !players && (
            <div className="text-center py-16 bg-[#16161E]">
              <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <h3 className="font-mono text-sm text-white/60 mb-2">Failed to load players</h3>
              <p className="font-sans text-xs text-white/40 mb-4">Check your connection and try again</p>
              <button
                onClick={() => mutate()}
                className="flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors"
              >
                <span className="w-3.5 h-3.5">↻</span>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function PlayerRow({
  player,
  onBan,
  onUnban,
  banning,
  banReason,
  onBanReasonChange,
}: {
  player: any;
  onBan: () => void;
  onUnban: () => void;
  banning: boolean;
  banReason: string;
  onBanReasonChange: (v: string) => void;
}) {
  const [showReason, setShowReason] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#16161E] transition-colors duration-100 ${
        player.isBanned
          ? 'border-l-2 border-l-[#ef4444]'
          : 'border-l-2 border-l-[rgba(94,106,210,0.5)] hover:border-l-[#5E6AD2]'
      }`}
    >
      <div className="flex items-center gap-4 px-5 py-3.5">
        {/* Avatar */}
        <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
          player.isBanned
            ? 'bg-[rgba(239,68,68,0.1)]'
            : 'bg-[rgba(255,255,255,0.04)]'
        }`}>
          {player.isBanned ? (
            <UserX className="w-4 h-4 text-[#ef4444]" />
          ) : (
            <Users className="w-4 h-4 text-white/50" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-white">
              {player.name}
            </span>
            {player.isBanned && (
              <span className="px-1.5 py-0.5 bg-[rgba(239,68,68,0.1)] text-[#ef4444] font-mono text-[9px] uppercase">
                Banned
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-white/30 truncate mt-0.5">
            {player.playerId || player.identifier}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {player.isBanned ? (
            <button
              onClick={onUnban}
              disabled={banning}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <ShieldOff className="w-3 h-3" />
              <span>Unban</span>
            </button>
          ) : (
            <button
              onClick={() => setShowReason(!showReason)}
              disabled={banning}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50"
            >
              <Ban className="w-3 h-3" />
              <span>Ban</span>
            </button>
          )}
        </div>
      </div>

      {/* Ban reason input */}
      {showReason && (
        <div className="px-5 pb-3 pt-1">
          <input
            type="text"
            value={banReason}
            onChange={(e) => onBanReasonChange(e.target.value)}
            placeholder="Reason for ban..."
            className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white font-mono text-xs placeholder:text-white/20 focus:outline-none focus:border-[#ef4444]"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { onBan(); setShowReason(false); }}
              disabled={banning}
              className="px-3 py-1.5 bg-[#ef4444] text-white font-mono text-[10px] uppercase tracking-wider hover:bg-[#dc2626] transition-colors disabled:opacity-50"
            >
              {banning ? 'Banning...' : 'Confirm Ban'}
            </button>
            <button
              onClick={() => setShowReason(false)}
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}