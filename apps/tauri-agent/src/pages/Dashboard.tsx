'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
  Settings,
  MoreHorizontal,
  Play,
  Square,
  FolderOpen,
  Bot,
  Brain,
  Code2,
  Terminal,
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  Bell,
  User,
  LogOut,
  Package,
  Users as UsersIcon,
  CreditCard,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const ORC = 'http://localhost:3001'

interface Server {
  id: string
  name: string
  directory?: string
  framework?: string
  status: 'online' | 'offline' | 'connecting'
  hasAgent: boolean
  resourceCount: number
  playerCount: number
  maxPlayers: number
  fps: number
  lastSeenAt?: string
}

interface Change {
  id: string
  serverId: string
  serverName: string
  file: string
  diff: string
  status: 'pending' | 'applied' | 'rejected'
  createdAt: string
}

interface ActivityItem {
  id: string
  type: 'change' | 'scan' | 'heartbeat'
  message: string
  serverName: string
  timestamp: number
}

function timeAgo(date: string | number): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: any
  color: string
  sub?: string
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
  )
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const iconMap = {
    change: FileDiff,
    scan: RefreshCw,
    heartbeat: Activity,
  }
  const colorMap: Record<string, string> = {
    change: 'text-[#5E6AD2]',
    scan: 'text-[#22c55e]',
    heartbeat: 'text-[rgba(255,255,255,0.5)]',
  }
  const Icon = iconMap[item.type] || Activity
  const color = colorMap[item.type] || 'text-[rgba(255,255,255,0.4)]'

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
  )
}

