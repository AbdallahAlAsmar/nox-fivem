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
        className="lg:hidden fixed top-0 left-0 z-50 w-10 h-10 flex items-center justify-center bg-[#202326] border-r border-b border-[#414548] text-[#F4F1E9]"
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
              className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 z-50 w-64 border-r flex flex-col transition-colors duration-150 bg-[#181A1D] border-[#414548]"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-[#414548]" data-tour="dashboard-header">
                <div className="flex items-center gap-2.5 font-mono">
                  <img src="/brand/noxes-symbol.svg" alt="NOXES" className="w-6 h-6" />
                  <span className="text-[#F4F1E9] font-mono text-sm font-bold tracking-[0.2em]">NOXES</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setMobileOpen(false)} className="text-[#68665F] hover:text-[#F4F1E9] transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1" data-tour="nav-chat">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      data-tour={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      className={`flex items-center gap-2.5 px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 rounded-sm ${
                        active
                          ? 'text-[#F4F1E9] bg-[#E83708]/15 border-l-2 border-[#E83708]'
                          : 'text-[#B6B0A4] hover:text-[#F4F1E9] hover:bg-[#202326]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E83708]' : 'text-[#68665F]'}`} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 text-[#E83708] opacity-75" />}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-3 py-4 border-t border-[#414548]">
                <SignedIn>
                  <Link href="/dashboard/account" onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-100 rounded-sm hover:bg-[#202326]">
                      {userAvatar ? (
                        <img src={userAvatar} alt="avatar" className="w-7 h-7 rounded-sm flex-shrink-0 opacity-90 border border-[#414548]" />
                      ) : (
                        <div className="w-7 h-7 rounded-sm bg-[#E83708] flex items-center justify-center text-[#111315] text-xs font-bold flex-shrink-0">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs truncate uppercase tracking-wider text-[#F4F1E9]">{userName}</p>
                        <p className="font-mono text-[10px] truncate text-[#68665F]">{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut({ redirectUrl: '/' })}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-1 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-[#68665F] hover:text-[#F4F1E9]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-[#B6B0A4] hover:text-[#F4F1E9]">
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
        className="hidden lg:block h-full border-r border-[#414548] flex flex-col overflow-hidden transition-colors duration-150 bg-[#181A1D]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{ width: hovered ? 224 : 48 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full flex flex-col"
        >
          {/* Logo */}
          <div className="h-14 flex items-center border-b border-[#414548] flex-shrink-0">
            <div className="flex items-center justify-between w-full px-3" data-tour="dashboard-header">
              <div className="flex items-center gap-3">
                <img src="/brand/noxes-symbol.svg" alt="NOXES" className="w-6 h-6 flex-shrink-0" />
                <motion.span
                  initial={false}
                  animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono text-[#F4F1E9] font-bold text-sm tracking-[0.2em] whitespace-nowrap overflow-hidden"
                >
                  NOXES
                </motion.span>
              </div>
            </div>
          </div>

          {/* Agent Status */}
          <div className="px-3 py-2 border-b border-[#414548]/50">
            <AgentStatusBadge />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" data-tour="nav-chat">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-2.5 px-2.5 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 rounded-sm ${
                    active
                      ? 'text-[#F4F1E9] bg-[#E83708]/15 border-l-2 border-[#E83708]'
                      : 'text-[#B6B0A4] hover:text-[#F4F1E9] hover:bg-[#202326]'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E83708]' : 'text-[#68665F]'}`} />
                  <motion.span
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                  {active && hovered && <ChevronRight className="w-3 h-3 text-[#E83708] opacity-75 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-3 py-4 border-t border-[#414548]">
            <div className="flex items-center justify-between mb-2">
              <NotificationBell />
            </div>
            <SignedIn>
              <Link href="/dashboard/account">
                <div className="flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors duration-100 rounded-sm hover:bg-[#202326]" data-tour="user-menu">
                  {userAvatar ? (
                    <img src={userAvatar} alt="avatar" className="w-7 h-7 rounded-sm flex-shrink-0 opacity-90 border border-[#414548]" />
                  ) : (
                    <div className="w-7 h-7 rounded-sm bg-[#E83708] flex items-center justify-center text-[#111315] text-xs font-bold flex-shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <motion.div
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <p className="font-mono text-xs truncate uppercase tracking-wider text-[#F4F1E9]">{userName}</p>
                    <p className="font-mono text-[10px] truncate text-[#68665F]">{user?.primaryEmailAddress?.emailAddress}</p>
                  </motion.div>
                </div>
              </Link>
              <button
                onClick={() => signOut({ redirectUrl: '/' })}
                className="w-full flex items-center gap-2 px-2 py-2 mt-1 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-[#68665F] hover:text-[#F4F1E9]"
              >
                <LogOut className="w-3.5 h-3.5" />
                {hovered && <span className="text-[#68665F]">Sign Out</span>}
              </button>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full flex items-center gap-2 px-2 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 text-[#B6B0A4] hover:text-[#F4F1E9]">
                  <LogOut className="w-4 h-4" />
                  {hovered && <span className="text-[#68665F]">Sign In</span>}
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </motion.div>
      </aside>
    </>
  );
}
