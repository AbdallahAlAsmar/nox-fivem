import {
  Server,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  Plus,
  User,
  Menu,
  X,
  Package,
  Users,
  FileDiff,
  CreditCard,
  BookOpen,
} from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { id: 'dashboard', label: 'Servers', icon: Server },
  { id: 'resources', label: 'Resources', icon: Package },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'changes', label: 'Changes', icon: FileDiff },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'account', label: 'Account', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface SidebarNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function SidebarNav({ currentPage, onNavigate }: SidebarNavProps) {
  const isActive = (id: string) => {
    if (currentPage === id) return true
    // Handle nested routes like 'chat' showing 'servers' as active
    if (id === 'dashboard' && currentPage === 'chat') return true
    return false
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col" aria-label="Main navigation">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-[var(--border)]" aria-hidden="true">
        <img src="/nox-avatar.svg" alt="NOXES logo" className="w-6 h-6 opacity-90" />
        <span className="font-mono text-white font-medium text-sm tracking-[0.2em] ml-1.5">NOXES<span className="font-normal opacity-60">.</span></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navigation menu">
        {navItems.map((item) => {
          const active = isActive(item.id)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-left ${
                active
                  ? 'text-white bg-[rgba(61,255,162,0.12)] border-l-2 border-[#3DFFA2]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border)]'
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={`Navigate to ${item.label} page`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" aria-hidden="true" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[var(--border)]" aria-label="User info">
        <div className="flex items-center gap-2 px-3 py-2">
          <img src="/nox-avatar.svg" alt="User avatar" className="w-7 h-7 flex-shrink-0 opacity-80" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-[var(--text-secondary)] truncate uppercase tracking-wider">User</p>
            <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Connected</p>
          </div>
        </div>
      </div>
    </aside>
  )
}