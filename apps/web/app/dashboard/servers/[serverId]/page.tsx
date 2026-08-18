'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Bot,
  Send,
  Loader2,
  Sparkles,
  FileDiff,
  Package,
  Settings,
  Terminal,
  Play,
  Pause,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  X,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage, fetchServer, scanResources, applyChange } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ServerData {
  id: string;
  name: string;
  framework: string;
  status: string;
  lastSeenAt: string;
  resourceCount: number;
  hasAgent: boolean;
  resources?: Array<{ name: string; path: string; dependencies?: string[] }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  skillUsed?: string;
}

interface Change {
  id: string;
  file: string;
  diff: string;
  status: 'pending' | 'applied' | 'rolled_back';
  timestamp: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'changes', label: 'Changes', icon: FileDiff },
  { id: 'resources', label: 'Resources', icon: Package },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

const SKILLS = [
  { id: 'config-editor', name: 'Config Editor', icon: 'Settings', description: 'Edit config files' },
  { id: 'vehicle-handler', name: 'Vehicle Handler', icon: 'Car', description: 'Modify vehicles' },
  { id: 'error-fixer', name: 'Error Fixer', icon: 'Bug', description: 'Fix errors' },
  { id: 'ui-customizer', name: 'UI Customizer', icon: 'Palette', description: 'Customize UI' },
  { id: 'npc-spawner', name: 'NPC Spawner', icon: 'User', description: 'Add NPCs' },
  { id: 'resource-installer', name: 'Resource Installer', icon: 'Package', description: 'Install resources' },
  { id: 'dependency-checker', name: 'Dependency Checker', icon: 'Zap', description: 'Check dependencies' },
  { id: 'performance-analyzer', name: 'Performance Analyzer', icon: 'Zap', description: 'Optimize performance' },
];

// ─── Page Component ────────────────────────────────────────────────────────────

