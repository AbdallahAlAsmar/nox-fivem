'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileDiff, Clock, CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronUp, AlertCircle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchServers } from '@/lib/api';
import { fetchAllChangesGlobal, applyChange } from '@/lib/api';

export default function ChangesPage() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: servers, isLoading: loadingServers } = useSWR('servers', fetchServers, {
    fallbackData: [],
  });

  const { data: changes, isLoading: loadingChanges, mutate } = useSWR(
    'changes-global',
    () => fetchAllChangesGlobal(selectedServer || undefined),
    { dedupingInterval: 10_000 },
  );

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

          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
            <span className="text-[#22c55e]">{appliedCount} applied</span>
            <span className="text-[#f59e0b]">{pendingCount} pending</span>
          </div>
        </div>

        {/* Timeline */}
        {loadingServers || loadingChanges ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] h-16 animate-pulse" />
            ))}
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
              {filtered.map((change: any) => (
                <ChangeRow
                  key={change.id}
                  change={change}
                  isExpanded={expandedId === change.id}
                  onToggle={() => setExpandedId(expandedId === change.id ? null : change.id)}
                  onApply={() => handleApply(change.id)}
                  statusColor={statusColor}
                  statusIcon={statusIcon}
                />
              ))}
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
  onToggle,
  onApply,
  statusColor,
  statusIcon,
}: {
  change: any;
  isExpanded: boolean;
  onToggle: () => void;
  onApply: () => void;
  statusColor: (s: string) => string;
  statusIcon: (s: string) => React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-10"
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
            <button
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider bg-white text-[#0F0F14] hover:opacity-85 transition-opacity duration-100 flex-shrink-0"
            >
              <CheckCircle2 className="w-3 h-3" />
              Apply
            </button>
          )}

          <span className={`font-mono text-xs transition-transform duration-100 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.3)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.3)]" />}
          </span>
        </button>

        {isExpanded && change.diff && (
          <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-3">
            <pre className="font-mono text-xs text-[rgba(255,255,255,0.6)] bg-[#0A0A0F] p-3 overflow-x-auto whitespace-pre leading-[1.7]">
              {change.diff}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}
