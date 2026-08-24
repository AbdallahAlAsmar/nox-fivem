'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileDiff, Clock, CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronUp, AlertCircle, Filter, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchServers } from '@/lib/api';
import { fetchAllChangesGlobal, applyChange, cancelChange, batchApproveChanges, batchCancelChanges } from '@/lib/api';
import { DiffViewer } from '@/components/ui/DiffViewer';

export default function ChangesPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  const { data: servers, isLoading: loadingServers, error: serversError, mutate: mutateServers } = useSWR('servers', fetchServers, {
    fallbackData: [],
  });

  const { data: changes, isLoading: loadingChanges, error: changesError, mutate } = useSWR(
    'changes-global',
    () => fetchAllChangesGlobal(selectedServer || undefined),
    { dedupingInterval: 10_000 },
  );

  // Fetchers now propagate errors instead of swallowing to [] — surface them.
  const loadError = serversError || changesError;

  const filtered = (changes ?? []).filter((c: any) => {
    const matchesServer = !selectedServer || c.serverId === selectedServer;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesServer && matchesStatus;
  });

  const pendingCount = (changes ?? []).filter((c: any) => c.status === 'pending').length;
  const appliedCount = (changes ?? []).filter((c: any) => c.status === 'applied').length;

  const handleApply = async (id: string) => {
    try {
      await applyChange(id);
      mutate();
    } catch (e) {
      console.error('Failed to apply:', e);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelChange(id);
      mutate();
    } catch (e) {
      console.error('Failed to cancel:', e);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pendingIds = filtered.filter((c: any) => c.status === 'pending').map((c: any) => c.id);
    setSelectedIds(new Set(pendingIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const batchApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const result = await batchApproveChanges(ids, selectedServer);
      setBatchSuccess(`Approved ${result.approved.length} changes`);
      setSelectedIds(new Set());
      mutate();
      setTimeout(() => setBatchSuccess(null), 3000);
    } catch (e) {
      console.error('Failed to batch approve:', e);
    }
  };

  const batchCancel = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const result = await batchCancelChanges(ids, selectedServer);
      setBatchSuccess(`Cancelled ${result.cancelled.length} changes`);
      setSelectedIds(new Set());
      mutate();
      setTimeout(() => setBatchSuccess(null), 3000);
    } catch (e) {
      console.error('Failed to batch cancel:', e);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-[#f59e0b]';
      case 'applied': return 'text-[#22c55e]';
      case 'failed': return 'text-[#ef4444]';
      case 'rolled_back': return 'text-[rgba(255,255,255,0.4)]';
      default: return 'text-[rgba(255,255,255,0.4)]';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />;
      case 'applied': return <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />;
      case 'failed': return <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />;
      case 'rolled_back': return <RotateCcw className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Changes</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Timeline of all AI proposals across your servers
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="appearance-none bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs uppercase tracking-wider px-4 py-2 pr-8 focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
            >
              <option value="">All servers</option>
              {servers?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)] pointer-events-none" />
          </div>

          <div className="flex gap-1">
            {(['all', 'pending', 'applied', 'failed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors duration-100 ${
                  statusFilter === s
                    ? 'bg-[rgba(94,106,210,0.15)] border-[rgba(94,106,210,0.4)] text-[#5E6AD2]'
                    : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] hover:text-white hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                {s}
                {s === 'pending' && pendingCount > 0 && (
                  <span className="ml-1 text-[#f59e0b]">·{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {selectedIds.size > 0 && (
            <>
              <span className="font-mono text-xs text-white/50">{selectedIds.size} selected</span>
              <button
                onClick={batchApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e]/15 text-[#22c55e] font-mono text-xs uppercase tracking-wider hover:bg-[#22c55e]/25 rounded-lg transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Approve All
              </button>
              <button
                onClick={batchCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444]/15 text-[#ef4444] font-mono text-xs uppercase tracking-wider hover:bg-[#ef4444]/25 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 text-white/40 hover:text-white/60 font-mono text-xs transition-colors"
              >
                Clear
              </button>
            </>
          )}

          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
            <span className="text-[#22c55e]">{appliedCount} applied</span>
            <span className="text-[#f59e0b]">{pendingCount} pending</span>
          </div>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {batchSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 px-4 py-3 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-lg"
            >
              <span className="font-mono text-xs text-[#22c55e]">{batchSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline */}
        {loadingServers || loadingChanges ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] h-16 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-16 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white/60 mb-2">Failed to load changes</h3>
            <p className="font-sans text-xs text-white/40 mb-4">Check your connection and try again</p>
            <button
              onClick={() => { mutateServers(); mutate(); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
            <FileDiff className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No changes yet</h3>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] max-w-sm mx-auto leading-[1.6]">
              AI changes will appear here as they are proposed across your servers.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.08)]" />

            <div className="space-y-1">
              {filtered.map((change: any) => {
                const isSelected = selectedIds.has(change.id);
                const isPending = change.status === 'pending';
                return (
                  <ChangeRow
                    key={change.id}
                    change={change}
                    isExpanded={expandedId === change.id}
                    isPending={isPending}
                    isSelected={isSelected}
                    onToggle={() => setExpandedId(expandedId === change.id ? null : change.id)}
                    onApply={() => handleApply(change.id)}
                    onCancel={() => handleCancel(change.id)}
                    onToggleSelect={() => toggleSelect(change.id)}
                    statusColor={statusColor}
                    statusIcon={statusIcon}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeRow({
  change,
  isExpanded,
  isPending,
  isSelected,
  onToggle,
  onApply,
  onCancel,
  onToggleSelect,
  statusColor,
  statusIcon,
}: {
  change: any;
  isExpanded: boolean;
  isPending: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onApply: () => void;
  onCancel: () => void;
  onToggleSelect: () => void;
  statusColor: (s: string) => string;
  statusIcon: (s: string) => React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`relative pl-10 ${isSelected ? 'bg-[rgba(94,106,210,0.05)]' : ''}`}
    >
      {/* Timeline dot */}
      <div className={`absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 ${
        change.status === 'pending' ? 'bg-[#f59e0b] border-[#f59e0b]' :
        change.status === 'applied' ? 'bg-[#22c55e] border-[#22c55e]' :
        change.status === 'failed' ? 'bg-[#ef4444] border-[#ef4444]' :
        'bg-[#16161E] border-[rgba(255,255,255,0.3)]'
      }`} />

      <div className={`bg-[#16161E] border transition-colors duration-100 ${
        isExpanded ? 'border-[rgba(255,255,255,0.18)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
      }`}>
        <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-3 text-left">
          {/* Checkbox */}
          <div className="flex-shrink-0">
            {isPending ? (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-[#5E6AD2] border-[#5E6AD2]'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            ) : (
              <div className="w-5 h-5" />
            )}
          </div>

          {statusIcon(change.status)}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono text-xs uppercase tracking-wider text-white truncate">
                {change.file || change.filesTouched?.[0] || 'unknown file'}
              </code>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${statusColor(change.status)}`}>
                {change.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {change.serverName && (
                <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                  {change.serverName}
                </span>
              )}
              <span className="font-mono text-[10px] text-[rgba(255,255,255,0.2)]">
                {new Date(change.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {change.status === 'pending' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border border-[rgba(239,68,68,0.3)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors duration-100 flex-shrink-0"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApply(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider bg-white text-[#0F0F14] hover:opacity-85 transition-opacity duration-100 flex-shrink-0"
              >
                <CheckCircle2 className="w-3 h-3" />
                Apply
              </button>
            </>
          )}

          <span className={`font-mono text-xs transition-transform duration-100 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.3)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.3)]" />}
          </span>
        </button>

        {isExpanded && change.diff && (
          <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-3">
            <DiffViewer diff={change.diff} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
