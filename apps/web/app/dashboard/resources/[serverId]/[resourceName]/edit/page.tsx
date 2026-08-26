'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Hash,
  Download,
  RotateCcw,
  Plus,
  X,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { fetchServer, fetchServerResources, fetchResourceConfig, saveResourceConfig } from '@/lib/api';
import { ORCHESTRATOR_URL } from '@/lib/config';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

export default function ResourceEditorPage() {
  const params = useParams<{ serverId: string; resourceName: string }>();
  const router = useRouter();
  const serverId = params?.serverId ?? '';
  const resourceName = decodeURIComponent(params?.resourceName ?? '');
  const [content, setContent] = useState('');
  const [originalSha256, setOriginalSha256] = useState('');
  const [modifiedAt, setModifiedAt] = useState('');
  const [manifestPath, setManifestPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverName, setServerName] = useState('');
  const [isDark] = useState(true);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [resourceList, setResourceList] = useState<{ name: string; path: string }[]>([]);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [autoSave] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const ORCH_URL = ORCHESTRATOR_URL;

  // Load server info and resource list
  useEffect(() => {
    if (!serverId) return;
    fetchServer(serverId).then((data) => {
      if (data) setServerName(data.name || 'Unknown Server');
    });
    fetchServerResources(serverId).then((res) => {
      if (res && res.length > 0) setResourceList(res);
    });
  }, [serverId]);

  // Load config for the selected resource
  useEffect(() => {
    if (!serverId || !resourceName) return;
    setErrorMsg(null);
    setSaveMsg(null);
    fetchResourceConfig(serverId, resourceName).then((data) => {
      if (data?.content !== undefined) {
        setContent(data.content);
        setOriginalSha256(data.sha256);
        setModifiedAt(data.modifiedAt);
        setManifestPath(data.manifestPath);
      } else {
        setContent('');
        setOriginalSha256('');
        setManifestPath('');
        setErrorMsg(data?.error || 'Failed to load config');
      }
    }).catch(() => {
      setErrorMsg('Failed to load config — ensure agent is connected');
    });
  }, [serverId, resourceName]);

  const handleSave = async () => {
    if (!serverId || !resourceName || saving) return;
    setSaving(true);
    setSaveMsg(null);
    setErrorMsg(null);
    try {
      const result = await saveResourceConfig(serverId, resourceName, content, originalSha256 || undefined);
      if (result.success) {
        setOriginalSha256(result.sha256);
        setModifiedAt(new Date().toISOString());
        setSaveMsg('Config saved successfully');
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        setErrorMsg('Failed to save config');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resourceName.endsWith('.lua') ? resourceName : `${resourceName}/fxmanifest.lua`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRevert = () => {
    if (!window.confirm('Revert all changes? This will reload the file from the server.')) return;
    fetchResourceConfig(serverId, resourceName).then((data) => {
      if (data?.content !== undefined) {
        setContent(data.content);
        setOriginalSha256(data.sha256);
        setModifiedAt(data.modifiedAt);
        setErrorMsg(null);
      }
    }).catch(() => setErrorMsg('Failed to revert'));
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const lineCount = content.split('\n').length;
  const currentLine = content.substring(0, selectedRange?.start ?? content.length).split('\n').length;
  const currentCol = selectedRange
    ? selectedRange.start - content.lastIndexOf('\n', selectedRange.start - 1)
    : content.length - content.lastIndexOf('\n');

  const filteredResources = resourceList.filter((r) =>
    r.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    (r.path ?? '').toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-[#f3f4f6] text-gray-900'}`}>
      {/* Top bar */}
      <div className={`h-14 border-b flex items-center px-4 gap-4 flex-shrink-0 transition-colors duration-150 ${isDark ? 'border-white/5 bg-[#16161E]/30' : 'border-gray-200 bg-white'}`}>
        <Link
          href={`/dashboard/servers/${serverId}`}
          className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDark ? 'bg-[#22c55e]' : 'bg-green-500'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs uppercase tracking-wider truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {serverName || 'Loading...'}
              </span>
              <span className={`nox-badge font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 flex-shrink-0 ${isDark ? 'text-white/50 bg-white/5' : 'text-gray-500 bg-gray-100'}`}>
                {resourceName}
              </span>
            </div>
            {manifestPath && (
              <p className={`font-mono text-[10px] mt-0.5 truncate ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                <FolderOpen className="w-2.5 h-2.5 inline mr-1" />
                {manifestPath}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Resource picker */}
          <div className="relative">
            <button
              onClick={() => setShowResourcePicker(!showResourcePicker)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/5 border-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-gray-200'}`}
            >
              <FolderOpen className="w-3 h-3" />
              <span>Resource</span>
              <span className={`ml-1 text-[10px] max-w-[120px] truncate ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{resourceName}</span>
            </button>

            <AnimatePresence>
              {showResourcePicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowResourcePicker(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`absolute right-0 top-full mt-2 w-80 z-50 shadow-2xl rounded-lg border overflow-hidden ${isDark ? 'bg-[#16161E] border-white/10' : 'bg-white border-gray-200'}`}
                  >
                    <div className={`p-3 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search resources..."
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          className={`w-full pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none ${isDark ? 'bg-[#0a0a0f] border border-white/10 text-white placeholder:text-white/20' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredResources.length === 0 ? (
                        <div className={`p-4 text-center font-mono text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                          No resources found
                        </div>
                      ) : (
                        filteredResources.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              router.push(`/dashboard/resources/${serverId}/${encodeURIComponent(r.name)}/edit`);
                              setShowResourcePicker(false);
                              setPickerSearch('');
                            }}
                            className={`w-full text-left px-3 py-2.5 font-mono text-xs flex items-center gap-2 transition-colors ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                          >
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{r.name}</span>
                            {r.name === resourceName && (
                              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-[#3DFFA2]/20 text-[#3DFFA2]' : 'bg-indigo-50 text-indigo-600'}`}>
                                current
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <button
            onClick={handleRevert}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/5 border-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-gray-200'}`}
          >
            <RotateCcw className="w-3 h-3" />
            Revert
          </button>

          <button
            onClick={handleDownload}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/5 border-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-gray-200'}`}
          >
            <Download className="w-3 h-3" />
            Download
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !content}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#3DFFA2] hover:bg-[#36d98c] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Toast messages */}
      <div className="fixed top-16 right-6 z-50 space-y-2">
        <AnimatePresence>
          {saveMsg && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className={`font-mono text-xs uppercase tracking-wider px-4 py-2.5 border ${isDark ? 'bg-[#16161E] border-[rgba(61,255,162,0.4)] text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 text-[#22c55e]" />
              {saveMsg}
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 border bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#ef4444]"
            >
              <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {errorMsg && !content && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-[rgba(239,68,68,0.4)]' : 'text-red-400'}`} />
              <h2 className={`font-mono text-sm uppercase tracking-wider mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {errorMsg}
              </h2>
              <p className={`font-sans text-xs mb-4 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Ensure the NOXES agent is connected to this server, then try again.
              </p>
              <button
                onClick={() => router.push(`/dashboard/servers/${serverId}`)}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 bg-[#3DFFA2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#36d98c] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Server
              </button>
            </div>
          </div>
        )}

        {!errorMsg && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor toolbar */}
            <div className={`h-9 border-b flex items-center px-3 gap-3 flex-shrink-0 transition-colors duration-150 ${isDark ? 'border-white/5 bg-[#16161E]/30' : 'border-gray-200 bg-gray-50'}`}>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {resourceName}
              </span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>|</span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {lineCount} lines
              </span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>|</span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {wordCount} words
              </span>
              {lastSaved && (
                <>
                  <span className={`font-mono text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>|</span>
                  <span className={`font-mono text-[10px] flex items-center gap-1 ${isDark ? 'text-[#22c55e]/50' : 'text-green-600'}`}>
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Saved {lastSaved}
                  </span>
                </>
              )}
              <div className="flex-1" />
              <span className={`font-mono text-[10px] flex items-center gap-1 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
                <Hash className="w-2.5 h-2.5" />
                {originalSha256.slice(0, 8)}...
              </span>
            </div>

            {/* Code editor */}
            <div className="flex-1 overflow-hidden relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={(e) => {
                  const ta = e.target as HTMLTextAreaElement;
                  setSelectedRange({ start: ta.selectionStart, end: ta.selectionEnd });
                }}
                onMouseUp={(e) => {
                  const ta = e.target as HTMLTextAreaElement;
                  setSelectedRange({ start: ta.selectionStart, end: ta.selectionEnd });
                }}
                onClick={(e) => {
                  const ta = e.target as HTMLTextAreaElement;
                  setSelectedRange({ start: ta.selectionStart, end: ta.selectionEnd });
                }}
                spellCheck={false}
                className={`w-full h-full p-4 font-mono text-xs resize-none focus:outline-none overflow-auto transition-colors duration-150 ${
                  isDark
                    ? 'bg-[#0a0a0f] text-[#e2e8f0] selection:bg-[#3DFFA2]/30 selection:text-white'
                    : 'bg-white text-gray-800 selection:bg-indigo-100 selection:text-indigo-900'
                }`}
                style={{
                  tabSize: 2,
                  lineHeight: '1.6',
                  minHeight: '100%',
                }}
              />

              {/* Line number gutter (visual only, absolute positioned) */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-12 pointer-events-none font-mono text-xs overflow-hidden select-none transition-colors duration-150 ${
                  isDark ? 'bg-[#0f0f14] text-white/15' : 'bg-gray-50 text-gray-300'
                }`}
                style={{ padding: '1rem 0.5rem', lineHeight: '1.6' }}
              >
                {Array.from({ length: Math.min(lineCount, 200) }, (_, i) => (
                  <div key={i} className="text-right pr-2">
                    {i + 1}
                  </div>
                ))}
                {lineCount > 200 && (
                  <div className={`text-center py-1 font-mono text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
                    +{lineCount - 200} more
                  </div>
                )}
              </div>

              {/* Offset the textarea padding to account for gutter */}
              <style>{`
                textarea[ref] { padding-left: 3.5rem; }
              `}</style>
            </div>

            {/* Bottom status bar */}
            <div className={`h-7 border-t flex items-center px-3 gap-4 flex-shrink-0 transition-colors duration-150 ${isDark ? 'border-white/5 bg-[#16161E]/50' : 'border-gray-200 bg-white'}`}>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                Ln {currentLine}, Col {currentCol}
              </span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>|</span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {content.length} chars
              </span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>|</span>
              <span className={`font-mono text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                UTF-8
              </span>
              <div className="flex-1" />
              {modifiedAt && (
                <span className={`font-mono text-[10px] flex items-center gap-1 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
                  <Clock className="w-2.5 h-2.5" />
                  Modified {new Date(modifiedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}