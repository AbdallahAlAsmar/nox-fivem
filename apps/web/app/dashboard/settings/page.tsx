'use client';

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
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
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved');
    setTimeout(() => setSaved(false), 3000);
  };

  const testNotification = () => {
    toast('This is a test notification', {
      description: 'Notifications are working correctly!',
      action: {
        label: 'OK',
        onClick: () => {},
      },
    });
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14] dark:bg-[#0F0F14] light:bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white dark:text-white light:text-gray-900">Settings</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-1">
            Configure your NOX // FiveM experience
          </p>
        </div>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white dark:text-white light:text-gray-900">Appearance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">Dark mode</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-0.5">
                  {theme === 'dark' ? 'Currently dark' : 'Currently light'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  theme === 'dark' ? 'bg-[#5E6AD2]' : 'bg-gray-300'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ x: theme === 'dark' ? 20 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">Compact mode</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-0.5">
                  Reduce spacing for denser layout
                </p>
              </div>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  compactMode ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.15)] light:bg-gray-300'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ x: compactMode ? 20 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white dark:text-white light:text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">Chat notifications</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-0.5">
                  Show toast when AI responds
                </p>
              </div>
              <button
                onClick={() => {
                  setNotifications(!notifications);
                  toast(notifications ? 'Chat notifications disabled' : 'Chat notifications enabled');
                }}
                className={`w-10 h-5 transition-colors duration-100 flex items-center justify-end px-1 ${
                  notifications ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.15)] light:bg-gray-300'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ x: notifications ? 0 : 0 }}
                  className={`w-3 h-3 bg-white rounded-full ${notifications ? '' : 'translate-x-0'}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">Sound effects</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-0.5">
                  Play sound on notifications
                </p>
              </div>
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  toast(soundEnabled ? 'Sound disabled' : 'Sound enabled');
                }}
                className={`w-10 h-5 transition-colors duration-100 flex items-center justify-end px-1 ${
                  soundEnabled ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.15)] light:bg-gray-300'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ x: 0 }}
                  className="w-3 h-3 bg-white rounded-full"
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">Auto-refresh servers</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-0.5">
                  Poll orchestrator every 60s
                </p>
              </div>
              <button
                onClick={() => {
                  setAutoRefresh(!autoRefresh);
                  toast(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled');
                }}
                className={`w-10 h-5 transition-colors duration-100 flex items-center justify-end px-1 ${
                  autoRefresh ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.15)] light:bg-gray-300'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ x: 0 }}
                  className="w-3 h-3 bg-white rounded-full"
                />
              </button>
            </div>
            <button
              onClick={testNotification}
              className="mt-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border border-[rgba(94,106,210,0.3)] text-[#5E6AD2] hover:bg-[rgba(94,106,210,0.1)] transition-colors duration-100"
            >
              Test Notification
            </button>
          </div>
        </motion.section>

        {/* Regional */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white dark:text-white light:text-gray-900">Regional</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-500 mb-2">
                Language
              </label>
              <select className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] dark:border-[rgba(255,255,255,0.1)] light:border-gray-300 text-white dark:text-white light:text-gray-900 font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100">
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
          transition={{ delay: 0.2 }}
          className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white dark:text-white light:text-gray-900">Security</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[rgba(94,106,210,0.08)] dark:bg-[rgba(94,106,210,0.08)] light:bg-blue-50 border border-[rgba(94,106,210,0.2)] dark:border-[rgba(94,106,210,0.2)] light:border-blue-200">
              <CheckCircle2 className="w-4 h-4 text-[#5E6AD2] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">AI changes are sandboxed</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-1 leading-[1.6]">
                  Every file change is staged and requires your approval before being written.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#0A0A0F] dark:bg-[#0A0A0F] light:bg-gray-50 border border-[rgba(255,255,255,0.08)] dark:border-[rgba(255,255,255,0.08)] light:border-gray-200">
              <Zap className="w-4 h-4 text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white dark:text-white light:text-gray-900">API keys never stored locally</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-1 leading-[1.6]">
                  Your orchestrator handles all authentication. No secrets in the browser.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] flex items-center gap-1.5">
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
