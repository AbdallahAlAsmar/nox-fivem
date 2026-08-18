'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Users, Search, Shield, ShieldOff, AlertCircle, Ban, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchServers } from '@/lib/api';
import { fetchPlayers, banPlayer, unbanPlayer } from '@/lib/api';

export default function PlayersPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filterBanned, setFilterBanned] = useState<'all' | 'online' | 'banned'>('all');
  const [banning, setBanning] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const { data: servers, isLoading: loadingServers } = useSWR('servers', fetchServers, {
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
      await banPlayer(selectedServer, playerId, banReason || `Banned by admin`);
      setToast(`Banned ${name}`);
      mutate();
    } catch {
      setToast('Failed to ban player');
    }
    setBanning(null);
    setBanReason('');
    setTimeout(() => setToast(null), 3000);
  };

  const handleUnban = async (playerId: string, name: string) => {
    if (!selectedServer) return;
    try {
      await unbanPlayer(selectedServer, playerId);
      setToast(`Unbanned ${name}`);
      mutate();
    } catch {
      setToast('Failed to unban player');
    }
    setTimeout(() => setToast(null), 3000);
  };

  const onlineCount = (players ?? []).filter((p: any) => !p.isBanned).length;
  const bannedCount = (players ?? []).filter((p: any) => p.isBanned).length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
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

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Players</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Manage online players and bans across your servers
          </p>
        </div>

        {/* Server selector */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <select
              value={selectedServer}
              onChange={(e) => { setSelectedServer(e.target.value); setSearch(''); setFilterBanned('all'); }}
              className="w-full appearance-none bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
            >
              <option value="">Select a server…</option>
              {servers?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Users className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)] pointer-events-none" />
          </div>
          {selectedServer && (
            <div className="flex gap-2 font-mono text-[10px] uppercase tracking-wider">
              <span className="px-2.5 py-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22c55e]">
                {onlineCount} online
              </span>
              {bannedCount > 0 && (
                <span className="px-2.5 py-1.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444]">
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(255,255,255,0.3)] pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or ID…"
                  className="w-full pl-9 pr-4 py-2 bg-transparent border border-[rgba(255,255,255,0.08)] text-sm text-white font-sans placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'online', 'banned'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterBanned(f)}
                    className={`font-mono text-[10px] uppercase tracking-wider px-3 py-2 border transition-colors duration-100 ${
                      filterBanned === f
                        ? 'bg-[rgba(94,106,210,0.15)] border-[rgba(94,106,210,0.4)] text-[#5E6AD2]'
                        : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] hover:text-white hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Player list */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
                <Users className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
                <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
                  {search ? 'No matches' : 'No players yet'}
                </h3>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
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
                    banReason={banReason}
                    onBanReasonChange={(v) => setBanReason(v)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!selectedServer && !loadingServers && (
          <div className="text-center py-20 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
            <Users className="w-12 h-12 text-[rgba(255,255,255,0.15)] mx-auto mb-4" />
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">Select a server</h3>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] max-w-sm mx-auto leading-[1.6]">
              Choose a server to view and manage its players.
            </p>
          </div>
        )}

        {loadingServers && (
          <div className="text-center py-8 font-mono text-xs text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
            Loading servers…
          </div>
        )}
      </div>
    </div>
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
      className={`bg-[#16161E] border transition-colors duration-100 ${
        player.isBanned
          ? 'border-[rgba(239,68,68,0.2)]'
          : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'
      }`}
    >
      <div className="flex items-center gap-4 px-5 py-3.5">
        {/* Avatar */}
        <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
          player.isBanned
            ? 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]'
            : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]'
        }`}>
          {player.isBanned ? (
            <UserX className="w-4 h-4 text-[#ef4444]" />
          ) : (
            <Users className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-white">
              {player.name}
            </span>
            {player.isBanned && (
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444]">
                Banned
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] truncate mt-0.5">
            {player.playerId}
            {player.license && <span className="ml-2">· {player.license}</span>}
          </div>
          {player.banReason && (
            <p className="font-sans text-[11px] text-[rgba(239,68,68,0.6)] mt-0.5">
              {player.banReason}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {player.isBanned ? (
            <button
              onClick={onUnban}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#22c55e] border border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.1)] transition-colors duration-100"
            >
              <ShieldOff className="w-3 h-3" />
              Unban
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowReason(!showReason)}
                className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.08)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors duration-100"
              >
                Ban
              </button>
              {showReason && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => onBanReasonChange(e.target.value)}
                    placeholder="Reason…"
                    className="w-28 px-2 py-1.5 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] text-white font-mono text-[11px] placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                  />
                  <button
                    onClick={onBan}
                    disabled={banning}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-50 transition-colors duration-100"
                  >
                    {banning ? <span className="animate-spin">↻</span> : <Ban className="w-3 h-3" />}
                    Confirm
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
