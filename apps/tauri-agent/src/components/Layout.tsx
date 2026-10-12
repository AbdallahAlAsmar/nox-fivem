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
  // This layout only renders after App.tsx confirms a Clerk session, so the
  // header dot reflects that rather than probing a stale window global.
  const isAuthenticated = true

  return (
    <div className="flex h-screen bg-[var(--bg-dark)] text-white overflow-hidden" style={{ scrollbarColor: 'rgba(128,128,128,0.3) transparent', scrollbarWidth: 'thin' }} aria-label="Main application layout">
      <SidebarNav currentPage={currentPage} onNavigate={onNavigate} aria-label="Main navigation" />

      <main className="flex-1 flex flex-col overflow-hidden" aria-label="Main content">
        {/* Top bar */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center px-6 flex-shrink-0 tauri-drag-region" aria-label="Application header">
          <img src="/nox-avatar.svg" alt="NOXES logo" className="w-5 h-5 opacity-90 mr-3 flex-shrink-0" />
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)]">
            <span className="text-white font-medium capitalize">{currentPage}</span>
            {selectedServerId && (
              <>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-[var(--text-secondary)] truncate max-w-[200px]">server_{selectedServerId.slice(0, 8)}</span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="tauri-no-drag p-2 transition-colors duration-100 hover:bg-[var(--border)]"
              title="Quick Actions"
              aria-label="Open quick actions panel"
            >
              <Settings className="w-4 h-4 text-[var(--text-muted)] hover:text-white" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 ${isAuthenticated ? 'bg-[var(--success)]' : 'bg-[var(--error)]'} animate-pulse-subtle`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
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
        aria-label="Quick actions sidebar"
      />
    </div>
  )
}
