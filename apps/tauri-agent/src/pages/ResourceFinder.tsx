import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Package, CheckCircle2, AlertCircle } from 'lucide-react'

interface ResourceFinderProps {
  serverId?: string
}

interface ServerResource {
  name: string
  path: string
  dependencies?: string[]
}

export default function ResourceFinder({ serverId }: ResourceFinderProps) {
  const [resources, setResources] = useState<ServerResource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const ORCH = import.meta.env?.VITE_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'

  useEffect(() => {
    if (!serverId) return
    fetchResources()
  }, [serverId])

  const fetchResources = async () => {
    if (!serverId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${ORCH}/api/servers/${serverId}/resources`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResources(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    if (!serverId) return
    setScanning(true)
    try {
      const res = await fetch(`${ORCH}/api/servers/${serverId}/scan`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Scan failed')
      }
      await fetchResources()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const filteredResources = useMemo(() => {
    if (!search) return resources
    return resources.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.path.toLowerCase().includes(search.toLowerCase())
    )
  }, [resources, search])

  if (!serverId) {
    return (
      <div className="flex items-center justify-center h-64 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
        No server selected
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Resources</h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            {resources.length} resources indexed
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-[rgba(94,106,210,0.15)] hover:bg-[rgba(94,106,210,0.25)] border border-[rgba(94,106,210,0.3)] text-[#5E6AD2] font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-30"
        >
          {scanning ? <AlertCircle className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
          {scanning ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] font-mono text-xs text-[#ef4444]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="w-full pl-10 pr-4 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
          Loading resources...
        </div>
      )}

      {/* Resource list */}
      {!loading && (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {filteredResources.length === 0 ? (
            <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
              {search ? 'No matching resources' : 'No resources found. Click Rescan to index.'}
            </div>
          ) : (
            filteredResources.map((resource) => (
              <div
                key={resource.name}
                className="flex items-center gap-3 p-3 bg-[#16161E] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors"
              >
                <Package className="w-4 h-4 text-[#5E6AD2] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-white truncate">{resource.name}</div>
                  <div className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] truncate">{resource.path}</div>
                </div>
                {resource.dependencies && resource.dependencies.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
                    <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                    <span className="font-mono text-[10px] text-[rgba(255,255,255,0.5)]">{resource.dependencies.length} deps</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
