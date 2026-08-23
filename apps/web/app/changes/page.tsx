'use client';

import { useState, useEffect } from 'react';
import { FileDiff, CheckCircle2, XCircle, Clock, AlertCircle, Package, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiffViewer } from '@/components/ui/DiffViewer';
import { batchApproveChanges, batchCancelChanges } from '@/lib/api';

interface Change {
  id: string;
  serverId: string;
  serverName?: string;
  filesTouched: string[];
  diff: string;
  status: 'pending' | 'approved' | 'applied' | 'failed' | 'rolled_back';
  createdAt: string;
  gitCheckpointSha?: string;
}

export default function ChangesPage() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [filter, setFilter] = useState('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  const ORCH_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchChanges();
  }, [filter]);

  async function fetchChanges() {
    try {
      const res = await fetch(`${ORCH_URL}/api/changes?limit=100`);
      if (res.ok) {
        const data = await res.json();
        const filtered = filter === 'all' 
          ? data 
          : data.filter((c: Change) => c.status === filter);
        setChanges(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch changes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveChange(changeId: string) {
    try {
      const res = await fetch(`${ORCH_URL}/api/changes/${changeId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchChanges();
        setSelectedChange(null);
      }
    } catch (error) {
      console.error('Failed to approve change:', error);
    }
  }

  async function denyChange(changeId: string) {
    try {
      const res = await fetch(`${ORCH_URL}/api/changes/${changeId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchChanges();
        setSelectedChange(null);
      }
    } catch (error) {
      console.error('Failed to deny change:', error);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(changes.filter(c => c.status === 'pending').map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const batchApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const result = await batchApproveChanges(ids);
      setBatchSuccess(`Approved ${result.approved.length} changes`);
      setSelectedIds(new Set());
      await fetchChanges();
      setTimeout(() => setBatchSuccess(null), 3000);
    } catch (e) {
      console.error('Failed to batch approve:', e);
    }
  };

  const batchCancel = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const result = await batchCancelChanges(ids);
      setBatchSuccess(`Cancelled ${result.cancelled.length} changes`);
      setSelectedIds(new Set());
      await fetchChanges();
      setTimeout(() => setBatchSuccess(null), 3000);
    } catch (e) {
      console.error('Failed to batch cancel:', e);
    }
  };

  const parseDiffLines = (diff: string) => {
    const lines: Array<{ type: 'context' | 'addition' | 'deletion'; content: string }> = [];
    const rawLines = diff.split('\n');
    let inDiff = false;
    
    for (const line of rawLines) {
      if (line.startsWith('```diff')) {
        inDiff = true;
        continue;
      }
      if (line.startsWith('```') && inDiff) {
        inDiff = false;
        continue;
      }
      if (!inDiff) continue;
      
      if (line.startsWith('+++ ') || line.startsWith('--- ')) continue;
      
      if (line.startsWith('+')) {
        lines.push({ type: 'addition', content: line.slice(1) });
      } else if (line.startsWith('-')) {
        lines.push({ type: 'deletion', content: line.slice(1) });
      } else {
        lines.push({ type: 'context', content: line });
      }
    }
    
    return lines;
  };

  const statusColors = {
    pending: 'text-[#f59e0b]',
    approved: 'text-[#22c55e]',
    applied: 'text-[#22c55e]',
    failed: 'text-[#ef4444]',
    'rolled_back': 'text-[#5E6AD2]',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] rounded-xl flex items-center justify-center">
              <FileDiff className="w-5 h-5 text-[#5E6AD2]" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-medium text-white">Change History</h1>
              <p className="font-mono text-xs text-white/40">Review and manage proposed changes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="font-mono text-xs text-white/50">{selectedIds.size} selected</span>
                <button
                  onClick={batchApprove}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e]/15 text-[#22c55e] font-mono text-xs uppercase tracking-wider hover:bg-[#22c55e]/25 rounded-lg transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={batchCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444]/15 text-[#ef4444] font-mono text-xs uppercase tracking-wider hover:bg-[#ef4444]/25 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-white/40 hover:text-white/60 font-mono text-xs transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#0d0d14] border border-[rgba(255,255,255,0.1)] text-white/70 font-mono text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[rgba(94,106,210,0.5)]"
            >
              <option value="all">All Changes</option>
              <option value="pending">Pending</option>
              <option value="applied">Applied</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Batch actions toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 px-4 py-3 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.3)] rounded-lg flex items-center justify-between">
            <span className="font-mono text-xs text-[#5E6AD2]">{selectedIds.size} changes selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5 rounded transition-colors"
              >
                Select All Pending
              </button>
              <button
                onClick={deselectAll}
                className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5 rounded transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Success toast */}
        <AnimatePresence>
          {batchSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-lg"
            >
              <span className="font-mono text-xs text-[#22c55e]">{batchSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Changes list */}
        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white/30 font-mono text-sm">Loading...</div>
          ) : changes.length === 0 ? (
            <div className="p-8 text-center text-white/30 font-mono text-sm">No changes found</div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Select all header */}
              <div className="flex items-center gap-3 px-5 py-2 bg-white/5">
                <button
                  onClick={selectAll}
                  className="font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
                >
                  Select All Pending
                </button>
              </div>
              {changes.map((change) => {
                const additions = parseDiffLines(change.diff).filter(l => l.type === 'addition').length;
                const deletions = parseDiffLines(change.diff).filter(l => l.type === 'deletion').length;
                const isSelected = selectedIds.has(change.id);
                const isPending = change.status === 'pending';

                return (
                  <motion.div
                    key={change.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                      isSelected ? 'bg-[rgba(94,106,210,0.1)]' : 'hover:bg-white/5'
                    } ${isPending ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      if (isPending && !e.ctrlKey) {
                        toggleSelect(change.id);
                      } else if (isPending) {
                        setSelectedChange(change);
                      }
                    }}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      {isPending ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(change.id); }}
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

                    <div className={`w-8 h-8 flex items-center justify-center ${statusColors[change.status]}`}>
                      {change.status === 'pending' && <AlertCircle className="w-4 h-4" />}
                      {change.status === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                      {change.status === 'applied' && <CheckCircle2 className="w-4 h-4" />}
                      {change.status === 'failed' && <XCircle className="w-4 h-4" />}
                      {change.status === 'rolled_back' && <XCircle className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white truncate">
                          {change.serverName || change.serverId}
                        </span>
                        <span className={`font-mono text-[10px] uppercase ${statusColors[change.status]}`}>
                          {change.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-xs text-white/40">
                          {change.filesTouched.length} file{change.filesTouched.length !== 1 ? 's' : ''}
                        </span>
                        <span className="font-mono text-xs text-white/30">
                          +{additions} -{deletions}
                        </span>
                        <span className="font-mono text-xs text-white/20">
                          {new Date(change.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {change.status === 'pending' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedChange(change); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(94,106,210,0.15)] text-[#5E6AD2] font-mono text-[10px] uppercase tracking-wider hover:bg-[rgba(94,106,210,0.25)] rounded-lg transition-colors"
                      >
                        Review
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Change detail modal */}
        <AnimatePresence>
          {selectedChange && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedChange(null)} />
              
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-[#0d0d14] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-[#0a0a0f] border-b border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] rounded-lg flex items-center justify-center">
                      <FileDiff className="w-4 h-4 text-[#5E6AD2]" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-medium text-white">Change Details</h3>
                      <p className="font-mono text-xs text-white/40">
                        {selectedChange.serverName || selectedChange.serverId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChange(null)}
                    className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Files */}
                <div className="px-5 py-3 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex flex-wrap gap-2">
                    {selectedChange.filesTouched.map((file, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] rounded font-mono text-xs text-[#5E6AD2]"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Diff */}
                <div className="px-5 py-4">
                  <DiffViewer diff={selectedChange.diff} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 bg-[#0a0a0f] border-t border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2 text-white/40">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">
                      {new Date(selectedChange.createdAt).toLocaleString()}
                    </span>
                    {selectedChange.gitCheckpointSha && (
                      <span className="font-mono text-[10px] text-white/20">
                        checkpoint: {selectedChange.gitCheckpointSha.slice(0, 7)}
                      </span>
                    )}
                  </div>

                  {selectedChange.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => denyChange(selectedChange.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 border border-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={() => approveChange(selectedChange.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs uppercase tracking-wider bg-[#5E6AD2] hover:bg-[#4f5bc4] text-white rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
