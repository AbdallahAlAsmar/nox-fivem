'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  path?: string;
}

export function parseDiffLines(diff: string): DiffLine[] {
  const lines: DiffLine[] = [];
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

export function parseFileHeaders(diff: string): string[] {
  const files = new Set<string>();
  const rawLines = diff.split('\n');
  let inDiff = false;

  for (const line of rawLines) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).trim();
      if (path !== 'Proposed') {
        files.add(path);
      }
      continue;
    }
  }

  return Array.from(files);
}

interface DiffViewerProps {
  diff: string;
  maxLines?: number;
  compact?: boolean;
}

export function DiffViewer({ diff, maxLines = 200, compact = false }: DiffViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const parsedLines = parseDiffLines(diff);
  const files = parseFileHeaders(diff);
  
  const additions = parsedLines.filter(l => l.type === 'addition').length;
  const deletions = parsedLines.filter(l => l.type === 'deletion').length;
  const needsExpand = parsedLines.length > maxLines;
  const displayLines = expanded ? parsedLines : parsedLines.slice(0, maxLines);
  const truncated = parsedLines.length > maxLines;

  if (!diff || diff.trim() === '') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-white/30 font-mono text-xs">
        <FileCode className="w-3.5 h-3.5" />
        <span>No diff available</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* File badges */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] rounded font-mono text-[10px] text-[#5E6AD2]"
            >
              {file}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
        <span className="text-[#22c55e]">+{additions}</span>
        <span className="text-[#ef4444]">-{deletions}</span>
        <span className="text-white/20">{parsedLines.length} lines</span>
      </div>

      {/* Diff content */}
      <div className="font-mono text-xs leading-[1.7]">
        {displayLines.map((line, i) => (
          <div
            key={i}
            className={`flex px-3 py-0.5 ${
              line.type === 'addition'
                ? 'bg-[rgba(34,197,94,0.08)] text-[#22c55e]'
                : line.type === 'deletion'
                ? 'bg-[rgba(239,68,68,0.08)] text-[#ef4444]'
                : 'text-white/40'
            }`}
          >
            <span className="w-5 text-right mr-2 text-white/15 select-none flex-shrink-0">
              {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
            </span>
            <span className="flex-1 whitespace-pre">{line.content || ' '}</span>
          </div>
        ))}
      </div>

      {/* Expand/Collapse */}
      {truncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mx-auto px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors duration-100"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show {parsedLines.length - maxLines} more lines
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface InlineDiffPreviewProps {
  diff: string;
  className?: string;
}

export function InlineDiffPreview({ diff, className = '' }: InlineDiffPreviewProps) {
  return (
    <div className={`bg-[#0a0a0f] border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden ${className}`}>
      <DiffViewer diff={diff} compact />
    </div>
  );
}
