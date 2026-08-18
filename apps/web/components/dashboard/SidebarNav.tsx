'use client';

import { useState, useEffect } from 'react';
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
  FileDiff,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, useClerk, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: 'Servers', icon: Server },
  { href: '/dashboard/resources', label: 'Resources', icon: Package },
  { href: '/dashboard/players', label: 'Players', icon: Users },
  { href: '/dashboard/changes', label: 'Changes', icon: FileDiff },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
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

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-0 left-0 z-50 w-10 h-10 flex items-center justify-center bg-[#16161E] border-r border-b border-[rgba(255,255,255,0.08)] text-white"
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
              className="lg:hidden fixed top-0 left-0 z-50 w-64 bg-[#16161E] border-r border-[rgba(255,255,255,0.08)] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-2 font-mono">
                  <img src="/nox-avatar.svg" alt="NOX" className="w-6 h-6 opacity-90" />
                  <span className="text-white font-mono text-sm font-medium tracking-[0.2em]">NOX<span className="font-normal opacity-60">.</span></span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors duration-100">
                  <X className="w-5 h-5" />
                </button>
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
                          ? 'text-white bg-[rgba(94,106,210,0.15)] border-l-2 border-[#5E6AD2]'
                          : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.08)]">
                <SignedIn>
                  <Link href="/dashboard/account" onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 rounded">
                      {userAvatar ? (
                        <img src={userAvatar} alt="avatar" className="w-7 h-7 rounded flex-shrink-0 opacity-90" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-[#5E6AD2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-[rgba(255,255,255,0.8)] truncate uppercase tracking-wider">{userName}</p>
                        <p className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut({ redirectUrl: '/' })}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-1 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors duration-100"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100">
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

      {/* Desktop sidebar — part of layout, not fixed overlay */}
      <aside
        className="hidden lg:block h-full bg-[#16161E] border-r border-[rgba(255,255,255,0.08)] flex flex-col overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{ width: hovered ? 224 : 48 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full flex flex-col"
        >
          {/* Logo */}
          <div className="h-14 flex items-center border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
            <div className="flex items-center gap-3 w-full px-5">
              <img src="/nox-avatar.svg" alt="NOX" className="w-6 h-6 opacity-90 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono text-white font-medium text-sm tracking-[0.2em] whitespace-nowrap overflow-hidden"
              >
                NOX<span className="font-normal opacity-60">.</span>
              </motion.span>
            </div>
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
                  title={item.label}
                  className={`flex items-center gap-2.5 px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors duration-100 rounded-sm ${
                    active
                      ? 'text-white bg-[rgba(94,106,210,0.15)] border-l-2 border-[#5E6AD2]'
                      : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <motion.span
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                  {active && hovered && <ChevronRight className="w-3 h-3 opacity-50 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer — User profile */}
          <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0">
            <SignedIn>
              <Link href="/dashboard/account" title="View profile">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] rounded px-2 py-2 transition-colors duration-100">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="avatar"
                      className="w-7 h-7 rounded flex-shrink-0 opacity-90"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-[#5E6AD2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <motion.div
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="font-mono text-xs text-[rgba(255,255,255,0.8)] truncate uppercase tracking-wider">{userName}</p>
                    {hovered && user?.primaryEmailAddress && (
                      <p className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] truncate">
                        {user.primaryEmailAddress.emailAddress}
                      </p>
                    )}
                  </motion.div>
                </div>
              </Link>
              <button
                onClick={() => signOut({ redirectUrl: '/' })}
                className="w-full flex items-center gap-2 mt-1 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)] transition-colors duration-100 rounded"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
                <motion.span
                  initial={false}
                  animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  Sign Out
                </motion.span>
              </button>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full flex items-center gap-2 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] hover:text-white transition-colors duration-100">
                  <LogOut className="w-3 h-3" />
                  <motion.span
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Sign In
                  </motion.span>
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </motion.div>
      </aside>
    </>
  );
}
