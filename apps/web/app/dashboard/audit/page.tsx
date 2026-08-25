'use client';

import { useState, useEffect } from 'react';
import { ScrollText, CheckCircle2, XCircle, AlertCircle, GitCommit, FileCode, Server, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditEntry {
  id: string;
  orgId?: string;
  serverId?: string;
  userId?: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  server?: { name: string; id: string };
  user?: { email: string; id: string };
}

const ACTION_ICONS: Record<string, any> = {
  'change.proposed': FileCode,
  'change.approved': CheckCircle2,
  'change.applied': GitCommit,
  'change.rolled_back': XCircle,
  'server.scanned': Server,
  'agent.connected': AlertCircle,
};

const ACTION_COLORS: Record<string, string> = {
  'change.proposed': 'text-[#5E6AD2]',
  'change.approved': 'text-[#22c55e]',
  'change.applied': 'text-[#22c55e]',
  'change.rolled_back': 'text-[#f59e0b]',
  'server.scanned': 'text-[#5E6AD2]',
  'agent.connected': 'text-[#22c55e]',
};

const ACTION_LABELS: Record<string, string> = {
  'change.proposed': 'Change Proposed',
  'change.approved': 'Change Approved',
  'change.applied': 'Change Applied',
  'change.rolled_back': 'Change Rolled Back',
  'server.scanned': 'Server Scanned',
  'agent.connected': 'Agent Connected',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  // True per-action totals across the whole org (server-side groupBy), so stat
  // cards stay correct even when the log list is a single clamped page.
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchLogs() {
    try {
      setLoading(true);
      setError(null);
      // The API clamps to MAX_PAGE_SIZE=200 (same bound as the orchestrator)
      // and returns grouped totals for the stat cards — requesting more than
      // that would be dishonest about what the list actually shows.
      const qs = new URLSearchParams({ limit: '200' });
      if (filter !== 'all') qs.set('filter', filter);
      const res = await fetch(`/api/audit?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setActionCounts(data.actionCounts || {});
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err?.message || 'Failed to load audit log');
      setLogs([]);
      setActionCounts({});
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Audit Log</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Track all actions and changes across your servers
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-xs uppercase tracking-wider px-4 py-2 pr-8 focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
          >
            <option value="all">All Actions</option>
            <option value="change">Changes</option>
            <option value="server">Servers</option>
            <option value="agent">Agent</option>
          </select>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white/60 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors duration-100"
          >
            <Clock className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['change.proposed', 'change.applied', 'server.scanned', 'agent.connected'] as const).map((action) => {
            const Icon = ACTION_ICONS[action] || AlertCircle;
            // Server-side total for this action across the org; falls back to
            // counting the loaded page if the grouped payload is absent.
            const count = actionCounts[action] ?? logs.filter(l => l.action === action).length;
            return (
              <div key={action} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${ACTION_COLORS[action]}`} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                    {ACTION_LABELS[action]}
                  </span>
                </div>
                <p className="font-mono text-2xl font-medium text-white">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Log list */}
        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white/30 font-mono text-sm">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-white/15 mx-auto mb-4" />
              <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white/60 mb-2">Failed to load</h3>
              <p className="font-sans text-xs text-white/40 mb-4">{error}</p>
              <button
                onClick={fetchLogs}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <GitCommit className="w-10 h-10 text-[rgba(255,255,255,0.15)] mx-auto mb-4" />
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No audit logs</h3>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] max-w-sm mx-auto leading-[1.6]">
              System events and actions will appear here as your team works.
            </p>
          </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredLogs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || AlertCircle;
                const color = ACTION_COLORS[log.action] || 'text-white/40';
                const label = ACTION_LABELS[log.action] || log.action;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-8 h-8 flex items-center justify-center ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{label}</span>
                        {log.server && (
                          <span className="font-mono text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded">
                            {log.server.name}
                          </span>
                        )}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="font-mono text-xs text-white/40 mt-0.5 truncate">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {log.user && (
                        <span className="font-mono text-xs text-white/30">
                          {log.user.email?.split('@')[0]}
                        </span>
                      )}
                      <span className="font-mono text-xs text-white/30">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
