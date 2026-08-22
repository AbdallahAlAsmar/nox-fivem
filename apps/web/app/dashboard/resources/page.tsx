'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Package, Search, Filter, ChevronRight, Download,
  Star, Download as DownloadIcon, ExternalLink,
  Server as ServerIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { fetchServers, fetchResourceCatalog } from '@/lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'framework', label: 'Frameworks' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'admin', label: 'Admin Tools' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'dependency', label: 'Dependencies' },
  { id: 'map', label: 'Maps' },
  { id: 'config', label: 'Config' },
];

interface Resource {
  slug: string;
  name: string;
  category: string;
  description: string;
  type: string;
  downloads: number;
  tags: string[];
}

export default function ResourceHubPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [catalog, setCatalog] = useState<Resource[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [headerMsg, setHeaderMsg] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const { data: servers } = useSWR('servers', fetchServers, { fallbackData: [] });

  useEffect(() => {
    setCatalogLoading(true);
    fetchResourceCatalog({ category: category === 'all' ? undefined : category, search: search || undefined })
      .then((data: any) => setCatalog(data?.items || []))
      .finally(() => setCatalogLoading(false));
  }, [category, search]);

  const handleScan = async () => {
    if (!selectedServer || scanning) return;
    setScanning(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'}/api/servers/${selectedServer}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHeaderMsg('Scan complete');
      setTimeout(() => setHeaderMsg(null), 3000);
    } catch {
      setHeaderMsg('Scan failed');
      setTimeout(() => setHeaderMsg(null), 3000);
    } finally {
      setScanning(false);
    }
  };

  const handleInstall = async (slug: string) => {
    if (!selectedServer || installing) return;
    setInstalling(slug);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'}/api/resources/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServer, slug }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHeaderMsg(`Installed: ${catalog.find((r) => r.slug === slug)?.name}`);
      setTimeout(() => setHeaderMsg(null), 3000);
    } catch {
      setHeaderMsg('Install failed');
      setTimeout(() => setHeaderMsg(null), 3000);
    } finally {
      setInstalling(null);
    }
  };

  const selectedServerData = servers?.find((s: any) => s.id === selectedServer);

  const categoryColors: Record<string, string> = {
    framework: 'bg-[#5E6AD2]/20 text-[#5E6AD2] border-[#5E6AD2]/30',
    jobs: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
    admin: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30',
    inventory: 'bg-[#ec4899]/20 text-[#ec4899] border-[#ec4899]/30',
    dependency: 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30',
    map: 'bg-[#06b6d4]/20 text-[#06b6d4] border-[#06b6d4]/30',
    config: 'bg-[rgba(255,255,255,0.1)] text-white/60 border-white/20',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Resources</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Browse FiveM resources and install them to your server
          </p>
        </div>

        {/* Server selector */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full appearance-none bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:outline-none focus:border-[#5E6AD2] transition-colors"
            >
              <option value="">Select a server...</option>
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
              {selectedServerData.hasAgent && <span className="text-[#22c55e]">Agent</span>}
            </div>
          )}
          <button
            onClick={handleScan}
            disabled={scanning || !selectedServer}
            className="flex items-center gap-1.5 px-3 py-2 font-mono text-xs uppercase tracking-wider text-white bg-[#16161E] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] transition-colors disabled:opacity-40"
          >
            <DownloadIcon className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Scan'}</span>
          </button>
        </div>

        {headerMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] font-mono text-xs text-[#5E6AD2]"
          >
            {headerMsg}
          </motion.div>
        )}

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors whitespace-nowrap ${
                category === cat.id
                  ? 'text-white bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs focus:outline-none focus:border-[#5E6AD2]"
          />
        </div>

        {/* Resource list */}
        {catalogLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[rgba(94,106,210,0.3)] border-t-[#5E6AD2] rounded-full animate-spin mx-auto" />
          </div>
        ) : catalog.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-8 h-8 text-[rgba(255,255,255,0.2)] mx-auto mb-2" />
            <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
              No resources found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalog.map((res) => (
              <ResourceCard
                key={res.slug}
                resource={res}
                serverId={selectedServer}
                onInstall={handleInstall}
                installing={installing === res.slug}
                categoryColors={categoryColors}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceCard({
  resource,
  serverId,
  onInstall,
  installing,
  categoryColors,
}: {
  resource: Resource;
  serverId: string;
  onInstall: (slug: string) => void;
  installing: boolean;
  categoryColors: Record<string, string>;
}) {
  return (
    <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4 hover:border-[rgba(255,255,255,0.16)] transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryColors[resource.category] || categoryColors.config}`}>
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm text-white font-medium">{resource.name}</span>
            <span className={`px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider border ${categoryColors[resource.category] || categoryColors.config}`}>
              {resource.category}
            </span>
          </div>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] mb-2">{resource.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] flex items-center gap-1">
              <DownloadIcon className="w-3 h-3" /> {((resource.downloads / 1000).toFixed(0))}k
            </span>
            {resource.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] bg-white/5 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`https://forum.cfx.re/t/${resource.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {serverId ? (
            <button
              onClick={() => onInstall(resource.slug)}
              disabled={installing}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors border ${
                installing
                  ? 'bg-[rgba(94,106,210,0.2)] text-[#5E6AD2] border-[#5E6AD2]/40 animate-pulse'
                  : 'bg-[#5E6AD2]/20 text-[#5E6AD2] border-[#5E6AD2]/40 hover:bg-[#5E6AD2]/30'
              } disabled:opacity-50`}
            >
              {installing ? 'Installing...' : 'Install'}
            </button>
          ) : (
            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.2)]">Select server</span>
          )}
        </div>
      </div>
    </div>
  );
}