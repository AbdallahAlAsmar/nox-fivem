'use client';

import { useAgentStatus } from '@/contexts/AgentStatusContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function AgentStatusBadge() {
  const { status, isConnected, isChecking } = useAgentStatus();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 bg-white/5">
      <AnimatePresence mode="wait">
        {isChecking ? (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-3 h-3 animate-spin text-white/40" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              Checking...
            </span>
          </motion.div>
        ) : isConnected ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              Agent Online
            </span>
            {status.total > 0 && (
              <span className="font-mono text-[9px] text-emerald-400/60">
                ({status.total})
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <XCircle className="w-3 h-3 text-rose-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400">
              Agent Offline
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
