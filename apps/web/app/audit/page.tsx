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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.action.startsWith(filter.split('.')[0]));

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] rounded-xl flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-[#5E6AD2]" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-medium text-white">Audit Log</h1>
              <p className="font-mono text-xs text-white/40">Track all actions and changes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#0d0d14] border border-[rgba(255,255,255,0.1)] text-white/70 font-mono text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[rgba(94,106,210,0.5)]"
            >
              <option value="all">All Actions</option>
              <option value="change">Changes</option>
              <option value="server">Servers</option>
              <option value="agent">Agent</option>
            </select>

            <button
              onClick={fetchLogs}
              className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log list */}
        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white/30 font-mono text-sm">Loading...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-white/30 font-mono text-sm">No audit logs found</div>
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
                        <span className="font-mono text-xs text-white/30 hidden sm:block">
                          {log.user.email}
                        </span>
                      )}
                      <span className="font-mono text-xs text-white/20">
                        {new Date(log.createdAt).toLocaleString()}
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
