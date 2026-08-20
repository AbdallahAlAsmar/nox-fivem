import { useState } from 'react'
import { MessageSquare, FileDiff, Settings, Server, Package, Users, CreditCard, User, BookOpen } from 'lucide-react'
import QuickActions from './QuickActions'
import SidebarNav from './SidebarNav'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
  selectedServerId?: string
}

export default function Layout({ children, currentPage, onNavigate, selectedServerId }: LayoutProps) {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const isAuthenticated = typeof window !== 'undefined' && !!window.__nox_clerk_token

  return (
    <div className="flex h-screen bg-[#0F0F14] text-white overflow-hidden">
      <SidebarNav currentPage={currentPage} onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]/50 flex items-center px-6 flex-shrink-0 tauri-drag-region">
          <img src="/nox-avatar.svg" alt="NOX" className="w-5 h-5 opacity-80 mr-3 flex-shrink-0" />
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            <span className="text-white font-medium capitalize">{currentPage}</span>
            {selectedServerId && (
              <>
                <span className="text-[rgba(255,255,255,0.2)]">/</span>
                <span className="text-[rgba(255,255,255,0.5)] truncate max-w-[200px]">server_{selectedServerId.slice(0, 8)}</span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="tauri-no-drag p-2 transition-colors duration-100"
              title="Quick Actions"
            >
              <Settings className="w-4 h-4 text-[rgba(255,255,255,0.4)] hover:text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 ${isAuthenticated ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} animate-pulse-subtle`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                {isAuthenticated ? 'Authed' : 'Dev Mode'}
              </span>
            </div>
          </div>
        </header>

        {/* Content — allow scroll */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Quick Actions Sidebar */}
      <QuickActions
        serverId={selectedServerId || 'local'}
        serverName={selectedServerId ? `Server ${selectedServerId.slice(0, 8)}...` : 'Local Server'}
        isOpen={quickActionsOpen}
        onToggle={() => setQuickActionsOpen(!quickActionsOpen)}
      />
    </div>
  )
}
