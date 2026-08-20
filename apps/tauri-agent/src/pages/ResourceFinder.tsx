import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Star, ExternalLink, Package, Download,
  ChevronDown, ChevronUp, Grid, List
} from 'lucide-react'
import { 
  RESOURCE_CATALOG, CATEGORIES, 
  getResourcesByCategory, searchResources,
  type FiveMResource, type ResourceCategory 
} from '../components/ResourceCatalog'

type ViewMode = 'grid' | 'list'
type SortMode = 'name' | 'stars' | 'category'

export default function ResourceFinder({ serverId }: { serverId?: string }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortMode, setSortMode] = useState<SortMode>('stars')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let results = RESOURCE_CATALOG

    // Search filter
    if (search) {
      results = searchResources(search)
    }

    // Category filter
    if (selectedCategory !== 'all') {
      results = getResourcesByCategory(selectedCategory)
    }

    // Sort
    results = [...results].sort((a, b) => {
      if (sortMode === 'stars') return b.stars - a.stars
      if (sortMode === 'name') return a.name.localeCompare(b.name)
      return a.category.localeCompare(b.category)
    })

    return results
  }, [search, selectedCategory, sortMode])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Resource Finder</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
          Browse {RESOURCE_CATALOG.length} curated FiveM resources
        </p>
      </div>

      {/* Search & Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-10 pr-4 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
          />
        </div>

        {/* Sort */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-xs text-white focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
        >
          <option value="stars" className="bg-[#16161E]">Top Rated</option>
          <option value="name" className="bg-[#16161E]">Name A-Z</option>
          <option value="category" className="bg-[#16161E]">Category</option>
        </select>

        {/* View Toggle */}
        <div className="flex border border-[rgba(255,255,255,0.08)]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors duration-100 ${viewMode === 'grid' ? 'bg-[rgba(94,106,210,0.2)] text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors duration-100 ${viewMode === 'list' ? 'bg-[rgba(94,106,210,0.2)] text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 border ${
            selectedCategory === 'all'
              ? 'border-[#5E6AD2] bg-[rgba(94,106,210,0.15)] text-[#5E6AD2]'
              : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.18)]'
          }`}
        >
          All ({RESOURCE_CATALOG.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = RESOURCE_CATALOG.filter(r => r.category === cat.id).length
          if (count === 0) return null
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 border ${
                selectedCategory === cat.id
                  ? 'border-[#5E6AD2] bg-[rgba(94,106,210,0.15)] text-[#5E6AD2]'
                  : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.18)]'
              }`}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Results */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-20 bg-nox-surface border border-[rgba(255,255,255,0.08)] border-dashed">
          <Package className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No resources found</h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">Try a different search or category</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredResources.map((resource, i) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="bg-nox-surface border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-100 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-white truncate">{resource.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5">
                          {resource.category}
                        </span>
                        <div className="flex items-center gap-1 text-[#f59e0b]">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="font-mono text-[10px]">{resource.stars}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(resource.id)}
                      className="ml-2 text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
                    >
                      {expandedId === resource.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-relaxed mb-3">
                    {resource.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {resource.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={resource.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                      GitHub
                    </a>
                    <button
                      onClick={() => {
                        // Queue for AI installation
                        const event = new CustomEvent('nox-install-resource', { detail: resource })
                        window.dispatchEvent(event)
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 font-mono text-xs uppercase tracking-wider bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
                    >
                      <Download className="w-3 h-3" />
                      Install
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedId === resource.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[rgba(255,255,255,0.06)] overflow-hidden"
                    >
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgba(255,255,255,0.4)]">Framework:</span>
                          <span className="text-white font-mono">{resource.framework.join(', ').toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgba(255,255,255,0.4)]">Stars:</span>
                          <span className="text-[#f59e0b] font-mono">{resource.stars}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[rgba(255,255,255,0.4)]">Category:</span>
                          <span className="text-white font-mono">{resource.category}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredResources.map((resource, i) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.02, duration: 0.15 }}
                className="bg-nox-surface border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-100 p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-white">{resource.name}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5">
                      {resource.category}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] truncate">
                    {resource.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[#f59e0b]">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="font-mono text-xs">{resource.stars}</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={resource.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.1)] hover:text-white hover:border-[rgba(255,255,255,0.3)] transition-colors duration-100"
                  >
                    <ExternalLink className="w-3 h-3 inline mr-1" />
                    View
                  </a>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('nox-install-resource', { detail: resource })
                      window.dispatchEvent(event)
                    }}
                    className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
                  >
                    <Download className="w-3 h-3 inline mr-1" />
                    Install
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Install Event Handler */}
      <InstallResourceHandler />
    </div>
  )
}

function InstallResourceHandler() {
  const [message, setMessage] = useState<string | null>(null)

  useState(() => {
    const handler = (e: Event) => {
      const resource = (e as CustomEvent).detail as FiveMResource
      setMessage(`Requesting AI to install ${resource.name}...`)
      // Dispatch to orchestrator via API
      fetch(`${import.meta.env?.VITE_ORCHESTRATOR_URL || 'https://gazette-hurricane-hung-calibration.trycloudflare.com'}/api/threads/thread_local/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Install the resource "${resource.name}" from ${resource.downloadUrl}. This is a ${resource.category} resource for ${resource.framework.join(', ')} framework. Please provide installation instructions.`,
          userId: 'anonymous'
        })
      }).then(res => res.json()).then(data => {
        setMessage(`AI response: ${(data.response || '').substring(0, 100)}...`)
      }).catch(() => setMessage('Failed to contact AI'))
      setTimeout(() => setMessage(null), 5000)
    }
    window.addEventListener('nox-install-resource', handler)
    return () => window.removeEventListener('nox-install-resource', handler)
  })

  if (message) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-4 right-4 bg-[#16161E] border border-[rgba(94,106,210,0.3)] p-4 max-w-sm z-50"
      >
        <p className="font-mono text-xs text-[#5E6AD2]">{message}</p>
      </motion.div>
    )
  }
  return null
}
