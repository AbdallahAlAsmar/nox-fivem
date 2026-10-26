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
    if (id === 'dashboard' && currentPage === 'chat') return true
    return false
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#181A1D] border-r border-[#414548] flex flex-col" aria-label="Main navigation">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-[#414548]" aria-hidden="true">
        <img src="/brand/noxes-symbol.svg" alt="NOXES" className="w-6 h-6" />
        <span className="font-display font-extrabold text-white text-base tracking-[0.2em] ml-2">
          NOXES<span className="text-[#E83708]">.</span>
        </span>
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-left rounded-sm ${
                active
                  ? 'text-[#F4F1E9] bg-[#E83708]/15 border-l-2 border-[#E83708]'
                  : 'text-[#B6B0A4] hover:text-[#F4F1E9] hover:bg-[#202326]'
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={`Navigate to ${item.label} page`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E83708]' : 'text-[#68665F]'}`} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 text-[#E83708] opacity-75" aria-hidden="true" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#414548]" aria-label="User info">
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-[#202326] transition-colors cursor-pointer" onClick={() => onNavigate('account')}>
          <div className="w-7 h-7 rounded-sm bg-[#E83708] flex items-center justify-center text-[#111315] font-bold text-xs flex-shrink-0">
            N
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-[#F4F1E9] truncate uppercase tracking-wider">Operator</p>
            <p className="font-mono text-[10px] text-[#22c55e] uppercase tracking-wider">Connected</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
