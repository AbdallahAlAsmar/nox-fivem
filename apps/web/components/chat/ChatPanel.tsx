'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Bot, Send, Loader2,
  Plus, Trash2, ChevronDown, Sparkles, Clock, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage, fetchServerThread, fetchThreadMessages } from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import { useAgentStatus } from '@/contexts/AgentStatusContext';

interface ChatPanelProps {
  serverId: string;
  framework: string;
  onThreadIdChange?: (threadId: string) => void;
}

const SKILLS = [
  { id: 'config-editor', name: 'Config Editor', desc: 'Edit config files' },
  { id: 'vehicle-handler', name: 'Vehicle Handler', desc: 'Modify vehicles' },
  { id: 'error-fixer', name: 'Error Fixer', desc: 'Fix errors' },
  { id: 'ui-customizer', name: 'UI Customizer', desc: 'Customize UI' },
  { id: 'resource-installer', name: 'Resource Installer', desc: 'Install resources' },
  { id: 'fivem-dev', name: 'FiveM Dev', desc: 'Complete FiveM RP engineering' },
  { id: 'lua-development', name: 'Lua Expert', desc: 'Advanced Lua & QBCore' },
  { id: 'fivem-nui', name: 'NUI Specialist', desc: 'HTML/CSS/JS UIs' },
];

type Role = 'user' | 'assistant' | 'tool';
interface ChatMsg { id: string; role: Role; content: string; timestamp: number; skillUsed?: string; }
interface Thread { id: string; serverId: string; userId: string; title?: string; status: string; createdAt: string; updatedAt: string; messageCount?: number; }

