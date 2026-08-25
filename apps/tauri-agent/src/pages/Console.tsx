import { useState, useEffect, useRef } from 'react'
import { RefreshCw, AlertCircle, Play, Pause } from 'lucide-react'
import { fetchConsoleLines } from '../api'

interface ConsoleProps {
  serverId?: string
}

export default function Console({ serverId }: ConsoleProps) {
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [paused, setPaused] = useState(false)
  // Mirror of `paused` for the polling interval, which would otherwise capture
  // a stale closure value from when it started.
  const pausedRef = useRef(paused)
  const bottomRef = useRef<HTMLDivElement>(null)

  const togglePaused = () => {
    setPaused(prev => {
      pausedRef.current = !prev
      return !prev
    })
  }

  useEffect(() => {
    if (autoScroll && !paused && lines.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines, autoScroll, paused])

  const fetchConsole = async () => {
    if (!serverId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchConsoleLines(serverId)
      if (data?.result?.lines) {
        setLines(String(data.result.lines).split('\n').filter(Boolean))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load console')
    } finally {
      setLoading(false)
    }
  }

  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = () => {
    if (pollInterval.current) return
    pollInterval.current = setInterval(() => {
      // Read the ref, not the captured state.
      if (!pausedRef.current) fetchConsole()
    }, 2000)
  }

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }
  }

  useEffect(() => {
    startPolling()
    return stopPolling
  }, [serverId])

  if (!serverId) {
    return (
      <div className="flex items-center justify-center h-64 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
        No server selected
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Console</h2>
          <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 font-mono text-xs uppercase tracking-wider transition-colors border ${
              autoScroll
                ? 'border-[rgba(94,106,210,0.4)] bg-[rgba(94,106,210,0.1)] text-[#5E6AD2]'
                : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] hover:text-white'
            }`}
          >
            {autoScroll ? 'Auto' : 'Locked'}
          </button>
          <button
            onClick={togglePaused}
            className={`flex items-center gap-1 px-2 py-1 font-mono text-xs uppercase tracking-wider transition-colors border ${
              paused
                ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] hover:text-white'
            }`}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={fetchConsole}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] font-mono text-xs text-[#ef4444]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Console output */}
      <div className="flex-1 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 overflow-y-auto font-mono text-xs">
        {lines.length === 0 && !loading ? (
          <div className="text-center py-8 text-[rgba(255,255,255,0.3)]">
            <p className="uppercase tracking-wider">No console output</p>
            <p className="text-[10px] mt-2">Connect the agent to see live console</p>
          </div>
        ) : (
          lines.map((line, i) => {
            const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')
            const isWarning = line.toLowerCase().includes('warning')
            const isInfo = line.toLowerCase().startsWith('info') || line.toLowerCase().startsWith('[info]')
            return (
              <div
                key={i}
                className={`py-0.5 ${
                  isError ? 'text-[#ef4444]' : isWarning ? 'text-[#f59e0b]' : isInfo ? 'text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.7)]'
                }`}
              >
                {line}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
