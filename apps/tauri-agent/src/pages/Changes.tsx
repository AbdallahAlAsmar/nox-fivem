import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileDiff, RotateCcw, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, GitCommit, GitBranch,
  Eye, EyeOff, ArrowLeft, ArrowRight, Split
} from 'lucide-react'

interface Change {
  id: string
  file: string
  diff: string
  status: 'pending' | 'applied' | 'rolled_back'
  timestamp: number
  commit?: string
  author?: string
}

export default function Changes({ serverId }: { serverId?: string }) {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [showDiff, setShowDiff] = useState<Record<string, boolean>>({})
  const [timelineMode, setTimelineMode] = useState(false)

  useEffect(() => {
    if (!serverId) {
      setChanges([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`${import.meta.env?.VITE_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'}/api/servers/${serverId}/changes`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const mapped: Change[] = data.map((c: any) => ({
          id: c.id,
          file: c.file,
          diff: c.diff || '',
          status: c.status as 'pending' | 'applied' | 'rolled_back',
          timestamp: c.timestamp || Date.now(),
          commit: c.commit,
          author: c.author,
        }))
        setChanges(mapped)
      })
      .catch(() => setChanges([]))
      .finally(() => setLoading(false))
  }, [serverId])

  const handleApply = (id: string) => {
    setChanges(prev => prev.map(c => c.id === id ? { ...c, status: 'applied' } : c))
  }

  const handleRollback = (id: string) => {
    setChanges(prev => prev.map(c => c.id === id ? { ...c, status: 'rolled_back' } : c))
  }

  const handleApplyAll = () => {
    setChanges(prev => prev.map(c => c.status === 'pending' ? { ...c, status: 'applied' } : c))
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
                  'bg-[#5E6AD2] border-[#5E6AD2]'
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
                      <code className="font-mono text-xs text-[#5E6AD2]">{change.commit || 'unknown'}</code>
                      <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                        {change.author || 'AI'}
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
              className={`p-2 transition-colors duration-100 ${viewMode === 'unified' ? 'bg-[rgba(94,106,210,0.2)] text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
              title="Unified diff"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-2 transition-colors duration-100 ${viewMode === 'split' ? 'bg-[rgba(94,106,210,0.2)] text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
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
              className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white bg-[#5E6AD2] hover:bg-[#4a55b0] transition-colors duration-100"
            >
              <CheckCircle2 className="w-3 h-3" />
              Apply All
            </button>
          )}
        </div>
      </div>

      {/* Pending Changes */}
      {pendingChanges.length === 0 && appliedChanges.length === 0 && rolledBackChanges.length === 0 ? (
        <div className="text-center py-20 bg-nox-surface border border-[rgba(255,255,255,0.08)]">
          <FileDiff className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No pending changes</h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">AI changes will appear here for review</p>
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
                    <FileDiff className="w-4 h-4 text-[#5E6AD2]" />
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
                    className="flex items-center gap-1 px-4 py-2 font-mono text-xs uppercase tracking-[1.4px] bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Apply
                  </button>
                  <button
                    onClick={() => handleRollback(change.id)}
                    className="flex items-center gap-1 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
                  >
                    <RotateCcw className="w-3 h-3" />
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