export default function ChatPanel({ serverId, framework, onThreadIdChange }: ChatPanelProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showThreadList, setShowThreadList] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected } = useAgentStatus();
  const isAgentConnected = isConnected;
  const agentStatus: 'connected' | 'disconnected' | 'checking' = isConnected ? 'connected' : 'disconnected';
  const user = useUser();
  const isDev = user.isSignedIn === false;
  const sharedUserId = isDev ? 'anonymous' : user.user?.id || 'unknown';
  const lastKnownMessageId = useRef<string | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const initThread = useCallback(async () => {
    if (!serverId) return;
    const thread = await fetchServerThread(serverId);
    if (!thread) return;
    const id = thread.id;
    setActiveThreadId(id);
    onThreadIdChange?.(id);
    setThreads([{
      id,
      serverId,
      userId: thread.userId,
      title: thread.title,
      status: thread.status,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messageCount: thread.messages?.length ?? 0,
    }]);
    setMessages(
      (thread.messages ?? []).map((m: any) => ({
        id: m.id,
        role: (m.role as Role) || 'assistant',
        content: m.content,
        timestamp: new Date(m.createdAt).getTime(),
      })),
    );
    lastKnownMessageId.current = thread.messages?.[thread.messages.length - 1]?.id ?? null;
  }, [serverId, onThreadIdChange]);

  useEffect(() => {
    initThread();
  }, [initThread]);

  useEffect(() => {
    if (!activeThreadId) return;
    const id = setInterval(async () => {
      const msgs = await fetchThreadMessages(activeThreadId);
      if (!msgs.length) return;
      const last = msgs[msgs.length - 1];
      if (lastKnownMessageId.current === last.id) return;
      lastKnownMessageId.current = last.id;
      setMessages(
        msgs.map((m: any) => ({
          id: m.id,
          role: (m.role as Role) || 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt).getTime(),
        })),
      );
    }, 2000);
    return () => clearInterval(id);
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createThread = async () => {
    await initThread();
    setShowThreadList(false);
  };

  const clearHistory = async () => {
    if (!confirm('Clear chat history for this thread?')) return;
    setMessages([]);
    await initThread();
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeThreadId) return;

    const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    const captured = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await sendChatMessage(activeThreadId, captured);
      await initThread();
      const thread = await fetchServerThread(serverId);
      if (thread) {
        setMessages(
          (thread.messages ?? []).map((m: any) => ({
            id: m.id,
            role: (m.role as Role) || 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
          })),
        );
        lastKnownMessageId.current = thread.messages?.[thread.messages.length - 1]?.id ?? null;
      }
    } catch (error) {
      await initThread();
      const thread = await fetchServerThread(serverId);
      if (thread) {
        setMessages(
          (thread.messages ?? []).map((m: any) => ({
            id: m.id,
            role: (m.role as Role) || 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
          })),
        );
        lastKnownMessageId.current = thread.messages?.[thread.messages.length - 1]?.id ?? null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-[#0a0a0f]">
      {/* Thread sidebar */}
      <AnimatePresence>
        {showThreadList && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowThreadList(false)}
              className="absolute inset-0 bg-black/60 z-20 lg:hidden"
            />
            <motion.div
              initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-[#0d0d14] z-30 flex flex-col lg:relative lg:z-0 lg:translate-x-0 lg:opacity-100"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-widest text-white/40">Chats</span>
                <button
                  onClick={createThread}
                  className="flex items-center gap-1 px-2 py-1 bg-[#5E6AD2]/15 text-[#5E6AD2] font-mono text-[10px] uppercase tracking-wider hover:bg-[#5E6AD2]/25 transition-colors"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {threads.length === 0 ? (
                  <p className="text-[10px] text-white/20 font-mono px-3 py-6 text-center">No chats yet</p>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => { setActiveThreadId(thread.id); setShowThreadList(false); onThreadIdChange?.(thread.id); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                        activeThreadId === thread.id
                          ? 'bg-[rgba(94,106,210,0.12)]'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeThreadId === thread.id ? 'text-[#5E6AD2]' : 'text-white/20'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-mono text-xs truncate ${activeThreadId === thread.id ? 'text-white' : 'text-white/50'}`}>
                            {thread.title || 'Untitled'}
                          </p>
                          <p className="font-mono text-[9px] text-white/20 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="font-mono text-[9px] text-white/15 flex-shrink-0">{thread.messageCount ?? 0}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d14]/50 flex-shrink-0">
          <button
            onClick={() => setShowThreadList(true)}
            className="lg:hidden flex items-center gap-1.5 px-2 py-1 bg-white/5 text-white/50 font-mono text-xs rounded hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="w-3 h-3" /> Chats
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full ${agentStatus === 'connected' ? 'bg-[#22c55e] animate-pulse' : agentStatus === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#f59e0b] animate-pulse'}`} />
            <span className={`font-mono text-[10px] uppercase tracking-wider ${agentStatus === 'connected' ? 'text-[#22c55e]' : agentStatus === 'disconnected' ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
              {agentStatus === 'connected' ? 'Agent Live' : agentStatus === 'disconnected' ? 'Agent Offline' : 'Checking...'}
            </span>
            <span className="font-mono text-xs text-white/50 truncate">
              {activeThread?.title || 'AI Assistant'}
            </span>
            <span className="font-mono text-[10px] text-white/20 uppercase">• {framework.toUpperCase()}</span>
          </div>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={createThread}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#5E6AD2]/15 text-[#5E6AD2] font-mono text-[10px] uppercase tracking-wider hover:bg-[#5E6AD2]/25 transition-colors"
          >
            <Plus className="w-3 h-3" /> New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {agentStatus === 'disconnected' && messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="w-12 h-12 bg-[rgba(239,68,68,0.08)] rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🔌</span>
              </div>
              <div>
                <h3 className="font-mono text-sm text-[#ef4444]/80 mb-1">Agent Not Connected</h3>
                <p className="font-sans text-xs text-white/40">
                  Open the NOX Agent desktop app to connect to your server.
                </p>
                <p className="font-sans text-xs text-white/25 mt-1">
                  Once connected, the status will update automatically.
                </p>
              </div>
            </div>
          )}
          {messages.length === 0 && agentStatus !== 'disconnected' && (
            <div className="text-center py-16 space-y-4">
              <div className="w-12 h-12 bg-[rgba(94,106,210,0.08)] rounded-2xl flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6 text-[#5E6AD2]/60" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white/60 mb-1">Start a conversation</h3>
                <p className="font-sans text-xs text-white/25">Ask about your server, config, or resources</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                {['Fix an error', 'Change HUD color', 'Add a job'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-white/3 text-white/30 font-mono text-[10px] uppercase tracking-wider rounded hover:bg-white/5 hover:text-white/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.length > 0 && (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[rgba(94,106,210,0.1)] flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-[#5E6AD2]/70" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#5E6AD2] text-white'
                      : 'bg-[#14141e] text-white/80'
                  }`}
                >
                  {msg.skillUsed && msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 text-[9px] text-[#5E6AD2]/60 mb-1 font-mono uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" /> {msg.skillUsed}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className="text-[9px] text-white/15 mt-1.5 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[10px] text-white/40 font-mono">U</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[rgba(94,106,210,0.1)] flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3 h-3 text-[#5E6AD2]/70" />
              </div>
              <div className="bg-[#14141e] rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white/20" />
                <span className="text-xs text-white/20 font-mono">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Skills bar */}
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0 bg-[#0d0d14]/30">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/15 flex-shrink-0">Skills:</span>
          <div className="relative">
            <button
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white/5 text-white/40 font-mono rounded hover:bg-white/10 hover:text-white/60 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {selectedSkills.length > 0 ? `${selectedSkills.length} selected` : 'Select'}
            </button>
            <AnimatePresence>
              {showSkillPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-[#14141e] rounded-lg shadow-xl p-2 z-10"
                >
                  <div className="grid grid-cols-1 gap-1">
                    {SKILLS.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => { toggleSkill(skill.id); setShowSkillPicker(false); }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                          selectedSkills.includes(skill.id)
                            ? 'bg-[rgba(94,106,210,0.12)]'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <Sparkles className={`w-3 h-3 flex-shrink-0 ${selectedSkills.includes(skill.id) ? 'text-[#5E6AD2]' : 'text-white/20'}`} />
                        <div>
                          <p className={`font-mono text-[10px] ${selectedSkills.includes(skill.id) ? 'text-white' : 'text-white/50'}`}>{skill.name}</p>
                          <p className="font-sans text-[9px] text-white/20">{skill.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {selectedSkills.map((id) => {
            const skill = SKILLS.find((s) => s.id === id);
            return skill ? (
              <button
                key={id}
                onClick={() => toggleSkill(id)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[rgba(94,106,210,0.12)] text-[#5E6AD2] font-mono rounded hover:bg-[rgba(94,106,210,0.2)] transition-colors"
              >
                {skill.name} <span className="ml-0.5">×</span>
              </button>
            ) : null;
          })}
        </div>

        {/* Input */}
        <div className="p-3 flex-shrink-0 bg-[#0d0d14]/30">
          {agentStatus === 'disconnected' && (
            <div className="mb-2 px-3 py-2 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg">
              <p className="font-mono text-[10px] text-[#ef4444]/80 uppercase tracking-wider">
                ⚠ Agent not connected — open NOX Agent app to enable AI assistance
              </p>
            </div>
          )}
          <div className="flex gap-2 max-w-4xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about your server..."
              disabled={isLoading || !activeThreadId || agentStatus === 'disconnected'}
              className="flex-1 px-4 py-2.5 bg-[#0a0a0f] text-white font-mono text-sm placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/40 disabled:opacity-40 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !activeThreadId || agentStatus === 'disconnected'}
              className="px-4 py-2.5 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4f5bc0] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}