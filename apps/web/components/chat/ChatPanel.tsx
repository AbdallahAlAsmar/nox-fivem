'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Bot, Send, Loader2, AlertCircle,
  Plus, Trash2, ChevronDown, Sparkles, Clock, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage, fetchServerThread, fetchThreadMessages } from '@/lib/api';
import { useUser } from '@clerk/nextjs';

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
  const [threadHistoryLoading, setThreadHistoryLoading] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useUser();
  const isDev = user.isSignedIn === false;
  const sharedUserId = isDev ? 'anonymous' : user.user?.id || 'unknown';
  const lastKnownMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (!serverId) return;
    fetch(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'}/api/servers/${serverId}`)
      .then((r) => r.json())
      .then((data) => setIsAgentConnected(!!data?.hasAgent))
      .catch(() => setIsAgentConnected(false));
  }, [serverId]);

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
    if (!serverId) return;
    fetch(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'}/api/servers/${serverId}`)
      .then((r) => r.json())
      .then((data) => setIsAgentConnected(!!data?.hasAgent))
      .catch(() => setIsAgentConnected(false));
  }, [serverId]);

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

  const deleteChat = async (_threadId: string, _e: React.MouseEvent) => {
    // one thread per user/server — no manual delete
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
      const response = await sendChatMessage(activeThreadId, captured);
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
    <div className="flex h-full bg-[#0F0F14]">
      {/* Thread sidebar */}
      <AnimatePresence>
        {showThreadList && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowThreadList(false)}
              className="absolute inset-0 bg-black/50 z-20 lg:hidden"
            />
            <motion.div
              initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-[#16161E] border-r border-white/8 z-30 flex flex-col lg:relative lg:z-0 lg:translate-x-0 lg:opacity-100"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <span className="font-mono text-xs uppercase tracking-widest text-white/60">Chats</span>
                <button
                  onClick={createThread}
                  className="flex items-center gap-1 px-2 py-1 bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 text-[#5E6AD2] font-mono text-[10px] uppercase tracking-wider hover:bg-[#5E6AD2]/30 transition-colors"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {threads.length === 0 ? (
                  <p className="text-[10px] text-white/25 font-mono px-3 py-6 text-center">No chats yet</p>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => { setActiveThreadId(thread.id); setShowThreadList(false); onThreadIdChange?.(thread.id); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                        activeThreadId === thread.id
                          ? 'bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)]'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeThreadId === thread.id ? 'text-[#5E6AD2]' : 'text-white/30'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-mono text-xs truncate ${activeThreadId === thread.id ? 'text-white' : 'text-white/60'}`}>
                            {thread.title || 'Untitled'}
                          </p>
                          <p className="font-mono text-[9px] text-white/25 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="font-mono text-[9px] text-white/20 flex-shrink-0">{thread.messageCount ?? 0}</span>
                        <button
                          onClick={(e) => deleteChat(thread.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-[#ef4444]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#16161E]/30 flex-shrink-0">
          <button
            onClick={() => setShowThreadList(true)}
            className="lg:hidden flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 text-white/60 font-mono text-xs rounded hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="w-3 h-3" /> Chats
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full ${isAgentConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#f59e0b]'}`} />
            <span className={`font-mono text-[10px] uppercase tracking-wider ${isAgentConnected ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
              {isAgentConnected ? 'Agent Live' : 'Agent Disconnected'}
            </span>
            <span className="font-mono text-xs text-white/70 truncate">
              {activeThread?.title || 'AI Assistant'}
            </span>
            <span className="font-mono text-[10px] text-white/25 uppercase">• {framework.toUpperCase()}</span>
          </div>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={createThread}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 text-[#5E6AD2] font-mono text-[10px] uppercase tracking-wider hover:bg-[#5E6AD2]/30 transition-colors"
          >
            <Plus className="w-3 h-3" /> New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadHistoryLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-14 h-14 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] rounded-2xl flex items-center justify-center mx-auto">
                <Bot className="w-7 h-7 text-[#5E6AD2]" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white/80 mb-1">Start a conversation</h3>
                <p className="font-sans text-xs text-white/30">Ask about your server, config, or resources</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                {['Fix an error', 'Change HUD color', 'Add a job'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 font-mono text-[10px] uppercase tracking-wider rounded hover:bg-white/10 hover:text-white/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.25)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#5E6AD2]" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-xl px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#5E6AD2] text-white'
                      : 'bg-[#16161E] border border-white/8 text-white/85'
                  }`}
                >
                  {msg.skillUsed && msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 text-[10px] text-[#5E6AD2]/70 mb-1 font-mono uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" /> {msg.skillUsed}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className="text-[9px] text-white/20 mt-1.5 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] text-white/50 font-mono">U</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.25)] flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-[#5E6AD2]" />
              </div>
              <div className="bg-[#16161E] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />
                <span className="text-xs text-white/30 font-mono">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Skills bar */}
        <div className="border-t border-white/8 px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0 bg-[#16161E]/20">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/20 flex-shrink-0">Skills:</span>
          <div className="relative">
            <button
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50 font-mono rounded hover:bg-white/10 hover:text-white/70 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {selectedSkills.length > 0 ? `${selectedSkills.length} selected` : 'Select'}
            </button>
            <AnimatePresence>
              {showSkillPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-[#16161E] border border-white/10 rounded-lg shadow-xl p-2 z-10"
                >
                  <div className="grid grid-cols-1 gap-1">
                    {SKILLS.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => { toggleSkill(skill.id); setShowSkillPicker(false); }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                          selectedSkills.includes(skill.id)
                            ? 'bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)]'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <Sparkles className={`w-3 h-3 flex-shrink-0 ${selectedSkills.includes(skill.id) ? 'text-[#5E6AD2]' : 'text-white/30'}`} />
                        <div>
                          <p className={`font-mono text-[10px] ${selectedSkills.includes(skill.id) ? 'text-white' : 'text-white/60'}`}>{skill.name}</p>
                          <p className="font-sans text-[9px] text-white/30">{skill.desc}</p>
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
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] text-[#5E6AD2] font-mono rounded hover:bg-[rgba(94,106,210,0.25)] transition-colors"
              >
                {skill.name} <span className="ml-0.5">×</span>
              </button>
            ) : null;
          })}
        </div>

        {/* Input */}
        <div className="border-t border-white/8 p-3 flex-shrink-0 bg-[#16161E]/20">
          <div className="flex gap-2 max-w-4xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about your server..."
              disabled={isLoading || !activeThreadId}
              className="flex-1 px-4 py-2.5 bg-[#0F0F14] border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#5E6AD2]/60 disabled:opacity-40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !activeThreadId}
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