function ServerCard({
  server,
  onScan,
  onStart,
  onStop,
}: {
  server: Server
  onScan: (id: string) => void
  onStart: (s: Server) => void
  onStop: (s: Server) => void
}) {
  const [scanning, setScanning] = useState(false)

  const handleScan = async () => {
    setScanning(true)
    try {
      await onScan(server.id)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="group bg-[#16161E] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100">
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
          <h3 className="font-mono text-xs uppercase tracking-wider truncate text-white">
            {server.name}
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 flex-shrink-0 ml-2">
          {server.framework?.toUpperCase() || 'UNKNOWN'}
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
              {server.playerCount}
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
              {server.status === 'online' ? server.fps : '—'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FileDiff className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                Resources
              </span>
            </div>
            <div className="font-mono text-sm text-white">{server.resourceCount}</div>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-5 pb-3 flex items-center gap-4 font-mono text-xs text-[rgba(255,255,255,0.4)]">
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
          onClick={() => handleScan()}
          disabled={scanning || server.status !== 'online'}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed border-r border-[rgba(255,255,255,0.06)]"
        >
          <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          Scan
        </button>
        <button
          onClick={() => server.status === 'online' ? onStop(server) : onStart(server)}
          disabled={server.status === 'connecting'}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed border-r border-[rgba(255,255,255,0.06)]"
        >
          {server.status === 'online' ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {server.status === 'online' ? 'Stop' : 'Start'}
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <Terminal className="w-3 h-3" />
          Console
        </button>
      </div>
    </div>
  )
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
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
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
      <button
        onClick={onAdd}
        className="font-mono text-xs uppercase tracking-[1.4px] px-5 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 inline-flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Your First Server
      </button>
    </div>
  )
}

interface DashboardProps {
  onNavigate: (page: string) => void
  onServerSelect: (serverId: string) => void
}

export default function Dashboard({ onNavigate, onServerSelect }: DashboardProps) {
  const [servers, setServers] = useState<Server[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerDir, setNewServerDir] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [inspectResult, setInspectResult] = useState<{ hasServerCfg: boolean; hasResources: boolean; frameworkHint?: string; error?: string } | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${ORC}/api/servers`)
      if (!res.ok) throw new Error('Failed to fetch servers')
      const data = await res.json()
      setServers(data.servers || data)
      setError(null)
    } catch (e) {
      console.error('Fetch servers error:', e)
      setError('Failed to connect to orchestrator')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch(`${ORC}/api/changes`)
      if (!res.ok) throw new Error('Failed to fetch changes')
      const data = await res.json()
      setChanges(data.changes || data)
    } catch (e) {
      console.error('Fetch changes error:', e)
    }
  }, [])

  useEffect(() => {
    fetchServers()
    fetchChanges()
    const interval = setInterval(() => {
      fetchServers()
      fetchChanges()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchServers, fetchChanges])

  const handleAddServer = async () => {
    if (!newServerName.trim() || !newServerDir.trim()) return
    if (!inspectResult?.hasServerCfg) {
      setCreateError('server.cfg not found in the selected folder. Please select a valid FiveM server-data directory.')
      return
    }
    setIsCreating(true)
    setCreateError(null)
    try {
      const res = await fetch(`${ORC}/api/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServerName,
          directory: newServerDir,
          framework: inspectResult.frameworkHint?.toLowerCase() || 'fxserver',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create server')
      }
      const data = await res.json()
      setToast(`Server "${newServerName}" created successfully!`)
      setNewServerName('')
      setNewServerDir('')
      setInspectResult(null)
      setShowAddModal(false)
      await fetchServers()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create server')
    } finally {
      setIsCreating(false)
    }
  }

  const handlePickDirectoryFromModal = async () => {
    try {
      const result = await invoke('open_folder_cmd') as string
      if (result && result.length > 0) {
        setNewServerDir(result)
        setInspectResult(null)
        // Inspect the directory automatically
        setIsInspecting(true)
        try {
          const inspect = await invoke<{ has_server_cfg: boolean; has_resources_folder: boolean; framework_hint: string | null; error: string | null }>('inspect_server_dir', { path: result })
          setInspectResult({
            hasServerCfg: inspect.has_server_cfg,
            hasResources: inspect.has_resources_folder,
            frameworkHint: inspect.framework_hint ?? undefined,
            error: inspect.error ?? undefined,
          })
        } catch (e) {
          setInspectResult({ hasServerCfg: false, hasResources: false, error: String(e) })
        } finally {
          setIsInspecting(false)
        }
        setToast('Folder selected')
      } else {
        setToast('No folder selected')
      }
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.log('Could not open folder:', e)
      setToast('Could not open folder dialog')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleStartServer = async (server: Server) => {
    try {
      const res = await fetch(`${ORC}/api/servers/${server.id}/start`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start server')
      setToast(`Starting ${server.name}...`)
      setTimeout(() => setToast(null), 3000)
      await fetchServers()
    } catch (e) {
      setToast('Failed to start server')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleStopServer = async (server: Server) => {
    try {
      const res = await fetch(`${ORC}/api/servers/${server.id}/stop`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to stop server')
      setToast(`Stopping ${server.name}...`)
      setTimeout(() => setToast(null), 3000)
      await fetchServers()
    } catch (e) {
      setToast('Failed to stop server')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const displayServers = servers
  const hasError = !!error
  const allChanges = changes

  const totalServers = displayServers.length
  const onlineServers = displayServers.filter((s) => s.status === 'online' && s.hasAgent).length
  const pendingChanges = allChanges.filter((c: Change) => c.status === 'pending').length

  const activityItems: ActivityItem[] = [
    ...allChanges.filter((c: Change) => c.status === 'pending').slice(0, 5).map((c: Change) => ({
      id: `change_${c.id}`, type: 'change' as const, message: `AI proposed change to ${c.file}`,
      serverName: c.serverName || 'Unknown', timestamp: new Date(c.createdAt).getTime(),
    })),
    ...allChanges.filter((c: Change) => c.status === 'applied').slice(0, 3).map((c: Change) => ({
      id: `applied_${c.id}`, type: 'change' as const, message: `Applied change to ${c.file}`,
      serverName: c.serverName || 'Unknown', timestamp: new Date(c.createdAt).getTime(),
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)

  if (activityItems.length < 3) {
    displayServers.filter((s) => s.status === 'online' && s.hasAgent).slice(0, 3).forEach((s) => {
      activityItems.push({
        id: `heartbeat_${s.id}`, type: 'scan' as const,
        message: `${s.name} heartbeat received`, serverName: s.name,
        timestamp: s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : Date.now() - 60000,
      })
    })
  }

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
            {loading
              ? 'loading…'
              : `${displayServers.length} server${displayServers.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
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
              value={allChanges.filter((c) => new Date(c.createdAt).toDateString() === new Date().toDateString()).length}
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

        {/* Activity Feed */}
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">
              Your Servers
            </h1>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
              Manage and chat with your FiveM servers
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="font-mono text-xs uppercase tracking-[1.4px] px-4 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Server
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServerCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {hasError && !loading && (
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
            <button
              onClick={fetchServers}
              className="ml-auto font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-[rgba(239,68,68,0.3)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !hasError && displayServers.length === 0 && (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        )}

        {/* Server Grid */}
        {!loading && displayServers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {displayServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onScan={async (id) => {
                  try {
                    await fetch(`${ORC}/api/servers/${id}/scan`, { method: 'POST' })
                    await fetchServers()
                  } catch (e) {
                    setToast('Scan failed')
                    setTimeout(() => setToast(null), 3000)
                  }
                }}
                onStart={handleStartServer}
                onStop={handleStopServer}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Add New Server</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="My FiveM Server"
                  className="w-full px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-white font-mono text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
                  Server Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newServerDir}
                    onChange={(e) => { setNewServerDir(e.target.value); setInspectResult(null) }}
                    placeholder="C:/FXServer/server-data"
                    className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-white font-mono text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                  />
                  <button
                    onClick={handlePickDirectoryFromModal}
                    className="px-4 py-2.5 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:text-white font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Browse
                  </button>
                </div>

                {isInspecting && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mt-1.5">Inspecting folder…</p>
                )}

                {inspectResult && !isInspecting && (
                  <div className={`mt-2 p-2.5 border ${
                    inspectResult.hasServerCfg
                      ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)]'
                      : 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {inspectResult.hasServerCfg
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                        : <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />
                      }
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${
                        inspectResult.hasServerCfg ? 'text-[#22c55e]' : 'text-[#ef4444]'
                      }`}>
                        {inspectResult.hasServerCfg ? 'Valid FiveM server' : 'Invalid server folder'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">
                        {inspectResult.hasServerCfg ? '✓' : '✗'} server.cfg {inspectResult.hasServerCfg ? 'found' : 'not found'}
                      </p>
                      <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">
                        {inspectResult.hasResources ? '✓' : '✗'} resources/ {inspectResult.hasResources ? 'found' : 'not found'}
                      </p>
                      {inspectResult.frameworkHint && (
                        <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">
                          Framework: {inspectResult.frameworkHint}
                        </p>
                      )}
                      {inspectResult.error && !inspectResult.hasServerCfg && (
                        <p className="font-mono text-[10px] text-[#ef4444] mt-1">{inspectResult.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {createError && (
                <p className="font-mono text-xs text-[#ef4444]">{createError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:text-white hover:border-[rgba(255,255,255,0.2)] font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddServer}
                disabled={isCreating || !newServerName.trim() || !newServerDir.trim() || !inspectResult?.hasServerCfg}
                className="flex-1 px-4 py-2.5 bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-wider font-medium hover:opacity-85 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating…' : 'Create Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
