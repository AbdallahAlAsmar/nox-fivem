import { useState, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  MessageSquare, Bot, Send, Sparkles,
  Settings, Car, Bug, Palette, User, Package,
  Link, Zap, Lock, RotateCcw, FileText,
  Loader2, RefreshCw, ChevronDown, ChevronUp,
  Server as ServerIcon, CheckCircle2, AlertCircle, FolderOpen,
  Users, GitBranch, Terminal, FileCog
} from 'lucide-react'
import {
  sendChatMessage, fetchServerThread, fetchServers, connectExistingServer, syncResources, type ChatMessage, type Server
} from '../api'
import Players from './Players'
import Changes from './Changes'
import ResourceFinder from './ResourceFinder'
import ErrorAnalysis from './ErrorAnalysis'
import Console from './Console'
import ServerSettings from './ServerSettings'

const SKILL_ICONS: Record<string, React.ElementType> = {
  'Settings': Settings,
  'Car': Car,
  'Bug': Bug,
  'Palette': Palette,
  'User': User,
  'Package': Package,
  'Link': Link,
  'Zap': Zap,
  'Lock': Lock,
  'RotateCcw': RotateCcw,
  'FileText': FileText,
}

const SKILLS = [
  { id: 'config-editor', name: 'Config Editor', icon: 'Settings', description: 'Edit config files' },
  { id: 'vehicle-handler', name: 'Vehicle Handler', icon: 'Car', description: 'Modify vehicles' },
  { id: 'error-fixer', name: 'Error Fixer', icon: 'Bug', description: 'Fix errors' },
  { id: 'ui-customizer', name: 'UI Customizer', icon: 'Palette', description: 'Customize UI' },
  { id: 'npc-spawner', name: 'NPC Spawner', icon: 'User', description: 'Add NPCs' },
  { id: 'resource-installer', name: 'Resource Installer', icon: 'Package', description: 'Install resources' },
  { id: 'dependency-checker', name: 'Dependency Checker', icon: 'Link', description: 'Check dependencies' },
  { id: 'performance-analyzer', name: 'Performance Analyzer', icon: 'Zap', description: 'Optimize performance' },
]

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'changes', label: 'Changes', icon: GitBranch },
  { id: 'resources', label: 'Resources', icon: Package },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface ChatProps {
  serverId?: string
}

