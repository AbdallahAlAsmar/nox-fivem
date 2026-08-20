'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Package, Search, Filter, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchServers } from '@/lib/api';
import { fetchServerResources } from '@/lib/api';

const ORCH_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ||
  (process.env.VERCEL ? '/api/orchestrator' : 'http://158.101.167.118:3001');

function timeAgo(date: string | number): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ResourcesPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: servers, isLoading: loadingServers } = useSWR('servers', fetchServers, {
    fallbackData: [],
  });

  const { data: resources, isLoading: loadingResources } = useSWR(
    selectedServer ? `resources:${selectedServer}` : null,
    () => fetchServerResources(selectedServer),
    { dedupingInterval: 20_000 },
  );

  const filtered = (resources ?? []).filter((r: any) =>
    r.resourceName.toLowerCase().includes(search.toLowerCase()) ||
    (r.relativePath ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const selectedServerData = servers?.find((s: any) => s.id === selectedServer);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Resources</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Browse and manage FiveM resources across your servers
          </p>
        </div>

        {/* Server selector */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full appearance-none bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
            >
              <option value="">Select a server…</option>
              {servers?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)] pointer-events-none" />
          </div>
          {selectedServerData && (
            <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
              <span className={`w-1.5 h-1.5 rounded-full ${selectedServerData.status === 'online' ? 'bg-[#22c55e]' : 'bg-[rgba(255,255,255,0.2)]'}`} />
              {selectedServerData.status}
              {selectedServerData.hasAgent && <span className="text-[#22c55e]">· Agent</span>}
            </div>
          )}
        </div>

        {/* Search + stats */}
        {selectedServer && resources !== undefined && (
          <>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(255,255,255,0.3)] pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resources…"
                  className="w-full pl-9 pr-4 py-2 bg-transparent border border-[rgba(255,255,255,0.08)] text-sm text-white font-sans placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                />
              </div>
              <span className="font-mono text-xs text-[rgba(255,255,255,0.4)] whitespace-nowrap">
                {filtered.length} / {resources.length}
              </span>
            </div>

            {/* Resource list */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
                <Package className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
                <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">
                  {search ? 'No matches' : 'No resources found'}
                </h3>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
                  {search ? 'Try a different search term' : 'Run a scan on the server to discover resources'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((resource: any, i: number) => (
                  <ResourceRow
                    key={resource.id || resource.resourceName}
                    resource={resource}
                    isExpanded={expanded === resource.id || expanded === resource.resourceName}
                    onToggle={() => setExpanded(expanded === resource.id || expanded === resource.resourceName ? null : (resource.id || resource.resourceName))}
                    lastScanned={resource.lastScannedAt}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!selectedServer && !loadingServers && (
          <div className="text-center py-20 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
            <Package className="w-12 h-12 text-[rgba(255,255,255,0.15)] mx-auto mb-4" />
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">Select a server</h3>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] max-w-sm mx-auto leading-[1.6]">
              Choose a server to browse its resources. Each server has its own independent resource catalog.
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

function ResourceRow({
  resource,
  isExpanded,
  onToggle,
  lastScanned,
}: {
  resource: any;
  isExpanded: boolean;
  onToggle: () => void;
  lastScanned?: string;
}) {
  const deps = Array.isArray(resource.dependencies) ? resource.dependencies : [];
  const provides = Array.isArray(resource.provides) ? resource.provides : [];
  const files = Array.isArray(resource.files) ? resource.files : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-3.5 text-left"
      >
        <div className="w-8 h-8 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-[#5E6AD2]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs uppercase tracking-wider text-white truncate">
            {resource.resourceName}
          </div>
          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] truncate mt-0.5">
            {resource.relativePath}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {deps.length > 0 && (
            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider hidden sm:block">
              {deps.length} dep{deps.length > 1 ? 's' : ''}
            </span>
          )}
          {lastScanned && (
            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] hidden sm:block">
              {timeAgo(lastScanned)}
            </span>
          )}
          <span className={`font-mono text-xs transition-colors duration-100 ${isExpanded ? 'text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.3)]'}`}>
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-4 space-y-3">
          {provides.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-1.5">
                Provides
              </div>
              <div className="flex flex-wrap gap-1.5">
                {provides.map((p: string) => (
                  <span key={p} className="font-mono text-[11px] px-2 py-0.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22c55e]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {deps.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-1.5">
                Dependencies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deps.map((d: string) => (
                  <span key={d} className="font-mono text-[11px] px-2 py-0.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)]">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {files.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-1.5">
                Files ({files.length})
              </div>
              <div className="font-mono text-[11px] text-[rgba(255,255,255,0.4)] space-y-0.5 max-h-32 overflow-y-auto">
                {files.slice(0, 20).map((f: string) => (
                  <div key={f} className="truncate">{f}</div>
                ))}
                {files.length > 20 && (
                  <div className="text-[rgba(255,255,255,0.25)]">… and {files.length - 20} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