export default function ServerDetailPage() {
  const params = useParams<{ serverId: string }>();
  const router = useRouter();
  const serverId = params?.serverId ?? '';
  const threadId = `thread_${serverId}`;

  const [activeTab, setActiveTab] = useState('chat');
  const [server, setServer] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch server data
  useEffect(() => {
    fetchServer(serverId)
      .then(data => {
        if (data) setServer(data);
        else setError('Server not found');
      })
      .catch(() => setError('Failed to load server'))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <ServerSkeleton />;
  if (error) return <ServerError error={error} onRetry={() => router.refresh()} />;
  if (!server) return <NotFound />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
      {/* Header */}
      <header className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-4 flex-shrink-0 gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <div className="h-4 w-px bg-[rgba(255,255,255,0.08)]" />

        {/* Server info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 flex-shrink-0 ${
            server.status === 'online' ? 'bg-[#22c55e] animate-pulse' :
            server.status === 'offline' ? 'bg-[rgba(255,255,255,0.2)]' :
            'bg-[#f59e0b] animate-pulse'
          }`} />
          <div className="min-w-0">
            <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-white truncate">{server.name}</h1>
            <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider">
              {server.framework.toUpperCase()} • {server.status}
              {server.hasAgent && <span className="text-[#22c55e] ml-1">• Agent Connected</span>}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              scanResources(serverId).then(() => router.refresh());
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]">
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">Start</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]">
            <Pause className="w-3 h-3" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/30 flex items-center px-4 gap-1 flex-shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                isActive
                  ? 'text-white bg-[rgba(94,106,210,0.15)] border-b-2 border-[#5E6AD2]'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <ChatTab key="chat" serverId={serverId} threadId={threadId} framework={server.framework} />
          )}
          {activeTab === 'changes' && (
            <ChangesTab key="changes" serverId={serverId} />
          )}
          {activeTab === 'resources' && (
            <ResourcesTab key="resources" serverId={serverId} resources={server.resources} />
          )}
          {activeTab === 'console' && (
            <ConsoleTab key="console" serverId={serverId} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab key="settings" serverId={serverId} server={server} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chat Tab ──────────────────────────────────────────────────────────────────

function ChatTab({ serverId, threadId, framework }: { serverId: string; threadId: string; framework: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`chat_${threadId}`);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {}
    }
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId],
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    localStorage.setItem(`chat_${threadId}`, JSON.stringify(updated.slice(-100)));
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(threadId, userMsg.content);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response?.response || 'Response received.',
        timestamp: Date.now(),
        skillUsed: selectedSkills[0],
      };
      const final = [...updated, assistantMsg];
      setMessages(final);
      localStorage.setItem(`chat_${threadId}`, JSON.stringify(final.slice(-100)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, there was an error. Please try again.',
        timestamp: Date.now(),
      };
      const final = [...updated, errMsg];
      setMessages(final);
      localStorage.setItem(`chat_${threadId}`, JSON.stringify(final.slice(-100)));
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(`chat_${threadId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Skill bar */}
      <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/30 flex items-center px-4 gap-2 flex-shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.3)] mr-1">
          Skills
        </span>
        <button
          onClick={() => setShowSkillPicker(!showSkillPicker)}
          className="flex items-center gap-1.5 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors duration-100"
        >
          {selectedSkills.length > 0 ? `${selectedSkills.length} selected` : 'Select'}
        </button>
        {selectedSkills.map(skillId => {
          const skill = SKILLS.find(s => s.id === skillId);
          return skill ? (
            <button
              key={skillId}
              onClick={() => toggleSkill(skillId)}
              className="flex items-center gap-1 px-2 py-0.5 font-mono text-xs uppercase tracking-wider bg-[rgba(94,106,210,0.15)] text-[#5E6AD2] border border-[rgba(94,106,210,0.3)] hover:bg-[rgba(94,106,210,0.2)] transition-colors duration-100"
            >
              {skill.name}
              <span className="ml-0.5 opacity-60">×</span>
            </button>
          ) : null;
        })}

        <AnimatePresence>
          {showSkillPicker && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-full left-0 mt-1 w-64 bg-[#16161E] border border-[rgba(255,255,255,0.18)] z-20 p-2"
            >
              <div className="grid grid-cols-2 gap-1">
                {SKILLS.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => { toggleSkill(skill.id); setShowSkillPicker(false); }}
                    className={`p-2 text-left transition-colors duration-100 border ${
                      selectedSkills.includes(skill.id)
                        ? 'bg-[rgba(94,106,210,0.15)] border-[rgba(94,106,210,0.3)]'
                        : 'hover:bg-[rgba(255,255,255,0.04)] border-transparent'
                    }`}
                  >
                    <div className="font-mono text-xs uppercase tracking-wider text-white">{skill.name}</div>
                    <p className="font-sans text-[10px] text-[rgba(255,255,255,0.35)] leading-tight">{skill.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6 text-[#5E6AD2]" />
            </div>
            <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white mb-1.5">Start a conversation</h3>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">
              Select skills above, then ask about your {framework} server.
            </p>
            <div className="font-mono text-xs text-[rgba(255,255,255,0.25)] space-y-1">
              <p>"Change my HUD color to blue"</p>
              <p>"Fix this error: attempt to index a nil value"</p>
              <p>"Add a ped spawn point"</p>
            </div>
          </div>
        )}

        {error && (
          <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 items-start"
          >
            <div className="w-7 h-7 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-[#5E6AD2]" />
            </div>
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] px-3.5 py-2.5 flex items-center gap-2 max-w-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[rgba(255,255,255,0.3)]" />
              <span className="font-mono text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Thinking…</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[rgba(255,255,255,0.08)] p-3 flex-shrink-0 bg-[#0F0F14]">
        <div className="flex gap-2 max-w-3xl">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask about your server… (Ctrl+K to focus)"
            className="flex-1 px-3.5 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white font-sans placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100 disabled:opacity-50"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-3 bg-white text-[#0F0F14] hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
          <button
            onClick={clearHistory}
            disabled={messages.length === 0 || isLoading}
            className="px-2.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)] hover:text-white disabled:opacity-20 transition-colors duration-100 border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)]"
            title="Clear chat history"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-[#5E6AD2]" />
        </div>
      )}
      <div className={`max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-[#5E6AD2] text-[#0F0F14]'
          : 'bg-[#16161E] text-[rgba(255,255,255,0.85)] border border-[rgba(255,255,255,0.08)]'
      }`}>
        {message.skillUsed && !isUser && (
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#5E6AD2] mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {message.skillUsed}
          </div>
        )}
        <p className="whitespace-pre-wrap font-sans">{message.content}</p>
        <p className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="w-7 h-7 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageSquare className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />
        </div>
      )}
    </motion.div>
  );
}

