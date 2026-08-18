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
    <aside className="w-56 flex-shrink-0 bg-[#16161E] border-r border-[rgba(255,255,255,0.08)] flex flex-col">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-[rgba(255,255,255,0.08)]">
        <img src="/nox-avatar.svg" alt="NOX" className="w-6 h-6 opacity-90" />
        <span className="font-mono text-white font-medium text-sm tracking-[0.2em] ml-1.5">NOX<span className="font-normal opacity-60">.</span></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.id)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-left ${
                active
                  ? 'text-white bg-[rgba(94,106,210,0.15)] border-l-2 border-[#5E6AD2]'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <img src="/nox-avatar.svg" alt="avatar" className="w-7 h-7 flex-shrink-0 opacity-80" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-[rgba(255,255,255,0.6)] truncate uppercase tracking-wider">User</p>
            <p className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Connected</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
