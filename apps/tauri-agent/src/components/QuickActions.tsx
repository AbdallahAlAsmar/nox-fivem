import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, Terminal, Users,
  Ban, RefreshCw, AlertCircle, CheckCircle2,
  X, Eye, MessageSquare
} from 'lucide-react'
import * as api from '../api'

interface QuickAction {
  id: string
  label: string
  icon: React.ElementType
  action: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'success'
}

interface QuickActionsProps {
  serverId: string
  serverName: string
  isOpen: boolean
  onToggle: () => void
}

export default function QuickActions({ serverId, serverName, isOpen, onToggle }: QuickActionsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [players, setPlayers] = useState<{ id: string; name: string; identifier: string; ping: number }[]>([])
  const [showPlayers, setShowPlayers] = useState(false)

  const executeAction = async (id: string, label: string, action: () => void | Promise<void>) => {
    setActiveAction(id)
    setResult(null)
    try {
      await action()
      if (id !== 'players' && id !== 'console') {
        setResult({ type: 'success', message: `${label} executed` })
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setResult({ type: 'error', message: `${label} failed: ${detail}` })
    } finally {
      setActiveAction(null)
    }
  }

  // 'local' is a UI placeholder, not a real orchestrator server ID.
  const realServerId = serverId && serverId !== 'local' ? serverId : ''

  const actions: QuickAction[] = [
    {
      id: 'restart',
      label: 'Restart Server',
      icon: RotateCcw,
      disabled: !realServerId,
      action: async () => {
        if (!realServerId) throw new Error('select a connected server first')
        await api.restartServer(realServerId)
      },
      variant: 'default',
    },
    {
      id: 'scan',
      label: 'Scan Resources',
      icon: RefreshCw,
      disabled: !realServerId,
      action: async () => {
        if (!realServerId) throw new Error('select a connected server first')
        await api.scanServerResources(realServerId)
      },
      variant: 'default',
    },
    {
      id: 'players',
      label: 'View Players',
      icon: Users,
      disabled: !realServerId,
      action: () => setShowPlayers(!showPlayers),
      variant: 'default',
    },
    {
      id: 'console',
      label: 'Tail Console',
      icon: Terminal,
      action: () => {
        setResult({ type: 'info', message: 'Console viewer opened' })
      },
      variant: 'default',
    },
    {
      id: 'status',
      label: 'Server Status',
      icon: Eye,
      disabled: !realServerId,
      action: async () => {
        if (!realServerId) throw new Error('select a connected server first')
        const data = await api.fetchServerDetail(realServerId)
        setResult({ type: 'info', message: `Status: ${data.status} | Framework: ${data.framework}` })
      },
      variant: 'default',
    },
    {
      id: 'ban',
      label: 'Ban Player',
      icon: Ban,
      disabled: !realServerId,
      action: async () => {
        if (!realServerId) throw new Error('select a connected server first')
        const playerId = prompt('Enter player identifier:')
        if (playerId) {
          await api.banPlayer(realServerId, playerId, 'Banned via NOX quick action')
          setResult({ type: 'success', message: `Player ${playerId} banned` })
        }
      },
      variant: 'danger',
    },
  ]

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center px-2 py-3 font-mono text-xs uppercase tracking-wider transition-all duration-100 border-l ${
          isOpen
            ? 'bg-[#16161E] text-white border-[rgba(255,255,255,0.08)]'
            : 'bg-[#5E6AD2] text-[#0F0F14] border-transparent hover:bg-[#4a55b0]'
        }`}
        style={{ borderRadius: '4px 0 0 4px' }}
      >
        {isOpen ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-full w-72 bg-[#111118] border-l border-[rgba(255,255,255,0.08)] z-30 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Quick Actions</h3>
                <button onClick={onToggle} className="text-[rgba(255,255,255,0.3)] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] truncate">{serverName}</p>
            </div>

            {/* Actions */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {actions.map(action => {
                const Icon = action.icon
                const isExecuting = activeAction === action.id
                const variantClass = {
                  default: 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]',
                  danger: 'border-[rgba(239,68,68,0.2)] text-[rgba(239,68,68,0.8)] hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.05)]',
                  success: 'border-[rgba(34,197,94,0.2)] text-[rgba(34,197,94,0.8)] hover:border-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.05)]',
                }[action.variant || 'default']

                return (
                  <button
                    key={action.id}
                    onClick={() => executeAction(action.id, action.label, action.action)}
                    disabled={isExecuting || action.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-all duration-100 border ${variantClass} ${
                      isExecuting ? 'opacity-50' : ''
                    }`}
                  >
                    {isExecuting ? (
                      <RotateCcw className="w-4 h-4 animate-spin flex-shrink-0" />
                    ) : (
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-left">{action.label}</span>
                    {action.variant === 'danger' && (
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    )}
                  </button>
                )
              })}

              {/* Divider */}
              <div className="border-t border-[rgba(255,255,255,0.06)] my-3" />

              {/* Player List (if opened) */}
              {showPlayers && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded overflow-hidden"
                >
                  <div className="p-2 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
                      Online Players ({players.length})
                    </span>
                    <button
                      onClick={() => {
                        api.fetchPlayers(realServerId)
                          .then(setPlayers)
                          .catch(e => setResult({ type: 'error', message: `Failed to load players: ${e instanceof Error ? e.message : e}` }))
                      }}
                      className="text-[rgba(255,255,255,0.3)] hover:text-white"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {players.length === 0 ? (
                      <p className="p-3 text-xs text-[rgba(255,255,255,0.3)] text-center font-mono">No players online</p>
                    ) : (
                      players.map(player => (
                        <div key={player.id} className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-white truncate">{player.name}</p>
                            <p className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] truncate">{player.identifier}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">{player.ping}ms</span>
                            <button className="text-[rgba(239,68,68,0.6)] hover:text-[rgba(239,68,68,1)]">
                              <Ban className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* Result Toast */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-3 p-3 font-mono text-xs border ${
                      result.type === 'success' ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)] text-[#22c55e]' :
                      result.type === 'error' ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] text-[#ef4444]' :
                      'border-[rgba(94,106,210,0.3)] bg-[rgba(94,106,210,0.05)] text-[#5E6AD2]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
                       result.type === 'error' ? <AlertCircle className="w-3 h-3" /> :
                       <MessageSquare className="w-3 h-3" />}
                      {result.message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <p className="pt-3 font-mono text-[10px] text-[rgba(255,255,255,0.2)] text-center uppercase tracking-wider">
                {serverId.slice(0, 8)}...
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