// ─── Changes Tab ───────────────────────────────────────────────────────────────

function ChangesTab({ serverId }: { serverId: string }) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from API
    // For now, use mock data
    const mockChanges: Change[] = [
      { id: '1', file: 'config/server.cfg', diff: '- set server_hostname "My Server"\n+ set server_hostname "NOX Roleplay"', status: 'pending', timestamp: Date.now() - 60000 },
      { id: '2', file: 'resources/[gameplay]/gamemode/config.lua', diff: '- set ghostMode 0\n+ set ghostMode 1', status: 'pending', timestamp: Date.now() - 300000 },
      { id: '3', file: 'resources/[system]/players/client.lua', diff: '- SetTimeout(500, function()\n+ SetTimeout(1000, function()', status: 'applied', timestamp: Date.now() - 600000 },
    ];
    setChanges(mockChanges);
    setLoading(false);
  }, [serverId]);

  const handleApply = async (id: string) => {
    try {
      await applyChange(id);
      setChanges(prev => prev.map(c => c.id === id ? { ...c, status: 'applied' } : c));
    } catch (err) {
      console.error('Failed to apply change:', err);
    }
  };

  if (loading) return <div className="p-6 text-center text-[rgba(255,255,255,0.4)] font-mono text-xs uppercase tracking-wider">Loading changes…</div>;

  const pending = changes.filter(c => c.status === 'pending');
  const applied = changes.filter(c => c.status === 'applied');

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {pending.length === 0 && applied.length === 0 ? (
        <div className="text-center py-20">
          <FileDiff className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No pending changes</h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">AI changes will appear here for review</p>
        </div>
      ) : (
        <>
          {pending.map(change => (
            <ChangeCard key={change.id} change={change} onApply={() => handleApply(change.id)} />
          ))}
          {applied.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">Applied</h3>
              {applied.map(change => (
                <div key={change.id} className="bg-[#16161E] border border-[rgba(34,197,94,0.2)] p-3 mb-2 opacity-70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                    <code className="font-mono text-xs text-[rgba(255,255,255,0.6)]">{change.file}</code>
                    <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] ml-auto">
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChangeCard({ change, onApply }: { change: Change; onApply: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileDiff className="w-4 h-4 text-[#5E6AD2]" />
            <code className="font-mono text-xs uppercase tracking-wider text-white">{change.file}</code>
          </div>
          <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
            {new Date(change.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[rgba(255,255,255,0.4)] hover:text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide diff' : 'View diff'}
        </button>
        {expanded && (
          <pre className="font-mono text-xs text-[rgba(255,255,255,0.6)] bg-[#0A0A0F] p-3 mt-2 overflow-x-auto whitespace-pre">
            {change.diff}
          </pre>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
          >
            <CheckCircle2 className="w-3 h-3" />
            Apply
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]">
            <X className="w-3 h-3" />
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resources Tab ─────────────────────────────────────────────────────────────

function ResourcesTab({ serverId, resources }: { serverId: string; resources?: Array<{ name: string; path: string; dependencies?: string[] }> }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = (resources ?? []).filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Resources</h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">{filtered.length} resources found</p>
        </div>
        <button
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1000); }}
          className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Rescan
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search resources…"
        className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100 mb-4"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No resources found</h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">Run a scan to discover your server resources</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((resource, i) => (
            <motion.div
              key={resource.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-3 flex items-center gap-3 hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100"
            >
              <Package className="w-4 h-4 text-[#5E6AD2] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs uppercase tracking-wider text-white truncate">{resource.name}</p>
                <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] truncate">{resource.path}</p>
              </div>
              {resource.dependencies && resource.dependencies.length > 0 && (
                <div className="flex gap-1">
                  {resource.dependencies.slice(0, 3).map((dep: string) => (
                    <span key={dep} className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5">
                      {dep}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Console Tab ───────────────────────────────────────────────────────────────

function ConsoleTab({ serverId }: { serverId: string }) {
  const [logs, setLogs] = useState<string[]>([
    '[info] Server started',
    '[info] Loading resources...',
    '[info] Starting resource autoexec',
    '[info] Starting resource baseline',
    '[info] Starting resource chat',
    '[warn] Resource "chat" took too long to start',
    '[info] 48/48 players connected.',
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulate live console
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      const messages = [
        '[info] Player connected: John Doe (steam:110000123456789)',
        '[info] Player disconnected: Jane Smith',
        '[warn] High memory usage detected',
        '[info] Resource "qb-core" restarted',
        '[info] Command executed: /help',
      ];
      setLogs(prev => [...prev.slice(-100), messages[Math.floor(Math.random() * messages.length)]]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0F] flex items-center px-4 gap-2 flex-shrink-0">
        <button
          onClick={() => setIsStreaming(!isStreaming)}
          className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
            isStreaming
              ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]'
              : 'text-[rgba(255,255,255,0.5)] hover:text-white border border-[rgba(255,255,255,0.08)]'
          }`}
        >
          {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isStreaming ? 'Streaming' : 'Start'}
        </button>
        <button
          onClick={() => setLogs([])}
          className="px-3 py-1 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
        >
          Clear
        </button>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
          {logs.length} lines
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[#0A0A0F] font-mono text-xs">
        {logs.map((log, i) => (
          <div key={i} className={`py-0.5 ${
            log.includes('[error]') ? 'text-[#ef4444]' :
            log.includes('[warn]') ? 'text-[#f59e0b]' :
            'text-[rgba(255,255,255,0.6)]'
          }`}>
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ serverId, server }: { serverId: string; server: ServerData }) {
  const [copied, setCopied] = useState(false);

  const copyServerId = async () => {
    await navigator.clipboard.writeText(serverId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Server Settings</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Manage server configuration</p>
      </div>

      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Server Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Name</label>
            <p className="font-mono text-sm text-white">{server.name}</p>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Framework</label>
            <p className="font-mono text-sm text-white">{server.framework.toUpperCase()}</p>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Status</label>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                server.status === 'online' ? 'bg-[#22c55e]' :
                server.status === 'offline' ? 'bg-[rgba(255,255,255,0.2)]' :
                'bg-[#f59e0b]'
              }`} />
              <p className="font-mono text-sm text-white uppercase">{server.status}</p>
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Last Seen</label>
            <p className="font-mono text-sm text-white">
              {server.lastSeenAt ? new Date(server.lastSeenAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Server ID</label>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] font-mono text-xs text-[#5E6AD2] truncate">
              {serverId}
            </code>
            <button
              onClick={copyServerId}
              className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
            <RefreshCw className="w-4 h-4" />
            Restart Agent
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
            <ExternalLink className="w-4 h-4" />
            Open in Web Dashboard
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[#ef4444] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.05)] transition-colors duration-100">
            <X className="w-4 h-4" />
            Revoke Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function ServerSkeleton() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
      <div className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-4 gap-4">
        <div className="w-12 h-4 bg-[rgba(255,255,255,0.06)] animate-pulse" />
        <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-4 bg-[rgba(255,255,255,0.06)] animate-pulse" />
            <div className="w-24 h-3 bg-[rgba(255,255,255,0.04)] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-10 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/30 flex items-center px-4 gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-16 h-6 bg-[rgba(255,255,255,0.04)] animate-pulse rounded-sm" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-[rgba(255,255,255,0.03)] animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

function ServerError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-[#ef4444]" />
        </div>
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">Something went wrong</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 mx-auto"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="font-mono text-8xl font-bold text-[rgba(255,255,255,0.1)] mb-4">404</div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white mb-2">Server Not Found</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-6">The server you're looking for doesn't exist or has been removed.</p>
        <Link href="/dashboard" className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
