import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Ban, RefreshCw, User, Shield, AlertCircle, CheckCircle2, X, Calendar
} from 'lucide-react'
import * as api from '../api'

interface Player {
  id: string
  name: string
  identifier: string
  ping: number
  playtime: number
  permissions: string[]
  isBanned: boolean
  banReason?: string
  joinedAt: number
}

export default function Players({ serverId }: { serverId?: string }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'banned' | 'online'>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  // 'local' is not a real server ID — the orchestrator would 404 it. Guard so
  // the page shows its empty state instead of firing a doomed request.
  const effectiveServerId = serverId && serverId !== 'local' ? serverId : ''

  const loadPlayers = async () => {
    if (!effectiveServerId) {
      setPlayers([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.fetchPlayers(effectiveServerId)
      const mapped: Player[] = data.map((p: any) => ({
        id: p.id,
        name: p.name || p.identifier || 'Unknown',
        identifier: p.identifier || '',
        ping: p.ping || 0,
        playtime: p.playtime || 0,
        permissions: p.permissions || [],
        isBanned: p.isBanned || false,
        banReason: p.banReason,
        joinedAt: p.joinedAt ? new Date(p.joinedAt).getTime() : Date.now(),
      }))
      setPlayers(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load players')
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveServerId])

  // Close the ban modal with Escape.
  useEffect(() => {
    if (!showBanModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowBanModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showBanModal])

  const handleBan = (player: Player) => {
    setSelectedPlayer(player)
    setShowBanModal(true)
    setBanReason('')
  }

  const confirmBan = async () => {
    if (!selectedPlayer) return
    try {
      await api.banPlayer(effectiveServerId, selectedPlayer.id, banReason || 'No reason provided')
      setPlayers(prev =>
        prev.map(p =>
          p.id === selectedPlayer.id ? { ...p, isBanned: true, banReason: banReason || 'No reason provided' } : p
        )
      )
      setShowBanModal(false)
      setActionResult({ type: 'success', message: `${selectedPlayer.name} has been banned` })
    } catch (e) {
      setActionResult({
        type: 'error',
        message: e instanceof Error
          ? `Failed to ban ${selectedPlayer.name}: ${e.message}`
          : `Failed to ban ${selectedPlayer.name}`,
      })
    }
  }

  const handleUnban = async (player: Player) => {
    try {
      await api.unbanPlayer(effectiveServerId, player.id)
      setPlayers(prev =>
        prev.map(p => (p.id === player.id ? { ...p, isBanned: false, banReason: undefined } : p))
      )
      setActionResult({ type: 'success', message: `${player.name} has been unbanned` })
    } catch (e) {
      setActionResult({
        type: 'error',
        message: e instanceof Error ? `Failed to unban ${player.name}: ${e.message}` : `Failed to unban ${player.name}`,
      })
    }
  }

  const filteredPlayers = players.filter(p => {
    if (filter === 'banned') return p.isBanned
    if (filter === 'online') return !p.isBanned
    return true
  }).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.identifier.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Players</h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            {filteredPlayers.filter(p => !p.isBanned).length} online • {filteredPlayers.filter(p => p.isBanned).length} banned
          </p>
        </div>
        <button
          onClick={loadPlayers}
          className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 pr-4 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
          />
        </div>

        <div className="flex border border-[rgba(255,255,255,0.08)]">
          {(['all', 'online', 'banned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                filter === f
                  ? 'bg-[rgba(94,106,210,0.2)] text-[#5E6AD2]'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Result Toast */}
      <AnimatePresence>
        {actionResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 font-mono text-xs border flex items-center gap-2 ${
              actionResult.type === 'success'
                ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)] text-[#22c55e]'
                : 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] text-[#ef4444]'
            }`}
          >
            {actionResult.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {actionResult.message}
            <button onClick={() => setActionResult(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load error — distinct from the empty state so failures are visible */}
      {!loading && error && (
        <div className="flex items-center gap-2 p-3 border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] font-mono text-xs text-[#ef4444]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={loadPlayers} className="underline opacity-80 hover:opacity-100">Retry</button>
        </div>
      )}

      {/* No server selected hint */}
      {!loading && !effectiveServerId && !error && (
        <div className="flex items-center gap-2 p-3 border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)] font-mono text-xs text-[#f59e0b]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Select a connected server to view its players.
        </div>
      )}

      {/* Player List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Loading players…</p>
        </div>
      ) : !error && effectiveServerId && filteredPlayers.length === 0 ? (
        <div className="text-center py-20 bg-nox-surface border border-[rgba(255,255,255,0.08)] border-dashed">
          <Users className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No players found</h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">No players match your criteria</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-nox-surface border p-4 flex items-center gap-4 ${
                player.isBanned
                  ? 'border-[rgba(239,68,68,0.2)]'
                  : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'
              } transition-colors duration-100`}
            >
              <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${
                player.isBanned ? 'bg-[rgba(239,68,68,0.15)]' : 'bg-[rgba(94,106,210,0.15)]'
              }`}>
                <User className={`w-5 h-5 ${player.isBanned ? 'text-[#ef4444]' : 'text-[#5E6AD2]'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-white">{player.name}</span>
                  {player.isBanned && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-2 py-0.5">
                      Banned
                    </span>
                  )}
                  {player.permissions.includes('moderator') && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#5E6AD2] bg-[rgba(94,106,210,0.1)] px-2 py-0.5 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Mod
                    </span>
                  )}
                </div>
                <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] truncate">{player.identifier}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">{player.ping}ms</span>
                  <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                    {Math.floor(player.playtime / 60)}h played
                  </span>
                  <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(player.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {player.isBanned ? (
                  <button onClick={() => handleUnban(player)} className="p-2 text-[rgba(34,197,94,0.6)] hover:text-[#22c55e] transition-colors" title="Unban player">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => handleBan(player)} className="p-2 text-[rgba(239,68,68,0.6)] hover:text-[#ef4444] transition-colors" title="Ban player">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ban Modal */}
      <AnimatePresence>
        {showBanModal && selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F0F14]/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white">Ban Player</h3>
                <button onClick={() => setShowBanModal(false)} className="text-[rgba(255,255,255,0.4)] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center">
                    <User className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-white">{selectedPlayer.name}</p>
                    <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">{selectedPlayer.identifier}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
                    Ban Reason
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Reason for banning..."
                    className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#ef4444] transition-colors duration-100 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white transition-colors duration-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBan}
                  className="px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] bg-[#ef4444] text-white font-medium hover:bg-[#dc2626] transition-colors duration-100"
                >
                  Ban Player
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
