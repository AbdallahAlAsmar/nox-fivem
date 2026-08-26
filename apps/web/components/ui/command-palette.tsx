'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Server,
  Settings,
  MessageSquare,
  Users,
  Package,
  BookOpen,
  Search,
  X,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { fetchServers } from '@/lib/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerItem {
  id: string;
  name: string;
  framework: string;
  status: string;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const [search, setSearch] = useState('');
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      fetchServers().then(setServers).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const recentCommands = [
    { label: 'Servers', href: '/dashboard', icon: Server },
    { label: 'Resources', href: '/dashboard/resources', icon: Package },
    { label: 'Players', href: '/dashboard/players', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Docs', href: '/dashboard/docs', icon: BookOpen },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredServers.length + recentCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const isServer = selectedIndex < filteredServers.length;
      if (isServer && filteredServers[selectedIndex]) {
        navigateTo(`/dashboard/servers/${filteredServers[selectedIndex].id}`);
      } else if (!isServer) {
        const cmdIdx = selectedIndex - filteredServers.length;
        const cmd = recentCommands[cmdIdx];
        if (cmd) navigateTo(cmd.href);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-[#16161E] rounded-lg shadow-2xl z-50 overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search servers, commands..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] text-white/30 bg-white/5 rounded font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto p-2">
              {/* Servers */}
              {filteredServers.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/30 font-mono">Servers</p>
                  {filteredServers.map((server, idx) => (
                    <button
                      key={server.id}
                      onClick={() => navigateTo(`/dashboard/servers/${server.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
                        idx === selectedIndex ? 'bg-[rgba(61,255,162,0.15)]' : 'hover:bg-white/5'
                      }`}
                    >
                      <Server className={`w-4 h-4 flex-shrink-0 ${idx === selectedIndex ? 'text-[#3DFFA2]' : 'text-white/30'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-mono truncate ${idx === selectedIndex ? 'text-white' : 'text-white/70'}`}>
                          {server.name}
                        </p>
                        <p className="text-[10px] text-white/30 font-mono">{server.id.slice(0, 8)}...</p>
                      </div>
                      <span className={`text-[10px] uppercase font-mono ${
                        server.status === 'online' ? 'text-[#22c55e]' : server.status === 'offline' ? 'text-white/30' : 'text-[#f59e0b]'
                      }`}>
                        {server.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Commands */}
              <div>
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/30 font-mono">Commands</p>
                {recentCommands.map((cmd, idx) => {
                  const actualIdx = filteredServers.length + idx;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.label}
                      onClick={() => navigateTo(cmd.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
                        actualIdx === selectedIndex ? 'bg-[rgba(61,255,162,0.15)]' : 'hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${actualIdx === selectedIndex ? 'text-[#3DFFA2]' : 'text-white/30'}`} />
                      <span className={`text-sm font-mono ${actualIdx === selectedIndex ? 'text-white' : 'text-white/70'}`}>
                        {cmd.label}
                      </span>
                      {cmd.href === pathname && (
                        <span className="text-[10px] text-white/30 font-mono">current</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Empty state */}
              {filteredServers.length === 0 && search && (
                <p className="px-3 py-6 text-center text-sm text-white/30 font-mono">
                  No servers match "{search}"
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-[#0f0f14]">
              <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
                <span><kbd className="px-1 py-0.5 bg-white/5 rounded">↑↓</kbd> Navigate</span>
                <span><kbd className="px-1 py-0.5 bg-white/5 rounded">↵</kbd> Select</span>
                <span><kbd className="px-1 py-0.5 bg-white/5 rounded">esc</kbd> Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}