export default function Chat({ serverId }: ChatProps) {
  const [servers, setServers] = useState<Server[]>([])
  const [currentServerId, setCurrentServerId] = useState<string>(() => {
    return serverId || localStorage.getItem('selected_server_id') || ''
  })
  const [activeTab, setActiveTab] = useState<string>('chat')
  const [isAgentConnected, setIsAgentConnected] = useState(false)
  const [isConnectingAgent, setIsConnectingAgent] = useState(false)
  const [connectToast, setConnectToast] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  // True while a locally-echoed (optimistic) message exists that the next poll
  // must reconcile, even if the server's last message id is unchanged.
  const hasLocalEchoRef = useRef(false)

  // Load server list
  useEffect(() => {
    fetchServers().then((srvs) => {
      setServers(srvs)
      if (!currentServerId && srvs.length > 0) {
        setCurrentServerId(srvs[0].id)
        localStorage.setItem('selected_server_id', srvs[0].id)
      }
    }).catch(() => {})
  }, [])

  // Update selected server when prop changes
  useEffect(() => {
    if (serverId && serverId !== currentServerId) {
      setCurrentServerId(serverId)
      localStorage.setItem('selected_server_id', serverId)
    }
  }, [serverId])

  // Check agent connection state, then keep it live via backend events.
  // main.rs / agent lifecycle emits `agent:connected`; without the listener the
  // badge only ever refreshed on server switch and showed stale state.
  useEffect(() => {
    if (!currentServerId) return
    invoke('get_agent_state_cmd').then((state: any) => {
      const isConn = state?.connected === true && state?.server_id === currentServerId
      setIsAgentConnected(isConn)
    }).catch(() => {
      setIsAgentConnected(false)
    })

    let unlisten: (() => void) | undefined
    listen<boolean>('agent:connected', (event) => {
      if (event.payload === false) {
        setIsAgentConnected(false)
        return
      }
      invoke('get_agent_state_cmd').then((state: any) => {
        setIsAgentConnected(state?.connected === true && state?.server_id === currentServerId)
      }).catch(() => setIsAgentConnected(false))
    }).then((fn) => { unlisten = fn }).catch(() => {})

    return () => { unlisten?.() }
  }, [currentServerId])

  // Load stored messages
  const loadThread = async () => {
    if (!currentServerId) return
    const thread = await fetchServerThread(currentServerId)
    if (!thread) return
    setActiveThreadId(thread.id)
    setMessages(
      (thread.messages ?? []).map((m: any) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        timestamp: new Date(m.createdAt).getTime(),
      }))
    )
    lastMessageIdRef.current = thread.messages?.[thread.messages.length - 1]?.id ?? null
  }

  useEffect(() => {
    loadThread()
  }, [currentServerId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeThreadId) return
    const interval = setInterval(async () => {
      const thread = await fetchServerThread(currentServerId)
      if (!thread) return
      const msgs = thread.messages ?? []
      if (!msgs.length) return
      const last = msgs[msgs.length - 1]
      if (lastMessageIdRef.current === last.id && !hasLocalEchoRef.current) return
      lastMessageIdRef.current = last.id

      // Merge fetched messages with any still-optimistic local ones. Local
      // echoes use numeric Date.now() ids; once their content shows up in the
      // persisted list they are dropped so nothing flashes as a duplicate.
      setMessages((prev) => {
        hasLocalEchoRef.current = false
        const fetchedIds = new Set(msgs.map((m: any) => m.id))
        const fetchedContents = new Set(msgs.map((m: any) => `${m.role}:${m.content}`))
        const localOnly = prev.filter(
          (m) =>
            !fetchedIds.has(m.id) &&
            !fetchedContents.has(`${m.role === 'user' ? 'user' : 'assistant'}:${m.content}`),
        )
        const mappedFetched = msgs.map((m: any) => ({
          id: m.id,
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content,
          timestamp: new Date(m.createdAt).getTime(),
        }))
        return [...mappedFetched, ...localOnly.filter((m) => m.id.length > 0 && /^\d+$/.test(m.id))]
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [activeThreadId, currentServerId])

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    )
  }

  // Close the skill picker with Escape.
  useEffect(() => {
    if (!showSkillPicker) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSkillPicker(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSkillPicker])

  const handleConnectAgent = async () => {
    if (!currentServerId) return
    setIsConnectingAgent(true)
    setError(null)
    try {
      let directory = localStorage.getItem(`server_dir_${currentServerId}`) || ''
      if (!directory) {
        const picked = (await invoke('open_folder_cmd')) as string
        if (!picked) {
          setIsConnectingAgent(false)
          return
        }
        directory = picked
      }

      let agentDeviceId = localStorage.getItem(`agent_device_${currentServerId}`)
      let freshSessionToken: string | undefined
      if (!agentDeviceId) {
        const claim = await connectExistingServer(currentServerId, directory)
        agentDeviceId = claim.agentDeviceId
        freshSessionToken = claim.sessionToken
        localStorage.setItem(`agent_device_${currentServerId}`, agentDeviceId)
        localStorage.setItem(`server_dir_${currentServerId}`, directory)
      }

      // Persist a freshly-minted session token BEFORE connecting so the WS
      // hello can present it (freshly-paired devices require it).
      if (freshSessionToken) {
        await invoke('set_session_token_cmd', { sessionToken: freshSessionToken })
      }

      await invoke('connect_agent_cmd', {
        serverId: currentServerId,
        agentDeviceId,
        serverDirectory: directory,
      })

      // Scan and sync
      let count = 0
      try {
        const scan = (await invoke('scan_server_resources_cmd', {
          serverDirectory: directory,
        })) as { resources: any[]; framework: string }
        count = scan?.resources?.length ?? 0
        await syncResources(currentServerId, scan)
      } catch (scanErr) {
        console.warn('Scan notice:', scanErr)
      }

      setIsAgentConnected(true)
      setConnectToast(`Agent connected! (${count} resources indexed)`)
      setTimeout(() => setConnectToast(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect agent')
    } finally {
      setIsConnectingAgent(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentServerId) return
    if (!activeThreadId) {
      setError('Chat is still loading — try again in a moment.')
      return
    }
    const threadId = activeThreadId

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])
    hasLocalEchoRef.current = true
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      await sendChatMessage(threadId, userMsg.content)
      await loadThread()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send message'
      setError(errMsg)
      const errMsgObj: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, there was an error: ${errMsg}`,
        timestamp: Date.now(),
        isError: true,
      }
      setMessages((prev) => [...prev, errMsgObj])
      hasLocalEchoRef.current = true
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = () => {
    if (confirm('Clear chat history?')) {
      setMessages([])
    }
  }

  const currentServer = servers.find(s => s.id === currentServerId)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'players':
        return <Players serverId={currentServerId} />
      case 'changes':
        return <Changes serverId={currentServerId} />
      case 'resources':
        return <ResourceFinder serverId={currentServerId} />
      case 'console':
        return <Console serverId={currentServerId} />
      case 'settings':
        return <ServerSettings serverId={currentServerId} />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-[#16161E] border border-[rgba(255,255,255,0.08)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <ServerIcon className="w-4 h-4 text-[#5E6AD2]" />
          <select
            value={currentServerId}
            onChange={(e) => {
              setCurrentServerId(e.target.value)
              localStorage.setItem('selected_server_id', e.target.value)
            }}
            className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.12)] text-white text-xs font-mono px-3 py-1.5 focus:outline-none focus:border-[#5E6AD2]"
          >
            {servers.length === 0 && <option value="">Loading servers...</option>}
            {servers.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name} ({srv.framework || 'standalone'})
              </option>
            ))}
          </select>

          {/* Connection badge */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <div className={`w-2 h-2 rounded-full ${isAgentConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#f59e0b]'}`} />
            <span className={isAgentConnected ? 'text-[#22c55e]' : 'text-[#f59e0b]'}>
              {isAgentConnected ? 'Agent Live' : 'Agent Disconnected'}
            </span>
          </div>

          {!isAgentConnected && (
            <button
              onClick={handleConnectAgent}
              disabled={isConnectingAgent}
              className="flex items-center gap-1 px-2.5 py-1 bg-[rgba(94,106,210,0.15)] text-[#5E6AD2] border border-[rgba(94,106,210,0.3)] font-mono text-[10px] uppercase tracking-wider hover:bg-[rgba(94,106,210,0.25)] transition-colors"
            >
              <Zap className="w-3 h-3" />
              {isConnectingAgent ? 'Connecting...' : 'Connect Agent'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            History
          </button>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#16161E] border border-[rgba(255,255,255,0.08)] px-4 py-2 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                isActive
                  ? 'text-white bg-[rgba(94,106,210,0.15)] border-b-2 border-[#5E6AD2]'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {connectToast && (
        <div className="border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] p-2.5 font-mono text-xs text-[#22c55e] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{connectToast}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] flex items-center gap-2">
          <span>!</span> {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab !== 'chat' ? (
        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>
      ) : (
        <>
          {/* Skill Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Skills:</span>
            <button
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 border border-[rgba(255,255,255,0.08)]"
            >
              <Sparkles className="w-4 h-4" />
              {selectedSkills.length > 0 ? `${selectedSkills.length} selected` : 'Select Skills'}
            </button>

            {selectedSkills.map(skillId => {
              const skill = SKILLS.find(s => s.id === skillId)
              const IconComponent = skill ? SKILL_ICONS[skill.icon] : null
              return skill && IconComponent ? (
                <button
                  key={skillId}
                  onClick={() => toggleSkill(skillId)}
                  className="flex items-center gap-1 px-2 py-1 font-mono text-xs uppercase tracking-wider bg-[rgba(94,106,210,0.15)] text-[#5E6AD2] border border-[rgba(94,106,210,0.3)] hover:bg-[rgba(94,106,210,0.2)] transition-colors duration-100"
                >
                  <IconComponent className="w-3 h-3" />
                  {skill.name}
                  <span className="ml-1 opacity-60">×</span>
                </button>
              ) : null
            })}
          </div>

          {/* Skill Picker Modal */}
          {showSkillPicker && (
            <div className="fixed inset-0 bg-[#0F0F14]/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto animate-slide-up">
                <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-4">Select AI Skills</h3>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">Choose which specialized skills the AI should use</p>

                <div className="grid grid-cols-2 gap-3">
                  {SKILLS.map(skill => {
                    const IconComponent = SKILL_ICONS[skill.icon]
                    return (
                      <button
                        key={skill.id}
                        onClick={() => { toggleSkill(skill.id); setShowSkillPicker(false) }}
                        className={`p-3 border text-left transition-colors duration-100 ${
                          selectedSkills.includes(skill.id)
                            ? 'border-[rgba(94,106,210,0.4)] bg-[rgba(94,106,210,0.1)]'
                            : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {IconComponent && <IconComponent className="w-5 h-5 text-[#5E6AD2]" />}
                          <span className="font-mono text-xs uppercase tracking-wider text-white">{skill.name}</span>
                        </div>
                        <p className="font-sans text-[11px] text-[rgba(255,255,255,0.4)]">{skill.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setShowSkillPicker(false)}
                    className="font-mono text-xs uppercase tracking-[1.4px] px-4 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-[#5E6AD2]" />
                </div>
                <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">Start a Conversation</h3>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4 max-w-sm mx-auto leading-[1.6]">
                  Select skills above, then ask about your server configuration, request changes, or get help with errors.
                </p>
                <div className="font-mono text-xs text-[rgba(255,255,255,0.25)] space-y-1">
                  <p>"Change my HUD color to blue"</p>
                  <p>"Fix this error: attempt to index a nil value"</p>
                  <p>"Add a ped spawn point"</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-slide-up ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-[#5E6AD2]'
                    : message.isError
                    ? 'bg-[rgba(239,68,68,0.2)] border border-[rgba(239,68,68,0.3)]'
                    : 'bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)]'
                }`}>
                  {message.role === 'user' ? (
                    <MessageSquare className="w-4 h-4 text-white" />
                  ) : message.isError ? (
                    <span className="text-[#ef4444] text-xs font-mono">!</span>
                  ) : (
                    <Bot className="w-4 h-4 text-[#5E6AD2]" />
                  )}
                </div>
                <div className={`max-w-[70%] px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-[#5E6AD2] text-[#0F0F14]'
                    : message.isError
                    ? 'bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] text-[#ef4444]'
                    : 'bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)]'
                }`}>
                  <p className="font-sans text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-[#5E6AD2]" />
                </div>
                <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[rgba(255,255,255,0.3)]" />
                  <span className="font-mono text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your server…"
                className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2.5 bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] font-medium hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
