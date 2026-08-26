'use client';

import { useState, useEffect } from 'react';
import { FileDiff, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Change {
  id: string;
  serverId: string;
  threadId?: string;
  filesTouched: string[];
  diff: string;
  status: 'pending' | 'approved' | 'applied' | 'failed' | 'rolled_back';
  createdByUserId?: string;
  approvedByUserId?: string;
  gitCheckpointSha?: string;
  gitCommitSha?: string;
  createdAt: string;
  approvedAt?: string;
  appliedAt?: string;
}

interface ChangeApprovalModalProps {
  change: Change;
  onApprove: (id: string) => Promise<void>;
  onDeny: (id: string) => Promise<void>;
  onClose: () => void;
}

function parseDiffLines(diff: string) {
  const lines: Array<{ type: 'context' | 'addition' | 'deletion' | 'header'; content: string; path?: string }> = [];
  const rawLines = diff.split('\n');
  
  let inDiff = false;
  let currentPath = '';
  
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
    
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).trim();
      if (path !== 'Proposed') {
        currentPath = path;
      }
      continue;
    }
    if (line.startsWith('--- ')) continue;
    
    if (line.startsWith('+')) {
      lines.push({ type: 'addition', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      lines.push({ type: 'deletion', content: line.slice(1) });
    } else {
      lines.push({ type: 'context', content: line });
    }
  }
  
  return lines;
}

export function ChangeApprovalModal({ change, onApprove, onDeny, onClose }: ChangeApprovalModalProps) {
  const diffLines = parseDiffLines(change.diff);
  
  const additions = diffLines.filter(l => l.type === 'addition').length;
  const deletions = diffLines.filter(l => l.type === 'deletion').length;
  const files = change.filesTouched.length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-3xl bg-[#0d0d14] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0a0a0f] border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[rgba(61,255,162,0.15)] border border-[rgba(61,255,162,0.3)] rounded-lg flex items-center justify-center">
              <FileDiff className="w-4 h-4 text-[#3DFFA2]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-medium text-white">Review Changes</h3>
              <p className="font-mono text-xs text-white/40">
                {files} file{files !== 1 ? 's' : ''} • {additions} additions, {deletions} deletions
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        
        {/* Files list */}
        <div className="px-5 py-3 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex flex-wrap gap-2">
            {change.filesTouched.map((file, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.2)] rounded font-mono text-xs text-[#3DFFA2]"
              >
                {file}
              </span>
            ))}
          </div>
        </div>
        
        {/* Diff viewer */}
        <div className="max-h-96 overflow-y-auto border-x border-b border-[rgba(255,255,255,0.08)]">
          <div className="font-mono text-xs">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={`flex px-4 py-0.5 ${
                  line.type === 'addition'
                    ? 'bg-[rgba(34,197,94,0.08)] text-[#22c55e]'
                    : line.type === 'deletion'
                    ? 'bg-[rgba(239,68,68,0.08)] text-[#ef4444]'
                    : 'text-white/50'
                }`}
              >
                <span className="w-6 text-right mr-3 text-white/20 select-none">
                  {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
                </span>
                <span className="flex-1">{line.content || ' '}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0a0a0f] border-t border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 text-white/40">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">
              {new Date(change.createdAt).toLocaleString()}
            </span>
            {change.gitCheckpointSha && (
              <span className="font-mono text-[10px] text-white/20">
                checkpoint: {change.gitCheckpointSha.slice(0, 7)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDeny(change.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 border border-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={() => onApprove(change.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs uppercase tracking-wider bg-[#3DFFA2] hover:bg-[#4f5bc4] text-white rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface PendingChangesBarProps {
  changes: Change[];
  onReview: (change: Change) => void;
}

export function PendingChangesBar({ changes, onReview }: PendingChangesBarProps) {
  if (changes.length === 0) return null;
  
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-40 bg-[#16161E]/95 backdrop-blur-sm border-b border-[rgba(61,255,162,0.3)] px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[rgba(61,255,162,0.15)] border border-[rgba(61,255,162,0.3)] rounded">
            <AlertCircle className="w-3.5 h-3.5 text-[#3DFFA2]" />
            <span className="font-mono text-xs text-[#3DFFA2]">
              {changes.length} pending change{changes.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <span className="font-mono text-xs text-white/40 hidden sm:block">
            Review before applying to your server
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReview(changes[0])}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3DFFA2] hover:bg-[#4f5bc4] text-white font-mono text-xs uppercase tracking-wider rounded-lg transition-colors"
          >
            <FileDiff className="w-3.5 h-3.5" />
            Review Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
}
