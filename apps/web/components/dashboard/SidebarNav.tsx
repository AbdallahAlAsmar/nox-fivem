'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, useClerk } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: 'Servers', icon: Server },
  { href: '/dashboard/resources', label: 'Resources', icon: Package },
  { href: '/dashboard/players', label: 'Players', icon: Users },
  { href: '/dashboard/changes', label: 'Changes', icon: FileDiff },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
  { href: '/dashboard/account', label: 'Account', icon: User },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
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

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

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
              {/* Mobile header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-2 font-mono">
                  <img src="/nox-avatar.svg" alt="NOX" className="w-6 h-6 opacity-90" />
                  <span className="text-white font-mono text-sm font-medium tracking-[0.2em]">NOX<span className="font-normal opacity-60">.</span></span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors duration-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
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

              {/* Footer */}
              <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.08)]">
                <SignedIn>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <img
                      src="/nox-avatar.svg"
                      alt="avatar"
                      className="w-7 h-7 flex-shrink-0 opacity-80"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-[rgba(255,255,255,0.6)] truncate uppercase tracking-wider">User</p>
                      <p className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Connected</p>
                    </div>
                    <button
                      onClick={() => signOut({ redirectUrl: '/' })}
                      className="text-[rgba(255,255,255,0.3)] hover:text-white transition-colors duration-100"
                      title="Sign out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Hover-triggered desktop sidebar */}
      <div
        className="hidden lg:flex fixed top-0 left-0 bottom-0 z-40"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thin hover trigger strip — invisible but catches mouse */}
        <div className="w-3 flex-shrink-0" />
        {/* Sidebar panel */}
        <motion.aside
          initial={false}
          animate={{ x: hovered ? 0 : -224 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-56 flex-shrink-0 bg-[#16161E] border-r border-[rgba(255,255,255,0.08)] flex flex-col"
        >
          {/* Logo */}
          <div className="px-5 h-14 flex items-center border-b border-[rgba(255,255,255,0.08)]">
            <img src="/nox-avatar.svg" alt="NOX" className="w-6 h-6 opacity-90" />
            <span className="font-mono text-white font-medium text-sm tracking-[0.2em] ml-1.5">NOX<span className="font-normal opacity-60">.</span></span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
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

          {/* Footer */}
          <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.08)]">
            <SignedIn>
              <div className="flex items-center gap-2 px-3 py-2">
                <img
                  src="/nox-avatar.svg"
                  alt="avatar"
                  className="w-7 h-7 flex-shrink-0 opacity-80"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-[rgba(255,255,255,0.6)] truncate uppercase tracking-wider">User</p>
                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Connected</p>
                </div>
                <button
                  onClick={() => signOut({ redirectUrl: '/' })}
                  className="text-[rgba(255,255,255,0.3)] hover:text-white transition-colors duration-100"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
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
      </div>
    </>
  );
}
