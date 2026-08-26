'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import {
  Package, Search, Filter, ChevronRight, Download,
  Star, Download as DownloadIcon, ExternalLink,
  Server as ServerIcon, CheckCircle2, XCircle,
  Clock, AlertCircle, RotateCcw, Loader2,
  ArrowUpCircle, Trash2, Terminal,
} from 'lucide-react';
import useSWR from 'swr';
import { fetchServers, fetchResourceCatalog, installResource, fetchResourceInstalls, rollbackResourceInstall, scanResources } from '@/lib/api';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';
import { useNotifications } from '@/components/notifications';

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

interface ResourceInstall {
  id: string;
  slug: string;
  name: string;
  status: string;
  progress: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
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
  const [installs, setInstalls] = useState<ResourceInstall[]>([]);
  const [installLoading, setInstallLoading] = useState(false);
  const [rollbacking, setRollbacking] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { addNotification } = useNotifications();

  const { data: servers } = useSWR('servers', fetchServers, { fallbackData: [] });

  useEffect(() => {
    setCatalogLoading(true);
    fetchResourceCatalog({ category: category === 'all' ? undefined : category, search: search || undefined })
      .then((data: any) => setCatalog(data?.items || []))
      .finally(() => setCatalogLoading(false));
  }, [category, search]);

  useEffect(() => {
    if (selectedServer) {
      setInstallLoading(true);
      fetchResourceInstalls(selectedServer)
        .then((data) => setInstalls(Array.isArray(data) ? data : []))
        .finally(() => setInstallLoading(false));
    } else {
      setInstalls([]);
    }
  }, [selectedServer]);

