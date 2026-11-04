import { useState } from 'react'
import { Settings } from 'lucide-react'
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
  const isAuthenticated = true

  return (
    <div className="flex h-screen bg-[#111315] text-[#F4F1E9] overflow-hidden" aria-label="Main application layout">
      <SidebarNav currentPage={currentPage} onNavigate={onNavigate} aria-label="Main navigation" />

      <main className="flex-1 flex flex-col overflow-hidden" aria-label="Main content">
        {/* Top bar */}
        <header className="h-14 border-b border-[#414548] bg-[#181A1D] flex items-center px-6 flex-shrink-0 tauri-drag-region" aria-label="Application header">
          <img src="/brand/noxes-symbol.svg" alt="NOXES" className="w-5 h-5 mr-3 flex-shrink-0" />
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[#B6B0A4]">
            <span className="text-[#F4F1E9] font-medium capitalize">{currentPage}</span>
            {selectedServerId && (
              <>
                <span className="text-[#68665F]">/</span>
                <span className="text-[#B6B0A4] truncate max-w-[200px]">server_{selectedServerId.slice(0, 8)}</span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="tauri-no-drag p-2 rounded-sm transition-colors duration-100 hover:bg-[#202326]"
              title="Quick Actions"
              aria-label="Open quick actions panel"
            >
              <Settings className="w-4 h-4 text-[#68665F] hover:text-[#F4F1E9]" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} animate-pulse-subtle`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#68665F]">
                {isAuthenticated ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Content — allow scroll */}
        <div className="flex-1 overflow-y-auto bg-[#111315]">
          {children}
        </div>
      </main>

      {/* Quick Actions Sidebar */}
      <QuickActions
        serverId={selectedServerId || 'local'}
        serverName={selectedServerId ? `Server ${selectedServerId.slice(0, 8)}...` : 'Local Server'}
        isOpen={quickActionsOpen}
        onToggle={() => setQuickActionsOpen(!quickActionsOpen)}
        aria-label="Quick actions sidebar"
      />
    </div>
  )
}
