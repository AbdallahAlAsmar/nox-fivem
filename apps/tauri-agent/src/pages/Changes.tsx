import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileDiff, RotateCcw, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, GitCommit, GitBranch,
  Eye, EyeOff, ArrowLeft, Loader2, Split
} from 'lucide-react'
import * as api from '../api'

interface Change {
  id: string
  file: string
  diff: string
  status: 'pending' | 'applied' | 'failed' | 'rolled_back'
  timestamp: number
  commit?: string
}

/** Map a Prisma Change row (orchestrator shape) onto what this UI renders. */
function mapChange(c: any): Change {
  let file = ''
  const touched = Array.isArray(c.filesTouched) ? c.filesTouched : []
  if (touched.length > 0 && typeof touched[0] === 'string') file = touched[0]
  else if (typeof touched[0]?.path === 'string') file = touched[0].path
  return {
    id: c.id,
    file,
    diff: typeof c.diff === 'string' ? c.diff : '',
    status: (c.status || 'pending') as Change['status'],
    timestamp: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
    commit: c.gitCommitSha || undefined,
  }
}

export default function Changes({ serverId }: { serverId?: string }) {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per-change in-flight state so Apply/Discard buttons show progress and
  // cannot double-fire while a request is running.
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [applyingAll, setApplyingAll] = useState(false)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [showDiff, setShowDiff] = useState<Record<string, boolean>>({})
  const [timelineMode, setTimelineMode] = useState(false)
  // Latest serverId wins — guards against out-of-order refetches after a fast
  // server switch while a load is still in flight.
  const requestIdRef = useRef(0)

  const loadChanges = async () => {
    if (!serverId) {
      setChanges([])
      setLoading(false)
      return
    }
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const data = await api.fetchChanges(serverId)
      if (reqId !== requestIdRef.current) return
      setChanges((Array.isArray(data) ? data : []).map(mapChange))
    } catch (e) {
      if (reqId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to load changes')
      setChanges([])
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadChanges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId])

  const runOne = async (id: string, op: (cid: string) => Promise<any>, nextStatus: Change['status']) => {
    if (busyIds[id]) return
    setBusyIds(prev => ({ ...prev, [id]: true }))
    setError(null)
    try {
      await op(id)
      setChanges(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c))
    } catch (e) {
      setError(e instanceof Error ? e.message : `Action on ${id} failed`)
    } finally {
      setBusyIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleApply = (id: string) => runOne(id, api.applyChange.bind(api), 'applied')

  const handleDiscard = (id: string) => runOne(id, api.cancelChange.bind(api), 'rolled_back')

  const handleApplyAll = async () => {
    if (applyingAll) return
    setApplyingAll(true)
    setError(null)
    try {
      // Sequential applies; the ORCHESTRATOR drives the git checkpoint
      // (git.checkpoint) before each fs.applyPatch — the desktop just calls
      // the single-apply endpoint per change.
      const result = await api.applyAllChanges(serverId || '')
      if (result.applied.length > 0) {
        setChanges(prev =>
          prev.map(c =>
            result.applied.includes(c.id) ? { ...c, status: 'applied' as const } : c
          )
        )
      }
      if (result.failed.length > 0) {
        setError(
          `Applied ${result.applied.length}, failed ${result.failed.length}: ` +
          result.failed[0].error +
          (result.failed.length > 1 ? ` (+${result.failed.length - 1} more)` : '')
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply All failed')
    } finally {
      setApplyingAll(false)
    }
  }

  const toggleDiff = (id: string) => {
    setShowDiff(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const pendingChanges = changes.filter(c => c.status === 'pending')
  const appliedChanges = changes.filter(c => c.status === 'applied')
  const rolledBackChanges = changes.filter(c => c.status === 'rolled_back')

  if (timelineMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Git History</h2>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
              {changes.length} commits • {appliedChanges.length} applied
            </p>
          </div>
          <button
            onClick={() => setTimelineMode(false)}
            className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Changes
          </button>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.08)]" />
          <div className="space-y-4">
            {changes.map((change, i) => (
              <motion.div
                key={change.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-6 w-3 h-3 rounded-full border-2 ${
                  change.status === 'applied' ? 'bg-[#22c55e] border-[#22c55e]' :
                  change.status === 'rolled_back' ? 'bg-[rgba(255,255,255,0.2)] border-[rgba(255,255,255,0.3)]' :
                  'bg-[#3DFFA2] border-[#3DFFA2]'
                }`} />

                {/* Content */}
                <div className={`bg-nox-surface border p-4 ${
                  change.status === 'applied' ? 'border-[rgba(34,197,94,0.3)]' :
                  change.status === 'rolled_back' ? 'border-[rgba(255,255,255,0.06)] opacity-60' :
                  'border-[rgba(255,255,255,0.08)]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
                      <code className="font-mono text-xs text-[#3DFFA2]">{change.commit ? change.commit.slice(0, 7) : 'pending'}</code>
                      <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                        AI
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                      {new Date(change.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-white mb-2">{change.file}</p>
                  <button
                    onClick={() => toggleDiff(change.id)}
                    className="text-[rgba(255,255,255,0.4)] hover:text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1"
                  >
                    {showDiff[change.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showDiff[change.id] ? 'Hide diff' : 'View diff'}
                  </button>
                  <AnimatePresence>
                    {showDiff[change.id] && (
                      <motion.pre
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-xs text-[rgba(255,255,255,0.6)] bg-[#0A0A0F] p-3 mt-2 overflow-x-auto whitespace-pre"
                      >
                        {change.diff}
                      </motion.pre>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Changes</h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            {pendingChanges.length} pending • {appliedChanges.length} applied • {rolledBackChanges.length} discarded
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => setViewMode('unified')}
              className={`p-2 transition-colors duration-100 ${viewMode === 'unified' ? 'bg-[rgba(61,255,162,0.2)] text-[#3DFFA2]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
              title="Unified diff"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-2 transition-colors duration-100 ${viewMode === 'split' ? 'bg-[rgba(61,255,162,0.2)] text-[#3DFFA2]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
              title="Split diff"
            >
              <Split className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Toggle */}
          <button
            onClick={() => setTimelineMode(true)}
            className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
          >
            <GitBranch className="w-3 h-3" />
            Timeline
          </button>

          {/* Apply All */}
          {pendingChanges.length > 0 && (
            <button
              onClick={handleApplyAll}
              disabled={applyingAll}
              className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white bg-[#3DFFA2] hover:bg-[#36d98c] transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applyingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              {applyingAll ? 'Applying…' : 'Apply All'}
            </button>
          )}
        </div>
      </div>

      {/* Error banner — action/load failures are always visible, never silent */}
      {error && (
        <div className="flex items-start gap-2 p-3 border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] font-mono text-xs text-[#ef4444]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Pending Changes */}
      {pendingChanges.length === 0 && appliedChanges.length === 0 && rolledBackChanges.length === 0 ? (
        <div className="text-center py-20 bg-nox-surface border border-[rgba(255,255,255,0.08)]">
          <FileDiff className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
            {error ? 'Could not load changes' : 'No pending changes'}
          </h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
            {error ? 'Check the error above and retry' : 'AI changes will appear here for review'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending */}
          {pendingChanges.map((change, i) => (
            <motion.div
              key={change.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-nox-surface border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileDiff className="w-4 h-4 text-[#3DFFA2]" />
                    <code className="font-mono text-xs uppercase tracking-wider text-white">{change.file}</code>
                    {change.commit && (
                      <code className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">
                        {change.commit.slice(0, 7)}
                      </code>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </span>
                    <button onClick={() => toggleDiff(change.id)} className="text-[rgba(255,255,255,0.3)] hover:text-white">
                      {showDiff[change.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showDiff[change.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0 }}
                      className="overflow-x-auto"
                    >
                      <pre className="font-mono text-xs text-[rgba(255,255,255,0.7)] bg-[#0A0A0F] p-4 rounded border border-[rgba(255,255,255,0.06)]">
                        {viewMode === 'split' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[rgba(239,68,68,0.7)] mb-1">Original</p>
                              {change.diff.split('\n').filter(l => l.startsWith('-') || l.startsWith(' ')).map((l, i) => (
                                <div key={i} className={l.startsWith('-') ? 'text-[#ef4444]' : 'text-[rgba(255,255,255,0.4)]'}>{l}</div>
                              ))}
                            </div>
                            <div>
                              <p className="text-[rgba(34,197,94,0.7)] mb-1">Proposed</p>
                              {change.diff.split('\n').filter(l => l.startsWith('+') || l.startsWith(' ')).map((l, i) => (
                                <div key={i} className={l.startsWith('+') ? 'text-[#22c55e]' : 'text-[rgba(255,255,255,0.4)]'}>{l}</div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          change.diff
                        )}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApply(change.id)}
                    disabled={!!busyIds[change.id] || applyingAll}
                    className="flex items-center gap-1 px-4 py-2 font-mono text-xs uppercase tracking-[1.4px] bg-white text-[#0F0F14] font-medium hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-100"
                  >
                    {busyIds[change.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Apply
                  </button>
                  <button
                    onClick={() => handleDiscard(change.id)}
                    disabled={!!busyIds[change.id] || applyingAll}
                    className="flex items-center gap-1 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
                  >
                    {busyIds[change.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Discard
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Applied */}
          {appliedChanges.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">Applied</h3>
              {appliedChanges.map(change => (
                <div key={change.id} className="bg-nox-surface border border-[rgba(34,197,94,0.2)] p-3 mb-2 opacity-70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                    <code className="font-mono text-xs text-[rgba(255,255,255,0.6)]">{change.file}</code>
                    <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] ml-auto">
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rolled Back */}
          {rolledBackChanges.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-2">Discarded</h3>
              {rolledBackChanges.map(change => (
                <div key={change.id} className="bg-nox-surface border border-[rgba(255,255,255,0.04)] p-3 mb-2 opacity-50">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
                    <code className="font-mono text-xs text-[rgba(255,255,255,0.4)]">{change.file}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
