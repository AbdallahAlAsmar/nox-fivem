'use client';

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  CheckCircle2,
  Monitor,
  Zap,
  Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved');
    setTimeout(() => setSaved(false), 3000);
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Settings</h1>
          <p className="font-sans text-xs text-white/40 mt-1">
            Configure your NOXES. experience
          </p>
        </div>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#16161E] border border-white/10 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-[#3DFFA2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Appearance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">Dark mode</p>
                <p className="font-sans text-xs text-white/40 mt-0.5">
                  {isDark ? 'Currently dark' : 'Currently light'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  isDark ? 'bg-[#3DFFA2]' : 'bg-white/20'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ x: isDark ? 20 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Regional */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#16161E] border border-white/10 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#3DFFA2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Regional</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-white/50 mb-2">
                Language
              </label>
              <select className="w-full px-3 py-2 bg-transparent border border-white/10 text-white font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-[#3DFFA2] transition-colors duration-100">
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fa">فارسی</option>
              </select>
            </div>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#16161E] border border-white/10 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#3DFFA2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Security</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[rgba(61,255,162,0.08)] border border-[rgba(61,255,162,0.2)]">
              <CheckCircle2 className="w-4 h-4 text-[#3DFFA2] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">AI changes are sandboxed</p>
                <p className="font-sans text-xs text-white/40 mt-1 leading-[1.6]">
                  Every file change is staged and requires your approval before being written.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#0A0A0F] border border-white/10">
              <Zap className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">API keys never stored locally</p>
                <p className="font-sans text-xs text-white/40 mt-1 leading-[1.6]">
                  Your orchestrator handles all authentication. No secrets in the browser.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="font-mono text-xs uppercase tracking-wider text-[#3DFFA2] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="font-mono text-xs uppercase tracking-[1.4px] px-5 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
