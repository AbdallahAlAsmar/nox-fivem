'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Server,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Menu,
  X,
  Package,
  Users,
  CreditCard,
  BookOpen,
  FileDiff,
  ScrollText,
  Sun,
  Moon,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, useClerk, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import AgentStatusBadge from '@/components/status/AgentStatusBadge';
import { NotificationBell } from '@/components/notifications';

const navItems = [
  { href: '/dashboard', label: 'Servers', icon: Server },
  { href: '/dashboard/resources', label: 'Resources', icon: Package },
  { href: '/dashboard/changes', label: 'Changes', icon: FileDiff },
  { href: '/dashboard/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const userName = user?.fullName ?? 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const userAvatar = user?.imageUrl;
  const isDark = theme === 'dark';

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-0 left-0 z-50 w-10 h-10 flex items-center justify-center bg-[#16161E] border-r border-b border-white/10 text-white"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`lg:hidden fixed top-0 left-0 z-50 w-64 border-r flex flex-col transition-colors duration-150 ${
                isDark
                  ? 'bg-[#16161E] border-white/10'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`flex items-center justify-between px-5 h-14 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 font-mono">
                  <img src="/nox-logo.svg" alt="NOX" className="w-8 h-8 text-white" />
                  <span className="text-white font-mono text-sm font-bold tracking-[0.2em]">NOX</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    aria-label="Toggle theme"
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setMobileOpen(false)} className={`ml-1 transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                        active
                          ? isDark
                            ? 'text-white bg-[rgba(94,106,210,0.15)] border-l-2 border-[#5E6AD2]'
                            : 'text-[#5E6AD2] bg-[rgba(94,106,210,0.08)] border-l-2 border-[#5E6AD2]'
                          : isDark
                            ? 'text-white/40 hover:text-white hover:bg-white/5'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#5E6AD2]' : isDark ? 'text-white/40' : 'text-gray-400'}`} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className={`w-3 h-3 opacity-50 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />}
                    </Link>
                  );
                })}
              </nav>
              <div className={`px-3 py-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <SignedIn>
                  <Link href="/dashboard/account" onClick={() => setMobileOpen(false)}>
                    <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-100 rounded ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                      {userAvatar ? (
                        <img src={userAvatar} alt="avatar" className="w-7 h-7 rounded flex-shrink-0 opacity-90" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-[#5E6AD2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-xs truncate uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{userName}</p>
                        <p className={`font-mono text-[10px] truncate ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut({ redirectUrl: '/' })}
                    className={`w-full flex items-center gap-2 px-3 py-2 mt-1 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                      <LogOut className="w-4 h-4" />
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block h-full border-r border-white/10 flex flex-col overflow-hidden transition-colors duration-150 ${
          isDark ? 'bg-[#16161E]' : 'bg-white'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{ width: hovered ? 224 : 48 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full flex flex-col"
        >
          {/* Logo */}
          <div className="h-14 flex items-center border-b border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between w-full px-5">
              <div className="flex items-center gap-3">
                <img src="/nox-logo.svg" alt="NOX" className="w-8 h-8 text-white flex-shrink-0" />
                <motion.span
                  initial={false}
                  animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono text-white font-bold text-sm tracking-[0.2em] whitespace-nowrap overflow-hidden"
                >
                  NOX
                </motion.span>
              </div>
              <button
                onClick={toggleTheme}
                className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Agent Status */}
          <div className="px-3 py-2 border-b border-white/5">
            <AgentStatusBadge />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
                    active
                      ? isDark
                        ? 'text-white bg-[rgba(94,106,210,0.15)] border-l-2 border-[#5E6AD2]'
                        : 'text-[#5E6AD2] bg-[rgba(94,106,210,0.08)] border-l-2 border-[#5E6AD2]'
                      : isDark
                        ? 'text-white/40 hover:text-white hover:bg-white/5'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? (isDark ? 'text-[#5E6AD2]' : 'text-[#5E6AD2]') : isDark ? 'text-white/40' : 'text-gray-400'}`} />
                  <motion.span
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                  {active && hovered && <ChevronRight className={`w-3 h-3 opacity-50 ml-auto ${isDark ? 'text-white/50' : 'text-gray-400'}`} />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={`px-3 py-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <NotificationBell />
            </div>
            <SignedIn>
              <Link href="/dashboard/account">
                <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-100 rounded ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="avatar" className="w-7 h-7 rounded flex-shrink-0 opacity-90" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-[#5E6AD2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <motion.div
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <p className={`font-mono text-xs truncate uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{userName}</p>
                    <p className={`font-mono text-[10px] truncate ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{user?.primaryEmailAddress?.emailAddress}</p>
                  </motion.div>
                </div>
              </Link>
              <button
                onClick={() => signOut({ redirectUrl: '/' })}
                className={`w-full flex items-center gap-2 px-3 py-2 mt-1 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                {hovered && <span className={isDark ? 'text-white/30' : 'text-gray-400'}>Sign Out</span>}
              </button>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                  <LogOut className="w-4 h-4" />
                  {hovered && <span className={isDark ? 'text-white/40' : 'text-gray-400'}>Sign In</span>}
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </motion.div>
      </aside>
    </>
  );
}