  const refreshInstalls = async () => {
    if (!selectedServer) return;
    try {
      const data = await fetchResourceInstalls(selectedServer);
      setInstalls(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  // Poll for install status updates
  useEffect(() => {
    if (!selectedServer) return;
    const hasActive = installs.some((i) => i.status === 'installing' || i.status === 'rollback_requested');
    if (!hasActive) return;

    const interval = setInterval(refreshInstalls, 2000);
    return () => clearInterval(interval);
  }, [selectedServer, installs]);

  const handleScan = async () => {
    if (!selectedServer || scanning) return;
    setScanning(true);
    try {
      await scanResources(selectedServer);
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
      await installResource(selectedServer, slug);
      const resource = catalog.find((r) => r.slug === slug);
      toast.success(`Starting installation of ${resource?.name || slug}`);
      addNotification({
        type: 'info',
        title: `Installing ${resource?.name || slug}`,
        message: 'Resource installation in progress...',
      });
      await refreshInstalls();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to install ${slug}`;
      toast.error(message);
      addNotification({
        type: 'failure',
        title: 'Installation Unavailable',
        message,
      });
    } finally {
      setInstalling(null);
    }
  };

  const handleRollback = async (installId: string, resourceName: string) => {
    setRollbacking(installId);
    try {
      await rollbackResourceInstall(installId);
      toast.success(`Rollback initiated for ${resourceName}`);
      addNotification({
        type: 'info',
        title: `Rolling back ${resourceName}`,
        message: 'Resource rollback in progress...',
      });
      await refreshInstalls();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to rollback ${resourceName}`;
      toast.error(message);
      addNotification({
        type: 'failure',
        title: 'Rollback Failed',
        message,
      });
    } finally {
      setRollbacking(null);
    }
  };

  const selectedServerData = servers?.find((s: any) => s.id === selectedServer);

  const installedSlugs = new Set(installs.filter((i) => i.status === 'installed').map((i) => i.slug));
  const installingSlugs = new Set(installs.filter((i) => i.status === 'installing').map((i) => i.slug));

  const categoryColors: Record<string, string> = {
    framework: 'bg-[#3DFFA2]/20 text-[#3DFFA2] border-[#3DFFA2]/30',
    jobs: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
    admin: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30',
    inventory: 'bg-[#ec4899]/20 text-[#ec4899] border-[#ec4899]/30',
    dependency: 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30',
    map: 'bg-[#06b6d4]/20 text-[#06b6d4] border-[#06b6d4]/30',
    config: 'bg-white/10 text-white/60 border-white/20',
  };

  const installStatusStyles: Record<string, string> = {
    installing: 'text-[#3DFFA2] bg-[#3DFFA2]/10 border-[#3DFFA2]/30',
    installed: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/30',
    failed: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30',
    rollback_requested: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30',
    rollbacked: 'text-[#8b5cf6] bg-[#8b5cf6]/10 border-[#8b5cf6]/30',
  };

  return (
    <ErrorBoundary>
      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Header */}
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Resources</h1>
            <p className="font-sans text-xs text-white/40 mt-1">
              Browse FiveM resources and install them to your server
            </p>
          </div>

          {/* Server selector */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                className="w-full appearance-none bg-[#16161E] border border-white/10 text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:outline-none focus:border-[#3DFFA2] transition-colors"
              >
                <option value="">Select a server...</option>
                {servers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
            {selectedServerData && (
              <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedServerData.status === 'online' ? 'bg-[#22c55e]' : 'bg-white/20'}`} />
                {selectedServerData.status}
                {selectedServerData.hasAgent && <span className="text-[#22c55e]">Agent</span>}
              </div>
            )}
            <button
              onClick={handleScan}
              disabled={scanning || !selectedServer}
              className="flex items-center gap-1.5 px-3 py-2 font-mono text-xs uppercase tracking-wider text-white bg-[#16161E] border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
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
              className="p-3 bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.2)] font-mono text-xs text-[#3DFFA2]"
            >
              {headerMsg}
            </motion.div>
          )}

          {/* Install History Section */}
          {selectedServer && (
            <div className="bg-[#16161E] border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Terminal className="w-4 h-4 text-white/50" />
                  <span className="font-mono text-sm text-white">Install History</span>
                  {installs.length > 0 && (
                    <span className="font-mono text-[10px] text-white/40 bg-white/5 px-2 py-0.5">
                      {installs.length} record{installs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {installs.some((i) => i.status === 'installing' || i.status === 'rollback_requested') && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#3DFFA2]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Active
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-white/10 p-4">
                      {installLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                        </div>
                      ) : installs.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
                          <p className="font-mono text-xs text-white/40">No installations yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {installs.map((install) => (
                            <div
                              key={install.id}
                              className="flex items-center gap-3 p-3 bg-[#0a0a0f]/50 border border-white/5 rounded"
                            >
                              {/* Status Icon */}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                install.status === 'installed' ? 'bg-[#22c55e]/10' :
                                install.status === 'failed' ? 'bg-[#ef4444]/10' :
                                install.status === 'rollbacked' ? 'bg-[#8b5cf6]/10' :
                                'bg-[#3DFFA2]/10'
                              }`}>
                                {install.status === 'installed' && <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />}
                                {install.status === 'failed' && <XCircle className="w-4 h-4 text-[#ef4444]" />}
                                {install.status === 'rollbacked' && <RotateCcw className="w-4 h-4 text-[#8b5cf6]" />}
                                {(install.status === 'installing' || install.status === 'rollback_requested') && (
                                  <Loader2 className="w-4 h-4 text-[#3DFFA2] animate-spin" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-mono text-sm text-white font-medium">{install.name}</span>
                                  <span className={`px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider border ${installStatusStyles[install.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
                                    {install.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="font-sans text-xs text-white/40">
                                  {install.error ? (
                                    <span className="text-[#ef4444] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      {install.error}
                                    </span>
                                  ) : install.status === 'installing' && (
                                    <span className="flex items-center gap-2">
                                      <span>Installing...</span>
                                      <span className="text-[#3DFFA2]">{install.progress}%</span>
                                    </span>
                                  )}
                                </p>
                                {/* Progress bar */}
                                {(install.status === 'installing' || install.status === 'rollback_requested') && (
                                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#3DFFA2] transition-all duration-500"
                                      style={{ width: `${install.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                {install.status === 'installed' && (
                                  <button
                                    onClick={() => handleRollback(install.id, install.name)}
                                    disabled={rollbacking === install.id}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-50"
                                  >
                                    {rollbacking === install.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-3 h-3" />
                                    )}
                                    Rollback
                                  </button>
                                )}
                                <span className="font-mono text-[10px] text-white/30">
                                  {new Date(install.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors whitespace-nowrap ${
                  category === cat.id
                    ? 'text-white bg-[rgba(61,255,162,0.2)] border border-[rgba(61,255,162,0.4)]'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#16161E] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#3DFFA2]"
            />
          </div>

          {/* Resource list */}
          {catalogLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#16161E] p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-3 bg-white/5 rounded animate-pulse" />
                      <div className="w-24 h-2.5 bg-white/3 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-white/3 rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="w-16 h-5 bg-white/5 rounded animate-pulse" />
                    <div className="w-16 h-5 bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : catalog.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="font-mono text-xs uppercase tracking-wider text-white/40">
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
                  isInstalled={installedSlugs.has(res.slug)}
                  isInstalling={installingSlugs.has(res.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function ResourceCard({
  resource,
  serverId,
  onInstall,
  installing,
  categoryColors,
  isInstalled,
  isInstalling,
}: {
  resource: Resource;
  serverId: string;
  onInstall: (slug: string) => void;
  installing: boolean;
  categoryColors: Record<string, string>;
  isInstalled: boolean;
  isInstalling: boolean;
}) {
  return (
    <div className="bg-[#16161E] p-4 hover:bg-[#1a1a24] transition-colors">
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
          <p className="font-sans text-xs text-white/50 mb-2">{resource.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[10px] text-white/30 flex items-center gap-1">
              <DownloadIcon className="w-3 h-3" /> {((resource.downloads / 1000).toFixed(0))}k
            </span>
            {resource.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-mono text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {serverId ? (
          isInstalled ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" />
              Installed
            </span>
          ) : isInstalling ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3DFFA2]/10 border border-[#3DFFA2]/30 text-[#3DFFA2] font-mono text-[10px] uppercase tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin" />
              Installing...
            </span>
          ) : (
            <button
              onClick={() => onInstall(resource.slug)}
              disabled={installing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3DFFA2]/15 border border-[#3DFFA2]/30 text-[#3DFFA2] font-mono text-[10px] uppercase tracking-wider hover:bg-[#3DFFA2]/25 transition-colors disabled:opacity-50"
            >
              <DownloadIcon className={`w-3 h-3 ${installing ? 'animate-spin' : ''}`} />
              {installing ? 'Installing...' : 'Install'}
            </button>
          )
        ) : (
          <span className="font-mono text-[10px] text-white/30">Select a server</span>
        )}
      </div>
    </div>
  );
}
